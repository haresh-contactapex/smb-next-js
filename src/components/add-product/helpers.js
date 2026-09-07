/**
 * Pure helpers behind the Add Product form, ported 1:1 from the
 * admin-dashboard-template add-product.html prototype's inline script.
 */

export function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function toNumber(str) {
  const n = parseFloat(String(str).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
}

export function fmtMoney(n) {
  return "$" + n.toFixed(2);
}

export function stripHtml(html) {
  return html ? html.replace(/<[^>]*>/g, "") : "";
}

export function cartesian(arrays) {
  return arrays.reduce((acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])), [[]]);
}

export function variantKey(optionsObj, orderedNames) {
  return orderedNames.map((n) => `${n}:${optionsObj[n]}`).join("|");
}

export function regenerateVariants(options, existingVariants, handle) {
  const validOptions = options.filter((o) => o.name && o.values.length);
  const orderedNames = validOptions.map((o) => o.name);

  const oldByKey = {};
  existingVariants.forEach((v) => {
    oldByKey[variantKey(v.options, Object.keys(v.options))] = v;
  });

  let combos;
  if (validOptions.length === 0) {
    combos = [];
  } else {
    const valueSets = validOptions.map((o) => o.values.map((v) => [o.name, v]));
    combos = cartesian(valueSets).map((pairs) => Object.fromEntries(pairs));
  }

  const handleUpper = (handle || "product").toUpperCase();
  return combos.map((combo, i) => {
    const key = variantKey(combo, orderedNames);
    const existing = oldByKey[key];
    return (
      existing || {
        id: "variant_" + String(i + 1).padStart(3, "0"),
        options: combo,
        price: "",
        compare_at_price: "",
        sku: `${handleUpper}-${i + 1}`,
        inventory_quantity: 0,
        inventory_management: true,
        weight: "",
        weight_unit: "kg",
      }
    );
  });
}

export function buildProductFromData(data = {}) {
  const title = data.title || "";
  const handle = data.handle || slugify(title);
  const options = (data.options || []).map((o) => ({ ...o, values: [...o.values] }));
  let variants = regenerateVariants(options, [], handle);

  if (data.variantDefaults) {
    variants = variants.map((v) => ({
      ...v,
      price: data.variantDefaults.price ?? v.price,
      inventory_quantity: data.variantDefaults.inventory_quantity ?? v.inventory_quantity,
      weight: data.variantDefaults.weight ?? v.weight,
      weight_unit: data.variantDefaults.weight_unit ?? v.weight_unit,
    }));
  }

  return {
    title,
    body_html: data.body_html || "",
    product_type: data.product_type || "",
    category: data.category || "",
    collections: [...(data.collections || [])],
    tags: [...(data.tags || [])],
    handle,
    handleTouched: !!data.handle,
    status: data.status || "ACTIVE",
    price: data.price || "",
    compare_at_price: data.compare_at_price || "",
    charge_tax: data.charge_tax !== undefined ? data.charge_tax : true,
    cost_per_item: data.cost_per_item || "",
    track_quantity: data.track_quantity !== undefined ? data.track_quantity : true,
    sku: data.sku || "",
    barcode: data.barcode || "",
    physical_product: data.physical_product !== undefined ? data.physical_product : true,
    weight: data.weight !== undefined && data.weight !== "" ? String(data.weight) : "",
    weight_unit: data.weight_unit || "kg",
    hs_code: data.hs_code || "",
    options,
    variants,
    seo: { title: data.seo?.title || "", description: data.seo?.description || "" },
    media: (data.media || []).map((m) => ({ ...m })),
  };
}

export function assembleProduct(product) {
  const price = toNumber(product.price);
  const cost = toNumber(product.cost_per_item);
  return {
    id: "product_" + Date.now().toString(36),
    title: product.title,
    body_html: product.body_html,
    product_type: product.product_type,
    category: product.category,
    collections: product.collections,
    tags: product.tags,
    handle: product.handle,
    status: product.status,
    pricing: {
      price: product.price,
      compare_at_price: product.compare_at_price,
      charge_tax: product.charge_tax,
      cost_per_item: product.cost_per_item,
      profit: Number((price - cost).toFixed(2)),
      margin_percent: price > 0 ? Number((((price - cost) / price) * 100).toFixed(1)) : 0,
    },
    inventory: {
      track_quantity: product.track_quantity,
      sku: product.sku,
      barcode: product.barcode,
    },
    shipping: {
      physical_product: product.physical_product,
      weight: product.weight === "" ? "" : Number(product.weight),
      weight_unit: product.weight_unit,
      hs_code: product.hs_code,
    },
    options: product.options
      .filter((o) => o.name && o.values.length)
      .map((o) => ({ id: o.id, name: o.name, values: o.values })),
    variants: product.variants.map((v) => ({
      id: v.id,
      options: v.options,
      price: v.price,
      compare_at_price: v.compare_at_price,
      sku: v.sku,
      inventory_quantity: Number(v.inventory_quantity) || 0,
      inventory_management: !!v.inventory_management,
      weight: v.weight === "" ? "" : Number(v.weight),
      weight_unit: v.weight_unit,
    })),
    seo: {
      title: product.seo.title || product.title,
      description: product.seo.description || stripHtml(product.body_html).slice(0, 160),
    },
    media: product.media.map((m) => ({ type: m.type, url: m.url, name: m.name })),
  };
}
