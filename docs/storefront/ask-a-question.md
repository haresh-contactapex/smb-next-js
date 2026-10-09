# Storefront "Ask a question" form

The **Ask a question** action under the buttons on a product page
(`/products/[handle]`) opens a dialog where a shopper sends the store a question
about that product. The fields and flow follow the equivalent form on
mybridalring.com, but the look is the storefront's own **register form**
(`/register`): a bold title with a one-line subtitle, small uppercase labels above
soft grey-blue inputs, a mail and a phone icon inside their fields, the rounded
navy **Send Message** button and `text-xs` red error messages. The product
(thumbnail, name, current price) sits in a small card underneath.

It reuses the register form's shared `.field-input` / `.field-label` classes from
`globals.css` rather than a copy. Those classes have `.dark` variants and the
root layout puts `.dark` on `<html>` for visitors who prefer dark, which would
turn the inputs dark inside this light-only dialog, so `(site)/storefront.css`
pins them to their light look inside `#storefront-root`.

Nothing is stored. The question is **emailed**, so there is no table and no
migration.

## Where things live

| Piece | Path |
| --- | --- |
| Trigger button, owns the open/closed state | `src/components/storefront/ProductPurchasePanel.js` |
| The dialog (form, validation messages, sending, success state) | `src/components/storefront/ask-question/AskQuestionModal.js` |
| Field limits and validation, shared by the form and the API | `src/components/storefront/ask-question/helpers.js` |
| Public endpoint | `src/app/api/product-questions/route.js` |
| Server flow: validate, rate limit, look up product, send both emails | `src/lib/productQuestions.js` |
| The two email templates | `sendProductQuestionAdminEmail()`, `sendProductQuestionConfirmationEmail()` in `src/lib/email.js` |
| In-memory rate limiter | `src/lib/rateLimit.js` |
| Light-mode pin for the shared field classes | `src/app/(site)/storefront.css` |
| `phone` icon used by the phone field | `src/components/admin-panel/icons.js` |

## What the visitor sees

- All four fields are required: **name**, **email**, **phone**, **question**.
  Limits: name 100, email 254, question 2000 characters.
- The **phone** must be a US number, the same rule as the Contact form: ten
  digits, and the area code and the exchange (the next three digits) can't start
  with 0 or 1. It is laid out as `(212) 555-0123` while it is typed (digits past
  the tenth are ignored), and a pasted `+1 212 555 0123` or `1-212-555-0123` is
  reformatted the same way. The server applies the same rule and stores the
  canonical `(212) 555-0123` layout in the emails; a number with too many digits
  is rejected, not cut down to ten. Other countries' numbers aren't accepted.
- Invalid fields get the register form's pink fill and red border, a message
  under the field, and the first one is focused. Each field has a visible
  `<label>` and its message is linked with `aria-describedby`.
- On success the form is replaced with a thank-you message naming the product.
  It mentions the confirmation email only if that email was actually sent.
- On failure the message is shown above the button, what was typed is kept, and
  (for server or network problems) the store's support email is offered as a
  fallback.
- Esc and the close button close the dialog; clicking the backdrop closes it
  only while the form is empty, so a half-written question isn't lost. Tab stays
  inside, page scroll is locked, and focus returns to the button that opened it.

## Emails

Both go out through the shared mailer (`sendEmail()` in `src/lib/email.js`), so
they use whatever SMTP is configured in **Settings -> Email** (or the `SMTP_*`
variables in `.env.local`) and get the same footer.

| Email | To | Reply-To | Contents |
| --- | --- | --- | --- |
| Store notification | **Settings -> Store support email**, else **Settings -> General store email** | the shopper | name, email, phone, product (linked) and SKU, the question |
| Confirmation | the shopper | the store address above | thanks, the product, a copy of their question |

Replying to the store notification answers the shopper directly. Product title
and SKU come from the catalog (looked up by handle), never from the request.
All visitor-supplied text is HTML-escaped, and the name is flattened to one line
before it reaches a subject or header.

The store notification is the only record of the question, so if it can't be sent
(no recipient address, SMTP not configured, or the send fails) the request fails
with `503` and the visitor is told to try again. A failed *confirmation* never
fails the request; the response just reports `confirmationSent: false`.

## API

`POST /api/product-questions` (public, no session)

```json
{ "name": "...", "email": "...", "phone": "...", "question": "...", "handle": "product-handle", "honeypot": "" }
```

| Status | Meaning |
| --- | --- |
| `201` `{ success: true, data: { confirmationSent } }` | Store notified |
| `400` | Invalid input (message names the first problem) or invalid JSON |
| `404` | Unknown or inactive product |
| `413` | Body larger than 20 KB |
| `429` | Rate limit hit |
| `503` | Store email could not be sent (not configured or SMTP failure) |

## Abuse protection

The endpoint is public and emails an address the visitor typed, so it limits what
it will send:

- **Honeypot.** The form has a hidden `hp_contact` field. If a bot fills it the
  API answers `201` and sends nothing. Its name deliberately avoids anything
  browser autofill recognises.
- **Rate limits** (`src/lib/rateLimit.js`): 5 submissions per client (first
  `x-forwarded-for` entry) per 10 minutes, and 3 per email address per hour, so
  the confirmation email can't be used to bombard someone else's inbox.
- Strict email validation rejects commas, semicolons, quotes and brackets, so a
  value can't be read as a second recipient.

The limiter keeps its counts in server memory. On serverless hosting each warm
instance counts separately and a cold start resets it, so treat it as a speed
bump, not a hard cap. If abuse becomes a real problem, move the counters to the
database or a shared store, or add reCAPTCHA (see `src/lib/auth/recaptcha.js`).
