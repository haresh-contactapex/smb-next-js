// Tiny in-memory sliding-window limiter for public endpoints that send email.
//
// State lives in the server process, so on serverless hosting each warm
// instance counts separately and a cold start resets it. That is enough to
// stop a script hammering one endpoint, but it is a speed bump rather than a
// guarantee; move the counters to the database or a shared store if abuse
// ever needs a hard cap.
const MAX_TRACKED_KEYS = 5000;
// Callers with no known address share one bucket this many times the normal limit, so a missing
// header does not switch limiting off, but one busy site does not lock everyone out either.
const UNKNOWN_ADDRESS_FACTOR = 10;

// The caller's address as seen by our own proxy, or "" when none is sent (local dev, or a proxy
// that sets neither header). A limiter given "" counts those callers together in one larger
// shared bucket instead of skipping the limit.
// x-forwarded-for is "client, proxy1, proxy2"; everything left of the hops we run is whatever
// the client chose to send, so the entry our outermost proxy appended is the one trusted:
// TRUSTED_PROXY_HOPS (default 1) counts the proxies in front of the app; with a CDN in front
// of the server's own proxy it must be 2, or every visitor of one CDN node shares one address.
let warnedAboutHops = false;
let warnedAboutMissingAddress = false;

export function clientIpOf(request) {
  const hops = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS) || 1);
  const forwarded = (request.headers.get("x-forwarded-for") || "").split(",").map((part) => part.trim()).filter(Boolean);
  if (forwarded.length > hops && !warnedAboutHops) {
    warnedAboutHops = true;
    console.warn(
      `x-forwarded-for has ${forwarded.length} entries and TRUSTED_PROXY_HOPS is ${hops}. That is normal when a visitor's own proxy adds an entry; raise TRUSTED_PROXY_HOPS only if you put a CDN or another proxy in front of this server.`
    );
  }
  const ip = forwarded[Math.max(0, forwarded.length - hops)] || request.headers.get("x-real-ip") || "";
  if (!ip && process.env.NODE_ENV === "production" && !warnedAboutMissingAddress) {
    warnedAboutMissingAddress = true;
    console.warn("A request arrived with neither x-forwarded-for nor x-real-ip, so rate limits cannot tell visitors apart. Check that the web server passes the client address.");
  }
  return ip;
}

export function createRateLimiter({ limit, windowMs }) {
  const hits = new Map(); // key -> timestamps (ms) of recent attempts

  // Returns true and records the attempt while `key` is under the limit,
  // false (recording nothing) once it is over. An empty `key` (no known address) is counted
  // in a shared bucket with a larger limit.
  return function allow(address) {
    const key = address || "(no address)";
    const max = address ? limit : limit * UNKNOWN_ADDRESS_FACTOR;
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((time) => now - time < windowMs);

    if (recent.length >= max) {
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
