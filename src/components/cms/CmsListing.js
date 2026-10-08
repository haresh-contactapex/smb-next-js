"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CmsFilters from "./CmsFilters";
import CmsTable from "./CmsTable";
import DeleteOverlay from "@/components/admin-panel/DeleteOverlay";
import { BulkSelectionBar, confirmBulkDelete, requestBulkDelete, useBulkSelection } from "@/components/admin-panel/BulkSelection";
import { useCan } from "@/components/providers/StaffPermissionsProvider";
import Toast from "@/components/add-product/Toast";

const TOAST_AUTO_DISMISS_MS = 10000;

export default function CmsListing({ pages: initialPages }) {
  const router = useRouter();
  const canDelete = useCan()("content.delete");
  const selection = useBulkSelection();
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [pages, setPages] = useState(initialPages);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [group, setGroup] = useState("");
  const [deletingPage, setDeletingPage] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: "", variant: "success" });
  const toastTimerRef = useRef(null);

  function showToast(message, variant = "success") {
    setToast({ visible: true, message, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), TOAST_AUTO_DISMISS_MS);
  }

  async function handleDelete(page) {
    if (!window.confirm(`Delete "${page.title}"? Its address ${`/${page.slug}`} will stop working. This can't be undone.`)) return;
    setDeletingPage(page);
    try {
      const res = await fetch(`/api/cms/pages/${page.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "The page couldn't be deleted.");
      setPages((prev) => prev.filter((p) => p.id !== page.id));
      selection.remove([page.id]);
      showToast(`"${page.title}" was removed.`);
      router.refresh();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setDeletingPage(null);
    }
  }

  async function handleBulkDelete() {
    const ids = [...selection.ids];
    if (ids.length === 0 || bulkDeleting) return;
    if (!confirmBulkDelete(ids.length, "page", "pages", "Their addresses will stop working.")) return;
    setBulkDeleting(true);
    try {
      const { deleted } = await requestBulkDelete("/api/cms/pages", ids, "Failed to delete pages");
      const removed = new Set(ids);
      setPages((prev) => prev.filter((x) => !removed.has(x.id)));
      selection.clear();
      showToast(`${deleted} page${deleted === 1 ? "" : "s"} removed.`);
      router.refresh();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setBulkDeleting(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pages.filter((page) => {
      if (q && !page.title.toLowerCase().includes(q) && !page.slug.includes(q)) return false;
      if (status && page.status !== status) return false;
      if (group === "none" && page.footerGroup) return false;
      if (group && group !== "none" && page.footerGroup !== group) return false;
      return true;
    });
  }, [pages, search, status, group]);

  return (
    <>
      <CmsFilters
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          selection.clear();
        }}
        status={status}
        onStatusChange={(value) => {
          setStatus(value);
          selection.clear();
        }}
        group={group}
        onGroupChange={(value) => {
          setGroup(value);
          selection.clear();
        }}
        resultCount={filtered.length}
      />

      <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
        {canDelete && (
          <BulkSelectionBar
            count={selection.size}
            matchingCount={filtered.length}
            noun="pages"
            filtered={Boolean(search || status || group)}
            onSelectAll={() => selection.replace(filtered.map((x) => x.id))}
            onClear={selection.clear}
            onDelete={handleBulkDelete}
            deleting={bulkDeleting}
          />
        )}
        <CmsTable
          selection={canDelete ? selection : null}
          onTogglePage={selection.setMany}
          pages={filtered}
          onDelete={handleDelete}
          deletingId={deletingPage?.id}
        />
      </section>

      <DeleteOverlay
        active={deletingPage != null || bulkDeleting}
        title={bulkDeleting ? "Deleting pages…" : "Deleting page…"}
        itemLabel={bulkDeleting ? `${selection.size} selected` : deletingPage?.title || ""}
      />
      <Toast
        visible={toast.visible}
        message={toast.message}
        variant={toast.variant}
        onDismiss={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </>
  );
}
