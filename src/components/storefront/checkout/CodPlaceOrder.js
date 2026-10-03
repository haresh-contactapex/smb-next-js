"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import StoreIcon from "../icons";
import { useCart } from "../cart/CartProvider";
import { postJson } from "../cart/cartApi";
import { CHECKOUT_BUTTON } from "./checkoutStyles";

// Place Order for cash on delivery. There is no card form and no gateway: pressing the
// button sends the cart to the same endpoint a card order uses, flagged as cash on
// delivery, and the server prices it itself and saves it as an unpaid order. Then it goes
// to the confirmation page, which is opened with the new order's id.
// `buildOrder()` returns the request body, as for the card form.
export default function CodPlaceOrder({ buildOrder }) {
  const router = useRouter();
  const { syncLines, removeCoupon } = useCart();
  const [placing, setPlacing] = useState(false);
  const [message, setMessage] = useState("");
  const placingRef = useRef(false);

  // What to do with a refusal from our server: most are the cart or total having changed since
  // the page loaded, which brings the page up to date and asks the customer to look again.
  function explain(result) {
    if (result.reason === "cart_changed" && result.details?.lines) syncLines(result.details.lines);
    if (result.reason === "coupon_invalid") removeCoupon();
    // total_changed: the totals shown are stale. sign_in_required: guest checkout was switched off.
    // method_unavailable: cash on delivery was switched off or the total is below its minimum.
    if (["total_changed", "sign_in_required", "method_unavailable"].includes(result.reason)) router.refresh();
    setMessage(result.error);
  }

  async function placeOrder() {
    if (placingRef.current) return;
    placingRef.current = true;
    setPlacing(true);
    setMessage("");

    let redirected = false;
    try {
      const created = await postJson("/api/checkout/payment", { ...buildOrder(), paymentMethod: "cod" });
      if (!created.ok) {
        explain(created);
        return;
      }
      redirected = true;
      router.push(`/checkout/complete?cod=${encodeURIComponent(created.data.orderId)}`);
    } catch {
      setMessage("Something went wrong while placing your order. Please try again.");
    } finally {
      placingRef.current = false;
      // Stay "busy" while we navigate away, so the button can't be pressed twice.
      if (!redirected) setPlacing(false);
    }
  }

  return (
    <div className="mt-6">
      <p className="rounded-lg bg-[#FCF9F3] px-4 py-3.5 text-[14px] text-[#555555]">
        You&apos;ll pay in cash when your order is delivered. Please have the exact amount ready if you can.
      </p>

      <p role="alert" className="mt-4 rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-[14px] text-error empty:hidden">
        {message}
      </p>

      <button type="button" onClick={placeOrder} disabled={placing} className={`${CHECKOUT_BUTTON} mt-6`}>
        {placing ? "Placing your order…" : "Place Order"}
        {!placing && <StoreIcon name="arrowRight" className="h-5 w-5" />}
      </button>
    </div>
  );
}
