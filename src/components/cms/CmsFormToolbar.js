import Breadcrumbs from "@/components/admin-panel/Breadcrumbs";

// Header of CMS -> Add Page / Edit Page, with the Preview, Discard and Save buttons.
export default function CmsFormToolbar({ isEdit, saving, canSave, onPreview, onDiscard }) {
  const heading = isEdit ? "Edit Page" : "Add Page";
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <Breadcrumbs
          icon="file-text"
          items={[{ label: "CMS" }, { label: "All Pages", href: "/admin/cms" }, { label: heading }]}
        />
        <h1 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-white">{heading}</h1>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onPreview}
          className="px-4 h-9 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
        >
          Preview
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="px-4 h-9 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
        >
          {isEdit ? "Close" : "Discard"}
        </button>
        <button
          type="submit"
          disabled={saving || !canSave}
          className="px-4 h-9 rounded-xl bg-primary-500 dark:bg-accent-500 hover:bg-primary-600 dark:hover:bg-accent-600 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Save Page"}
        </button>
      </div>
    </div>
  );
}
