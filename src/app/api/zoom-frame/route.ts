import { type NextRequest } from "next/server";

/**
 * Returns a standalone HTML document that embeds the Zoom Meeting SDK
 * Client View (window.ZoomMtg) — the full-page web client. Served inside an
 * <iframe> so the SDK's React 18 dependency is completely isolated from the
 * app's React 19 runtime.
 *
 * Client View (not Component View) because:
 *  - it lays out full-page like zoom.us/wc (video, chat, participants panels
 *    all fit the frame) instead of a floating window that grows one full
 *    video tile per participant when SharedArrayBuffer is unavailable
 *  - its init() accepts enforceMultipleVideos, enabling gallery/speaker view
 *    via WebCodecs without cross-origin isolation; the Component View's
 *    init() silently drops that option in SDK 6.1.0
 *
 * Query params:
 *   mn   — meeting number
 *   pwd  — meeting password
 *   un   — user display name
 *   ue   — user email
 *   left — render the "you left the session" screen with a rejoin link
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  // Reflected XSS guard: mn/pwd are interpolated into an inline <script> below
  // via JSON.stringify, which does NOT neutralize a "</script>" sequence. Strip
  // both to safe charsets so a crafted value can't break out of the script
  // context. A Zoom meeting number is digits only (matches /api/zoom-signature);
  // a passcode is alphanumeric plus the handful of symbols Zoom permits.
  const mn = (searchParams.get("mn") ?? "").replace(/\D/g, "");
  const pwd = (searchParams.get("pwd") ?? "").replace(/[^A-Za-z0-9@\-_*.]/g, "");
  const un = encodeURIComponent(searchParams.get("un") ?? "Student");
  const ue = encodeURIComponent(searchParams.get("ue") ?? "");
  // Attendance context — sanitized to safe charsets since they're interpolated
  // into the inline <script> below (same reflected-XSS guard as mn/pwd).
  const ts = (searchParams.get("ts") ?? "").replace(/[^a-z0-9-]/g, "").slice(0, 64);
  const wk = (searchParams.get("wk") ?? "").replace(/\D/g, "").slice(0, 4);
  const sn = (searchParams.get("sn") ?? "").replace(/\D/g, "").slice(0, 4);

  const headers = {
    "Content-Type": "text/html; charset=utf-8",
    // Allow this page to be framed by same origin only
    "X-Frame-Options": "SAMEORIGIN",
    // Don't cache — params include live meeting credentials
    "Cache-Control": "no-store",
  };

  const frameUrl = `/api/zoom-frame?mn=${encodeURIComponent(mn)}&pwd=${encodeURIComponent(pwd)}&un=${un}&ue=${ue}`;

  if (searchParams.get("left")) {
    return new Response(
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    html, body { height: 100%; margin: 0; background: #1a1a1a; }
    body { display: flex; align-items: center; justify-content: center;
      color: #fff; font-family: system-ui, sans-serif; flex-direction: column; gap: 16px; }
    a { padding: 10px 20px; background: #1D59FF; color: #fff; text-decoration: none;
      font-weight: 600; font-size: 14px; }
  </style>
</head>
<body>
  <p>You left the session.</p>
  <a href="${frameUrl}">Rejoin</a>
</body>
</html>`,
      { headers }
    );
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    html, body { width: 100%; height: 100%; margin: 0; background: #1a1a1a; }
    #status {
      position: fixed; inset: 0; display: flex; align-items: center;
      justify-content: center; color: #fff; font-family: system-ui, sans-serif;
      font-size: 14px; flex-direction: column; gap: 12px; background: #1a1a1a;
      z-index: 10;
    }
    .spinner {
      width: 28px; height: 28px; border: 3px solid rgba(255,255,255,0.2);
      border-top-color: #fff; border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .err { color: #f87171; max-width: 320px; text-align: center; }
  </style>
</head>
<body>
  <div id="status">
    <div class="spinner"></div>
    <span>Connecting to session…</span>
  </div>

  <!-- Vendor globals — the SDK bundle declares these as webpack externals -->
  <script src="/zoom/lib/vendor/react.min.js"></script>
  <script src="/zoom/lib/vendor/react-dom.min.js"></script>
  <script src="/zoom/lib/vendor/redux.min.js"></script>
  <script src="/zoom/lib/vendor/redux-thunk.min.js"></script>
  <script src="/zoom/lib/vendor/lodash.min.js"></script>

  <!-- Zoom Meeting SDK Client View — sets window.ZoomMtg -->
  <script src="/zoom/zoom-meeting.min.js"></script>

  <script>
    (async function () {
      const statusEl = document.getElementById("status");

      function showError(msg) {
        statusEl.innerHTML =
          '<p class="err">' + msg + '</p>' +
          '<button onclick="location.reload()" style="margin-top:8px;padding:8px 16px;background:#374151;border:none;color:#fff;cursor:pointer;font-size:13px;">Try again</button>';
      }

      try {
        // 1. Fetch short-lived SDK signature from the app's own server
        const sigRes = await fetch("/api/zoom-signature", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meetingNumber: ${JSON.stringify(mn)},
            trackSlug: ${JSON.stringify(ts)},
            weekNumber: ${JSON.stringify(wk)},
            sessionNumber: ${JSON.stringify(sn)},
          }),
        });
        if (!sigRes.ok) {
          const j = await sigRes.json().catch(() => ({}));
          throw new Error(j.error || "Could not get session credentials");
        }
        const { signature } = await sigRes.json();

        // 2. Init the Client View against self-hosted assets.
        // Must be an absolute URL — the SDK constructs new URL(...) from it.
        ZoomMtg.setZoomJSLib(location.origin + "/zoom/lib", "/av");

        // Guard: if WASM/AV assets fail to load, fail fast instead of hanging
        try {
          ZoomMtg.preLoadWasm();
          ZoomMtg.prepareWebSDK();
        } catch (preloadErr) {
          console.error("[zoom-frame] preload", preloadErr);
          throw new Error("Could not load session assets. Please try again.");
        }

        // Guard: init/join sometimes never callback on asset/network/CSP
        // failure — cleared only once join resolves, so a silent join hang
        // still surfaces an error instead of an endless spinner.
        //
        // BUT: "waiting for the host to start the meeting" is a legitimate
        // pre-join state where the join callback also never fires — the SDK
        // renders its own waiting screen under our overlay. Painting
        // "Session timed out" over it told early students class was broken
        // (Security+ kickoff, 2026-07-13). If the SDK has rendered ANYTHING,
        // get out of its way instead of erroring.
        const initTimeout = setTimeout(() => {
          const zoomRoot = document.getElementById("zmmtg-root");
          const sdkRendered =
            zoomRoot && (zoomRoot.innerText || "").trim().length > 0;
          if (sdkRendered) {
            statusEl.style.display = "none";
          } else {
            showError("Session timed out while loading. Please refresh and try again.");
          }
        }, 30000);

        ZoomMtg.init({
          leaveUrl: ${JSON.stringify(frameUrl + "&left=1")},
          // Skip the AV preview screen — students go straight into class
          disablePreview: true,
          // NOTE: do not pass unknown options here — ZoomMtg.init validates
          // keys against a whitelist and rejects the whole call on a miss
          success: function () {
            ZoomMtg.join({
              signature: signature,
              meetingNumber: ${JSON.stringify(mn)},
              passWord: ${JSON.stringify(pwd)},
              userName: decodeURIComponent("${un}"),
              userEmail: decodeURIComponent("${ue}"),
              success: function () {
                clearTimeout(initTimeout);
                statusEl.style.display = "none";
              },
              error: function (err) {
                clearTimeout(initTimeout);
                console.error("[zoom-frame] join", err);
                showError((err && err.reason) || "Could not join the session. Please try again.");
              },
            });
          },
          error: function (err) {
            clearTimeout(initTimeout);
            console.error("[zoom-frame] init", err);
            showError((err && err.reason) || "Could not load the session. Please try again.");
          },
        });
      } catch (err) {
        console.error("[zoom-frame]", err);
        showError(err.message || "Could not connect to the session. Please try again.");
      }
    })();
  </script>
</body>
</html>`;

  return new Response(html, { headers });
}
