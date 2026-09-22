import { NextResponse } from "next/server";
import { importProductsFromCsv } from "@/lib/productImport";
import { getCurrentStaffUser } from "@/lib/auth/staffSession";

// Windows/Excel-exported CSVs are inconsistently reported — the file
// extension is the reliable signal, MIME is only a secondary check.
const ALLOWED_MIME_TYPES = new Set(["text/csv", "application/vnd.ms-excel", "application/csv", "text/plain"]);
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(request) {
  // Middleware only gates page navigation, not /api — this route must check
  // the staff session itself before touching product data.
  const staffUser = await getCurrentStaffUser();
  if (!staffUser) {
    return NextResponse.json({ success: false, error: "Not signed in." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const hasCsvExtension = (file.name || "").toLowerCase().endsWith(".csv");
    if (!hasCsvExtension && !ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ success: false, error: "Only .csv files are allowed" }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ success: false, error: "File exceeds the 5MB limit" }, { status: 400 });
    }

    const csvText = await file.text();
    const data = await importProductsFromCsv(csvText);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
