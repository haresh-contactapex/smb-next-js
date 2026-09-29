import WelcomeHeader from "@/components/dashboard/WelcomeHeader";
import OrderStatsSection from "@/components/dashboard/OrderStatsSection";
import MiniStatGrid from "@/components/dashboard/MiniStatGrid";
import SalesChart from "@/components/dashboard/SalesChart";
import EarningStatistic from "@/components/dashboard/EarningStatistic";
import RecentOrdersTable from "@/components/dashboard/RecentOrdersTable";
import ProductPerformanceTable from "@/components/dashboard/ProductPerformanceTable";
import QuickActions from "@/components/dashboard/QuickActions";
import TopCustomers from "@/components/dashboard/TopCustomers";
import { adminPanelConfig } from "@/config/admin-panel.config";
import { getCurrentStaffUser } from "@/lib/auth/staffSession";
import { getCurrencyTaxSettings } from "@/lib/currencyTaxSettings";
import { getDashboardData } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

const quickActions = [
  { icon: "plus-circle", iconColor: "primary", label: "Add Product", href: "/admin/add-product" },
  { icon: "tag", iconColor: "accent", label: "Create Coupon", href: "/admin/create-coupon" },
  { icon: "shopping-bag", iconColor: "success", label: "View Orders", href: "/admin/orders" },
  { icon: "settings", iconColor: "warning", label: "Update Store Settings", href: "/admin/settings/general", wide: true },
];

async function loadCurrency() {
  try {
    return (await getCurrencyTaxSettings()).currency;
  } catch {
    return undefined;
  }
}

export default async function DashboardPage({ searchParams }) {
  const { range } = await searchParams;
  const [staffUser, currency] = await Promise.all([getCurrentStaffUser(), loadCurrency()]);
  const data = await getDashboardData({ rangeKey: range, currency });

  return (
    <>
      <WelcomeHeader name={staffUser?.firstName || adminPanelConfig.user.name} range={data.range} />

      {data.orderStats && data.totalSales && <OrderStatsSection stats={data.orderStats} totalSales={data.totalSales} />}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {data.productStats && <MiniStatGrid title="Products" stats={data.productStats} />}
        {data.couponStats && <MiniStatGrid title="Coupons" stats={data.couponStats} />}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {data.salesChartData && <SalesChart data={data.salesChartData} currency={currency} />}
        {data.earningStats && <EarningStatistic data={data.earningStats} currency={currency} />}
      </div>

      <RecentOrdersTable orders={data.recentOrders} viewAllHref="/admin/orders" />

      <ProductPerformanceTable products={data.productStock} viewAllHref="/admin/all-products" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <QuickActions actions={quickActions} />
        <TopCustomers customers={data.topCustomers} viewAllHref="/admin/all-customers" />
      </div>
    </>
  );
}
