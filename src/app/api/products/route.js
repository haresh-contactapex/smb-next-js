import { publicErrorMessage } from "@/lib/publicError";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { listProducts, createProduct, searchProducts, deleteProducts, setProductsStatus } from "@/lib/products";
import { fail, ok, readJsonBody } from "@/lib/api";
import { readBulkIds } from "@/lib/bulkIds";
import { logAdminActivity } from "@/lib/notifications";
import { parseUuidList } from "@/lib/shared/ids";
import { LISTING_STATUSES } from "@/lib/shared/product";

const MAX_BULK_DELETE = 5000;
const MAX_PRODUCT_BODY_BYTES = 5 * 1024 * 1024;

export async function GET(request) {
  const auth = await requireStaffPermission("products.view");
  if (!auth.ok) return permissionDeniedResponse(auth);

  const q = new URL(request.url).searchParams.get("q")?.trim();

  try {
    const data = q ? await searchProducts(q) : await listProducts();
    return ok(data);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}

export async function POST(request) {
  const auth = await requireStaffPermission("products.create");
  if (!auth.ok) return permissionDeniedResponse(auth);

  const body = await readJsonBody(request, { maxBytes: MAX_PRODUCT_BODY_BYTES });
  if (body.response) return body.response;
  const payload = body.payload;

  try {
    const id = await createProduct(payload);
    await logAdminActivity({
      actor: auth.user,
      action: "product.created",
      entityType: "product",
      entityId: id,
      title: `Product "${String(payload?.name || payload?.title || "Untitled").slice(0, 80)}" created`,
      severity: "success",
    });
    return ok({ id }, 201);
  } catch (error) {
    return fail(publicErrorMessage(error), error.status || 500);
  }
}

// Status change for one or many products: body `{ ids: [productId, ...], status: "ACTIVE" | "DRAFT" }`.
export async function PATCH(request) {
  const auth = await requireStaffPermission("products.edit");
  if (!auth.ok) return permissionDeniedResponse(auth);

  const body = await readJsonBody(request);
  if (body.response) return body.response;
  const status = String(body.payload?.status ?? "").toUpperCase();
  if (!LISTING_STATUSES.includes(status)) return fail("Choose Active or Draft.", 400);
  const ids = parseUuidList(body.payload?.ids, { max: MAX_BULK_DELETE });
  if (!ids) return fail("Select at least one product to update.", 400);

  try {
    const result = await setProductsStatus(ids, status);
    if (result.updated > 0) {
      await logAdminActivity({
        actor: auth.user,
        action: "product.status_changed",
        entityType: "product",
        entityId: result.updated === 1 ? result.updatedIds[0] : null,
        title: `${result.updated} product${result.updated === 1 ? "" : "s"} set to ${status === "ACTIVE" ? "Active" : "Draft"}`,
      });
    }
    return ok(result);
  } catch (error) {
    return fail(publicErrorMessage(error), error.status || 500);
  }
}

// Bulk delete: body `{ ids: [productId, ...] }`.
export async function DELETE(request) {
  const auth = await requireStaffPermission("products.delete");
  if (!auth.ok) return permissionDeniedResponse(auth);

  const { ids, error } = await readBulkIds(request, "product", "delete", { max: MAX_BULK_DELETE });
  if (error) return fail(error, 400);

  try {
    const deleted = await deleteProducts(ids);
    await logAdminActivity({
      actor: auth.user,
      action: "product.deleted",
      entityType: "product",
      entityId: null,
      title: `${deleted} product${deleted === 1 ? "" : "s"} deleted`,
      severity: "warning",
    });
    return ok({ deleted });
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
