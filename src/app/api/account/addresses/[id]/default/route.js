import { setDefaultAddress } from "@/lib/customerAddresses";
import { failure, ok, readJson, requireCustomer } from "../../../respond";

// { kind: "shipping" | "billing" }: makes this the customer's default address of that kind.
export async function POST(request, { params }) {
  const { customer, response } = await requireCustomer();
  if (response) return response;
  try {
    const { id } = await params;
    const body = await readJson(request);
    return ok({ addresses: await setDefaultAddress(customer.id, id, body?.kind) });
  } catch (error) {
    return failure(error, "We couldn't change your default address right now. Please try again.");
  }
}
