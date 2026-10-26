// Tiny in-memory sliding-window limiter for public endpoints that send email.
//
// State lives in the server process, so on serverless hosting each warm
// instance counts separately and a cold start resets it. That is enough to
// stop a script hammering one endpoint, but it is a speed bump rather than a
// guarantee; move the counters to the database or a shared store if abuse
// ever needs a hard cap.
const MAX_TRACKED_KEYS = 5000;

// The caller's address as seen by our own proxy, or "" when there is none (local dev), in
// which case callers should skip limiting rather than lump everyone together.
// x-forwarded-for is "client, proxy1, proxy2"; everything left of the hops we run is whatever
// the client chose to send, so the entry our outermost proxy appended is the one trusted:
// TRUSTED_PROXY_HOPS (default 1) counts the proxies in front of the app.
export function clientIpOf(request) {
  const hops = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS) || 1);
  const forwarded = (request.headers.get("x-forwarded-for") || "").split(",").map((part) => part.trim()).filter(Boolean);
  return forwarded[Math.max(0, forwarded.length - hops)] || request.headers.get("x-real-ip") || "";
}

export function createRateLimiter({ limit, windowMs }) {
  const hits = new Map(); // key -> timestamps (ms) of recent attempts

  // Returns true and records the attempt while `key` is under the limit,
  // false (recording nothing) once it is over.
  return function allow(key) {
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((time) => now - time < windowMs);

    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }

    recent.push(now);
    hits.set(key, recent);

    if (hits.size > MAX_TRACKED_KEYS) {
      for (const [otherKey, times] of hits) {
        if (now - times[times.length - 1] >= windowMs) hits.delete(otherKey);
      }
    }
    return true;
  };
}
