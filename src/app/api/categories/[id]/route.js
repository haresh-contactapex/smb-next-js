import { fail, ok, readJsonBody } from "@/lib/api";
import { isUuid } from "@/lib/shared/ids";
import { publicErrorMessage } from "@/lib/publicError";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { getCategoryById, updateCategory, deleteCategory } from "@/lib/categories";
import { logAdminActivity } from "@/lib/notifications";

export async function GET(request, { params }) {
  const auth = await requireStaffPermission(["categories.view", "categories.edit"]);
  if (!auth.ok) return permissionDeniedResponse(auth);
  if (!isUuid(params.id)) return fail("Not found", 404);

  try {
    const category = await getCategoryById(params.id);
    if (!category) {
      return fail("Not found", 404);
    }
    return ok(category);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}

export async function PUT(request, { params }) {
  const auth = await requireStaffPermission("categories.edit");
  if (!auth.ok) return permissionDeniedResponse(auth);
  if (!isUuid(params.id)) return fail("Not found", 404);

  try {
    const body = await readJsonBody(request);
    if (body.response) return body.response;
    const payload = body.payload;
    const id = await updateCategory(params.id, payload);
    await logAdminActivity({
      actor: auth.user,
      action: "category.updated",
      entityType: "category",
      entityId: id,
      title: `Category "${String(payload?.name || payload?.title || "").slice(0, 80) || "untitled"}" updated`,
    });
    return ok({ id });
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}

export async function DELETE(request, { params }) {
  const auth = await requireStaffPermission("categories.delete");
  if (!auth.ok) return permissionDeniedResponse(auth);
  if (!isUuid(params.id)) return fail("Not found", 404);

  try {
    await deleteCategory(params.id);
    await logAdminActivity({
      actor: auth.user,
      action: "category.deleted",
      entityType: "category",
      entityId: params.id,
      title: "Category deleted",
      severity: "warning",
    });
    return ok({ id: params.id });
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
