// Pure checkout logic: form defaults and validation, the phone country list,
// and the tax-inclusive total. Nothing here touches the DOM or the network.
import { isValidEmail } from "@/components/auth/helpers";
import { getCountryNames } from "@/data/locationData";
import { validateTypedLocation } from "@/lib/validateAddress";
import { formatUsPhone } from "@/lib/phone";
import { round2 } from "../cart/cartHelpers";

export const CHECKOUT_STORAGE_KEY = "smb:checkout";

// One entry per country the store ships to (src/data/locationData.js).
export const PHONE_COUNTRIES = [
  { code: "US", name: "United States", dial: "+1", flag: "🇺🇸" },
  { code: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
  { code: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { code: "AU", name: "Australia", dial: "+61", flag: "🇦🇺" },
  { code: "DE", name: "Germany", dial: "+49", flag: "🇩🇪" },
  { code: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
  { code: "IN", name: "India", dial: "+91", flag: "🇮🇳" },
  { code: "AE", name: "United Arab Emirates", dial: "+971", flag: "🇦🇪" },
];

export const EMPTY_CONTACT = { firstName: "", lastName: "", email: "", phoneCountry: "US", phone: "", updates: true };
export const EMPTY_ADDRESS = { country: "", line1: "", line2: "", city: "", state: "", zip: "" };

export const CHECKOUT_STEPS = [
  { id: "contact", title: "Contact", caption: "Your details" },
  { id: "billing", title: "Billing", caption: "Delivery address" },
  { id: "payment", title: "Payment", caption: "Secure payment" },
];

export const phoneCountryOf = (code) => PHONE_COUNTRIES.find((country) => country.code === code) || PHONE_COUNTRIES[0];

// US and Canada share +1 and the 10-digit national format.
const isNorthAmerican = (code) => phoneCountryOf(code).dial === "+1";

export function formatPhoneInput(value, phoneCountry) {
  if (isNorthAmerican(phoneCountry)) return formatUsPhone(value);
  return value.replace(/[^\d ]/g, "").slice(0, 16);
}

function phoneDigits(value) {
  return value.replace(/\D/g, "");
}

export function validateContact(contact) {
  const errors = {};
  if (!contact.firstName.trim()) errors.firstName = "Enter your first name.";
  if (!contact.lastName.trim()) errors.lastName = "Enter your last name.";
  if (!contact.email.trim()) errors.email = "Enter your email address.";
  else if (!isValidEmail(contact.email)) errors.email = "Enter a valid email address, like name@example.com.";

  const digits = phoneDigits(contact.phone);
  if (digits.length === 0) errors.phone = "Enter your phone number.";
  else if (isNorthAmerican(contact.phoneCountry) ? digits.length !== 10 : digits.length < 6 || digits.length > 14) {
    errors.phone = isNorthAmerican(contact.phoneCountry) ? "Enter a 10-digit phone number." : "Enter a valid phone number.";
  }
  return errors;
}

// Keeps a restored address honest: a saved country the store no longer lists is dropped.
export function sanitizeAddress(address) {
  return { ...address, country: getCountryNames().includes(address.country) ? address.country : "" };
}

// What typing in a field makes stale: a changed country voids the messages about
// the state, city and postal code under it, a changed state those about the city
// and postal code, and so on.
export const ADDRESS_DEPENDENTS = { country: ["state", "city", "zip"], state: ["city", "zip"], city: ["zip"] };

// `countries` is the cart's list of shipping countries ({ name, postalLabel, postalRequired }).
// Beyond the required fields, the typed state and city must exist in the country
// and the postal code must belong to that city (the same check the account
// address forms and the shipping lookup make), so a ZIP from one city can't be
// paired with another. Returns { errors } or, when everything agrees,
// { errors: {}, place: { state, city } } with the state and city spelled
// canonically, so "surat" is saved and shown as "Surat".
export function validateAddress(address, countries) {
  const errors = {};
  const country = countries.find((candidate) => candidate.name === address.country);
  if (!country) errors.country = "Select your country.";
  if (!address.line1.trim()) errors.line1 = "Enter your street address.";
  if (!address.city.trim()) errors.city = "Enter your city.";
  if (!address.state.trim()) errors.state = "Enter your state or province.";
  if (country?.postalRequired && !address.zip.trim()) errors.zip = `Enter your ${country.postalLabel.toLowerCase()}.`;
  if (Object.keys(errors).length > 0) return { errors };

  const location = validateTypedLocation({ country: address.country, state: address.state, city: address.city, postalCode: address.zip });
  return location.valid ? { errors: {}, place: { state: location.state, city: location.city } } : { errors: { [location.field]: location.message } };
}

// Moves focus to the first field flagged invalid once React has rendered the errors.
export function focusFirstInvalid(container) {
  requestAnimationFrame(() => container?.querySelector('[aria-invalid="true"]')?.focus());
}

// ["18K Yellow Gold", "Size 7"]: the option values of a cart line, a bare size gets its label back.
export function lineDetails(item) {
  return Object.entries(item.options).map(([name, value]) => (/^size$/i.test(name) ? `Size ${value}` : value));
}

// The cart's totals plus tax. `tax` is { pricesIncludeTax, rate, applyToShipping }
// from Settings -> Currency & Tax, or null when those couldn't be loaded.
// When prices already include tax nothing is added; the amount is only an estimate.
export function checkoutTotals(totals, tax) {
  if (!tax) return { tax: null, taxIncluded: false, total: totals.total };
  if (tax.pricesIncludeTax) return { tax: null, taxIncluded: true, total: totals.total };

  const taxable = totals.discountedSubtotal + (tax.applyToShipping ? totals.shipping || 0 : 0);
  const amount = round2((taxable * tax.rate) / 100);
  return { tax: amount, taxIncluded: false, total: round2(totals.total + amount) };
}
