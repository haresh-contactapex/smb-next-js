import { changeCustomerTwoFactor } from "@/lib/customerProfile";
import { failure, ok, readJson, requireCustomer } from "../respond";

// { enabled, currentPassword } — turns the emailed sign-in code on or off.
export async function PATCH(request) {
  const { customer, response } = await requireCustomer();
  if (response) return response;
  try {
    return ok(await changeCustomerTwoFactor(customer.id, await readJson(request)));
  } catch (error) {
    return failure(error, "We couldn't update two-factor authentication right now. Please try again.");
  }
}
