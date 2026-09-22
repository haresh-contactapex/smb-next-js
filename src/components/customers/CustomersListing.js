"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CustomersFilters from "./CustomersFilters";
import CustomersTable from "./CustomersTable";
import Pagination from "./Pagination";

const PAGE_SIZE = 8;

export default function CustomersListing({ customers: initialCustomers }) {
  const router = useRouter();
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);

  async function handleDelete(customer) {
    if (!window.confirm(`Delete customer "${customer.firstName} ${customer.lastName}"? This can't be undone.`)) return;
    try {
      const res = await fetch(`/api/customers/${customer.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to delete customer");
      setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
      router.refresh();
    } catch (error) {
      window.alert(error.message);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((customer) => {
      if (q) {
        const haystack = `${customer.firstName} ${customer.lastName} ${customer.email} ${customer.phone || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (group && customer.customerGroup !== group) return false;
      if (type === "guest" && !customer.isGuest) return false;
      if (type === "registered" && customer.isGuest) return false;
      return true;
    });
  }, [customers, search, group, type]);

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
    setGroup("");
    setType("");
    setPage(1);
  }

  const hasActiveFilters = Boolean(search || group || type);

  return (
    <>
      <CustomersFilters
        search={search}
        onSearchChange={updateFilter(setSearch)}
        group={group}
        onGroupChange={updateFilter(setGroup)}
        type={type}
        onTypeChange={updateFilter(setType)}
        resultCount={filtered.length}
        onClear={handleClear}
        hasActiveFilters={hasActiveFilters}
      />

      <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
        <CustomersTable customers={pageItems} onDelete={handleDelete} />
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
