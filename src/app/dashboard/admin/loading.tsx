export default function AdminLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl px-4 sm:px-5 py-8 animate-pulse">
      <div className="h-5 w-24 rounded bg-neutral-200 mb-6" />
      <div className="h-8 w-48 rounded bg-neutral-200 mb-2" />
      <div className="h-3 w-64 rounded bg-neutral-200 mb-8" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-48 rounded border border-neutral-200 bg-neutral-100" />
        <div className="h-48 rounded border border-neutral-200 bg-neutral-100" />
        <div className="h-48 rounded border border-neutral-200 bg-neutral-100" />
      </div>
    </div>
  );
}
