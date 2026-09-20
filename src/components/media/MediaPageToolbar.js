export default function MediaPageToolbar() {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
        <span>Dashboard</span>
        <span>/</span>
        <span className="font-semibold text-slate-800 dark:text-white">Media</span>
      </div>
      <h1 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-white">Media Library</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Upload images once, then reuse them across products and categories.
      </p>
    </div>
  );
}
