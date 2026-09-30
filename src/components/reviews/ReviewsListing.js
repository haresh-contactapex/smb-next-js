"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReviewsFilters from "./ReviewsFilters";
import ReviewsTable from "./ReviewsTable";
import Pagination, { PAGE_SIZE_OPTIONS } from "./Pagination";
import ReviewsStats from "./ReviewsStats";
import { STATUS_LABELS, computeReviewStats } from "./reviewHelpers";
import DeleteOverlay from "@/components/admin-panel/DeleteOverlay";
import Toast from "@/components/add-product/Toast";

// Keep in sync with AUTO_DISMISS_MS in the shared Add Product toast, which
// also drives the progress-bar animation for both success and error messages.
const TOAST_AUTO_DISMISS_MS = 10000;

export default function ReviewsListing({ reviews: initialReviews }) {
  const router = useRouter();
  const [reviews, setReviews] = useState(initialReviews);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [rating, setRating] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [sort, setSort] = useState({ key: "createdAt", direction: "desc" });
  const [busyId, setBusyId] = useState(null);
  const [deletingReview, setDeletingReview] = useState(null);
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });
  const toastTimerRef = useRef(null);
  // Synchronous guard: state updates land after a render, so two quick clicks
  // could otherwise fire two requests for the same review.
  const busyRef = useRef(false);

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  function showToast(message, variant = "success") {
    setToast({ message, visible: true, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), TOAST_AUTO_DISMISS_MS);
  }

  function dismissToast() {
    clearTimeout(toastTimerRef.current);
    setToast((t) => ({ ...t, visible: false }));
  }

  async function request(review, init) {
    if (busyRef.current) return null;
    busyRef.current = true;
    setBusyId(review.id);
    try {
      const res = await fetch(`/api/reviews/${review.id}`, init);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Something went wrong. Try again.");
      return json;
    } catch (error) {
      showToast(error.message, "error");
      return null;
    } finally {
      busyRef.current = false;
      setBusyId(null);
    }
  }

  async function handleSetStatus(review, nextStatus) {
    const json = await request(review, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!json) return;
    setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, status: nextStatus } : r)));
    showToast(`"${review.title}" marked ${STATUS_LABELS[nextStatus].toLowerCase()}`);
    router.refresh();
  }

  async function handleDelete(review) {
    if (!window.confirm(`Delete the review "${review.title}" by ${review.displayName}? This can't be undone.`)) return;
    setDeletingReview(review);
    try {
      const json = await request(review, { method: "DELETE" });
      if (!json) return;
      setReviews((prev) => prev.filter((r) => r.id !== review.id));
      showToast(`"${review.title}" was removed.`);
      router.refresh();
    } finally {
      setDeletingReview(null);
    }
  }

  const stats = useMemo(() => computeReviewStats(reviews), [reviews]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reviews.filter((review) => {
      if (
        q &&
        ![review.title, review.content, review.displayName, review.email, review.productTitle].some((field) =>
          field.toLowerCase().includes(q)
        )
      ) {
        return false;
      }
      if (status && review.status !== status) return false;
      if (rating && review.rating !== Number(rating)) return false;
      return true;
    });
  }, [reviews, search, status, rating]);

  const sorted = useMemo(() => {
    const { key, direction } = sort;
    const dir = direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (key === "rating") return (a.rating - b.rating) * dir;
      // ISO timestamps sort correctly as strings.
      return String(a[key]).localeCompare(String(b[key]), undefined, { sensitivity: "base" }) * dir;
    });
  }, [filtered, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageItems = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function updateFilter(setter) {
    return (value) => {
      setter(value);
      setPage(1);
    };
  }

  function handleClear() {
    setSearch("");
    setStatus("");
    setRating("");
    setPage(1);
  }

  function handleSortChange(key) {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
    setPage(1);
  }

  function handlePageSizeChange(size) {
    setPageSize(size);
    setPage(1);
  }

  const hasActiveFilters = Boolean(search || status || rating);

  return (
    <>
      <ReviewsStats stats={stats} />

      <ReviewsFilters
        search={search}
        onSearchChange={updateFilter(setSearch)}
        status={status}
        onStatusChange={updateFilter(setStatus)}
        rating={rating}
        onRatingChange={updateFilter(setRating)}
        resultCount={sorted.length}
        onClear={handleClear}
        hasActiveFilters={hasActiveFilters}
      />

      <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
        <ReviewsTable
          reviews={pageItems}
          onSetStatus={handleSetStatus}
          onDelete={handleDelete}
          busyId={busyId}
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
        />
      </section>
      <DeleteOverlay active={deletingReview != null} title="Deleting review…" itemLabel={deletingReview?.title || ""} />
      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </>
  );
}
