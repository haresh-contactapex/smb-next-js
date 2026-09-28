import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { listProducts, createProduct, searchProducts } from "@/lib/products";

export async function GET(request) {
  const auth = await requireStaffPermission("products.view");
  if (!auth.ok) return permissionDeniedResponse(auth);

  const q = new URL(request.url).searchParams.get("q")?.trim();

  try {
    const data = q ? await searchProducts(q) : await listProducts();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = await requireStaffPermission("products.create");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const payload = await request.json();
    const id = await createProduct(payload);
    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status || 500 });
  }
}
