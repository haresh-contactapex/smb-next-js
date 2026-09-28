import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { searchOrders } from "@/lib/orders";

// Only backs the header's order search dropdown for now — the order list
// pages read listOrders() directly server-side and don't need this route.
export async function GET(request) {
  const auth = await requireStaffPermission("orders.view");
  if (!auth.ok) return permissionDeniedResponse(auth);

  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ success: true, data: [] });

  try {
    const data = await searchOrders(q);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
