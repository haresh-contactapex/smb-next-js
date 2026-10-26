// The product data layer, split by job. Importers keep using "@/lib/products".
//   productSave.js      create, update and delete (validation, the transaction, child rows)
//   productTaxonomy.js  categories, tags and collections (find-or-create)
//   productQueries.js   the admin's list, search and edit-form reads
//   productsStorefront.js  what the public storefront reads
export { ProductError, createProduct, updateProduct, deleteProduct, deleteProducts } from "./productSave";
export { upsertCategoryPath, upsertTags, upsertCollections } from "./productTaxonomy";
export { listProducts, searchProducts, getProductById } from "./productQueries";
export * from "./productsStorefront";
