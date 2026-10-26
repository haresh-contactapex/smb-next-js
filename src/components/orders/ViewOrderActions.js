"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/admin-panel/Icon";
import { Can } from "@/components/providers/StaffPermissionsProvider";
import { downloadOrderInvoice } from "./downloadInvoice";
import Toast from "@/components/ui/Toast";
import { useToast } from "@/components/ui/useToast";

// The View Order page's buttons: download the invoice, and (for roles that may
// edit orders) jump to the Edit Order page.
export default function ViewOrderActions({ orderId, orderNumber }) {
  const [downloading, setDownloading] = useState(false);
  const { toast, showToast, dismissToast } = useToast();

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
