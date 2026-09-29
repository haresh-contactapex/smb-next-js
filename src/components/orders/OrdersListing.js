"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import OrdersFilters from "./OrdersFilters";
import OrdersTable from "./OrdersTable";
import Pagination, { PAGE_SIZE_OPTIONS } from "./Pagination";

function orderNumberValue(orderNumber) {
  const match = String(orderNumber || "").match(/(\d+)\s*$/);
  return match ? Number(match[1]) : 0;
}

export default function OrdersListing({ orders, fixedStatus }) {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") || "");
  const [status, setStatus] = useState(fixedStatus ?? "");
  const [payment, setPayment] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [sort, setSort] = useState({ key: "date", direction: "desc" });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (fixedStatus) {
        if (order.status !== fixedStatus) return false;
      } else if (status && order.status !== status) {
        return false;
      }
      if (q && !order.id.toLowerCase().includes(q) && !order.customer.toLowerCase().includes(q)) return false;
      if (payment && order.payment !== payment) return false;
      return true;
    });
  }, [orders, search, status, payment, fixedStatus]);

  const sorted = useMemo(() => {
    const { key, direction } = sort;
    const dir = direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (key === "id") return (orderNumberValue(a.orderNumber) - orderNumberValue(b.orderNumber)) * dir;
      if (key === "date") return String(a.placedAt).localeCompare(String(b.placedAt)) * dir;
      if (key === "amount") return (a.totalAmount - b.totalAmount) * dir;
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
    setStatus(fixedStatus ?? "");
    setPayment("");
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

  const hasActiveFilters = Boolean(search || (!fixedStatus && status) || payment);

  return (
    <>
      <OrdersFilters
        search={search}
        onSearchChange={updateFilter(setSearch)}
        status={status}
        onStatusChange={updateFilter(setStatus)}
        hideStatusFilter={Boolean(fixedStatus)}
        payment={payment}
        onPaymentChange={updateFilter(setPayment)}
        resultCount={sorted.length}
        onClear={handleClear}
        hasActiveFilters={hasActiveFilters}
      />

      <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
        <OrdersTable orders={pageItems} sort={sort} onSortChange={handleSortChange} />
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
