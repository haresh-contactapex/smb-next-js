"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/admin-panel/Icon";
import { Can } from "@/components/providers/StaffPermissionsProvider";
import { downloadOrderInvoice } from "./downloadInvoice";
import Toast from "@/components/add-product/Toast";

const TOAST_AUTO_DISMISS_MS = 10000;

// The View Order page's buttons: download the invoice, and (for roles that may
// edit orders) jump to the Edit Order page.
export default function ViewOrderActions({ orderId, orderNumber }) {
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });
  const toastTimerRef = useRef(null);

  function showToast(message, variant = "success") {
    setToast({ message, visible: true, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), TOAST_AUTO_DISMISS_MS);
  }

  function dismissToast() {
    clearTimeout(toastTimerRef.current);
    setToast((t) => ({ ...t, visible: false }));
  }

  async function handleDownloadInvoice() {
    setDownloading(true);
    try {
      await downloadOrderInvoice(orderId, orderNumber);
      showToast("Invoice downloaded");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleDownloadInvoice}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 text-sm font-semibold transition-colors disabled:opacity-60"
        >
          <Icon name="download" className="w-4 h-4" />
          {downloading ? "Preparing…" : "Download Invoice"}
        </button>
        <Can permission="orders.edit">
          <Link
            href={`/admin/edit-order/${orderId}`}
            className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-primary-600 dark:bg-accent-500 hover:bg-primary-700 dark:hover:bg-accent-600 text-white text-sm font-semibold transition-colors"
          >
            <Icon name="edit-2" className="w-4 h-4" />
            Edit Order
          </Link>
        </Can>
      </div>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </>
  );
}
