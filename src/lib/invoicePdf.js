import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { formatAmount, formatCurrency } from "./currency";

// Lays an order out as a tax invoice PDF: angled title band, bill-to / ship-to /
// invoice details / store details across the top, an items table, the totals, and
// a payment / contact footer. Pure: it takes plain data and returns the PDF bytes,
// so everything that touches the database or the network lives in orderInvoice.js.
//
// Colors are the site's own: the navy `primary` and gold `accent` from
// tailwind.config.js, which are also the two colors of the store logo.

const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 40;
const RIGHT = PAGE.width - MARGIN;
const CONTENT_WIDTH = PAGE.width - MARGIN * 2;

const hex = (value) => rgb(...[1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16) / 255));
const COLORS = {
  navy: hex("#1c3b6a"),
  gold: hex("#d19d22"),
  goldSoft: hex("#faedc9"),
  ink: hex("#1f2937"),
  muted: hex("#6b7280"),
  line: hex("#e5e7eb"),
  red: hex("#dc2626"),
  white: rgb(1, 1, 1),
};

const PROVIDER_LABELS = { stripe: "Card (Stripe)", paypal: "PayPal", razorpay: "Razorpay", cod: "Cash on delivery" };

// Where the items table may run to before it needs a new page, and where the
// totals may run to before they do (the footer starts at FOOTER_TOP).
const TABLE_LIMIT = 655;
const TOTALS_LIMIT = 690;
const FOOTER_TOP = 708;

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// Breaks `text` into lines no wider than `maxWidth`, splitting a word that is too long on its own.
function wrap(text, font, size, maxWidth) {
  const lines = [];
  let line = "";
  for (const word of String(text).split(" ")) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    let rest = word;
    while (font.widthOfTextAtSize(rest, size) > maxWidth && rest.length > 1) {
      let cut = rest.length - 1;
      while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > maxWidth) cut -= 1;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    line = rest;
  }
  lines.push(line);
  return lines;
}

export async function buildInvoicePdf(invoice) {
  const { store, amounts, currency } = invoice;
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // The standard fonts only draw Latin-1-ish text. Accents are stripped and anything
  // else becomes "?", so a name in another script can't make the whole PDF fail.
  const supported = new Set(regular.getCharacterSet());
  const canDraw = (text) => [...text].every((ch) => supported.has(ch.codePointAt(0)));
  const clean = (value) => {
    let out = "";
    for (const ch of String(value ?? "").replace(/\s+/g, " ").trim()) {
      if (supported.has(ch.codePointAt(0))) {
        out += ch;
        continue;
      }
      const base = ch.normalize("NFD").replace(/\p{M}/gu, "");
      out += base && canDraw(base) ? base : "?";
    }
    return out;
  };

  // "$1,234.56" when the symbol can be drawn, otherwise "INR 1,234.56" (₹ and friends aren't in the font).
  const money = (amount) => {
    const formatted = formatCurrency(amount, currency, invoice.moneyFormat);
    return canDraw(formatted) ? formatted : `${currency} ${formatAmount(amount, currency, invoice.moneyFormat)}`;
  };

  let logoImage = null;
  if (invoice.logo) {
    try {
      logoImage = invoice.logo.kind === "png" ? await pdf.embedPng(invoice.logo.bytes) : await pdf.embedJpg(invoice.logo.bytes);
    } catch {
      logoImage = null;
    }
  }

  let page;
  const pages = [];
  const H = PAGE.height;

  // All positions below are measured from the top of the page, like on screen.
  const rect = (x, top, width, height, fill) =>
    page.drawRectangle({ x, y: H - top - height, width, height, color: fill });
  const polygon = (points, fill) =>
    page.drawSvgPath(`M ${points.map(([x, y]) => `${x} ${y}`).join(" L ")} Z`, { x: 0, y: H, color: fill, borderWidth: 0 });

  const text = (value, x, top, { size = 9, font = regular, color = COLORS.ink, align = "left" } = {}) => {
    const str = clean(value);
    const width = font.widthOfTextAtSize(str, size);
    const drawX = align === "right" ? x - width : align === "center" ? x - width / 2 : x;
    page.drawText(str, { x: drawX, y: H - top - size * 0.8, size, font, color });
    return width;
  };

  // Wrapped text; returns the top of the line after the last one.
  const paragraph = (value, x, top, { size = 8.5, font = regular, color = COLORS.ink, width = 120, leading = size * 1.45 } = {}) => {
    let cursor = top;
    for (const line of wrap(clean(value), font, size, width)) {
      text(line, x, cursor, { size, font, color });
      cursor += leading;
    }
    return cursor;
  };

  const heading = (label, x, top) => {
    text(label, x, top, { size: 7.5, font: bold, color: COLORS.navy });
    rect(x, top + 11, 16, 1.5, COLORS.gold);
    return top + 18;
  };

  function decorate(first) {
    if (logoImage) {
      // Faint watermark of the logo, behind everything else.
      const width = 380;
      const height = (logoImage.height / logoImage.width) * width;
      const angle = (35 * Math.PI) / 180;
      const [cx, cy] = [PAGE.width / 2, H / 2 - 30];
      const dx = (width / 2) * Math.cos(angle) - (height / 2) * Math.sin(angle);
      const dy = (width / 2) * Math.sin(angle) + (height / 2) * Math.cos(angle);
      page.drawImage(logoImage, { x: cx - dx, y: cy - dy, width, height, opacity: 0.05, rotate: degrees(35) });
    }

    if (first) {
      polygon([[318, 12], [PAGE.width, 12], [PAGE.width, 18], [315, 18]], COLORS.gold);
      polygon([[300, 22], [PAGE.width, 22], [PAGE.width, 54], [284, 54]], COLORS.navy);
      polygon([[262, 58], [520, 58], [520, 64], [259, 64]], COLORS.gold);
      text(amounts.taxMode === "unknown" ? "INVOICE" : "TAX INVOICE", RIGHT, 31, { size: 15, font: bold, color: COLORS.white, align: "right" });
    } else {
      polygon([[300, 0], [PAGE.width, 0], [PAGE.width, 10], [296, 10]], COLORS.navy);
    }

    rect(0, 826, PAGE.width, 16, COLORS.navy);
    polygon([[0, 826], [150, 826], [130, H], [0, H]], COLORS.gold);
  }

  function addPage(first = false) {
    page = pdf.addPage([PAGE.width, PAGE.height]);
    pages.push(page);
    decorate(first);
  }

  addPage(true);

  // --- Logo (or the store name when there is none) -----------------------------
  if (logoImage) {
    const scale = Math.min(190 / logoImage.width, 46 / logoImage.height);
    page.drawImage(logoImage, {
      x: MARGIN,
      y: H - 26 - logoImage.height * scale,
      width: logoImage.width * scale,
      height: logoImage.height * scale,
    });
  } else {
    text(store.name, MARGIN, 34, { size: 18, font: bold, color: COLORS.navy });
  }

  // --- Bill to / Ship to / invoice details / store details ----------------------
  const addressLines = (address) =>
    address
      ? [
          address.fullName,
          address.company,
          address.line1,
          address.line2,
          [address.city, [address.state, address.zip].filter(Boolean).join(" ")].filter(Boolean).join(", "),
          address.country,
          address.phone,
        ].filter(Boolean)
      : [];

  const infoTop = 96;
  const lineList = (lines, x, top, width, { first = bold } = {}) => {
    let cursor = top;
    lines.forEach((line, index) => {
      cursor = paragraph(line, x, cursor, { width, font: index === 0 ? first : regular, size: 8.5 });
    });
    return cursor;
  };

  const billing = addressLines(invoice.billingAddress);
  let billEnd = heading("BILL TO", MARGIN, infoTop);
  billEnd = lineList(billing.length ? billing : [invoice.customer.name], MARGIN, billEnd, 128);
  if (invoice.customer.email) billEnd = paragraph(invoice.customer.email, MARGIN, billEnd + 2, { width: 128, color: COLORS.muted });
  if (!invoice.customer.email && invoice.customer.phone && !billing.length) {
    billEnd = paragraph(invoice.customer.phone, MARGIN, billEnd + 2, { width: 128, color: COLORS.muted });
  }

  const shipping = addressLines(invoice.shippingAddress);
  let shipEnd = heading("SHIP TO", 178, infoTop);
  shipEnd = shipping.length
    ? lineList(shipping, 178, shipEnd, 128)
    : paragraph("No shipping address was recorded for this order.", 178, shipEnd, { width: 120, color: COLORS.muted });

  const payment = invoice.payments.find((p) => p.status === "succeeded") || invoice.payments[invoice.payments.length - 1];
  const detailsX = 316;
  const detail = (label, value, top) => {
    text(label, detailsX, top, { size: 7.5, font: bold, color: COLORS.navy });
    return paragraph(value, detailsX, top + 10, { size: 9, width: 118 }) + 5;
  };
  let detailsEnd = infoTop;
  detailsEnd = detail("Invoice Date", formatDate(invoice.placedAt), detailsEnd);
  detailsEnd = detail("Invoice Number", invoice.orderNumber, detailsEnd);
  detailsEnd = detail("Payment Status", invoice.paymentStatus, detailsEnd);
  if (payment) detailsEnd = detail("Payment Method", PROVIDER_LABELS[payment.provider] || payment.provider, detailsEnd);

  const storeX = 444;
  const storeLines = [
    store.legalName || store.name,
    ...store.addressLines,
    store.taxId ? `Tax ID: ${store.taxId}` : "",
    store.phone,
    store.email,
  ].filter(Boolean);
  const storeEnd = lineList(storeLines, storeX, infoTop, PAGE.width - MARGIN - storeX);

  // --- Order line -----------------------------------------------------------------
  const itemCount = invoice.items.reduce((sum, item) => sum + item.quantity, 0);
  let cursor = Math.max(billEnd, shipEnd, detailsEnd, storeEnd) + 14;
  rect(MARGIN, cursor, CONTENT_WIDTH, 0.75, COLORS.line);
  cursor += 10;
  text(`Order ${invoice.orderNumber}`, MARGIN, cursor, { size: 10, font: bold, color: COLORS.navy });
  text(
    `Placed ${formatDate(invoice.placedAt)}${itemCount ? ` · ${itemCount} item${itemCount === 1 ? "" : "s"}` : ""}`,
    RIGHT,
    cursor + 1,
    { size: 8.5, color: COLORS.muted, align: "right" }
  );
  cursor += 24;

  // --- Items table ----------------------------------------------------------------
  const COL = { item: MARGIN + 10, itemWidth: 235, qty: 372, rate: 462, amount: RIGHT - 10 };

  function tableHeader(top) {
    rect(MARGIN, top, CONTENT_WIDTH, 22, COLORS.navy);
    rect(MARGIN, top + 22, CONTENT_WIDTH, 2, COLORS.gold);
    const style = { size: 8.5, font: bold, color: COLORS.white };
    text("Item", COL.item, top + 7, style);
    text("Quantity", COL.qty, top + 7, { ...style, align: "right" });
    text("Rate", COL.rate, top + 7, { ...style, align: "right" });
    text("Amount", COL.amount, top + 7, { ...style, align: "right" });
    return top + 24;
  }

  cursor = tableHeader(cursor);

  if (invoice.items.length === 0) {
    paragraph("No line items were recorded for this order.", COL.item, cursor + 10, { color: COLORS.muted, width: 300 });
    cursor += 34;
  }

  for (const item of invoice.items) {
    const titleLines = wrap(clean(item.title), regular, 9, COL.itemWidth);
    const sku = item.sku ? `SKU ${clean(item.sku)}` : "";
    const rowHeight = 8 + titleLines.length * 11.5 + (sku ? 10 : 0) + 8;

    if (cursor + rowHeight > TABLE_LIMIT) {
      addPage();
      cursor = tableHeader(70);
    }

    let lineTop = cursor + 8;
    for (const line of titleLines) {
      text(line, COL.item, lineTop, { size: 9 });
      lineTop += 11.5;
    }
    if (sku) text(sku, COL.item, lineTop, { size: 7.5, color: COLORS.muted });

    text(String(item.quantity), COL.qty, cursor + 8, { size: 9, align: "right" });
    text(money(item.unitPrice), COL.rate, cursor + 8, { size: 9, align: "right" });
    text(money(item.lineTotal), COL.amount, cursor + 8, { size: 9, font: bold, align: "right" });

    cursor += rowHeight;
    rect(MARGIN, cursor, CONTENT_WIDTH, 0.5, COLORS.line);
  }

  // --- Totals ---------------------------------------------------------------------
  const paid = invoice.paymentStatus === "Paid";
  const refunded = invoice.paymentStatus === "Refunded";
  const rows = [];
  if (amounts.subtotal !== null) rows.push(["Subtotal", money(amounts.subtotal)]);
  if (amounts.discount) rows.push([amounts.couponCode ? `Discount (${amounts.couponCode})` : "Discount", `-${money(amounts.discount)}`]);
  if (amounts.shipping !== null) rows.push(["Shipping", amounts.shipping === 0 ? "Free" : money(amounts.shipping)]);
  if (amounts.taxMode === "added") rows.push([amounts.taxRate ? `Tax (${amounts.taxRate}%)` : "Tax", money(amounts.tax)]);
  if (amounts.taxMode === "included") rows.push(["Tax", "Included in prices"]);

  const totalsHeight = rows.length * 17 + 100;
  if (cursor + totalsHeight > TOTALS_LIMIT) {
    addPage();
    cursor = 70;
  }

  const labelX = 336;
  cursor += 14;
  for (const [label, value] of rows) {
    text(label, labelX, cursor, { size: 9, color: COLORS.muted });
    text(value, RIGHT - 10, cursor, { size: 9, align: "right" });
    cursor += 17;
  }
  rect(labelX, cursor - 3, RIGHT - labelX, 0.75, COLORS.line);
  cursor += 6;
  text("Invoice Total", labelX, cursor, { size: 9.5, font: bold });
  text(money(amounts.total), RIGHT - 10, cursor, { size: 9.5, font: bold, align: "right" });
  cursor += 19;
  text(refunded ? "Amount Refunded" : "Amount Paid", labelX, cursor, { size: 9, color: COLORS.muted });
  text(money(paid || refunded ? amounts.total : 0), RIGHT - 10, cursor, { size: 9, align: "right" });
  cursor += 22;

  const due = paid || refunded ? 0 : amounts.total;
  rect(labelX - 8, cursor - 6, RIGHT - labelX + 8, 24, COLORS.goldSoft);
  rect(labelX - 8, cursor - 6, 3, 24, COLORS.gold);
  text("Amount Due", labelX, cursor, { size: 11, font: bold, color: COLORS.navy });
  text(money(due), RIGHT - 10, cursor, { size: 11, font: bold, color: COLORS.navy, align: "right" });

  // --- Footer: notes / payment / questions ----------------------------------------
  rect(MARGIN, FOOTER_TOP - 10, CONTENT_WIDTH, 0.75, COLORS.line);

  let notesEnd = heading("NOTES", MARGIN, FOOTER_TOP);
  notesEnd = paragraph("Thank you for your order!", MARGIN, notesEnd, { width: 170, font: bold, size: 9 });
  if (invoice.status === "Cancelled") notesEnd = paragraph("This order has been cancelled.", MARGIN, notesEnd, { width: 170, color: COLORS.red });
  if (refunded) paragraph("This order has been refunded.", MARGIN, notesEnd, { width: 170, color: COLORS.muted });

  let payEnd = heading("PAYMENT", 235, FOOTER_TOP);
  if (payment) {
    payEnd = paragraph(`${PROVIDER_LABELS[payment.provider] || payment.provider} · ${payment.status}`, 235, payEnd, { width: 160 });
    if (payment.reference) paragraph(`Ref: ${payment.reference}`, 235, payEnd, { width: 160, size: 7.5, color: COLORS.muted });
  } else {
    paragraph("No payment recorded.", 235, payEnd, { width: 160, color: COLORS.muted });
  }

  let helpEnd = heading("QUESTIONS?", 420, FOOTER_TOP);
  for (const line of [store.supportEmail || store.email, store.supportPhone || store.phone, store.url].filter(Boolean)) {
    helpEnd = paragraph(line, 420, helpEnd, { width: RIGHT - 420 });
  }

  // --- Page numbers -----------------------------------------------------------------
  if (pages.length > 1) {
    pages.forEach((p, index) => {
      page = p;
      text(`Page ${index + 1} of ${pages.length}`, PAGE.width / 2, 808, { size: 8, color: COLORS.muted, align: "center" });
    });
  }

  pdf.setTitle(clean(`Invoice ${invoice.orderNumber}`));
  pdf.setAuthor(clean(store.name));
  pdf.setCreator(clean(store.name));
  pdf.setProducer("Shop My Band Admin");
  return pdf.save();
}
