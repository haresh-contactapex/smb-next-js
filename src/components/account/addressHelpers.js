// Pure address-book form logic. The country/state/city/postal-code checks are
// the checkout's own (validateAddress), so an address that saves here is one the
// checkout accepts, and the server repeats them before storing anything.
import { validateAddress } from "../storefront/checkout/checkoutHelpers";
import { formatUsPhone, isValidUsPhone } from "@/lib/phone";

export const ADDRESS_LABELS = ["Home", "Work", "Other"];

export const EMPTY_ADDRESS_FORM = {
  label: "Home",
  fullName: "",
  company: "",
  phone: "",
  country: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  zip: "",
  instructions: "",
  makeDefaultShipping: false,
  makeDefaultBilling: false,
};

// The form values for editing a saved address (defaults are changed with their own buttons).
export function formFromAddress(address) {
  return {
    label: address.label,
    fullName: address.fullName,
    company: address.company,
    phone: address.phone,
    country: address.country,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    zip: address.zip,
    instructions: address.instructions,
    makeDefaultShipping: false,
    makeDefaultBilling: false,
  };
}

export const formatPhoneInput = formatUsPhone;

// Same field errors the server would return, so most mistakes are caught before
// a request. Returns { errors } or, when everything agrees, { errors: {}, values }
// with the state and city spelled the way the location list has them.
export function validateAddressForm(form, countries) {
  const errors = {};
  if (!form.fullName.trim()) errors.fullName = "Enter the recipient's full name.";
  if (!isValidUsPhone(form.phone)) errors.phone = "Enter a 10-digit phone number, or leave it blank.";

  const location = validateAddress(form, countries);
  Object.assign(errors, location.errors);
  if (Object.keys(errors).length > 0) return { errors };

  return { errors: {}, values: { ...form, state: location.place.state, city: location.place.city } };
}

// Top-to-bottom order of the form's fields, for focusing the first one in error.
export const ADDRESS_FIELD_ORDER = ["fullName", "company", "phone", "country", "line1", "line2", "city", "state", "zip"];

// The DOM id each error key's control carries (see AddressForm / CheckoutAddressFields).
export const ADDRESS_FIELD_IDS = {
  fullName: "address-full-name",
  phone: "address-phone",
  country: "checkout-shipping-country",
  line1: "checkout-shipping-address-1",
  city: "checkout-shipping-city",
  state: "checkout-shipping-state",
  zip: "checkout-shipping-zip",
};
