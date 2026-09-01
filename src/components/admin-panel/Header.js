"use client";

import Icon from "./Icon";
import { openSidebar, toggleDropdown, toggleTheme } from "./adminPanelActions";

const NOTIF_COLOR_CLASSES = {
  success: "bg-success/10 text-success",
  error: "bg-error/10 text-error",
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
  accent: "bg-accent-500/10 text-accent-600 dark:text-accent-400",
  primary: "bg-primary-500/10 text-primary-600 dark:text-primary-300",
};

/**
 * Top bar: mobile menu trigger, search fields, theme toggle, notifications dropdown,
 * user menu dropdown. All content comes from the `search`, `notifications` and `user`
 * props (see src/config/admin-panel.config.js) — swap that config to reuse elsewhere.
 */
export default function Header({ searchFields = [], notifications, user }) {
  return (
    <header className="sticky top-0 z-30 bg-white/85 dark:bg-darksurface/85 backdrop-blur border-b border-slate-200 dark:border-white/5">
      <div className="h-16 px-4 sm:px-6 flex items-center gap-3">
        <button
          onClick={openSidebar}
          className="lg:hidden w-9 h-9 grid place-items-center rounded-lg text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 shrink-0"
        >
          <Icon name="menu" className="w-5 h-5" />
        </button>

        {/* Search fields */}
        {searchFields.length > 0 && (
          <div className="hidden md:flex items-center gap-2 flex-1 max-w-xl">
            {searchFields.map((field) => (
              <div key={field.id} className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400">
                  <Icon name="search" className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder={field.placeholder}
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-100 dark:bg-darksurface2 border border-transparent focus:border-primary-400 dark:focus:border-accent-500 focus:bg-white dark:focus:bg-darksurface2 focus:outline-none focus:ring-4 focus:ring-primary-500/10 text-sm placeholder:text-slate-400 transition-all"
                />
              </div>
            ))}
          </div>
        )}
        <button className="md:hidden w-9 h-9 grid place-items-center rounded-lg text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 ml-auto md:ml-0">
          <Icon name="search" className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto md:ml-2 shrink-0">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title="Toggle theme"
            className="w-9 h-9 grid place-items-center rounded-lg text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <span className="w-[18px] h-[18px] dark:hidden">
              <Icon name="moon" className="w-[18px] h-[18px]" />
            </span>
            <span className="w-[18px] h-[18px] hidden dark:block text-accent-400">
              <Icon name="sun" className="w-[18px] h-[18px]" />
            </span>
          </button>

          {/* Notifications */}
          {notifications && (
            <div className="relative">
              <button
                id="btnNotif"
                onClick={() => toggleDropdown("panelNotif")}
                className="relative w-9 h-9 grid place-items-center rounded-lg text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <Icon name="bell" className="w-[18px] h-[18px]" />
                {notifications.items.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error ring-2 ring-white dark:ring-darksurface pulse-dot" />
                )}
              </button>
              <div
                id="panelNotif"
                className="hidden absolute right-0 mt-2 w-80 max-w-[90vw] bg-white dark:bg-darksurface border border-slate-200 dark:border-white/10 rounded-2xl shadow-popover overflow-hidden z-40"
              >
                <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Notifications</span>
                  {typeof notifications.newCount === "number" && (
                    <span className="text-[11px] font-semibold text-primary-600 dark:text-accent-400">
                      {notifications.newCount} new
                    </span>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto custom-scroll divide-y divide-slate-100 dark:divide-white/5">
                  {notifications.items.map((n, i) => (
                    <a
                      key={i}
                      href={n.href || "#"}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                      <span
                        className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${
                          NOTIF_COLOR_CLASSES[n.color] || NOTIF_COLOR_CLASSES.info
                        }`}
                      >
                        <Icon name={n.icon} className="w-4 h-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium text-slate-700 dark:text-slate-200">
                          {n.title}
                        </span>
                        <span className="block text-[11px] text-slate-400 mt-0.5">{n.time}</span>
                      </span>
                    </a>
                  ))}
                </div>
                {notifications.viewAllHref && (
                  <a
                    href={notifications.viewAllHref}
                    className="block text-center text-[13px] font-semibold text-primary-600 dark:text-accent-400 py-3 border-t border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    View all notifications
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-1 hidden sm:block" />

          {/* User menu */}
          {user && (
            <div className="relative">
              <button
                id="btnUser"
                onClick={() => toggleDropdown("panelUser")}
                className="flex items-center gap-2.5 pl-1.5 pr-2 sm:pr-3 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <span className="w-8 h-8 rounded-full bg-primary-500 text-white text-[13px] font-semibold grid place-items-center shrink-0">
                  {user.initials}
                </span>
                <span className="hidden sm:block text-left leading-tight">
                  <span className="block text-[13px] font-semibold text-slate-700 dark:text-slate-100">
                    Welcome, {user.name}!
                  </span>
                  <span className="block text-[11px] text-slate-400">{user.role}</span>
                </span>
                <span className="hidden sm:block w-4 h-4 text-slate-400">
                  <Icon name="chevron-down" className="w-4 h-4" />
                </span>
              </button>
              <div
                id="panelUser"
                className="hidden absolute right-0 mt-2 w-56 bg-white dark:bg-darksurface border border-slate-200 dark:border-white/10 rounded-2xl shadow-popover overflow-hidden z-40 py-1.5"
              >
                {(user.menu || []).map((item, i) => (
                  <a
                    key={i}
                    href={item.href || "#"}
                    className={`flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium hover:bg-slate-50 dark:hover:bg-white/5 ${
                      item.variant === "danger"
                        ? "text-error hover:bg-error/5"
                        : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <Icon name={item.icon} className={`w-4 h-4 ${item.variant === "danger" ? "" : "text-slate-400"}`} />
                    {item.label}
                  </a>
                ))}
                {user.logoutHref && (
                  <>
                    <div className="my-1.5 border-t border-slate-100 dark:border-white/5" />
                    <a
                      href={user.logoutHref}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-error hover:bg-error/5"
                    >
                      <Icon name="log-out" className="w-4 h-4" /> Logout
                    </a>
                  </>
                )}
              </div>
            </div>
          )}

          {user?.logoutHref && (
            <a
              href={user.logoutHref}
              title="Logout"
              className="hidden sm:grid w-9 h-9 place-items-center rounded-lg text-slate-400 hover:text-error hover:bg-error/5 transition-colors"
            >
              <Icon name="log-out" className="w-[18px] h-[18px]" />
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
