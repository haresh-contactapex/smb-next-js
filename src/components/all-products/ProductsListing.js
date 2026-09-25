"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ProductsFilters from "./ProductsFilters";
import ProductsTable from "./ProductsTable";
import Pagination, { PAGE_SIZE_OPTIONS } from "./Pagination";
import DeleteOverlay from "@/components/admin-panel/DeleteOverlay";
import Toast from "./Toast";

export default function ProductsListing({ products: initialProducts }) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [sort, setSort] = useState({ key: "title", direction: "asc" });
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [deleteToast, setDeleteToast] = useState({ visible: false, message: "" });

  async function handleDelete(product) {
    if (!window.confirm(`Delete "${product.title}"? This can't be undone.`)) return;
    setDeletingProduct(product);
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to delete product");
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      setDeleteToast({ visible: true, message: `"${product.title}" was removed.` });
      router.refresh();
    } catch (error) {
      window.alert(error.message);
    } finally {
      setDeletingProduct(null);
    }
  }

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))).sort(),
    [products]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !p.title.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false;
      if (status && p.status !== status) return false;
      if (category && p.category !== category) return false;
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

  function updateFilter(setter) {
    return (value) => {
      setter(value);
      setPage(1);
    };
  }

  function handleClear() {
    setSearch("");
    setStatus("");
    setCategory("");
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
        <ProductsTable
          products={pageItems}
          onDelete={handleDelete}
          deletingId={deletingProduct?.id}
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
        active={deletingProduct != null}
        title="Deleting item…"
        itemLabel={deletingProduct?.title || ""}
      />
      <Toast
        visible={deleteToast.visible}
        message={deleteToast.message}
        onDismiss={() => setDeleteToast((t) => ({ ...t, visible: false }))}
      />
    </>
  );
}
