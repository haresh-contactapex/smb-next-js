import { fail, ok } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { searchOrders } from "@/lib/orders";

// Only backs the header's order search dropdown for now — the order list
// pages read listOrders() directly server-side and don't need this route.
export async function GET(request) {
  const auth = await requireStaffPermission("orders.view");
  if (!auth.ok) return permissionDeniedResponse(auth);

  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return ok([]);

  try {
    const data = await searchOrders(q);
    return ok(data);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
