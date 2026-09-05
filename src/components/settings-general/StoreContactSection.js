import Icon from "@/components/admin-panel/Icon";
import { COUNTRIES } from "@/data/accountData";

export default function StoreContactSection({ storeEmail, emailError, phone, address, country, state, city, onFieldChange }) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-1.5">
        <Icon name="map-pin" className="w-4 h-4 text-slate-400" /> Store Contact
      </h2>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label" htmlFor="f-store-email">
              Store Email
            </label>
            <input
              id="f-store-email"
              type="email"
              value={storeEmail}
              onChange={(e) => onFieldChange("storeEmail", e.target.value)}
              placeholder="hello@yourstore.com"
              aria-label="Store email"
              className={`field-input${emailError ? " border-red-400" : ""}`}
            />
            {emailError && <p className="text-xs text-error mt-1">Enter a valid email address.</p>}
          </div>
          <div>
            <label className="field-label" htmlFor="f-store-phone">
              Phone
            </label>
            <input
              id="f-store-phone"
              type="tel"
              value={phone}
              onChange={(e) => onFieldChange("phone", e.target.value)}
              placeholder="+1 (555) 000-0000"
              aria-label="Phone number"
              className="field-input"
            />
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="f-store-address">
            Address
          </label>
          <textarea
            id="f-store-address"
            rows={2}
            value={address}
            onChange={(e) => onFieldChange("address", e.target.value)}
            placeholder="Street address"
            aria-label="Address"
            className="w-full p-3 rounded-xl bg-slate-100 dark:bg-darksurface2 border border-transparent focus:border-primary-400 dark:focus:border-accent-500 focus:bg-white dark:focus:bg-darksurface2 focus:outline-none focus:ring-4 focus:ring-primary-500/10 text-sm transition-all font-medium text-slate-800 dark:text-white resize-y"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="field-label" htmlFor="f-store-country">
              Country
            </label>
            <div className="relative">
              <select
                id="f-store-country"
                value={country}
                onChange={(e) => onFieldChange("country", e.target.value)}
                aria-label="Country"
                className="field-input appearance-none pr-8 cursor-pointer"
              >
                {COUNTRIES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
                <Icon name="chevron-down" className="w-4 h-4" />
              </span>
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="f-store-state">
              State / Province
            </label>
            <input
              id="f-store-state"
              type="text"
              value={state}
              onChange={(e) => onFieldChange("state", e.target.value)}
              placeholder="State"
              aria-label="State or province"
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="f-store-city">
              City
            </label>
            <input
              id="f-store-city"
              type="text"
              value={city}
              onChange={(e) => onFieldChange("city", e.target.value)}
              placeholder="City"
              aria-label="City"
              className="field-input"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
