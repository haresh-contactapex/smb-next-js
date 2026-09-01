<<<<<<< HEAD
# smb-next-js
Shop My Band Re-creat in Next JS
=======
# Shop My Band — Admin Panel (Next.js)

Next.js (App Router, JavaScript, Tailwind CSS) port of the original static dashboard
in `legacy-static/` (index.html / script.js / styles.css — kept for reference only,
not used by the app).

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Structure

```
src/
  components/
    admin-panel/     <- REUSABLE admin shell: Sidebar, Header, Footer, icons, theme.
                         Nothing in here is specific to "Shop My Band".
    dashboard/        <- Shop My Band's dashboard widgets (stat cards, tables, chart).
                         Not part of the reusable shell — this is page content.
  config/
    admin-panel.config.js  <- Brand, nav menu, header, user. THE file to swap per project.
  data/
    dashboardData.js       <- Sample dashboard data (stand-in for a real API).
  app/
    layout.js         <- Wraps every page in AdminLayout using admin-panel.config.js.
    page.js            <- The dashboard page, built from src/components/dashboard/*.
    globals.css        <- Tailwind + the sidebar/theme/dropdown CSS mechanics.
```

## Reusing the admin panel in another project

1. Copy `src/components/admin-panel/` into the new project as-is.
2. Copy `src/config/admin-panel.config.js` and edit it: brand name/logo, nav menu,
   search fields, notifications, logged-in user. That's the only file that needs to
   change — every admin-panel component reads from this config (or props shaped
   like it).
3. Copy the `primary` / `accent` / `darkbg` / `darksurface*` tokens and the
   `sidebar`/`nav`/`period-btn`/`table-row` custom CSS block from
   `tailwind.config.js` and `src/app/globals.css` into the new project (or replace
   the color values with the new brand's palette).
4. Wrap the new project's root layout in `<AdminLayout config={adminPanelConfig}>`,
   same as `src/app/layout.js` here.

Everything under `src/components/dashboard/` is specific to this store's dashboard —
it's a consumer of the admin-panel shell, not part of it, so you wouldn't copy it
into an unrelated project.

## Notes

- Theme (light/dark) and sidebar-collapsed state persist to `localStorage` and are
  applied before paint (see `ThemeInitScript.js`) so there's no flash on load.
- The sales chart uses Chart.js (`chart.js` npm package, not a CDN script) and
  listens for an `adminpanel:theme-change` event to re-color itself when the theme
  toggles.
>>>>>>> 128a170 (Initial commit for SMB Next.js project)
