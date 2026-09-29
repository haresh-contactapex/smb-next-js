"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/admin-panel/Icon";
import { toggleDropdown } from "@/components/admin-panel/adminPanelActions";
import { DASHBOARD_RANGES } from "@/lib/dashboardRanges";
import DiamondLoader from "./DiamondLoader";

export default function WelcomeHeader({ name, range }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const label = (DASHBOARD_RANGES.find((r) => r.key === range) || DASHBOARD_RANGES[1]).label;

  function pick(key) {
    if (key !== range) startTransition(() => router.push(key === "7d" ? "/" : `/?range=${key}`));
    toggleDropdown("panelDateRange");
  }

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-white">Welcome back, {name}!</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Here&apos;s what&apos;s happening with your store today.
        </p>
      </div>
      <DiamondLoader active={isPending} subtitle="Updating your dashboard" />
      <div className="relative shrink-0">
        <button
          id="btnDateRange"
          onClick={() => toggleDropdown("panelDateRange")}
          className="flex items-center gap-2 h-10 pl-3.5 pr-3 rounded-xl bg-white dark:bg-darksurface border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-600 dark:text-slate-300 shadow-sm hover:border-primary-300 dark:hover:border-accent-500/50 transition-colors"
        >
          <Icon name="calendar" className="w-4 h-4 text-slate-400" />
          <span>{label}</span>
          <Icon name="chevron-down" className="w-4 h-4 text-slate-400" />
        </button>
        <div
          id="panelDateRange"
          className="hidden absolute right-0 mt-2 w-48 bg-white dark:bg-darksurface border border-slate-200 dark:border-white/10 rounded-2xl shadow-popover overflow-hidden z-30 py-1.5"
        >
          {DASHBOARD_RANGES.map((option) => (
            <button
              key={option.key}
              onClick={() => pick(option.key)}
              className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
