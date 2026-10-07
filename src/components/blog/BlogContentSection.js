"use client";

import RichTextEditor from "@/components/cms/RichTextEditor";
import { BLOG_EXCERPT_MAX } from "@/lib/blogRules";

const ERROR_FIELD = "!border-red-400 focus:!border-red-400 !bg-red-50 focus:!bg-red-50 dark:!bg-red-500/10 dark:focus:!bg-red-500/10";

// The post's title (shown as the heading), the short summary shown on the blog listing
// and the body.
export default function BlogContentSection({
  title,
  titleError,
  titleInputRef,
  excerpt,
  excerptError,
  contentError,
  editorKey,
  initialHtml,
  onTitleChange,
  onExcerptChange,
  onContentChange,
  onNotify,
}) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <div className="mb-4">
        <label htmlFor="blog-title" className="field-label">
          Title
        </label>
        <input
          id="blog-title"
          ref={titleInputRef}
          type="text"
          placeholder="e.g. How to Choose a Wedding Band That Lasts"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          aria-invalid={Boolean(titleError)}
          aria-describedby={titleError ? "blog-title-error" : undefined}
          className={`field-input h-11 text-base${titleError ? ` ${ERROR_FIELD}` : ""}`}
        />
        {titleError && (
          <p id="blog-title-error" className="text-xs text-error mt-1">
            {titleError}
          </p>
        )}
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-1.5">
          <label htmlFor="blog-excerpt" className="field-label !mb-0">
            Summary
          </label>
          <span className={`text-[11px] ${excerpt.length >= BLOG_EXCERPT_MAX ? "text-warning" : "text-slate-400"}`}>
            {excerpt.length} of {BLOG_EXCERPT_MAX} characters used
          </span>
        </div>
        <textarea
          id="blog-excerpt"
          rows={3}
          value={excerpt}
          maxLength={BLOG_EXCERPT_MAX}
          onChange={(e) => onExcerptChange(e.target.value)}
          placeholder="A sentence or two shown on the blog listing"
          aria-invalid={Boolean(excerptError)}
          aria-describedby={excerptError ? "blog-excerpt-error" : "blog-excerpt-help"}
          className={`w-full p-3 rounded-xl bg-slate-100 dark:bg-darksurface2 border border-transparent focus:border-primary-400 dark:focus:border-accent-500 focus:bg-white dark:focus:bg-darksurface2 focus:outline-none focus:ring-4 focus:ring-primary-500/10 text-sm transition-all font-medium text-slate-800 dark:text-white resize-y${excerptError ? ` ${ERROR_FIELD}` : ""}`}
        />
        {excerptError ? (
          <p id="blog-excerpt-error" className="text-xs text-error mt-1">
            {excerptError}
          </p>
        ) : (
          <p id="blog-excerpt-help" className="text-[11px] text-slate-400 mt-1">
            Leave blank to show the start of the post instead.
          </p>
        )}
      </div>

      <div id="blog-content">
        <span className="field-label">Content</span>
        <RichTextEditor
          key={editorKey}
          initialHtml={initialHtml}
          onChange={onContentChange}
          onNotify={onNotify}
          error={contentError}
          ariaLabel="Post content"
        />
      </div>
    </section>
  );
}
