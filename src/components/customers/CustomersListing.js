"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CustomersFilters from "./CustomersFilters";
import CustomersTable from "./CustomersTable";
import Pagination, { PAGE_SIZE_OPTIONS } from "./Pagination";
import DeleteOverlay from "@/components/admin-panel/DeleteOverlay";
import Toast from "./Toast";

export default function CustomersListing({ customers: initialCustomers }) {
  const router = useRouter();
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [sort, setSort] = useState({ key: "name", direction: "asc" });
  const [deletingCustomer, setDeletingCustomer] = useState(null);
  const [deleteToast, setDeleteToast] = useState({ visible: false, message: "" });

  async function handleDelete(customer) {
    if (!window.confirm(`Delete customer "${customer.firstName} ${customer.lastName}"? This can't be undone.`)) return;
    setDeletingCustomer(customer);
    try {
      const res = await fetch(`/api/customers/${customer.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to delete customer");
      setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
      setDeleteToast({ visible: true, message: `"${customer.firstName} ${customer.lastName}" was removed.` });
      router.refresh();
    } catch (error) {
      window.alert(error.message);
    } finally {
      setDeletingCustomer(null);
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

  const sorted = useMemo(() => {
    const { key, direction } = sort;
    const dir = direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (key === "loyaltyPoints") return (a.loyaltyPoints - b.loyaltyPoints) * dir;
      if (key === "createdAt") return String(a.createdAt || "").localeCompare(String(b.createdAt || "")) * dir;
      if (key === "customerGroup") return String(a.customerGroup).localeCompare(String(b.customerGroup), undefined, { sensitivity: "base" }) * dir;
      const nameA = `${a.firstName} ${a.lastName}`;
      const nameB = `${b.firstName} ${b.lastName}`;
      return nameA.localeCompare(nameB, undefined, { sensitivity: "base" }) * dir;
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
    setGroup("");
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
        resultCount={sorted.length}
        onClear={handleClear}
        hasActiveFilters={hasActiveFilters}
      />

      <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
        <CustomersTable
          customers={pageItems}
          onDelete={handleDelete}
          deletingId={deletingCustomer?.id}
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
        active={deletingCustomer != null}
        title="Deleting customer…"
        itemLabel={deletingCustomer ? `${deletingCustomer.firstName} ${deletingCustomer.lastName}` : ""}
      />
      <Toast
        visible={deleteToast.visible}
        message={deleteToast.message}
        onDismiss={() => setDeleteToast((t) => ({ ...t, visible: false }))}
      />
    </>
  );
}
