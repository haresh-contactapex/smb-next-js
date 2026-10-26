import test from "node:test";
import assert from "node:assert/strict";
import { findProductProblem } from "@/components/add-product/validation";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES, classifyMediaFile, uploadPendingFiles } from "@/components/add-product/mediaUpload";

const complete = (overrides = {}) => ({
  title: "Gold Ring",
  categories: ["Rings"],
  body_html: "<p>A ring.</p>",
  media: [{ type: "image", url: "/uploads/a.jpg", name: "a.jpg" }],
  price: "49.99",
  sku: "GR1",
  variants: [],
  ...overrides,
});
const fieldOf = (product) => findProductProblem(product)?.field ?? null;

test("a complete product has no problem", () => {
  assert.equal(findProductProblem(complete()), null);
  assert.equal(findProductProblem(complete({ variants: [{ price: "10", inventory_quantity: 0, image: null }] })), null);
});

test("problems are reported in page order, one at a time", () => {
  assert.equal(fieldOf(complete({ title: " ", categories: [], body_html: "", media: [], price: "", sku: "" })), "title");
  assert.equal(fieldOf(complete({ categories: [], body_html: "", media: [], price: "", sku: "" })), "category");
  assert.equal(fieldOf(complete({ body_html: "", media: [], price: "", sku: "" })), "description");
  assert.equal(fieldOf(complete({ media: [], price: "", sku: "" })), "media");
  assert.equal(fieldOf(complete({ price: "", sku: "" })), "price");
  assert.equal(fieldOf(complete({ sku: "  " })), "sku");
});

test("an empty-looking description is still empty", () => {
  for (const html of ["", "<p></p>", "<p><br></p>", "   "]) assert.equal(fieldOf(complete({ body_html: html })), "description", html);
  assert.equal(fieldOf(complete({ body_html: "<p>x</p>" })), null);
});

test("price must be above zero", () => {
  for (const price of ["", "0", "0.00", "-5", "abc"]) assert.equal(fieldOf(complete({ price })), "price", price);
  assert.equal(fieldOf(complete({ price: "0.01" })), null);
});

test("the price message uses the store money format", () => {
  const problem = findProductProblem(complete({ price: "" }), { formatMoney: (amount) => `$${amount.toFixed(2)}` });
  assert.equal(problem.message, "Enter a price greater than $0.00 before saving");
});

test("media that only exists as a browser preview is flagged until it is uploaded", () => {
  const dead = { type: "image", url: "blob:http://localhost/abc", name: "x.jpg" }; // no File: cannot be recovered
  assert.equal(fieldOf(complete({ media: [dead] })), "mediaMissing");
  const pending = { ...dead, file: { name: "x.jpg" } }; // still has its File, so it uploads on save
  assert.equal(fieldOf(complete({ media: [pending] })), null);
});

test("every variant needs a price above zero and a quantity", () => {
  const good = { price: "10", inventory_quantity: 2, image: null };
  const problem = findProductProblem(
    complete({ variants: [good, { price: "", inventory_quantity: 1 }, { price: "5", inventory_quantity: "" }, { price: "0", inventory_quantity: 0 }] })
  );
  assert.equal(problem.field, "variants");
  assert.deepEqual(problem.variantRowErrors, [
    { price: false, quantity: false },
    { price: true, quantity: false },
    { price: false, quantity: true },
    { price: true, quantity: false },
  ]);
  assert.equal(fieldOf(complete({ variants: [{ price: "10", inventory_quantity: 0 }] })), null); // 0 in stock is fine
});

test("a variant image that only exists as a preview is flagged", () => {
  const dead = { price: "10", inventory_quantity: 1, image: { url: "blob:http://localhost/v", name: "v.jpg" } };
  assert.equal(fieldOf(complete({ variants: [dead] })), "variantImages");
});

test("classifyMediaFile: images, video and 3D models only", () => {
  const file = (name, type = "") => ({ name, type });
  assert.equal(classifyMediaFile(file("a.jpg", "image/jpeg")), "image");
  assert.equal(classifyMediaFile(file("a.webp", "image/webp")), "image");
  assert.equal(classifyMediaFile(file("a.mp4", "video/mp4")), "video");
  assert.equal(classifyMediaFile(file("ring.GLB")), "model");
  assert.equal(classifyMediaFile(file("ring.usdz")), "model");
  for (const rejected of [file("a.svg", "image/svg+xml"), file("a.gif", "image/gif"), file("a.pdf", "application/pdf"), file("a.exe")]) {
    assert.equal(classifyMediaFile(rejected), null, rejected.name);
  }
  assert.equal(ALLOWED_IMAGE_TYPES.includes("image/svg+xml"), false);
  assert.equal(MAX_IMAGE_SIZE_BYTES, 5 * 1024 * 1024);
});

// ---- uploadPendingFiles, with fetch and URL.revokeObjectURL replaced ----
function withFakes(fn) {
  return async () => {
    const realFetch = globalThis.fetch;
    const realRevoke = URL.revokeObjectURL;
    const calls = { uploads: [], revoked: [] };
    URL.revokeObjectURL = (url) => calls.revoked.push(url);
    try {
      await fn(calls, (impl) => {
        globalThis.fetch = async (url, init) => {
          const name = init.body.get("file").name;
          calls.uploads.push(name);
          return impl(calls.uploads.length, name);
        };
      });
    } finally {
      globalThis.fetch = realFetch;
      URL.revokeObjectURL = realRevoke;
    }
  };
}
const reply = (body, ok = true) => ({ ok, json: async () => body });
const pendingItem = (name) => ({ type: "image", url: `blob:preview-${name}`, name, file: new File(["x"], name, { type: "image/png" }) });

test(
  "uploadPendingFiles stores each local file in order and swaps in the stored URL",
  withFakes(async (calls, fakeFetch) => {
    fakeFetch((n, name) => reply({ success: true, data: { url: `/uploads/${name}` } }));
    const library = { type: "image", url: "/uploads/old.jpg", name: "old.jpg" }; // already stored: untouched
    const product = {
      media: [pendingItem("a.png"), library, pendingItem("b.png")],
      variants: [{ sku: "V1", image: pendingItem("v.png") }, { sku: "V2", image: null }],
    };
    const next = await uploadPendingFiles(product);

    assert.deepEqual(calls.uploads, ["a.png", "b.png", "v.png"]);
    assert.deepEqual(next.media, [
      { type: "image", url: "/uploads/a.png", name: "a.png" },
      library,
      { type: "image", url: "/uploads/b.png", name: "b.png" },
    ]);
    assert.deepEqual(next.variants[0].image, { url: "/uploads/v.png", name: "v.png" });
    assert.equal(next.variants[1].image, null);
    assert.deepEqual(calls.revoked.sort(), ["blob:preview-a.png", "blob:preview-b.png", "blob:preview-v.png"]);
  })
);

test(
  "uploadPendingFiles keeps the previews when any upload fails",
  withFakes(async (calls, fakeFetch) => {
    fakeFetch((n) => (n === 2 ? reply({ success: false, error: "File too large" }, false) : reply({ success: true, data: { url: "/uploads/ok.png" } })));
    const product = { media: [pendingItem("a.png"), pendingItem("b.png")], variants: [] };
    await assert.rejects(uploadPendingFiles(product), /File too large/);
    assert.deepEqual(calls.revoked, []);
  })
);

test(
  "uploadPendingFiles explains a network failure and an unreadable answer",
  withFakes(async (calls, fakeFetch) => {
    fakeFetch(() => {
      throw new TypeError("Failed to fetch");
    });
    await assert.rejects(uploadPendingFiles({ media: [pendingItem("a.png")], variants: [] }), /Could not reach the server while uploading a\.png/);

    fakeFetch(() => ({ ok: false, json: async () => Promise.reject(new Error("not json")) }));
    await assert.rejects(uploadPendingFiles({ media: [pendingItem("b.png")], variants: [] }), /Failed to upload b\.png/);
  })
);

test(
  "uploadPendingFiles does nothing when nothing is pending",
  withFakes(async (calls, fakeFetch) => {
    fakeFetch(() => assert.fail("no upload expected"));
    const product = { media: [{ type: "image", url: "/uploads/a.jpg", name: "a" }], variants: [{ sku: "V", image: { url: "/uploads/v.jpg", name: "v" } }] };
    assert.deepEqual(await uploadPendingFiles(product), product);
  })
);
