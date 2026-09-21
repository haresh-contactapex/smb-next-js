---
name: ui-components
description: Build or modify Shop My Band React feature components, interactive forms, tables, and Tailwind user interface.
---

# UI component work

## Feature boundaries

- Organize UI by feature under `src/components/<feature>/`. Existing larger features split a container/form from presentational sections, a toolbar, `helpers.js`, and a local `Toast.js`.
- Keep feature-specific logic nearby. Promote a component to `settings-shared/` or `admin-panel/` only when it is genuinely reusable across feature domains.
- The `admin-panel/` folder is a generic shell; do not hard-code Shop My Band feature data into it. Store nav, brand, and header configuration live in `src/config/admin-panel.config.js`.

## Forms and mutations

- Model form state in one owner component, pass explicit values/callbacks to sections, and keep serialization/validation in the feature's `helpers.js` when possible.
- Prevent duplicate saves with a saving state or synchronous ref guard when requests can overlap.
- Check `res.ok` and `json.success` before consuming returned data. Present failures through the feature's toast/alert pattern.
- Make validation actionable: show field-level feedback, focus or scroll to the first invalid control, and preserve `noValidate` when custom validation is used.
- Retain confirmations before destructive client actions. Do not replace them with silent deletes.

## Styling and accessibility

- Use Tailwind utilities and the configured semantic tokens (`primary`, `accent`, `success`, `warning`, `error`, `info`, `darkbg`, `darksurface*`).
- Every new surface, border, and text treatment must work in both default and `dark:` mode. Match the common card style: rounded `2xl`, border, `shadow-card`, white/dark surface.
- Use semantic elements, associated labels, keyboard-operable controls, descriptive button text, and disabled/loading states.
- Avoid adding a component library or custom global CSS for a one-off feature. `src/app/globals.css` is reserved for app-wide mechanics and base styling.
