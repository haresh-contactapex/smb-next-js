import { getStateNames, getCityNames } from "@/data/locationData";
import { validateLocationHierarchy } from "@/lib/validateAddress";
import { isValidUsPhone } from "@/lib/phone";

export function emptyAddress() {
  return {
    fullName: "",
    company: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zip: "",
    country: "United States",
    phone: "",
  };
}

// A brand-new address (nothing saved yet) starts pre-filled with the
// account's own name and phone, since that's who most addresses belong to —
// still fully editable for e.g. shipping to someone else.
export function emptyAddressFromProfile(profile) {
  const address = emptyAddress();
  if (!profile) return address;
  address.fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
  address.phone = profile.phone || "";
  return address;
}

export const DEFAULT_ADDRESS_STATE = {
  billing: emptyAddress(),
  shippingSameAsBilling: true,
  shipping: emptyAddress(),
  deliveryInstructions: "",
};

// Changing country/state must reset the fields that depend on it so the
// form can never hold a state/city that no longer belongs to the selection.
export function updateAddressField(address, field, value) {
  const next = { ...address, [field]: value };
  if (field === "country") {
    next.state = "";
    next.city = "";
  } else if (field === "state") {
    const cities = getCityNames(next.country, value);
    next.city = cities.length === 1 ? cities[0] : "";
  }
  return next;
}

export function formatAddressLines(addr) {
  const lines = [];
  if (addr.fullName) lines.push(addr.fullName);
  if (addr.company) lines.push(addr.company);
  const street = [addr.addressLine1, addr.addressLine2].filter(Boolean).join(", ");
  if (street) lines.push(street);
  const cityLine = [addr.city, addr.state, addr.zip].filter(Boolean).join(", ");
  if (cityLine) lines.push(cityLine);
  if (addr.country) lines.push(addr.country);
  if (addr.phone) lines.push(addr.phone);
  return lines;
}

export function isAddressComplete(addr) {
  return Boolean(addr.fullName.trim() && addr.addressLine1.trim() && addr.city.trim() && addr.state.trim());
}

// Order the "focus the first bad field" behavior follows — top to bottom,
// left to right as the fields appear in the form.
export const ADDRESS_FIELD_ORDER = ["fullName", "addressLine1", "state", "city", "zip", "phone"];

// Returns { valid, errors: { [field]: message }, firstErrorField, message }.
// `errors[field]` doubles as the red-border flag for that field.
export function validateAddressForm(address) {
  const errors = {};

  if (!address.fullName.trim()) errors.fullName = "Enter a full name.";
  if (!address.addressLine1.trim()) errors.addressLine1 = "Enter a street address.";
  if (!address.state.trim()) errors.state = "Select a state.";
  if (!address.city.trim()) errors.city = "Select a city.";

  if (!errors.state && !errors.city) {
    const hierarchy = validateLocationHierarchy({
      country: address.country,
      state: address.state,
      city: address.city,
      postalCode: address.zip,
    });
    if (!hierarchy.valid) {
      errors[hierarchy.field || "zip"] = hierarchy.message;
    }
  }

  if (!isValidUsPhone(address.phone)) {
    errors.phone = "Enter a valid 10-digit US phone number.";
  }

  const firstErrorField = ADDRESS_FIELD_ORDER.find((field) => errors[field]);
  return {
    valid: !firstErrorField,
    errors,
    firstErrorField,
    message: firstErrorField ? errors[firstErrorField] : "",
  };
}

// Re-exported for convenience so components only need to import from ./helpers.
export { getStateNames, getCityNames };
