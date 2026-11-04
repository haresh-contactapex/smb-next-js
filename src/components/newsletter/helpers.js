export function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export const SOURCE_LABELS = {
  "home-page": "Home page",
};

export function sourceLabel(source) {
  return SOURCE_LABELS[source] || source;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function computeNewsletterStats(subscribers, now = Date.now()) {
  const since = (days) => subscribers.filter((s) => now - new Date(s.createdAt).getTime() < days * DAY_MS).length;
  return { total: subscribers.length, last7Days: since(7), last30Days: since(30) };
}
