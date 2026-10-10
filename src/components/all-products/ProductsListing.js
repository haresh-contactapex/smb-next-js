"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProductsFilters from "./ProductsFilters";
import ProductsTable from "./ProductsTable";
import Pagination, { PaginationSummary, RowsPerPageSelect, PAGE_SIZE_OPTIONS } from "./Pagination";
import DeleteOverlay from "@/components/admin-panel/DeleteOverlay";
import Icon from "@/components/admin-panel/Icon";
import useNavReselect from "@/components/admin-panel/useNavReselect";
import { useCan } from "@/components/providers/StaffPermissionsProvider";
import Toast from "./Toast";

function withoutId(set, id) {
  const next = new Set(set);
  next.delete(id);
  return next;
}

export default function ProductsListing({ products: initialProducts }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState(() => searchParams.get("q") || "");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [sort, setSort] = useState({ key: "title", direction: "asc" });
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deleteToast, setDeleteToast] = useState({ visible: false, message: "" });
  const can = useCan();

  // Clicking "All Products" in the sidebar while already here starts the list over, like a fresh visit.
  useNavReselect(() => {
    setSearch("");
    setStatus("");
    setCategory("");
    setPage(1);
    setPageSize(PAGE_SIZE_OPTIONS[0]);
    setSort({ key: "title", direction: "asc" });
    setSelectedIds(new Set());
  });

  async function handleDelete(product) {
    if (!window.confirm(`Delete "${product.title}"? This can't be undone.`)) return;
    setDeletingProduct(product);
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to delete product");
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      setSelectedIds((prev) => withoutId(prev, product.id));
      setDeleteToast({ visible: true, message: `"${product.title}" was removed.` });
      router.refresh();
    } catch (error) {
      window.alert(error.message);
    } finally {
      setDeletingProduct(null);
    }
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    if (ids.length === 0 || bulkDeleting) return;
    const everything = ids.length === products.length;
    const message = everything
      ? `Delete ALL ${ids.length} products? This can't be undone.`
      : `Delete ${ids.length} selected product${ids.length === 1 ? "" : "s"}? This can't be undone.`;
    if (!window.confirm(message)) return;
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to delete products");
      const removed = new Set(ids);
      setProducts((prev) => prev.filter((p) => !removed.has(p.id)));
      setSelectedIds(new Set());
      setDeleteToast({
        visible: true,
        message: `${json.data.deleted} product${json.data.deleted === 1 ? "" : "s"} removed.`,
      });
      router.refresh();
    } catch (error) {
      window.alert(error.message);
    } finally {
      setBulkDeleting(false);
    }
  }

  const categories = useMemo(
    () => Array.from(new Set(products.flatMap((p) => p.categories || [p.category]))).sort(),
    [products]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !p.title.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false;
      if (status && p.status !== status) return false;
      if (category && !(p.categories || [p.category]).includes(category)) return false;
      return true;
    });
  }, [products, search, status, category]);

  const sorted = useMemo(() => {
    const { key, direction } = sort;
    const dir = direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (key === "price") return (Number(a.price) - Number(b.price)) * dir;
      return String(a[key]).localeCompare(String(b[key]), undefined, { sensitivity: "base" }) * dir;
    });
  }, [filtered, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageItems = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Selection is tied to what the filters show, so changing them starts afresh.
  function updateFilter(setter) {
    return (value) => {
      setter(value);
      setPage(1);
      setSelectedIds(new Set());
    };
  }

  function handleClear() {
    setSearch("");
    setStatus("");
    setCategory("");
    setPage(1);
    setSelectedIds(new Set());
  }

  function handleToggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleTogglePage(select) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const item of pageItems) {
        if (select) next.add(item.id);
        else next.delete(item.id);
      }
      return next;
    });
  }

  function handleSelectAllMatching() {
    setSelectedIds(new Set(sorted.map((p) => p.id)));
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

  const hasActiveFilters = Boolean(search || status || category);

  return (
    <>
      <ProductsFilters
        search={search}
        onSearchChange={updateFilter(setSearch)}
        status={status}
        onStatusChange={updateFilter(setStatus)}
        category={category}
        onCategoryChange={updateFilter(setCategory)}
        categories={categories}
        resultCount={sorted.length}
        onClear={handleClear}
        hasActiveFilters={hasActiveFilters}
      />

      <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
        {sorted.length > 0 && (
          <div className="flex items-center justify-between gap-4 mb-3">
            <PaginationSummary page={currentPage} totalCount={sorted.length} pageSize={pageSize} />
            <RowsPerPageSelect pageSize={pageSize} onPageSizeChange={handlePageSizeChange} />
          </div>
        )}
        {selectedIds.size > 0 && can("products.delete") && (
          <div
            role="status"
            className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3 px-4 py-2.5 rounded-xl bg-primary-50 dark:bg-white/5 border border-primary-100 dark:border-white/10 text-sm"
          >
            <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedIds.size} selected</span>
            {selectedIds.size < sorted.length && (
              <button
                type="button"
                onClick={handleSelectAllMatching}
                className="text-xs font-semibold text-primary-600 dark:text-accent-400 hover:underline"
              >
                Select all {sorted.length} {hasActiveFilters ? "matching " : ""}products
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:underline"
            >
              Clear selection
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="ml-auto inline-flex items-center gap-2 px-3.5 h-9 rounded-lg bg-error hover:opacity-90 text-white text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
            >
              <Icon name="trash-2" className="w-4 h-4" />
              {bulkDeleting ? "Deleting…" : `Delete selected (${selectedIds.size})`}
            </button>
          </div>
        )}
        <ProductsTable
          products={pageItems}
          onDelete={handleDelete}
          deletingId={deletingProduct?.id}
          sort={sort}
          onSortChange={handleSortChange}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onTogglePage={handleTogglePage}
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
        active={deletingProduct != null || bulkDeleting}
        title={bulkDeleting ? "Deleting products…" : "Deleting item…"}
        itemLabel={bulkDeleting ? `${selectedIds.size} selected` : deletingProduct?.title || ""}
      />
      <Toast
        visible={deleteToast.visible}
        message={deleteToast.message}
        onDismiss={() => setDeleteToast((t) => ({ ...t, visible: false }))}
      />
    </>
  );
}
