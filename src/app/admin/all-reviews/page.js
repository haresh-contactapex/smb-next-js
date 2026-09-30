import ReviewsPageToolbar from "@/components/reviews/ReviewsPageToolbar";
import ReviewsListing from "@/components/reviews/ReviewsListing";
import { listReviews } from "@/lib/reviews";

export const metadata = {
  title: "All Reviews · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

export default async function AllReviewsPage() {
  const reviews = await listReviews();

  return (
    <>
      <ReviewsPageToolbar />
      <ReviewsListing reviews={reviews} />
    </>
  );
}
