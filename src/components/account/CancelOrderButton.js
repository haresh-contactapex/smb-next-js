"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { requestJson } from "../storefront/cart/cartApi";
import { NoticeRegion, useNotice } from "./Notice";
import { BTN_DANGER } from "./accountStyles";

// Cancels one of the customer's orders (after a confirm). Used on the orders list and the order
// page. Nothing is refunded automatically: for a paid order (`awaitingRefund`) the store is emailed
// and refunds it by hand. The server decides what can be cancelled and re-checks, so a stale page
// can't cancel what it shouldn't; either way the page is refreshed afterwards.
export default function CancelOrderButton({ orderNumber, awaitingRefund = false, className = BTN_DANGER }) {
  const router = useRouter();
  const [notice, notify] = useNotice();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  async function cancel() {
    if (busyRef.current) return;
    const question = awaitingRefund
      ? `Cancel order #${orderNumber}? You've already paid for it, so we'll refund your payment and be in touch to confirm. This can't be undone.`
      : `Cancel order #${orderNumber}? This can't be undone.`;
    if (!window.confirm(question)) return;
    busyRef.current = true;
    setBusy(true);
    const result = await requestJson("POST", `/api/account/orders/${encodeURIComponent(orderNumber)}/cancel`);
    busyRef.current = false;
    setBusy(false);

    if (!result.ok) {
      notify(result.error, "error");
      router.refresh(); // the order may have moved on since this page was loaded
      return;
    }
    notify(awaitingRefund ? "Your order was cancelled. We'll be in touch about your refund" : "Your order was cancelled", "success");
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={cancel} disabled={busy} aria-label={`Cancel order ${orderNumber}`} className={className}>
        {busy ? "Cancelling…" : "Cancel order"}
      </button>
      <NoticeRegion notice={notice} />
    </>
  );
}
