export default function EducatorDashboardLoading() {
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-pulse">
      <div className="h-20 bg-slate-200/70 rounded-3xl w-full" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="h-32 bg-slate-200/60 rounded-2xl" />
        <div className="h-32 bg-slate-200/60 rounded-2xl" />
        <div className="h-32 bg-slate-200/60 rounded-2xl" />
        <div className="h-32 bg-slate-200/60 rounded-2xl" />
      </div>
      <div className="space-y-4">
        <div className="h-6 w-48 bg-slate-200 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-44 bg-slate-200/60 rounded-2xl" />
          <div className="h-44 bg-slate-200/60 rounded-2xl" />
          <div className="h-44 bg-slate-200/60 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}