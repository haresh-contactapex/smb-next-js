// The order emails, all in the account welcome email's design (logo, orange rule, navy heading,
// orange button, grey note with an orange edge, navy footer), built with tables and inline
// styles so mail clients render them. They share one layout (render()) and differ in their
// copy. Everything that came from a customer or the catalog is escaped. Prices arrive already
// formatted in the store's currency. Every builder returns { subject, html, text }.
//
//   buildOrderConfirmationEmail(data)      customer: the order was placed / paid
//   buildOrderStatusEmail(kind, data)      customer: processing | completed | cancelled | failed
//   buildNewOrderAlertEmail(data)          store: a new order arrived
//   buildRefundRequestAlertEmail(data)     store: a customer cancelled a paid order, refund it by hand
//
// Shared `data`: { storeName, supportEmail, shopUrl, logoSrc, orderNumber, placedAt, total,
//   items: [{ title, quantity, lineTotal, imageUrl }], amounts: { subtotal, discount, couponCode,
//   shipping, tax }, shippingAddress: string[], billingAddress: string[], viewUrl }.
// Customer emails add { firstName, paymentLabel, cod, processingDays, paid }; the store alert adds
// { customer: { name, email, phone }, paymentLabel, cod, adminUrl }; the refund alert adds
// paymentReference (the gateway's payment id, to find the payment there).

// Written for Outlook's Word-based renderer as much as for Gmail: it ignores padding and borders on
// <div>, <p> and <a>, ignores margins on tables, doesn't know border-radius, object-fit, position or
// max-width, and shows images as blocked until the reader allows them. So layout, spacing, the button and
// the note box are all table cells with bgcolor/padding, tables carry cellpadding/cellspacing/border
// attributes, and every picture is an inline attachment (cid:). Rounded corners are a bonus elsewhere.

const NAVY = "#1F3A6B";
const ORANGE = "#EF9822";
// Google Sans, as on the storefront. Mail clients that load web fonts (Apple Mail, iOS Mail)
// show it through the stylesheet link below; Gmail and Outlook ignore web fonts and fall back to Arial.
const FONT = "'Google Sans','Google Sans Text',Arial,Helvetica,sans-serif";
const FONT_CSS = "https://fonts.googleapis.com/css2?family=Google+Sans:wght@400..700&display=swap";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const lines = (list) => list.filter(Boolean).map(escapeHtml).join("<br>");
const itemCount = (items) => items.reduce((sum, item) => sum + item.quantity, 0);

function factCell([label, value], width) {
  return `<td style="padding:12px 14px;width:${width}%;vertical-align:top;"><div style="font-size:11px;color:#8A7A55;margin-bottom:3px;">${escapeHtml(label)}</div><div style="font-size:14px;font-weight:bold;color:${NAVY};">${escapeHtml(value)}</div></td>`;
}

function itemRow(item) {
  const picture = item.imageUrl
    ? `<img src="${escapeHtml(item.imageUrl)}" width="60" height="60" alt="${escapeHtml(item.title)}" border="0" style="display:block;width:60px;height:60px;border:0;background:#F4F4F4;">`
    : `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="60"><tr><td width="60" height="60" bgcolor="#F4F4F4" style="width:60px;height:60px;background:#F4F4F4;font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
  return `<tr>
    <td style="padding:14px 0;width:72px;vertical-align:top;border-top:1px solid #eeeeee;">${picture}</td>
    <td style="padding:14px 8px;vertical-align:top;border-top:1px solid #eeeeee;"><div style="font-size:14px;font-weight:bold;color:#222222;line-height:1.35;">${escapeHtml(item.title)}</div><div style="font-size:12px;color:#777777;margin-top:3px;">Qty ${escapeHtml(item.quantity)}</div></td>
    <td style="padding:14px 0;text-align:right;vertical-align:top;font-size:14px;font-weight:bold;color:#222222;white-space:nowrap;border-top:1px solid #eeeeee;">${escapeHtml(item.lineTotal)}</td>
  </tr>`;
}

function totalRow(label, value, top = 4) {
  return `<tr><td style="padding:${top}px 0 4px;color:#666666;">${escapeHtml(label)}</td><td style="padding:${top}px 0 4px;text-align:right;color:#333333;">${escapeHtml(value)}</td></tr>`;
}

const step = ([lead, text]) =>
  `<p style="margin:0 0 9px;font-size:13px;line-height:1.55;"><b style="color:#222222;">${escapeHtml(lead)}</b> <span style="color:#555555;">${escapeHtml(text)}</span></p>`;

const heading = (text) => `<div style="font-size:14px;font-weight:bold;color:${NAVY};margin:0 0 8px;">${escapeHtml(text)}</div>`;

function itemsSection(data) {
  const { items, amounts, total } = data;
  const count = itemCount(items);
  const totals = [
    totalRow(`Subtotal (${count} item${count === 1 ? "" : "s"})`, amounts.subtotal, 10),
    amounts.discount ? totalRow(amounts.couponCode ? `Discount (${amounts.couponCode})` : "Discount", `-${amounts.discount}`) : "",
    amounts.shipping ? totalRow("Shipping", amounts.shipping) : "",
    amounts.tax ? totalRow("Tax", amounts.tax) : "",
  ].join("");
  return `<tr><td style="padding:26px 32px 0;">
    <div style="font-size:14px;font-weight:bold;color:${NAVY};margin:0 0 12px;">Your items</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">${items.map(itemRow).join("")}</table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;border-top:1px solid #eeeeee;font-size:13px;">
      ${totals}
      <tr><td style="padding:12px 0 14px;font-size:16px;font-weight:bold;color:${NAVY};border-top:1px solid #eeeeee;">Total</td><td style="padding:12px 0 14px;text-align:right;font-size:18px;font-weight:bold;color:${NAVY};border-top:1px solid #eeeeee;">${escapeHtml(total)}</td></tr>
    </table>
  </td></tr>`;
}

const sameAddress = (data) => data.billingAddress.join("|") === data.shippingAddress.join("|");

function addressesSection(data) {
  const block = (title, list) =>
    `<td style="vertical-align:top;padding-right:12px;">${heading(title)}<p style="margin:0;font-size:13px;line-height:1.6;color:#444444;">${lines(list)}</p></td>`;
  const body = sameAddress(data)
    ? `${heading("Shipping and billing address")}<p style="margin:0;font-size:13px;line-height:1.6;color:#444444;">${lines(data.shippingAddress)}</p><p style="margin:8px 0 0;font-size:12px;color:#888888;">The shipping and billing addresses are the same.</p>`
    : `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;"><tr>${block("Shipping address", data.shippingAddress)}${block("Billing address", data.billingAddress)}</tr></table>`;
  return `<tr><td style="padding:8px 32px 0;">${body}</td></tr>`;
}

// spec: { subject, heading, intro, facts: [[label, value]], button: { label, url } | null,
//   detailsHtml, showItems, showAddresses, stepsTitle, steps: [[lead, text]], note: { lead, html } }
function render(data, spec) {
  const { storeName, supportEmail, shopUrl } = data;

  const logo = data.logoSrc
    ? `<img src="${escapeHtml(data.logoSrc)}" width="220" alt="${escapeHtml(storeName)}" style="display:block;width:220px;max-width:100%;height:auto;border:0;">`
    : `<span style="font-size:27px;color:#D9A02E;font-family:Georgia,serif;">shop<i style="font-weight:bold;">my</i>band.com</span>`;

  const width = Math.floor(100 / spec.facts.length);
  const button = spec.button?.url
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${ORANGE}" align="center" style="background:${ORANGE};border-radius:6px;padding:12px 28px;mso-padding-alt:12px 28px;"><a href="${escapeHtml(spec.button.url)}" target="_blank" style="display:inline-block;color:#ffffff;font-weight:bold;font-size:14px;text-decoration:none;"><span style="color:#ffffff;">${escapeHtml(spec.button.label)}</span></a></td></tr></table>`
    : "";
  const contact = supportEmail ? `<a href="mailto:${escapeHtml(supportEmail)}" style="color:#222222;font-weight:bold;">contact us</a>` : "contact us";
  const footerLinks = [
    supportEmail ? `Questions? Reply to this email or write to <a href="mailto:${escapeHtml(supportEmail)}" style="color:#F5C46B;font-weight:bold;">${escapeHtml(supportEmail)}</a>` : "Questions? Just reply to this email.",
    shopUrl ? `<a href="${escapeHtml(shopUrl)}" style="color:#F5C46B;font-weight:bold;">Visit the shop</a>` : "",
  ]
    .filter(Boolean)
    .join("<br>");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${escapeHtml(spec.subject)}</title>
<!--[if mso]><style type="text/css">body, table, td, p, a, h1, div, span, b { font-family: Arial, Helvetica, sans-serif !important; }</style><![endif]-->
<link rel="stylesheet" href="${FONT_CSS}"></head>
<body bgcolor="#f3f3f3" style="margin:0;padding:0;background:#f3f3f3;font-family:${FONT};">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#f3f3f3" style="border-collapse:collapse;background:#f3f3f3;"><tr><td align="center" style="padding:20px 10px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" bgcolor="#ffffff" style="border-collapse:collapse;width:100%;max-width:600px;background:#ffffff;border:1px solid #e6e6e6;font-family:${FONT};color:#333333;">
  <tr><td style="padding:26px 32px 20px;border-bottom:4px solid ${ORANGE};">${logo}</td></tr>
  <tr><td style="padding:30px 32px 6px;">
    <h1 style="margin:0 0 12px;font-size:30px;line-height:1.15;color:${NAVY};font-weight:bold;font-family:${FONT};">${escapeHtml(spec.heading)}</h1>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#444444;">${escapeHtml(spec.intro)}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="padding:0 0 22px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FBF7EF" style="border-collapse:collapse;background:#FBF7EF;border:1px solid #F0E6D2;"><tr>${spec.facts.map((fact) => factCell(fact, width)).join("")}</tr></table></td></tr></table>
    ${spec.detailsHtml ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="padding:0 0 22px 0;">${spec.detailsHtml}</td></tr></table>` : ""}
    ${button}
  </td></tr>
  ${spec.showItems ? itemsSection(data) : ""}
  ${spec.showAddresses ? addressesSection(data) : ""}
  ${spec.steps?.length ? `<tr><td style="padding:26px 32px 0;"><div style="font-size:14px;font-weight:bold;color:${NAVY};margin:0 0 10px;">${escapeHtml(spec.stepsTitle || "What happens next")}</div>${spec.steps.map(step).join("")}</td></tr>` : ""}
  <tr><td style="padding:17px 32px 30px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;"><tr><td width="4" bgcolor="${ORANGE}" style="width:4px;background:${ORANGE};font-size:0;line-height:0;">&nbsp;</td><td bgcolor="#F3F4F6" style="background:#F3F4F6;padding:13px 16px;font-size:13px;color:#444444;line-height:1.5;"><b style="color:#222222;">${escapeHtml(spec.note.lead)}</b> ${spec.note.html.replace("{contact}", contact)}</td></tr></table></td></tr>
  <tr><td bgcolor="#243A66" style="background:#243A66;padding:20px 32px;font-size:12px;line-height:1.6;color:#DCE3F0;"><div style="font-weight:bold;color:#ffffff;margin-bottom:3px;">${escapeHtml(storeName)}</div>${footerLinks}</td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [
    spec.heading,
    "",
    spec.intro,
    "",
    ...spec.facts.map(([label, value]) => `${label}: ${value}`),
    spec.detailsText || "",
    spec.button?.url ? `${spec.button.label}: ${spec.button.url}` : "",
    "",
    ...(spec.showItems
      ? [
          "Your items",
          ...data.items.map((item) => `- ${item.title} x ${item.quantity}: ${item.lineTotal}`),
          "",
          `Subtotal: ${data.amounts.subtotal}`,
          data.amounts.discount ? `Discount${data.amounts.couponCode ? ` (${data.amounts.couponCode})` : ""}: -${data.amounts.discount}` : "",
          data.amounts.shipping ? `Shipping: ${data.amounts.shipping}` : "",
          data.amounts.tax ? `Tax: ${data.amounts.tax}` : "",
          `Total: ${data.total}`,
          "",
        ]
      : []),
    ...(spec.showAddresses
      ? [
          sameAddress(data) ? "Shipping and billing address:" : "Shipping address:",
          ...data.shippingAddress.filter(Boolean),
          ...(sameAddress(data) ? [] : ["", "Billing address:", ...data.billingAddress.filter(Boolean)]),
          "",
        ]
      : []),
    ...(spec.steps?.length ? [spec.stepsTitle || "What happens next", ...spec.steps.map(([lead, body]) => `- ${lead} ${body}`), ""] : []),
    `${spec.note.lead} ${spec.note.html.replace("{contact}", "contact us").replace(/<[^>]+>/g, "")}`,
    "",
    storeName,
    supportEmail ? `Questions? Reply to this email or write to ${supportEmail}` : "",
    shopUrl || "",
  ]
    .filter((line, index, all) => line !== "" || all[index - 1] !== "")
    .join("\n");

  return { subject: spec.subject, html, text };
}

const prepareSteps = (data) =>
  data.processingDays > 0 ? `Your order is packed within ${data.processingDays} business day${data.processingDays === 1 ? "" : "s"}.` : "We start packing your order right away.";

const NOT_YOURS = { lead: "Didn't place this order?", html: "Please {contact} and we'll sort it out." };

export function buildOrderConfirmationEmail(data) {
  const { storeName, firstName, orderNumber, placedAt, paymentLabel, cod, total } = data;
  return render(data, {
    subject: `Your ${storeName} order #${orderNumber} is confirmed`,
    heading: `Thanks for your order, ${firstName}.`,
    intro: cod
      ? "We've received your order. You'll pay in cash when it's delivered, so there's nothing more to do now. We'll email you again when it ships."
      : "We've received your order and your payment went through. We're getting it ready now, and we'll email you again when it ships.",
    facts: [["Order number", `#${orderNumber}`], ["Date placed", placedAt], ["Payment", paymentLabel]],
    button: { label: "View your order", url: data.viewUrl },
    showItems: true,
    showAddresses: true,
    steps: [
      ["We prepare it.", prepareSteps(data)],
      ["We ship it.", "You'll get another email as soon as it's on its way."],
      cod
        ? ["Pay on delivery.", `Please have ${total} ready in cash when your order arrives.`]
        : ["Track it.", data.viewUrl ? "See where your order is, from packed to delivered, in your account." : "Keep this email as your receipt."],
    ],
    note: NOT_YOURS,
  });
}

// kind: "processing" | "completed" | "cancelled" | "failed". For a cancelled order `data.paid` says it had
// been paid for (the store refunds it by hand, see buildRefundRequestAlertEmail) and `data.refunded` that it
// has already been refunded.
export function buildOrderStatusEmail(kind, data) {
  const { storeName, firstName, orderNumber, placedAt, shopUrl } = data;
  const facts = (status) => [["Order number", `#${orderNumber}`], ["Date placed", placedAt], status];
  const specs = {
    processing: {
      subject: `Your ${storeName} order #${orderNumber} is being processed`,
      heading: `We're preparing your order, ${firstName}.`,
      intro: "Your order is now being processed. We'll email you again when it's complete.",
      facts: facts(["Status", "Processing"]),
      button: { label: "View your order", url: data.viewUrl },
      showItems: true,
      showAddresses: true,
      steps: [
        ["We prepare it.", prepareSteps(data)],
        ["We let you know.", "You'll get another email when your order is complete."],
      ],
      note: NOT_YOURS,
    },
    completed: {
      subject: `Your ${storeName} order #${orderNumber} is complete`,
      heading: `Your order is complete, ${firstName}.`,
      intro: `Your order has been completed and is on its way to you. Thank you for shopping with ${storeName}.`,
      facts: facts(["Status", "Completed"]),
      button: { label: "View your order", url: data.viewUrl },
      showItems: true,
      showAddresses: true,
      steps: [
        ["Track it.", data.viewUrl ? "See your order and its details any time in your account." : "Keep this email as your record."],
        ["Need a hand?", "Reply to this email and we'll help."],
      ],
      stepsTitle: "Good to know",
      note: { lead: "Something not right?", html: "Please {contact} and we'll sort it out." },
    },
    cancelled: {
      subject: `Your ${storeName} order #${orderNumber} was cancelled`,
      heading: `Your order was cancelled, ${firstName}.`,
      intro: data.refunded
        ? `Order #${orderNumber} has been cancelled and your payment of ${data.total} has been refunded to your original payment method. It can take 5 to 10 business days to appear on your statement.`
        : data.paid
          ? `Order #${orderNumber} has been cancelled. Since you've already paid for it, we'll refund your payment of ${data.total} to your original payment method and be in touch to confirm.`
          : `Order #${orderNumber} has been cancelled. You haven't been charged for it.`,
      facts: facts(["Status", "Cancelled"]),
      button: { label: "Visit the shop", url: shopUrl },
      showItems: true,
      showAddresses: false,
      steps: null,
      note: { lead: "Didn't ask for this?", html: "Please {contact} and we'll look into it." },
    },
    failed: {
      subject: `Your payment for ${storeName} order #${orderNumber} didn't go through`,
      heading: `Your payment didn't go through, ${firstName}.`,
      intro: `We couldn't take payment for order #${orderNumber}, so it hasn't been placed. You haven't been charged.`,
      facts: facts(["Payment", "Not completed"]),
      button: { label: "Try again", url: shopUrl ? `${shopUrl}/checkout` : null },
      showItems: true,
      showAddresses: false,
      stepsTitle: "What you can do",
      steps: [
        ["Check your card details.", "Make sure the number, expiry date and security code are right."],
        ["Or try another way to pay.", "Use a different card, or pick another payment method at checkout."],
      ],
      note: { lead: "Need help?", html: "Reply to this email or {contact} and we'll look into it." },
    },
  };
  if (!specs[kind]) throw new Error(`Unknown order email: ${kind}`);
  return render(data, specs[kind]);
}

export function buildNewOrderAlertEmail(data) {
  const { orderNumber, placedAt, paymentLabel, cod, total, customer } = data;
  const row = (label, value) =>
    `<tr><td style="padding:3px 16px 3px 0;color:#8A7A55;">${escapeHtml(label)}</td><td style="padding:3px 0;color:#222222;">${value}</td></tr>`;
  const detailsHtml = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-size:13px;">
    ${row("Customer", escapeHtml(customer.name))}
    ${row("Email", `<a href="mailto:${escapeHtml(customer.email)}" style="color:#222222;">${escapeHtml(customer.email)}</a>`)}
    ${customer.phone ? row("Phone", escapeHtml(customer.phone)) : ""}
  </table>`;
  return render(data, {
    subject: `New order #${orderNumber} from ${customer.name}: ${total}`,
    heading: `New order from ${customer.name}.`,
    intro: cod
      ? "A customer placed a cash on delivery order. Payment is due when it's delivered."
      : "A customer paid for a new order by card. It's ready for you to process.",
    facts: [["Order number", `#${orderNumber}`], ["Date placed", placedAt], ["Payment", paymentLabel], ["Total", total]],
    detailsHtml,
    detailsText: `Customer: ${customer.name}\nEmail: ${customer.email}${customer.phone ? `\nPhone: ${customer.phone}` : ""}`,
    button: { label: "View order", url: data.adminUrl },
    showItems: true,
    showAddresses: true,
    stepsTitle: "Next step",
    steps: [["Review and process it.", "Open the order and mark it Processing when you start on it. The customer is emailed at each stage."]],
    note: { lead: "Automatic alert.", html: "You're getting this because new order emails are on in Settings, Email." },
  });
}

// To the store when a customer cancels an order they had paid for. Nothing is refunded by the site:
// the store refunds it through the payment gateway, then marks the order Refunded in the admin.
export function buildRefundRequestAlertEmail(data) {
  const { orderNumber, placedAt, paymentLabel, paymentReference, total, customer } = data;
  const row = (label, value) =>
    `<tr><td style="padding:3px 16px 3px 0;color:#8A7A55;">${escapeHtml(label)}</td><td style="padding:3px 0;color:#222222;">${value}</td></tr>`;
  const detailsHtml = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-size:13px;">
    ${row("Customer", escapeHtml(customer.name))}
    ${row("Email", `<a href="mailto:${escapeHtml(customer.email)}" style="color:#222222;">${escapeHtml(customer.email)}</a>`)}
    ${customer.phone ? row("Phone", escapeHtml(customer.phone)) : ""}
    ${paymentReference ? row("Payment ID", escapeHtml(paymentReference)) : ""}
  </table>`;
  return render(data, {
    subject: `Refund needed: order #${orderNumber} cancelled by ${customer.name} (${total})`,
    heading: `Refund needed for order #${orderNumber}.`,
    intro: `${customer.name} cancelled a paid order from their account. The site has not refunded anything: please refund ${total} through the payment gateway.`,
    facts: [["Order number", `#${orderNumber}`], ["Date placed", placedAt], ["Paid with", paymentLabel], ["Refund", total]],
    detailsHtml,
    detailsText: `Customer: ${customer.name}\nEmail: ${customer.email}${customer.phone ? `\nPhone: ${customer.phone}` : ""}${paymentReference ? `\nPayment ID: ${paymentReference}` : ""}`,
    button: { label: "View order", url: data.adminUrl },
    showItems: true,
    showAddresses: false,
    stepsTitle: "Next steps",
    steps: [
      ["Refund the payment.", "Do it in the payment gateway (for a card payment, the Stripe dashboard), for the full amount."],
      ["Mark it Refunded.", "Open the order and set its payment status to Refunded so your reports are right."],
    ],
    note: { lead: "Automatic alert.", html: "You're getting this because a customer cancelled a paid order. The customer has been told you'll refund their payment." },
  });
}
