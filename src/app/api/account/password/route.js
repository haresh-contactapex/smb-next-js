import { changeCustomerPassword } from "@/lib/customerProfile";
import { refreshCustomerSessionAfterPasswordChange } from "@/lib/auth/customerSession";
import { failure, ok, readJson, requireCustomer } from "../respond";

// { currentPassword, newPassword }
export async function PATCH(request) {
  const { customer, response } = await requireCustomer();
  if (response) return response;
  try {
    await changeCustomerPassword(customer.id, await readJson(request));
    await refreshCustomerSessionAfterPasswordChange(customer.id);
    return ok({ changed: true });
  } catch (error) {
    return failure(error, "We couldn't change your password right now. Please try again.");
  }
}
