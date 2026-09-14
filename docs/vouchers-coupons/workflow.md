# Vouchers / Coupons Workflow

Process flows for the **Vouchers / Coupons** section of the admin panel
(sidebar submenu: All Coupons, Create Coupon) plus the Settings → Discounts
& Coupons page. Pairs with
[`vouchers-coupons-database-schema.md`](vouchers-coupons-database-schema.md),
which defines the tables these flows would read from and write to once a
real backend exists — today every page here runs on static/in-memory data
only, so "Save" never persists across a page reload.

## 1. Navigation

How the pages connect, starting from the sidebar.

```mermaid
flowchart LR
    SB["Sidebar: Vouchers / Coupons"] --> ALL["All Coupons\n(/all-coupons)"]
    SB --> CREATE["Create Coupon\n(/create-coupon)"]
    SET["Sidebar: Settings"] --> DISC["Discounts & Coupons\n(/settings/discounts-coupons)"]

    ALL -- "Create Coupon button" --> CREATE
    CREATE -- "Discard / Save" --> ALL
```

The sidebar auto-expands the "Vouchers / Coupons" submenu and highlights the
current entry based on the active route (see
`src/components/admin-panel/Sidebar.js`) — it isn't hardcoded per page.

## 2. Create Coupon

```mermaid
flowchart TD
    Start(["Open /create-coupon"]) --> Code["Enter a code,\nor click Generate"]
    Code --> Desc["Add an internal\ndescription"]
    Desc --> Type["Pick Discount Type:\nPercentage / Fixed / Free shipping"]
    Type --> ValueStep{"Type is\nfree shipping?"}
    ValueStep -- "No" --> Value["Enter discount value\n(% or ₹, per type)"]
    ValueStep -- "Yes" --> SkipValue["Value input hidden\n— nothing to enter"]
    Value --> Limits
    SkipValue --> Limits["Set min. purchase,\nusage limit,\none-per-customer"]
    Limits --> Dates["Set Status +\nStart date /\noptional End date"]
    Dates --> Elig["Set Eligibility:\nAll products or\none specific category"]
    Elig --> Save(["Click Save Coupon"])

    Save --> ValidCode{"Code\nfilled in?"}
    ValidCode -- "No" --> ErrCode["Show inline error\n+ toast, focus Code"]
    ErrCode --> Code
    ValidCode -- "Yes" --> ValidValue{"Value filled in\n(unless free shipping)?"}
    ValidValue -- "No" --> ErrValue["Show inline error\n+ toast"]
    ErrValue --> Value
    ValidValue -- "Yes" --> Toast["Show 'Coupon saved' toast"]

    Discard(["Click Discard"]) --> Confirm{"Confirm\ndiscard?"}
    Confirm -- "No" --> Code
    Confirm -- "Yes" --> Reset["Reset form to\nempty defaults"]
```

Key behavior worth calling out:

- **Switching Discount Type clears the value field.** Moving between
  Percentage / Fixed / Free shipping resets `value` to empty rather than
  reinterpreting a stale number under the new type (e.g. a `15` meant as
  15% shouldn't silently become ₹15).
- **The value field itself changes shape by type** — a `%` suffix for
  Percentage, a `₹` prefix for Fixed — and disappears entirely for Free
  shipping, since that type has nothing to discount by amount.
- **There is no backend call.** "Save Coupon" only shows a confirmation
  toast; wiring this to a real API means `INSERT`-ing into `coupons` with
  the shape defined in the database schema doc.

## 3. Browse & filter — All Coupons

```mermaid
flowchart TD
    Load(["Open /all-coupons"]) --> Show["Show stat cards\n(Total / Active /\nScheduled / Expired) +\nfull coupon list"]
    Show --> Filter["Type in search box /\npick status or\ntype filter"]
    Filter --> Recompute["Recompute filtered list\n(client-side, useMemo)"]
    Recompute --> ResetPage["Reset to page 1"]
    ResetPage --> Render["Render table + pagination\n(8 rows per page)"]
    Render --> Filter
    Render --> Clear["Click Clear filters"]
    Clear --> Show
```

- **`CouponsListing.js`** filters by code/description text, status
  (Active/Scheduled/Draft/Expired), and discount type, then paginates 8 rows
  at a time — the same pattern `ProductsListing.js` uses for All Products.
- The four stat cards are computed once from the full dataset
  (`computeCouponStats`), independent of the current filters, so they always
  reflect the whole catalog of coupons rather than the visible page.

## 4. Discounts & Coupons settings

```mermaid
flowchart TD
    Start(["Open /settings/discounts-coupons"]) --> Toggle["Toggle 'Enable the use\nof coupon codes'"]
    Toggle --> Enabled{"Enabled?"}
    Enabled -- "No" --> Dim["Grey out + disable every\nother field on the page\n(rules, limits, auto-apply)"]
    Enabled -- "Yes" --> Rules["Adjust Coupon Rules /\nAutomatic Discounts fields"]
    Dim --> Save(["Click Save"])
    Rules --> Save
    Save --> Toast["Show 'Discounts & Coupons\nsettings saved' toast"]

    Discard(["Click Discard"]) --> Confirm{"Confirm\ndiscard?"}
    Confirm -- "No" --> Toggle
    Confirm -- "Yes" --> Reset["Reset form to\nDEFAULT_SETTINGS"]
```

- The master toggle is deliberately the only field that is never itself
  disabled — every other field's `disabled` state is derived from it
  (`disabled={!settings.couponsEnabled}` in `DiscountsCouponsSettingsForm.js`),
  so turning coupons off visibly removes the ability to tune rules that no
  longer apply, without hiding them outright.
- This page has no validation step: any combination of values can be saved,
  unlike Create Coupon's required Code/Value.

## 5. Coupon redemption at checkout (not yet implemented in this app)

The admin pages above only manage coupon *definitions*. The other half of
the feature — a customer actually redeeming a code — has no storefront UI in
this codebase yet, but the schema doc's `coupon_redemptions` table and the
settings above only make sense in light of this flow, so it's documented
here for whoever builds checkout next.

```mermaid
flowchart TD
    Enter(["Customer enters\ncode at checkout"]) --> Global{"coupon_settings\n.coupons_enabled?"}
    Global -- "No" --> RejectOff["Reject:\ncoupons disabled storewide"]
    Global -- "Yes" --> Lookup{"Code exists?\n(case rules per\ncase_sensitive_coupons)"}
    Lookup -- "No" --> RejectInvalid["Reject: invalid code"]
    Lookup -- "Yes" --> Status{"status = ACTIVE and\nwithin start/end dates?"}
    Status -- "No" --> RejectStatus["Reject: expired,\nscheduled, or draft"]
    Status -- "Yes" --> Min{"Order total ≥\nmin_purchase_amount and\n≥ min_order_amount_for_coupon?"}
    Min -- "No" --> RejectMin["Reject: order\ntoo small"]
    Min -- "Yes" --> Elig{"applies_to = ALL,\nor cart has an item\nin category_id?"}
    Elig -- "No" --> RejectElig["Reject: not eligible\nfor items in cart"]
    Elig -- "Yes" --> Usage{"usage_count <\nusage_limit\n(or unlimited)?"}
    Usage -- "No" --> RejectUsage["Reject: usage\nlimit reached"]
    Usage -- "Yes" --> Per{"one_per_customer and\ncustomer already has a\ncoupon_redemptions row?"}
    Per -- "Yes" --> RejectPer["Reject: already\nused by this customer"]
    Per -- "No" --> Stack{"Another coupon already\napplied to this order?"}
    Stack -- "Yes, and\nallow_multiple_coupons = false" --> RejectStack["Reject: only one\ncoupon per order"]
    Stack -- "No, or\nallow_multiple_coupons = true" --> Cap{"auto_apply_best_discount:\nwould total discount exceed\nmax_discount_percent?"}
    Cap -- "Yes" --> Cap2["Cap discount at\nmax_discount_percent\nof order total"]
    Cap -- "No" --> Apply
    Cap2 --> Apply["Apply discount,\ninsert coupon_redemptions row,\nincrement usage_count"]
```

## Coupon status lifecycle

```mermaid
flowchart LR
    DRAFT -- "Admin sets a\nfuture start_date\nand saves" --> SCHEDULED
    DRAFT -- "Admin sets status\nto Active directly" --> ACTIVE
    SCHEDULED -- "start_date reached" --> ACTIVE
    ACTIVE -- "end_date reached" --> EXPIRED
    SCHEDULED -- "Admin cancels\nbefore it starts" --> EXPIRED
```

`status` is a value the admin sets directly on the Create Coupon form (via
the Status select), not a column recomputed from dates on every read. A
production system would still want a scheduled job (or a check at query
time) that flips `ACTIVE` rows to `EXPIRED` once `end_date` passes, and
`SCHEDULED` rows to `ACTIVE` once `start_date` arrives, so the stored status
doesn't silently go stale.

## Data lifecycle today vs. with a backend

| Step | Today (this app) | With the schema in `vouchers-coupons-database-schema.md` |
| ---- | ------------------ | ----------------------------------------------------------------------- |
| Load All Coupons | Read a static array from `src/data/couponsData.js` | `SELECT` from `coupons`, optionally joined to `categories` for the eligibility column |
| Filter/search | In-memory `Array.filter` in the browser | `WHERE` clauses (or a search index) pushed to the server, paginated with `LIMIT`/`OFFSET` |
| Save a coupon | Show a confirmation toast only | `INSERT`/`UPDATE` `coupons` in a transaction |
| Save Discounts & Coupons settings | Show a confirmation toast only | `UPDATE` the single `coupon_settings` row |
| Redeem a coupon at checkout | Not implemented | `INSERT` into `coupon_redemptions`, increment `coupons.usage_count`, all inside one transaction so a race between two checkouts can't both succeed past `usage_limit` |
| Discard | Reset local React state | No-op — nothing was written yet |
