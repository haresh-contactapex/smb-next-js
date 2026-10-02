import { cancelCustomerOrder } from "@/lib/customerOrders";
import { failure, ok, requireCustomer } from "../../../respond";

export async function POST(_request, { params }) {
  const { customer, response } = await requireCustomer();
  if (response) return response;
  try {
    const { orderNumber } = await params;
    return ok({ order: await cancelCustomerOrder(customer, orderNumber) });
  } catch (error) {
    return failure(error, "We couldn't cancel that order right now. Please try again.");
  }
}
