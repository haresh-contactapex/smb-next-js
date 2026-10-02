import { NextResponse } from "next/server";
import { ProductQuestionError, submitProductQuestion } from "@/lib/productQuestions";

// A question is a few short fields; anything near this size is not one.
const MAX_BODY_BYTES = 20_000;

// Public endpoint (the storefront has no login), so it is protected by
// validation, a honeypot and rate limits in submitProductQuestion rather than a session.
function clientKey(request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0].trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request) {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
    return NextResponse.json({ success: false, error: "Your question is too long." }, { status: 413 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request." }, { status: 400 });
  }

  try {
    const data = await submitProductQuestion({
      payload,
      clientKey: clientKey(request),
      origin: new URL(request.url).origin,
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    if (error instanceof ProductQuestionError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("Product question request failed", error);
    return NextResponse.json({ success: false, error: "We couldn't send your question. Please try again." }, { status: 500 });
  }
}
