// Shared between the session helpers (Node runtime) and middleware.js (Edge
// runtime), so both sides agree on cookie names and the JWT "scope" claim
// that keeps a customer token from being usable as a staff token or vice versa.
export const CUSTOMER_SESSION_COOKIE = "smb_customer_session";
export const STAFF_SESSION_COOKIE = "smb_staff_session";

export const CUSTOMER_SESSION_SCOPE = "customer";
export const STAFF_SESSION_SCOPE = "staff";
