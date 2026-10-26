import { isUuid } from "@/lib/shared/ids";
import { publicErrorMessage } from "@/lib/publicError";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { getProductById, updateProduct, deleteProduct } from "@/lib/products";
import { fail, ok, readJsonBody } from "@/lib/api";
import { logAdminActivity } from "@/lib/notifications";

const MAX_PRODUCT_BODY_BYTES = 5 * 1024 * 1024;

export async function GET(request, { params }) {
  const auth = await requireStaffPermission(["products.view", "products.edit"]);
  if (!auth.ok) return permissionDeniedResponse(auth);
  if (!isUuid(params.id)) return fail("Not found", 404);

  try {
    const product = await getProductById(params.id);
    if (!product) {
      return fail("Not found", 404);
    }
    return ok(product);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}

export async function PUT(request, { params }) {
  const auth = await requireStaffPermission("products.edit");
  if (!auth.ok) return permissionDeniedResponse(auth);
  if (!isUuid(params.id)) return fail("Not found", 404);

  const body = await readJsonBody(request, { maxBytes: MAX_PRODUCT_BODY_BYTES });
  if (body.response) return body.response;
  const payload = body.payload;

  try {
    const id = await updateProduct(params.id, payload);
    await logAdminActivity({
      actor: auth.user,
      action: "product.updated",
      entityType: "product",
      entityId: id,
      title: `Product "${String(payload?.name || payload?.title || params.id).slice(0, 80)}" updated`,
    });
    return ok({ id });
  } catch (error) {
    return fail(publicErrorMessage(error), error.status || 500);
  }
}

export async function DELETE(request, { params }) {
  const auth = await requireStaffPermission("products.delete");
  if (!auth.ok) return permissionDeniedResponse(auth);
  if (!isUuid(params.id)) return fail("Not found", 404);

  try {
    await deleteProduct(params.id);
    await logAdminActivity({
      actor: auth.user,
      action: "product.deleted",
      entityType: "product",
      entityId: params.id,
      title: "Product deleted",
      severity: "warning",
    });
    return ok({ id: params.id });
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
