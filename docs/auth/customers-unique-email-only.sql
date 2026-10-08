-- Makes customers.email unique across every row (guest and registered), case-insensitively.
-- For a database created before this change. A fresh database gets the same index from
-- customers-table-only.sql / orders-database-schema.sql.
-- Dialect: PostgreSQL
--
-- Guest checkouts used to add a new one-off customers row every time, so the same email
-- could appear many times. This merges them: per email the kept row is the registered
-- account if there is one, otherwise the oldest guest row. Orders on a merged guest row are
-- moved to the kept row, then the extra guest rows are deleted. Only guest rows are ever
-- deleted; if two registered accounts share an email (ignoring case) the final index fails
-- instead of removing either.
-- Safe to re-run.

UPDATE customers SET email = lower(email) WHERE email <> lower(email);

WITH ranked AS (
    SELECT id, is_guest,
           first_value(id) OVER (PARTITION BY email ORDER BY is_guest, created_at, id) AS keep_id
    FROM customers
)
UPDATE orders o SET customer_id = r.keep_id
FROM ranked r
WHERE o.customer_id = r.id AND r.is_guest AND r.id <> r.keep_id;

WITH ranked AS (
    SELECT id, is_guest,
           first_value(id) OVER (PARTITION BY email ORDER BY is_guest, created_at, id) AS keep_id
    FROM customers
)
DELETE FROM customers c
USING ranked r
WHERE c.id = r.id AND r.is_guest AND r.id <> r.keep_id;

DROP INDEX IF EXISTS customers_email_key;
CREATE UNIQUE INDEX customers_email_key ON customers (lower(email));
