export default function PracticeLoading() {
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-pulse">
      <div className="h-24 bg-slate-200/70 rounded-3xl w-full" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-72 bg-slate-200/60 rounded-3xl" />
        <div className="h-72 bg-slate-200/60 rounded-3xl" />
        <div className="h-72 bg-slate-200/60 rounded-3xl" />
      </div>
    </div>
  );
}