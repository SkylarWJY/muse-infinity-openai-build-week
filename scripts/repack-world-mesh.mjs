import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const [, , inputPath, outputPath, qualityValue = "88"] = process.argv;

if (!inputPath || !outputPath) {
  throw new Error("usage: node scripts/repack-world-mesh.mjs INPUT.glb OUTPUT.glb [jpeg-quality]");
}

const JPEG_QUALITY = Number(qualityValue);
if (!Number.isInteger(JPEG_QUALITY) || JPEG_QUALITY < 1 || JPEG_QUALITY > 100) {
  throw new Error("jpeg-quality must be an integer from 1 to 100");
}

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;
const align4 = (value) => (value + 3) & ~3;

const input = await fs.readFile(inputPath);
const { json, binary } = parseGlb(input);
const imageIndex = json.images?.findIndex((image) => image.mimeType === "image/png" && Number.isInteger(image.bufferView));
if (imageIndex == null || imageIndex < 0) throw new Error("embedded_png_not_found");

const image = json.images[imageIndex];
const view = json.bufferViews?.[image.bufferView];
if (!view || (view.buffer ?? 0) !== 0) throw new Error("unsupported_image_buffer_view");

const start = view.byteOffset || 0;
const oldLength = view.byteLength;
const oldPaddedLength = align4(oldLength);
const suffixStart = start + oldPaddedLength;
if (suffixStart > binary.length) throw new Error("invalid_image_buffer_range");

for (const [index, candidate] of (json.bufferViews || []).entries()) {
  if (index === image.bufferView || (candidate.buffer ?? 0) !== 0) continue;
  const candidateStart = candidate.byteOffset || 0;
  const candidateEnd = candidateStart + candidate.byteLength;
  if (candidateStart < suffixStart && candidateEnd > start) throw new Error("overlapping_buffer_view");
}

const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "muse-world-mesh-"));
try {
  const pngPath = path.join(tempDirectory, "texture.png");
  const jpegPath = path.join(tempDirectory, "texture.jpg");
  await fs.writeFile(pngPath, binary.subarray(start, start + oldLength));
  await execFileAsync("/usr/bin/sips", ["-s", "format", "jpeg", "-s", "formatOptions", String(JPEG_QUALITY), pngPath, "--out", jpegPath]);
  const jpeg = await fs.readFile(jpegPath);
  const jpegPaddedLength = align4(jpeg.length);
  const jpegPadding = Buffer.alloc(jpegPaddedLength - jpeg.length);
  const suffix = binary.subarray(suffixStart);
  const repackedBinary = Buffer.concat([binary.subarray(0, start), jpeg, jpegPadding, suffix]);
  const delta = jpegPaddedLength - oldPaddedLength;

  for (const [index, candidate] of json.bufferViews.entries()) {
    if (index === image.bufferView || (candidate.buffer ?? 0) !== 0) continue;
    const candidateStart = candidate.byteOffset || 0;
    if (candidateStart >= suffixStart) candidate.byteOffset = candidateStart + delta;
  }
  view.byteLength = jpeg.length;
  image.mimeType = "image/jpeg";
  json.buffers[0].byteLength = repackedBinary.length;

  const output = buildGlb(json, repackedBinary);
  await fs.mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
  await fs.writeFile(outputPath, output);
  process.stdout.write(`${path.basename(inputPath)}: ${input.length} -> ${output.length} bytes; texture ${oldLength} -> ${jpeg.length} bytes at ${JPEG_QUALITY}%\n`);
} finally {
  await fs.rm(tempDirectory, { recursive: true, force: true });
}

function parseGlb(buffer) {
  if (buffer.readUInt32LE(0) !== GLB_MAGIC || buffer.readUInt32LE(4) !== 2) throw new Error("invalid_glb");
  const declaredLength = buffer.readUInt32LE(8);
  if (declaredLength !== buffer.length) throw new Error("invalid_glb_length");
  let offset = 12;
  let json;
  let binary;
  while (offset < buffer.length) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    const chunk = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === JSON_CHUNK) json = JSON.parse(chunk.toString("utf8").trimEnd());
    if (type === BIN_CHUNK) binary = chunk;
    offset += 8 + length;
  }
  if (!json || !binary) throw new Error("missing_glb_chunks");
  return { json, binary };
}

function buildGlb(json, binary) {
  const jsonBytes = Buffer.from(JSON.stringify(json));
  const jsonChunk = Buffer.alloc(align4(jsonBytes.length), 0x20);
  jsonBytes.copy(jsonChunk);
  const binaryChunk = binary.length % 4 === 0 ? binary : Buffer.concat([binary, Buffer.alloc(align4(binary.length) - binary.length)]);
  const totalLength = 12 + 8 + jsonChunk.length + 8 + binaryChunk.length;
  const output = Buffer.allocUnsafe(totalLength);
  output.writeUInt32LE(GLB_MAGIC, 0);
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(totalLength, 8);
  output.writeUInt32LE(jsonChunk.length, 12);
  output.writeUInt32LE(JSON_CHUNK, 16);
  jsonChunk.copy(output, 20);
  const binaryHeader = 20 + jsonChunk.length;
  output.writeUInt32LE(binaryChunk.length, binaryHeader);
  output.writeUInt32LE(BIN_CHUNK, binaryHeader + 4);
  binaryChunk.copy(output, binaryHeader + 8);
  return output;
}
