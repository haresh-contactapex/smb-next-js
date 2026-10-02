// Limits shared by the account's server modules and its client forms. Kept free
// of imports so a client component can read them without pulling in the database.

export const MAX_ADDRESSES = 10;
export const MAX_PAYMENT_METHODS = 10;

// Card brands the saved-cards table accepts (see its CHECK constraint in
// docs/account/customer-account-tables-only.sql).
export const CARD_BRANDS = ["visa", "mastercard", "amex", "discover", "diners", "jcb", "other"];
