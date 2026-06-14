export default function AdminLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl px-4 sm:px-5 py-8 animate-pulse">
      <div className="h-5 w-24 rounded bg-paper-tint mb-6" />
      <div className="h-8 w-48 rounded bg-paper-tint mb-2" />
      <div className="h-3 w-64 rounded bg-paper-tint mb-8" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-48 rounded border border-rule bg-paper-tint" />
        <div className="h-48 rounded border border-rule bg-paper-tint" />
        <div className="h-48 rounded border border-rule bg-paper-tint" />
      </div>
    </div>
  );
}
