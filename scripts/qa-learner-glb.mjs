import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

globalThis.ProgressEvent ??= class ProgressEvent {
  constructor(type, init = {}) {
    Object.assign(this, { type }, init);
  }
};

const CROSS_REGION_WEIGHT_EPSILON = 0.0001;
const OPPOSITE_LEG_WEIGHT_LIMIT = 0.005;

const args = process.argv.slice(2);
const assetPath = path.resolve(args[0] || "assets/characters/learner.glb");
const jsonIndex = args.indexOf("--json");
const outputPath = jsonIndex >= 0 ? path.resolve(args[jsonIndex + 1]) : null;
const report = await analyze(assetPath);
const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (outputPath) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, serialized);
}
process.stdout.write(serialized);
if (!report.pass) process.exitCode = 1;

async function analyze(file) {
  const data = await fs.readFile(file);
  const loader = new GLTFLoader();
  loader.register(() => ({ name: "MUSE_QA_SKIP_TEXTURES", loadTexture: async () => new THREE.Texture() }));
  const gltf = await loader.parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), "");
  const meshes = [];
  gltf.scene.traverse((object) => {
    if (object.isSkinnedMesh) meshes.push(object);
  });
  const hardFindings = [];
  if (meshes.length !== 1) hardFindings.push({ code: "skinned_mesh_count", expected: 1, actual: meshes.length });
  if (!meshes.length) return baseReport();

  const mesh = meshes[0];
  mesh.skeleton.pose();
  gltf.scene.updateMatrixWorld(true);
  mesh.skeleton.update();
  const bindVertices = skinnedVertices(mesh);
  const bounds = vertexBounds(bindVertices);
  const height = bounds.max.y - bounds.min.y;
  const centerZ = (bounds.min.z + bounds.max.z) / 2;
  const rig = mapBiped(mesh, hardFindings);
  const weights = inspectWeights(mesh, bindVertices, bounds, rig);
  for (const [code, count] of Object.entries(weights.hardCounts)) {
    if (count) hardFindings.push({ code, count });
  }
  const edges = meshEdges(mesh.geometry, bindVertices);
  const clips = {};
  const motions = ["idle", "walk"];
  if (gltf.animations.some((clip) => String(clip.name).toLowerCase().includes("run"))) motions.push("run");
  for (const motion of motions) {
    const clip = gltf.animations.find((candidate) => {
      const name = String(candidate.name).toLowerCase();
      return name.includes(motion) || (motion === "idle" && (name.includes("standing_relax") || name.includes("biped:wait")));
    });
    if (!clip) {
      hardFindings.push({ code: `missing_${motion}_clip` });
      continue;
    }
    clips[clip.name] = inspectClip(gltf.scene, mesh, clip, bindVertices, bounds, rig, edges, hardFindings);
  }
  return baseReport({
    asset: path.relative(process.cwd(), file),
    sha256: createHash("sha256").update(data).digest("hex"),
    bytes: data.byteLength,
    geometry: {
      vertices: mesh.geometry.getAttribute("position").count,
      triangles: Math.floor((mesh.geometry.index?.count || mesh.geometry.getAttribute("position").count) / 3),
      joints: mesh.skeleton.bones.length,
      height,
      bounds
    },
    weights,
    clips
  });

  function baseReport(details = {}) {
    return { version: 1, ...details, hardFindings, pass: hardFindings.length === 0 };
  }
}

function mapBiped(mesh, hardFindings) {
  const byName = new Map(mesh.skeleton.bones.map((bone, index) => [bone.name, index]));
  const chain = (prefix) => [`${prefix}_Thigh`, `${prefix}_Calf`, `${prefix}_Foot`].map((name) => byName.get(name));
  const negativeChain = chain("L");
  const positiveChain = chain("R");
  if ([...negativeChain, ...positiveChain].some((index) => !Number.isInteger(index))) {
    hardFindings.push({ code: "unknown_biped_leg_mapping" });
  }
  const negativeLeg = new Set(mesh.skeleton.bones.map((bone, index) => ({ bone, index })).filter(({ bone }) => /^L_(?:Thigh|Calf|Foot|Toe)/.test(bone.name)).map(({ index }) => index));
  const positiveLeg = new Set(mesh.skeleton.bones.map((bone, index) => ({ bone, index })).filter(({ bone }) => /^R_(?:Thigh|Calf|Foot|Toe)/.test(bone.name)).map(({ index }) => index));
  const arms = new Set(mesh.skeleton.bones.map((bone, index) => ({ bone, index })).filter(({ bone }) => /_(?:Clavicle|Upperarm|Forearm|Hand)/.test(bone.name)).map(({ index }) => index));
  if (negativeLeg.size < 4 || positiveLeg.size < 4 || arms.size < 6) hardFindings.push({ code: "incomplete_biped_mapping" });
  return { bones: mesh.skeleton.bones, negativeChain, positiveChain, negativeLeg, positiveLeg, arms };
}

function inspectWeights(mesh, vertices, bounds, rig) {
  const index = mesh.geometry.getAttribute("skinIndex");
  const weight = mesh.geometry.getAttribute("skinWeight");
  const height = bounds.max.y - bounds.min.y;
  const centerZ = (bounds.min.z + bounds.max.z) / 2;
  const legs = new Set([...rig.negativeLeg, ...rig.positiveLeg]);
  const hardCounts = { invalid_skin_weight: 0, upper_body_leg_influence: 0, opposite_leg_influence: 0, lower_body_arm_influence: 0 };
  const maxima = { weightSumError: 0, upperBodyLegWeight: 0, oppositeLegWeight: 0, lowerBodyArmWeight: 0 };
  for (let vertex = 0; vertex < index.count; vertex += 1) {
    const joints = [index.getX(vertex), index.getY(vertex), index.getZ(vertex), index.getW(vertex)];
    const weights = [weight.getX(vertex), weight.getY(vertex), weight.getZ(vertex), weight.getW(vertex)];
    const sumError = Math.abs(weights.reduce((sum, value) => sum + value, 0) - 1);
    maxima.weightSumError = Math.max(maxima.weightSumError, sumError);
    if (joints.some((joint) => joint < 0 || joint >= rig.bones.length) || weights.some((value) => !Number.isFinite(value) || value < 0) || sumError > 0.005) hardCounts.invalid_skin_weight += 1;
    const y = vertices[vertex * 3 + 1];
    const z = vertices[vertex * 3 + 2];
    const legWeight = influence(joints, weights, legs);
    const upper = y > bounds.min.y + 0.667 * height || (y > bounds.min.y + 0.306 * height && Math.abs(z - centerZ) > 0.139 * height);
    if (upper) {
      maxima.upperBodyLegWeight = Math.max(maxima.upperBodyLegWeight, legWeight);
      if (legWeight > CROSS_REGION_WEIGHT_EPSILON) hardCounts.upper_body_leg_influence += 1;
    }
    if (Math.abs(z - centerZ) > 0.12 * height) {
      const opposite = z >= centerZ ? rig.negativeLeg : rig.positiveLeg;
      const oppositeWeight = influence(joints, weights, opposite);
      maxima.oppositeLegWeight = Math.max(maxima.oppositeLegWeight, oppositeWeight);
      if (oppositeWeight > OPPOSITE_LEG_WEIGHT_LIMIT) hardCounts.opposite_leg_influence += 1;
    }
    if (y < bounds.min.y + 0.38 * height) {
      const armWeight = influence(joints, weights, rig.arms);
      maxima.lowerBodyArmWeight = Math.max(maxima.lowerBodyArmWeight, armWeight);
      if (armWeight > CROSS_REGION_WEIGHT_EPSILON) hardCounts.lower_body_arm_influence += 1;
    }
  }
  return { hardCounts, maxima };
}

function inspectClip(scene, mesh, clip, bindVertices, bounds, rig, edges, hardFindings) {
  const height = bounds.max.y - bounds.min.y;
  const centerZ = (bounds.min.z + bounds.max.z) / 2;
  const feet = { negative: [], positive: [] };
  for (let vertex = 0; vertex < bindVertices.length / 3; vertex += 1) {
    const y = bindVertices[vertex * 3 + 1];
    const z = bindVertices[vertex * 3 + 2];
    if (y < bounds.min.y + 0.14 * height) feet[z >= centerZ ? "positive" : "negative"].push(vertex);
  }
  for (const [side, vertices] of Object.entries(feet)) {
    if (vertices.length < 100) hardFindings.push({ code: "insufficient_foot_vertices", clip: clip.name, side, count: vertices.length });
  }
  const bindFloor = Math.min(footSample(bindVertices, feet.negative).soleY, footSample(bindVertices, feet.positive).soleY);
  const mixer = new THREE.AnimationMixer(scene);
  mixer.clipAction(clip).reset().play();
  const samples = [];
  let nonFiniteSamples = 0;
  const deformation = { maxLength: 0, maxDelta: 0, maxRatio: 0, hardEdges: 0, worst: null };
  for (const time of sampleTimes(clip)) {
    mixer.setTime(time);
    scene.updateMatrixWorld(true);
    mesh.skeleton.update();
    const vertices = skinnedVertices(mesh);
    if (vertices.some((value) => !Number.isFinite(value))) {
      nonFiniteSamples += 1;
      continue;
    }
    inspectEdges(vertices, edges, height, time, deformation);
    const sample = {
      time,
      negative: footSample(vertices, feet.negative),
      positive: footSample(vertices, feet.positive),
      negativeKnee: kneeSample(rig.bones, rig.negativeChain),
      positiveKnee: kneeSample(rig.bones, rig.positiveChain)
    };
    if (Object.values(sample).flatMap((value) => typeof value === "object" ? Object.values(value) : [value]).some((value) => !Number.isFinite(value))) {
      nonFiniteSamples += 1;
      continue;
    }
    samples.push(sample);
  }
  mixer.stopAllAction();
  mesh.skeleton.pose();
  scene.updateMatrixWorld(true);
  mesh.skeleton.update();
  if (nonFiniteSamples) hardFindings.push({ code: "non_finite_animation_sample", clip: clip.name, count: nonFiniteSamples });
  if (deformation.hardEdges) hardFindings.push({ code: "animated_edge_explosion", clip: clip.name, count: deformation.hardEdges, worst: deformation.worst });
  const gait = gaitReport(clip.name, samples, height, bindFloor, hardFindings);
  return { duration: clip.duration, samples: samples.length, deformation, gait };
}

function gaitReport(clipName, samples, height, bindFloor, hardFindings) {
  if (samples.length < 2) {
    hardFindings.push({ code: "insufficient_finite_animation_samples", clip: clipName, count: samples.length });
    return null;
  }
  const soleHeights = samples.flatMap((sample) => [sample.negative.soleY, sample.positive.soleY]);
  const floor = percentile(soleHeights, 0.05);
  const minimumSole = Math.min(...soleHeights);
  const result = { bindFloor, floor, minimumSole, groundOffset: minimumSole - bindFloor, sides: {}, minFootSeparation: Infinity, minKneeSeparation: Infinity, bothAirborneRatio: 0 };
  for (const side of ["negative", "positive"]) {
    const feet = samples.map((sample) => sample[side]);
    const soles = feet.map((foot) => foot.soleY);
    const contacts = soles.map((sole) => sole - floor <= 0.025 * height);
    const knees = samples.map((sample) => sample[`${side}Knee`].angle);
    result.sides[side] = {
      contactRatio: contacts.filter(Boolean).length / contacts.length,
      lift: Math.max(...soles) - floor,
      contactWindowTravel: contactDrift(feet, contacts),
      contactWindowLateralDrift: contactDrift(feet, contacts, true),
      penetrationRatio: soles.filter((sole) => sole < floor - 0.03 * height).length / soles.length,
      kneeMin: Math.min(...knees),
      kneeMax: Math.max(...knees),
      kneeRange: Math.max(...knees) - Math.min(...knees)
    };
  }
  result.minFootSeparation = Math.min(...samples.map((sample) => sample.positive.z - sample.negative.z));
  result.minKneeSeparation = Math.min(...samples.map((sample) => sample.positiveKnee.z - sample.negativeKnee.z));
  result.bothAirborneRatio = samples.filter((sample) => sample.negative.soleY - floor > 0.06 * height && sample.positive.soleY - floor > 0.06 * height).length / samples.length;
  const add = (condition, code, details = {}) => {
    if (condition) hardFindings.push({ code, clip: clipName, ...details });
  };
  add(Math.abs(result.groundOffset) > 0.03 * height, "animation_misses_bind_ground", { value: result.groundOffset, bindFloor, minimumSole });
  const locomotion = /walk|run/.test(clipName.toLowerCase());
  const running = clipName.toLowerCase().includes("run");
  if (!locomotion) {
    for (const [side, item] of Object.entries(result.sides)) {
      add(item.contactRatio < 0.2, "idle_foot_never_contacts", { side, value: item.contactRatio });
      add(item.contactWindowTravel > 0.06 * height, "idle_foot_drift", { side, value: item.contactWindowTravel });
    }
  } else {
    for (const [side, item] of Object.entries(result.sides)) {
      add(item.contactRatio < 0.05, "walk_foot_never_contacts", { side, value: item.contactRatio });
      add(item.lift < 0.025 * height || item.lift > (running ? 0.4 : 0.25) * height, "locomotion_foot_lift", { side, value: item.lift });
      add(item.contactWindowLateralDrift > 0.06 * height, "locomotion_lateral_foot_sliding", { side, value: item.contactWindowLateralDrift });
      add(item.penetrationRatio > 0.01, "locomotion_foot_penetration", { side, value: item.penetrationRatio });
      add(item.kneeMin < 25 || item.kneeMax > 179.5 || item.kneeRange < 25, "locomotion_knee_motion", { side, min: item.kneeMin, max: item.kneeMax, range: item.kneeRange });
    }
    const ratio = result.sides.positive.kneeRange / Math.max(result.sides.negative.kneeRange, 0.001);
    add(ratio < 0.5 || ratio > 2, "walk_knee_asymmetry", { value: ratio });
    add(result.bothAirborneRatio > (running ? 0.65 : 0.2), "locomotion_both_feet_airborne", { value: result.bothAirborneRatio });
  }
  add(result.minFootSeparation < 0.04 * height, "feet_cross_or_collapse", { value: result.minFootSeparation });
  add(result.minKneeSeparation < 0.04 * height, "knees_cross_or_collapse", { value: result.minKneeSeparation });
  return result;
}

function inspectEdges(vertices, edges, height, time, result) {
  for (let edge = 0; edge < edges.indices.length; edge += 2) {
    const a = edges.indices[edge] * 3;
    const b = edges.indices[edge + 1] * 3;
    const length = Math.hypot(vertices[a] - vertices[b], vertices[a + 1] - vertices[b + 1], vertices[a + 2] - vertices[b + 2]);
    const bindLength = edges.lengths[edge / 2];
    const delta = length - bindLength;
    const ratio = length / Math.max(bindLength, 0.0001 * height);
    const hard = length > 0.2 * height || (delta > 0.08 * height && ratio > 4);
    if (hard) result.hardEdges += 1;
    if (length > result.maxLength) result.maxLength = length;
    if (delta > result.maxDelta) result.maxDelta = delta;
    if (ratio > result.maxRatio) {
      result.maxRatio = ratio;
      result.worst = { time, vertices: [edges.indices[edge], edges.indices[edge + 1]], bindLength, length, delta, ratio };
    }
  }
}

function meshEdges(geometry, vertices) {
  const index = geometry.index;
  const count = index?.count || geometry.getAttribute("position").count;
  const seen = new Set();
  const values = [];
  for (let offset = 0; offset < count; offset += 3) {
    const triangle = [0, 1, 2].map((part) => index ? index.getX(offset + part) : offset + part);
    for (const [first, second] of [[0, 1], [1, 2], [2, 0]]) {
      const low = Math.min(triangle[first], triangle[second]);
      const high = Math.max(triangle[first], triangle[second]);
      const key = `${low}:${high}`;
      if (seen.has(key)) continue;
      seen.add(key);
      values.push(low, high);
    }
  }
  const indices = Uint32Array.from(values);
  const lengths = new Float32Array(indices.length / 2);
  for (let edge = 0; edge < indices.length; edge += 2) {
    const a = indices[edge] * 3;
    const b = indices[edge + 1] * 3;
    lengths[edge / 2] = Math.hypot(vertices[a] - vertices[b], vertices[a + 1] - vertices[b + 1], vertices[a + 2] - vertices[b + 2]);
  }
  return { indices, lengths };
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

function footSample(vertices, indices) {
  const points = indices.map((index) => ({ x: vertices[index * 3], y: vertices[index * 3 + 1], z: vertices[index * 3 + 2] })).sort((a, b) => a.y - b.y);
  if (!points.length) return { soleY: Infinity, x: 0, z: 0 };
  const soleY = points[Math.floor(points.length * 0.02)].y;
  const bottom = points.slice(0, Math.max(1, Math.ceil(points.length * 0.12)));
  return { soleY, x: percentile(bottom.map((point) => point.x), 0.5), z: percentile(bottom.map((point) => point.z), 0.5) };
}

function kneeSample(bones, chain) {
  if (chain.some((index) => !Number.isInteger(index))) return { angle: 0, z: 0 };
  const hip = bones[chain[0]].getWorldPosition(new THREE.Vector3());
  const knee = bones[chain[1]].getWorldPosition(new THREE.Vector3());
  const ankle = bones[chain[2]].getWorldPosition(new THREE.Vector3());
  return { angle: THREE.MathUtils.radToDeg(hip.sub(knee).angleTo(ankle.sub(knee))), z: knee.z };
}

function contactDrift(feet, contacts, lateralOnly = false) {
  let max = 0;
  let start = null;
  for (let index = 0; index <= contacts.length; index += 1) {
    if (contacts[index] && start === null) start = index;
    if ((!contacts[index] || index === contacts.length) && start !== null) {
      const window = feet.slice(start, index);
      for (let a = 0; a < window.length; a += 1) {
        for (let b = a + 1; b < window.length; b += 1) {
          const distance = lateralOnly ? Math.abs(window[a].z - window[b].z) : Math.hypot(window[a].x - window[b].x, window[a].z - window[b].z);
          max = Math.max(max, distance);
        }
      }
      start = null;
    }
  }
  return max;
}

function sampleTimes(clip) {
  const frameCount = Math.min(1200, Math.max(2, Math.ceil(clip.duration * 60) + 1));
  const uniform = Array.from({ length: frameCount }, (_, index) => clip.duration * index / (frameCount - 1));
  const keys = [...new Set(clip.tracks.flatMap((track) => [...track.times]).map(roundTime))].sort((a, b) => a - b);
  const midpoints = keys.slice(0, -1).map((time, index) => (time + keys[index + 1]) / 2);
  return [...new Set([...uniform, ...keys, ...midpoints].map(roundTime))].sort((a, b) => a - b);
}

function influence(joints, weights, accepted) {
  return weights.reduce((sum, value, index) => sum + (accepted.has(joints[index]) ? value : 0), 0);
}

function percentile(values, ratio) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio)))];
}

function roundTime(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}
