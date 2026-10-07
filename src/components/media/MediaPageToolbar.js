import Breadcrumbs from "@/components/admin-panel/Breadcrumbs";

export default function MediaPageToolbar() {
  return (
    <div>
      <Breadcrumbs items={[{ label: "Dashboard", href: "/admin" }, { label: "Media" }]} />
      <h1 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-white">Media Library</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Upload images once, then reuse them across products and categories.
      </p>
    </div>
  );
}
