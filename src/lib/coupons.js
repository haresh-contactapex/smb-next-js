import { sql } from "./db";

export async function listCoupons() {
  const rows = await sql`
    SELECT c.*, cat.name AS category_name
    FROM coupons c
    LEFT JOIN categories cat ON cat.id = c.category_id
    ORDER BY c.created_at DESC
  `;
  return rows.map(mapCoupon);
}

export async function getCouponById(id) {
  const [row] = await sql`
    SELECT c.*, cat.name AS category_name
    FROM coupons c
    LEFT JOIN categories cat ON cat.id = c.category_id
    WHERE c.id = ${id}
  `;
  if (!row) return null;
  return mapCoupon(row);
}

function mapCoupon(row) {
  return {
    id: row.id,
    code: row.code,
    description: row.description || "",
    type: row.discount_type,
    value: row.discount_value !== null ? Number(row.discount_value) : null,
    minPurchase: row.min_purchase_amount !== null ? Number(row.min_purchase_amount) : null,
    usageLimit: row.usage_limit,
    usageCount: row.usage_count,
    onePerCustomer: row.one_per_customer,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    appliesTo: row.applies_to,
    categoryId: row.category_id,
    categoryName: row.category_name || "",
  };
}

function couponValues(payload) {
  const type = payload.type;
  const appliesTo = payload.appliesTo === "CATEGORY" ? "CATEGORY" : "ALL";

  return {
    code: String(payload.code || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "")
      .slice(0, 20),
    description: payload.description || null,
    discount_type: type,
    discount_value: type === "free_shipping" ? null : toNumberOrNull(payload.value),
    min_purchase_amount: toNumberOrNull(payload.minPurchase),
    usage_limit: toIntOrNull(payload.usageLimit),
    one_per_customer: payload.onePerCustomer ?? true,
    status: payload.status || "DRAFT",
    start_date: payload.startDate || null,
    end_date: payload.endDate || null,
    applies_to: appliesTo,
    category_id: appliesTo === "CATEGORY" ? payload.categoryId || null : null,
  };
}

function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toIntOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const num = parseInt(value, 10);
  return Number.isFinite(num) ? num : null;
}

export async function createCoupon(payload) {
  const values = couponValues(payload);
  try {
    const [created] = await sql`
      INSERT INTO coupons (
        code, description, discount_type, discount_value, min_purchase_amount,
        usage_limit, one_per_customer, status, start_date, end_date, applies_to, category_id
      ) VALUES (
        ${values.code}, ${values.description}, ${values.discount_type}, ${values.discount_value},
        ${values.min_purchase_amount}, ${values.usage_limit}, ${values.one_per_customer}, ${values.status},
        ${values.start_date}, ${values.end_date}, ${values.applies_to}, ${values.category_id}
      )
      RETURNING id
    `;
    return created.id;
  } catch (error) {
    if (error.code === "23505" && error.constraint === "coupons_code_key") {
      throw new Error(`A coupon with the code "${values.code}" already exists. Change the code and try again.`);
    }
    throw error;
  }
}

export async function updateCoupon(id, payload) {
  const values = couponValues(payload);
  try {
    await sql`
      UPDATE coupons SET
        code = ${values.code}, description = ${values.description}, discount_type = ${values.discount_type},
        discount_value = ${values.discount_value}, min_purchase_amount = ${values.min_purchase_amount},
        usage_limit = ${values.usage_limit}, one_per_customer = ${values.one_per_customer},
        status = ${values.status}, start_date = ${values.start_date}, end_date = ${values.end_date},
        applies_to = ${values.applies_to}, category_id = ${values.category_id},
        updated_at = now()
      WHERE id = ${id}
    `;
    return id;
  } catch (error) {
    if (error.code === "23505" && error.constraint === "coupons_code_key") {
      throw new Error(`A coupon with the code "${values.code}" already exists. Change the code and try again.`);
    }
    throw error;
  }
}

export async function deleteCoupon(id) {
  await sql`DELETE FROM coupons WHERE id = ${id}`;
}
