export default function ClassroomDetailLoading() {
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-pulse">
      <div className="h-40 bg-slate-200/70 rounded-3xl w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-8 w-48 bg-slate-200 rounded-lg" />
          <div className="h-28 bg-slate-200/60 rounded-2xl" />
          <div className="h-28 bg-slate-200/60 rounded-2xl" />
        </div>
        <div className="space-y-4">
          <div className="h-8 w-36 bg-slate-200 rounded-lg" />
          <div className="h-64 bg-slate-200/60 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}