import { NextResponse } from "next/server";
import { CmsError } from "./cms";

// Shared by the /api/cms route handlers: the JSON envelope for a failure, and a
// request body that is never a surprise.

export function cmsFailure(error) {
  if (error instanceof CmsError) {
    return NextResponse.json(
      { success: false, error: error.message, field: error.field || undefined, errors: error.errors || undefined },
      { status: error.status }
    );
  }
  console.error("CMS request failed", error);
  return NextResponse.json({ success: false, error: "That couldn't be done right now. Try again." }, { status: 500 });
}

// The parsed JSON object, or null when the body is missing, malformed or not an object.
export async function readJsonObject(request) {
  const body = await request.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? body : null;
}

export const invalidRequest = () =>
  NextResponse.json({ success: false, error: "That request wasn't valid." }, { status: 400 });
