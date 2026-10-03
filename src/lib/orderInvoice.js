import { readFile } from "fs/promises";
import path from "path";
import { getOrderInvoice } from "./orders";
import { getGeneralSettings } from "./generalSettings";
import { getStoreSettings } from "./storeSettings";
import { getCurrencyTaxSettings } from "./currencyTaxSettings";
import { buildInvoicePdf } from "./invoicePdf";

// Gathers everything an invoice needs that isn't on the order itself (the store's
// name, address, tax ID and logo) and hands it, with the order, to the PDF builder.

const PUBLIC_DIR = path.join(process.cwd(), "public");
const FALLBACK_LOGO = path.join(PUBLIC_DIR, "storefront", "logo.png");
const LOGO_TIMEOUT_MS = 4000;
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

// The PDF can only embed PNG and JPEG, so anything else (WebP, SVG) is skipped.
function imageKind(bytes) {
  if (bytes.length > 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  return null;
}

async function readLogoBytes(logoUrl) {
  if (/^https?:\/\//i.test(logoUrl)) {
    const res = await fetch(logoUrl, { signal: AbortSignal.timeout(LOGO_TIMEOUT_MS) });
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    return bytes.length <= MAX_LOGO_BYTES ? bytes : null;
  }
  if (logoUrl.startsWith("/")) {
    // A file the store uploaded to this site; never read outside public/.
    const file = path.join(PUBLIC_DIR, path.normalize(logoUrl));
    if (!file.startsWith(PUBLIC_DIR + path.sep)) return null;
    return new Uint8Array(await readFile(file));
  }
  return null;
}

// The store's own logo from Settings -> General, or the one bundled with the site
// when that is missing or can't be fetched. null (the PDF then prints the store name).
async function loadLogo(logoUrl) {
  const attempts = [() => (logoUrl ? readLogoBytes(logoUrl) : null), async () => new Uint8Array(await readFile(FALLBACK_LOGO))];
  for (const attempt of attempts) {
    try {
      const bytes = await attempt();
      const kind = bytes && imageKind(bytes);
      if (kind) return { bytes, kind };
    } catch {
      // Unreachable or unreadable: try the next source.
    }
  }
  return null;
}

// Settings pages can be missing on a fresh database; an invoice should still come out.
async function readOrNull(run) {
  try {
    return await run();
  } catch {
    return null;
  }
}

export async function createOrderInvoicePdf(orderId) {
  const invoice = await getOrderInvoice(orderId);
  if (!invoice) return null;

  const [general, store, tax] = await Promise.all([
    readOrNull(getGeneralSettings),
    readOrNull(getStoreSettings),
    readOrNull(getCurrencyTaxSettings),
  ]);

  const cityLine = [general?.city, [general?.state, general?.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const pdf = await buildInvoicePdf({
    ...invoice,
    store: {
      name: general?.storeName || "Shop My Band",
      legalName: store?.legalBusinessName || "",
      addressLines: [general?.address, cityLine, general?.country].filter(Boolean),
      email: general?.storeEmail || "",
      phone: general?.phone || "",
      taxId: store?.taxId || tax?.taxRegistrationNumber || "",
      supportEmail: store?.supportEmail || "",
      supportPhone: store?.supportPhone || "",
      url: store?.storeUrl || "",
    },
    logo: await loadLogo(general?.logoUrl),
  });

  return { pdf, filename: `invoice-${invoice.orderNumber.replace(/[^A-Za-z0-9._-]/g, "")}.pdf` };
}
