import AddReviewForm from "@/components/add-review/AddReviewForm";

export const metadata = {
  title: "Edit review · Shop Wedding Band Admin",
};

export const dynamic = "force-dynamic";

export default async function EditReviewPage({ params }) {
  const { id } = await params;
  return <AddReviewForm reviewId={id} />;
}
