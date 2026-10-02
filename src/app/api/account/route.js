import { deleteCustomerAccount } from "@/lib/customerProfile";
import { clearCustomerSession } from "@/lib/auth/customerSession";
import { failure, ok, readJson, requireCustomer } from "./respond";

// Permanently deletes the signed-in customer's account. { currentPassword }
export async function DELETE(request) {
  const { customer, response } = await requireCustomer();
  if (response) return response;
  try {
    await deleteCustomerAccount(customer.id, await readJson(request));
    await clearCustomerSession();
    return ok({ deleted: true });
  } catch (error) {
    return failure(error, "We couldn't delete your account right now. Please try again.");
  }
}
