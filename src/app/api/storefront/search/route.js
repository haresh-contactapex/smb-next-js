import { NextResponse } from "next/server";
import { STOREFRONT_MAX_PAGE_SIZE, searchStorefrontProducts } from "@/lib/products";

// Public: storefront product search for the header's search panel and the
// results page. Only ACTIVE products are ever returned.
//   GET /api/storefront/search?q=rose gold&limit=6&offset=0

const DEFAULT_LIMIT = 8;

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

export async function GET(request) {
  const params = new URL(request.url).searchParams;

  const limit = readInt(params, "limit", { min: 1, max: STOREFRONT_MAX_PAGE_SIZE, fallback: DEFAULT_LIMIT });
  const offset = readInt(params, "offset", { min: 0, max: 100000, fallback: 0 });
  const invalid = [limit, offset].find((field) => field.error);
  if (invalid) return badRequest(invalid.error);

  try {
    const data = await searchStorefrontProducts({ query: params.get("q"), limit: limit.value, offset: offset.value });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Storefront search failed", error);
    return NextResponse.json({ success: false, error: "We couldn't run that search right now. Please try again." }, { status: 500 });
  }
}
