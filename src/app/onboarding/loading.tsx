export default function OnboardingLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 animate-pulse">
      <div className="w-full max-w-4xl space-y-8">
        <div className="h-12 w-72 bg-slate-200 rounded-2xl mx-auto" />
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-200/60 rounded-3xl" />
          <div className="h-64 bg-slate-200/60 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}