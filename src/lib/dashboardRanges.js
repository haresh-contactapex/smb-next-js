// Pure range definitions — safe to import from client components
// (src/lib/dashboard.js pulls in the database layer and must stay server-side).
export const DASHBOARD_RANGES = [
  { key: "today", label: "Today", days: 1 },
  { key: "7d", label: "Last 7 Days", days: 7 },
  { key: "30d", label: "Last 30 Days", days: 30 },
];
export const DEFAULT_RANGE = "7d";

export function resolveRange(key) {
  return DASHBOARD_RANGES.find((r) => r.key === key) || DASHBOARD_RANGES.find((r) => r.key === DEFAULT_RANGE);
}
