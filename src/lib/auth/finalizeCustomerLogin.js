import { createCustomerSession } from "./customerSession";
import { toPublicCustomer } from "../customers";

// The last step of a customer sign-in, shared by a direct login (no 2FA
// required) and a login completed via /api/auth/verify-otp: creates the
// session cookie. `customer` is the raw `customers` row.
export async function finalizeCustomerLogin(customer, { rememberMe = false } = {}) {
  await createCustomerSession(customer.id, { rememberMe });
  return toPublicCustomer(customer);
}
