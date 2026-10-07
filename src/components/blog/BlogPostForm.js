"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BLOG_FIELD_ORDER, blogSlugify, normalizeBlogPostInput } from "@/lib/blogRules";
import { useCan } from "@/components/providers/StaffPermissionsProvider";
import Toast from "@/components/add-product/Toast";
import CmsPreviewModal from "@/components/cms/CmsPreviewModal";
import BlogFormToolbar from "./BlogFormToolbar";
import BlogContentSection from "./BlogContentSection";
import BlogSeoSection from "./BlogSeoSection";
import BlogSettingsSidebar from "./BlogSettingsSidebar";
import { EMPTY_POST, formToPayload, postToForm } from "./helpers";

// Keep in sync with AUTO_DISMISS_MS in the shared Add Product toast, which
// also drives the progress-bar animation for both success and error messages.
const TOAST_AUTO_DISMISS_MS = 10000;

const NO_ERRORS = {};

// Controls the first-invalid-field focus can reach by id (title, slug and the body have their own lookup).
const FIELD_IDS = {
  excerpt: "blog-excerpt",
  featuredImageUrl: "blog-featured-image-choose",
  featuredImageAlt: "blog-featured-image-alt",
  category: "blog-category",
  author: "blog-author",
  tags: "blog-tags",
  publishedOn: "blog-published-on",
  status: "blog-status",
  seoTitle: "blog-seo-title",
  seoDescription: "blog-seo-description",
};

/**
 * Blog -> Add Post / Edit Post. `post` is the saved post being edited (loaded by the
 * server page) or null for a new one; `categories` ({ slug, name, count }) feed the
 * category suggestions and `defaultAuthor` is the author a new post starts with. This
 * component owns the form state; the sections only get values and callbacks.
 */
export default function BlogPostForm({ post = null, categories = [], defaultAuthor = "" }) {
  const isEdit = Boolean(post);
  const router = useRouter();
  const can = useCan();
  const canPublish = can("blog.publish");

  const [saved, setSaved] = useState(post);
  const [form, setForm] = useState(() => (post ? postToForm(post) : { ...EMPTY_POST, author: defaultAuthor }));
  // The editor reads its starting HTML once per mount; a new key reloads it (restoring a version).
  const [editor, setEditor] = useState({ key: 0, html: post ? post.contentHtml : "" });
  const [errors, setErrors] = useState(NO_ERRORS);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [revisions, setRevisions] = useState(null);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [revisionsError, setRevisionsError] = useState("");
  const [restoringId, setRestoringId] = useState(null);
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });

  const titleInputRef = useRef(null);
  const slugInputRef = useRef(null);
  const toastTimerRef = useRef(null);
  const savingRef = useRef(false);

  const initialSnapshot = useRef(JSON.stringify(formToPayload(form)));
  const dirty = JSON.stringify(formToPayload(form)) !== initialSnapshot.current;

  // Closing the tab or reloading with unsaved edits asks first.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function showToast(message, variant = "success") {
    setToast({ message, visible: true, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), TOAST_AUTO_DISMISS_MS);
  }

  function dismissToast() {
    clearTimeout(toastTimerRef.current);
    setToast((t) => ({ ...t, visible: false }));
  }

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  function handleTitleChange(value) {
    setForm((prev) => ({ ...prev, title: value, slug: prev.slugTouched ? prev.slug : blogSlugify(value) }));
    setErrors((prev) => ({ ...prev, title: undefined, slug: form.slugTouched ? prev.slug : undefined }));
  }

  function handleSlugChange(value) {
    setForm((prev) => ({ ...prev, slug: value.toLowerCase().replace(/\s+/g, "-"), slugTouched: true }));
    setErrors((prev) => ({ ...prev, slug: undefined }));
  }

  // Picking a picture also takes the library's description for it, which the staff
  // member can then reword.
  function handleFeaturedImageSelect({ url, alt }) {
    setForm((prev) => ({ ...prev, featuredImageUrl: url, featuredImageAlt: alt || "" }));
    setErrors((prev) => ({ ...prev, featuredImageUrl: undefined, featuredImageAlt: undefined }));
  }

  function handleFeaturedImageRemove() {
    setForm((prev) => ({ ...prev, featuredImageUrl: "", featuredImageAlt: "" }));
    setErrors((prev) => ({ ...prev, featuredImageUrl: undefined, featuredImageAlt: undefined }));
  }

  function focusField(field) {
    if (field === "title") titleInputRef.current?.focus();
    else if (field === "slug") slugInputRef.current?.focus();
    else if (field === "contentHtml") document.querySelector("#blog-content [role='textbox'], #blog-content textarea")?.focus();
    else document.getElementById(FIELD_IDS[field])?.focus();
  }

  function showFieldErrors(fieldErrors, message) {
    setErrors(fieldErrors);
    const first = BLOG_FIELD_ORDER.find((field) => fieldErrors[field]);
    if (first) focusField(first);
    showToast(message || (first ? fieldErrors[first] : "Check the post and try again."), "error");
  }

  async function handleSave(event) {
    event?.preventDefault();
    if (savingRef.current) return;

    const { errors: fieldErrors } = normalizeBlogPostInput(formToPayload(form));
    if (Object.keys(fieldErrors).length) {
      showFieldErrors(fieldErrors);
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const payload = formToPayload(form);
      const res = await fetch(isEdit ? `/api/blog/posts/${saved.id}` : "/api/blog/posts", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { ...payload, expectedUpdatedAt: saved.updatedAt } : payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        if (res.status === 409 && !json?.field) setConflict(true);
        if (json?.errors) showFieldErrors(json.errors, json.error);
        else if (json?.field) showFieldErrors({ [json.field]: json.error }, json.error);
        else showToast(json?.error || "The post couldn't be saved.", "error");
        return;
      }

      setConflict(false);
      if (!isEdit) {
        router.push("/admin/blog");
        router.refresh();
        return;
      }
      // Stay on the post: take the server's version (cleaned HTML, new updatedAt, the
      // date a published post was given) as the baseline.
      setSaved(json.data);
      const next = postToForm(json.data);
      initialSnapshot.current = JSON.stringify(formToPayload(next));
      setForm(next);
      setRevisions(null);
      showToast("Post saved");
      router.refresh();
    } catch (error) {
      showToast(error.message || "The post couldn't be saved.", "error");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function handleDiscard() {
    if (dirty && !window.confirm(isEdit ? "You have unsaved changes. Leave without saving?" : "Discard this post and go back to All Posts?")) return;
    router.push("/admin/blog");
  }

  async function loadRevisions() {
    if (!isEdit || revisions || revisionsLoading) return;
    setRevisionsLoading(true);
    setRevisionsError("");
    try {
      const res = await fetch(`/api/blog/posts/${saved.id}/revisions`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "The version history couldn't be loaded.");
      setRevisions(json.data);
    } catch (error) {
      setRevisionsError(error.message);
    } finally {
      setRevisionsLoading(false);
    }
  }

  async function handleRestore(revisionId) {
    if (dirty && !window.confirm("Replace what you have typed with this earlier version?")) return;
    setRestoringId(revisionId);
    try {
      const res = await fetch(`/api/blog/posts/${saved.id}/revisions/${revisionId}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "That version couldn't be loaded.");
      setForm((prev) => ({ ...prev, title: json.data.title, contentHtml: json.data.contentHtml }));
      setEditor((prev) => ({ key: prev.key + 1, html: json.data.contentHtml }));
      showToast("Earlier version loaded. Save the post to keep it.");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setRestoringId(null);
    }
  }

  const previewTitle = form.seoTitle || `${form.title || "Post title"} | shopmyband.com`;
  const previewDescription = form.seoDescription || "Add a meta description to see how this post will look in search engine results.";

  return (
    <form onSubmit={handleSave} noValidate>
      <BlogFormToolbar
        isEdit={isEdit}
        saving={saving}
        canSave={dirty || !isEdit}
        onPreview={() => setPreviewOpen(true)}
        onDiscard={handleDiscard}
      />

      {conflict && (
        <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <span>Someone else saved this post while you were editing. Saving again would overwrite their changes.</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-8 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700"
          >
            Reload their version
          </button>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <BlogContentSection
            title={form.title}
            titleError={errors.title}
            titleInputRef={titleInputRef}
            excerpt={form.excerpt}
            excerptError={errors.excerpt}
            contentError={errors.contentHtml}
            editorKey={editor.key}
            initialHtml={editor.html}
            onTitleChange={handleTitleChange}
            onExcerptChange={(value) => setField("excerpt", value)}
            onContentChange={(html) => setField("contentHtml", html)}
            onNotify={showToast}
          />

          <BlogSeoSection
            category={form.category}
            slug={form.slug}
            slugError={errors.slug}
            slugInputRef={slugInputRef}
            isEdit={isEdit}
            seoTitle={form.seoTitle}
            seoTitleError={errors.seoTitle}
            seoDescription={form.seoDescription}
            seoDescriptionError={errors.seoDescription}
            previewTitle={previewTitle}
            previewDescription={previewDescription}
            onSlugChange={handleSlugChange}
            onSeoTitleChange={(value) => setField("seoTitle", value)}
            onSeoDescriptionChange={(value) => setField("seoDescription", value)}
          />
        </div>

        <div className="space-y-6 min-w-0">
          <BlogSettingsSidebar
            isEdit={isEdit}
            post={saved}
            status={form.status}
            statusError={errors.status}
            canPublish={canPublish}
            publishedOn={form.publishedOn}
            publishedOnError={errors.publishedOn}
            category={form.category}
            categoryError={errors.category}
            categories={categories}
            author={form.author}
            authorError={errors.author}
            tags={form.tags}
            tagsError={errors.tags}
            featuredImageUrl={form.featuredImageUrl}
            featuredImageUrlError={errors.featuredImageUrl}
            featuredImageAlt={form.featuredImageAlt}
            featuredImageAltError={errors.featuredImageAlt}
            onStatusChange={(value) => setField("status", value)}
            onPublishedOnChange={(value) => setField("publishedOn", value)}
            onCategoryChange={(value) => setField("category", value)}
            onAuthorChange={(value) => setField("author", value)}
            onTagsChange={(value) => setField("tags", value)}
            onFeaturedImageSelect={handleFeaturedImageSelect}
            onFeaturedImageRemove={handleFeaturedImageRemove}
            onFeaturedImageAltChange={(value) => setField("featuredImageAlt", value)}
            revisions={revisions}
            revisionsLoading={revisionsLoading}
            revisionsError={revisionsError}
            restoringId={restoringId}
            onOpenRevisions={loadRevisions}
            onRestoreRevision={handleRestore}
          />
        </div>
      </div>

      <CmsPreviewModal open={previewOpen} title={form.title || "Untitled post"} contentHtml={form.contentHtml} onClose={() => setPreviewOpen(false)} />
      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </form>
  );
}
