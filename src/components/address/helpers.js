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

export const DEFAULT_ADDRESS_STATE = {
  billing: emptyAddress(),
  shippingSameAsBilling: true,
  shipping: emptyAddress(),
  deliveryInstructions: "",
};

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
