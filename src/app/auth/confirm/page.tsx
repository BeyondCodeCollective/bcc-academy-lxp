import { redirect } from "next/navigation";
import { SignIn } from "@phosphor-icons/react/dist/ssr";

export const metadata = {
  title: "Sign In — BCC Academy",
};

// Interstitial between the sign-in email and /auth/callback. Email security
// scanners (Outlook Safe Links, Barracuda, Mimecast) open every emailed link
// server-side, and a bare GET to /auth/callback consumes the one-time
// token_hash before the student's browser ever loads it — the student then
// sees "session expired" on every attempt (first hit: a GSU student whose
// mailbox is Outlook-backed). Scanners fetch HTML but don't run scripts or
// submit forms, so this page holds the token and only a real browser
// continues: the inline script auto-submits instantly (no perceived extra
// step), and the button covers JS-disabled browsers.
export default async function ConfirmSignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (!params.token_hash) redirect("/login");

  const fields = Object.entries(params).filter(
    (e): e is [string, string] => typeof e[1] === "string",
  );

  return (
    <div className="min-h-[100dvh] bg-black flex items-center justify-center px-8">
      <div className="w-full max-w-md text-center">
        <div className="text-white mb-6 flex justify-center">
          <SignIn size={48} weight="bold" />
        </div>
        <p className="text-electric-green text-xs font-mono uppercase tracking-[0.3em] mb-6">
          [ Signing you in ]
        </p>
        <form id="confirm-form" action="/auth/callback" method="GET">
          {fields.map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <button
            type="submit"
            className="inline-flex items-center justify-center bg-electric-green text-black font-display font-bold uppercase tracking-tight px-8 py-4 hover:opacity-90 transition-opacity"
          >
            Continue to sign in
          </button>
        </form>
        <p className="text-white/50 text-sm mt-6">
          If nothing happens, tap the button above.
        </p>
        <script
          // Real browsers run this and continue instantly; link scanners
          // fetch the HTML and stop, so the one-time token survives.
          dangerouslySetInnerHTML={{
            __html: "document.getElementById('confirm-form').submit();",
          }}
        />
      </div>
    </div>
  );
}
