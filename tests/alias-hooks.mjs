import { existsSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const SRC = fileURLToPath(new URL("../src/", import.meta.url));

function withExtension(file) {
  for (const candidate of [file, `${file}.js`, path.join(file, "index.js")]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return pathToFileURL(candidate).href;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  const parent = context.parentURL?.startsWith("file:") ? fileURLToPath(context.parentURL) : null;
  let file = null;
  if (specifier.startsWith("@/")) file = path.join(SRC, specifier.slice(2));
  else if (parent?.startsWith(SRC) && specifier.startsWith(".")) file = path.resolve(path.dirname(parent), specifier);
  const url = file && withExtension(file);
  return url ? { url, shortCircuit: true } : nextResolve(specifier, context);
}
