import CheckoutField, { SelectField } from "./CheckoutField";

// One address block: country (picked), street, apartment, city, state / province
// and postal code (typed). Rendered once for billing and once for shipping, told
// apart by `section` ("billing" | "shipping"), which prefixes every id and the
// autofill hint. `disabled` greys the whole block out (the shipping address while
// it copies the billing one). `errors` is this address's { field: message }.
export default function CheckoutAddressFields({ section, address, errors = {}, countries, disabled = false, onChange }) {
  const id = (name) => `checkout-${section}-${name}`;
  const country = countries.find((candidate) => candidate.name === address.country);

  return (
    <>
      <SelectField
        id={id("country")}
        label="Country"
        error={errors.country}
        value={address.country}
        onChange={(event) => onChange({ country: event.target.value })}
        autoComplete={`${section} country-name`}
        disabled={disabled}
        placeholder={country ? undefined : "Select a country"}
        options={countries.map((candidate) => candidate.name)}
      />

      <CheckoutField
        id={id("address-1")}
        label="Street Address"
        className="mt-5"
        error={errors.line1}
        value={address.line1}
        onChange={(event) => onChange({ line1: event.target.value })}
        autoComplete={`${section} address-line1`}
        disabled={disabled}
        placeholder="123 Main Street"
        maxLength={120}
      />

      <CheckoutField
        id={id("address-2")}
        label="Apartment, suite, etc."
        required={false}
        className="mt-5"
        value={address.line2}
        onChange={(event) => onChange({ line2: event.target.value })}
        autoComplete={`${section} address-line2`}
        disabled={disabled}
        placeholder="Apt 4B (optional)"
        maxLength={120}
      />

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <CheckoutField
          id={id("city")}
          label="City"
          error={errors.city}
          value={address.city}
          onChange={(event) => onChange({ city: event.target.value })}
          autoComplete={`${section} address-level2`}
          disabled={disabled}
          placeholder="Los Angeles"
          maxLength={80}
        />
        <CheckoutField
          id={id("state")}
          label="State / Province"
          error={errors.state}
          value={address.state}
          onChange={(event) => onChange({ state: event.target.value })}
          autoComplete={`${section} address-level1`}
          disabled={disabled}
          placeholder="California"
          maxLength={80}
        />
      </div>

      <CheckoutField
        id={id("zip")}
        label={country?.postalLabel || "Postal Code"}
        required={country ? country.postalRequired : true}
        className="mt-5 sm:max-w-[calc(50%-0.625rem)]"
        error={errors.zip}
        value={address.zip}
        onChange={(event) => onChange({ zip: event.target.value })}
        autoComplete={`${section} postal-code`}
        disabled={disabled}
        placeholder="90001"
        maxLength={12}
      />
    </>
  );
}
