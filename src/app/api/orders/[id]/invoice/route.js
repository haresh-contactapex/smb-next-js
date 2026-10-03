import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { createOrderInvoicePdf } from "@/lib/orderInvoice";

export async function GET(request, { params }) {
  const auth = await requireStaffPermission("orders.view");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const invoice = await createOrderInvoicePdf(params.id);
    if (!invoice) return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });

    return new NextResponse(invoice.pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Invoice could not be created", error);
    return NextResponse.json({ success: false, error: "The invoice couldn't be created. Try again." }, { status: 500 });
  }
}
