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

// The three stages an order moves through, for the progress tracker on the order
// page (the customer's own order page uses the same ones).
export const ORDER_STEPS = ["Pending", "Processing", "Completed"];
export const ORDER_STEP_LABELS = { Pending: "Order placed", Processing: "Processing", Completed: "Completed" };

// One line of context under the tracker, written for the store's staff.
export const ORDER_STATUS_NOTES = {
  Pending: "Waiting to be processed.",
  Processing: "Being prepared.",
  Completed: "This order is complete.",
};

// What a cancelled order still needs from the store, by how it was paid.
export const CANCELLED_PAYMENT_NOTES = {
  Refunded: "The payment has been refunded.",
  Paid: "The customer paid for this order, so it still needs a refund.",
};
export const CANCELLED_UNPAID_NOTE = "No payment was taken for this order.";
