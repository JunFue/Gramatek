export default function PracticeGameLoading() {
  return (
    <div className="fixed inset-0 z-[60] bg-slate-50 flex flex-col justify-between p-6 animate-pulse select-none">
      <div className="h-16 bg-white border-b border-slate-200 rounded-2xl w-full flex items-center justify-between px-6">
        <div className="h-8 w-24 bg-slate-200 rounded-lg" />
        <div className="h-8 w-20 bg-slate-200 rounded-lg" />
      </div>
      <div className="max-w-2xl w-full mx-auto space-y-4">
        <div className="h-36 bg-white rounded-3xl border border-slate-200 p-6 flex flex-col items-center justify-center">
          <div className="h-6 w-3/4 bg-slate-200 rounded mb-3" />
          <div className="h-4 w-1/2 bg-slate-100 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="h-14 bg-white rounded-2xl border border-slate-200" />
          <div className="h-14 bg-white rounded-2xl border border-slate-200" />
          <div className="h-14 bg-white rounded-2xl border border-slate-200" />
          <div className="h-14 bg-white rounded-2xl border border-slate-200" />
        </div>
      </div>
      <div className="h-8 w-32 bg-slate-200 rounded-lg mx-auto" />
    </div>
  );
}