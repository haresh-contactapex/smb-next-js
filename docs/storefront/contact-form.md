# Storefront Contact form

A form where a visitor sends the store a message: **name, email, phone, message**
and a **Send message** button. It is the Contact page's right-hand column on
mybridalring.com: borderless fields with a thin rule underneath, the hint shown as
a placeholder, a small outline icon at the right end of each field, a taller
message box and a dark charcoal button. It is built on the same flow as the
product page's [Ask a question](ask-a-question.md) form and shares its email and
phone rules, but it renders **inline** (not in a dialog) and has no product.

Nothing is stored. The message is **emailed**, so there is no table and no
migration.

## Where things live

| Piece | Path |
| --- | --- |
| The form (fields, validation messages, sending, success state) | `src/components/storefront/contact/ContactForm.js` (default export, no required props) |
| Field limits and validation, shared by the form and the API | `src/components/storefront/contact/helpers.js` |
| Public endpoint | `src/app/api/contact/route.js` |
| Server flow: validate, rate limit, send both emails | `src/lib/contactMessages.js` |
| The two email templates | `buildContactMessageAlertEmail()`, `buildContactMessageConfirmationEmail()` in `src/lib/notificationEmail.js`; sent by `sendContactMessageAdminEmail()`, `sendContactMessageConfirmationEmail()` in `src/lib/email.js` |
| Email and phone rules, name/email limits | `src/components/storefront/ask-question/helpers.js` (imported, not copied) |
| In-memory rate limiter | `src/lib/rateLimit.js` |
| Icons (`user`, `mail`, `phone`, `message-square`) | `src/components/admin-panel/icons.js` |

## Using it on a page

```jsx
import ContactForm from "@/components/storefront/contact/ContactForm";

<ContactForm />
<ContactForm fallbackEmail="info@shopmyband.com" />
```

`fallbackEmail` (default `info@shopmyband.com`) is the address offered when the
message could not be sent because of a server or network problem. The form fills
the width of whatever contains it and is built for a column of about 400px; it
works from 280px to 480px wide. It is light-only (it sets its own colors and has
no `dark:` styles) and uses plain Tailwind classes, not `.field-input`.

**In a CMS page:** put a paragraph with class `cms-embed-contact-form` where the
form should appear. That paragraph is only a placeholder; another component
replaces it with `<ContactForm />` on the storefront. This file does not do that
mounting.

## What the visitor sees

- All four fields are required. Limits: name 100, email 254, message 2000
  characters. The phone is a **US number**: it is laid out as `(213) 290-9999` while
  the visitor types (extra digits are ignored, a leading `+1`/`1` is dropped) and must
  be ten digits with an area code and exchange that start 2-9
  (`usPhoneDigits`, `formatUsPhone`, `isValidUsPhone` in `contact/helpers.js`; the
  server applies the same rule and stores the formatted number in the email).
- Each field has a real `<label>` (visually hidden, because the placeholder is the
  visible hint): "What's your good name?", "Enter your email address", "Enter
  your phone number" (shown as the example `(213) 290-9999`), "Enter your message".
- **reCAPTCHA**: when Settings -> Security's "Enable reCAPTCHA" and Settings ->
  Integrations' "Google reCAPTCHA" are both on (`enableRecaptcha` from
  `useGeneralSettings()`), the Google checkbox appears above the send button and a
  completed challenge is required. The token travels as `recaptchaToken`; the server
  checks it with `checkRecaptchaIfEnabled()` (`src/lib/auth/recaptcha.js`) and
  answers 400 "reCAPTCHA verification failed" when it does not verify. A failed send
  gives a fresh challenge. With the settings off nothing is shown or checked.
- Invalid fields get a red rule and a message under the field, linked with
  `aria-describedby`, and the first invalid field is focused. A field's message
  clears as soon as the visitor edits it.
- The button shows "Sending..." and is disabled while a request is in flight, and
  a second submit is ignored.
- On success the form is replaced with "Thank you, <first name>. We've received
  your message and will reply soon." It adds a line about the confirmation email
  only if that email was actually sent. Focus moves to that message.
- On failure the message is shown above the button, what was typed is kept, and
  (for server or network problems) `fallbackEmail` is offered as a link.
- A hidden `hp_contact` field is the honeypot (see below). It is hidden from
  people and from assistive technology.

## Emails

Both go out through the shared mailer (`sendEmail()` in `src/lib/email.js`), so
they use whatever SMTP is configured in **Settings -> Email** (or the `SMTP_*`
variables in `.env.local`) and get the same footer.

| Email | To | Reply-To | Subject | Contents |
| --- | --- | --- | --- | --- |
| Store notification | **Settings -> General store email**, else **Settings -> Store support email** | the visitor | `New message from <name>` | name, email, phone, the message quoted |
| Confirmation | the visitor | the store address above | `We received your message` | thanks, a copy of their message |

Replying to the store notification answers the visitor directly. All
visitor-supplied text is HTML-escaped, and the name is flattened to one line
before it reaches a subject or header.

The store notification is the only record of the message, so if it can't be sent
(no recipient address, SMTP not configured, or the send fails) the request fails
with `503` and the visitor is told to try again later. A failed *confirmation*
never fails the request; the response just reports `confirmationSent: false`.

## API

`POST /api/contact` (public, no session; other methods are not allowed)

```json
{ "name": "...", "email": "...", "phone": "(213) 290-9999", "message": "...", "honeypot": "", "recaptchaToken": "" }
```

| Status | Meaning |
| --- | --- |
| `201` `{ success: true, data: { confirmationSent } }` | Store notified |
| `400` | Invalid input (message names the first problem) or invalid JSON |
| `413` | Body larger than 20 KB |
| `429` | Rate limit hit |
| `503` | Store email could not be sent (not configured or SMTP failure) |
| `500` | Anything unexpected (generic message) |

## Abuse protection

The endpoint is public and emails an address the visitor typed, so it limits what
it will send:

- **Honeypot.** If a bot fills `honeypot` the API answers `201` and sends nothing.
- **Rate limits** (`src/lib/rateLimit.js`): 5 submissions per client (first
  `x-forwarded-for` entry) per 10 minutes, and 3 per email address per hour, so
  the confirmation email can't be used to bombard someone else's inbox. These are
  the contact form's own counters; they are separate from Ask a question's.
- Strict email validation (shared with Ask a question) rejects whitespace,
  commas, semicolons, quotes and brackets, so a value can't be read as a second
  recipient.
- The body is capped at 20 KB, checked against both the `Content-Length` header
  and the bytes actually read.

The limiter keeps its counts in server memory. On serverless hosting each warm
instance counts separately and a cold start resets it, so treat it as a speed
bump, not a hard cap. If abuse becomes a real problem, move the counters to the
database or a shared store, or keep reCAPTCHA switched on in the settings.
