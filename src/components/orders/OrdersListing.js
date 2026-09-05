"use client";

import { useMemo, useState } from "react";
import OrdersFilters from "./OrdersFilters";
import OrdersTable from "./OrdersTable";
import Pagination from "./Pagination";

const PAGE_SIZE = 8;

export default function OrdersListing({ orders, fixedStatus }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(fixedStatus ?? "");
  const [payment, setPayment] = useState("");
  const [page, setPage] = useState(1);

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
    setStatus(fixedStatus ?? "");
    setPayment("");
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
        resultCount={filtered.length}
        onClear={handleClear}
        hasActiveFilters={hasActiveFilters}
      />

      <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
        <OrdersTable orders={pageItems} />
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
