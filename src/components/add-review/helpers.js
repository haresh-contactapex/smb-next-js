import { isValidEmail } from "@/components/auth/helpers";
import { MAX_EMAIL_LENGTH } from "@/lib/reviewFields";

// Appended to an input with a validation error: light pink fill and red
// border, kept while focused. Same look as the shared settings fields (Add User).
export const INVALID_FIELD_CLASSES =
  " !border-red-400 focus:!border-red-400 !bg-red-50 focus:!bg-red-50 dark:!bg-red-500/10 dark:focus:!bg-red-500/10";

export const DEFAULT_REVIEW = {
  productId: "",
  productTitle: "",
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
    productTitle: data.productTitle || "",
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
  if (!review.productId) errors.productId = "Search for the product and pick it from the suggestions.";
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
