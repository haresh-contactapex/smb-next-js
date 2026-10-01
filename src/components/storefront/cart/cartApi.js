// Resolves to { ok, data } or { ok: false, error } so callers never need a try/catch.
export async function postJson(url, body, signal) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.success) {
      return { ok: false, status: response.status, error: json?.error || "Something went wrong. Please try again." };
    }
    return { ok: true, data: json.data };
  } catch (error) {
    if (error?.name === "AbortError") return { ok: false, aborted: true, error: "" };
    return { ok: false, status: 0, error: "We couldn't reach the store. Check your connection and try again." };
  }
}
