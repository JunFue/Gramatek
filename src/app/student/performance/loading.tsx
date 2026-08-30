export default function PerformanceLoading() {
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-pulse">
      <div className="h-20 bg-slate-200/70 rounded-3xl w-full" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="h-28 bg-slate-200/60 rounded-2xl" />
        <div className="h-28 bg-slate-200/60 rounded-2xl" />
        <div className="h-28 bg-slate-200/60 rounded-2xl" />
        <div className="h-28 bg-slate-200/60 rounded-2xl" />
      </div>
      <div className="h-80 bg-slate-200/60 rounded-3xl" />
    </div>
  );
}