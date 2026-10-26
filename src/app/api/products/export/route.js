import { fail, ok } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { exportProductsToCsv } from "@/lib/productExport";

export async function GET() {
  const auth = await requireStaffPermission("products.export");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const csv = await exportProductsToCsv();
    const filename = `products-export-${new Date().toISOString().slice(0, 10)}.csv`;
    return ok({ csv, filename });
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
