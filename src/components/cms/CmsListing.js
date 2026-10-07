"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CmsFilters from "./CmsFilters";
import CmsTable from "./CmsTable";
import DeleteOverlay from "@/components/admin-panel/DeleteOverlay";
import Toast from "@/components/add-product/Toast";

const TOAST_AUTO_DISMISS_MS = 10000;

export default function CmsListing({ pages: initialPages }) {
  const router = useRouter();
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
      showToast(`"${page.title}" was removed.`);
      router.refresh();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setDeletingPage(null);
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
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        group={group}
        onGroupChange={setGroup}
        resultCount={filtered.length}
      />

      <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
        <CmsTable pages={filtered} onDelete={handleDelete} deletingId={deletingPage?.id} />
      </section>

      <DeleteOverlay active={deletingPage != null} title="Deleting page…" itemLabel={deletingPage?.title || ""} />
      <Toast
        visible={toast.visible}
        message={toast.message}
        variant={toast.variant}
        onDismiss={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </>
  );
}
