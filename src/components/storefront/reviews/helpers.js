// Pure helpers for the product page's "Write a review" form. Shared by the form
// (live field feedback) and submitStorefrontReview in src/lib/reviews.js (the
// real check), so both sides agree on what is valid. Nothing here touches the
// server or the DOM.
import { isValidEmail } from "@/components/auth/helpers";
import {
  MAX_CONTENT_LENGTH,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_TITLE_LENGTH,
  isValidRating,
} from "@/lib/reviewFields";

export const REVIEW_LIMITS = {
  title: MAX_TITLE_LENGTH,
  content: MAX_CONTENT_LENGTH,
  displayName: MAX_DISPLAY_NAME_LENGTH,
  email: MAX_EMAIL_LENGTH,
};

export const EMPTY_REVIEW = { rating: 0, title: "", content: "", displayName: "", email: "" };

// Order the fields appear in, so the first invalid one gets focus.
export const REVIEW_FIELDS = ["rating", "displayName", "email", "title", "content"];

// Trims everything and flattens one-line fields. Works on anything a request
// body might contain. The email is stored lowercase, like the admin form does.
export function normalizeReview(values) {
  return {
    rating: Number(values?.rating) || 0,
    title: String(values?.title ?? "").replace(/\s+/g, " ").trim(),
    content: String(values?.content ?? "").replace(/\r\n?/g, "\n").trim(),
    displayName: String(values?.displayName ?? "").replace(/\s+/g, " ").trim(),
    email: String(values?.email ?? "").trim().toLowerCase(),
  };
}

// Returns { field: message } for each invalid field; empty when everything is fine.
export function validateReview(values) {
  const errors = {};

  if (!isValidRating(values.rating)) errors.rating = "Please select a star rating.";

  if (!values.displayName) errors.displayName = "Please enter your name.";
  else if (values.displayName.length > REVIEW_LIMITS.displayName) {
    errors.displayName = `Your name can be at most ${REVIEW_LIMITS.displayName} characters.`;
  }

  if (!values.email) errors.email = "Please enter your email address.";
  else if (values.email.length > REVIEW_LIMITS.email || !isValidEmail(values.email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (!values.title) errors.title = "Please give your review a title.";
  else if (values.title.length > REVIEW_LIMITS.title) {
    errors.title = `The title can be at most ${REVIEW_LIMITS.title} characters.`;
  }

  if (!values.content) errors.content = "Please write your review.";
  else if (values.content.length > REVIEW_LIMITS.content) {
    errors.content = `Your review can be at most ${REVIEW_LIMITS.content} characters.`;
  }

  return errors;
}
