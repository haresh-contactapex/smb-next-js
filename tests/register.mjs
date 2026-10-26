// Lets node:test load src/ modules as they are: resolves the "@/" alias to src/ and the
// extensionless relative imports Next.js allows. Used via `node --import ./tests/register.mjs`.
import { register } from "node:module";

register("./alias-hooks.mjs", import.meta.url);
