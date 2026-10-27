import fs from "node:fs";
import path from "node:path";
import { en } from "../src/i18n/en.js";
import { bn } from "../src/i18n/bn.js";

const SRC = path.resolve("src");
const extensions = new Set([".js", ".jsx", ".ts", ".tsx"]);
const ignored = new Set(["en.js", "bn.js"]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (extensions.has(path.extname(entry.name)) && !ignored.has(entry.name)) out.push(full);
  }
  return out;
}

function clean(value) {
  return value.replace(/\\(['"`])/g, "$1").replace(/\\n/g, " ").trim();
}

const candidates = new Map();
const files = walk(SRC);

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const relative = path.relative(process.cwd(), file);

  // JSX text: <button>Save</button>
  for (const match of source.matchAll(/>([^<>\n{}]{2,120})</g)) {
    const text = clean(match[1]);
    if (!text || /^[\s\d\W_]+$/.test(text)) continue;
    if (/^[A-Za-z0-9_./:-]+$/.test(text) && !text.includes(" ")) continue;
    candidates.set(text, [...(candidates.get(text) || []), relative]);
  }

  // Quoted strings. This intentionally produces candidates for review rather than
  // blindly changing source code, because URLs, API paths and CSS classes can also be strings.
  for (const match of source.matchAll(/(['"`])((?:\\.|(?!\1).){2,160})\1/gs)) {
    const text = clean(match[2]);
    if (!text || text.includes("=>") || /^(https?:\/\/|\/api\/|#|\.|\.\/)/.test(text)) continue;
    if (!/[A-Za-z]/.test(text)) continue;
    if (/^(use[A-Z]|[A-Za-z]+\.[A-Za-z]+|[A-Za-z0-9_-]+)$/.test(text)) continue;
    candidates.set(text, [...(candidates.get(text) || []), relative]);
  }
}

const missingEn = [...candidates.entries()]
  .filter(([text]) => !(text in en))
  .sort(([a], [b]) => a.localeCompare(b));
const missingBn = Object.keys(en).filter((key) => !(key in bn));

console.log(`Scanned ${files.length} source files.`);
console.log(`English dictionary keys: ${Object.keys(en).length}`);
console.log(`Bangla dictionary keys:  ${Object.keys(bn).length}`);
console.log(`Missing Bangla keys:     ${missingBn.length}`);

if (missingBn.length) {
  console.log("\nMissing Bangla keys:");
  for (const key of missingBn) console.log(`- ${key}`);
}

console.log(`\nPotential hard-coded UI strings not yet in English dictionary: ${missingEn.length}`);
for (const [text, locations] of missingEn) {
  const unique = [...new Set(locations)].slice(0, 3).join(", ");
  console.log(`- ${text}  [${unique}]`);
}

if (missingBn.length || missingEn.length) process.exitCode = 1;
