import Icon from "@/components/admin-panel/Icon";
import AddressFields from "./AddressFields";

export default function ShippingAddressSection({ sameAsBilling, address, onSameAsBillingChange, onFieldChange }) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
          <Icon name="truck" className="w-4 h-4 text-slate-400" /> Shipping Address
        </h2>
      </div>

      <label className="toggle-row text-sm text-slate-700 dark:text-slate-200 mb-4 mt-2">
        <input
          type="checkbox"
          checked={sameAsBilling}
          onChange={(e) => onSameAsBillingChange(e.target.checked)}
        />
        Shipping address is the same as billing address
      </label>

      {!sameAsBilling && <AddressFields idPrefix="shipping" address={address} onFieldChange={onFieldChange} />}
    </section>
  );
}
