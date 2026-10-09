// Shared between the session helpers (Node runtime) and middleware.js (Edge
// runtime), so both sides agree on cookie names and the JWT "scope" claim
// that keeps a customer token from being usable as a staff token or vice versa.
export const CUSTOMER_SESSION_COOKIE = "smb_customer_session";
export const STAFF_SESSION_COOKIE = "smb_staff_session";

export const CUSTOMER_SESSION_SCOPE = "customer";
export const STAFF_SESSION_SCOPE = "staff";

// A staff member who passed the password check but still owes a 2FA code
// holds this instead of a real staff session — a distinct cookie and scope
// so it can never be read as, or upgraded into, STAFF_SESSION_COOKIE.
export const STAFF_2FA_CHALLENGE_COOKIE = "smb_staff_2fa_challenge";
export const STAFF_2FA_CHALLENGE_SCOPE = "staff-2fa-challenge";

// The customer equivalent: a customer who passed the password check but still
// owes a 2FA code holds this instead of CUSTOMER_SESSION_COOKIE.
export const CUSTOMER_2FA_CHALLENGE_COOKIE = "smb_customer_2fa_challenge";
export const CUSTOMER_2FA_CHALLENGE_SCOPE = "customer-2fa-challenge";

// Short-lived ticket for the notifications WebSocket handshake; distinct from
// the session scopes so it can never act as a staff or customer session.
export const NOTIFICATIONS_WS_SCOPE = "notifications-ws";
