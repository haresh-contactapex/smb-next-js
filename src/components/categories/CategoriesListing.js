"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CategoriesFilters from "./CategoriesFilters";
import CategoriesTable from "./CategoriesTable";
import Pagination, { PAGE_SIZE_OPTIONS } from "./Pagination";

export default function CategoriesListing({ categories: initialCategories }) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [search, setSearch] = useState("");
  const [showHiddenOnly, setShowHiddenOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [sort, setSort] = useState({ key: "name", direction: "asc" });

  async function handleDelete(category) {
    if (!window.confirm(`Delete "${category.name}"? This can't be undone.`)) return;
    try {
      const res = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to delete category");
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
      router.refresh();
    } catch (error) {
      window.alert(error.message);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categories.filter((cat) => {
      if (q && !cat.name.toLowerCase().includes(q) && !cat.slug.toLowerCase().includes(q)) return false;
      if (showHiddenOnly && cat.visible) return false;
      return true;
    });
  }, [categories, search, showHiddenOnly]);

  const sorted = useMemo(() => {
    const { key, direction } = sort;
    const dir = direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (key === "productCount") return (a.productCount - b.productCount) * dir;
      if (key === "visible") return (Number(a.visible) - Number(b.visible)) * dir;
      return String(a[key]).localeCompare(String(b[key]), undefined, { sensitivity: "base" }) * dir;
    });
  }, [filtered, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageItems = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

  function handleSearchChange(value) {
    setSearch(value);
    setPage(1);
  }

  function handleToggleHidden(value) {
    setShowHiddenOnly(value);
    setPage(1);
  }

  return (
    <>
      <CategoriesFilters
        search={search}
        onSearchChange={handleSearchChange}
        showHiddenOnly={showHiddenOnly}
        onToggleHidden={handleToggleHidden}
        resultCount={sorted.length}
      />

      <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
        <CategoriesTable categories={pageItems} onDelete={handleDelete} sort={sort} onSortChange={handleSortChange} />
        <Pagination
          page={currentPage}
          pageCount={pageCount}
          totalCount={sorted.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      </section>
    </>
  );
}
