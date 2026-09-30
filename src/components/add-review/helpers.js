import { isValidEmail } from "@/components/auth/helpers";
import { MAX_EMAIL_LENGTH } from "@/lib/reviewFields";

export const DEFAULT_REVIEW = {
  productId: "",
  rating: 0,
  title: "",
  content: "",
  displayName: "",
  email: "",
  status: "PENDING",
};

export function buildReviewFromData(data) {
  return {
    productId: data.productId || "",
    rating: data.rating || 0,
    title: data.title || "",
    content: data.content || "",
    displayName: data.displayName || "",
    email: data.email || "",
    status: data.status || "PENDING",
  };
}

// Keys are in on-screen order, so the first invalid field is the one to focus.
export function validateReview(review) {
  const errors = {};
  if (!review.productId) errors.productId = "Choose the product this review is for.";
  if (!review.rating) errors.rating = "Select a rating from 1 to 5 stars.";
  if (!review.title.trim()) errors.title = "Review title is required.";
  if (!review.content.trim()) errors.content = "Review content is required.";
  if (!review.displayName.trim()) errors.displayName = "Display name is required.";
  const email = review.email.trim();
  if (!email) errors.email = "Email address is required.";
  else if (email.length > MAX_EMAIL_LENGTH || !isValidEmail(email)) errors.email = "Enter a valid email address.";
  return errors;
}

// `status` is always sent; the server ignores it unless the caller holds
// reviews.approve, so a locked select can't be bypassed from the client.
export function assembleReview(review) {
  return {
    productId: review.productId,
    rating: review.rating,
    title: review.title.trim(),
    content: review.content.trim(),
    displayName: review.displayName.trim(),
    email: review.email.trim(),
    status: review.status,
  };
}
