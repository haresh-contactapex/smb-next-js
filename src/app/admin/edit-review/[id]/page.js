import AddReviewForm from "@/components/add-review/AddReviewForm";
import { listReviewProducts } from "@/lib/reviews";

export const metadata = {
  title: "Edit review · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

export default async function EditReviewPage({ params }) {
  const { id } = await params;
  const products = await listReviewProducts();
  return <AddReviewForm reviewId={id} products={products} />;
}
