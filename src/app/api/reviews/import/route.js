import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { roleHasPermission } from "@/lib/permissions";
import { importReviews } from "@/lib/reviewImport";
import { FILE_TOO_LARGE_MESSAGE, MAX_IMPORT_FILE_BYTES, ReviewImportError } from "@/lib/reviewImportFile";
import { logAdminActivity } from "@/lib/notifications";

// Multipart body: file (.docx/.doc), productId, status?, dryRun?, confirmMismatch?
//
// Anything but an explicit dryRun=false is a preview that writes nothing, so a
// malformed or replayed request can never import by accident.

// Multipart framing adds a little to the file itself.
const MAX_BODY_BYTES = MAX_IMPORT_FILE_BYTES + 512 * 1024;

function errorResponse(error) {
  if (error instanceof ReviewImportError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  console.error("Review import failed", error);
  return NextResponse.json(
    { success: false, error: "Something went wrong while importing the reviews. Try again." },
    { status: 500 }
  );
}

export async function POST(request) {
  const auth = await requireStaffPermission("reviews.import");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    // Refuse oversized uploads before buffering them (when the size is declared).
    const declaredLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
      throw new ReviewImportError(FILE_TOO_LARGE_MESSAGE, 413);
    }

    let form;
    try {
      form = await request.formData();
    } catch {
      throw new ReviewImportError("The upload couldn't be read. Send the file as multipart form data.");
    }

    const file = form.get("file");
    if (!file || typeof file === "string") throw new ReviewImportError("Choose a Word file to upload.");
    if (file.size > MAX_IMPORT_FILE_BYTES) throw new ReviewImportError(FILE_TOO_LARGE_MESSAGE, 413);

    const dryRun = form.get("dryRun") !== "false";
    const data = await importReviews({
      bytes: new Uint8Array(await file.arrayBuffer()),
      fileName: file.name,
      productId: String(form.get("productId") ?? ""),
      status: form.get("status"),
      canApprove: roleHasPermission(auth.role, "reviews.approve"),
      dryRun,
      confirmMismatch: form.get("confirmMismatch") === "true",
    });

    if (!dryRun) {
      await logAdminActivity({
        actor: auth.user,
        action: "review.imported",
        entityType: "review",
        entityId: data.product.id,
        title: `${data.imported} review${data.imported === 1 ? "" : "s"} imported for "${data.product.title.slice(0, 80)}"`,
        description: `File: ${data.fileName.slice(0, 80)}.`,
        severity: "success",
        metadata: { imported: data.imported, skipped: data.counts.total - data.imported, status: data.status },
      });
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return errorResponse(error);
  }
}
