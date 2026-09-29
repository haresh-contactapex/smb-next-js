"use client";

import Link from "next/link";
import Icon from "./Icon";
import HeaderSearchField from "./HeaderSearchField";
import NotificationBell from "@/components/notifications/NotificationBell";
import { openSidebar, toggleDropdown, toggleTheme } from "./adminPanelActions";

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
              <HeaderSearchField key={field.id} field={field} />
            ))}
          </div>
        )}
        <button className="md:hidden w-9 h-9 grid place-items-center rounded-lg text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 ml-auto md:ml-0">
          <Icon name="search" className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
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

          {/* Notifications: live, permission-filtered (see src/components/notifications) */}
          {notifications && <NotificationBell viewAllHref={notifications.viewAllHref} />}

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
                  <Link
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
                  </Link>
                ))}
                {user.logoutHref && (
                  <>
                    <div className="my-1.5 border-t border-slate-100 dark:border-white/5" />
                    <Link
                      href={user.logoutHref}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-error hover:bg-error/5"
                    >
                      <Icon name="log-out" className="w-4 h-4" /> Logout
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}

          {user?.logoutHref && (
            <Link
              href={user.logoutHref}
              title="Logout"
              className="hidden sm:grid w-9 h-9 place-items-center rounded-lg text-slate-400 hover:text-error hover:bg-error/5 transition-colors"
            >
              <Icon name="log-out" className="w-[18px] h-[18px]" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
