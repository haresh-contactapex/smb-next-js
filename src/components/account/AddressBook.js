"use client";

import { useRef, useState } from "react";
import StoreIcon from "../storefront/icons";
import { requestJson } from "../storefront/cart/cartApi";
import AccountPageHeader from "./AccountPageHeader";
import AddressCard from "./AddressCard";
import AddressForm from "./AddressForm";
import { NoticeRegion, useNotice } from "./Notice";
import { BTN_DARK, CARD } from "./accountStyles";
import { MAX_ADDRESSES } from "@/lib/accountLimits";

// The Addresses page: the customer's address book. Every change goes to the
// server, which answers with the whole updated list (so a moved default is
// always right); the screen shows only what the server confirmed.
// `form` is null (closed), "new", or the id of the address being edited.
export default function AddressBook({ initialAddresses, countries }) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [form, setForm] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [notice, notify] = useNotice();
  const addButtonRef = useRef(null);
  const atLimit = addresses.length >= MAX_ADDRESSES;

  // Resolves to { ok, error, field } so the form can mark the field at fault;
  // any failure is also announced in the toast for the actions that have no form.
  async function send(method, url, body, successMessage) {
    const result = await requestJson(method, url, body);
    if (!result.ok) {
      notify(result.error, "error");
      return result;
    }
    setAddresses(result.data.addresses);
    if (successMessage) notify(successMessage, "success");
    return result;
  }

  function closeForm() {
    setForm(null);
    // The button is disabled while a form is open, so wait for it to re-enable.
    requestAnimationFrame(() => addButtonRef.current?.focus());
  }

  async function saveNew(values) {
    const result = await send("POST", "/api/account/addresses", values, "Address saved");
    if (result.ok) closeForm();
    return result;
  }

  async function saveEdit(address, values) {
    const result = await send("PATCH", `/api/account/addresses/${address.id}`, values, "Address updated");
    if (result.ok) closeForm();
    return result;
  }

  async function makeDefault(address, kind) {
    setBusyId(address.id);
    await send("POST", `/api/account/addresses/${address.id}/default`, { kind }, `Default ${kind} address updated`);
    setBusyId(null);
  }

  async function remove(address) {
    if (!window.confirm(`Delete your "${address.label}" address? Past orders are not affected.`)) return;
    setBusyId(address.id);
    const result = await send("DELETE", `/api/account/addresses/${address.id}`, undefined, "Address deleted");
    setBusyId(null);
    if (result.ok && form === address.id) setForm(null);
  }

  const editing = form && form !== "new" ? addresses.find((address) => address.id === form) : null;

  return (
    <>
      <AccountPageHeader title="Addresses" description="Where we send your orders, and where your cards are billed.">
        <button ref={addButtonRef} type="button" onClick={() => setForm("new")} disabled={form !== null || atLimit} className={BTN_DARK}>
          <StoreIcon name="plus" className="h-4 w-4" />
          Add an address
        </button>
      </AccountPageHeader>

      {form !== null && (
        <div className="mb-6">
          <AddressForm
            // Remounts when switching between "new" and a different saved address.
            key={form}
            address={editing}
            isFirst={addresses.length === 0}
            countries={countries}
            onSubmit={(values) => (editing ? saveEdit(editing, values) : saveNew(values))}
            onCancel={closeForm}
          />
        </div>
      )}

      {addresses.length === 0 && form === null ? (
        <div className={`${CARD} flex flex-col items-center gap-3 px-6 py-14 text-center`}>
          <StoreIcon name="mapPin" className="h-12 w-12 text-gray-300" />
          <p className="text-[16px] font-semibold text-[#333333]">No saved addresses yet</p>
          <p className="max-w-sm text-[14px] text-gray-500">Save an address and checkout can fill it in for you.</p>
          <button type="button" onClick={() => setForm("new")} className={`${BTN_DARK} mt-2`}>
            <StoreIcon name="plus" className="h-4 w-4" />
            Add your first address
          </button>
        </div>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              busy={busyId === address.id}
              onEdit={() => setForm(address.id)}
              onDelete={() => remove(address)}
              onMakeDefault={(kind) => makeDefault(address, kind)}
            />
          ))}
        </ul>
      )}

      <p className="mt-5 text-[13px] text-gray-500">
        {atLimit
          ? `You've saved the maximum of ${MAX_ADDRESSES} addresses. Delete one to add another.`
          : `You can save up to ${MAX_ADDRESSES} addresses. Orders you've already placed keep the address they were sent to.`}
      </p>

      <NoticeRegion notice={notice} />
    </>
  );
}
