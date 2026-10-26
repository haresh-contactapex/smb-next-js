import { NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { isUuid } from "@/lib/shared/ids";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { createOrderInvoicePdf } from "@/lib/orderInvoice";

export async function GET(request, { params }) {
  const auth = await requireStaffPermission("orders.view");
  if (!auth.ok) return permissionDeniedResponse(auth);
  if (!isUuid(params.id)) return fail("Not found", 404);

  try {
    const invoice = await createOrderInvoicePdf(params.id);
    if (!invoice) return fail("Order not found.", 404);

    return new NextResponse(invoice.pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Invoice could not be created", error);
    return fail("The invoice couldn't be created. Try again.", 500);
  }
}
