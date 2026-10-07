"use client";

import RichTextEditor from "./RichTextEditor";

const ERROR_FIELD = "!border-red-400 focus:!border-red-400 !bg-red-50 focus:!bg-red-50 dark:!bg-red-500/10 dark:focus:!bg-red-500/10";

// The page title (shown as the heading and in the breadcrumb) and its body.
export default function CmsContentSection({
  title,
  titleError,
  titleInputRef,
  contentError,
  editorKey,
  initialHtml,
  onTitleChange,
  onContentChange,
  onNotify,
}) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <div className="mb-4">
        <label htmlFor="cms-title" className="field-label">
          Title
        </label>
        <input
          id="cms-title"
          ref={titleInputRef}
          type="text"
          placeholder="e.g. Ring Size Calculator – Free Ring Sizer Online Tool"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          aria-invalid={Boolean(titleError)}
          aria-describedby={titleError ? "cms-title-error" : undefined}
          className={`field-input h-11 text-base${titleError ? ` ${ERROR_FIELD}` : ""}`}
        />
        {titleError && (
          <p id="cms-title-error" className="text-xs text-error mt-1">
            {titleError}
          </p>
        )}
      </div>

      <div>
        <span className="field-label">Content</span>
        <RichTextEditor
          key={editorKey}
          initialHtml={initialHtml}
          onChange={onContentChange}
          onNotify={onNotify}
          error={contentError}
          ariaLabel="Page content"
        />
      </div>
    </section>
  );
}
