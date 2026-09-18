import CreateCouponForm from "@/components/create-coupon/CreateCouponForm";
import { listCategories } from "@/lib/categories";

export const metadata = {
  title: "Edit coupon · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

export default async function EditCouponPage({ params }) {
  const categories = await listCategories();
  return <CreateCouponForm couponId={params.id} categories={categories} />;
}
