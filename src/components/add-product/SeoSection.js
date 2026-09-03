"use client";

export default function SeoSection({ seoTitle, seoDescription, previewTitle, previewHandle, previewDesc, onFieldChange }) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Search engine listing</h2>
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-darksurface2/50 border border-slate-100 dark:border-white/5 mb-4">
        <p className="text-base font-semibold text-primary-600 dark:text-accent-400 truncate">{previewTitle}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
          yourstore.com › products › <span className="system-field">{previewHandle}</span>
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{previewDesc}</p>
      </div>
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="field-label mb-0" htmlFor="f-seo-title">
              SEO title
            </label>
            <span className="text-[11px] text-slate-400">{seoTitle.length} / 70</span>
          </div>
          <input
            id="f-seo-title"
            type="text"
            value={seoTitle}
            onChange={(e) => onFieldChange({ title: e.target.value })}
            className="field-input h-10"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="field-label mb-0" htmlFor="f-seo-desc">
              SEO description
            </label>
            <span className="text-[11px] text-slate-400">{seoDescription.length} / 160</span>
          </div>
          <textarea
            id="f-seo-desc"
            rows={2}
            value={seoDescription}
            onChange={(e) => onFieldChange({ description: e.target.value })}
            className="w-full p-3 rounded-xl bg-slate-100 dark:bg-darksurface2 border border-transparent focus:border-primary-400 dark:focus:border-accent-500 focus:bg-white dark:focus:bg-darksurface2 focus:outline-none focus:ring-4 focus:ring-primary-500/10 text-sm transition-all font-medium text-slate-800 dark:text-white resize-none"
          />
        </div>
      </div>
    </section>
  );
}
