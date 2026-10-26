// Helpers for tests that replace modules with node:test's mock.module().
import { mock } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

// The file URL of src/lib/<name>.js, which is how mock.module() identifies a module that the
// code under test imports as "./<name>".
export const lib = (name) => pathToFileURL(fileURLToPath(new URL(`../src/lib/${name}.js`, import.meta.url))).href;

// Node 24 names the option `exports` (and deprecates `namedExports`); Node 22, which CI runs, only
// knows `namedExports`.
const EXPORTS_OPTION = Number(process.versions.node.split(".")[0]) >= 24 ? "exports" : "namedExports";

// Replaces src/lib/<name>.js with a module exporting exactly `exports`.
export function mockLib(name, exports) {
  return mock.module(lib(name), { [EXPORTS_OPTION]: exports });
}
