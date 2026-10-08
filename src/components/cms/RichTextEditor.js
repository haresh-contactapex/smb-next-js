"use client";

import { useRef, useState } from "react";
import { Extension } from "@tiptap/core";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import MediaSelectModal from "@/components/media/MediaSelectModal";
import { altTextFor, uploadLibraryImage } from "@/components/media/helpers";
import { CMS_ADMIN_PROSE } from "./prose";

// Text alignment stored as the class the storefront styles (cms-align-center /
// cms-align-right), the same form the server keeps, so alignment survives a save.
const CmsAlign = Extension.create({
  name: "cmsAlign",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          align: {
            default: null,
            parseHTML: (element) => {
              if (element.classList.contains("cms-align-center") || element.style.textAlign === "center") return "center";
              if (element.classList.contains("cms-align-right") || element.style.textAlign === "right") return "right";
              return null;
            },
            renderHTML: (attributes) => (attributes.align ? { class: `cms-align-${attributes.align}` } : {}),
          },
        },
      },
    ];
  },
});

// The style classes a page can carry besides alignment and link buttons (see the cms profile in
// sanitizeHtml.js): a table style (cms-plain / cms-striped / cms-cards), a heading style (cms-lg / cms-accent)
// and "cms-or" on a paragraph (a divider line either side of the word). Kept as an attribute, so editing
// a page does not drop them.
const CMS_STYLE_CLASSES = ["cms-plain", "cms-striped", "cms-cards", "cms-columns", "cms-products", "cms-hero", "cms-tiles", "cms-split", "cms-chips", "cms-small", "cms-photo-right", "cms-luxe-hero", "cms-luxe-tiles", "cms-eyebrow", "cms-or", "cms-lg", "cms-accent", "cms-embed-contact-form", "cms-contact", "cms-contact-phone", "cms-contact-mail", "cms-social"];
const CmsStyleClass = Extension.create({
  name: "cmsStyleClass",
  addGlobalAttributes() {
    return [
      {
        types: ["table", "paragraph", "heading", "image"],
        attributes: {
          cmsClass: {
            default: null,
            parseHTML: (element) => CMS_STYLE_CLASSES.find((name) => element.classList.contains(name)) || null,
            renderHTML: (attributes) => (attributes.cmsClass ? { class: attributes.cmsClass } : {}),
          },
        },
      },
    ];
  },
});

const EXTENSIONS = [
  StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: false }),
  // `class` is "cms-btn" for a link drawn as a button (see the cms profile in sanitizeHtml.js).
  Link.configure({ openOnClick: false, autolink: false, HTMLAttributes: { target: null, rel: null, class: null } }),
  Image.configure({ inline: false, allowBase64: false }),
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
  CmsAlign,
  CmsStyleClass,
];

// How a link is drawn: as text, or as one of the two buttons (cms-btn / cms-btn-outline in storefront.css).
const LINK_STYLES = [
  { value: "", label: "Text link" },
  { value: "cms-btn", label: "Red button" },
  { value: "cms-btn-outline", label: "Outline button" },
  { value: "cms-btn-gold", label: "Gold button" },
  { value: "cms-btn-gold-outline", label: "Gold outline button" },
  { value: "cms-social-facebook", label: "Facebook icon" },
  { value: "cms-social-x", label: "X icon" },
  { value: "cms-social-instagram", label: "Instagram icon" },
  { value: "cms-social-pinterest", label: "Pinterest icon" },
];

// Same rule the server applies to a link: a full web address, a path on this site,
// an #anchor, or a mailto:/tel: link. A bare "example.com" is completed with https://.
function normalizeLink(value) {
  const url = value.trim();
  if (!url) return { error: "Enter the address to link to." };
  if (/^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(url)) return { url };
  if (/^[a-z][a-z0-9+.-]*:/i.test(url) || /\s/.test(url)) {
    return { error: "Use a web address (https://…), a path starting with /, an #anchor, mailto: or tel:." };
  }
  return { url: `https://${url}` };
}

function ToolButton({ label, title, onClick, active = false, disabled = false, children, className = "" }) {
  return (
    <button
      type="button"
      title={title || label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`toolbar-btn !w-auto min-w-[28px] px-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-200/70 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/10 ${
        active ? "bg-slate-200 text-slate-900 dark:bg-white/15 dark:text-white" : ""
      } ${className}`}
    >
      {children}
    </button>
  );
}

const Divider = () => <span aria-hidden="true" className="mx-1 h-4 w-px bg-slate-200 dark:bg-white/10" />;

/**
 * Visual editor for a CMS page body, with an HTML source tab. `initialHtml` is read
 * once when the editor mounts; give the component a new `key` to load a different
 * body (the form does this when an earlier version is restored). `onChange(html)`
 * gets the body as HTML ("" when empty) on every edit; `onNotify(message, variant)`
 * reports upload problems. The HTML is cleaned again by the server on save.
 */
export default function RichTextEditor({ initialHtml = "", onChange, onNotify, error, ariaLabel = "Page content" }) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: EXTENSIONS,
    content: initialHtml,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": ariaLabel,
        class: `min-h-[360px] px-4 py-3 outline-none [&_.tableWrapper]:overflow-x-auto [&_td_p]:my-0 [&_th_p]:my-0[&_img.ProseMirror-selectednode]:outline [&_img.ProseMirror-selectednode]:outline-2 [&_img.ProseMirror-selectednode]:outline-primary-400 ${CMS_ADMIN_PROSE}`,
      },
    },
    onUpdate: ({ editor: current }) => onChangeRef.current?.(current.isEmpty ? "" : current.getHTML()),
  });

  // useEditor creates the editor after the first render (immediatelyRender: false).
  if (!editor) {
    return <div className="min-h-[420px] rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-darksurface2/50" aria-busy="true" />;
  }
  return <EditorShell editor={editor} onChange={onChange} onNotify={onNotify} error={error} ariaLabel={ariaLabel} />;
}

// The toolbar and the editing surface. A separate component so useEditorState always gets a real
// editor: when it is first called with a null editor it never selects once the editor appears.
function EditorShell({ editor, onChange, onNotify, error, ariaLabel }) {
  const [mode, setMode] = useState("visual");
  const [sourceHtml, setSourceHtml] = useState("");
  const [linkBar, setLinkBar] = useState(null); // { url, style, error } while the link bar is open
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      const block = current.getAttributes("paragraph").align || current.getAttributes("heading").align || null;
      return {
        bold: current.isActive("bold"),
        italic: current.isActive("italic"),
        underline: current.isActive("underline"),
        strike: current.isActive("strike"),
        bulletList: current.isActive("bulletList"),
        orderedList: current.isActive("orderedList"),
        blockquote: current.isActive("blockquote"),
        link: current.isActive("link"),
        table: current.isActive("table"),
        tableStyle: current.getAttributes("table").cmsClass || "",
        heading: [2, 3, 4].find((level) => current.isActive("heading", { level })) || 0,
        align: block,
        canUndo: current.can().undo(),
        canRedo: current.can().redo(),
      };
    },
  });

  const run = () => editor.chain().focus();

  function switchMode(next) {
    if (next === mode) return;
    if (next === "source") {
      setSourceHtml(editor.isEmpty ? "" : editor.getHTML());
      setLinkBar(null);
    } else {
      editor.commands.setContent(sourceHtml, { emitUpdate: false });
      onChange?.(editor.isEmpty ? "" : editor.getHTML());
    }
    setMode(next);
  }

  function handleSourceChange(value) {
    setSourceHtml(value);
    onChange?.(value);
  }

  function setBlock(value) {
    if (value === "0") run().setParagraph().run();
    else run().setHeading({ level: Number(value) }).run();
  }

  function setAlign(align) {
    run().updateAttributes("paragraph", { align }).updateAttributes("heading", { align }).run();
  }

  function openLinkBar() {
    const attrs = editor.getAttributes("link");
    setLinkBar({ url: attrs.href || "", style: LINK_STYLES.some((option) => option.value === attrs.class) ? attrs.class : "", error: "" });
  }

  function applyLink() {
    const { url, error: problem } = normalizeLink(linkBar.url);
    if (problem) {
      setLinkBar((bar) => ({ ...bar, error: problem }));
      return;
    }
    const attributes = { href: url, class: linkBar.style || null };
    if (editor.state.selection.empty && !editor.isActive("link")) {
      editor.chain().focus().insertContent({ type: "text", text: url, marks: [{ type: "link", attrs: attributes }] }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink(attributes).run();
    }
    setLinkBar(null);
  }

  function removeLink() {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkBar(null);
  }

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("purpose", "cms");
      const res = await fetch("/api/media", { method: "POST", body: formData });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "The file couldn't be uploaded.");
      const attributes = { href: json.data.url, class: null };
      if (editor.state.selection.empty) {
        editor.chain().focus().insertContent({ type: "text", text: `Download ${file.name}`, marks: [{ type: "link", attrs: attributes }] }).run();
      } else {
        editor.chain().focus().setLink(attributes).run();
      }
      onNotify?.("PDF uploaded and linked. Use the link tool to show it as a button.", "success");
    } catch (err) {
      onNotify?.(err.message, "error");
    } finally {
      setUploadingFile(false);
    }
  }

  function insertImage({ url, alt }) {
    editor.chain().focus().setImage({ src: url, alt }).run();
  }

  // Uploaded to the library right away (the editor has no save-time upload
  // step), then inserted at the cursor.
  async function uploadImage(files) {
    const item = await uploadLibraryImage(files[0], "cms");
    insertImage({ url: item.url, alt: altTextFor(item) });
  }

  return (
    <div>
      <div
        className={`overflow-hidden rounded-xl border ${error ? "border-red-400" : "border-slate-200 dark:border-white/10"}`}
      >
        <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-white/10 dark:bg-darksurface2/50">
          {mode === "visual" && (
            <>
              <select
                aria-label="Text style"
                value={state.heading}
                onChange={(e) => setBlock(e.target.value)}
                className="mr-1 h-7 rounded-md border border-slate-200 bg-white px-1.5 text-xs text-slate-700 dark:border-white/10 dark:bg-darksurface dark:text-slate-200"
              >
                <option value={0}>Paragraph</option>
                <option value={2}>Heading 2</option>
                <option value={3}>Heading 3</option>
                <option value={4}>Heading 4</option>
              </select>
              <ToolButton label="Bold" active={state.bold} onClick={() => run().toggleBold().run()} className="font-bold">B</ToolButton>
              <ToolButton label="Italic" active={state.italic} onClick={() => run().toggleItalic().run()} className="italic">I</ToolButton>
              <ToolButton label="Underline" active={state.underline} onClick={() => run().toggleUnderline().run()} className="underline">U</ToolButton>
              <ToolButton label="Strikethrough" active={state.strike} onClick={() => run().toggleStrike().run()} className="line-through">S</ToolButton>
              <Divider />
              <ToolButton label="Bulleted list" active={state.bulletList} onClick={() => run().toggleBulletList().run()}>••</ToolButton>
              <ToolButton label="Numbered list" active={state.orderedList} onClick={() => run().toggleOrderedList().run()}>1.</ToolButton>
              <ToolButton label="Quote" active={state.blockquote} onClick={() => run().toggleBlockquote().run()}>&ldquo;</ToolButton>
              <Divider />
              <ToolButton label="Align left" active={!state.align} onClick={() => setAlign(null)}>&#8676;</ToolButton>
              <ToolButton label="Align center" active={state.align === "center"} onClick={() => setAlign("center")}>&#8801;</ToolButton>
              <ToolButton label="Align right" active={state.align === "right"} onClick={() => setAlign("right")}>&#8677;</ToolButton>
              <Divider />
              <ToolButton label="Link or button" title="Insert or edit a link (can be shown as a button)" active={state.link} onClick={openLinkBar}>Link</ToolButton>
              <ToolButton label="Insert image" onClick={() => setImagePickerOpen(true)}>Image</ToolButton>
              <ToolButton label="Upload and link a PDF" disabled={uploadingFile} onClick={() => fileInputRef.current?.click()}>
                {uploadingFile ? "Uploading…" : "PDF"}
              </ToolButton>
              <Divider />
              <ToolButton label="Insert table" onClick={() => run().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>Table</ToolButton>
              <ToolButton label="Horizontal rule" onClick={() => run().setHorizontalRule().run()}>&mdash;</ToolButton>
              <Divider />
              <ToolButton label="Undo" disabled={!state.canUndo} onClick={() => run().undo().run()}>&#8630;</ToolButton>
              <ToolButton label="Redo" disabled={!state.canRedo} onClick={() => run().redo().run()}>&#8631;</ToolButton>
            </>
          )}
          <div className="ml-auto flex items-center gap-0.5" role="group" aria-label="Editor view">
            <ToolButton label="Visual editor" active={mode === "visual"} onClick={() => switchMode("visual")}>Visual</ToolButton>
            <ToolButton label="HTML source" active={mode === "source"} onClick={() => switchMode("source")}>HTML</ToolButton>
          </div>
        </div>

        {mode === "visual" && state.table && (
          <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-white px-2 py-1 text-xs dark:border-white/10 dark:bg-darksurface" role="group" aria-label="Table tools">
            <span className="mr-1 font-semibold text-slate-500 dark:text-slate-400">Table:</span>
            <ToolButton label="Add row below" onClick={() => run().addRowAfter().run()}>+ Row</ToolButton>
            <ToolButton label="Add column after" onClick={() => run().addColumnAfter().run()}>+ Column</ToolButton>
            <ToolButton label="Delete row" onClick={() => run().deleteRow().run()}>&minus; Row</ToolButton>
            <ToolButton label="Delete column" onClick={() => run().deleteColumn().run()}>&minus; Column</ToolButton>
            <ToolButton label="Toggle header row" onClick={() => run().toggleHeaderRow().run()}>Header row</ToolButton>
            <select
              aria-label="Table style"
              value={state.tableStyle}
              onChange={(e) => run().updateAttributes("table", { cmsClass: e.target.value || null }).run()}
              className="mx-1 h-7 rounded-md border border-slate-200 bg-white px-1.5 text-xs text-slate-700 dark:border-white/10 dark:bg-darksurface dark:text-slate-200"
            >
              <option value="">Default grid</option>
              <option value="cms-plain">Plain (no grid)</option>
              <option value="cms-striped">Striped (dark header)</option>
              <option value="cms-cards">Cards (two per row)</option>
              <option value="cms-columns">Columns (side by side)</option>
              <option value="cms-products">Product row (four cards)</option>
              <option value="cms-hero">Hero (picture beside text, full width)</option>
              <option value="cms-tiles">Tiles (three per row, full width)</option>
              <option value="cms-split">Split (two halves, full width)</option>
              <option value="cms-chips">Chips (row of four small cards)</option>
              <option value="cms-luxe-hero">Luxe hero (photo, gold and navy, full width)</option>
              <option value="cms-luxe-tiles">Luxe tiles (photo cards, three per row)</option>
              <option value="cms-contact">Contact (info panel beside a form)</option>
            </select>
            <ToolButton label="Delete table" onClick={() => run().deleteTable().run()} className="text-error">Delete table</ToolButton>
          </div>
        )}

        {mode === "visual" && linkBar && (
          <div role="group" aria-label="Link" className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-darksurface">
            <label className="sr-only" htmlFor="cms-link-url">Link address</label>
            <input
              id="cms-link-url"
              type="text"
              autoFocus
              value={linkBar.url}
              onChange={(e) => setLinkBar((bar) => ({ ...bar, url: e.target.value, error: "" }))}
              onKeyDown={(e) => {
                // This group sits inside the page form, so Enter must not submit that form.
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyLink();
                } else if (e.key === "Escape") {
                  setLinkBar(null);
                  editor.commands.focus();
                }
              }}
              placeholder="https://… or /page-url"
              aria-invalid={Boolean(linkBar.error)}
              className="field-input h-9 min-w-[220px] flex-1"
            />
            <select
              aria-label="Link style"
              value={linkBar.style}
              onChange={(e) => setLinkBar((bar) => ({ ...bar, style: e.target.value }))}
              className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-700 dark:border-white/10 dark:bg-darksurface dark:text-slate-200"
            >
              {LINK_STYLES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button type="button" onClick={applyLink} className="h-9 rounded-xl bg-primary-500 px-3 text-xs font-semibold text-white hover:bg-primary-600 dark:bg-accent-500 dark:hover:bg-accent-600">
              Apply
            </button>
            {state.link && (
              <button type="button" onClick={removeLink} className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-error hover:bg-red-50 dark:border-white/10 dark:hover:bg-red-500/10">
                Remove link
              </button>
            )}
            <button type="button" onClick={() => setLinkBar(null)} className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">
              Cancel
            </button>
            {linkBar.error && (
              <p role="alert" className="w-full text-xs text-error">
                {linkBar.error}
              </p>
            )}
          </div>
        )}

        {mode === "visual" ? (
          <div className="bg-white dark:bg-darksurface">
            <EditorContent editor={editor} />
          </div>
        ) : (
          <textarea
            value={sourceHtml}
            onChange={(e) => handleSourceChange(e.target.value)}
            spellCheck={false}
            aria-label={`${ariaLabel} (HTML source)`}
            className="block min-h-[420px] w-full resize-y bg-white p-4 font-mono text-[13px] leading-relaxed text-slate-800 outline-none dark:bg-darksurface dark:text-slate-100"
          />
        )}
      </div>

      {mode === "source" && (
        <p className="mt-1.5 text-[11px] text-slate-400">
          Only headings, text formatting, lists, links, images, tables and a few styles are kept. Scripts and anything else are removed when the page is saved.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-1 text-xs text-error">
          {error}
        </p>
      )}

      <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileUpload} className="sr-only" tabIndex={-1} aria-label="Upload a PDF" />
      <MediaSelectModal
        open={imagePickerOpen}
        onClose={() => setImagePickerOpen(false)}
        onSelectItems={(items) => items[0] && insertImage({ url: items[0].url, alt: altTextFor(items[0]) })}
        onUploadFiles={uploadImage}
        multiple={false}
        title="Insert image"
        confirmLabel="Insert image"
        uploadHint="JPG, PNG, WEBP, or GIF, up to 10MB"
      />
    </div>
  );
}
