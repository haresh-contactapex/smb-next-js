import { deleteCustomerAddress, updateCustomerAddress } from "@/lib/customerAddresses";
import { failure, ok, readJson, requireCustomer } from "../../respond";

export async function PATCH(request, { params }) {
  const { customer, response } = await requireCustomer();
  if (response) return response;
  try {
    const { id } = await params;
    return ok({ addresses: await updateCustomerAddress(customer.id, id, await readJson(request)) });
  } catch (error) {
    return failure(error, "We couldn't update that address right now. Please try again.");
  }
}

export async function DELETE(_request, { params }) {
  const { customer, response } = await requireCustomer();
  if (response) return response;
  try {
    const { id } = await params;
    return ok({ addresses: await deleteCustomerAddress(customer.id, id) });
  } catch (error) {
    return failure(error, "We couldn't delete that address right now. Please try again.");
  }
}
