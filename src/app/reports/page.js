import ReportsPageToolbar from "@/components/reports/ReportsPageToolbar";
import ReportSection from "@/components/reports/ReportSection";
import ReportStatGrid from "@/components/reports/ReportStatGrid";
import ReportDoughnutChart from "@/components/reports/ReportDoughnutChart";
import {
  buildOrderSummaryStats,
  buildInventoryStats,
  buildPaymentSummaryStats,
  buildOrderStatusChart,
  buildInventoryChart,
  buildPaymentStatusChart,
} from "@/components/reports/reportHelpers";
import { getReportsData } from "@/lib/reports";

export const metadata = {
  title: "Reports · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const { orderSummary, inventory, paymentSummary } = await getReportsData();

  const orderStatusChart = buildOrderStatusChart(orderSummary);
  const inventoryChart = buildInventoryChart(inventory);
  const paymentStatusChart = buildPaymentStatusChart(paymentSummary);

  return (
    <>
      <ReportsPageToolbar />

      <ReportSection title="Order Reports">
        <ReportStatGrid title="Order Summary" stats={buildOrderSummaryStats(orderSummary)} />
        <ReportDoughnutChart
          title="Orders by Status"
          subtitle="Share of all orders in each status"
          labels={orderStatusChart.labels}
          data={orderStatusChart.data}
          colors={orderStatusChart.colors}
        />
      </ReportSection>

      <ReportSection title="Product Reports">
        <ReportStatGrid title="Inventory Report" stats={buildInventoryStats(inventory)} />
        <ReportDoughnutChart
          title="Products by Stock Level"
          subtitle="Share of products in stock, low stock, and out of stock"
          labels={inventoryChart.labels}
          data={inventoryChart.data}
          colors={inventoryChart.colors}
        />
      </ReportSection>

      <ReportSection title="Payment Reports">
        <ReportStatGrid title="Payment Summary" stats={buildPaymentSummaryStats(paymentSummary)} />
        <ReportDoughnutChart
          title="Orders by Payment Status"
          subtitle="Share of all orders by payment outcome"
          labels={paymentStatusChart.labels}
          data={paymentStatusChart.data}
          colors={paymentStatusChart.colors}
        />
      </ReportSection>
    </>
  );
}
