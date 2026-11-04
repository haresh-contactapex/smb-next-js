# Newsletter

The home page "Stay in the Loop for discounts and offers" form collects email addresses, and **Admin → Newsletter** lists them.

## Setup

Run `npm run db:migrate:newsletter` (or `npm run db:migrate:all`). Schema: [`newsletter-subscribers-table-only.sql`](newsletter-subscribers-table-only.sql) — one table, `newsletter_subscribers` (`id`, `email`, `source`, `created_at`). Emails are stored lower-case with a unique index, so an address is one row however often it is submitted.

## Subscribing (storefront)

`src/components/storefront/home/HomeNewsletter.js` posts `{ email, honeypot, recaptchaToken }` to the public `POST /api/newsletter`, which calls `subscribeToNewsletter` in `src/lib/newsletter.js`:

1. A filled honeypot field is answered as a success and dropped.
2. The address is validated (`src/lib/shared/newsletter.js`, the same rules the form uses).
3. Google reCAPTCHA is checked when Settings → Security and Settings → Integrations turn it on (the form then shows the widget).
4. Rate limits: 5 requests per client per 10 minutes, 3 per address per hour (in memory, per server process).
5. The address is inserted. A repeat address changes nothing, sends no email, and the visitor sees "You're already subscribed."
6. For a new address, two emails go out in the order-email design (best-effort: the signup is saved first, so a mail problem never fails it):
   - **Subscriber:** a welcome email (`sendNewsletterWelcomeEmail`). Replies go to the store address.
   - **Store:** a "new newsletter subscriber" notice (`sendNewsletterSubscriberAlertEmail`) to Settings → General **Store Email**, else Settings → Store **Support Email**, with a link to Admin → Newsletter.

Both emails use the SMTP details from Settings → Email (or the `SMTP_*` env fallback). With no SMTP configured the address is still saved and the problem is logged.

## Admin → Newsletter

Page `/admin/newsletter` (sidebar link "Newsletter"): total / last 7 days / last 30 days counts, search by address, sortable and paged list, bulk delete, and CSV export (`Email,Source,Subscribed at`; an address starting with `=`, `+`, `-` or `@` is prefixed with `'` so a spreadsheet won't run it as a formula).

Permissions (module `newsletter`, so a role must be granted them in Settings → Admin & Roles; full-access roles have them): `newsletter.view` (the page), `newsletter.delete`, `newsletter.export`.

Staff API (every handler checks the permission itself; `/api` is not covered by middleware):

| Route | Permission | Purpose |
| --- | --- | --- |
| `GET /api/newsletter-subscribers` | `newsletter.view` | list |
| `DELETE /api/newsletter-subscribers` body `{ ids }` | `newsletter.delete` | bulk delete |
| `GET /api/newsletter-subscribers/export` | `newsletter.export` | `{ csv, filename }` |

## Not included

There is no unsubscribe link or page yet, and no campaign sending: the list is for export. An unsubscribe flow (signed link, page, a status column) would be the next step before sending marketing email from it.
