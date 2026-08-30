export default function RootLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 select-none animate-fade-in">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-3xl bg-brand-light flex items-center justify-center text-3xl shadow-lg border border-brand-primary/20 animate-bounce">
            ??
          </div>
          <div className="absolute -inset-2 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-heading font-black text-slate-800 tracking-tight">Gramatek</h2>
          <p className="text-xs text-slate-400 font-bold mt-1 animate-pulse">Naglo-load...</p>
        </div>
      </div>
    </div>
  );
}