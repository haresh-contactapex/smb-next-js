import { FieldShell, fieldA11y } from "../storefront/checkout/CheckoutField";
import StoreIcon from "../storefront/icons";
import { FIELD, FIELD_ERROR } from "./accountStyles";

// A select styled like the checkout's inputs whose options carry a value apart
// from their label ({ value, label }); the checkout's SelectField only takes
// plain strings. `placeholder` adds an empty first option.
export default function ChoiceSelect({ id, label, required = true, error, className, options, placeholder, ...selectProps }) {
  return (
    <FieldShell id={id} label={label} required={required} error={error} className={className}>
      <div className="relative">
        <select
          id={id}
          {...fieldA11y(id, required, error)}
          className={`${FIELD} cursor-pointer appearance-none pr-11 ${error ? FIELD_ERROR : ""}`}
          {...selectProps}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <StoreIcon name="chevronDown" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777777]" />
      </div>
    </FieldShell>
  );
}
