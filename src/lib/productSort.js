// The ways a shopper can order the storefront product listing. Pure (no server
// imports) so the dropdown in the browser and the query on the server share one
// list: `value` is what travels in the `sort` query parameter.
//
//   featured     The store's own order. There is no hand-picked order yet, so this
//                is newest first, the same as the listing has always been.
//   relevance    Products offering more of the chosen metals come first; with no
//                metal chosen there is nothing to rank by, so it matches Featured.
//   bestselling  Units sold on orders that weren't cancelled, most first.
//   title-*      By name, ignoring case.
//   price-*      By the product's price.
//   date-*       By when the product was added.
//
// Every order ends with newest first, then id, so ties (and offset paging) stay stable.
export const PRODUCT_SORTS = [
  { value: "featured", label: "Featured" },
  { value: "relevance", label: "Most relevant" },
  { value: "bestselling", label: "Best selling" },
  { value: "title-asc", label: "Alphabetically, A-Z" },
  { value: "title-desc", label: "Alphabetically, Z-A" },
  { value: "price-asc", label: "Price, low to high" },
  { value: "price-desc", label: "Price, high to low" },
  { value: "date-asc", label: "Date, old to new" },
  { value: "date-desc", label: "Date, new to old" },
];

export const DEFAULT_PRODUCT_SORT = "featured";

export function isProductSort(value) {
  return PRODUCT_SORTS.some((sort) => sort.value === value);
}
