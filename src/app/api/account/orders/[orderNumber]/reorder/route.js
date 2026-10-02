import { buildReorderLines } from "@/lib/customerOrders";
import { failure, ok, requireCustomer } from "../../../respond";

// Answers with the order's lines priced against the catalog as it is now ({ lines, skipped }).
// The browser adds `lines` to its own cart; nothing is changed on the server.
export async function POST(_request, { params }) {
  const { customer, response } = await requireCustomer();
  if (response) return response;
  try {
    const { orderNumber } = await params;
    return ok(await buildReorderLines(customer.id, orderNumber));
  } catch (error) {
    return failure(error, "We couldn't prepare that order right now. Please try again.");
  }
}
