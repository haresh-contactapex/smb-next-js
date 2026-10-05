import { NextResponse } from "next/server";
import { ReviewError, submitStorefrontReview } from "@/lib/reviews";

// A review is a few short fields plus up to 5,000 characters of text (a
// handful of bytes each in UTF-8); anything near this size is not one.
const MAX_BODY_BYTES = 40_000;

// Public endpoint (the storefront has no login), so it is protected by
// validation, a honeypot, rate limits and moderation in submitStorefrontReview
// rather than a session. Reviews are saved as PENDING and never shown until
// a moderator approves them.
function clientKey(request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0].trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request) {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
    return NextResponse.json({ success: false, error: "Your review is too long." }, { status: 413 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request." }, { status: 400 });
  }

  try {
    const data = await submitStorefrontReview({ payload, clientKey: clientKey(request) });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("Storefront review failed", error);
    return NextResponse.json({ success: false, error: "We couldn't save your review. Please try again." }, { status: 500 });
  }
}
