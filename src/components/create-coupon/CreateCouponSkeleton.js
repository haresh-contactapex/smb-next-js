import { FormPageSkeleton } from "@/components/admin-panel/Skeleton";

// Mirrors CreateCouponForm (used by both Create and Edit Coupon): details,
// discount value and usage limits beside the dates/eligibility sidebar.
export default function CreateCouponSkeleton() {
  return (
    <FormPageSkeleton
      label="Loading coupon form…"
      main={[{ fields: 2, textarea: true }, 3, 3]}
      side={[2, 3]}
    />
  );
}
