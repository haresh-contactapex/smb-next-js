// The order confirmation email: same look as the account welcome email (logo, orange
// rule, navy heading, orange button, grey "didn't place this" note, navy footer), built
// with tables and inline styles so mail clients render it. Everything that came from a
// customer or the catalog is escaped. Prices arrive already formatted in the store's
// currency. Returns { subject, html, text }.

const NAVY = "#1F3A6B";
const ORANGE = "#EF9822";
const FONT = "Arial,Helvetica,sans-serif";
const HEADING_FONT = "'Franklin Gothic Medium','Arial Narrow',Arial,sans-serif";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const lines = (list) => list.filter(Boolean).map(escapeHtml).join("<br>");

function factCell(label, value, width) {
  return `<td style="padding:12px 14px;width:${width}%;vertical-align:top;"><div style="font-size:11px;color:#8A7A55;margin-bottom:3px;">${escapeHtml(label)}</div><div style="font-size:14px;font-weight:bold;color:${NAVY};">${escapeHtml(value)}</div></td>`;
}

function itemRow(item) {
  const picture = item.imageUrl
    ? `<img src="${escapeHtml(item.imageUrl)}" width="60" height="60" alt="" style="display:block;width:60px;height:60px;object-fit:cover;border-radius:6px;background:#F4F4F4;">`
    : `<div style="width:60px;height:60px;background:#F4F4F4;border-radius:6px;"><div style="width:28px;height:28px;margin:0 auto;position:relative;top:14px;border:5px solid #C9C9C9;border-radius:50%;"></div></div>`;
  return `<tr>
    <td style="padding:14px 0;width:72px;vertical-align:top;border-top:1px solid #eeeeee;">${picture}</td>
    <td style="padding:14px 8px;vertical-align:top;border-top:1px solid #eeeeee;"><div style="font-size:14px;font-weight:bold;color:#222222;line-height:1.35;">${escapeHtml(item.title)}</div><div style="font-size:12px;color:#777777;margin-top:3px;">Qty ${escapeHtml(item.quantity)}</div></td>
    <td style="padding:14px 0;text-align:right;vertical-align:top;font-size:14px;font-weight:bold;color:#222222;white-space:nowrap;border-top:1px solid #eeeeee;">${escapeHtml(item.lineTotal)}</td>
  </tr>`;
}

function totalRow(label, value, { top = 4 } = {}) {
  return `<tr><td style="padding:${top}px 0 4px;color:#666666;">${escapeHtml(label)}</td><td style="padding:${top}px 0 4px;text-align:right;color:#333333;">${escapeHtml(value)}</td></tr>`;
}

function step(lead, text) {
  return `<p style="margin:0 0 9px;font-size:13px;line-height:1.55;"><b style="color:#222222;">${escapeHtml(lead)}</b> <span style="color:#555555;">${escapeHtml(text)}</span></p>`;
}

// data: { storeName, supportEmail, shopUrl, firstName, orderNumber, placedAt, paymentLabel, cod,
//         total, items: [{ title, quantity, lineTotal, imageUrl }], amounts: { subtotal, discount,
//         couponCode, shipping, tax }, shippingAddress: string[], billingAddress: string[],
//         viewUrl, processingDays }
export function buildOrderConfirmationEmail(data) {
  const { storeName, supportEmail, shopUrl, firstName, orderNumber, placedAt, paymentLabel, cod, total, items, amounts } = data;
  const sameAddress = data.billingAddress.join("|") === data.shippingAddress.join("|");

  const intro = cod
    ? "We've received your order. You'll pay in cash when it's delivered, so there's nothing more to do now. We'll email you again when it ships."
    : "We've received your order and your payment went through. We're getting it ready now, and we'll email you again when it ships.";

  const nextSteps = [
    step("We prepare it.", data.processingDays > 0 ? `Your order is packed within ${data.processingDays} business day${data.processingDays === 1 ? "" : "s"}.` : "We start packing your order right away."),
    step("We ship it.", "You'll get another email as soon as it's on its way."),
    cod
      ? step("Pay on delivery.", `Please have ${total} ready in cash when your order arrives.`)
      : step("Track it.", data.viewUrl ? "See where your order is, from packed to delivered, in your account." : "Keep this email as your receipt."),
  ].join("");

  const totals = [
    totalRow(`Subtotal (${items.reduce((sum, item) => sum + item.quantity, 0)} item${items.reduce((sum, item) => sum + item.quantity, 0) === 1 ? "" : "s"})`, amounts.subtotal, { top: 10 }),
    amounts.discount ? totalRow(amounts.couponCode ? `Discount (${amounts.couponCode})` : "Discount", `-${amounts.discount}`) : "",
    amounts.shipping ? totalRow("Shipping", amounts.shipping) : "",
    amounts.tax ? totalRow("Tax", amounts.tax) : "",
  ].join("");

  const addressBlock = (title, list) =>
    `<td style="vertical-align:top;padding-right:12px;"><div style="font-size:14px;font-weight:bold;color:${NAVY};margin:0 0 8px;">${escapeHtml(title)}</div><p style="margin:0;font-size:13px;line-height:1.6;color:#444444;">${lines(list)}</p></td>`;
  const addresses = sameAddress
    ? `<div style="font-size:14px;font-weight:bold;color:${NAVY};margin:0 0 8px;">Shipping and billing address</div><p style="margin:0;font-size:13px;line-height:1.6;color:#444444;">${lines(data.shippingAddress)}</p><p style="margin:8px 0 0;font-size:12px;color:#888888;">Your shipping and billing addresses are the same.</p>`
    : `<table role="presentation" width="100%" style="border-collapse:collapse;"><tr>${addressBlock("Shipping address", data.shippingAddress)}${addressBlock("Billing address", data.billingAddress)}</tr></table>`;

  const button = data.viewUrl
    ? `<a href="${escapeHtml(data.viewUrl)}" style="display:inline-block;background:${ORANGE};color:#ffffff;font-weight:bold;font-size:14px;text-decoration:none;padding:12px 28px;border-radius:6px;">View your order</a>`
    : "";

  const footerLinks = [
    supportEmail ? `Questions? Reply to this email or write to <a href="mailto:${escapeHtml(supportEmail)}" style="color:#F5C46B;font-weight:bold;">${escapeHtml(supportEmail)}</a>` : "Questions? Just reply to this email.",
    shopUrl ? `<a href="${escapeHtml(shopUrl)}" style="color:#F5C46B;font-weight:bold;">Visit the shop</a>` : "",
  ]
    .filter(Boolean)
    .join("<br>");

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f3f3f3;">
<table role="presentation" width="100%" style="border-collapse:collapse;background:#f3f3f3;"><tr><td align="center" style="padding:20px 10px;">
<table role="presentation" width="600" style="border-collapse:collapse;width:100%;max-width:600px;background:#ffffff;border:1px solid #e6e6e6;font-family:${FONT};color:#333333;">
  <tr><td style="padding:26px 32px 20px;border-bottom:4px solid ${ORANGE};"><span style="font-size:27px;color:#D9A02E;font-family:Georgia,serif;">shop<i style="font-weight:bold;">my</i>band.com</span></td></tr>
  <tr><td style="padding:30px 32px 6px;">
    <h1 style="margin:0 0 12px;font-size:30px;line-height:1.15;color:${NAVY};font-weight:bold;font-family:${HEADING_FONT};">Thanks for your order, ${escapeHtml(firstName)}.</h1>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#444444;">${escapeHtml(intro)}</p>
    <table role="presentation" width="100%" style="border-collapse:collapse;background:#FBF7EF;border:1px solid #F0E6D2;margin:0 0 22px;"><tr>
      ${factCell("Order number", `#${orderNumber}`, 34)}${factCell("Date placed", placedAt, 33)}${factCell("Payment", paymentLabel, 33)}
    </tr></table>
    ${button}
  </td></tr>
  <tr><td style="padding:26px 32px 0;">
    <div style="font-size:14px;font-weight:bold;color:${NAVY};margin:0 0 12px;">Your items</div>
    <table role="presentation" width="100%" style="border-collapse:collapse;">${items.map(itemRow).join("")}</table>
    <table role="presentation" width="100%" style="border-collapse:collapse;border-top:1px solid #eeeeee;font-size:13px;">
      ${totals}
      <tr><td style="padding:12px 0 14px;font-size:16px;font-weight:bold;color:${NAVY};border-top:1px solid #eeeeee;">Total</td><td style="padding:12px 0 14px;text-align:right;font-size:18px;font-weight:bold;color:${NAVY};border-top:1px solid #eeeeee;">${escapeHtml(total)}</td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:8px 32px 0;">${addresses}</td></tr>
  <tr><td style="padding:26px 32px 0;"><div style="font-size:14px;font-weight:bold;color:${NAVY};margin:0 0 10px;">What happens next</div>${nextSteps}</td></tr>
  <tr><td style="padding:17px 32px 30px;"><div style="padding:13px 16px;background:#F3F4F6;border-left:4px solid ${ORANGE};font-size:13px;color:#444444;line-height:1.5;"><b style="color:#222222;">Didn't place this order?</b> Please ${supportEmail ? `<a href="mailto:${escapeHtml(supportEmail)}" style="color:#222222;font-weight:bold;">contact us</a>` : "contact us"} and we'll sort it out.</div></td></tr>
  <tr><td style="background:#243A66;padding:20px 32px;font-size:12px;line-height:1.6;color:#DCE3F0;"><div style="font-weight:bold;color:#ffffff;margin-bottom:3px;">${escapeHtml(storeName)}</div>${footerLinks}</td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [
    `Thanks for your order, ${firstName}.`,
    "",
    intro,
    "",
    `Order number: #${orderNumber}`,
    `Date placed: ${placedAt}`,
    `Payment: ${paymentLabel}`,
    data.viewUrl ? `View your order: ${data.viewUrl}` : "",
    "",
    "Your items",
    ...items.map((item) => `- ${item.title} x ${item.quantity}: ${item.lineTotal}`),
    "",
    `Subtotal: ${amounts.subtotal}`,
    amounts.discount ? `Discount${amounts.couponCode ? ` (${amounts.couponCode})` : ""}: -${amounts.discount}` : "",
    amounts.shipping ? `Shipping: ${amounts.shipping}` : "",
    amounts.tax ? `Tax: ${amounts.tax}` : "",
    `Total: ${total}`,
    "",
    sameAddress ? "Shipping and billing address:" : "Shipping address:",
    ...data.shippingAddress.filter(Boolean),
    ...(sameAddress ? [] : ["", "Billing address:", ...data.billingAddress.filter(Boolean)]),
    "",
    cod ? `Please have ${total} ready in cash when your order arrives.` : "",
    "Didn't place this order? Please contact us and we'll sort it out.",
    "",
    storeName,
    supportEmail ? `Questions? Reply to this email or write to ${supportEmail}` : "",
    shopUrl || "",
  ]
    .filter((line, index, all) => line !== "" || all[index - 1] !== "")
    .join("\n");

  return { subject: `Your ${storeName} order #${orderNumber} is confirmed`, html, text };
}
