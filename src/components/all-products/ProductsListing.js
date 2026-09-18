"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ProductsFilters from "./ProductsFilters";
import ProductsTable from "./ProductsTable";
import Pagination from "./Pagination";

const PAGE_SIZE = 8;

export default function ProductsListing({ products: initialProducts }) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  async function handleDelete(product) {
    if (!window.confirm(`Delete "${product.title}"? This can't be undone.`)) return;
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to delete product");
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      router.refresh();
    } catch (error) {
      window.alert(error.message);
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

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
        resultCount={filtered.length}
        onClear={handleClear}
        hasActiveFilters={hasActiveFilters}
      />

      <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
        <ProductsTable products={pageItems} onDelete={handleDelete} />
        <Pagination
          page={currentPage}
          pageCount={pageCount}
          totalCount={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </section>
    </>
  );
}
