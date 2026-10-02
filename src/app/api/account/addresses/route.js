import { createCustomerAddress, listCustomerAddresses } from "@/lib/customerAddresses";
import { failure, ok, readJson, requireCustomer } from "../respond";

export async function GET() {
  const { customer, response } = await requireCustomer();
  if (response) return response;
  try {
    return ok({ addresses: await listCustomerAddresses(customer.id) });
  } catch (error) {
    return failure(error, "We couldn't load your addresses right now. Please try again.");
  }
}

// Every mutation answers with the full updated list, so the page never has to
// guess how defaults moved.
export async function POST(request) {
  const { customer, response } = await requireCustomer();
  if (response) return response;
  try {
    return ok({ addresses: await createCustomerAddress(customer.id, await readJson(request)) });
  } catch (error) {
    return failure(error, "We couldn't save that address right now. Please try again.");
  }
}
