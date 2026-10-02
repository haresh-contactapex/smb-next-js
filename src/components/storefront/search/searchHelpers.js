// Fewer letters than this match too much to be a useful suggestion.
export const SEARCH_MIN_LENGTH = 2;
// Matches the server, which cuts longer text off.
export const SEARCH_MAX_LENGTH = 100;
// How long to wait after the last keystroke before looking up suggestions.
export const SEARCH_DEBOUNCE_MS = 250;
// Products listed in the search panel; the rest are one click away on the results page.
export const SUGGESTION_LIMIT = 6;
// Products per page on the results page.
export const RESULTS_PAGE_SIZE = 12;

// Whitespace collapsed and trimmed, the way the server reads it.
export const cleanSearchText = (text) => String(text ?? "").replace(/\s+/g, " ").trim();

export const searchPageUrl = (query) => `/search?q=${encodeURIComponent(query)}`;

export function searchApiUrl({ query, limit, offset = 0 }) {
  const params = new URLSearchParams({ q: query, limit: String(limit), offset: String(offset) });
  return `/api/storefront/search?${params}`;
}
