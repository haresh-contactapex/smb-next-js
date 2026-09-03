import Icon from "@/components/admin-panel/Icon";

export default function SeoSection({
  seoTitle,
  seoDescription,
  handle,
  previewTitle,
  previewDesc,
  onSeoTitleChange,
  onSeoDescriptionChange,
  onHandleChange,
}) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-slate-800 dark:text-white">Search Engine Listing</h3>
        <Icon name="edit-2" className="w-4 h-4 text-slate-400" />
      </div>

      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-darksurface2/50 border border-slate-100 dark:border-white/5 mb-4">
        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
          https://www.shopmyband.com › collections › <span className="text-slate-700 dark:text-slate-200">{handle || "category-slug"}</span>
        </div>
        <div className="text-base font-semibold text-primary-600 dark:text-accent-400 truncate mt-0.5">
          {previewTitle}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{previewDesc}</div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[12px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Page Title
            </label>
            <span className="text-[11px] text-slate-400">{seoTitle.length} of 70 characters used</span>
          </div>
          <input
            type="text"
            value={seoTitle}
            onChange={(e) => onSeoTitleChange(e.target.value)}
            placeholder="Category page title"
            aria-label="SEO page title"
            className="field-input h-10"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[12px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Meta Description
            </label>
            <span className="text-[11px] text-slate-400">{seoDescription.length} of 160 characters used</span>
          </div>
          <textarea
            rows={3}
            value={seoDescription}
            onChange={(e) => onSeoDescriptionChange(e.target.value)}
            placeholder="Summarize the content of this category for search engines"
            aria-label="SEO meta description"
            className="w-full p-3 rounded-xl bg-slate-100 dark:bg-darksurface2 border border-transparent focus:border-primary-400 dark:focus:border-accent-500 focus:bg-white dark:focus:bg-darksurface2 focus:outline-none focus:ring-4 focus:ring-primary-500/10 text-sm transition-all font-medium text-slate-800 dark:text-white resize-y"
          />
        </div>

        <div>
          <label className="block text-[12px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
            URL Handle
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-xs text-slate-400 select-none">collections/</span>
            <input
              type="text"
              value={handle}
              onChange={(e) => onHandleChange(e.target.value)}
              placeholder="category-slug"
              aria-label="URL handle"
              style={{ paddingLeft: "6rem" }}
              className="field-input h-10 system-field"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
