import { NextResponse } from "next/server";
import { listCategoryPreviewImages } from "@/lib/products";

// Public: one product photo per category, for the storefront mega menu previews.
// Only ACTIVE products are ever used.
//   GET /api/storefront/category-images?slugs=women-s-wedding-bands,eternity-bands
//   -> { success: true, data: { images: { "<slug>": "<url>" | null } } }

const MAX_SLUGS = 12;
const MAX_SLUG_LENGTH = 200;

export async function GET(request) {
  const raw = new URL(request.url).searchParams.get("slugs") || "";
  const slugs = [...new Set(raw.split(",").map((slug) => slug.trim()).filter(Boolean))];

  if (slugs.length === 0) {
    return NextResponse.json({ success: false, error: "slugs is required." }, { status: 400 });
  }
  if (slugs.length > MAX_SLUGS || slugs.some((slug) => slug.length > MAX_SLUG_LENGTH)) {
    return NextResponse.json({ success: false, error: `Ask for at most ${MAX_SLUGS} categories.` }, { status: 400 });
  }

  try {
    const images = await listCategoryPreviewImages(slugs);
    return NextResponse.json({ success: true, data: { images } });
  } catch (error) {
    console.error("Category preview images failed", error);
    return NextResponse.json({ success: false, error: "We couldn't load the menu images right now." }, { status: 500 });
  }
}
