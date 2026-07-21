const FACT_LABEL = "CURATED FACT";
const IMAGINED_LABEL = "IMAGINED REENACTMENT · NOT HISTORICAL TESTIMONY";

const vector = (values) => Object.freeze([...values]);

const transform = (position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) => Object.freeze({
  position: vector(position),
  rotation: vector(rotation),
  scale: vector(scale)
});

const frame = (atMs, position, rotation = [0, 0, 0], scale = [1, 1, 1], opacity = 1) => Object.freeze({
  atMs,
  ...transform(position, rotation, scale),
  opacity
});

const procedural = (durationMs, loop, timeline) => Object.freeze({
  type: "procedural",
  loop,
  durationMs,
  timeline: Object.freeze(timeline)
});

const cue = (atMs, kind, text, sourceId) => Object.freeze({
  atMs,
  kind,
  label: kind === "curated-fact" ? FACT_LABEL : IMAGINED_LABEL,
  speaker: kind === "curated-fact" ? "companion" : "artwork",
  text,
  ...(sourceId ? { sourceId } : {})
});

const source = (artworkId, title) => Object.freeze({
  id: artworkId,
  title,
  publisher: "Art Institute of Chicago",
  url: `https://www.artic.edu/artworks/${artworkId.slice(4)}`
});

const provenance = () => Object.freeze({
  artworkRights: "Underlying artwork image is public domain via Art Institute of Chicago Open Access.",
  assetOrigin: "MUSE-authored procedural GLB v1, produced locally from original project geometry without Tripo or Marble.",
  assetRights: "Original project asset released with the MUSE application.",
  historicalStatus: "The animation and imagined first-person cue are interpretive, not historical testimony."
});

const LOCAL_VISUAL_ASSET = /^\/assets\/[a-z0-9_./-]+\.(?:glb|mp4|webm|spz)$/i;
const LOCAL_SPZ_ASSET = /^\/assets\/[a-z0-9_./-]+\.spz$/i;
const LOCAL_REPRESENTATIVE_FRAME = /^\/assets\/[a-z0-9_./-]+\.(?:avif|jpe?g|png|webp)$/i;

const rejectedV1Manifest = (artworkId, asset) => Object.freeze({
  schemaVersion: 1,
  candidateId: `${artworkId}-v1`,
  asset,
  renderer: "gltf",
  provider: "muse-procedural",
  visualQa: "rejected",
  reviewNote: "Rejected: the shallow-relief model obscures the original artwork and does not meet the exhibition visual-quality bar."
});

const ambient = (durationMs, lift = 0.018, projection = 0.025) => procedural(durationMs, true, [
  frame(0, [0, 0, 0]),
  frame(Math.round(durationMs / 2), [0, lift, projection], [0, 0.012, 0], [1.01, 1.01, 1.01], 0.96),
  frame(durationMs, [0, 0, 0])
]);

const APPLE_VISION_ASSETS = Object.freeze({
  desktop: "/assets/generated/living-artworks-v2/aic-111436-marble-text/world-500k.spz",
  mobile: "/assets/generated/living-artworks-v2/aic-111436-marble-text/world-100k.spz",
  representativeFrame: "/assets/generated/living-artworks-v2/aic-111436-marble-text/thumbnail.webp"
});

const APPLE_VISION_PROVIDER = Object.freeze({
  name: "World Labs World API",
  model: "marble-1.1"
});

const APPLE_VISION_HERMES_REVIEW = Object.freeze({
  score: 9,
  minimumPassingScore: 8,
  decision: "advance-to-browser-qa"
});

const APPLE_VISION = Object.freeze({
  durationMs: 5_000,
  assets: APPLE_VISION_ASSETS,
  metricScale: 0.3159521818161011,
  groundPlaneOffset: 0.22479191422462463,
  camera: Object.freeze({
    fov: 54,
    pushFraction: 0.28,
    parallaxFraction: 0.075
  }),
  cues: Object.freeze([
    cue(700, "curated-fact", "Paul Cezanne painted The Basket of Apples around 1893.", "aic-111436"),
    cue(2_500, "imagined-reenactment", "The tilted table opens into an impossible room, then folds back into paint.")
  ]),
  manifest: Object.freeze({
    schemaVersion: 1,
    candidateId: "aic-111436-marble-text-v2",
    artworkId: "aic-111436",
    assets: APPLE_VISION_ASSETS,
    renderer: "spark-spz",
    provider: APPLE_VISION_PROVIDER,
    visualQa: "approved-for-browser-qa",
    preliminaryHermesReview: APPLE_VISION_HERMES_REVIEW
  })
});

const livingArtwork = ({
  sceneId,
  artworkId,
  title,
  durationMs,
  maxProjectionM,
  ambientMotion,
  storyTimeline,
  fact,
  imagined,
  accessibleDescription,
  vision = null
}) => {
  const asset = `/assets/living-artworks/${artworkId}-v1.glb`;
  return Object.freeze({
    sceneId,
    artworkId,
    asset,
    version: 1,
    manifest: rejectedV1Manifest(artworkId, asset),
    motion: Object.freeze({
      ambient: ambientMotion,
      story: procedural(durationMs, false, storyTimeline)
    }),
    durationMs,
    maxProjectionM,
    frameLocalTransform: transform([0, 1.48, 0.095]),
    cues: Object.freeze([
      cue(2_400, "curated-fact", fact, artworkId),
      cue(Math.min(9_200, durationMs - 6_000), "imagined-reenactment", imagined)
    ]),
    sources: Object.freeze([source(artworkId, title)]),
    accessibleDescription,
    provenance: provenance(),
    vision
  });
};

export const LIVING_ARTWORKS = Object.freeze([
  livingArtwork({
    sceneId: "threshold-conservatory",
    artworkId: "aic-153799",
    title: "Woman Bathing Her Feet in a Brook",
    durationMs: 19_000,
    maxProjectionM: 1.1,
    ambientMotion: ambient(8_000, 0.012, 0.018),
    storyTimeline: Object.freeze([
      frame(0, [0, 0, 0]),
      frame(3_000, [0, 0.035, 0.24], [-0.03, 0, 0], [1.02, 1.02, 1.02]),
      frame(7_000, [0, -0.03, 0.82], [0.08, -0.04, 0], [1.05, 1.05, 1.05]),
      frame(11_500, [0.08, 0.06, 1.1], [-0.06, 0.08, 0], [1.04, 1.04, 1.04]),
      frame(15_500, [0, 0.02, 0.42], [0.02, 0, 0], [1.02, 1.02, 1.02]),
      frame(19_000, [0, 0, 0])
    ]),
    fact: "Camille Pissarro painted Woman Bathing Her Feet in a Brook in 1895.",
    imagined: "The brook is colder than it looked. I test the current, then draw my foot back into the painted afternoon.",
    accessibleDescription: "The painting remains in its frame while the brook surface and bathing figure lean forward, test the water, and settle back."
  }),
  livingArtwork({
    sceneId: "court-of-light",
    artworkId: "aic-14655",
    title: "Two Sisters (On the Terrace)",
    durationMs: 20_000,
    maxProjectionM: 1.35,
    ambientMotion: ambient(7_500, 0.016, 0.022),
    storyTimeline: Object.freeze([
      frame(0, [0, 0, 0]),
      frame(3_200, [-0.08, 0.02, 0.32], [0, -0.08, -0.04]),
      frame(7_200, [-0.45, -0.08, 1.1], [0, -0.28, -0.55], [1.04, 1.04, 1.04]),
      frame(10_800, [0.34, -0.12, 1.35], [0.04, 0.35, 0.72], [1.05, 1.05, 1.05]),
      frame(15_700, [-0.12, 0.02, 0.5], [0, -0.08, -0.08], [1.02, 1.02, 1.02]),
      frame(20_000, [0, 0, 0])
    ]),
    fact: "Pierre-Auguste Renoir painted Two Sisters (On the Terrace) in 1881.",
    imagined: "The loose ball has escaped the terrace. Hold the strand; I will gather its bright path before the garden keeps it.",
    accessibleDescription: "A painted ball of yarn rolls beyond the frame and the red-hatted figure leans forward to draw it back onto the terrace."
  }),
  livingArtwork({
    sceneId: "water-and-light",
    artworkId: "aic-16568",
    title: "Water Lilies",
    durationMs: 18_000,
    maxProjectionM: 0.85,
    ambientMotion: ambient(9_000, 0.008, 0.035),
    storyTimeline: Object.freeze([
      frame(0, [0, 0, 0]),
      frame(3_000, [0, -0.015, 0.18], [0.03, 0, 0], [1.03, 1.01, 1.08]),
      frame(6_500, [0.05, -0.04, 0.62], [0.07, 0.04, 0], [1.08, 1.03, 1.12]),
      frame(10_000, [-0.06, 0.015, 0.85], [-0.04, -0.04, 0], [1.1, 1.04, 1.14]),
      frame(14_200, [0.03, 0, 0.38], [0.02, 0.02, 0], [1.04, 1.02, 1.07]),
      frame(18_000, [0, 0, 0])
    ]),
    fact: "Claude Monet painted this Water Lilies canvas in 1906.",
    imagined: "I carry sky and leaves together. Watch one reflection become another before the water returns to stillness.",
    accessibleDescription: "The painting's water surface folds gently out of the frame as lilies and reflections drift closer, then recedes without spilling."
  }),
  livingArtwork({
    sceneId: "sunset-frames",
    artworkId: "aic-111436",
    title: "The Basket of Apples",
    durationMs: 19_500,
    maxProjectionM: 1.4,
    ambientMotion: ambient(8_500, 0.01, 0.02),
    storyTimeline: Object.freeze([
      frame(0, [0, 0, 0]),
      frame(3_300, [0.08, -0.03, 0.3], [0.02, 0, 0.12]),
      frame(6_800, [0.46, -0.2, 1.05], [0.06, 0.22, 2.4], [1.04, 1.04, 1.04]),
      frame(10_400, [-0.3, -0.24, 1.4], [0.08, -0.3, 5.6], [1.05, 1.05, 1.05]),
      frame(15_200, [0.12, -0.04, 0.5], [0.02, 0.08, 6.15], [1.02, 1.02, 1.02]),
      frame(19_500, [0, 0, 0], [0, 0, Math.PI * 2])
    ]),
    fact: "Paul Cezanne painted The Basket of Apples around 1893.",
    imagined: "The tilted table gives me a path. I roll across its impossible angles until the folded cloth catches me.",
    accessibleDescription: "The original painting remains unobstructed until a five-second spatial vision fills the screen, pushes through an impossible apple chamber, and dissolves completely back to the framed picture.",
    vision: APPLE_VISION
  }),
  livingArtwork({
    sceneId: "burning-sky",
    artworkId: "aic-28560",
    title: "The Bedroom",
    durationMs: 21_000,
    maxProjectionM: 1.15,
    ambientMotion: ambient(8_000, 0.014, 0.02),
    storyTimeline: Object.freeze([
      frame(0, [0, 0, 0]),
      frame(3_500, [0, 0.02, 0.26], [0.02, 0, 0], [1.02, 1.02, 1.02]),
      frame(7_500, [-0.14, -0.03, 0.78], [0.05, -0.12, 0.02], [1.07, 1.05, 1.12]),
      frame(12_000, [0.2, -0.08, 1.15], [0.08, 0.14, -0.03], [1.1, 1.06, 1.18]),
      frame(16_800, [0.05, 0, 0.45], [0.02, 0.03, 0], [1.04, 1.03, 1.06]),
      frame(21_000, [0, 0, 0])
    ]),
    fact: "Vincent van Gogh painted The Bedroom in 1889.",
    imagined: "The floor no longer has to stay flat. I slide the chair forward, opening a little room inside the room.",
    accessibleDescription: "The bedroom painting unfolds into shallow space and its chair slides just beyond the frame before the room flattens again."
  }),
  livingArtwork({
    sceneId: "petal-transition",
    artworkId: "aic-27992",
    title: "A Sunday on La Grande Jatte — 1884",
    durationMs: 22_000,
    maxProjectionM: 1.25,
    ambientMotion: ambient(9_500, 0.012, 0.024),
    storyTimeline: Object.freeze([
      frame(0, [0, 0, 0]),
      frame(3_600, [0.08, 0.01, 0.28], [0, 0.06, 0], [1.02, 1.02, 1.02], 0.82),
      frame(7_800, [-0.22, -0.07, 0.9], [0.03, -0.16, -0.04], [1.05, 1.05, 1.05], 0.96),
      frame(12_200, [0.26, 0.04, 1.25], [-0.04, 0.2, 0.05], [1.06, 1.06, 1.06]),
      frame(17_500, [-0.04, 0.02, 0.48], [0, -0.04, 0], [1.03, 1.03, 1.03], 0.9),
      frame(22_000, [0, 0, 0])
    ]),
    fact: "Georges Seurat painted A Sunday on La Grande Jatte — 1884 in 1884–86 and added its border in 1888–89.",
    imagined: "Dot by dot I find my body, spring beyond the bank, and carry one brief ripple through this perfectly still afternoon.",
    accessibleDescription: "Colored points gather into the painting's small monkey, which hops through the frame while the river briefly ripples, then dissolves back into dots."
  }),
  livingArtwork({
    sceneId: "living-memory",
    artworkId: "aic-26650",
    title: "On a Balcony",
    durationMs: 18_500,
    maxProjectionM: 1.05,
    ambientMotion: ambient(8_500, 0.014, 0.018),
    storyTimeline: Object.freeze([
      frame(0, [0, 0, 0]),
      frame(3_000, [0.12, 0.04, 0.25], [0, 0.06, -0.05], [1.02, 1.02, 1.02]),
      frame(6_700, [-0.35, 0.18, 0.82], [-0.05, -0.22, -0.16], [1.04, 1.04, 1.04]),
      frame(10_200, [0.3, 0.08, 1.05], [0.06, 0.2, 0.2], [1.05, 1.05, 1.05]),
      frame(14_300, [-0.08, 0.03, 0.4], [0, -0.04, -0.04], [1.02, 1.02, 1.02]),
      frame(18_500, [0, 0, 0])
    ]),
    fact: "Mary Cassatt painted On a Balcony in 1878–79.",
    imagined: "The breeze has found the newspaper before I finished the page. I press it down as one flower petal escapes toward you.",
    accessibleDescription: "A breeze lifts the newspaper inside the balcony painting and carries a flower petal through the frame as the reader steadies the page."
  }),
  livingArtwork({
    sceneId: "infinite-repetition",
    artworkId: "aic-8991",
    title: "Improvisation No. 30 (Cannons)",
    durationMs: 20_500,
    maxProjectionM: 1.5,
    ambientMotion: ambient(7_000, 0.01, 0.03),
    storyTimeline: Object.freeze([
      frame(0, [0, 0, 0]),
      frame(3_300, [0, 0.03, 0.3], [0, 0.05, 0.04], [1.03, 1.03, 1.03], 0.78),
      frame(7_200, [-0.24, 0.12, 1.0], [-0.05, -0.18, -0.12], [1.08, 1.08, 1.08], 0.94),
      frame(11_400, [0.3, -0.05, 1.5], [0.08, 0.22, 0.18], [1.12, 1.12, 1.12]),
      frame(16_000, [-0.08, 0.04, 0.55], [0, -0.05, -0.04], [1.05, 1.05, 1.05], 0.88),
      frame(20_500, [0, 0, 0])
    ]),
    fact: "Vasily Kandinsky painted Improvisation No. 30 (Cannons) in 1913.",
    imagined: "We leave the flat field as color, rhythm, and pressure. The cannon shape opens, but what crosses the frame is only a wave of color.",
    accessibleDescription: "Abstract shapes from the painting rise into shallow relief and send a harmless pulse of color beyond the frame before becoming flat marks again."
  })
]);

export const LIVING_ARTWORK_HERO_IDS = Object.freeze(LIVING_ARTWORKS.map(({ artworkId }) => artworkId));

const BY_SCENE = new Map(LIVING_ARTWORKS.map((spec) => [spec.sceneId, spec]));
const BY_ARTWORK = new Map(LIVING_ARTWORKS.map((spec) => [spec.artworkId, spec]));

export function livingArtworkForScene(sceneId) {
  return BY_SCENE.get(sceneId) || null;
}

export function livingArtworkForArtwork(artworkId) {
  return BY_ARTWORK.get(artworkId) || null;
}

// Narrative specs stay queryable even when their visual candidate is rejected.
// Runtime callers must use the approved-only lookups below before loading media.
export function isApprovedLivingArtworkVisual(spec) {
  const manifest = spec?.manifest;
  return manifest?.visualQa === "approved"
    && manifest.schemaVersion === 1
    && typeof manifest.candidateId === "string"
    && manifest.candidateId.length > 0
    && typeof manifest.renderer === "string"
    && manifest.renderer.length > 0
    && typeof spec.asset === "string"
    && manifest.asset === spec.asset
    && LOCAL_VISUAL_ASSET.test(spec.asset)
    && !spec.asset.split("/").includes("..");
}

export function approvedLivingArtworkForScene(sceneId) {
  const spec = livingArtworkForScene(sceneId);
  return isApprovedLivingArtworkVisual(spec) ? spec : null;
}

export function approvedLivingArtworkForArtwork(artworkId) {
  const spec = livingArtworkForArtwork(artworkId);
  return isApprovedLivingArtworkVisual(spec) ? spec : null;
}

export function isBrowserQaLivingArtworkVision(spec) {
  const vision = spec?.vision;
  const manifest = vision?.manifest;
  const assets = vision?.assets;
  const manifestAssets = manifest?.assets;
  const hermes = manifest?.preliminaryHermesReview;
  const provider = manifest?.provider;
  return manifest?.schemaVersion === 1
    && manifest?.visualQa === "approved-for-browser-qa"
    && manifest?.artworkId === spec?.artworkId
    && typeof manifest?.candidateId === "string"
    && manifest.candidateId.length > 0
    && manifest?.renderer === "spark-spz"
    && provider?.name === "World Labs World API"
    && provider?.model === "marble-1.1"
    && hermes?.decision === "advance-to-browser-qa"
    && Number(hermes?.score) >= 8
    && Number(hermes?.score) >= Number(hermes?.minimumPassingScore)
    && Number.isFinite(vision?.metricScale)
    && vision.metricScale > 0
    && Number.isFinite(vision?.groundPlaneOffset)
    && vision?.durationMs === 5_000
    && validLocalAsset(assets?.desktop, LOCAL_SPZ_ASSET)
    && validLocalAsset(assets?.mobile, LOCAL_SPZ_ASSET)
    && validLocalAsset(assets?.representativeFrame, LOCAL_REPRESENTATIVE_FRAME)
    && manifestAssets?.desktop === assets.desktop
    && manifestAssets?.mobile === assets.mobile
    && manifestAssets?.representativeFrame === assets.representativeFrame;
}

export function browserQaLivingArtworkForScene(sceneId) {
  const spec = livingArtworkForScene(sceneId);
  return isBrowserQaLivingArtworkVision(spec) ? spec : null;
}

export function browserQaLivingArtworkForArtwork(artworkId) {
  const spec = livingArtworkForArtwork(artworkId);
  return isBrowserQaLivingArtworkVision(spec) ? spec : null;
}

function validLocalAsset(value, pattern) {
  return typeof value === "string"
    && pattern.test(value)
    && !value.split("/").includes("..");
}
