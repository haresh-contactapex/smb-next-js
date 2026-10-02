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

// --- Saved addresses (signed-in customers) -----------------------------------
// `account` is { customer: { firstName, lastName, email, phone }, addresses: [...] }
// from loadCheckoutAccount(), or null for a guest. A saved address carries more
// than the checkout asks for (label, id, default flags); only the six address
// fields below are ever copied into a checkout address.

const ADDRESS_KEYS = ["country", "line1", "line2", "city", "state", "zip"];

// A saved address as checkout address values. The country is dropped if the store
// no longer ships there, as for any restored address.
export function savedToAddress(saved) {
  return sanitizeAddress(Object.fromEntries(ADDRESS_KEYS.map((key) => [key, String(saved?.[key] ?? "")])));
}

const loose = (value) => String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();

// Whether the checkout address currently holds exactly this saved address (spacing
// and case don't matter). This is how the picker knows what to show as selected:
// it is derived from the values, so editing a field after picking an address
// moves the picker to "Enter a different address" with no extra state to keep in step.
export function addressMatches(saved, address) {
  return ADDRESS_KEYS.every((key) => loose(saved[key]) === loose(address[key]));
}

// "Home · 115 Foothill Blvd, Los Angeles"
export function savedAddressLabel(saved) {
  return `${saved.label} · ${[saved.line1, saved.city].filter(Boolean).join(", ")}`;
}

// What choosing "Enter a different address" leaves behind: the country stays (the cart
// already picked a destination), everything below it is cleared.
export const CLEARED_ADDRESS = { line1: "", line2: "", city: "", state: "", zip: "" };

const hasTypedAddress = (address) => Boolean(address.line1.trim() || address.city.trim());

// The values the checkout opens with: what this tab already holds (`saved`, from
// session storage, or null), with a signed-in customer's details filled into
// anything still blank. Typed values always win, so coming back from Edit Cart
// never overwrites an edit. With nothing typed yet, the addresses start as the
// customer's default shipping and default billing addresses, and "same as
// billing" is on exactly when those are the one address.
export function startingCheckout(saved, account) {
  const start = saved || { contact: EMPTY_CONTACT, billing: EMPTY_ADDRESS, shipping: EMPTY_ADDRESS, sameAsBilling: true };
  if (!account) return start;

  const { customer, addresses } = account;
  const contact = { ...start.contact };
  for (const key of ["firstName", "lastName", "email"]) {
    if (!contact[key].trim()) contact[key] = customer[key] || "";
  }
  if (!contact.phone.trim() && customer.phone) {
    contact.phoneCountry = "US"; // the account stores phone numbers in US format
    contact.phone = formatPhoneInput(customer.phone, "US");
  }

  let { billing, shipping, sameAsBilling } = start;
  if (addresses.length > 0 && !hasTypedAddress(billing) && !hasTypedAddress(shipping)) {
    const defaultShipping = addresses.find((address) => address.isDefaultShipping) || addresses[0];
    const defaultBilling = addresses.find((address) => address.isDefaultBilling) || defaultShipping;
    billing = savedToAddress(defaultBilling);
    sameAsBilling = defaultBilling.id === defaultShipping.id;
    shipping = sameAsBilling ? billing : savedToAddress(defaultShipping);
  }
  return { contact, billing, shipping, sameAsBilling };
}

// "115 Foothill Blvd, Los Angeles, California 90017" for the collapsed step header.
export function formatAddress(address) {
  return [address.line1.trim(), address.city.trim(), `${address.state.trim()} ${address.zip.trim()}`.trim()].filter(Boolean).join(", ");
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
