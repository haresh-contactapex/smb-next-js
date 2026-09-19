"use client";

import Icon from "@/components/admin-panel/Icon";
import { getCountryNames, getStateNames, getCityNames } from "@/data/locationData";
import { formatUsPhone } from "@/lib/phone";

export default function AddressFields({ idPrefix, address, onFieldChange, errors = {}, registerRef, onEnter }) {
  const states = getStateNames(address.country);
  const cities = getCityNames(address.country, address.state);

  // `!`-prefixed (important) because .field-input's own border/background
  // rules tie in specificity with plain Tailwind utilities and win on source
  // order, so a plain "border-red-400 bg-red-50" is silently no-op'd.
  function fieldClass(field, extra = "") {
    const errorClass = errors[field]
      ? " !border-red-400 focus:!border-red-400 !bg-red-50 focus:!bg-red-50 dark:!bg-red-500/10 dark:focus:!bg-red-500/10"
      : "";
    return `field-input${extra ? ` ${extra}` : ""}${errorClass}`;
  }

  function handleKeyDown(e) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    onEnter?.();
  }

  function refFor(field) {
    return registerRef ? registerRef(field) : undefined;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="field-label" htmlFor={`${idPrefix}-full-name`}>
            Full Name
          </label>
          <input
            id={`${idPrefix}-full-name`}
            ref={refFor("fullName")}
            type="text"
            value={address.fullName}
            onChange={(e) => onFieldChange("fullName", e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Full name"
            aria-label="Full name"
            className={fieldClass("fullName")}
          />
          {errors.fullName && <p className="text-xs text-error mt-1">{errors.fullName}</p>}
        </div>
        <div>
          <label className="field-label" htmlFor={`${idPrefix}-company`}>
            Company (optional)
          </label>
          <input
            id={`${idPrefix}-company`}
            type="text"
            value={address.company}
            onChange={(e) => onFieldChange("company", e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Company name"
            aria-label="Company"
            className="field-input"
          />
        </div>
      </div>

      <div>
        <label className="field-label" htmlFor={`${idPrefix}-line1`}>
          Address Line 1
        </label>
        <input
          id={`${idPrefix}-line1`}
          ref={refFor("addressLine1")}
          type="text"
          value={address.addressLine1}
          onChange={(e) => onFieldChange("addressLine1", e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Street address"
          aria-label="Address line 1"
          className={fieldClass("addressLine1")}
        />
        {errors.addressLine1 && <p className="text-xs text-error mt-1">{errors.addressLine1}</p>}
      </div>

      <div>
        <label className="field-label" htmlFor={`${idPrefix}-line2`}>
          Address Line 2 (optional)
        </label>
        <input
          id={`${idPrefix}-line2`}
          type="text"
          value={address.addressLine2}
          onChange={(e) => onFieldChange("addressLine2", e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Apartment, suite, unit, etc."
          aria-label="Address line 2"
          className="field-input"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="field-label" htmlFor={`${idPrefix}-country`}>
            Country
          </label>
          <div className="relative">
            <select
              id={`${idPrefix}-country`}
              value={address.country}
              onChange={(e) => onFieldChange("country", e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Country"
              className="field-input appearance-none pr-8 cursor-pointer"
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
        </div>
        <div>
          <label className="field-label" htmlFor={`${idPrefix}-state`}>
            State / Province
          </label>
          <div className="relative">
            <select
              id={`${idPrefix}-state`}
              ref={refFor("state")}
              value={address.state}
              onChange={(e) => onFieldChange("state", e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="State or province"
              className={fieldClass("state", "appearance-none pr-8 cursor-pointer")}
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
          {errors.state && <p className="text-xs text-error mt-1">{errors.state}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="field-label" htmlFor={`${idPrefix}-city`}>
            City
          </label>
          <div className="relative">
            <select
              id={`${idPrefix}-city`}
              ref={refFor("city")}
              value={address.city}
              onChange={(e) => onFieldChange("city", e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="City"
              disabled={!address.state}
              className={fieldClass("city", "appearance-none pr-8 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed")}
            >
              <option value="">{address.state ? "Select a city" : "Select a state first"}</option>
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
          {errors.city && <p className="text-xs text-error mt-1">{errors.city}</p>}
        </div>
        <div>
          <label className="field-label" htmlFor={`${idPrefix}-zip`}>
            ZIP / Postal Code
          </label>
          <input
            id={`${idPrefix}-zip`}
            ref={refFor("zip")}
            type="text"
            value={address.zip}
            onChange={(e) => onFieldChange("zip", e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ZIP code"
            aria-label="ZIP or postal code"
            className={fieldClass("zip")}
          />
          {errors.zip && <p className="text-xs text-error mt-1">{errors.zip}</p>}
        </div>
      </div>

      <div>
        <label className="field-label" htmlFor={`${idPrefix}-phone`}>
          Phone Number
        </label>
        <input
          id={`${idPrefix}-phone`}
          ref={refFor("phone")}
          type="tel"
          inputMode="numeric"
          value={address.phone}
          onChange={(e) => onFieldChange("phone", formatUsPhone(e.target.value))}
          onKeyDown={handleKeyDown}
          placeholder="(555) 000-0000"
          aria-label="Phone number"
          className={fieldClass("phone", "max-w-xs")}
        />
        {errors.phone && <p className="text-xs text-error mt-1">{errors.phone}</p>}
      </div>
    </div>
  );
}
