-- Gift Cards schema
-- Generated from docs/gift-cards/gift-cards-database-schema.md
-- Dialect: PostgreSQL
--
-- Notes:
--   * `gift_cards.customer_id` references `users`, defined in the My Account
--     schema (docs/my-account/my-account-database-schema.sql). Create that
--     table first, or drop the FK constraint below if this script runs
--     standalone.
--   * `gift_card_transactions.order_id` references an Orders module that is
--     not yet formalized in any schema doc in this repo. Create a stub
--     `orders(id)` table first, or drop that FK constraint if this script
--     runs standalone.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- provides gen_random_uuid()

-- =========================================================================
-- gift_cards
-- =========================================================================
CREATE TABLE gift_cards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID NULL REFERENCES users (id) ON DELETE SET NULL,
    code            VARCHAR(20) NOT NULL,
    initial_value   DECIMAL(12, 2) NOT NULL,
    balance         DECIMAL(12, 2) NOT NULL,
    issued_date     DATE NOT NULL,
    expiry_date     DATE NULL,
    status          VARCHAR(10) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'redeemed', 'expired')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT gift_cards_code_key UNIQUE (code)
);
COMMENT ON TABLE gift_cards IS 'Backs the "Your Gift Cards" list and account balance on the Gift Cards page.';
COMMENT ON COLUMN gift_cards.code IS 'Format GC-XXXX-XXXX, auto-formatted client-side by normalizeGiftCardCode.';
COMMENT ON COLUMN gift_cards.expiry_date IS 'NULL = never expires.';
COMMENT ON COLUMN gift_cards.status IS 'redeemed = balance fully spent (see gift_card_transactions), not "a code was added to the account".';

CREATE INDEX gift_cards_customer_id_idx ON gift_cards (customer_id);

-- =========================================================================
-- gift_card_transactions
-- =========================================================================
CREATE TABLE gift_card_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gift_card_id    UUID NOT NULL REFERENCES gift_cards (id) ON DELETE CASCADE,
    order_id        UUID NULL REFERENCES orders (id) ON DELETE SET NULL,
    amount          DECIMAL(12, 2) NOT NULL,
    description     VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE gift_card_transactions IS 'One row per credit (code added to account) or debit (balance spent on an order).';
COMMENT ON COLUMN gift_card_transactions.order_id IS 'Set only for a debit made at checkout.';
COMMENT ON COLUMN gift_card_transactions.amount IS 'Positive = credit ("added to account"), negative = debit ("redeemed on an order").';

CREATE INDEX gift_card_transactions_gift_card_id_idx ON gift_card_transactions (gift_card_id);
CREATE INDEX gift_card_transactions_order_id_idx ON gift_card_transactions (order_id);
