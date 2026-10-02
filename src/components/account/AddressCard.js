import StoreIcon from "../storefront/icons";
import { BTN_TEXT, BTN_TEXT_DANGER, CARD } from "./accountStyles";
import { addressLines } from "./accountHelpers";

const PILL = "inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold";

// One saved address: its label and default badges, the recipient, the address
// lines and any delivery note, with edit / delete / set-as-default actions.
// Presentational; AddressBook owns the handlers. `busy` disables the actions
// while one of them is in flight.
export default function AddressCard({ address, busy, onEdit, onDelete, onMakeDefault }) {
  return (
    <li className={`${CARD} flex flex-col p-5`}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="inline-flex items-center gap-1.5 text-[16px] font-semibold text-[#333333]">
          <StoreIcon name="mapPin" className="h-[18px] w-[18px] text-[#ef9822]" />
          {address.label}
        </h2>
        {address.isDefaultShipping && <span className={`${PILL} bg-[#ef9822]/15 text-[#a8620a]`}>Default shipping</span>}
        {address.isDefaultBilling && <span className={`${PILL} bg-blue-50 text-blue-800`}>Default billing</span>}
      </div>

      <address className="mt-3 text-[14px] not-italic leading-relaxed text-[#555555]">
        <span className="font-semibold text-[#333333]">{address.fullName}</span>
        {address.company && <span className="block">{address.company}</span>}
        {addressLines(address).map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
        {address.phone && <span className="mt-1 block text-gray-500">{address.phone}</span>}
      </address>

      {address.instructions && (
        <p className="mt-3 rounded-lg bg-[#FAFAFA] px-3 py-2 text-[13px] text-gray-500">
          <span className="font-medium text-[#555555]">Delivery note:</span> {address.instructions}
        </p>
      )}

      <div className="mt-auto pt-5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-gray-100 pt-4">
          <button type="button" onClick={onEdit} disabled={busy} aria-label={`Edit ${address.label} address`} className={BTN_TEXT}>
            <StoreIcon name="note" className="h-4 w-4" />
            Edit
          </button>
          {!address.isDefaultShipping && (
            <button type="button" onClick={() => onMakeDefault("shipping")} disabled={busy} className={BTN_TEXT}>
              <StoreIcon name="truck" className="h-4 w-4" />
              Set as default shipping
            </button>
          )}
          {!address.isDefaultBilling && (
            <button type="button" onClick={() => onMakeDefault("billing")} disabled={busy} className={BTN_TEXT}>
              <StoreIcon name="creditCard" className="h-4 w-4" />
              Set as default billing
            </button>
          )}
          <button type="button" onClick={onDelete} disabled={busy} aria-label={`Delete ${address.label} address`} className={`${BTN_TEXT_DANGER} ml-auto`}>
            <StoreIcon name="trash" className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}
