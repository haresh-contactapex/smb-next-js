---
name: auth
description: Safely modify Shop My Band customer or staff authentication, sessions, passwords, cookies, JWTs, and reset-password flows.
---

# Authentication work

## Two identity systems

- Customer routes and helpers live under `src/app/api/auth/`, `src/components/auth/`, and customer modules in `src/lib/`.
- Staff/admin routes and helpers live under `src/app/api/admin-auth/`, `src/components/admin-auth/`, `src/lib/staff.js`, and `src/lib/auth/staffSession.js`.
- Do not merge their cookies or authorization semantics. `CUSTOMER_SESSION_SCOPE` and `STAFF_SESSION_SCOPE` in `src/lib/auth/constants.js` prevent cross-use of tokens.

## Security invariants

- Hash and verify passwords only through `src/lib/auth/password.js`; never log, return, or persist plaintext passwords.
- Create, read, and clear cookies only through `src/lib/auth/cookies.js`. Cookies must remain `httpOnly`, `sameSite: "lax"`, root-scoped, and `secure` in production.
- Sign and verify JWTs through `src/lib/auth/jwt.js`; `JWT_SECRET` is required only at runtime and must never be exposed to a client bundle.
- Keep login errors non-enumerating: invalid email/password combinations use the same response. Preserve timing-safe password verification where the existing flow provides it.
- Validate reset tokens server-side, enforce their expiry/one-time semantics, and invalidate them after use.
- Any staff-only API mutation needs an explicit staff-session check because middleware does not protect `/api`.

## Auth routing

- New standalone auth pages must be added to both middleware public paths and `ConditionalShell` standalone routes.
- Treat redirect targets as untrusted. Only accept an in-app path beginning with one `/`, never `//` or an absolute URL.
