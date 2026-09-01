/**
 * Direct-DOM helpers behind the admin shell's interactivity (sidebar, theme, dropdowns).
 * Ported 1:1 from legacy-static/script.js. Kept as plain DOM calls rather than React
 * state so the layout can't ever flash the wrong theme/collapsed state on load.
 */

export const THEME_STORAGE_KEY = "smb-theme";
export const SIDEBAR_COLLAPSED_STORAGE_KEY = "smb-sidebar-collapsed";

export function openSidebar() {
  document.body.classList.add("sidebar-open");
}

export function closeSidebar() {
  document.body.classList.remove("sidebar-open");
}

export function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.classList.toggle("dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
  } catch (e) {
    /* ignore storage errors (private mode, etc.) */
  }
  window.dispatchEvent(new CustomEvent("adminpanel:theme-change", { detail: { isDark } }));
  return isDark;
}

export function toggleCollapse() {
  const collapsed = document.body.classList.toggle("sidebar-collapsed");
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, collapsed ? "1" : "0");
  } catch (e) {
    /* ignore storage errors */
  }
  return collapsed;
}

export function toggleSubmenu(buttonEl) {
  const targetId = buttonEl.getAttribute("data-target");
  const target = document.getElementById(targetId);
  if (!target) return;
  const isOpen = !target.classList.contains("hidden");
  target.classList.toggle("hidden");
  buttonEl.classList.toggle("open", !isOpen);
}

export function toggleDropdown(id) {
  const panel = document.getElementById(id);
  if (!panel) return;
  const isHidden = panel.classList.contains("hidden");
  document.querySelectorAll('[id^="panel"]').forEach((p) => p.classList.add("hidden"));
  if (isHidden) panel.classList.remove("hidden");
}

export function closeAllDropdowns() {
  document.querySelectorAll('[id^="panel"]').forEach((p) => p.classList.add("hidden"));
}

export function setActiveNav(link) {
  document.querySelectorAll(".nav-link").forEach((l) => l.classList.remove("active"));
  link.classList.add("active");
}
