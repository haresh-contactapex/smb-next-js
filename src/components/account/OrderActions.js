"use client";

import { useRef, useState } from "react";
import StoreIcon from "../storefront/icons";
import { requestJson } from "../storefront/cart/cartApi";
import { useCart } from "../storefront/cart/CartProvider";
import { lineKey } from "../storefront/cart/cartHelpers";
import { NoticeRegion, useNotice } from "./Notice";
import CancelOrderButton from "./CancelOrderButton";
import { BTN_DARK, BTN_OUTLINE } from "./accountStyles";

// The two things a customer can do with an order: put its items back in the
// cart ("Order again") and cancel it while it is Pending or Processing. Nothing is refunded
// automatically: for a paid order (`awaitingRefund`) the store is emailed and refunds it by hand.
// Both are decided by the server (canCancel / hasItems come from it and the API
// re-checks), so a stale page can't do what it shouldn't.
export default function OrderActions({ orderNumber, canCancel, awaitingRefund = false, hasItems }) {
  const { addItem, setQuantity } = useCart();
  const [notice, notify] = useNotice();
  const [skipped, setSkipped] = useState([]);
  const [busy, setBusy] = useState(null); // "reorder" | null
  const busyRef = useRef(false);
  const path = `/api/account/orders/${encodeURIComponent(orderNumber)}`;

  async function reorder() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy("reorder");
    setSkipped([]);
    const result = await requestJson("POST", `${path}/reorder`);
    busyRef.current = false;
    setBusy(null);

    if (!result.ok) {
      notify(result.error, "error");
      return;
    }

    const { lines, skipped: unavailable } = result.data;
    setSkipped(unavailable);
    if (lines.length === 0) {
      notify("None of the items in this order can be reordered right now.", "error");
      return;
    }

    // addItem adds one and opens the cart; the quantity is then set on that line.
    for (const line of lines) {
      addItem(line);
      if (line.quantity > 1) setQuantity(lineKey(line.productId, line.variantId, line.engraving), line.quantity);
    }
    notify(
      unavailable.length > 0
        ? `Added ${lines.length} of ${lines.length + unavailable.length} items to your cart`
        : `Added ${lines.length === 1 ? "the item" : `all ${lines.length} items`} to your cart`,
      "success"
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {hasItems && (
          <button type="button" onClick={reorder} disabled={busy !== null} className={BTN_DARK}>
            <StoreIcon name="refresh" className="h-4 w-4" />
            {busy === "reorder" ? "Adding…" : "Order again"}
          </button>
        )}
        {canCancel && <CancelOrderButton orderNumber={orderNumber} awaitingRefund={awaitingRefund} />}
      </div>

      {skipped.length > 0 && (
        <div role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13.5px] text-amber-900">
          <p className="font-semibold">Some items couldn&apos;t be added:</p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
            {skipped.map((item) => (
              <li key={`${item.title}-${item.reason}`}>
                {item.title}: {item.reason}
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setSkipped([])} className={`${BTN_OUTLINE} mt-3 !px-3 !py-1.5 !text-[13px]`}>
            Dismiss
          </button>
        </div>
      )}

      <NoticeRegion notice={notice} />
    </>
  );
}
