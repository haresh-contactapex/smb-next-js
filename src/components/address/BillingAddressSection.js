import Icon from "@/components/admin-panel/Icon";
import AddressFields from "./AddressFields";

export default function BillingAddressSection({ address, onFieldChange }) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-1.5">
        <Icon name="map-pin" className="w-4 h-4 text-slate-400" /> Billing Address
      </h2>
      <AddressFields idPrefix="billing" address={address} onFieldChange={onFieldChange} />
    </section>
  );
}
