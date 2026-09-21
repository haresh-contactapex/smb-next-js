---
name: catalog
description: Work on Shop My Band catalog features: products, categories, product variants, collections, tags, and media links.
---

# Catalog work

## Ownership map

- Product persistence and payload mapping: `src/lib/products.js`.
- Category persistence: `src/lib/categories.js`; product-category schema/workflow: `docs/category-product/`.
- Product editor: `src/components/add-product/`; listing: `src/components/all-products/`; category UI: `src/components/add-category/` and `src/components/categories/`.
- API endpoints: `src/app/api/products/` and `src/app/api/categories/`.

## Data integrity rules

- Products are represented by a main product row plus options, option values, variants, variant-option links, media, tags, and collections. Preserve the API/UI payload shape when modifying any part of this aggregate.
- Category paths use `"Parent > Child"` and `upsertCategoryPath`; do not create duplicate hierarchy levels outside that convention.
- Variant SKUs are globally unique. Retain the deduplication behavior in `dedupeSkusGlobally` when changing variant creation or imports.
- Product update child rows are deliberately replaced as an aggregate. Understand the delete-and-reinsert sequence before adding related tables or validation.
- Keep product `handle` uniqueness errors human-readable; the lib layer already maps the database uniqueness constraint to an actionable error.

## Media

- Uploaded assets have a database record via `src/lib/media.js` and files under `public/uploads/`. Do not commit user-uploaded assets.
- Validate file type/size and preserve the public URL contract when touching the media route or product media picker.

## Verification

- Exercise create, edit, and delete paths. For product changes, include multiple options/variants, tag and collection assignments, category hierarchy, and duplicate-handle/SKU failure cases.
- Update `docs/category-product/` schema and workflow documents when catalog persistence changes.
