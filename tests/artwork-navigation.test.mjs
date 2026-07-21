import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ARCHIVED_WORLDS } from "../src/config/legacyAssets.js";
import { artworksForScene } from "../src/config/sceneCollections.js";
import { resolvePartyFormation } from "../src/render/MuseumEngine.js";
import { WorldLayer } from "../src/render/WorldLayer.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const ARTWORK_EDGE_CLEARANCE = 1;
const PERSON_RADIUS = 0.32;
const ENTRANCE_HALF_WIDTH = 0.45;
const ROUTE_GROUND_HALF_WIDTH = 0.25;
const ROUTE_ARTWORK_CLEARANCE = 0.45;
const GROUND_SAMPLE_SPACING = 0.3;
const MAX_GROUND_STEP = 0.35;
const EPSILON = 1e-7;

globalThis.ProgressEvent ??= class ProgressEvent {
  constructor(type, init = {}) { Object.assign(this, { type }, init); }
};

test("Monet starts on the raised walkway with a shallower camera composition", async () => {
  const galleries = await loadGalleries();
  const gallery = galleries.find(({ world }) => world.sceneId === "water-and-light");
  assert.ok(gallery);
  const { world, layer } = gallery;
  const { player, occupants } = nominalInitialPositions(world, layer);
  assert.ok(Math.abs(world.profile.spawn.x - 3.162) < 0.0001);
  assert.equal(world.profile.cameraPitch, -0.06);
  assert.equal(world.profile.cameraDistance, 5.2);
  assert.ok(player.x >= 2.65 && player.y >= 0.15,
    `visitor must start on the walkway, received ${player.x.toFixed(2)},${player.y.toFixed(2)}`);
  assert.ok(occupants.every(({ position }) => position.y >= 0.1),
    "the initial company must not be staged in the pond");
});

test("all nine galleries preserve four artworks with at least 1m between frame edges", async () => {
  const galleries = await loadGalleries();
  const failures = [];
  assert.equal(galleries.length, 9);

  for (const { world, records, footprints } of galleries) {
    assert.equal(records.length, 4, `${world.sceneId} artwork count`);
    assert.deepEqual(
      records.map((record) => record.artwork.id),
      artworksForScene(world.sceneId).map((artwork) => artwork.id),
      `${world.sceneId} artwork order`
    );

    for (let left = 0; left < footprints.length; left += 1) {
      for (let right = left + 1; right < footprints.length; right += 1) {
        const clearance = polygonClearance(footprints[left], footprints[right]);
        if (clearance + EPSILON < ARTWORK_EDGE_CLEARANCE) {
          failures.push(
            `${world.sceneId} artworks ${left + 1}/${right + 1} edge clearance `
            + `${clearance.toFixed(2)}m < ${ARTWORK_EDGE_CLEARANCE.toFixed(2)}m`
          );
        }
      }
    }
  }

  assert.deepEqual(failures, [], failures.join("\n"));
});

test("gallery entrances keep the visitor and three companions outside inflated frames with a 0.9m corridor", async () => {
  const galleries = await loadGalleries();
  const failures = [];

  for (const { world, layer, records, footprints } of galleries) {
    const { player, occupants } = nominalInitialPositions(world, layer);
    const firstAnchor = vectorFrom(records[0].frame.userData.guideAnchor);

    for (const occupant of occupants) {
      for (let artworkIndex = 0; artworkIndex < footprints.length; artworkIndex += 1) {
        const clearance = pointPolygonClearance(occupant.position, footprints[artworkIndex]);
        if (clearance + EPSILON < PERSON_RADIUS) {
          failures.push(
            `${world.sceneId} ${occupant.label} is ${clearance.toFixed(2)}m from artwork `
            + `${artworkIndex + 1}; needs ${PERSON_RADIUS.toFixed(2)}m body clearance`
          );
        }
      }
    }

    for (let artworkIndex = 0; artworkIndex < footprints.length; artworkIndex += 1) {
      const clearance = segmentPolygonClearance(player, firstAnchor, footprints[artworkIndex]);
      if (clearance + EPSILON < ENTRANCE_HALF_WIDTH) {
        failures.push(
          `${world.sceneId} entrance corridor narrows to ${Math.max(0, clearance * 2).toFixed(2)}m `
          + `at artwork ${artworkIndex + 1}; needs 0.90m`
        );
      }
    }

    const ground = validateGroundSegment({
      from: player,
      to: firstAnchor,
      groundAt: (x, z, referenceY, maxDelta) => layer.walkableGroundHeightAt(x, z, referenceY, maxDelta),
      halfWidth: ENTRANCE_HALF_WIDTH,
      spacing: GROUND_SAMPLE_SPACING,
      maxStep: MAX_GROUND_STEP
    });
    for (const issue of ground.issues) {
      failures.push(`${world.sceneId} entrance ${formatGroundIssue(issue)}`);
    }
  }

  assert.deepEqual(failures, [], failures.join("\n"));
});

test("authored guide routes keep a 0.9m artwork corridor over continuous collider ground", async () => {
  const galleries = await loadGalleries();
  const failures = [];

  for (const { world, layer, records, footprints } of galleries) {
    const start = new THREE.Vector3(
      world.profile.guideSpawn.x,
      layer.groundHeightAt(world.profile.guideSpawn.x, world.profile.guideSpawn.z),
      world.profile.guideSpawn.z
    );
    const anchors = records.slice(0, 3).map((record) => vectorFrom(record.frame.userData.guideAnchor));
    const waypoints = [start, ...anchors];

    for (let segmentIndex = 0; segmentIndex < waypoints.length - 1; segmentIndex += 1) {
      const from = waypoints[segmentIndex];
      const to = waypoints[segmentIndex + 1];
      const ground = validateGroundSegment({
        from,
        to,
        groundAt: (x, z, referenceY, maxDelta) => layer.walkableGroundHeightAt(x, z, referenceY, maxDelta),
        halfWidth: ROUTE_GROUND_HALF_WIDTH,
        spacing: GROUND_SAMPLE_SPACING,
        maxStep: MAX_GROUND_STEP
      });
      for (const issue of ground.issues) {
        failures.push(
          `${world.sceneId} route ${segmentIndex === 0 ? "spawn" : `artwork ${segmentIndex}`}`
          + ` -> artwork ${segmentIndex + 1} ${formatGroundIssue(issue)}`
        );
      }

      for (let artworkIndex = 0; artworkIndex < footprints.length; artworkIndex += 1) {
        const clearance = segmentPolygonClearance(from, to, footprints[artworkIndex]);
        if (clearance + EPSILON < ROUTE_ARTWORK_CLEARANCE) {
          failures.push(
            `${world.sceneId} route ${segmentIndex === 0 ? "spawn" : `artwork ${segmentIndex}`}`
            + ` -> artwork ${segmentIndex + 1} passes ${clearance.toFixed(2)}m from artwork `
            + `${artworkIndex + 1}; needs ${ROUTE_ARTWORK_CLEARANCE.toFixed(2)}m`
          );
        }
      }
    }
  }

  assert.deepEqual(failures, [], failures.join("\n"));
});

let galleriesPromise;

async function loadGalleries() {
  galleriesPromise ??= Promise.all(ARCHIVED_WORLDS.map(loadGallery));
  return galleriesPromise;
}

after(async () => {
  if (!galleriesPromise) return;
  const galleries = await galleriesPromise;
  await Promise.all(galleries.map(({ layer }) => layer.clear()));
});

async function loadGallery(world) {
  const scene = new THREE.Scene();
  const layer = new WorldLayer(scene, {
    textureLoader: {
      loadAsync: async (url) => {
        const dimensions = jpegDimensions(fs.readFileSync(path.join(ROOT, url.slice(1))));
        const texture = new THREE.Texture();
        texture.image = dimensions;
        return texture;
      }
    }
  });
  layer.activeWorld = world;
  layer.collider = await loadCollider(new GLTFLoader(), world);
  scene.add(layer.collider);
  layer.buildGroundIndex(layer.collider);
  await layer.buildArtworks(world, layer.buildToken);
  layer.layoutArtworks(world);
  scene.updateMatrixWorld(true);

  const records = [...layer.artworks.values()].sort((left, right) => left.index - right.index);
  for (const record of records) {
    assert.equal(record.frame.visible, true, `${world.sceneId}:${record.artwork.id} placement failed`);
  }
  return {
    world,
    layer,
    records,
    footprints: records.map((record) => projectObjectBox3Footprint(record.frame))
  };
}

async function loadCollider(loader, world) {
  const bytes = await fs.promises.readFile(path.join(ROOT, world.collider.slice(1)));
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const collider = (await loader.parseAsync(arrayBuffer, "")).scene;
  collider.scale.multiplyScalar(world.transform.scale);
  collider.position.y += world.transform.y;
  if (world.transform.rotationX) collider.rotateX(world.transform.rotationX);
  collider.traverse((child) => { if (child.isMesh) child.visible = false; });
  collider.updateMatrixWorld(true);
  return collider;
}

function nominalInitialPositions(world, layer) {
  const right = new THREE.Vector3(Math.cos(world.profile.yaw), 0, Math.sin(world.profile.yaw));
  const player = new THREE.Vector3(world.profile.spawn.x, 0, world.profile.spawn.z).addScaledVector(right, 0.5);
  player.y = layer.groundHeightAt(player.x, player.z);
  const guide = new THREE.Vector3(
    world.profile.guideSpawn.x,
    layer.groundHeightAt(world.profile.guideSpawn.x, world.profile.guideSpawn.z),
    world.profile.guideSpawn.z
  );
  const partyYaw = world.profile.yaw + Math.PI;
  const followers = [0, 1].map((slot) => {
    const position = resolvePartyFormation(player, partyYaw, slot, world.profile.bounds);
    return new THREE.Vector3(position.x, layer.groundHeightAt(position.x, position.z), position.z);
  });
  return {
    player,
    occupants: [
      { label: "visitor spawn", position: player },
      { label: "guide spawn", position: guide },
      { label: "companion 2 nominal spawn", position: followers[0] },
      { label: "companion 3 nominal spawn", position: followers[1] }
    ]
  };
}

// Projects every visible mesh's actual local Box3 through its world matrix, then
// wraps the result in a convex 2D hull. This preserves each rotated frame's OBB
// footprint instead of comparing only centers or inflated world-axis AABBs.
export function projectObjectBox3Footprint(object) {
  object.updateMatrixWorld(true);
  const points = [];
  object.traverse((child) => {
    if (!child.isMesh || child.visible === false || !child.geometry) return;
    child.geometry.computeBoundingBox();
    const bounds = child.geometry.boundingBox;
    if (!bounds || bounds.isEmpty()) return;
    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const y of [bounds.min.y, bounds.max.y]) {
        for (const z of [bounds.min.z, bounds.max.z]) {
          const worldPoint = new THREE.Vector3(x, y, z).applyMatrix4(child.matrixWorld);
          points.push({ x: worldPoint.x, z: worldPoint.z });
        }
      }
    }
  });
  if (points.length < 3) throw new Error(`object_has_no_box3_footprint:${object.name || "unnamed"}`);
  return convexHull2D(points);
}

export function convexHull2D(points) {
  const sorted = [...points]
    .map(({ x, z }) => ({ x: Number(x), z: Number(z) }))
    .sort((left, right) => left.x - right.x || left.z - right.z)
    .filter((point, index, values) => index === 0
      || Math.abs(point.x - values[index - 1].x) > EPSILON
      || Math.abs(point.z - values[index - 1].z) > EPSILON);
  if (sorted.length <= 2) return sorted;
  const lower = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross2D(lower.at(-2), lower.at(-1), point) <= EPSILON) lower.pop();
    lower.push(point);
  }
  const upper = [];
  for (const point of [...sorted].reverse()) {
    while (upper.length >= 2 && cross2D(upper.at(-2), upper.at(-1), point) <= EPSILON) upper.pop();
    upper.push(point);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

export function polygonClearance(left, right) {
  if (left.length < 2 || right.length < 2) return Infinity;
  if (pointInsidePolygon(left[0], right) || pointInsidePolygon(right[0], left)) return 0;
  let nearest = Infinity;
  for (const [leftStart, leftEnd] of polygonEdges(left)) {
    for (const [rightStart, rightEnd] of polygonEdges(right)) {
      nearest = Math.min(nearest, segmentClearance(leftStart, leftEnd, rightStart, rightEnd));
      if (nearest <= EPSILON) return 0;
    }
  }
  return nearest;
}

export function pointPolygonClearance(point, polygon) {
  if (pointInsidePolygon(point, polygon)) return 0;
  return Math.min(...polygonEdges(polygon).map(([start, end]) => pointSegmentClearance(point, start, end)));
}

export function segmentPolygonClearance(from, to, polygon) {
  if (pointInsidePolygon(from, polygon) || pointInsidePolygon(to, polygon)) return 0;
  return Math.min(...polygonEdges(polygon).map(([start, end]) => segmentClearance(from, to, start, end)));
}

export function validateGroundSegment({ from, to, groundAt, halfWidth = 0, spacing = 0.3, maxStep = 0.35 }) {
  const distance = Math.hypot(to.x - from.x, to.z - from.z);
  const sampleCount = Math.max(1, Math.ceil(distance / spacing));
  const direction = distance > EPSILON
    ? { x: (to.x - from.x) / distance, z: (to.z - from.z) / distance }
    : { x: 0, z: 1 };
  const lateral = { x: -direction.z, z: direction.x };
  const lanes = halfWidth > EPSILON ? [-halfWidth, 0, halfWidth] : [0];
  const issues = [];

  for (const lane of lanes) {
    let referenceY = Number.isFinite(from.y) ? from.y : 0;
    for (let index = 0; index <= sampleCount; index += 1) {
      const fraction = index / sampleCount;
      const x = from.x + (to.x - from.x) * fraction + lateral.x * lane;
      const z = from.z + (to.z - from.z) * fraction + lateral.z * lane;
      const groundY = groundAt(x, z, referenceY, maxStep);
      if (!Number.isFinite(groundY)) {
        issues.push({ lane, fraction, x, z, referenceY });
        break;
      }
      referenceY = groundY;
    }
  }
  return { ok: issues.length === 0, issues, sampleCount };
}

function vectorFrom(values) {
  return new THREE.Vector3(values[0], values[1], values[2]);
}

function formatGroundIssue(issue) {
  return `loses ground at ${(issue.fraction * 100).toFixed(0)}% `
    + `(x=${issue.x.toFixed(2)}, z=${issue.z.toFixed(2)}, lane=${issue.lane.toFixed(2)}m, `
    + `referenceY=${issue.referenceY.toFixed(2)})`;
}

function polygonEdges(polygon) {
  return polygon.map((point, index) => [point, polygon[(index + 1) % polygon.length]]);
}

function pointInsidePolygon(point, polygon) {
  let inside = false;
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current++) {
    const a = polygon[current];
    const b = polygon[previous];
    if (pointSegmentClearance(point, a, b) <= EPSILON) return true;
    const crosses = (a.z > point.z) !== (b.z > point.z)
      && point.x < ((b.x - a.x) * (point.z - a.z)) / (b.z - a.z) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function segmentClearance(a, b, c, d) {
  if (segmentsIntersect(a, b, c, d)) return 0;
  return Math.min(
    pointSegmentClearance(a, c, d),
    pointSegmentClearance(b, c, d),
    pointSegmentClearance(c, a, b),
    pointSegmentClearance(d, a, b)
  );
}

function pointSegmentClearance(point, start, end) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared <= EPSILON) return Math.hypot(point.x - start.x, point.z - start.z);
  const factor = THREE.MathUtils.clamp(
    ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared,
    0,
    1
  );
  return Math.hypot(point.x - (start.x + dx * factor), point.z - (start.z + dz * factor));
}

function segmentsIntersect(a, b, c, d) {
  const abC = cross2D(a, b, c);
  const abD = cross2D(a, b, d);
  const cdA = cross2D(c, d, a);
  const cdB = cross2D(c, d, b);
  if (((abC > EPSILON && abD < -EPSILON) || (abC < -EPSILON && abD > EPSILON))
      && ((cdA > EPSILON && cdB < -EPSILON) || (cdA < -EPSILON && cdB > EPSILON))) return true;
  return (Math.abs(abC) <= EPSILON && pointSegmentClearance(c, a, b) <= EPSILON)
    || (Math.abs(abD) <= EPSILON && pointSegmentClearance(d, a, b) <= EPSILON)
    || (Math.abs(cdA) <= EPSILON && pointSegmentClearance(a, c, d) <= EPSILON)
    || (Math.abs(cdB) <= EPSILON && pointSegmentClearance(b, c, d) <= EPSILON);
}

function cross2D(origin, left, right) {
  return (left.x - origin.x) * (right.z - origin.z) - (left.z - origin.z) * (right.x - origin.x);
}

function jpegDimensions(buffer) {
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2 || offset + length + 2 > buffer.length) break;
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7)
      };
    }
    offset += length + 2;
  }
  throw new Error("jpeg_dimensions_unavailable");
}
