/**
 * Blocking init script — must render as the very first thing in <body>, before any
 * visible markup paints, so dark mode / collapsed sidebar apply with no flash.
 * Pure DOM (no React state) on purpose: it runs before hydration.
 */
const INIT_SCRIPT = `
(function () {
  try {
    var saved = localStorage.getItem('smb-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = saved ? saved === 'dark' : prefersDark;
    if (isDark) document.documentElement.classList.add('dark');
    if (localStorage.getItem('smb-sidebar-collapsed') === '1') {
      document.body.classList.add('sidebar-collapsed');
    }
  } catch (e) {}
})();
`;

export default function ThemeInitScript() {
  // eslint-disable-next-line react/no-danger
  return <script dangerouslySetInnerHTML={{ __html: INIT_SCRIPT }} />;
}
