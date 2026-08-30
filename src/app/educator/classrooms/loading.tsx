export default function ClassroomsLoading() {
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-8 w-48 bg-slate-200 rounded-lg" />
        <div className="h-10 w-36 bg-slate-200 rounded-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-48 bg-slate-200/60 rounded-3xl" />
        <div className="h-48 bg-slate-200/60 rounded-3xl" />
        <div className="h-48 bg-slate-200/60 rounded-3xl" />
      </div>
    </div>
  );
}