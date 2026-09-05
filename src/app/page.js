import WelcomeHeader from "@/components/dashboard/WelcomeHeader";
import StoreSetupProgress from "@/components/dashboard/StoreSetupProgress";
import OrderStatsSection from "@/components/dashboard/OrderStatsSection";
import MiniStatGrid from "@/components/dashboard/MiniStatGrid";
import SalesChart from "@/components/dashboard/SalesChart";
import RecentOrdersTable from "@/components/dashboard/RecentOrdersTable";
import ProductPerformanceTable from "@/components/dashboard/ProductPerformanceTable";
import QuickActions from "@/components/dashboard/QuickActions";
import RecentActivity from "@/components/dashboard/RecentActivity";
import {
  storeSetupSteps,
  orderStats,
  totalSales,
  productStats,
  couponGiftCardStats,
  recentOrders,
  productPerformance,
  quickActions,
  recentActivity,
} from "@/data/dashboardData";
import { adminPanelConfig } from "@/config/admin-panel.config";

export default function DashboardPage() {
  return (
    <>
      <WelcomeHeader name={adminPanelConfig.user.name} />

      <StoreSetupProgress data={storeSetupSteps} />

      <OrderStatsSection stats={orderStats} totalSales={totalSales} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <MiniStatGrid title="Products" stats={productStats} />
        <MiniStatGrid title="Coupons & Gift Cards" stats={couponGiftCardStats} />
      </div>

      <SalesChart />

      <RecentOrdersTable orders={recentOrders} viewAllHref="/orders" />

      <ProductPerformanceTable products={productPerformance} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <QuickActions actions={quickActions} />
        <RecentActivity activity={recentActivity} />
      </div>
    </>
  );
}
