import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const components = fileURLToPath(new URL("../src/components/", import.meta.url));

// Every feature folder reaches the notification through the shared one, so a change to its look or
// timing happens once. A folder may keep its own Toast.js only if it is a genuinely different design.
const OWN_DESIGNS = new Set([
  "ui", // the shared toast
  "all-products", // bottom-right "deleted" confirmation
  "settings-shared", // plain dark pill
  "settings-products", // short-lived variant without an error progress bar
  "auth", // storefront variant without an error progress bar
]);

test("a feature folder's Toast.js is a re-export of a shared one, not another copy", () => {
  const copies = [];
  for (const dir of readdirSync(components, { withFileTypes: true })) {
    if (!dir.isDirectory() || OWN_DESIGNS.has(dir.name)) continue;
    let source;
    try {
      source = readFileSync(path.join(components, dir.name, "Toast.js"), "utf8");
    } catch {
      continue;
    }
    const lines = source.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith("//"));
    // A stub is a re-export or a thin wrapper around the shared component.
    if (lines.length > 8 || !/(ui\/Toast|\.\.\/[a-z-]+\/Toast)/.test(source)) copies.push(dir.name);
  }
  assert.deepEqual(copies, []);
});

test("pages that use useToast do not also keep their own toast timer", () => {
  const leftovers = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.name.endsWith(".js") && entry.name !== "useToast.js") {
        const source = readFileSync(file, "utf8");
        if (source.includes("useToast(") && /toastTimerRef|setToast\(/.test(source)) leftovers.push(path.relative(components, file));
      }
    }
  };
  walk(components);
  assert.deepEqual(leftovers, []);
});
