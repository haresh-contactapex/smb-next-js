import { createCustomerPaymentMethod, listCustomerPaymentMethods } from "@/lib/customerPaymentMethods";
import { failure, ok, readJson, requireCustomer } from "../respond";

export async function GET() {
  const { customer, response } = await requireCustomer();
  if (response) return response;
  try {
    return ok({ paymentMethods: await listCustomerPaymentMethods(customer.id) });
  } catch (error) {
    return failure(error, "We couldn't load your saved cards right now. Please try again.");
  }
}

// { brand, last4, expMonth, expYear, holderName, nickname?, billingAddressId?, makeDefault? }
// The full card number and CVV are refused if sent (see customerPaymentMethods.js).
export async function POST(request) {
  const { customer, response } = await requireCustomer();
  if (response) return response;
  try {
    return ok({ paymentMethods: await createCustomerPaymentMethod(customer.id, await readJson(request)) });
  } catch (error) {
    return failure(error, "We couldn't save that card right now. Please try again.");
  }
}
