import Icon from "@/components/admin-panel/Icon";
import { getCountryNames, getStateNames, getCityNames } from "@/data/locationData";
import { formatUsPhone } from "@/lib/phone";

export default function StoreContactSection({
  storeEmail,
  storeEmailError,
  storeEmailInputRef,
  phone,
  phoneError,
  phoneInputRef,
  address,
  addressError,
  addressInputRef,
  country,
  countryError,
  countryInputRef,
  state,
  stateError,
  stateInputRef,
  city,
  cityError,
  cityInputRef,
  zip,
  zipError,
  zipInputRef,
  onFieldChange,
  onEnter,
}) {
  const states = getStateNames(country);
  const cities = getCityNames(country, state);

  function handleKeyDown(e) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    onEnter?.();
  }

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
              ref={storeEmailInputRef}
              type="email"
              value={storeEmail}
              onChange={(e) => onFieldChange("storeEmail", e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="hello@yourstore.com"
              aria-label="Store email"
              className={`field-input${
                storeEmailError
                  ? " !border-red-400 focus:!border-red-400 !bg-red-50 focus:!bg-red-50 dark:!bg-red-500/10 dark:focus:!bg-red-500/10"
                  : ""
              }`}
            />
            {storeEmailError && <p className="text-xs text-error mt-1">{storeEmailError}</p>}
          </div>
          <div>
            <label className="field-label" htmlFor="f-store-phone">
              Phone
            </label>
            <input
              id="f-store-phone"
              ref={phoneInputRef}
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => onFieldChange("phone", formatUsPhone(e.target.value))}
              onKeyDown={handleKeyDown}
              placeholder="(555) 000-0000"
              aria-label="Phone number"
              className={`field-input${
                phoneError
                  ? " !border-red-400 focus:!border-red-400 !bg-red-50 focus:!bg-red-50 dark:!bg-red-500/10 dark:focus:!bg-red-500/10"
                  : ""
              }`}
            />
            {phoneError && <p className="text-xs text-error mt-1">{phoneError}</p>}
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="f-store-address">
            Address
          </label>
          <textarea
            id="f-store-address"
            ref={addressInputRef}
            rows={2}
            value={address}
            onChange={(e) => onFieldChange("address", e.target.value)}
            placeholder="Street address"
            aria-label="Address"
            className={`w-full p-3 rounded-xl bg-slate-100 dark:bg-darksurface2 border focus:bg-white dark:focus:bg-darksurface2 focus:outline-none focus:ring-4 focus:ring-primary-500/10 text-sm transition-all font-medium text-slate-800 dark:text-white resize-y${
              addressError
                ? " !border-red-400 focus:!border-red-400 !bg-red-50 focus:!bg-red-50 dark:!bg-red-500/10 dark:focus:!bg-red-500/10"
                : " border-transparent focus:border-primary-400 dark:focus:border-accent-500"
            }`}
          />
          {addressError && <p className="text-xs text-error mt-1">{addressError}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label" htmlFor="f-store-country">
              Country
            </label>
            <div className="relative">
              <select
                id="f-store-country"
                ref={countryInputRef}
                value={country}
                onChange={(e) => onFieldChange("country", e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Country"
                className={`field-input appearance-none pr-8 cursor-pointer${
                  countryError
                    ? " !border-red-400 focus:!border-red-400 !bg-red-50 focus:!bg-red-50 dark:!bg-red-500/10 dark:focus:!bg-red-500/10"
                    : ""
                }`}
              >
                {getCountryNames().map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
                <Icon name="chevron-down" className="w-4 h-4" />
              </span>
            </div>
            {countryError && <p className="text-xs text-error mt-1">{countryError}</p>}
          </div>
          <div>
            <label className="field-label" htmlFor="f-store-state">
              State / Province
            </label>
            <div className="relative">
              <select
                id="f-store-state"
                ref={stateInputRef}
                value={state}
                onChange={(e) => onFieldChange("state", e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="State or province"
                className={`field-input appearance-none pr-8 cursor-pointer${
                  stateError
                    ? " !border-red-400 focus:!border-red-400 !bg-red-50 focus:!bg-red-50 dark:!bg-red-500/10 dark:focus:!bg-red-500/10"
                    : ""
                }`}
              >
                <option value="">Select a state</option>
                {states.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
                <Icon name="chevron-down" className="w-4 h-4" />
              </span>
            </div>
            {stateError && <p className="text-xs text-error mt-1">{stateError}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label" htmlFor="f-store-city">
              City
            </label>
            <div className="relative">
              <select
                id="f-store-city"
                ref={cityInputRef}
                value={city}
                onChange={(e) => onFieldChange("city", e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="City"
                disabled={!state}
                className={`field-input appearance-none pr-8 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed${
                  cityError
                    ? " !border-red-400 focus:!border-red-400 !bg-red-50 focus:!bg-red-50 dark:!bg-red-500/10 dark:focus:!bg-red-500/10"
                    : ""
                }`}
              >
                <option value="">{state ? "Select a city" : "Select a state first"}</option>
                {cities.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
                <Icon name="chevron-down" className="w-4 h-4" />
              </span>
            </div>
            {cityError && <p className="text-xs text-error mt-1">{cityError}</p>}
          </div>
          <div>
            <label className="field-label" htmlFor="f-store-zip">
              ZIP / Postal Code
            </label>
            <input
              id="f-store-zip"
              ref={zipInputRef}
              type="text"
              value={zip}
              onChange={(e) => onFieldChange("zip", e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ZIP code"
              aria-label="ZIP or postal code"
              className={`field-input${
                zipError
                  ? " !border-red-400 focus:!border-red-400 !bg-red-50 focus:!bg-red-50 dark:!bg-red-500/10 dark:focus:!bg-red-500/10"
                  : ""
              }`}
            />
            {zipError && <p className="text-xs text-error mt-1">{zipError}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
