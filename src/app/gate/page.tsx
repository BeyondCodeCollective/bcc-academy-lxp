export const dynamic = "force-dynamic";

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next = "/", error } = await searchParams;
  const hasError = error === "1";

  return (
    <div className="min-h-screen flex items-center justify-center bg-true-black px-6">
      <form
        action="/api/gate"
        method="POST"
        className="w-full max-w-sm space-y-8 text-center"
      >
        <div className="space-y-6">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white uppercase tracking-tight leading-none">
            BCC <span className="text-electric-green">[</span>Academy<span className="text-electric-green">]</span>
          </h1>

          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.3em] text-electric-green font-mono">
              [ Private Preview ]
            </p>
            <p className="text-sm text-white/60 font-mono">
              This site is under construction.
              <br />
              Enter the password to continue.
            </p>
          </div>
        </div>

        <input type="hidden" name="next" value={next} />

        <div className="space-y-3">
          <input
            type="password"
            name="password"
            autoFocus
            required
            autoComplete="current-password"
            placeholder="Password"
            className="w-full border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-electric-green focus:outline-none font-mono"
          />

          {hasError && (
            <p className="text-xs text-electric-green font-mono">Incorrect password. Try again.</p>
          )}

          <button
            type="submit"
            className="w-full bg-electric-green px-4 py-3 text-sm font-bold text-true-black uppercase tracking-wider transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_15px_rgba(229,247,1,0.3)] btn-press"
          >
            Enter
          </button>
        </div>
      </form>
    </div>
  );
}
