import CreateCouponForm from "@/components/create-coupon/CreateCouponForm";
import { listCategories } from "@/lib/categories";

export const metadata = {
  title: "Create coupon · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

export default async function CreateCouponPage() {
  const categories = await listCategories();
  return <CreateCouponForm categories={categories} />;
}
