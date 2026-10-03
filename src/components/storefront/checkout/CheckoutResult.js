"use client";

import { useEffect } from "react";
import Link from "next/link";
import StoreIcon from "../icons";
import { useCart } from "../cart/CartProvider";
import { CHECKOUT_BUTTON } from "./checkoutStyles";
import { CHECKOUT_STORAGE_KEY } from "./checkoutHelpers";
import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";

// What each outcome says. `placed` outcomes mean the order exists and money is taken or
// on its way, so the cart is emptied; the others leave it alone so the customer can retry.
const OUTCOMES = {
  paid: {
    placed: true,
    title: "Thank you, your order is confirmed",
    body: "Your payment went through. We've started on your order and will be in touch about delivery.",
  },
  authorized: {
    placed: true,
    title: "Thank you, your order is placed",
    body: "Your card has been authorized. You'll only be charged once we confirm your order.",
  },
  processing: {
    placed: true,
    title: "Your payment is processing",
    body: "Your bank is still confirming the payment. Your order is saved and we'll update it as soon as it clears.",
  },
  action: {
    placed: false,
    title: "Your payment needs one more step",
    body: "Your bank asked for extra verification that wasn't completed. Nothing has been charged, so please try again.",
  },
  failed: {
    placed: false,
    title: "Your payment didn't go through",
    body: "Your card wasn't charged. Please check your details or try another card.",
  },
  unknown: {
    placed: false,
    title: "We couldn't confirm your payment",
    body: "This page can only be opened right after paying. If you were charged, your order will appear in your account shortly. Otherwise, please try checking out again.",
  },
};

// The order confirmation. On a placed order it empties the cart and clears what was
// typed into the checkout, so a reload or the Back button can't buy the same things twice.
export default function CheckoutResult({ result }) {
  const { clearCart, hydrated } = useCart();
  const { formatMoney } = useGeneralSettings();
  const outcome = OUTCOMES[result.state] || OUTCOMES.unknown;

  useEffect(() => {
    if (!outcome.placed || !hydrated) return;
    clearCart();
    try {
      window.sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
    } catch {
      // Storage blocked: nothing to clear.
    }
  }, [outcome.placed, hydrated, clearCart]);

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col items-center px-4 py-16 text-center sm:py-24">
      <span className={`flex h-16 w-16 items-center justify-center rounded-full ${outcome.placed ? "bg-[#EF9822] text-white" : "bg-[#F3F3F3] text-[#777777]"}`}>
        <StoreIcon name={outcome.placed ? "check" : "info"} className="h-8 w-8 [stroke-width:2.5]" />
      </span>

      <h1 className="mt-8 text-[26px] font-semibold text-[#222222] sm:text-[30px]">{outcome.title}</h1>
      <p className="mt-3 max-w-[520px] text-[16px] text-[#555555]">{outcome.body}</p>

      {result.orderNumber && (
        <dl className="mt-8 w-full max-w-[360px] rounded-2xl border border-[#EEEEEE] bg-[#FCF9F3] p-5 text-[15px]">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-[#777777]">Order number</dt>
            <dd className="font-semibold text-[#222222]">#{result.orderNumber}</dd>
          </div>
          <div className="mt-3 flex items-center justify-between gap-4">
            <dt className="text-[#777777]">Total</dt>
            <dd className="font-semibold text-[#222222]">{formatMoney(result.total, result.currency || undefined)}</dd>
          </div>
        </dl>
      )}

      <div className="mt-10 flex w-full max-w-[360px] flex-col gap-3">
        {outcome.placed ? (
          <Link href="/women-wedding-bands" className={CHECKOUT_BUTTON}>
            Continue shopping
          </Link>
        ) : (
          <Link href="/checkout" className={CHECKOUT_BUTTON}>
            Back to checkout
          </Link>
        )}
      </div>
    </div>
  );
}
