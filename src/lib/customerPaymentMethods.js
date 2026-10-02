import { sql, sqlTransaction } from "./db";
import { AccountError, cleanText, isUuid } from "./accountError";
import { CARD_BRANDS, MAX_PAYMENT_METHODS } from "./accountLimits";

// Server side of the account's saved cards (/account/payment-methods).
//
// What is stored is display metadata only: brand, last four digits, expiry and
// the name on the card. The full number and CVV never reach this server (the
// browser derives brand and last four itself), and a request that includes
// them is refused outright so they can't end up in a log. `provider_token`
// stays empty until card capture goes through the payment gateway, which means
// a card saved here is a reference for the customer, not something the store
// can charge yet.

export { CARD_BRANDS, MAX_PAYMENT_METHODS };

// Fields that would carry sensitive card data. Any of them in a request is a
// client bug (or an attack), never something to quietly ignore.
const FORBIDDEN_FIELDS = ["number", "cardNumber", "card_number", "pan", "cvv", "cvc", "cvv2", "securityCode"];

// 12 -> true while the card is still good during the month it expires in.
export function isExpired(expMonth, expYear, now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return expYear < year || (expYear === year && expMonth < month);
}

function toPaymentMethod(row) {
  const expMonth = Number(row.exp_month);
  const expYear = Number(row.exp_year);
  return {
    id: row.id,
    brand: row.brand,
    last4: row.last4,
    expMonth,
    expYear,
    holderName: row.holder_name,
    nickname: row.nickname || "",
    billingAddressId: row.billing_address_id || null,
    isDefault: row.is_default,
    expired: isExpired(expMonth, expYear),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function parseExpiry(input) {
  const month = Number.parseInt(input.expMonth, 10);
  let year = Number.parseInt(input.expYear, 10);
  if (!(month >= 1 && month <= 12)) throw new AccountError("Enter a valid expiry month (1-12).", 400, "expiry");
  if (!Number.isFinite(year)) throw new AccountError("Enter a valid expiry year.", 400, "expiry");
  if (year < 100) year += 2000; // "29" -> 2029
  if (year > 2100) throw new AccountError("Enter a valid expiry year.", 400, "expiry");
  return { month, year };
}

function rejectSensitiveFields(input) {
  if (FORBIDDEN_FIELDS.some((field) => field in input)) {
    throw new AccountError("For your security, the full card number and CVV can't be saved here.", 400);
  }
}

// Checks a billing-address id from the request belongs to this customer.
async function assertOwnAddress(customerId, addressId) {
  if (addressId === null || addressId === undefined || addressId === "") return null;
  if (!isUuid(addressId)) throw new AccountError("Choose one of your saved addresses.", 400, "billingAddressId");
  const [row] = await sql`SELECT 1 AS ok FROM customer_addresses WHERE id = ${addressId} AND customer_id = ${customerId}`;
  if (!row) throw new AccountError("Choose one of your saved addresses.", 400, "billingAddressId");
  return addressId;
}

export function parseNewCardInput(body) {
  const input = body && typeof body === "object" ? body : {};
  rejectSensitiveFields(input);

  const brand = CARD_BRANDS.includes(input.brand) ? input.brand : null;
  if (!brand) throw new AccountError("We couldn't recognize that card type.", 400, "number");
  const last4 = String(input.last4 ?? "");
  if (!/^\d{4}$/.test(last4)) throw new AccountError("Enter a valid card number.", 400, "number");

  const holderName = cleanText(input.holderName, 150);
  if (!holderName) throw new AccountError("Enter the name on the card.", 400, "holderName");

  const { month, year } = parseExpiry(input);
  if (isExpired(month, year)) throw new AccountError("That card has expired.", 400, "expiry");

  return {
    brand,
    last4,
    expMonth: month,
    expYear: year,
    holderName,
    nickname: cleanText(input.nickname, 40),
    makeDefault: input.makeDefault === true,
  };
}

// Default card first, then newest.
export async function listCustomerPaymentMethods(customerId) {
  const rows = await sql`
    SELECT * FROM customer_payment_methods
    WHERE customer_id = ${customerId}
    ORDER BY is_default DESC, created_at DESC, id
  `;
  return rows.map(toPaymentMethod);
}

// The first card a customer saves becomes the default. Returns the updated list.
export async function createCustomerPaymentMethod(customerId, body) {
  const v = parseNewCardInput(body);
  const billingAddressId = await assertOwnAddress(customerId, body?.billingAddressId);

  let inserted;
  try {
    inserted = await sql`
      INSERT INTO customer_payment_methods (
        customer_id, brand, last4, exp_month, exp_year, holder_name, nickname, billing_address_id, is_default
      )
      SELECT
        ${customerId}::uuid, ${v.brand}, ${v.last4}, ${v.expMonth}::smallint, ${v.expYear}::smallint, ${v.holderName}, ${v.nickname || null},
        ${billingAddressId}::uuid,
        NOT EXISTS (SELECT 1 FROM customer_payment_methods WHERE customer_id = ${customerId} AND is_default)
      WHERE (SELECT COUNT(*) FROM customer_payment_methods WHERE customer_id = ${customerId}) < ${MAX_PAYMENT_METHODS}
      RETURNING id
    `;
  } catch (error) {
    if (error.code === "23505") {
      const [existing] = await sql`
        SELECT 1 AS ok FROM customer_payment_methods
        WHERE customer_id = ${customerId} AND brand = ${v.brand} AND last4 = ${v.last4}
          AND exp_month = ${v.expMonth} AND exp_year = ${v.expYear}
      `;
      if (existing) throw new AccountError("That card is already saved.", 409, "number");
      throw new AccountError("Your saved cards changed while saving. Please try again.", 409);
    }
    throw error;
  }
  if (inserted.length === 0) {
    throw new AccountError(`You can save up to ${MAX_PAYMENT_METHODS} cards. Remove one to add another.`, 409);
  }

  if (v.makeDefault) await setDefaultPaymentMethod(customerId, inserted[0].id);
  return listCustomerPaymentMethods(customerId);
}

// Edits what a customer can change on a saved card: its nickname, a renewed
// expiry date and its billing address. (A different card is a new card.)
export async function updateCustomerPaymentMethod(customerId, id, body) {
  if (!isUuid(id)) throw new AccountError("That card no longer exists.", 404);
  const input = body && typeof body === "object" ? body : {};
  rejectSensitiveFields(input);

  const [current] = await sql`SELECT * FROM customer_payment_methods WHERE id = ${id} AND customer_id = ${customerId}`;
  if (!current) throw new AccountError("That card no longer exists.", 404);

  const nickname = "nickname" in input ? cleanText(input.nickname, 40) : current.nickname || "";
  const hasExpiry = "expMonth" in input || "expYear" in input;
  const { month, year } = hasExpiry ? parseExpiry(input) : { month: Number(current.exp_month), year: Number(current.exp_year) };
  const billingAddressId =
    "billingAddressId" in input ? await assertOwnAddress(customerId, input.billingAddressId) : current.billing_address_id || null;

  try {
    await sql`
      UPDATE customer_payment_methods SET
        nickname = ${nickname || null}, exp_month = ${month}, exp_year = ${year},
        billing_address_id = ${billingAddressId}::uuid, updated_at = now()
      WHERE id = ${id} AND customer_id = ${customerId}
    `;
  } catch (error) {
    if (error.code === "23505") throw new AccountError("You already have that card saved with that expiry date.", 409, "expiry");
    throw error;
  }

  if (input.isDefault === true) await setDefaultPaymentMethod(customerId, id);
  return listCustomerPaymentMethods(customerId);
}

// Removing the default hands that role to the newest card still valid (or, if
// every card left has expired, the newest of them).
export async function deleteCustomerPaymentMethod(customerId, id) {
  if (!isUuid(id)) throw new AccountError("That card no longer exists.", 404);
  const [removed] = await sqlTransaction((tx) => [
    tx`DELETE FROM customer_payment_methods WHERE id = ${id} AND customer_id = ${customerId} RETURNING id`,
    tx`
      UPDATE customer_payment_methods SET is_default = true
      WHERE id = (
        SELECT id FROM customer_payment_methods WHERE customer_id = ${customerId}
        ORDER BY (exp_year * 100 + exp_month >= EXTRACT(YEAR FROM now())::int * 100 + EXTRACT(MONTH FROM now())::int) DESC, created_at DESC, id
        LIMIT 1
      )
      AND NOT EXISTS (SELECT 1 FROM customer_payment_methods WHERE customer_id = ${customerId} AND is_default)
    `,
  ]);
  if (removed.length === 0) throw new AccountError("That card no longer exists.", 404);
  return listCustomerPaymentMethods(customerId);
}

// The old default is cleared first (same transaction): the unique index allows
// one default per customer. An expired card can't become the default.
export async function setDefaultPaymentMethod(customerId, id) {
  if (!isUuid(id)) throw new AccountError("That card no longer exists.", 404);
  const [row] = await sql`SELECT exp_month, exp_year FROM customer_payment_methods WHERE id = ${id} AND customer_id = ${customerId}`;
  if (!row) throw new AccountError("That card no longer exists.", 404);
  if (isExpired(Number(row.exp_month), Number(row.exp_year))) {
    throw new AccountError("Update the expiry date of an expired card before making it your default.", 400);
  }

  await sqlTransaction((tx) => [
    tx`UPDATE customer_payment_methods SET is_default = false WHERE customer_id = ${customerId} AND is_default AND id <> ${id}`,
    tx`UPDATE customer_payment_methods SET is_default = true, updated_at = now() WHERE id = ${id} AND customer_id = ${customerId}`,
  ]);
  return listCustomerPaymentMethods(customerId);
}
