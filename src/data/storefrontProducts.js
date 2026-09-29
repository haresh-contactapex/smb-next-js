// Sample listing shown on the storefront until the catalog has active
// products (or when the database is unreachable, e.g. a fresh checkout).
const BASE = "/storefront";

export const sampleStorefrontProducts = [
  { id: "demo-1", title: "U-prong wedding band", price: 1620 },
  { id: "demo-2", title: "Straight diamond wedding band for women", price: 2136 },
  { id: "demo-3", title: "Classic Round diamond wedding band for women", price: 5340 },
  { id: "demo-4", title: "Twisted Women's Wedding Band with Diamonds", price: 1188 },
  { id: "demo-5", title: "U-prong wedding band", price: 1620 },
  { id: "demo-6", title: "Straight diamond wedding band for women", price: 2136 },
  { id: "demo-7", title: "Classic Round diamond wedding band for women", price: 5340 },
  { id: "demo-8", title: "Twisted Women's Wedding Band with Diamonds", price: 1188 },
].map((product, index) => ({
  ...product,
  image: `${BASE}/demo${index + 1}.png`,
  hoverImage: `${BASE}/demo${index + 1}-hover.png`,
}));
