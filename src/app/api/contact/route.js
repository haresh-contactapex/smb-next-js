import { NextResponse } from "next/server";
import { ContactMessageError, submitContactMessage } from "@/lib/contactMessages";

// A message is a few short fields; anything near this size is not one.
const MAX_BODY_BYTES = 20_000;

// Public endpoint (the storefront has no login), so it is protected by
// validation, a honeypot and rate limits in submitContactMessage rather than a session.
function clientKey(request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0].trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request) {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
    return NextResponse.json({ success: false, error: "Your message is too long." }, { status: 413 });
  }

  // Content-Length can be absent (chunked body) or wrong, so the size is checked on what was read too.
  const raw = await request.text().catch(() => "");
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ success: false, error: "Your message is too long." }, { status: 413 });
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request." }, { status: 400 });
  }

  try {
    const data = await submitContactMessage({ payload, clientKey: clientKey(request) });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    if (error instanceof ContactMessageError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("Contact message request failed", error);
    return NextResponse.json({ success: false, error: "We couldn't send your message. Please try again." }, { status: 500 });
  }
}
