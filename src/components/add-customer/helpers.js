export const DEFAULT_CUSTOMER = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  customerGroup: "Retail",
  loyaltyPoints: "",
  acceptsMarketing: false,
};

export function buildCustomerFromData(data) {
  return {
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    email: data.email || "",
    phone: data.phone || "",
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
