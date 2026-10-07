# Engraving / personalization

Customers can add a short engraving to products that offer it: they type the text, pick a font and
see it previewed. The choice stays attached to that exact item through the cart, the checkout and the
order, and is shown to the customer and to staff everywhere the order appears.

Engraving is **optional** and does not change the price. Leaving the text empty buys the item as it is.

## Set-up

```bash
npm run db:migrate:engraving
```

Run it after `npm run db:migrate` and `npm run db:migrate:order-details`
([engraving-tables-only.sql](engraving-tables-only.sql), safe to re-run). It adds:

| Table / column | Purpose |
| --- | --- |
| `engraving_settings` | One row (`id = 1`): global switch, character rules, help text |
| `engraving_categories` | The categories whose products offer engraving |
| `engraving_fonts` | The font choices, in display order. Seeded **once**, while the table is empty, with the fonts of the demo store |
| `products.engraving_mode` | `inherit` (default), `enabled` or `disabled` |
| `order_line_items.engraving_enabled / _text / _font_id / _font_name` | What the customer asked for, frozen on the order |

Until the migration has run, engraving is simply **off**: every read treats a missing table as "no
engraving" and orders keep working exactly as before. Nothing is offered until an admin also selects
categories (or sets a product to Enabled) in **Settings → Engraving**.

## Where things live

| Piece | Path |
| --- | --- |
| Text rules, eligibility priority, line key, font validation (pure, shared by browser and server) | `src/lib/engravingRules.js` |
| Admin persistence: settings, categories, fonts (one transaction) | `src/lib/engravingSettings.js` |
| Storefront side: is it offered, product-page config, checkout validation, order lines | `src/lib/engraving.js` |
| Admin API | `src/app/api/settings/engraving/route.js` (`settings-engraving.view` / `.edit`) |
| Public config for the cart's edit form | `src/app/api/storefront/engraving/route.js` |
| Settings → Engraving page | `src/app/admin/settings/engraving/page.js`, `src/components/settings-engraving/` |
| Product setting (Inherit / Enabled / Disabled) | `src/components/add-product/EngravingSidebar.js`, saved by `saveEngravingMode()` in `src/lib/products.js` |
| Product page section | `src/components/storefront/engraving/EngravingSection.js`, `EngravingFields.js` |
| Cart: display and edit / remove | `engraving/EngravingLines.js`, `engraving/CartEngraving.js`, `setEngraving()` in `cart/CartProvider.js` |
| Checkout validation and order write | `priceLines()` in `src/lib/checkoutPricing.js`, `insertOrder()` in `src/lib/checkoutOrders.js` |

## Who sees engraving: the priority

`resolveEngravingAvailability()` in `engravingRules.js` is the only place this is decided:

```text
Engraving switched off in Settings        -> hidden everywhere
Else if the product is set to Enabled     -> shown   (explicitly enabled)
Else if the product is set to Disabled    -> hidden  (explicitly disabled)
Else (Inherit) if it is in an engraving category -> shown (inherited from category)
Else                                      -> hidden
```

The result also carries a `source` (`product-enabled`, `product-disabled`, `category`, `none`,
`global-off`), so an explicit product choice is never confused with one inherited from a category, and
a category can never override a product set to Disabled.

A product is "in" an engraving category when `products.category_id` or any `product_categories` row
points at that category **or one of its sub-categories** (the same rule the coupon categories use).
A product with no enabled font to offer also shows no engraving.

## Text rules

Defaults, all changeable in Settings → Engraving: at most **20** characters (the code never accepts more
than 50), letters `A-Z a-z`, numbers `0-9`, spaces, and the basic symbols `& . , ' - ! ? / ( ) #`.
Accents, emoji and everything else are never allowed. The admin can switch letters, numbers and spaces
off and choose from a fixed list of plain-ASCII symbols (`& . , ' - ! ? / ( ) # @ + : * _`).

- Leading and trailing spaces are trimmed, runs of whitespace (including tabs and line breaks) become
  one space, and control and zero-width characters are removed (`normalizeEngravingText()`).
- The counter (`7/20`) counts the cleaned text. Disallowed characters are dropped as they are typed or
  pasted, with *Please use only letters, numbers, spaces, and basic symbols.* (built from the current
  rules). Too long text can be typed but is flagged in red and **blocks Add To Cart / Buy Now**.
- `validateEngravingText()` is the single check. The browser uses it live; the server runs it again for
  every engraved line at checkout with the store's **current** settings, so a forged cart is refused.

## Fonts

`engraving_fonts` holds `id` (a stable slug), display `name`, CSS `font_family`, an optional
`google_font` family to load, `is_enabled` and `position`. The product page and the cart render from
this list, so adding a font never touches a component. The customer sees every enabled font drawn in
its own typeface with their text (or "Forever" until they type).

The demo store (`mybridalring.com`) lists 18 fonts but does not say which font files it uses, so the
seeded fonts keep its **names** and use the closest Google Fonts (Adore → Allura, Angelina → Alex
Brush, Futura → Jost, and so on; Arial, Helvetica and Tahoma stay system fonts). Change the *Font
family* / *Google Fonts name* of any of them in Settings → Engraving if you license the real fonts.
Google Fonts names are validated (letters, numbers and spaces) so the stylesheet link can only ever ask
Google for a font.

Removing a font does not change past orders: they keep `engraving_font_id` and `engraving_font_name`.

## Cart

`localStorage["smb:cart"]` lines gain `engraving: { text, fontId, fontName } | null`. The engraving is
part of the **line key** (`lineKey(productId, variantId, engraving)` in `cartHelpers.js`):

- the same ring with different engraving (text or font; case matters) is **two lines**;
- the same ring with the same engraving is one line and its quantity increases;
- lines of one variant share its stock, so engraving a second copy can't exceed what is left
  (`stockLeftForLine()`), and the server checks the sum again.

The drawer and the `/cart` summary show *Engraving: Forever / Font: Elegant Script* under the product
name. On the full `/cart` page each engraved line has **Edit** (opens the same form, loaded with the
current rules and fonts from `/api/storefront/engraving`) and **Remove** (asks first, like every delete).
Editing a line so that it equals another one merges them and says so. The drawer is read-only.
**Order again** in the account carries the engraving over only while the product still offers it and the
text and font are still valid.

## Checkout and orders

`CheckoutPage` sends `engraving: { text, fontId }` per item and nothing else; the font **name** is looked
up on the server. For each engraved line `resolveLineEngraving()` checks that engraving is on, the product
offers it, the text passes the rules and the font exists and is enabled. If not, the order is refused with
`409 cart_changed` and `engravingInvalid: true` on that line, and the cart removes the engraving from it
(`syncLines()`) so the customer can add it again. Nothing is charged and nothing is saved.

A valid line is saved in `order_line_items` with `engraving_enabled = true`, the cleaned text, the font id
and the font name. It is shown, as *Personalization / Engraving / Font*, in:

- the checkout order summary,
- the order confirmation page (`/checkout/complete`),
- the account's order page,
- the admin Edit Order page,
- the order emails (confirmation, status emails, new-order alert, refund alert), as HTML and plain text,
- the invoice PDF.

## Security

- Every value is cleaned in `engravingRules.js` before use: control and zero-width characters, markup
  brackets in help text and font names, and anything outside the allowed set are removed or rejected.
- Text is only ever rendered as a React text node or passed through `escapeHtml()` in emails, and is
  stored through parameterized queries, so it can't become markup or SQL.
- `=` and `<`, `>`, `"`, `\`, `%` can never be allowed, and `+ - @` (which spreadsheets treat as formulas
  at the start of a cell) are off by default, so an engraving can't turn into a formula in an export.
- The settings API needs `settings-engraving.edit`; the storefront endpoint only returns the public rules
  and enabled fonts. Prices are never read from the request, and engraving adds no price.

## Not included

- No surcharge for engraving: it is free and does not change totals, tax or discounts.
- The card on a product listing ("quick add") adds the plain item. Engraving is chosen on the product page.
- Product imports and exports don't carry `engraving_mode` (imported products are `inherit`).
