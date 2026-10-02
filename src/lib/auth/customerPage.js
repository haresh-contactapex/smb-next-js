import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "./customerSession";

// One session lookup per request even though the account layout and the page
// both ask for the customer.
const currentCustomer = cache(getCurrentCustomer);

export { currentCustomer };

// Server-page gate for /account/**. Middleware only gates /admin, so every
// account page calls this itself: a visitor without a customer session is sent
// to sign in and brought back to `nextPath` afterwards.
export async function requireCustomerPage(nextPath = "/account") {
  const customer = await currentCustomer();
  if (!customer) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return customer;
}
