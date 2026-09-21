---
name: settings
description: Implement or modify Shop My Band settings pages, their APIs and database-backed settings modules, including global setting consumers.
---

# Settings work

## Existing architecture

- Settings pages live in `src/app/settings/<area>/page.js` and UI in `src/components/settings-<area>/`.
- Persisted areas currently have a matching lib/API pair, including general, store, currency-tax, products, and orders settings.
- Form modules usually expose defaults, transforms, validation, and small immutable update helpers through local `helpers.js`.
- Shared generic controls are in `src/components/settings-shared/`; use them rather than creating visually inconsistent input primitives.

## Implementing a persisted area

1. Define/extend the database table and source-of-truth SQL in `docs/settings/`.
2. Add a mapper that converts snake_case database rows to the camelCase client shape in `src/lib/<area>Settings.js`.
3. Expose `GET` and `PUT` through `src/app/api/settings/<area>/route.js`, keeping the standard JSON response envelope.
4. Have the client form load, validate, save, display a saving state, and show a success/error toast.
5. Add navigation only if the page should be public in the admin panel.

## Global settings

- `src/app/layout.js` loads general, currency/tax, and product settings and passes selected values through `GeneralSettingsProvider`.
- Extend `GENERAL_SETTINGS_DEFAULTS` and the layout value only for a truly global client concern (for example, store identity, currency, or SKU prefix). For one page, fetch or pass the setting locally instead.
- General settings reads must keep their safe fallback behavior so a new environment can render before that table has been migrated/seeded.

## UI consistency

- Follow the three-column section/sidebar layout and local `PageToolbar`/`Toast` patterns in the closest existing settings feature.
- Do not silently reset values on failed load/save. Preserve state and make errors clear.
