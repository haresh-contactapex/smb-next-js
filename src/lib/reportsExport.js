import { getReportsData } from "./reports";
import { formatCurrency } from "./currency";

function toCsvField(value) {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function rowToCsvLine(section, metric, value) {
  return [section, metric, value].map(toCsvField).join(",");
}

export async function exportReportsToCsv() {
  const { orderSummary, inventory, paymentSummary } = await getReportsData();

  const lines = ["Section,Metric,Value"];

  lines.push(rowToCsvLine("Order Summary", "Total Orders", orderSummary.total));
  lines.push(rowToCsvLine("Order Summary", "Completed Orders", orderSummary.completed));
  lines.push(rowToCsvLine("Order Summary", "Pending Orders", orderSummary.pending));
  lines.push(rowToCsvLine("Order Summary", "Processing Orders", orderSummary.processing));
  lines.push(rowToCsvLine("Order Summary", "Cancelled Orders", orderSummary.cancelled));
  lines.push(rowToCsvLine("Order Summary", "Refunded Orders", orderSummary.refunded));

  lines.push(rowToCsvLine("Inventory Report", "Current Stock", inventory.currentStock));
  lines.push(rowToCsvLine("Inventory Report", "Low Stock Products", inventory.lowStock));
  lines.push(rowToCsvLine("Inventory Report", "Out of Stock Products", inventory.outOfStock));

  lines.push(
    rowToCsvLine(
      "Payment Summary",
      "Total Payments Received",
      formatCurrency(paymentSummary.totalReceived, paymentSummary.currency)
    )
  );
  lines.push(rowToCsvLine("Payment Summary", "Pending Payments", paymentSummary.pending));
  lines.push(rowToCsvLine("Payment Summary", "Failed Payments", paymentSummary.failed));

  return lines.join("\r\n") + "\r\n";
}
