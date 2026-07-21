import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const APPROVED = Object.freeze({
  "assets/audio/clair-de-lune.opus": "84040bf8138e81aca757501a342ada6fd12d594e75d322288cafd5c86a0aee1b",
  "assets/audio/gymnopedie.ogg": "419e37656856224227086df32d6d481a00a738961e08fca9f6147e472beea53e",
  "assets/audio/promenade.ogg": "7103f5376e8f939dbb80d6fba89bf1c5e984a951139499af2b692e3589c429c4"
});
const AUDIO_EXTENSIONS = new Set([".aac", ".flac", ".m4a", ".mp3", ".ogg", ".opus", ".wav"]);

test("competition build bundles only the three reviewed public-domain recordings", () => {
  const audioFiles = collectFiles(path.join(ROOT, "assets"))
    .filter((file) => AUDIO_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .map((file) => path.relative(ROOT, file))
    .sort();

  assert.deepEqual(audioFiles, Object.keys(APPROVED).sort());
  for (const relative of audioFiles) {
    const digest = crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, relative))).digest("hex");
    assert.equal(digest, APPROVED[relative], relative);
  }
});

test("runtime and notices reference every reviewed recording without an untracked path", () => {
  const runtime = fs.readFileSync(path.join(ROOT, "src/services/sound-experience.js"), "utf8");
  const notices = fs.readFileSync(path.join(ROOT, "THIRD_PARTY_NOTICES.md"), "utf8");
  for (const relative of Object.keys(APPROVED)) {
    assert.match(runtime, new RegExp(relative.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace("assets/", "assets/")));
    assert.match(notices, new RegExp(path.basename(relative).replaceAll(".", "\\.")));
  }
  assert.match(notices, /public-domain instrumental recordings/i);
  assert.match(notices, /Wikimedia/i);
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
