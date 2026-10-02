"use client";

import { useRef, useState } from "react";
import StoreIcon from "../storefront/icons";
import { requestJson } from "../storefront/cart/cartApi";
import AccountPageHeader from "./AccountPageHeader";
import AddCardForm from "./AddCardForm";
import CardEditForm from "./CardEditForm";
import CardTile from "./CardTile";
import { NoticeRegion, useNotice } from "./Notice";
import { BTN_DARK, BTN_TEXT, BTN_TEXT_DANGER, CARD } from "./accountStyles";
import { addressLines } from "./accountHelpers";
import { CARD_BRAND_LABELS, describeCard, formatExpiry, monthsUntilExpiry } from "./cardHelpers";
import { MAX_PAYMENT_METHODS } from "@/lib/accountLimits";

const PILL = "inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold";

// The Payment methods page: the customer's saved cards as card tiles, with make
// default / edit / remove on each and an add-a-card form. Every change goes to
// the server, which answers with the whole updated list; the screen only shows
// what the server confirmed. `acceptedMethods` is what the store takes at
// checkout (Settings -> Payment).
export default function PaymentMethods({ initialMethods, addresses, acceptedMethods }) {
  const [methods, setMethods] = useState(initialMethods);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [notice, notify] = useNotice();
  const addButtonRef = useRef(null);
  const atLimit = methods.length >= MAX_PAYMENT_METHODS;

  // Sends one change and applies the server's answer. Resolves to { ok, error, field }
  // so a form can show a field-level message; other callers just get the notice.
  async function send(method, url, body, successMessage) {
    const result = await requestJson(method, url, body);
    if (!result.ok) {
      notify(result.error, "error");
      return result;
    }
    setMethods(result.data.paymentMethods);
    if (successMessage) notify(successMessage, "success");
    return result;
  }

  async function addCard(values) {
    const result = await send("POST", "/api/account/payment-methods", values, "Card saved");
    if (result.ok) {
      setAdding(false);
      // The button is disabled while the form is open, so wait for it to re-enable.
      requestAnimationFrame(() => addButtonRef.current?.focus());
    }
    return result;
  }

  async function saveEdit(card, values) {
    const result = await send("PATCH", `/api/account/payment-methods/${card.id}`, values, "Card updated");
    if (result.ok) setEditingId(null);
    return result;
  }

  async function makeDefault(card) {
    setBusyId(card.id);
    await send("PATCH", `/api/account/payment-methods/${card.id}`, { isDefault: true }, "Default card updated");
    setBusyId(null);
  }

  async function removeCard(card) {
    if (!window.confirm(`Remove your ${describeCard(card)}?`)) return;
    setBusyId(card.id);
    const result = await send("DELETE", `/api/account/payment-methods/${card.id}`, undefined, "Card removed");
    setBusyId(null);
    if (result.ok && editingId === card.id) setEditingId(null);
  }

  return (
    <>
      <AccountPageHeader title="Payment methods" description="The cards you've saved, so you can recognise and manage how you pay.">
        <button
          ref={addButtonRef}
          type="button"
          onClick={() => {
            setEditingId(null);
            setAdding(true);
          }}
          disabled={adding || atLimit}
          className={BTN_DARK}
        >
          <StoreIcon name="plus" className="h-4 w-4" />
          Add a card
        </button>
      </AccountPageHeader>

      <p className="mb-6 flex items-start gap-2.5 rounded-xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-[13.5px] text-[#555555]">
        <StoreIcon name="shieldCheck" className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-700" />
        <span>
          We only keep your card&apos;s type, last four digits, expiry and name. The full number and CVV are never stored, and your
          payment is confirmed securely at checkout.
        </span>
      </p>

      {adding && (
        <div className="mb-6">
          <AddCardForm addresses={addresses} isFirstCard={methods.length === 0} onSubmit={addCard} onCancel={() => setAdding(false)} />
        </div>
      )}

      {methods.length === 0 && !adding ? (
        <div className={`${CARD} flex flex-col items-center gap-3 px-6 py-14 text-center`}>
          <StoreIcon name="creditCard" className="h-12 w-12 text-gray-300" />
          <p className="text-[16px] font-semibold text-[#333333]">No saved cards yet</p>
          <p className="max-w-sm text-[14px] text-gray-500">Save a card to keep your payment options in one place.</p>
          <button type="button" onClick={() => setAdding(true)} className={`${BTN_DARK} mt-2`}>
            <StoreIcon name="plus" className="h-4 w-4" />
            Add your first card
          </button>
        </div>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2">
          {methods.map((card) => {
            const billing = addresses.find((address) => address.id === card.billingAddressId);
            const soon = !card.expired && monthsUntilExpiry(card.expMonth, card.expYear) <= 1;
            const busy = busyId === card.id;
            return (
              <li key={card.id} className={`${CARD} flex flex-col gap-4 p-5`}>
                <CardTile card={card} />

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[15px] font-semibold text-[#333333]">
                      {card.nickname || CARD_BRAND_LABELS[card.brand]} <span className="font-normal text-gray-500">ending in {card.last4}</span>
                    </h2>
                    {card.isDefault && <span className={`${PILL} bg-[#ef9822]/15 text-[#a8620a]`}>Default</span>}
                    {card.expired && <span className={`${PILL} bg-red-50 text-red-700`}>Expired</span>}
                    {soon && <span className={`${PILL} bg-amber-50 text-amber-800`}>Expires soon</span>}
                  </div>
                  <p className="mt-1 text-[13px] text-gray-500">
                    {card.holderName} · Expires {formatExpiry(card.expMonth, card.expYear)}
                  </p>
                  {billing ? (
                    <p className="mt-1 text-[13px] text-gray-500">
                      Billing: {billing.label}, {addressLines(billing).slice(0, 2).join(", ")}
                    </p>
                  ) : null}
                </div>

                <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-gray-100 pt-4">
                  {!card.isDefault && !card.expired && (
                    <button type="button" onClick={() => makeDefault(card)} disabled={busy} className={BTN_TEXT}>
                      <StoreIcon name="check" className="h-4 w-4" />
                      Make default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(false);
                      setEditingId(editingId === card.id ? null : card.id);
                    }}
                    aria-expanded={editingId === card.id}
                    disabled={busy}
                    className={BTN_TEXT}
                  >
                    <StoreIcon name="note" className="h-4 w-4" />
                    Edit
                  </button>
                  <button type="button" onClick={() => removeCard(card)} disabled={busy} className={`${BTN_TEXT_DANGER} ml-auto`}>
                    <StoreIcon name="trash" className="h-4 w-4" />
                    Remove
                  </button>
                </div>

                {editingId === card.id && (
                  <CardEditForm card={card} addresses={addresses} onSubmit={(values) => saveEdit(card, values)} onCancel={() => setEditingId(null)} />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {atLimit && (
        <p className="mt-4 text-[13px] text-gray-500">You&apos;ve saved the maximum of {MAX_PAYMENT_METHODS} cards. Remove one to add another.</p>
      )}

      {acceptedMethods.length > 0 && (
        <section aria-labelledby="accepted-title" className={`${CARD} mt-8 p-5 sm:p-6`}>
          <h2 id="accepted-title" className="text-[16px] font-semibold text-[#333333]">
            Accepted at checkout
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2.5">
            {acceptedMethods.map((method) => (
              <li key={method.id} className="rounded-full border border-gray-200 px-3.5 py-1.5 text-[13px] font-medium text-[#555555]">
                {method.label}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] text-gray-500">These are the ways you can pay when you place an order.</p>
        </section>
      )}

      <NoticeRegion notice={notice} />
    </>
  );
}
