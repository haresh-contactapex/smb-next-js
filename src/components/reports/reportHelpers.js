import { formatCurrency } from "@/lib/currency";
import { CHART_COLORS } from "./chartColors";

export function buildOrderSummaryStats(orderSummary) {
  return [
    { icon: "shopping-bag", iconColor: "primary", value: orderSummary.total, label: "Total Orders" },
    { icon: "check-circle", iconColor: "success", value: orderSummary.completed, label: "Completed Orders" },
    { icon: "clock", iconColor: "warning", value: orderSummary.pending, label: "Pending Orders" },
    { icon: "refresh-cw", iconColor: "info", value: orderSummary.processing, label: "Processing Orders" },
    { icon: "x-circle", iconColor: "error", value: orderSummary.cancelled, label: "Cancelled Orders" },
    { icon: "credit-card", iconColor: "accent", value: orderSummary.refunded, label: "Refunded Orders" },
  ];
}

export function buildInventoryStats(inventory) {
  return [
    { icon: "package", iconColor: "primary", value: inventory.currentStock, label: "Current Stock" },
    { icon: "alert-triangle", iconColor: "warning", value: inventory.lowStock, label: "Low Stock Products" },
    { icon: "x-circle", iconColor: "error", value: inventory.outOfStock, label: "Out of Stock Products" },
  ];
}

export function buildPaymentSummaryStats(paymentSummary) {
  return [
    {
      icon: "dollar-sign",
      iconColor: "success",
      value: formatCurrency(paymentSummary.totalReceived, paymentSummary.currency),
      label: "Total Payments Received",
    },
    { icon: "clock", iconColor: "warning", value: paymentSummary.pending, label: "Pending Payments" },
    { icon: "alert-triangle", iconColor: "error", value: paymentSummary.failed, label: "Failed Payments" },
  ];
}

// Chart datasets use only mutually-exclusive categories (each order counted
// once) so the slices add up to a meaningful whole — order status and
// payment status are each their own single column on `orders`, but
// "Refunded Orders" (a payment_status value) is not a status of its own, so
// it's left out of the order-status breakdown to avoid double-counting the
// same order in two slices.
export function buildOrderStatusChart(orderSummary) {
  return {
    labels: ["Completed", "Pending", "Processing", "Cancelled"],
    data: [orderSummary.completed, orderSummary.pending, orderSummary.processing, orderSummary.cancelled],
    colors: [CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.info, CHART_COLORS.error],
  };
}

export function buildInventoryChart(inventory) {
  return {
    labels: ["In Stock", "Low Stock", "Out of Stock"],
    data: [inventory.healthyStock, inventory.lowStock, inventory.outOfStock],
    colors: [CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.error],
  };
}

export function buildPaymentStatusChart(paymentSummary) {
  return {
    labels: ["Paid", "Unpaid", "Refunded", "Failed"],
    data: [paymentSummary.paid, paymentSummary.pending, paymentSummary.refunded, paymentSummary.failed],
    colors: [CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.accent, CHART_COLORS.error],
  };
}
