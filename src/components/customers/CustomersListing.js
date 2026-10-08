"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CustomersFilters from "./CustomersFilters";
import CustomersTable from "./CustomersTable";
import Pagination, { PAGE_SIZE_OPTIONS } from "./Pagination";
import DeleteOverlay from "@/components/admin-panel/DeleteOverlay";
import Icon from "@/components/admin-panel/Icon";
import { useCan } from "@/components/providers/StaffPermissionsProvider";
import Toast from "./Toast";

function withoutId(set, id) {
  const next = new Set(set);
  next.delete(id);
  return next;
}

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
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deleteToast, setDeleteToast] = useState({ visible: false, message: "" });
  const can = useCan();

  async function handleDelete(customer) {
    if (!window.confirm(`Delete customer "${customer.firstName} ${customer.lastName}"? This can't be undone.`)) return;
    setDeletingCustomer(customer);
    try {
      const res = await fetch(`/api/customers/${customer.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to delete customer");
      setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
      setSelectedIds((prev) => withoutId(prev, customer.id));
      setDeleteToast({ visible: true, message: `"${customer.firstName} ${customer.lastName}" was removed.` });
      router.refresh();
    } catch (error) {
      window.alert(error.message);
    } finally {
      setDeletingCustomer(null);
    }
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    if (ids.length === 0 || bulkDeleting) return;
    const everything = ids.length === customers.length;
    const message = everything
      ? `Delete ALL ${ids.length} customers? This can't be undone.`
      : `Delete ${ids.length} selected customer${ids.length === 1 ? "" : "s"}? This can't be undone.`;
    if (!window.confirm(message)) return;
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/customers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to delete customers");
      const removed = new Set(ids);
      setCustomers((prev) => prev.filter((c) => !removed.has(c.id)));
      setSelectedIds(new Set());
      setDeleteToast({
        visible: true,
        message: `${json.data.deleted} customer${json.data.deleted === 1 ? "" : "s"} removed.`,
      });
      router.refresh();
    } catch (error) {
      window.alert(error.message);
    } finally {
      setBulkDeleting(false);
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
      if (key === "accountType") return (Number(a.isGuest) - Number(b.isGuest)) * dir;
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
    setGroup("");
    setType("");
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
    setSelectedIds(new Set(sorted.map((c) => c.id)));
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
        {selectedIds.size > 0 && can("customers.delete") && (
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
                Select all {sorted.length} {hasActiveFilters ? "matching " : ""}customers
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
        <CustomersTable
          customers={pageItems}
          onDelete={handleDelete}
          deletingId={deletingCustomer?.id}
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
        active={deletingCustomer != null || bulkDeleting}
        title={bulkDeleting ? "Deleting customers…" : "Deleting customer…"}
        itemLabel={
          bulkDeleting
            ? `${selectedIds.size} selected`
            : deletingCustomer
              ? `${deletingCustomer.firstName} ${deletingCustomer.lastName}`
              : ""
        }
      />
      <Toast
        visible={deleteToast.visible}
        message={deleteToast.message}
        onDismiss={() => setDeleteToast((t) => ({ ...t, visible: false }))}
      />
    </>
  );
}
