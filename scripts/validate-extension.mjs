import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const manifest = JSON.parse(read("manifest.json"));

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(manifest.manifest_version === 3, "manifest.json must use Manifest V3");
assert(manifest.action?.default_popup, "A default popup must be configured");
assert(manifest.background?.service_worker, "A service worker must be configured");

const referencedFiles = new Set([
  "content.js",
  manifest.action.default_popup,
  manifest.background.service_worker,
  ...Object.values(manifest.icons || {}),
]);

const popupHtml = read(manifest.action.default_popup);
for (const match of popupHtml.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const reference = match[1];
  if (!reference.includes(":") && !reference.startsWith("#")) {
    referencedFiles.add(reference);
  }
}

for (const file of referencedFiles) {
  assert(existsSync(join(root, file)), `Referenced extension file is missing: ${file}`);
}

const ids = [...popupHtml.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
assert(duplicateIds.length === 0, `Duplicate popup IDs: ${duplicateIds.join(", ")}`);
const popupJs = read("popup.js");
const referencedIds = [
  ...popupJs.matchAll(/getElementById\(["']([^"']+)["']\)/g),
].map((match) => match[1]);
const missingIds = [...new Set(referencedIds)].filter((id) => !ids.includes(id));
assert(missingIds.length === 0, `Missing popup IDs: ${missingIds.join(", ")}`);
assert(
  !/<script[^>]+src="https?:/i.test(popupHtml),
  "Manifest V3 extensions must not load remote scripts"
);
assert(
  !manifest.content_scripts,
  "The page helper should be injected on demand, not on every website"
);
assert(
  !manifest.host_permissions,
  "Persistent host permissions are not needed when using activeTab"
);

console.log(`Extension validation passed (${referencedFiles.size} referenced files).`);
