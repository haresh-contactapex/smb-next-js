"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/admin-panel/Icon";
import { AVATAR_COLOR_CLASSES } from "@/components/dashboard/colorClasses";
import { STATUS_OPTIONS, PAYMENT_OPTIONS } from "./orderHelpers";
import Toast from "@/components/add-product/Toast";

const TOAST_AUTO_DISMISS_MS = 10000;

export default function EditOrderForm({ orderId }) {
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });
  const toastTimerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/orders/${orderId}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (!json.success) throw new Error(json.error || "Failed to load order");
        setOrder(json.data);
        setStatus(json.data.status);
        setPaymentStatus(json.data.payment);
        setLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoading(false);
        showToast(error.message, "error");
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  function showToast(message, variant = "success") {
    setToast({ message, visible: true, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), TOAST_AUTO_DISMISS_MS);
  }

  function dismissToast() {
    clearTimeout(toastTimerRef.current);
    setToast((t) => ({ ...t, visible: false }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, paymentStatus }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save order");

      showToast("Order updated");
      router.push("/orders");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="py-16 text-center text-sm text-slate-400">Loading order…</div>;
  }

  if (!order) {
    return <div className="py-16 text-center text-sm text-slate-400">Order not found.</div>;
  }

  return (
    <form onSubmit={handleSave}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <Link
            href="/orders"
            className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-1"
          >
            <Icon name="chevron-left" className="w-4 h-4" />
            Orders
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-white">Edit Order {order.id}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/orders"
            className="inline-flex items-center px-4 h-10 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 text-sm font-semibold transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-primary-600 dark:bg-accent-500 hover:bg-primary-700 dark:hover:bg-accent-600 text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6 space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <span
            className={`w-10 h-10 rounded-full text-sm font-bold grid place-items-center shrink-0 ${AVATAR_COLOR_CLASSES[order.avatarColor]}`}
          >
            {order.initials}
          </span>
          <div>
            <p className="font-semibold text-slate-700 dark:text-slate-200">{order.customer}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {order.date} · {order.products} · {order.amount}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <label className="block">
            <span className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Order Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-darksurface2 text-sm text-slate-700 dark:text-slate-200"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Payment Status</span>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-darksurface2 text-sm text-slate-700 dark:text-slate-200"
            >
              {PAYMENT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </form>
  );
}
