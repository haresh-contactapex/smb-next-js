"use client";

import Link from "next/link";
import Icon from "@/components/admin-panel/Icon";
import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";

// Staff/admin sign-in is an internal tool, not a storefront page — a plain
// centered card instead of auth's split-screen marketing panel.
export default function AdminAuthLayout({ title, subtitle, children, footer }) {
  const { storeName, logoUrl } = useGeneralSettings();

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 dark:bg-darkbg p-6">
      <div className="w-full max-w-sm">
        <Link href="/admin/login" className="flex items-center justify-center gap-2.5 mb-8">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- store-uploaded logo, not optimizable by next/image
            <img src={logoUrl} alt={storeName} className="w-9 h-9 rounded-xl object-contain shrink-0 bg-white shadow-sm" />
          ) : (
            <span className="w-9 h-9 rounded-xl bg-primary-500 dark:bg-accent-500 text-white grid place-items-center shrink-0">
              <Icon name="gift" className="w-4 h-4" />
            </span>
          )}
          <span className="leading-tight text-center">
            <span className="block font-bold text-slate-800 dark:text-white">{storeName}</span>
            <span className="block text-xs text-slate-400">Admin Panel</span>
          </span>
        </Link>

        <div className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm p-6 sm:p-8">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white text-center">{title}</h1>
          {subtitle && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 text-center">{subtitle}</p>
          )}

          <div className="mt-6">{children}</div>
        </div>

        {footer && <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">{footer}</div>}
      </div>
    </div>
  );
}
