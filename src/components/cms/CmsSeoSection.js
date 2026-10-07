import {
  CMS_SEO_DESCRIPTION_ADVICE,
  CMS_SEO_DESCRIPTION_MAX,
  CMS_SEO_TITLE_ADVICE,
  CMS_SEO_TITLE_MAX,
} from "@/lib/cmsRules";

const ERROR_FIELD = "!border-red-400 focus:!border-red-400 !bg-red-50 focus:!bg-red-50 dark:!bg-red-500/10 dark:focus:!bg-red-500/10";
const LABEL = "text-[12px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500";

// The page's address and what search engines show for it.
export default function CmsSeoSection({
  slug,
  slugError,
  slugInputRef,
  isEdit,
  seoTitle,
  seoTitleError,
  seoDescription,
  seoDescriptionError,
  previewTitle,
  previewDescription,
  onSlugChange,
  onSeoTitleChange,
  onSeoDescriptionChange,
}) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
      <h3 className="text-base font-bold text-slate-800 dark:text-white mb-3">Page URL &amp; Search Engine Listing</h3>

      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-darksurface2/50 border border-slate-100 dark:border-white/5 mb-4">
        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
          https://www.shopmyband.com › <span className="text-slate-700 dark:text-slate-200">{slug || "page-url"}</span>
        </div>
        <div className="text-base font-semibold text-primary-600 dark:text-accent-400 truncate mt-0.5">{previewTitle}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{previewDescription}</div>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="cms-slug" className={`block ${LABEL} mb-1`}>
            URL
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-xs text-slate-400 select-none">/</span>
            <input
              id="cms-slug"
              ref={slugInputRef}
              type="text"
              value={slug}
              onChange={(e) => onSlugChange(e.target.value)}
              placeholder="page-url"
              aria-invalid={Boolean(slugError)}
              aria-describedby="cms-slug-help"
              style={{ paddingLeft: "1.75rem" }}
              className={`field-input h-10 system-field${slugError ? ` ${ERROR_FIELD}` : ""}`}
            />
          </div>
          {slugError ? (
            <p id="cms-slug-help" className="text-xs text-error mt-1">
              {slugError}
            </p>
          ) : (
            <p id="cms-slug-help" className="text-[11px] text-slate-400 mt-1">
              {isEdit
                ? "Changing the URL breaks links and bookmarks that point to this page."
                : "Filled in from the title. Lowercase letters, numbers and hyphens only."}
            </p>
          )}
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="cms-seo-title" className={LABEL}>
              Page Title (SEO)
            </label>
            <span className={`text-[11px] ${seoTitle.length > CMS_SEO_TITLE_ADVICE ? "text-warning" : "text-slate-400"}`}>
              {seoTitle.length} of {CMS_SEO_TITLE_ADVICE} characters used
            </span>
          </div>
          <input
            id="cms-seo-title"
            type="text"
            value={seoTitle}
            maxLength={CMS_SEO_TITLE_MAX}
            onChange={(e) => onSeoTitleChange(e.target.value)}
            placeholder="Defaults to the page title"
            aria-invalid={Boolean(seoTitleError)}
            className={`field-input h-10${seoTitleError ? ` ${ERROR_FIELD}` : ""}`}
          />
          {seoTitleError && <p className="text-xs text-error mt-1">{seoTitleError}</p>}
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="cms-seo-description" className={LABEL}>
              Meta Description
            </label>
            <span className={`text-[11px] ${seoDescription.length > CMS_SEO_DESCRIPTION_ADVICE ? "text-warning" : "text-slate-400"}`}>
              {seoDescription.length} of {CMS_SEO_DESCRIPTION_ADVICE} characters used
            </span>
          </div>
          <textarea
            id="cms-seo-description"
            rows={3}
            value={seoDescription}
            maxLength={CMS_SEO_DESCRIPTION_MAX}
            onChange={(e) => onSeoDescriptionChange(e.target.value)}
            placeholder="Summarize this page for search engines"
            aria-invalid={Boolean(seoDescriptionError)}
            className="w-full p-3 rounded-xl bg-slate-100 dark:bg-darksurface2 border border-transparent focus:border-primary-400 dark:focus:border-accent-500 focus:bg-white dark:focus:bg-darksurface2 focus:outline-none focus:ring-4 focus:ring-primary-500/10 text-sm transition-all font-medium text-slate-800 dark:text-white resize-y"
          />
          {seoDescriptionError && <p className="text-xs text-error mt-1">{seoDescriptionError}</p>}
        </div>
      </div>
    </section>
  );
}
