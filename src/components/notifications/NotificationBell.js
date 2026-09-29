"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/admin-panel/Icon";
import { toggleDropdown } from "@/components/admin-panel/adminPanelActions";
import useNotificationStream from "./useNotificationStream";
import {
  api,
  badgeText,
  ENTITY_ICONS,
  NOTIF_COLOR_CLASSES,
  notificationHref,
  notifyChanged,
  timeAgo,
} from "./helpers";

/**
 * Topbar bell. The panel keeps the shell's `panel*` id so the existing
 * toggleDropdown / outside-click handling opens and closes it.
 */
export default function NotificationBell({ viewAllHref = "/admin/notifications" }) {
  const { items, unreadCount, loaded, setItems, setUnreadCount } = useNotificationStream();
  const [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(action) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
      notifyChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const toggleRead = (n) =>
    run(async () => {
      const data = await api(`/api/notifications/${n.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ read: !n.read }),
      });
      setItems((current) => current.map((item) => (item.id === n.id ? { ...item, read: data.read } : item)));
      setUnreadCount(data.unreadCount);
    });

  const markAllRead = () =>
    run(async () => {
      const data = await api("/api/notifications/mark-all-read", { method: "POST" });
      setItems((current) => current.map((item) => ({ ...item, read: true })));
      setUnreadCount(data.unreadCount);
    });

  const clearAll = () =>
    run(async () => {
      await api("/api/notifications", { method: "DELETE" });
      setItems([]);
      setUnreadCount(0);
      setConfirmClear(false);
    });

  const headerButton =
    "text-[11px] font-semibold px-2 h-7 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent";

  return (
    <div className="relative">
      <button
        id="btnNotif"
        type="button"
        onClick={() => toggleDropdown("panelNotif")}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        className="relative w-9 h-9 grid place-items-center rounded-lg text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
      >
        <Icon name="bell" className="w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-white text-[10px] font-bold leading-[18px] text-center ring-2 ring-white dark:ring-darksurface">
            {badgeText(unreadCount)}
          </span>
        )}
      </button>

      <div
        id="panelNotif"
        className="hidden absolute right-0 mt-2 w-96 max-w-[92vw] bg-white dark:bg-darksurface border border-slate-200 dark:border-white/10 rounded-2xl shadow-popover overflow-hidden z-40"
      >
        <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 text-[11px] font-semibold text-primary-600 dark:text-accent-400">
                {badgeText(unreadCount)} new
              </span>
            )}
          </span>
          <span className="flex items-center gap-1">
            {confirmClear ? (
              <>
                <button type="button" onClick={clearAll} disabled={busy} className={`${headerButton} text-error hover:!bg-error/10`}>
                  Confirm clear
                </button>
                <button type="button" onClick={() => setConfirmClear(false)} className={`${headerButton} text-slate-500`}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={markAllRead} disabled={busy || unreadCount === 0} className={`${headerButton} text-primary-600 dark:text-accent-400`}>
                  Mark all read
                </button>
                <button type="button" onClick={() => setConfirmClear(true)} disabled={busy || items.length === 0} className={`${headerButton} text-slate-500`}>
                  Clear all
                </button>
              </>
            )}
          </span>
        </div>

        {error && (
          <p role="alert" className="px-4 py-2 text-xs text-error bg-error/5">
            {error}
          </p>
        )}

        <div className="max-h-96 overflow-y-auto custom-scroll divide-y divide-slate-100 dark:divide-white/5">
          {!loaded && <p className="px-4 py-6 text-center text-xs text-slate-400">Loading…</p>}
          {loaded && items.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-slate-400">You&apos;re all caught up.</p>
          )}
          {items.map((n) => {
            const href = notificationHref(n);
            const body = (
              <>
                <span
                  className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${
                    NOTIF_COLOR_CLASSES[n.severity] || NOTIF_COLOR_CLASSES.info
                  }`}
                >
                  <Icon name={ENTITY_ICONS[n.entityType] || "bell"} className="w-4 h-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[13px] text-slate-700 dark:text-slate-200 ${n.read ? "font-normal" : "font-semibold"}`}>
                    {n.title}
                  </span>
                  {n.description && (
                    <span className="block text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.description}</span>
                  )}
                  <span className="block text-[11px] text-slate-400 mt-0.5">
                    {n.actorName} · {timeAgo(n.createdAt)}
                  </span>
                </span>
              </>
            );
            return (
              <div
                key={n.id}
                className={`flex items-start gap-1 pr-2 hover:bg-slate-50 dark:hover:bg-white/5 ${n.read ? "" : "bg-primary-500/[0.04]"}`}
              >
                {href ? (
                  <Link href={href} onClick={() => !n.read && toggleRead(n)} className="flex flex-1 min-w-0 items-start gap-3 pl-4 py-3">
                    {body}
                  </Link>
                ) : (
                  <div className="flex flex-1 min-w-0 items-start gap-3 pl-4 py-3">{body}</div>
                )}
                <button
                  type="button"
                  onClick={() => toggleRead(n)}
                  disabled={busy}
                  title={n.read ? "Mark as unread" : "Mark as read"}
                  aria-label={n.read ? "Mark as unread" : "Mark as read"}
                  className="mt-2.5 w-7 h-7 grid place-items-center rounded-md text-slate-400 hover:text-primary-600 dark:hover:text-accent-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  <Icon name={n.read ? "eye-off" : "check"} className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        <Link
          href={viewAllHref}
          className="block text-center text-[13px] font-semibold text-primary-600 dark:text-accent-400 py-3 border-t border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5"
        >
          View all notifications
        </Link>
      </div>
    </div>
  );
}
