import fs from "node:fs/promises";
import path from "node:path";
import { SpzReader, SpzWriter } from "@sparkjsdev/spark";

const [, , inputPath, outputPath, requestedCount] = process.argv;

if (!inputPath || !outputPath || !requestedCount) {
  console.error("Usage: node scripts/downsample-spz.mjs <input.spz> <output.spz> <target-splats>");
  process.exitCode = 1;
} else {
  await downsampleSpz(inputPath, outputPath, Number(requestedCount));
}

async function downsampleSpz(input, output, target) {
  if (!Number.isInteger(target) || target < 1) throw new Error("target_splats_must_be_a_positive_integer");

  const sourceBytes = await fs.readFile(input);
  const reader = new SpzReader({ fileBytes: sourceBytes });
  await reader.parseHeader();
  if (reader.flagLod) throw new Error("lod_spz_is_not_supported");

  const outputCount = Math.min(target, reader.numSplats);
  const scaleCompensation = Math.sqrt(reader.numSplats / outputCount);
  const sourceToOutput = new Int32Array(reader.numSplats);
  sourceToOutput.fill(-1);
  for (let outputIndex = 0; outputIndex < outputCount; outputIndex += 1) {
    const sourceIndex = Math.floor(((outputIndex + 0.5) * reader.numSplats) / outputCount);
    sourceToOutput[sourceIndex] = outputIndex;
  }

  const writer = new SpzWriter({
    numSplats: outputCount,
    shDegree: reader.shDegree,
    fractionalBits: reader.fractionalBits,
    flagAntiAlias: reader.flagAntiAlias
  });
  const selected = (sourceIndex, callback) => {
    const outputIndex = sourceToOutput[sourceIndex];
    if (outputIndex >= 0) callback(outputIndex);
  };

  await reader.parseSplats(
    (index, x, y, z) => selected(index, (outputIndex) => writer.setCenter(outputIndex, x, y, z)),
    (index, alpha) => selected(index, (outputIndex) => writer.setAlpha(outputIndex, alpha)),
    (index, r, g, b) => selected(index, (outputIndex) => writer.setRgb(outputIndex, r, g, b)),
    (index, x, y, z) => selected(index, (outputIndex) => writer.setScale(
      outputIndex,
      x * scaleCompensation,
      y * scaleCompensation,
      z * scaleCompensation
    )),
    (index, x, y, z, w) => selected(index, (outputIndex) => writer.setQuat(outputIndex, x, y, z, w)),
    (index, sh1, sh2, sh3) => selected(index, (outputIndex) => writer.setSh(outputIndex, sh1, sh2, sh3))
  );

  const optimized = await writer.finalize();
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, optimized);
  console.log(JSON.stringify({
    input,
    output,
    sourceSplats: reader.numSplats,
    outputSplats: outputCount,
    scaleCompensation,
    bytes: optimized.byteLength,
    clipped: writer.clippedCount
  }));
}
