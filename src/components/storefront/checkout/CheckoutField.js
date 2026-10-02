import StoreIcon from "../icons";
import { CHECKOUT_FIELD, CHECKOUT_FIELD_ERROR, CHECKOUT_LABEL } from "./checkoutStyles";

// Label, control and error line for one checkout field. Used directly for
// controls that aren't a plain input (the phone number, the country select).
export function FieldShell({ id, label, required = true, error, className = "", children }) {
  return (
    <div className={className}>
      <label htmlFor={id} className={CHECKOUT_LABEL}>
        {label}
        {required && (
          <span aria-hidden="true" className="text-error">
            {" "}
            *
          </span>
        )}
      </label>
      {children}
      <p id={`${id}-error`} role="alert" className="mt-1.5 text-[13px] text-error empty:hidden">
        {error}
      </p>
    </div>
  );
}

// The ARIA attributes every control in a FieldShell shares.
export function fieldA11y(id, required, error) {
  return {
    "aria-required": required || undefined,
    "aria-invalid": error ? "true" : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  };
}

// A native select styled like the inputs, with the chevron the design uses.
// `placeholder` adds an empty first option; `options` is a list of strings, or of
// { value, label } when what is submitted differs from what is shown.
export function SelectField({ id, label, required = true, error, className, options, placeholder, ...selectProps }) {
  return (
    <FieldShell id={id} label={label} required={required} error={error} className={className}>
      <div className="relative">
        <select
          id={id}
          {...fieldA11y(id, required, error)}
          className={`${CHECKOUT_FIELD} cursor-pointer appearance-none pr-11 ${error ? CHECKOUT_FIELD_ERROR : ""}`}
          {...selectProps}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => {
            const { value, label: text } = typeof option === "string" ? { value: option, label: option } : option;
            return (
              <option key={value} value={value}>
                {text}
              </option>
            );
          })}
        </select>
        <StoreIcon name="chevronDown" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777777]" />
      </div>
    </FieldShell>
  );
}

export default function CheckoutField({ id, label, required = true, error, className, ...inputProps }) {
  return (
    <FieldShell id={id} label={label} required={required} error={error} className={className}>
      <input id={id} {...fieldA11y(id, required, error)} className={`${CHECKOUT_FIELD} ${error ? CHECKOUT_FIELD_ERROR : ""}`} {...inputProps} />
    </FieldShell>
  );
}
