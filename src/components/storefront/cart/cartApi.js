// Resolves to { ok, data } or { ok: false, error } so callers never need a try/catch.
// A rejected request may also carry `field`, the form field the server found fault with, and
// `reason` / `details`, which the checkout uses to tell a changed cart from a plain error.
// `body` is optional (a plain GET has none).
export async function requestJson(method, url, body, signal) {
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.success) {
      return {
        ok: false,
        status: response.status,
        error: json?.error || "Something went wrong. Please try again.",
        field: json?.field,
        reason: json?.reason,
        details: json?.details,
      };
    }
    return { ok: true, data: json.data };
  } catch (error) {
    if (error?.name === "AbortError") return { ok: false, aborted: true, error: "" };
    return { ok: false, status: 0, error: "We couldn't reach the store. Check your connection and try again." };
  }
}

export function postJson(url, body, signal) {
  return requestJson("POST", url, body, signal);
}
