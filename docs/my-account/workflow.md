# My Account Workflow

Process flows for the **My Account** section of the admin panel (sidebar
submenu: Profile, Address, Payment). Pairs with
[`my-account-database-schema.md`](my-account-database-schema.md), which
defines the tables these flows would read from and write to once a real
backend exists — today every page here runs on static/in-memory data only,
so "Save" never persists across a page reload.

## 1. Navigation

How the three pages connect, starting from the sidebar.

```mermaid
flowchart LR
    SB["Sidebar: My Account"] --> PROF["Profile\n(/profile)"]
    SB --> ADDR["Address\n(/address)"]
    SB --> PAY["Payment\n(/payment)"]

    PAY -- "\"Address\" link in\nBilling Address sidebar" --> ADDR
```

The sidebar auto-expands the "My Account" submenu and highlights the current
entry based on the active route (see `src/components/admin-panel/Sidebar.js`)
— it isn't hardcoded per page.

## 2. Profile

```mermaid
flowchart TD
    Start(["Open /profile"]) --> Fill["Fill personal details\n(avatar, name, email,\nphone, bio)"]
    Fill --> Pref["Adjust Preferences\n(language, timezone) +\nAccount Status toggles (2FA)"]
    Pref --> PW{"Change\npassword?"}
    PW -- "No, leave blank" --> Save
    PW -- "Yes" --> FillPW["Fill current / new /\nconfirm password"]
    FillPW --> Save(["Click Save Profile"])

    Save --> ValidEmail{"Valid email\nformat?"}
    ValidEmail -- "No" --> ErrEmail["Show inline error\n+ toast, halt save"]
    ErrEmail --> Fill
    ValidEmail -- "Yes" --> ValidPW{"New password set\nand ≠ confirm?"}
    ValidPW -- "Yes (mismatch)" --> ErrPW["Show inline error\n+ toast, halt save"]
    ErrPW --> FillPW
    ValidPW -- "No (blank or match)" --> Clear["Clear password fields,\nshow \"Profile saved\" toast"]

    Discard(["Click Discard"]) --> Confirm{"Confirm\ndiscard?"}
    Confirm -- "No" --> Fill
    Confirm -- "Yes" --> Reset["Reset form to\nDEFAULT_PROFILE"]
```

Key behavior worth calling out:

- **Avatar upload is a local preview only.** It uses the same
  `URL.createObjectURL` blob-preview pattern as the Add Product / Add
  Category image uploads — nothing is sent to storage.
- **Password fields are optional as a pair.** Validation only runs when
  either `newPassword` or `confirmPassword` is non-empty; leaving both blank
  keeps the current password, matching the section's own helper text.
- **Password fields always clear after a successful save**, even though no
  backend actually persists the new password — there's nothing to roll back
  to on a later Discard.

## 3. Address

```mermaid
flowchart TD
    Start(["Open /address"]) --> FillB["Fill Billing Address\n(name, company, street,\ncity/state/zip, country, phone)"]
    FillB --> Toggle{"Shipping same\nas billing?"}
    Toggle -- "Yes (default)" --> Preview
    Toggle -- "No" --> FillS["Fill separate\nShipping Address\n(same field set)"]
    FillS --> Preview["Address Preview sidebar\nupdates live"]
    Preview --> Notes["Optionally add\nDelivery Instructions"]
    Notes --> Save(["Click Save Address"])

    Save --> Valid{"Address Line 1 +\nCity filled in?"}
    Valid -- "No" --> Err["Show toast: \"Add at least a\nstreet address and city\""]
    Err --> FillB
    Valid -- "Yes" --> Toast["Show \"Address saved\" toast"]

    Discard(["Click Discard"]) --> Confirm{"Confirm\ndiscard?"}
    Confirm -- "No" --> FillB
    Confirm -- "Yes" --> Reset["Reset form to\nDEFAULT_ADDRESS_STATE"]
```

Key behavior worth calling out:

- **Billing and shipping share one field component** (`AddressFields.js`,
  keyed by `idPrefix`) — unchecking "same as billing" simply reveals a
  second copy of the identical field set for shipping.
- **The phone field auto-formats to US style** (`(555) 000-0000`) as the
  user types, regardless of which `country` is selected — a known
  simplification carried over into the schema's `addresses.phone` column.
- **The preview sidebar mirrors billing** into the shipping preview whenever
  "same as billing" is checked, so the two panels never visibly disagree.

## 4. Payment

Unlike Profile and Address, most actions on this page commit immediately —
the page-level Save only covers one setting.

```mermaid
flowchart TD
    Start(["Open /payment"]) --> List["View Saved Cards"]

    List --> MakeDefault["Click \"Make Default\"\non a card"] --> ImmediateDefault["Card list updates\nimmediately + toast\n(no Save needed)"]
    List --> Remove["Click remove icon"] --> ConfirmRemove{"Confirm\nremove?"}
    ConfirmRemove -- "No" --> List
    ConfirmRemove -- "Yes" --> ImmediateRemove["Card removed\nimmediately + toast"]

    List --> FillCard["Fill Add a Card form\n(holder, number, expiry, CVV)"]
    FillCard --> ClickAdd(["Click Add Card"])
    ClickAdd --> ValidCard{"Number ≥12 digits,\nexpiry + CVV filled?"}
    ValidCard -- "No" --> ErrCard["Show inline error\n+ toast"]
    ErrCard --> FillCard
    ValidCard -- "Yes" --> Detect["Derive brand + last4\nfrom the number\n(raw number/CVV discarded)"]
    Detect --> AddedImmediate["Card appended\nimmediately + toast\n(no Save needed)"]

    List --> ToggleBilling["Toggle \"Same as shipping\naddress\" in sidebar"]
    ToggleBilling --> ClickSave(["Click Save Changes"])
    ClickSave --> ToastSave["Show \"Payment settings\nsaved\" toast"]

    Discard(["Click Discard"]) --> ConfirmD{"Confirm\ndiscard?"}
    ConfirmD -- "No" --> List
    ConfirmD -- "Yes" --> ResetD["Reset in-progress Add Card\nform + billing toggle only —\nsaved cards untouched"]
```

Key behavior worth calling out:

- **Adding, removing, or defaulting a card is immediate** — none of it waits
  for the page-level "Save Changes" button. That button only persists the
  "Billing same as shipping" preference.
- **Discard doesn't undo card changes.** It only resets the in-progress Add
  Card form and the billing toggle; there's no "original" saved-cards
  snapshot to roll back to, since each card action already committed on
  click.
- **Raw card number and CVV never enter the card list.** `detectBrand` /
  `formatCardNumber` only derive a display `brand` and `last4` — matching
  the schema doc's note that only those fields (plus a future gateway
  token) would ever be persisted.

## Data lifecycle today vs. with a backend

| Step | Today (this app) | With the schema in `my-account-database-schema.md` |
| ---- | ------------------ | ----------------------------------------------------------------------- |
| Load Profile / Address / Payment | Read `DEFAULT_PROFILE` / `DEFAULT_ADDRESS_STATE` / `SAVED_CARDS` in-memory seeds | `SELECT` from `users` (by session), `addresses` WHERE `user_id` + `type`, `payment_methods` WHERE `user_id` |
| Save profile | Validate email/password client-side only | `UPDATE users` (rehashing `password_hash` only if a new password was set) |
| Save address | Validate Line 1 + City client-side only | `UPSERT` the `BILLING` row, and the `SHIPPING` row too when it isn't `same_as_billing` |
| Add / remove / default a card | Mutate the local `cards` array only | `INSERT` / `DELETE` on `payment_methods`; flip `is_default` inside a transaction so only one row per user stays `true` |
| Discard | Reset local React state | No-op — nothing was written yet |
