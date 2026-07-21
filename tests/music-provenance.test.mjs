import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const AUDIO_EXTENSIONS = new Set([".aac", ".flac", ".m4a", ".mp3", ".ogg", ".opus", ".wav"]);

test("competition build does not bundle an inherited soundtrack", () => {
  const audioFiles = collectFiles(path.join(ROOT, "assets"))
    .filter((file) => AUDIO_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .map((file) => path.relative(ROOT, file));

  assert.deepEqual(audioFiles, []);
});

test("runtime does not reference the muse-infinity soundtrack", () => {
  const runtimeFiles = collectFiles([
    path.join(ROOT, "index.html"),
    path.join(ROOT, "server.mjs"),
    path.join(ROOT, "services"),
    path.join(ROOT, "shared"),
    path.join(ROOT, "src")
  ]).filter((file) => /\.(?:html|js|mjs)$/.test(file));

  const forbidden = [
    /assets\/audio\//i,
    /\bBackgroundMusic\b/,
    /\bpromenade\.ogg\b/i,
    /\bgymnopedie\.ogg\b/i,
    /\bclair-de-lune\.opus\b/i
  ];

  for (const file of runtimeFiles) {
    const source = fs.readFileSync(file, "utf8");
    for (const pattern of forbidden) {
      assert.doesNotMatch(source, pattern, `${path.relative(ROOT, file)} imports an unapproved soundtrack`);
    }
  }
});

function collectFiles(entries) {
  const pending = Array.isArray(entries) ? entries : [entries];
  const files = [];
  for (const entry of pending) {
    if (!fs.existsSync(entry)) continue;
    const stat = fs.lstatSync(entry);
    assert.equal(stat.isSymbolicLink(), false, `symlink is not allowed: ${entry}`);
    if (stat.isDirectory()) {
      files.push(...collectFiles(fs.readdirSync(entry).map((name) => path.join(entry, name))));
    } else {
      files.push(entry);
    }
  }
  return files;
}
