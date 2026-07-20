import fs from "node:fs/promises";
import path from "node:path";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

globalThis.ProgressEvent ??= class ProgressEvent {
  constructor(type, init = {}) {
    Object.assign(this, { type }, init);
  }
};

const [inputArgument, outputArgument] = process.argv.slice(2);
if (!inputArgument || !outputArgument) {
  throw new Error("usage: node scripts/normalize-learner-skin-weights.mjs <input.glb> <output.glb>");
}

const inputPath = path.resolve(inputArgument);
const outputPath = path.resolve(outputArgument);
if (inputPath === outputPath) throw new Error("output_path_must_differ_from_input");

const data = await fs.readFile(inputPath);
const { json, binOffset } = parseGlb(data);
const loader = new GLTFLoader();
loader.register(() => ({ name: "MUSE_NORMALIZE_SKIP_TEXTURES", loadTexture: async () => new THREE.Texture() }));
const gltf = await loader.parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), "");
const meshes = [];
gltf.scene.traverse((object) => {
  if (object.isSkinnedMesh) meshes.push(object);
});
if (meshes.length !== 1) throw new Error(`expected_one_skinned_mesh:${meshes.length}`);

const mesh = meshes[0];
mesh.skeleton.pose();
gltf.scene.updateMatrixWorld(true);
mesh.skeleton.update();
const vertices = skinnedVertices(mesh);
const bounds = vertexBounds(vertices);
const height = bounds.max.y - bounds.min.y;
const centerZ = (bounds.min.z + bounds.max.z) / 2;
const legJoints = new Set(mesh.skeleton.bones
  .map((bone, index) => ({ name: bone.name, index }))
  .filter(({ name }) => /^(?:L|R)_(?:Thigh|Calf|Foot|Toe)/.test(name))
  .map(({ index }) => index));
const skinIndex = mesh.geometry.getAttribute("skinIndex");
const skinWeight = mesh.geometry.getAttribute("skinWeight");
const changes = [];

for (let vertex = 0; vertex < skinIndex.count; vertex += 1) {
  const y = vertices[vertex * 3 + 1];
  const z = vertices[vertex * 3 + 2];
  const upperBody = y > bounds.min.y + 0.667 * height
    || (y > bounds.min.y + 0.306 * height && Math.abs(z - centerZ) > 0.139 * height);
  if (!upperBody) continue;

  const joints = [skinIndex.getX(vertex), skinIndex.getY(vertex), skinIndex.getZ(vertex), skinIndex.getW(vertex)];
  const weights = [skinWeight.getX(vertex), skinWeight.getY(vertex), skinWeight.getZ(vertex), skinWeight.getW(vertex)];
  let removed = 0;
  for (let slot = 0; slot < weights.length; slot += 1) {
    if (!legJoints.has(joints[slot]) || weights[slot] <= 0) continue;
    removed += weights[slot];
    weights[slot] = 0;
  }
  if (!removed) continue;
  const remaining = weights.reduce((sum, weight) => sum + weight, 0);
  if (remaining <= 0) throw new Error(`cannot_normalize_vertex:${vertex}`);
  const normalized = weights.map((weight) => weight / remaining);
  changes.push({ vertex, removed, joints, weights: normalized });
}

const primitive = json.meshes.flatMap((entry) => entry.primitives)[0];
const accessorIndex = primitive?.attributes?.WEIGHTS_0;
const accessor = json.accessors?.[accessorIndex];
const view = json.bufferViews?.[accessor?.bufferView];
if (!accessor || !view || accessor.componentType !== 5126 || accessor.type !== "VEC4" || accessor.count !== skinWeight.count) {
  throw new Error("unsupported_weight_accessor");
}
const output = Buffer.from(data);
const stride = view.byteStride || 16;
const baseOffset = binOffset + (view.byteOffset || 0) + (accessor.byteOffset || 0);
for (const change of changes) {
  const offset = baseOffset + change.vertex * stride;
  change.weights.forEach((weight, slot) => output.writeFloatLE(weight, offset + slot * 4));
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, output);
process.stdout.write(`${JSON.stringify({
  input: path.relative(process.cwd(), inputPath),
  output: path.relative(process.cwd(), outputPath),
  affectedVertices: changes.length,
  maximumRemovedWeight: Math.max(0, ...changes.map((change) => change.removed)),
  vertices: changes.map((change) => change.vertex)
}, null, 2)}\n`);

function parseGlb(buffer) {
  if (buffer.toString("ascii", 0, 4) !== "glTF" || buffer.readUInt32LE(4) !== 2) throw new Error("invalid_glb");
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength).replace(/\0+$/, "").trim());
  const binHeader = 20 + jsonLength;
  if (buffer.toString("ascii", binHeader + 4, binHeader + 8) !== "BIN\0") throw new Error("missing_bin_chunk");
  return { json, binOffset: binHeader + 8 };
}

function skinnedVertices(mesh) {
  const position = mesh.geometry.getAttribute("position");
  const vertices = new Float32Array(position.count * 3);
  const target = new THREE.Vector3();
  for (let vertex = 0; vertex < position.count; vertex += 1) {
    target.fromBufferAttribute(position, vertex);
    mesh.applyBoneTransform(vertex, target).applyMatrix4(mesh.matrixWorld);
    vertices.set([target.x, target.y, target.z], vertex * 3);
  }
  return vertices;
}

function vertexBounds(vertices) {
  const bounds = { min: { x: Infinity, y: Infinity, z: Infinity }, max: { x: -Infinity, y: -Infinity, z: -Infinity } };
  for (let index = 0; index < vertices.length; index += 3) {
    bounds.min.x = Math.min(bounds.min.x, vertices[index]); bounds.max.x = Math.max(bounds.max.x, vertices[index]);
    bounds.min.y = Math.min(bounds.min.y, vertices[index + 1]); bounds.max.y = Math.max(bounds.max.y, vertices[index + 1]);
    bounds.min.z = Math.min(bounds.min.z, vertices[index + 2]); bounds.max.z = Math.max(bounds.max.z, vertices[index + 2]);
  }
  return bounds;
}
