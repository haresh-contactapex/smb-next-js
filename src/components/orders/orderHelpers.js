export function computeOrderStats(orders) {
  return {
    total: orders.length,
    pending: orders.filter((o) => o.status === "Pending").length,
    processing: orders.filter((o) => o.status === "Processing").length,
    completed: orders.filter((o) => o.status === "Completed").length,
    cancelled: orders.filter((o) => o.status === "Cancelled").length,
  };
}

export const STATUS_OPTIONS = ["Pending", "Processing", "Completed", "Cancelled"];
export const PAYMENT_OPTIONS = ["Paid", "Unpaid", "Refunded", "Failed"];

// Keep in sync with BULK_CANCELLABLE_STATUSES in src/lib/orders.js: only these
// orders can be picked for a bulk cancel on the orders list.
export const BULK_CANCELLABLE_STATUSES = ["Pending", "Processing"];
