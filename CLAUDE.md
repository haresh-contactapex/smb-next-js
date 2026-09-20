# Shop My Band Admin Panel

## Project at a glance

- Next.js 15 App Router application, written in JavaScript (not TypeScript).
- React 18, Tailwind CSS 3, and Chart.js power the admin interface.
- PostgreSQL is accessed through Neon using `@neondatabase/serverless`.
- This is an authenticated Shop My Band admin panel. The former static prototype remains in `legacy-static/` as reference only; do not add production features there.

## Repository map

| Path | Purpose |
| --- | --- |
| `src/app/` | App Router pages, layouts, route handlers, and global styles. |
| `src/components/` | Feature-oriented React UI. Each feature generally owns its form, helpers, toast, sections, table, and filters. |
| `src/lib/` | Server-side database access, domain logic, validation, and auth/session helpers. |
| `src/data/` | Static/sample data used by dashboard and in-progress areas. |
| `src/config/admin-panel.config.js` | Store branding, navigation, header data, and shell configuration. |
| `docs/` | Feature workflows and the SQL schema files consumed by migrations. |
| `scripts/` | Database migration runner and admin-user seeding script. |
| `public/uploads/` | Runtime media-upload location; keep `.gitkeep`, not uploaded media. |

## Commands

```bash
npm run dev
npm run build
npm run lint
npm run db:migrate
npm run db:migrate:media
npm run db:migrate:coupons
npm run db:migrate:customers
npm run db:migrate:auth
npm run db:migrate:staff-users
npm run db:migrate:currency-tax
npm run db:migrate:products
npm run db:seed:admin
```

`DATABASE_URL` and `JWT_SECRET` belong in `.env.local`; use `.env.example` as the non-secret template. Never commit or print real credentials.

## Non-negotiable conventions

- Use the `@/` alias for imports from `src/`.
- Keep page/layout components server-side by default. Add `"use client"` only to a component that needs state, effects, browser APIs, or event handlers.
- Keep domain and database work in `src/lib/`; route handlers should parse input, call a lib function, and return the established JSON envelope: `{ success: true, data }` or `{ success: false, error }`.
- Use `sql` tagged templates from `src/lib/db.js` for values. Use `sqlQuery` only where dynamically sized SQL is truly required, with positional parameters. Do not interpolate request data into SQL strings.
- Never import server database or session helpers into client components.
- Reuse existing feature helpers and shared controls before introducing a parallel implementation. Match the feature folder's local conventions for `helpers.js`, `Toast.js`, toolbar, sections, and client state.
- Preserve the existing Tailwind design system: the `primary`, `accent`, `dark*`, semantic colors, card shadow, and radius tokens in `tailwind.config.js`; support both light and dark mode for new UI.
- Preserve accessible labels, visible validation errors, keyboard behavior, loading/saving guards, and the current confirmation pattern for destructive actions.
- `src/middleware.js` protects page navigation but intentionally excludes `/api`. Do not treat the UI gate as API authorization: add server-side session/role checks before exposing or expanding sensitive API operations.
- Customer and staff identities are distinct. Keep their cookie names and JWT scopes separate; never allow a customer token to act as staff.
- Update the matching documentation and SQL schema in `docs/` when changing persisted data. The migration runner applies the selected schema SQL file statement-by-statement.
- Do not clean up unrelated files or overwrite current user changes. The working tree may already contain active work.

## Feature workflow

For a new persisted feature, follow the existing vertical slice:

1. Document/update its schema in `docs/<feature>/` (or the applicable `docs/settings/` schema).
2. Add a focused `src/lib/<domain>.js` mapper/query layer.
3. Implement `src/app/api/<domain>/route.js` and `[id]/route.js` where applicable, using the shared response envelope and meaningful HTTP statuses.
4. Create the page in `src/app/` and a matching feature folder in `src/components/`.
5. Add/revise navigation in `src/config/admin-panel.config.js` only when the route is intended to be reachable.
6. Run the narrowest useful verification, then `npm run build` for cross-app changes.

## Route and shell rules

- Auth pages listed in both `src/middleware.js` and `src/components/admin-panel/ConditionalShell.js` render without the admin shell. Keep those lists synchronized when adding standalone routes.
- The root layout obtains store settings and staff identity server-side and supplies global settings through `GeneralSettingsProvider`. Extend that provider deliberately when a client-wide store setting is needed.
- Database-backed server pages that must always show fresh values should follow the existing `export const dynamic = "force-dynamic"` pattern.

## Available module skills

Read the relevant skill before a substantial change in that area:

- `.claude/skills/app-router-api/SKILL.md` — pages, layouts, middleware, and HTTP route handlers.
- `.claude/skills/ui-components/SKILL.md` — React feature components, forms, and Tailwind UI.
- `.claude/skills/catalog/SKILL.md` — products, categories, variants, and media relationships.
- `.claude/skills/auth/SKILL.md` — customer/staff authentication, JWTs, cookies, and reset flows.
- `.claude/skills/settings/SKILL.md` — database-backed settings pages and global setting consumers.
- `.claude/skills/database-docs/SKILL.md` — Neon access, schema SQL, migrations, and data mapping.

## Verification

- Start with the affected page/API flow and inspect both success and failure behavior.
- Run `npm run lint` when it is available in the installed Next.js version; use `npm run build` as the required broad compile/integration check for shared, routing, or server changes.
- Avoid relying on a production database for routine validation. A build should remain possible when `DATABASE_URL` is absent; `src/lib/db.js` intentionally checks it only when a query runs.
