// Node module hooks so tests can import the app's TypeScript directly:
//   "@/…"          → project root (tries .ts, .tsx, /index.ts)
//   "server-only"  → empty module
//   "@/lib/db"     → in-memory Postgres (tests/pglite-db.ts) instead of Neon
import { statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function isFile(p) {
  try { return statSync(p).isFile(); } catch { return false; }
}

function withExt(p) {
  for (const c of [p, `${p}.ts`, `${p}.tsx`, path.join(p, "index.ts")]) if (isFile(c)) return c;
  return null;
}

export async function resolve(specifier, context, next) {
  if (specifier === "server-only") return { url: "data:text/javascript,export {}", shortCircuit: true };
  if (specifier === "@/lib/db") return { url: pathToFileURL(path.join(root, "tests/pglite-db.ts")).href, shortCircuit: true };
  if (specifier.startsWith("@/")) {
    const file = withExt(path.join(root, specifier.slice(2)));
    if (file) return { url: pathToFileURL(file).href, shortCircuit: true, format: "module-typescript" };
  }
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    const file = withExt(path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier));
    if (file && file.endsWith(".ts")) return { url: pathToFileURL(file).href, shortCircuit: true, format: "module-typescript" };
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  // App .ts files use ESM syntax but the package isn't "type": "module".
  if (url.endsWith(".ts")) return next(url, { ...context, format: "module-typescript" });
  return next(url, context);
}
