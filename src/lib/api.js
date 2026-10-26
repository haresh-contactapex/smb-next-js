import { NextResponse } from "next/server";
import { publicErrorMessage } from "./publicError";

// The JSON envelope every route handler answers with: { success: true, data } or
// { success: false, error }. Feature folders may add their own helpers on top
// (see src/app/api/account/respond.js) but build the envelope from these.

export const ok = (data, status = 200) => NextResponse.json({ success: true, data }, { status });

export const fail = (error, status = 400, extra = {}) =>
  NextResponse.json({ success: false, error, ...extra }, { status });

// Answers for a thrown error: an instance of `KnownError` (carrying `.status`) keeps its own
// status and message, anything else is logged under `label` and replaced by `fallbackMessage`.
export function failureFrom(error, { KnownError, fallbackMessage, label }) {
  if (KnownError && error instanceof KnownError) return fail(publicErrorMessage(error), error.status);
  console.error(`${label} failed`, error);
  return fail(fallbackMessage, 500);
}

// Reads a JSON request body no larger than `maxBytes`. Content-Length can be absent
// (chunked body) or wrong, so the size is checked on the text actually read.
// Resolves to { payload } or { response } (a 413/400 the handler returns as it is).
export async function readJsonBody(request, { maxBytes, tooLongMessage = "That request was too large." }) {
  if (Number(request.headers.get("content-length")) > maxBytes) {
    return { response: fail(tooLongMessage, 413) };
  }
  const raw = await request.text().catch(() => "");
  if (Buffer.byteLength(raw) > maxBytes) return { response: fail(tooLongMessage, 413) };
  try {
    return { payload: JSON.parse(raw) };
  } catch {
    return { response: fail("Invalid request.", 400) };
  }
}
