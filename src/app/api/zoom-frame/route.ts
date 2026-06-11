import { type NextRequest } from "next/server";

/**
 * Returns a standalone HTML document that embeds the Zoom Meeting SDK.
 * Served inside an <iframe> so the SDK's React 18 dependency is completely
 * isolated from the app's React 19 runtime.
 *
 * Query params:
 *   mn  — meeting number
 *   pwd — meeting password
 *   un  — user display name
 *   ue  — user email
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mn = searchParams.get("mn") ?? "";
  const pwd = searchParams.get("pwd") ?? "";
  const un = encodeURIComponent(searchParams.get("un") ?? "Student");
  const ue = encodeURIComponent(searchParams.get("ue") ?? "");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; background: #1a1a1a; }
    #root { width: 100%; height: 100%; }
    #status {
      display: flex; align-items: center; justify-content: center;
      height: 100%; color: #fff; font-family: system-ui, sans-serif;
      font-size: 14px; flex-direction: column; gap: 12px;
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
  <div id="root">
    <div id="status">
      <div class="spinner"></div>
      <span>Connecting to session…</span>
    </div>
  </div>

  <!-- React 18 + ReactDOM 18 (Zoom SDK vendor — isolated from app React 19) -->
  <script src="/zoom/lib/vendor/react.min.js"></script>
  <script src="/zoom/lib/vendor/react-dom.min.js"></script>

  <!-- Zoom Meeting SDK Component View UMD -->
  <script src="/zoom/zoomus-websdk-embedded.umd.min.js"></script>

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
          body: JSON.stringify({ meetingNumber: ${JSON.stringify(mn)} }),
        });
        if (!sigRes.ok) {
          const j = await sigRes.json().catch(() => ({}));
          throw new Error(j.error || "Could not get session credentials");
        }
        const { signature, sdkKey } = await sigRes.json();

        // 2. Init the Component View client
        const ZoomMtgEmbedded = window.ZoomMtgEmbedded;
        const client = ZoomMtgEmbedded.createClient();

        const root = document.getElementById("root");
        await client.init({
          zoomAppRoot: root,
          language: "en-US",
          assetPath: "/zoom/lib/av",
          customize: {
            video: {
              isResizable: false,
              viewSizes: {
                default: {
                  width: root.clientWidth || window.innerWidth,
                  height: window.innerHeight,
                },
              },
            },
            toolbar: {
              buttons: [],
            },
          },
        });

        // 3. Join the meeting
        statusEl.innerHTML = "<div class='spinner'></div><span>Joining…</span>";
        await client.join({
          signature,
          sdkKey,
          meetingNumber: ${JSON.stringify(mn)},
          password: ${JSON.stringify(pwd)},
          userName: decodeURIComponent("${un}"),
          userEmail: decodeURIComponent("${ue}"),
        });

        statusEl.style.display = "none";
      } catch (err) {
        console.error("[zoom-frame]", err);
        showError(err.message || "Could not connect to the session. Please try again.");
      }
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Allow this page to be framed by same origin only
      "X-Frame-Options": "SAMEORIGIN",
      // Don't cache — params include live meeting credentials
      "Cache-Control": "no-store",
    },
  });
}
