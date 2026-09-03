"use client";

import Icon from "@/components/admin-panel/Icon";
import { COUNTRIES } from "@/data/accountData";

function formatUsPhone(value) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  const area = digits.slice(0, 3);
  const prefix = digits.slice(3, 6);
  const line = digits.slice(6, 10);
  if (digits.length > 6) return `(${area}) ${prefix}-${line}`;
  if (digits.length > 3) return `(${area}) ${prefix}`;
  if (digits.length > 0) return `(${area}`;
  return "";
}

export default function AddressFields({ idPrefix, address, onFieldChange }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="field-label" htmlFor={`${idPrefix}-full-name`}>
            Full Name
          </label>
          <input
            id={`${idPrefix}-full-name`}
            type="text"
            value={address.fullName}
            onChange={(e) => onFieldChange("fullName", e.target.value)}
            placeholder="Full name"
            aria-label="Full name"
            className="field-input"
          />
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
          type="text"
          value={address.addressLine1}
          onChange={(e) => onFieldChange("addressLine1", e.target.value)}
          placeholder="Street address"
          aria-label="Address line 1"
          className="field-input"
        />
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
          placeholder="Apartment, suite, unit, etc."
          aria-label="Address line 2"
          className="field-input"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="field-label" htmlFor={`${idPrefix}-city`}>
            City
          </label>
          <input
            id={`${idPrefix}-city`}
            type="text"
            value={address.city}
            onChange={(e) => onFieldChange("city", e.target.value)}
            placeholder="City"
            aria-label="City"
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label" htmlFor={`${idPrefix}-state`}>
            State / Province
          </label>
          <input
            id={`${idPrefix}-state`}
            type="text"
            value={address.state}
            onChange={(e) => onFieldChange("state", e.target.value)}
            placeholder="State"
            aria-label="State or province"
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label" htmlFor={`${idPrefix}-zip`}>
            ZIP / Postal Code
          </label>
          <input
            id={`${idPrefix}-zip`}
            type="text"
            value={address.zip}
            onChange={(e) => onFieldChange("zip", e.target.value)}
            placeholder="ZIP code"
            aria-label="ZIP or postal code"
            className="field-input"
          />
        </div>
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
          <label className="field-label" htmlFor={`${idPrefix}-phone`}>
            Phone Number
          </label>
          <input
            id={`${idPrefix}-phone`}
            type="tel"
            inputMode="numeric"
            value={address.phone}
            onChange={(e) => onFieldChange("phone", formatUsPhone(e.target.value))}
            placeholder="(555) 000-0000"
            aria-label="Phone number"
            className="field-input"
          />
        </div>
      </div>
    </div>
  );
}
