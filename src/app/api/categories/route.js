import { fail, ok, readJsonBody } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { listCategories, createCategory } from "@/lib/categories";
import { logAdminActivity } from "@/lib/notifications";

export async function GET() {
  const auth = await requireStaffPermission(["categories.view", "products.view", "products.create", "products.edit", "coupons.create", "coupons.edit"]);
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const data = await listCategories();
    return ok(data);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}

export async function POST(request) {
  const auth = await requireStaffPermission("categories.create");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const body = await readJsonBody(request);
    if (body.response) return body.response;
    const payload = body.payload;
    const id = await createCategory(payload);
    await logAdminActivity({
      actor: auth.user,
      action: "category.created",
      entityType: "category",
      entityId: id,
      title: `Category "${String(payload?.name || payload?.title || "").slice(0, 80) || "untitled"}" created`,
      severity: "success",
    });
    return ok({ id }, 201);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
