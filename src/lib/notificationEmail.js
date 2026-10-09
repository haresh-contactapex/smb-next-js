// The account and enquiry emails, in the same design as the order emails (they share render() from
// orderEmail.js: logo, orange rule, navy heading, orange button, grey note, navy footer). Each
// builder returns { subject, html, text }. Everything that came from a person is escaped.
//
//   buildPasswordResetEmail(data)               customer or staff: choose a new password
//   buildCustomerWelcomeEmail(data)             customer: their account was created
//   buildNewCustomerAlertEmail(data)            store: someone registered
//   buildStaffWelcomeEmail(data)                staff: an admin account was created for them
//   buildLoginOtpEmail(data)                    staff or customer: their sign-in verification code
//   buildProductQuestionAlertEmail(data)        store: a shopper asked about a product
//   buildProductQuestionConfirmationEmail(data) shopper: we got your question
//   buildContactMessageAlertEmail(data)        store: a visitor used the Contact form
//   buildContactMessageConfirmationEmail(data)  visitor: we got your message
//
// Shared `data`: { storeName, supportEmail, shopUrl, logoSrc }.

import { detailRows, escapeHtml, quoteBlock, render } from "./orderEmail";

// Subjects and display names must stay on one line.
const oneLine = (value) => String(value).replace(/\s+/g, " ").trim();

const link = (url, label = url) => `<a href="${escapeHtml(url)}" style="color:#222222;">${escapeHtml(label)}</a>`;

export function buildPasswordResetEmail({ resetLink, expiresInHours = 1, ...data }) {
  return render(data, {
    subject: "Reset your password",
    heading: "Reset your password.",
    intro: "We received a request to reset your password. Use the button below to choose a new one.",
    button: { label: "Choose a new password", url: resetLink },
    stepsTitle: "Good to know",
    steps: [
      ["It expires.", `The link works for ${expiresInHours} hour${expiresInHours === 1 ? "" : "s"} and can only be used once.`],
      ["Need another?", "If it stops working, request a new link from the sign-in page."],
    ],
    note: { lead: "Didn't ask for this?", html: "You can safely ignore this email and your password won't change." },
  });
}

export function buildCustomerWelcomeEmail({ firstName, ...data }) {
  const { storeName, shopUrl } = data;
  return render(data, {
    subject: `Welcome to ${storeName}`,
    heading: `Welcome to ${storeName}, ${firstName}.`,
    intro: "Your account has been created. You can now sign in to check out faster and track your orders.",
    button: shopUrl ? { label: "Start shopping", url: shopUrl } : null,
    stepsTitle: "What you can do",
    steps: [
      ["Check out faster.", "Sign in at checkout and we'll have your details ready."],
      ["Track your orders.", "See every order and where it is, any time in your account."],
    ],
    note: { lead: "Didn't create this account?", html: "Please {contact} and we'll sort it out." },
  });
}

export function buildNewCustomerAlertEmail({ customer, adminUrl, ...data }) {
  const fullName = `${customer.firstName} ${customer.lastName}`.trim();
  return render(data, {
    subject: `New customer registered on ${data.storeName}`,
    heading: `New customer: ${fullName}.`,
    intro: `A new customer just registered on ${data.storeName}.`,
    facts: [["Name", fullName], ["Email", customer.email]],
    button: adminUrl ? { label: "View customers", url: adminUrl } : null,
    note: { lead: "Automatic alert.", html: "You're getting this because a customer created an account on the shop." },
  });
}

export function buildStaffWelcomeEmail({ to, firstName, temporaryPassword, setPasswordLink, loginLink, linkExpiresInHours, ...data }) {
  const { storeName } = data;
  return render(data, {
    subject: `Your ${storeName} admin account has been created`,
    heading: `Welcome aboard, ${firstName}.`,
    intro: `An admin account has been created for you on ${storeName}. Use the details below to sign in, then set a password of your own.`,
    facts: [["Email", to], ["Temporary password", temporaryPassword]],
    button: { label: "Set your own password", url: setPasswordLink },
    detailsHtml: loginLink ? `<p style="margin:0;font-size:13px;color:#444444;">Or <a href="${escapeHtml(loginLink)}" style="color:#222222;font-weight:bold;">sign in</a> with the temporary password.</p>` : "",
    detailsText: loginLink ? `Sign in: ${loginLink}` : "",
    stepsTitle: "For your security",
    steps: [
      ["Set your own password now.", `The link expires in ${linkExpiresInHours} hours and can only be used once.`],
      ["Keep it private.", "Don't share your password with anyone."],
    ],
    note: { lead: "Weren't expecting this?", html: "Please contact your store administrator." },
  });
}

// `audience` is "staff" (default) or "customer": same code email, different
// wording for where they're signing in and who to turn to if it wasn't them.
export function buildLoginOtpEmail({ firstName, code, expiresInSeconds, audience = "staff", ...data }) {
  const { storeName } = data;
  const isCustomer = audience === "customer";
  return render(data, {
    subject: `${code} is your ${storeName} sign-in code`,
    heading: `Hi ${firstName}, here's your code.`,
    intro: isCustomer
      ? `Use this code to finish signing in to your ${storeName} account.`
      : "Use this code to finish signing in to the admin panel.",
    facts: [["Your verification code", code]],
    stepsTitle: "Good to know",
    steps: [
      ["It expires fast.", `This code works for ${expiresInSeconds} seconds and can only be used once.`],
      ["Need another?", "If it expires, request a new one from the sign-in page."],
    ],
    note: {
      lead: "Didn't try to sign in?",
      html: isCustomer
        ? "Someone may have your password — change it from your account and contact us if you need help."
        : "Someone may have your password — change it and contact your store administrator.",
    },
  });
}

export function buildProductQuestionAlertEmail({ question, product, ...data }) {
  const productLine = `${product.title}${product.sku ? ` (SKU ${product.sku})` : ""}`;
  const detailsHtml = `${detailRows([
    ["Name", escapeHtml(question.name)],
    ["Email", link(`mailto:${question.email}`, question.email)],
    ["Phone", escapeHtml(question.phone)],
    ["Product", link(product.url, product.title)],
    product.sku ? ["SKU", escapeHtml(product.sku)] : null,
  ])}<div style="font-size:14px;font-weight:bold;color:#1F3A6B;margin:20px 0 8px;">Question</div>${quoteBlock(question.question)}`;
  return render(data, {
    subject: `New question about ${oneLine(product.title)} from ${question.name}`,
    heading: `New question from ${question.name}.`,
    intro: `A customer asked a question about a product on ${data.storeName}.`,
    detailsHtml,
    detailsText: `Name: ${question.name}\nEmail: ${question.email}\nPhone: ${question.phone}\nProduct: ${productLine}\nProduct page: ${product.url}\n\nQuestion:\n${question.question}`,
    button: { label: `Reply to ${question.name}`, url: `mailto:${question.email}` },
    note: { lead: "Reply to answer.", html: "Replying to this email goes straight to the customer." },
  });
}

export function buildProductQuestionConfirmationEmail({ question, product, ...data }) {
  const firstName = question.name.split(" ")[0];
  return render(data, {
    subject: `We received your question about ${oneLine(product.title)}`,
    heading: `Thanks for getting in touch, ${firstName}.`,
    intro: `We've received your question about ${product.title} and will reply as soon as we can.`,
    detailsHtml: `<div style="font-size:14px;font-weight:bold;color:#1F3A6B;margin:0 0 8px;">Your question</div>${quoteBlock(question.question)}`,
    detailsText: `Your question:\n${question.question}`,
    button: product.url ? { label: "View the product", url: product.url } : null,
    note: { lead: "Something to add?", html: "Just reply to this email." },
  });
}

// The storefront Contact form. `contact` is { name, email, phone, message }, all visitor input
// (already normalised by normalizeContact) and escaped here.
export function buildContactMessageAlertEmail({ contact, ...data }) {
  const detailsHtml = `${detailRows([
    ["Name", escapeHtml(contact.name)],
    ["Email", link(`mailto:${contact.email}`, contact.email)],
    ["Phone", escapeHtml(contact.phone)],
  ])}<div style="font-size:14px;font-weight:bold;color:#1F3A6B;margin:20px 0 8px;">Message</div>${quoteBlock(contact.message)}`;
  return render(data, {
    subject: `New message from ${oneLine(contact.name)}`,
    heading: `New message from ${contact.name}.`,
    intro: `A visitor sent a message through the contact form on ${data.storeName}.`,
    detailsHtml,
    detailsText: `Name: ${contact.name}\nEmail: ${contact.email}\nPhone: ${contact.phone}\n\nMessage:\n${contact.message}`,
    button: { label: `Reply to ${contact.name}`, url: `mailto:${contact.email}` },
    note: { lead: "Reply to answer.", html: "Replying to this email goes straight to the visitor." },
  });
}

export function buildContactMessageConfirmationEmail({ contact, ...data }) {
  const firstName = contact.name.split(" ")[0];
  return render(data, {
    subject: "We received your message",
    heading: `Thanks for getting in touch, ${firstName}.`,
    intro: "We've received your message and will reply as soon as we can.",
    detailsHtml: `<div style="font-size:14px;font-weight:bold;color:#1F3A6B;margin:0 0 8px;">Your message</div>${quoteBlock(contact.message)}`,
    detailsText: `Your message:\n${contact.message}`,
    button: data.shopUrl ? { label: "Visit the shop", url: data.shopUrl } : null,
    note: { lead: "Something to add?", html: "Just reply to this email." },
  });
}
