import { changeCustomerEmail } from "@/lib/customerProfile";
import { failure, ok, readJson, requireCustomer } from "../respond";

// { email, currentPassword }
export async function PATCH(request) {
  const { customer, response } = await requireCustomer();
  if (response) return response;
  try {
    return ok(await changeCustomerEmail(customer.id, await readJson(request)));
  } catch (error) {
    return failure(error, "We couldn't change your email right now. Please try again.");
  }
}
