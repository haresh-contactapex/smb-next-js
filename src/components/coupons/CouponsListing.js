"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CouponsFilters from "./CouponsFilters";
import CouponsTable from "./CouponsTable";
import Pagination from "./Pagination";

const PAGE_SIZE = 8;

export default function CouponsListing({ coupons: initialCoupons }) {
  const router = useRouter();
  const [coupons, setCoupons] = useState(initialCoupons);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);

  async function handleDelete(coupon) {
    if (!window.confirm(`Delete coupon "${coupon.code}"? This can't be undone.`)) return;
    try {
      const res = await fetch(`/api/coupons/${coupon.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to delete coupon");
      setCoupons((prev) => prev.filter((c) => c.id !== coupon.id));
      router.refresh();
    } catch (error) {
      window.alert(error.message);
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
    setType("");
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
        resultCount={filtered.length}
        onClear={handleClear}
        hasActiveFilters={hasActiveFilters}
      />

      <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
        <CouponsTable coupons={pageItems} onDelete={handleDelete} />
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
