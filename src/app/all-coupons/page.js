import CouponsPageToolbar from "@/components/coupons/CouponsPageToolbar";
import CouponsStats from "@/components/coupons/CouponsStats";
import CouponsListing from "@/components/coupons/CouponsListing";
import { coupons } from "@/data/couponsData";
import { computeCouponStats } from "@/components/coupons/couponHelpers";

export const metadata = {
  title: "All Coupons · Shop My Band Admin",
};

export default function AllCouponsPage() {
  const stats = computeCouponStats(coupons);

  return (
    <>
      <CouponsPageToolbar />
      <CouponsStats stats={stats} />
      <CouponsListing coupons={coupons} />
    </>
  );
}
