import AddReviewForm from "@/components/add-review/AddReviewForm";
import { listReviewProducts } from "@/lib/reviews";

export const metadata = {
  title: "Add review · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

export default async function AddReviewPage() {
  const products = await listReviewProducts();
  return <AddReviewForm products={products} />;
}
