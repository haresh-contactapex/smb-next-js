/**
 * Reference data for the Add Product form, ported from the
 * admin-dashboard-template add-product.html prototype.
 */

export const TAXONOMY = [
  "Jewelry > Rings > Wedding Bands",
  "Jewelry > Rings > Diamond Rings",
  "Jewelry > Rings > Men's Bands",
  "Jewelry > Rings > Engagement Rings",
  "Jewelry > Necklaces > Chains",
  "Jewelry > Necklaces > Pendants",
  "Jewelry > Earrings > Studs",
  "Jewelry > Earrings > Hoops",
  "Jewelry > Bracelets",
  "Accessories > Watches",
  "Accessories > Cufflinks",
  "Accessories > Gift Boxes",
];

export const COLLECTIONS = [
  "Wedding Bands",
  "Diamond Rings",
  "Men's Bands",
  "Accessories",
  "New Arrivals",
  "Best Sellers",
  "Sale",
  "Engagement Collection",
];

export const SAMPLE = {
  title: "Classic Leather Backpack",
  body_html:
    "\n<p>A premium everyday leather backpack designed for work, travel, and everyday use.</p>\n<p>Features a spacious interior, padded laptop compartment, adjustable shoulder straps, and durable metal hardware.</p>\n",
  product_type: "Backpacks",
  category: "Accessories > Gift Boxes",
  vendor: "Example Brand",
  collections: ["New Arrivals", "Best Sellers"],
  tags: ["leather", "backpack", "travel", "test"],
  handle: "classic-leather-backpack",
  status: "ACTIVE",
  publishing: { online_store: true, pos: true, shop: true },
  price: "149.00",
  compare_at_price: "189.00",
  charge_tax: true,
  cost_per_item: "62.00",
  track_quantity: true,
  sku: "BAG-CLB-BLK",
  barcode: "123456789012",
  locations: [
    { name: "Shop location", available: 18 },
    { name: "Warehouse", available: 42 },
  ],
  physical_product: true,
  weight: "1.2",
  weight_unit: "kg",
  hs_code: "4202.92",
  country_of_origin: "IT",
  options: [
    { id: "attr_color", name: "Color", values: ["Black", "Brown"] },
    { id: "attr_size", name: "Size", values: ["Small", "Medium", "Large"] },
  ],
  seo: {
    title: "Classic Leather Backpack | Premium Travel Bag",
    description:
      "Shop our premium classic leather backpack. Durable, stylish and designed for work, travel and everyday use.",
  },
  media: [
    {
      type: "image",
      url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=80",
      name: "backpack-front.jpg",
    },
  ],
  variantDefaults: { price: "149.00", inventory_quantity: 10, weight: 1.2, weight_unit: "kg" },
};

export const COUNTRY_OPTIONS = [
  { value: "", label: "Select country/region" },
  { value: "US", label: "United States" },
  { value: "IN", label: "India" },
  { value: "CN", label: "China" },
  { value: "IT", label: "Italy" },
  { value: "GB", label: "United Kingdom" },
  { value: "DE", label: "Germany" },
  { value: "VN", label: "Vietnam" },
  { value: "TR", label: "Turkey" },
  { value: "MX", label: "Mexico" },
  { value: "BR", label: "Brazil" },
];

export const WEIGHT_UNITS = ["kg", "g", "lb", "oz"];

export const DEFAULT_PRODUCT_SEED = {
  title: "",
  options: [],
  tags: [],
  collections: [],
  media: [],
  seo: {},
};
