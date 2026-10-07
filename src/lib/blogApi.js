import { NextResponse } from "next/server";
import { BlogError } from "./blog";

// Shared by the /api/blog route handlers: the JSON envelope for a failure. The request
// body helpers are the CMS ones (a body that is never a surprise).
export { invalidRequest, readJsonObject } from "./cmsApi";

export function blogFailure(error) {
  if (error instanceof BlogError) {
    return NextResponse.json(
      { success: false, error: error.message, field: error.field || undefined, errors: error.errors || undefined },
      { status: error.status }
    );
  }
  console.error("Blog request failed", error);
  return NextResponse.json({ success: false, error: "That couldn't be done right now. Try again." }, { status: 500 });
}
