"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CMS_FIELD_ORDER, normalizeCmsPageInput, slugify } from "@/lib/cmsRules";
import { useCan } from "@/components/providers/StaffPermissionsProvider";
import Toast from "@/components/add-product/Toast";
import CmsFormToolbar from "./CmsFormToolbar";
import CmsContentSection from "./CmsContentSection";
import CmsSeoSection from "./CmsSeoSection";
import CmsSettingsSidebar from "./CmsSettingsSidebar";
import CmsPreviewModal from "./CmsPreviewModal";
import { EMPTY_PAGE, formToPayload, pageToForm } from "./helpers";

// Keep in sync with AUTO_DISMISS_MS in the shared Add Product toast, which
// also drives the progress-bar animation for both success and error messages.
const TOAST_AUTO_DISMISS_MS = 10000;

const NO_ERRORS = {};

/**
 * CMS -> Add Page / Edit Page. `page` is the saved page being edited (loaded by the
 * server page) or null for a new one. This component owns the form state; the
 * sections only get values and callbacks.
 */
export default function CmsPageForm({ page = null }) {
  const isEdit = Boolean(page);
  const router = useRouter();
  const can = useCan();
  const canPublish = can("content.publish");

  const [saved, setSaved] = useState(page);
  const [form, setForm] = useState(() => (page ? pageToForm(page) : EMPTY_PAGE));
  // The editor reads its starting HTML once per mount; a new key reloads it (restoring a version).
  const [editor, setEditor] = useState({ key: 0, html: page ? page.contentHtml : "" });
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
    setForm((prev) => ({ ...prev, title: value, slug: prev.slugTouched ? prev.slug : slugify(value) }));
    setErrors((prev) => ({ ...prev, title: undefined, slug: form.slugTouched ? prev.slug : undefined }));
  }

  function handleSlugChange(value) {
    setForm((prev) => ({ ...prev, slug: value.toLowerCase().replace(/\s+/g, "-"), slugTouched: true }));
    setErrors((prev) => ({ ...prev, slug: undefined }));
  }

  function focusField(field) {
    if (field === "title") titleInputRef.current?.focus();
    else if (field === "slug") slugInputRef.current?.focus();
    else document.getElementById({ seoTitle: "cms-seo-title", seoDescription: "cms-seo-description", status: "cms-status", footerGroup: "cms-footer-group", footerLabel: "cms-footer-label", position: "cms-position" }[field])?.focus();
  }

  function showFieldErrors(fieldErrors, message) {
    setErrors(fieldErrors);
    const first = CMS_FIELD_ORDER.find((field) => fieldErrors[field]);
    if (first) focusField(first);
    showToast(message || (first ? fieldErrors[first] : "Check the page and try again."), "error");
  }

  async function handleSave(event) {
    event?.preventDefault();
    if (savingRef.current) return;

    const { errors: fieldErrors } = normalizeCmsPageInput(formToPayload(form));
    if (Object.keys(fieldErrors).length) {
      showFieldErrors(fieldErrors);
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const payload = formToPayload(form);
      const res = await fetch(isEdit ? `/api/cms/pages/${saved.id}` : "/api/cms/pages", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { ...payload, expectedUpdatedAt: saved.updatedAt } : payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        if (res.status === 409 && !json?.field) setConflict(true);
        if (json?.errors) showFieldErrors(json.errors, json.error);
        else showToast(json?.error || "The page couldn't be saved.", "error");
        return;
      }

      setConflict(false);
      if (!isEdit) {
        router.push("/admin/cms");
        router.refresh();
        return;
      }
      // Stay on the page: take the server's version (cleaned HTML, new updatedAt) as the baseline.
      setSaved(json.data);
      const next = pageToForm(json.data);
      initialSnapshot.current = JSON.stringify(formToPayload(next));
      setForm(next);
      setRevisions(null);
      showToast("Page saved");
      router.refresh();
    } catch (error) {
      showToast(error.message || "The page couldn't be saved.", "error");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function handleDiscard() {
    if (dirty && !window.confirm(isEdit ? "You have unsaved changes. Leave without saving?" : "Discard this page and go back to All Pages?")) return;
    router.push("/admin/cms");
  }

  async function loadRevisions() {
    if (!isEdit || revisions || revisionsLoading) return;
    setRevisionsLoading(true);
    setRevisionsError("");
    try {
      const res = await fetch(`/api/cms/pages/${saved.id}/revisions`);
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
      const res = await fetch(`/api/cms/pages/${saved.id}/revisions/${revisionId}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "That version couldn't be loaded.");
      setForm((prev) => ({ ...prev, title: json.data.title, contentHtml: json.data.contentHtml }));
      setEditor((prev) => ({ key: prev.key + 1, html: json.data.contentHtml }));
      showToast("Earlier version loaded. Save the page to keep it.");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setRestoringId(null);
    }
  }

  const previewTitle = form.seoTitle || `${form.title || "Page title"} | shopmyband.com`;
  const previewDescription = form.seoDescription || "Add a meta description to see how this page will look in search engine results.";

  return (
    <form onSubmit={handleSave} noValidate>
      <CmsFormToolbar
        isEdit={isEdit}
        saving={saving}
        canSave={dirty || !isEdit}
        onPreview={() => setPreviewOpen(true)}
        onDiscard={handleDiscard}
      />

      {conflict && (
        <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <span>Someone else saved this page while you were editing. Saving again would overwrite their changes.</span>
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
          <CmsContentSection
            title={form.title}
            titleError={errors.title}
            titleInputRef={titleInputRef}
            contentError={errors.contentHtml}
            editorKey={editor.key}
            initialHtml={editor.html}
            onTitleChange={handleTitleChange}
            onContentChange={(html) => setField("contentHtml", html)}
            onNotify={showToast}
          />

          <CmsSeoSection
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
          <CmsSettingsSidebar
            isEdit={isEdit}
            page={saved}
            status={form.status}
            statusError={errors.status}
            canPublish={canPublish}
            footerGroup={form.footerGroup}
            footerGroupError={errors.footerGroup}
            footerLabel={form.footerLabel}
            footerLabelError={errors.footerLabel}
            position={form.position}
            positionError={errors.position}
            onStatusChange={(value) => setField("status", value)}
            onFooterGroupChange={(value) => setField("footerGroup", value)}
            onFooterLabelChange={(value) => setField("footerLabel", value)}
            onPositionChange={(value) => setField("position", value)}
            revisions={revisions}
            revisionsLoading={revisionsLoading}
            revisionsError={revisionsError}
            restoringId={restoringId}
            onOpenRevisions={loadRevisions}
            onRestoreRevision={handleRestore}
          />
        </div>
      </div>

      <CmsPreviewModal open={previewOpen} title={form.title} contentHtml={form.contentHtml} onClose={() => setPreviewOpen(false)} />
      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </form>
  );
}
