export const dynamic = "force-dynamic";

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next = "/", error } = await searchParams;
  const hasError = error === "1";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] px-6">
      <form
        action="/api/gate"
        method="POST"
        className="w-full max-w-sm space-y-6 text-center"
      >
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono">
            [ Private Preview ]
          </p>
          <h1 className="font-display text-3xl font-bold text-white">
            BCC Academy
          </h1>
          <p className="text-sm text-white/60">
            This site is under construction. Enter the password to continue.
          </p>
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
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-[#E54D2E] focus:outline-none"
          />

          {hasError && (
            <p className="text-xs text-[#E54D2E]">Incorrect password. Try again.</p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-[#E54D2E] px-4 py-3 text-sm font-semibold text-white hover:bg-[#F0613E] transition-colors"
          >
            Enter
          </button>
        </div>
      </form>
    </div>
  );
}
