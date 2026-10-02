"use client";

import { useState } from "react";
import { FieldShell, fieldA11y } from "../storefront/checkout/CheckoutField";
import StoreIcon from "../storefront/icons";
import { FIELD, FIELD_ERROR } from "./accountStyles";

// A password field in the checkout's input style with a show/hide button.
// `children` render under the field (a hint, the strength meter).
export default function PasswordInput({ id, label, value, onChange, error, autoComplete, placeholder, required = true, children, ...inputProps }) {
  const [visible, setVisible] = useState(false);

  return (
    <FieldShell id={id} label={label} required={required} error={error}>
      <div className="relative">
        <input
          id={id}
          {...fieldA11y(id, required, error)}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={`${FIELD} pr-12 ${error ? FIELD_ERROR : ""}`}
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-2 text-gray-400 transition-colors hover:text-[#ef9822] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#EF9822]"
        >
          <StoreIcon name={visible ? "eyeSlash" : "eye"} className="h-5 w-5" />
        </button>
      </div>
      {children}
    </FieldShell>
  );
}
