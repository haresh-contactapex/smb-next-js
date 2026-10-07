"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Breadcrumbs from "@/components/admin-panel/Breadcrumbs";
import Icon from "@/components/admin-panel/Icon";
import {
  api,
  CHANGED_EVENT,
  ENTITY_ICONS,
  ENTITY_LABELS,
  NOTIF_COLOR_CLASSES,
  notificationHref,
  notifyChanged,
  RECEIVED_EVENT,
  SEVERITY_LABELS,
  timeAgo,
} from "./helpers";

const PAGE_SIZE = 20;
const selectClass = "field-input h-10 pl-3 pr-8 text-sm appearance-none cursor-pointer";
const outlineButton =
  "inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 text-sm font-semibold transition-colors disabled:opacity-50";

export default function NotificationsPage() {
  const [filters, setFilters] = useState({ q: "", type: "", status: "all", severity: "" });
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], unreadCount: 0, pagination: { page: 1, total: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(filters.q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [filters.q]);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), status: filters.status });
    if (query) params.set("q", query);
    if (filters.type) params.set("type", filters.type);
    if (filters.severity) params.set("severity", filters.severity);
    try {
      const result = await api(`/api/notifications?${params}`);
      if (id !== requestId.current) return;
      setData(result);
      setError("");
    } catch (e) {
      if (id === requestId.current) setError(e.message);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [page, query, filters.type, filters.status, filters.severity]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Stay live: refresh when the bell changes state or a new one arrives.
  useEffect(() => {
    window.addEventListener(CHANGED_EVENT, load);
    window.addEventListener(RECEIVED_EVENT, load);
    return () => {
      window.removeEventListener(CHANGED_EVENT, load);
      window.removeEventListener(RECEIVED_EVENT, load);
    };
  }, [load]);

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

  const setFilter = (key) => (e) => {
    const value = e.target.value;
    setFilters((f) => ({ ...f, [key]: value }));
    if (key !== "q") setPage(1);
  };

  const toggleRead = (n) =>
    run(() =>
      api(`/api/notifications/${n.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ read: !n.read }),
      })
    );
  const clearOne = (n) => run(() => api(`/api/notifications/${n.id}`, { method: "DELETE" }));
  const markAllRead = () => run(() => api("/api/notifications/mark-all-read", { method: "POST" }));
  const clearAll = () =>
    run(async () => {
      await api("/api/notifications", { method: "DELETE" });
      setConfirmClear(false);
      setPage(1);
    });

  const { items, pagination, unreadCount } = data;

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Breadcrumbs icon="bell" items={[{ label: "Dashboard", href: "/admin" }, { label: "Notifications" }]} />
          <h1 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-white">
            All Notifications
            {unreadCount > 0 && (
              <span className="ml-3 text-sm font-semibold text-primary-600 dark:text-accent-400">{unreadCount} unread</span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={markAllRead} disabled={busy || unreadCount === 0} className={outlineButton}>
            <Icon name="check-circle" className="w-4 h-4" /> Mark all read
          </button>
          {confirmClear ? (
            <>
              <button type="button" onClick={clearAll} disabled={busy} className={`${outlineButton} !border-error/40 !text-error`}>
                Confirm clear all
              </button>
              <button type="button" onClick={() => setConfirmClear(false)} className={outlineButton}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmClear(true)} disabled={busy || pagination.total === 0} className={outlineButton}>
              <Icon name="x-circle" className="w-4 h-4" /> Clear all
            </button>
          )}
        </div>
      </div>

      <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
          <label className="relative sm:col-span-2 lg:col-span-1">
            <span className="sr-only">Search notifications</span>
            <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.q}
              onChange={setFilter("q")}
              placeholder="Search notifications…"
              className="field-input h-10 w-full pl-9 pr-3 text-sm"
            />
          </label>
          <select aria-label="Filter by area" value={filters.type} onChange={setFilter("type")} className={selectClass}>
            <option value="">All areas</option>
            {Object.entries(ENTITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select aria-label="Filter by severity" value={filters.severity} onChange={setFilter("severity")} className={selectClass}>
            <option value="">All severities</option>
            {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select aria-label="Filter by read status" value={filters.status} onChange={setFilter("status")} className={selectClass}>
            <option value="all">Read &amp; unread</option>
            <option value="unread">Unread only</option>
            <option value="read">Read only</option>
          </select>
        </div>

        {error && (
          <p role="alert" className="mb-4 text-sm text-error">
            {error}
          </p>
        )}

        {loading ? (
          <p className="py-12 text-center text-sm text-slate-400">Loading…</p>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">No notifications match.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {items.map((n) => {
              const href = notificationHref(n);
              return (
                <li key={n.id} className="flex items-start gap-3 py-3.5">
                  <span
                    className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${
                      NOTIF_COLOR_CLASSES[n.severity] || NOTIF_COLOR_CLASSES.info
                    }`}
                  >
                    <Icon name={ENTITY_ICONS[n.entityType] || "bell"} className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm text-slate-700 dark:text-slate-200 ${n.read ? "" : "font-semibold"}`}>
                      {!n.read && (
                        <span aria-label="Unread" className="inline-block w-2 h-2 rounded-full bg-primary-500 mr-2 align-middle" />
                      )}
                      {href ? (
                        <Link href={href} className="hover:underline">
                          {n.title}
                        </Link>
                      ) : (
                        n.title
                      )}
                    </p>
                    {n.description && <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">{n.description}</p>}
                    <p className="text-xs text-slate-400 mt-1">
                      {n.actorName} · {ENTITY_LABELS[n.entityType] || "Activity"} ·{" "}
                      <time dateTime={n.createdAt} title={new Date(n.createdAt).toLocaleString()}>
                        {timeAgo(n.createdAt)}
                      </time>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleRead(n)}
                      disabled={busy}
                      className="text-xs font-semibold text-primary-600 dark:text-accent-400 px-2 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50"
                    >
                      {n.read ? "Mark unread" : "Mark read"}
                    </button>
                    <button
                      type="button"
                      onClick={() => clearOne(n)}
                      disabled={busy}
                      title="Clear"
                      aria-label="Clear notification"
                      className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:text-error hover:bg-error/5 disabled:opacity-50"
                    >
                      <Icon name="x" className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {pagination.total > 0 && (
          <div className="flex items-center justify-between gap-4 pt-4 mt-4 border-t border-slate-100 dark:border-white/5">
            <p className="text-xs text-slate-400">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} notification
              {pagination.total === 1 ? "" : "s"}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className={`${outlineButton} !h-9`}>
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= pagination.totalPages}
                className={`${outlineButton} !h-9`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
