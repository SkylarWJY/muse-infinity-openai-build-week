import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  LIVING_ARTWORKS,
  LIVING_ARTWORK_HERO_IDS,
  approvedLivingArtworkForArtwork,
  approvedLivingArtworkForScene,
  browserQaLivingArtworkForArtwork,
  browserQaLivingArtworkForScene,
  isApprovedLivingArtworkVisual,
  isBrowserQaLivingArtworkVision,
  livingArtworkForArtwork,
  livingArtworkForScene
} from "../src/config/livingArtworks.js";
import { EXHIBITION_SPINE, FINAL_SCENE } from "../src/config/exhibitionSpine.js";
import { artworksForScene } from "../src/config/sceneCollections.js";

const EXPECTED_HEROES = Object.freeze([
  ["threshold-conservatory", "aic-153799"],
  ["court-of-light", "aic-14655"],
  ["water-and-light", "aic-16568"],
  ["sunset-frames", "aic-111436"],
  ["burning-sky", "aic-28560"],
  ["petal-transition", "aic-27992"],
  ["living-memory", "aic-26650"],
  ["infinite-repetition", "aic-8991"]
]);

const REQUIRED_FIELDS = Object.freeze([
  "sceneId",
  "artworkId",
  "asset",
  "version",
  "manifest",
  "motion",
  "durationMs",
  "maxProjectionM",
  "frameLocalTransform",
  "cues",
  "sources",
  "accessibleDescription",
  "provenance",
  "vision"
]);

test("one immutable living artwork covers each process world and never the answer world", () => {
  assert.deepEqual(
    LIVING_ARTWORKS.map(({ sceneId, artworkId }) => [sceneId, artworkId]),
    EXPECTED_HEROES
  );
  assert.deepEqual(
    LIVING_ARTWORKS.map(({ sceneId }) => sceneId),
    EXHIBITION_SPINE.map(({ id }) => id)
  );
  assert.deepEqual(LIVING_ARTWORK_HERO_IDS, EXPECTED_HEROES.map(([, artworkId]) => artworkId));
  assert.equal(livingArtworkForScene(FINAL_SCENE.id), null);
  assert.equal(livingArtworkForArtwork("missing-artwork"), null);

  for (const [sceneId, artworkId] of EXPECTED_HEROES) {
    const spec = livingArtworkForScene(sceneId);
    assert.equal(spec?.artworkId, artworkId, sceneId);
    assert.equal(livingArtworkForArtwork(artworkId), spec, artworkId);
    assert.ok(
      artworksForScene(sceneId).slice(0, 3).some((artwork) => artwork.id === artworkId),
      `${sceneId}:${artworkId} must remain one of the three evidence stations`
    );
  }

  assertDeepFrozen(LIVING_ARTWORKS);
  assertDeepFrozen(LIVING_ARTWORK_HERO_IDS);
});

test("living artwork stories declare bounded motion and distinguish fact from imagination", () => {
  for (const spec of LIVING_ARTWORKS) {
    assert.deepEqual(Object.keys(spec).sort(), [...REQUIRED_FIELDS].sort(), spec.sceneId);
    assert.equal(spec.asset, `/assets/living-artworks/${spec.artworkId}-v1.glb`);
    assert.equal(spec.version, 1);
    assert.deepEqual(spec.manifest, {
      schemaVersion: 1,
      candidateId: `${spec.artworkId}-v1`,
      asset: spec.asset,
      renderer: "gltf",
      provider: "muse-procedural",
      visualQa: "rejected",
      reviewNote: "Rejected: the shallow-relief model obscures the original artwork and does not meet the exhibition visual-quality bar."
    });
    assert.equal(Object.hasOwn(spec, "fallback"), false, `${spec.sceneId}:primitive fallback`);
    assert.ok(spec.durationMs >= 15_000 && spec.durationMs <= 25_000, `${spec.sceneId}:durationMs`);
    assert.ok(spec.maxProjectionM > 0 && spec.maxProjectionM <= 1.5, `${spec.sceneId}:maxProjectionM`);
    assertTransform(spec.frameLocalTransform, `${spec.sceneId}:frameLocalTransform`);
    assert.equal(spec.motion.story.durationMs, spec.durationMs, `${spec.sceneId}:story duration`);
    assertMotion(spec.motion.ambient, spec, "ambient");
    assertMotion(spec.motion.story, spec, "story");

    assert.deepEqual(spec.cues.map(({ kind }) => kind), ["curated-fact", "imagined-reenactment"]);
    const [fact, imagined] = spec.cues;
    assert.equal(fact.label, "CURATED FACT");
    assert.equal(imagined.label, "IMAGINED REENACTMENT · NOT HISTORICAL TESTIMONY");
    assert.equal(fact.speaker, "companion");
    assert.equal(imagined.speaker, "artwork");
    assert.ok(fact.atMs >= 0 && fact.atMs < imagined.atMs && imagined.atMs < spec.durationMs);
    assert.ok(fact.text.length > 30, `${spec.sceneId}:fact text`);
    assert.ok(imagined.text.length > 20, `${spec.sceneId}:imagined text`);
    assert.ok(spec.sources.some(({ id }) => id === fact.sourceId), `${spec.sceneId}:fact source`);
    assert.equal(Object.hasOwn(imagined, "sourceId"), false, `${spec.sceneId}:imagined cue must not claim a source`);

    assert.equal(spec.sources.length, 1);
    assert.equal(spec.sources[0].url, `https://www.artic.edu/artworks/${spec.artworkId.slice(4)}`);
    assert.equal(spec.sources[0].publisher, "Art Institute of Chicago");
    assert.match(spec.accessibleDescription, /frame|painting|picture/i);
    assert.match(spec.provenance.artworkRights, /public domain/i);
    assert.match(spec.provenance.assetOrigin, /MUSE-authored procedural GLB v1/i);
    assert.match(spec.provenance.historicalStatus, /not historical testimony/i);
    assertDeepFrozen(spec);
  }
});

test("only manifest-approved visuals are eligible while all eight v1 stories remain queryable", () => {
  for (const spec of LIVING_ARTWORKS) {
    assert.equal(livingArtworkForScene(spec.sceneId), spec, spec.sceneId);
    assert.equal(livingArtworkForArtwork(spec.artworkId), spec, spec.artworkId);
    assert.equal(isApprovedLivingArtworkVisual(spec), false, spec.artworkId);
    assert.equal(approvedLivingArtworkForScene(spec.sceneId), null, spec.sceneId);
    assert.equal(approvedLivingArtworkForArtwork(spec.artworkId), null, spec.artworkId);
  }

  const rejected = LIVING_ARTWORKS[0];
  const approved = {
    ...rejected,
    manifest: { ...rejected.manifest, visualQa: "approved" }
  };
  assert.equal(isApprovedLivingArtworkVisual(approved), true);
  assert.equal(isApprovedLivingArtworkVisual({
    ...approved,
    asset: "/assets/../private/hero.glb"
  }), false);
  assert.equal(isApprovedLivingArtworkVisual({
    ...approved,
    manifest: { ...approved.manifest, asset: "/assets/living-artworks/another.glb" }
  }), false);
  assert.equal(isApprovedLivingArtworkVisual({
    ...approved,
    manifest: { ...approved.manifest, visualQa: "pending" }
  }), false);
});

test("only the complete Marble and Hermes contract enters the browser-QA preview lookup", () => {
  const candidate = livingArtworkForArtwork("aic-111436");
  const vision = candidate.vision;
  assert.ok(vision);
  assert.equal(vision.durationMs, 5_000);
  assert.deepEqual(vision.assets, {
    desktop: "/assets/generated/living-artworks-v2/aic-111436-marble-text/world-500k.spz",
    mobile: "/assets/generated/living-artworks-v2/aic-111436-marble-text/world-100k.spz",
    representativeFrame: "/assets/generated/living-artworks-v2/aic-111436-marble-text/thumbnail.webp"
  });
  assert.equal(vision.manifest.provider.name, "World Labs World API");
  assert.equal(vision.manifest.provider.model, "marble-1.1");
  assert.equal(vision.manifest.renderer, "spark-spz");
  assert.equal(vision.manifest.visualQa, "approved-for-browser-qa");
  assert.equal(vision.manifest.preliminaryHermesReview.score, 9);
  assert.equal(vision.manifest.preliminaryHermesReview.minimumPassingScore, 8);
  assert.equal(vision.metricScale, 0.3159521818161011);
  assert.equal(vision.groundPlaneOffset, 0.22479191422462463);
  assert.equal(isBrowserQaLivingArtworkVision(candidate), true);
  assert.equal(browserQaLivingArtworkForScene("sunset-frames"), candidate);
  assert.equal(browserQaLivingArtworkForArtwork("aic-111436"), candidate);
  assert.equal(approvedLivingArtworkForArtwork("aic-111436"), null);

  for (const spec of LIVING_ARTWORKS.filter(({ artworkId }) => artworkId !== "aic-111436")) {
    assert.equal(spec.vision, null, spec.artworkId);
    assert.equal(browserQaLivingArtworkForScene(spec.sceneId), null, spec.sceneId);
    assert.equal(browserQaLivingArtworkForArtwork(spec.artworkId), null, spec.artworkId);
  }

  const cases = [
    { ...candidate, vision: { ...vision, manifest: { ...vision.manifest, visualQa: "approved" } } },
    { ...candidate, vision: { ...vision, manifest: { ...vision.manifest, provider: { ...vision.manifest.provider, model: "marble-1.0" } } } },
    { ...candidate, vision: { ...vision, manifest: { ...vision.manifest, preliminaryHermesReview: { ...vision.manifest.preliminaryHermesReview, score: 7 } } } },
    { ...candidate, vision: { ...vision, assets: { ...vision.assets, desktop: "https://example.com/world.spz" } } },
    { ...candidate, vision: { ...vision, assets: { ...vision.assets, mobile: "/assets/../private/world.spz" } } }
  ];
  for (const malformed of cases) assert.equal(isBrowserQaLivingArtworkVision(malformed), false);
});

test("the Marble preview assets are local, bounded, and available at both performance tiers", () => {
  const vision = livingArtworkForArtwork("aic-111436").vision;
  for (const [tier, asset] of Object.entries(vision.assets)) {
    const file = new URL(`..${asset}`, import.meta.url);
    const stat = fs.lstatSync(file);
    assert.equal(stat.isSymbolicLink(), false, tier);
    assert.equal(stat.isFile(), true, tier);
    assert.ok(stat.size > 20_000, `${tier} is unexpectedly small`);
    if (asset.endsWith(".spz")) assert.ok(stat.size <= 8 * 1024 * 1024, `${tier} exceeds 8 MiB`);
  }
});

test("rejected v1 artifacts remain inspectable GLB 2.0 files but are runtime-ineligible", () => {
  for (const spec of LIVING_ARTWORKS) {
    assert.equal(spec.manifest.visualQa, "rejected", spec.artworkId);
    assert.equal(isApprovedLivingArtworkVisual(spec), false, spec.artworkId);
    assert.doesNotMatch(spec.asset, /living-artworks-v2|marble/i, spec.artworkId);
    const file = new URL(`..${spec.asset}`, import.meta.url);
    const stat = fs.lstatSync(file);
    assert.equal(stat.isSymbolicLink(), false, spec.asset);
    assert.equal(stat.isFile(), true, spec.asset);
    assert.ok(stat.size > 256, `${spec.asset} is unexpectedly small`);
    assert.ok(stat.size <= 8 * 1024 * 1024, `${spec.asset} exceeds the 8 MiB budget`);

    const glb = fs.readFileSync(file);
    const json = readGlbJson(glb, spec.asset);
    assert.equal(json.asset.version, "2.0", spec.asset);
    assert.ok((json.scenes?.length || 0) >= 1, `${spec.asset} has no scene`);
    assert.ok((json.nodes?.length || 0) >= 1, `${spec.asset} has no nodes`);
    assert.ok((json.meshes?.length || 0) >= 1, `${spec.asset} has no meshes`);

    const primitives = json.meshes.flatMap((mesh) => mesh.primitives || []);
    assert.ok(primitives.length >= 1 && primitives.length <= 12, `${spec.asset} draw-call budget`);
    let triangles = 0;
    for (const primitive of primitives) {
      assert.ok(primitive.mode === undefined || primitive.mode === 4, `${spec.asset} must use triangle primitives`);
      const accessor = json.accessors[primitive.indices ?? primitive.attributes.POSITION];
      assert.ok(accessor?.count > 0, `${spec.asset} primitive has no geometry`);
      triangles += Math.floor(accessor.count / 3);
    }
    assert.ok(triangles > 0 && triangles <= 100_000, `${spec.asset} triangle budget: ${triangles}`);

    for (const track of Object.values(spec.motion)) {
      if (track.type !== "clip") continue;
      assert.ok(json.animations?.some(({ name }) => name === track.clip), `${spec.asset} missing clip ${track.clip}`);
    }
  }
});

function assertMotion(track, spec, phase) {
  assert.ok(track && ["clip", "procedural"].includes(track.type), `${spec.sceneId}:${phase}:type`);
  assert.equal(typeof track.loop, "boolean", `${spec.sceneId}:${phase}:loop`);
  assert.ok(Number.isInteger(track.durationMs) && track.durationMs > 0, `${spec.sceneId}:${phase}:durationMs`);
  if (track.type === "clip") {
    assert.equal(typeof track.clip, "string", `${spec.sceneId}:${phase}:clip`);
    assert.ok(track.clip.length > 0, `${spec.sceneId}:${phase}:clip`);
    assert.equal(Object.hasOwn(track, "timeline"), false, `${spec.sceneId}:${phase}:clip timeline`);
    return;
  }

  assert.ok(track.timeline.length >= 2, `${spec.sceneId}:${phase}:timeline`);
  let previous = -1;
  let furthestProjection = 0;
  for (const frame of track.timeline) {
    assert.ok(Number.isInteger(frame.atMs) && frame.atMs > previous, `${spec.sceneId}:${phase}:atMs`);
    assert.ok(frame.atMs >= 0 && frame.atMs <= track.durationMs, `${spec.sceneId}:${phase}:timeline bounds`);
    assertTransform(frame, `${spec.sceneId}:${phase}:${frame.atMs}`);
    assert.ok(frame.opacity >= 0 && frame.opacity <= 1, `${spec.sceneId}:${phase}:${frame.atMs}:opacity`);
    furthestProjection = Math.max(furthestProjection, Math.max(0, frame.position[2]));
    previous = frame.atMs;
  }
  assert.equal(track.timeline[0].atMs, 0, `${spec.sceneId}:${phase}:timeline start`);
  assert.equal(track.timeline.at(-1).atMs, track.durationMs, `${spec.sceneId}:${phase}:timeline end`);
  assert.ok(furthestProjection <= spec.maxProjectionM, `${spec.sceneId}:${phase}:projection`);
}

function assertTransform(value, label) {
  for (const key of ["position", "rotation", "scale"]) {
    assert.equal(value[key].length, 3, `${label}:${key}`);
    assert.ok(value[key].every(Number.isFinite), `${label}:${key}`);
  }
  assert.ok(value.scale.every((component) => component > 0), `${label}:scale`);
}

function assertDeepFrozen(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertDeepFrozen(child, seen);
}

function readGlbJson(buffer, label) {
  assert.equal(buffer.toString("ascii", 0, 4), "glTF", label);
  assert.equal(buffer.readUInt32LE(4), 2, label);
  assert.equal(buffer.readUInt32LE(8), buffer.length, label);
  const jsonLength = buffer.readUInt32LE(12);
  assert.equal(buffer.readUInt32LE(16), 0x4e4f534a, label);
  return JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength).replace(/\0+$/, "").trim());
}
