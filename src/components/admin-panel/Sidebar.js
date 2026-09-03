"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Icon from "./Icon";
import { closeSidebar, setActiveNav, toggleCollapse, toggleSubmenu } from "./adminPanelActions";

/**
 * Left nav shell. Fully driven by the `navItems` config array passed in, so a new
 * project only needs to swap that config (see src/config/admin-panel.config.js) to
 * reuse this component as-is.
 *
 * navItems entries:
 *   { type: 'link',    id, label, icon, href }
 *   { type: 'submenu', id, label, icon, items: [{ id, label, href }] }
 *   { type: 'section',  label }
 */
export default function Sidebar({ brand, navItems }) {
  const [collapseIcon, setCollapseIcon] = useState("chevron-left");
  const pathname = usePathname();
  const isActiveHref = (href) => Boolean(href) && href !== "#" && href === pathname;

  // Sync the collapse icon with the persisted state once mounted (the layout is
  // collapsed pre-paint by ThemeInitScript; this just gets the icon to match).
  useEffect(() => {
    setCollapseIcon(document.body.classList.contains("sidebar-collapsed") ? "chevron-right" : "chevron-left");
  }, []);

  function handleNavClick(e) {
    setActiveNav(e.currentTarget);
    if (window.innerWidth < 1024) closeSidebar();
  }

  function handleCollapseClick() {
    const collapsed = toggleCollapse();
    setCollapseIcon(collapsed ? "chevron-right" : "chevron-left");
  }

  return (
    <>
      <div id="sidebarBackdrop" onClick={closeSidebar} />

      <aside
        id="sidebar"
        className="flex flex-col bg-white dark:bg-darksurface border-r border-slate-200 dark:border-white/5"
      >
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-white/5 shrink-0">
          <a href={brand.href || "/"} className="sidebar-brand flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-primary-500 dark:bg-accent-500 flex items-center justify-center shrink-0 shadow-sm">
              <Icon name={brand.icon || "gift"} className="w-4 h-4 text-white" />
            </span>
            <span className="logo-text min-w-0">
              <span className="block text-[15px] font-bold text-primary-700 dark:text-white leading-tight truncate">
                {brand.name}
              </span>
              {brand.subtitle && (
                <span className="block text-[11px] text-slate-400 dark:text-slate-500 leading-tight">
                  {brand.subtitle}
                </span>
              )}
            </span>
          </a>
          <button
            onClick={closeSidebar}
            className="lg:hidden w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 shrink-0"
          >
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto custom-scroll px-3 py-4 space-y-1">
          {navItems.map((item, i) => {
            if (item.type === "section") {
              return (
                <div
                  key={item.label + i}
                  className="nav-section-label pt-3 pb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-600"
                >
                  {item.label}
                </div>
              );
            }

            if (item.type === "submenu") {
              const targetId = `submenu-${item.id}`;
              const hasActiveChild = item.items.some((sub) => isActiveHref(sub.href));
              return (
                <div key={item.id}>
                  <button
                    className={`nav-toggle nav-row w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors${
                      hasActiveChild ? " active open" : ""
                    }`}
                    data-target={targetId}
                    onClick={(e) => toggleSubmenu(e.currentTarget)}
                  >
                    <span className="nav-icon w-5 h-5 shrink-0 text-slate-400">
                      <Icon name={item.icon} className="w-5 h-5" />
                    </span>
                    <span className="nav-label truncate flex-1 text-left">{item.label}</span>
                    <span className="nav-chevron nav-badge w-4 h-4 shrink-0 text-slate-400">
                      <Icon name="chevron-down" className="w-4 h-4" />
                    </span>
                  </button>
                  <ul
                    id={targetId}
                    className={`sidebar-submenu mt-1 ml-[34px] space-y-0.5 border-l border-slate-200 dark:border-white/10 pl-3${
                      hasActiveChild ? "" : " hidden"
                    }`}
                  >
                    {item.items.map((sub) => (
                      <li key={sub.id}>
                        <a
                          href={sub.href || "#"}
                          onClick={handleNavClick}
                          className={`nav-link block px-3 py-2 rounded-lg text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5${
                            isActiveHref(sub.href) ? " active" : ""
                          }`}
                        >
                          {sub.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }

            return (
              <a
                key={item.id}
                href={item.href || "#"}
                onClick={handleNavClick}
                className={`nav-link nav-row flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors${
                  isActiveHref(item.href) ? " active" : ""
                }`}
              >
                <span className="nav-icon w-5 h-5 shrink-0 text-slate-400">
                  <Icon name={item.icon} className="w-5 h-5" />
                </span>
                <span className="nav-label truncate">{item.label}</span>
              </a>
            );
          })}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden lg:flex items-center justify-center border-t border-slate-200 dark:border-white/5 p-3 shrink-0">
          <button
            onClick={handleCollapseClick}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <span className="w-4 h-4">
              <Icon name={collapseIcon} className="w-4 h-4" />
            </span>
            <span className="nav-label text-xs font-medium">Collapse</span>
          </button>
        </div>
      </aside>
    </>
  );
}
