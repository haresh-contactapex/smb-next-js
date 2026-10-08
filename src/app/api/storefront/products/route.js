import { NextResponse } from "next/server";
import { STOREFRONT_MAX_PAGE_SIZE, STOREFRONT_PAGE_SIZE, listStorefrontProductsPage } from "@/lib/products";

// Public: one page of the storefront product listing for "Load more" and the
// price, metal and size filters. Only ACTIVE products are ever returned.
//   GET /api/storefront/products?offset=12&limit=12&minPrice=500&maxPrice=2500
//       &metal=Platinum&metal=14K%20Rose%20Gold&size=7

function badRequest(error) {
  return NextResponse.json({ success: false, error }, { status: 400 });
}

// A blank value means "not set"; anything else must be a whole number in range.
function readInt(params, name, { min, max, fallback }) {
  const raw = params.get(name);
  if (raw === null || raw.trim() === "") return { value: fallback };
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) return { error: `${name} must be a whole number from ${min} to ${max}.` };
  return { value };
}

// A blank price means no bound.
function readPrice(params, name) {
  const raw = params.get(name);
  if (raw === null || raw.trim() === "") return { value: null };
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 1e9) return { error: `${name} must be zero or more.` };
  return { value };
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;

  const limit = readInt(params, "limit", { min: 1, max: STOREFRONT_MAX_PAGE_SIZE, fallback: STOREFRONT_PAGE_SIZE });
  const offset = readInt(params, "offset", { min: 0, max: 100000, fallback: 0 });
  const minPrice = readPrice(params, "minPrice");
  const maxPrice = readPrice(params, "maxPrice");
  const invalid = [limit, offset, minPrice, maxPrice].find((field) => field.error);
  if (invalid) return badRequest(invalid.error);

  const category = params.get("category")?.trim().slice(0, 200) || null;
  // Option values as the shopper picked them; a product matches any of the metals.
  const metals = params.getAll("metal").map((value) => value.trim().slice(0, 100)).filter(Boolean).slice(0, 30);
  const size = params.get("size")?.trim().slice(0, 100) || null;

  try {
    const data = await listStorefrontProductsPage({
      limit: limit.value,
      offset: offset.value,
      minPrice: minPrice.value,
      maxPrice: maxPrice.value,
      categorySlug: category,
      metals,
      size,
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Storefront product listing failed", error);
    return NextResponse.json({ success: false, error: "We couldn't load more products right now. Please try again." }, { status: 500 });
  }
}
