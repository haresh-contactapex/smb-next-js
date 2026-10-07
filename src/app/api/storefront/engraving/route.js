import { NextResponse } from "next/server";
import { getPublicEngravingConfig } from "@/lib/engraving";

// Public. The engraving rules and the fonts a customer can pick from, for the cart page's edit
// form. `data` is null when engraving is switched off or has no usable font. Whether a given
// product offers engraving is not decided here: the product page and the checkout do that.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ success: true, data: await getPublicEngravingConfig() });
}
