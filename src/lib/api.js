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

// Reads the request body as text, giving up as soon as it passes `maxBytes` instead of
// buffering all of it first. Resolves to null when it is too large.
async function readTextCapped(request, maxBytes) {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return "";
  }
  return Buffer.concat(chunks).toString("utf8");
}

// Reads a JSON request body no larger than `maxBytes`. Content-Length can be absent
// (chunked body) or wrong, so the limit is enforced on the bytes actually read, and reading
// stops at the limit. Resolves to { payload } or { response } (a 413/400 the handler returns).
export async function readJsonBody(request, { maxBytes, tooLongMessage = "That request was too large." }) {
  if (Number(request.headers.get("content-length")) > maxBytes) {
    return { response: fail(tooLongMessage, 413) };
  }
  const raw = await readTextCapped(request, maxBytes);
  if (raw === null) return { response: fail(tooLongMessage, 413) };
  try {
    return { payload: JSON.parse(raw) };
  } catch {
    return { response: fail("Invalid request.", 400) };
  }
}
