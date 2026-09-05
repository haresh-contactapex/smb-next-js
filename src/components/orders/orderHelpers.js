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
export const PAYMENT_OPTIONS = ["Paid", "Unpaid", "Refunded"];
