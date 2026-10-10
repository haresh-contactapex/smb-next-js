"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import OrdersFilters from "./OrdersFilters";
import OrdersTable from "./OrdersTable";
import Pagination, { PAGE_SIZE_OPTIONS } from "./Pagination";
import { downloadOrderInvoice } from "./downloadInvoice";
import Toast from "@/components/add-product/Toast";
import DeleteOverlay from "@/components/admin-panel/DeleteOverlay";
import useNavReselect from "@/components/admin-panel/useNavReselect";
import { BulkSelectionBar, requestBulkDelete, useBulkSelection } from "@/components/admin-panel/BulkSelection";
import { useCan } from "@/components/providers/StaffPermissionsProvider";
import { BULK_CANCELLABLE_STATUSES } from "./orderHelpers";

const TOAST_AUTO_DISMISS_MS = 10000;

// POST /api/orders/cancel with { ids }; resolves with { cancelled, skipped, paid }.
function requestBulkCancel(ids) {
  return requestBulkDelete("/api/orders/cancel", ids, "Failed to cancel orders", "POST");
}

function orderNumberValue(orderNumber) {
  const match = String(orderNumber || "").match(/(\d+)\s*$/);
  return match ? Number(match[1]) : 0;
}

export default function OrdersListing({ orders: initialOrders, fixedStatus }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState(initialOrders);
  // Bulk cancel is offered where cancellable orders can appear (not on the
  // Completed / Cancelled pages), to staff with Cancel Order.
  const canCancel = useCan()("orders.cancel") && (!fixedStatus || BULK_CANCELLABLE_STATUSES.includes(fixedStatus));
  const selection = useBulkSelection();
  const [cancelling, setCancelling] = useState(false);
  const [search, setSearch] = useState(() => searchParams.get("q") || "");
  const [status, setStatus] = useState(fixedStatus ?? "");
  const [payment, setPayment] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [sort, setSort] = useState({ key: "date", direction: "desc" });
  const [downloadingId, setDownloadingId] = useState(null);
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });
  const toastTimerRef = useRef(null);

  function showToast(message, variant = "success") {
    setToast({ message, visible: true, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), TOAST_AUTO_DISMISS_MS);
  }

  function dismissToast() {
    clearTimeout(toastTimerRef.current);
    setToast((t) => ({ ...t, visible: false }));
  }

  // Server data changes after router.refresh(); keep local state in step.
  useEffect(() => setOrders(initialOrders), [initialOrders]);

  // Clicking this orders page in the sidebar while already here starts the list over, like a fresh visit.
  useNavReselect(() => {
    setSearch("");
    setStatus(fixedStatus ?? "");
    setPayment("");
    setPage(1);
    setPageSize(PAGE_SIZE_OPTIONS[0]);
    setSort({ key: "date", direction: "desc" });
    selection.clear();
  });

  async function handleBulkCancel() {
    const ids = [...selection.ids];
    if (ids.length === 0 || cancelling) return;
    const chosen = orders.filter((order) => selection.has(order.orderId));
    const paid = chosen.filter((order) => order.payment === "Paid").length;
    const message = [
      `Cancel ${ids.length} selected order${ids.length === 1 ? "" : "s"}?`,
      "Each customer is emailed that their order was cancelled (if cancellation emails are on in Settings → Email).",
      paid > 0
        ? `${paid} of them ${paid === 1 ? "is" : "are"} paid: payments aren't refunded automatically, so refund ${paid === 1 ? "it" : "them"} by hand.`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    if (!window.confirm(message)) return;

    setCancelling(true);
    try {
      const { cancelled, skipped } = await requestBulkCancel(ids);
      const done = new Set(ids);
      setOrders((prev) =>
        prev.map((order) =>
          done.has(order.orderId) && BULK_CANCELLABLE_STATUSES.includes(order.status)
            ? { ...order, status: "Cancelled", statusColor: "error" }
            : order
        )
      );
      selection.clear();
      showToast(
        `${cancelled} order${cancelled === 1 ? "" : "s"} cancelled${skipped ? ` · ${skipped} skipped (no longer pending or processing)` : ""}.`
      );
      router.refresh();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setCancelling(false);
    }
  }

  async function handleDownloadInvoice(order) {
    setDownloadingId(order.orderId);
    try {
      await downloadOrderInvoice(order.orderId, order.orderNumber);
      showToast(`Invoice for ${order.id} downloaded`);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setDownloadingId(null);
    }
  }

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
      selection.clear();
    };
  }

  function handleClear() {
    selection.clear();
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
  const cancellableMatching = useMemo(
    () => sorted.filter((order) => BULK_CANCELLABLE_STATUSES.includes(order.status)),
    [sorted]
  );

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
        {canCancel && (
          <BulkSelectionBar
            count={selection.size}
            matchingCount={cancellableMatching.length}
            noun="cancellable orders"
            filtered={hasActiveFilters}
            onSelectAll={() => selection.replace(cancellableMatching.map((order) => order.orderId))}
            onClear={selection.clear}
            onDelete={handleBulkCancel}
            deleting={cancelling}
            actionLabel="Cancel selected"
            busyLabel="Cancelling…"
            actionIcon="x-circle"
          />
        )}
        <OrdersTable
          selection={canCancel ? selection : null}
          onTogglePage={selection.setMany}
          orders={pageItems}
          sort={sort}
          onSortChange={handleSortChange}
          onDownloadInvoice={handleDownloadInvoice}
          downloadingId={downloadingId}
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

      <DeleteOverlay active={cancelling} title="Cancelling orders…" itemLabel={`${selection.size} selected`} />
      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </>
  );
}
