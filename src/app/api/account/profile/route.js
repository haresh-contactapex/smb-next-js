import { updateCustomerProfile } from "@/lib/customerProfile";
import { failure, ok, readJson, requireCustomer } from "../respond";

export async function GET() {
  const { customer, response } = await requireCustomer();
  if (response) return response;
  return ok(customer);
}

// Name, phone and marketing consent. Email and password have their own routes
// because they re-check the current password.
export async function PATCH(request) {
  const { customer, response } = await requireCustomer();
  if (response) return response;
  try {
    return ok(await updateCustomerProfile(customer.id, await readJson(request)));
  } catch (error) {
    return failure(error, "We couldn't save your details right now. Please try again.");
  }
}
