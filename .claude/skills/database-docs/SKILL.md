---
name: database-docs
description: Change Shop My Band Neon PostgreSQL access, schema SQL, data mapping, and migration documentation safely.
---

# Database and schema work

## Access layer

- All runtime database access goes through `src/lib/db.js`. `sql` is the preferred Neon tagged-template interface; it safely binds interpolated values.
- Use `sqlQuery(text, params)` only for dynamic query structure such as a variable-length multi-row insert. Build placeholders yourself and pass every value in `params`; never concatenate untrusted values into SQL.
- Keep the lazy `DATABASE_URL` initialization in `db.js`: importing a server module during `next build` must not require a configured database.
- Keep row-to-client mappers in the relevant lib module. Database fields are snake_case; the UI/API generally uses camelCase.

## Source of truth and migrations

- Schema SQL and companion explanations live under `docs/`, grouped by feature (`category-product`, `auth`, `settings`, `vouchers-coupons`, `gift-cards`, `media`, `orders`, and `my-account`). Update both the `.sql` and matching `.md` documentation.
- `scripts/migrate.mjs` defaults to the category/product schema and accepts a schema file path. Package scripts provide the commonly used feature migrations.
- The migration script splits statements while accounting for single-quoted strings, but it is not a full SQL parser. Keep schema scripts compatible with that behavior; do not introduce procedural blocks with semicolons unless the runner is upgraded first.
- Apply the narrow relevant schema migration, never an unrelated schema, when validating a persistence change.

## Query quality and error handling

- Select only fields the caller needs and map numeric values deliberately (`Number(...)`) where UI code expects numbers.
- Preserve database constraints as the integrity layer and translate expected constraint failures into actionable domain errors.
- For multi-step writes without a database transaction, keep compensating cleanup or document the partial-write risk. Product creation is the model: it removes a newly created parent if child persistence fails.
