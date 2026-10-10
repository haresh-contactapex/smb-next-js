"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CouponsFilters from "./CouponsFilters";
import CouponsTable from "./CouponsTable";
import Pagination, { PAGE_SIZE_OPTIONS } from "./Pagination";
import DeleteOverlay from "@/components/admin-panel/DeleteOverlay";
import useNavReselect from "@/components/admin-panel/useNavReselect";
import { BulkSelectionBar, confirmBulkDelete, requestBulkDelete, useBulkSelection } from "@/components/admin-panel/BulkSelection";
import { useCan } from "@/components/providers/StaffPermissionsProvider";
import Toast from "./Toast";

export default function CouponsListing({ coupons: initialCoupons }) {
  const router = useRouter();
  const canDelete = useCan()("coupons.delete");
  const selection = useBulkSelection();
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [coupons, setCoupons] = useState(initialCoupons);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [sort, setSort] = useState({ key: "code", direction: "asc" });
  const [deletingCoupon, setDeletingCoupon] = useState(null);
  const [deleteToast, setDeleteToast] = useState({ visible: false, message: "" });

  // Clicking "All Coupons" in the sidebar while already here starts the list over, like a fresh visit.
  useNavReselect(() => {
    setSearch("");
    setStatus("");
    setType("");
    setPage(1);
    setPageSize(PAGE_SIZE_OPTIONS[0]);
    setSort({ key: "code", direction: "asc" });
    selection.clear();
  });

  async function handleDelete(coupon) {
    if (!window.confirm(`Delete coupon "${coupon.code}"? This can't be undone.`)) return;
    setDeletingCoupon(coupon);
    try {
      const res = await fetch(`/api/coupons/${coupon.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to delete coupon");
      setCoupons((prev) => prev.filter((c) => c.id !== coupon.id));
      selection.remove([coupon.id]);
      setDeleteToast({ visible: true, message: `"${coupon.code}" was removed.` });
      router.refresh();
    } catch (error) {
      window.alert(error.message);
    } finally {
      setDeletingCoupon(null);
    }
  }

  async function handleBulkDelete() {
    const ids = [...selection.ids];
    if (ids.length === 0 || bulkDeleting) return;
    if (!confirmBulkDelete(ids.length, "coupon", "coupons")) return;
    setBulkDeleting(true);
    try {
      const { deleted } = await requestBulkDelete("/api/coupons", ids, "Failed to delete coupons");
      const removed = new Set(ids);
      setCoupons((prev) => prev.filter((x) => !removed.has(x.id)));
      selection.clear();
      setDeleteToast({ visible: true, message: `${deleted} coupon${deleted === 1 ? "" : "s"} removed.` });
      router.refresh();
    } catch (error) {
      window.alert(error.message);
    } finally {
      setBulkDeleting(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return coupons.filter((coupon) => {
      if (q && !coupon.code.toLowerCase().includes(q) && !coupon.description.toLowerCase().includes(q)) return false;
      if (status && coupon.status !== status) return false;
      if (type && coupon.type !== type) return false;
      return true;
    });
  }, [coupons, search, status, type]);

  const sorted = useMemo(() => {
    const { key, direction } = sort;
    const dir = direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (key === "usageCount") return (a.usageCount - b.usageCount) * dir;
      if (key === "startDate") return String(a.startDate || "").localeCompare(String(b.startDate || "")) * dir;
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
      selection.clear();
    };
  }

  function handleClear() {
    selection.clear();
    setSearch("");
    setStatus("");
    setType("");
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

  const hasActiveFilters = Boolean(search || status || type);

  return (
    <>
      <CouponsFilters
        search={search}
        onSearchChange={updateFilter(setSearch)}
        status={status}
        onStatusChange={updateFilter(setStatus)}
        type={type}
        onTypeChange={updateFilter(setType)}
        resultCount={sorted.length}
        onClear={handleClear}
        hasActiveFilters={hasActiveFilters}
      />

      <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
        {canDelete && (
          <BulkSelectionBar
            count={selection.size}
            matchingCount={sorted.length}
            noun="coupons"
            filtered={hasActiveFilters}
            onSelectAll={() => selection.replace(sorted.map((x) => x.id))}
            onClear={selection.clear}
            onDelete={handleBulkDelete}
            deleting={bulkDeleting}
          />
        )}
        <CouponsTable
          selection={canDelete ? selection : null}
          onTogglePage={selection.setMany}
          coupons={pageItems}
          onDelete={handleDelete}
          deletingId={deletingCoupon?.id}
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
      <DeleteOverlay
        active={deletingCoupon != null || bulkDeleting}
        title={bulkDeleting ? "Deleting coupons…" : "Deleting coupon…"}
        itemLabel={bulkDeleting ? `${selection.size} selected` : deletingCoupon?.code || ""}
      />
      <Toast
        visible={deleteToast.visible}
        message={deleteToast.message}
        onDismiss={() => setDeleteToast((t) => ({ ...t, visible: false }))}
      />
    </>
  );
}
