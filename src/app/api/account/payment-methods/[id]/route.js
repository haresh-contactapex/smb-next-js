import { deleteCustomerPaymentMethod, updateCustomerPaymentMethod } from "@/lib/customerPaymentMethods";
import { failure, ok, readJson, requireCustomer } from "../../respond";

// Any of { nickname, expMonth + expYear, billingAddressId, isDefault: true }.
export async function PATCH(request, { params }) {
  const { customer, response } = await requireCustomer();
  if (response) return response;
  try {
    const { id } = await params;
    return ok({ paymentMethods: await updateCustomerPaymentMethod(customer.id, id, await readJson(request)) });
  } catch (error) {
    return failure(error, "We couldn't update that card right now. Please try again.");
  }
}

export async function DELETE(_request, { params }) {
  const { customer, response } = await requireCustomer();
  if (response) return response;
  try {
    const { id } = await params;
    return ok({ paymentMethods: await deleteCustomerPaymentMethod(customer.id, id) });
  } catch (error) {
    return failure(error, "We couldn't remove that card right now. Please try again.");
  }
}
