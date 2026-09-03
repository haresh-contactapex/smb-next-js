"use client";

const TOOLBAR_BUTTONS = [
  { cmd: "bold", label: "B", className: "font-bold" },
  { cmd: "italic", label: "I", className: "italic" },
  { cmd: "underline", label: "U", className: "underline" },
];

export default function ProductDetailsSection({
  title,
  titleError,
  titleInputRef,
  editorRef,
  onTitleChange,
  onBodyHtmlChange,
}) {
  function runCommand(cmd) {
    if (cmd === "createLink") {
      const url = window.prompt("Link URL:", "https://");
      if (url) document.execCommand("createLink", false, url);
    } else {
      document.execCommand(cmd, false, null);
    }
    editorRef.current?.focus();
  }

  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <div className="mb-4">
        <label className="field-label">Title</label>
        <input
          ref={titleInputRef}
          type="text"
          aria-label="Product title"
          placeholder="e.g. Classic Leather Backpack"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className={`field-input h-11 text-base${titleError ? " border-red-400" : ""}`}
        />
        {titleError && <p className="text-xs text-error mt-1">Title is required.</p>}
      </div>

      <div>
        <label className="field-label">Description</label>
        <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
          <div className="flex items-center gap-1 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-darksurface2/50 px-2 py-1.5">
            {TOOLBAR_BUTTONS.map((btn) => (
              <button
                key={btn.cmd}
                type="button"
                onClick={() => runCommand(btn.cmd)}
                className={`toolbar-btn text-sm text-slate-600 dark:text-slate-300 ${btn.className}`}
                aria-label={btn.cmd}
              >
                {btn.label}
              </button>
            ))}
            <span className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1"></span>
            <button
              type="button"
              onClick={() => runCommand("insertUnorderedList")}
              className="toolbar-btn text-sm text-slate-600 dark:text-slate-300"
              aria-label="Bulleted list"
            >
              ••
            </button>
            <button
              type="button"
              onClick={() => runCommand("insertOrderedList")}
              className="toolbar-btn text-sm text-slate-600 dark:text-slate-300"
              aria-label="Numbered list"
            >
              1.
            </button>
            <span className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1"></span>
            <button
              type="button"
              onClick={() => runCommand("createLink")}
              className="toolbar-btn text-sm text-slate-600 dark:text-slate-300"
              aria-label="Insert link"
            >
              🔗
            </button>
            <button
              type="button"
              onClick={() => runCommand("removeFormat")}
              className="toolbar-btn text-sm text-slate-600 dark:text-slate-300"
              aria-label="Clear formatting"
            >
              Tx
            </button>
          </div>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-label="Product description"
            data-placeholder="Describe the product…"
            onInput={(e) => onBodyHtmlChange(e.currentTarget.innerHTML)}
            className="rte-editor px-3 py-2.5 text-sm leading-relaxed text-slate-800 dark:text-white bg-white dark:bg-darksurface [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
          />
        </div>
      </div>
    </section>
  );
}
