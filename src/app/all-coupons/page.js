import CouponsPageToolbar from "@/components/coupons/CouponsPageToolbar";
import CouponsStats from "@/components/coupons/CouponsStats";
import CouponsListing from "@/components/coupons/CouponsListing";
import { listCoupons } from "@/lib/coupons";
import { computeCouponStats } from "@/components/coupons/couponHelpers";

export const metadata = {
  title: "All Coupons · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

export default async function AllCouponsPage() {
  const coupons = await listCoupons();
  const stats = computeCouponStats(coupons);

  return (
    <>
      <CouponsPageToolbar />
      <CouponsStats stats={stats} />
      <CouponsListing coupons={coupons} />
    </>
  );
}
