import { formatUsPhone } from "@/lib/phone";

export const DEFAULT_CUSTOMER = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  customerGroup: "Retail",
  loyaltyPoints: "",
  acceptsMarketing: false,
};

// Stored numbers may carry a +1 country code (e.g. "+1 415 555 0107"); the
// form uses the app's 10-digit US format, so drop it before formatting.
function toFormPhone(value) {
  const digits = (value || "").replace(/\D/g, "");
  if (!digits) return "";
  return formatUsPhone(digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits);
}

export function buildCustomerFromData(data) {
  return {
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    email: data.email || "",
    phone: toFormPhone(data.phone),
    customerGroup: data.customerGroup || "Retail",
    loyaltyPoints: data.loyaltyPoints ?? "",
    acceptsMarketing: Boolean(data.acceptsMarketing),
    isGuest: Boolean(data.isGuest),
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

export function assembleCustomer(customer) {
  return {
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone,
    customerGroup: customer.customerGroup,
    loyaltyPoints: customer.loyaltyPoints,
    acceptsMarketing: customer.acceptsMarketing,
  };
}
