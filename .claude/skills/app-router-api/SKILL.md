---
name: app-router-api
description: Implement or change Next.js App Router pages, layouts, middleware, and JSON API route handlers in the Shop My Band admin panel.
---

# App Router and API work

## Page and layout conventions

- Pages in `src/app/` are server components unless interactivity requires a client component. Keep the page thin: fetch server data, derive view props, and compose feature components.
- Place interactive state and browser-only work in the associated `src/components/<feature>/` component and mark only that file (or a focused child) with `"use client"`.
- Use `export const dynamic = "force-dynamic"` for database-backed pages that need a current request-time view, as done by `all-products`.
- Add page-specific `metadata` in the route page. Keep titles aligned with the existing Shop My Band admin naming.
- The root layout owns fonts, theme initialization, admin shell selection, and `GeneralSettingsProvider`. Do not duplicate those concerns in individual pages.

## Route handlers

- Put handlers at `src/app/api/<resource>/route.js`; use `src/app/api/<resource>/[id]/route.js` for item operations.
- Import domain functions from `src/lib/`, not SQL helpers directly, unless creating the domain layer itself.
- Preserve the response contract:

```js
return NextResponse.json({ success: true, data });
return NextResponse.json({ success: false, error: "Human-readable message" }, { status: 400 });
```

- Return `404` for absent resources, `400` for invalid client input, `401`/`403` for authentication/authorization failures, and `500` only for unexpected server failures.
- Parse and normalize request input at the boundary. Keep transformations and database mapping in the lib module.
- API routes are excluded from `middleware.js`. Any sensitive endpoint must validate its own staff/customer session and role; never rely on a route being reachable only from a protected page.

## Standalone routes

- Auth pages render without the shell. If adding or renaming one, update both `PUBLIC_PATHS` in `src/middleware.js` and `STANDALONE_ROUTES` in `src/components/admin-panel/ConditionalShell.js`.
- Preserve `safeNextPath`-style same-origin redirect validation for any user-supplied `next` path.
