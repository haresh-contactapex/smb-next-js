"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import NewsletterFilters from "./NewsletterFilters";
import NewsletterTable from "./NewsletterTable";
import Pagination, { PAGE_SIZE_OPTIONS } from "@/components/customers/Pagination";
import DeleteOverlay from "@/components/admin-panel/DeleteOverlay";
import useNavReselect from "@/components/admin-panel/useNavReselect";
import { BulkSelectionBar, confirmBulkDelete, requestBulkDelete, useBulkSelection } from "@/components/admin-panel/BulkSelection";
import { useCan } from "@/components/providers/StaffPermissionsProvider";
import Toast from "@/components/add-product/Toast";

const TOAST_AUTO_DISMISS_MS = 10000;

export default function NewsletterListing({ subscribers: initialSubscribers }) {
  const router = useRouter();
  const canDelete = useCan()("newsletter.delete");
  const selection = useBulkSelection();
  const [subscribers, setSubscribers] = useState(initialSubscribers);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  // Newest first, so a new signup is the first thing seen.
  const [sort, setSort] = useState({ key: "createdAt", direction: "desc" });
  const [deletingSubscriber, setDeletingSubscriber] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", variant: "success" });
  const toastTimerRef = useRef(null);

  // Clicking "Newsletter" in the sidebar while already here starts the list over, like a fresh visit.
  useNavReselect(() => {
    setSearch("");
    setPage(1);
    setPageSize(PAGE_SIZE_OPTIONS[0]);
    setSort({ key: "createdAt", direction: "desc" });
    selection.clear();
  });

  function showToast(message, variant = "success") {
    setToast({ visible: true, message, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), TOAST_AUTO_DISMISS_MS);
  }

  async function handleDelete(subscriber) {
    if (!window.confirm(`Delete subscriber "${subscriber.email}"? This can't be undone.`)) return;
    setDeletingSubscriber(subscriber);
    try {
      const { deleted } = await requestBulkDelete("/api/newsletter-subscribers", [subscriber.id], "The subscriber couldn't be deleted.");
      if (deleted) setSubscribers((prev) => prev.filter((s) => s.id !== subscriber.id));
      selection.remove([subscriber.id]);
      showToast(`"${subscriber.email}" was removed.`);
      router.refresh();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setDeletingSubscriber(null);
    }
  }

  async function handleBulkDelete() {
    const ids = [...selection.ids];
    if (ids.length === 0 || bulkDeleting) return;
    if (!confirmBulkDelete(ids.length, "subscriber", "subscribers")) return;
    setBulkDeleting(true);
    try {
      const { deleted } = await requestBulkDelete("/api/newsletter-subscribers", ids, "Failed to delete subscribers");
      const removed = new Set(ids);
      setSubscribers((prev) => prev.filter((s) => !removed.has(s.id)));
      selection.clear();
      showToast(`${deleted} subscriber${deleted === 1 ? "" : "s"} removed.`);
      router.refresh();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setBulkDeleting(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? subscribers.filter((s) => s.email.toLowerCase().includes(q)) : subscribers;
  }, [subscribers, search]);

  const sorted = useMemo(() => {
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) =>
      sort.key === "email"
        ? a.email.localeCompare(b.email, undefined, { sensitivity: "base" }) * dir
        : String(a.createdAt || "").localeCompare(String(b.createdAt || "")) * dir
    );
  }, [filtered, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageItems = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Selection is tied to what the search shows, so changing it starts afresh.
  function handleSearchChange(value) {
    setSearch(value);
    setPage(1);
    selection.clear();
  }

  function handleSortChange(key) {
    setSort((prev) => ({ key, direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc" }));
    setPage(1);
  }

  function handlePageSizeChange(size) {
    setPageSize(size);
    setPage(1);
  }

  return (
    <>
      <NewsletterFilters search={search} onSearchChange={handleSearchChange} resultCount={sorted.length} />

      <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
        {canDelete && (
          <BulkSelectionBar
            count={selection.size}
            matchingCount={sorted.length}
            noun="subscribers"
            filtered={Boolean(search)}
            onSelectAll={() => selection.replace(sorted.map((s) => s.id))}
            onClear={selection.clear}
            onDelete={handleBulkDelete}
            deleting={bulkDeleting}
          />
        )}
        <NewsletterTable
          subscribers={pageItems}
          emptyMessage={subscribers.length === 0 ? "No one has subscribed yet." : "No subscribers match your search."}
          selection={canDelete ? selection : null}
          onTogglePage={selection.setMany}
          onDelete={handleDelete}
          deletingId={deletingSubscriber?.id}
          sort={sort}
          onSortChange={handleSortChange}
        />
        <Pagination
          page={currentPage}
          pageCount={pageCount}
          totalCount={sorted.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          noun="subscribers"
        />
      </section>

      <DeleteOverlay
        active={deletingSubscriber != null || bulkDeleting}
        title={bulkDeleting ? "Deleting subscribers…" : "Deleting subscriber…"}
        itemLabel={bulkDeleting ? `${selection.size} selected` : deletingSubscriber?.email || ""}
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
