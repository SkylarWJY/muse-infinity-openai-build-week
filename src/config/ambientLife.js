const EMPTY = Object.freeze([]);

const volume = (center, extent) => Object.freeze({
  center: Object.freeze([...center]),
  extent: Object.freeze([...extent])
});

const pointField = (kind, count, seed, center, extent, options) => Object.freeze({
  kind,
  mode: "float",
  count,
  seed,
  volume: volume(center, extent),
  ...options
});

export const AMBIENT_ASSET_PIPELINE = Object.freeze({
  reference: "gpt-image-2",
  multiview: true,
  subjectProvider: "tripo",
  animation: "embedded-clip",
  visualQa: "approved"
});

const LOCAL_GLB_ASSET = /^\/assets\/[a-z0-9_./-]+\.glb$/i;

// Concrete subjects stay disabled until every production and QA gate is recorded on the spec.
export function isApprovedAmbientAsset(spec) {
  const pipeline = spec?.pipeline;
  return spec?.approved === true
    && typeof spec.asset === "string"
    && LOCAL_GLB_ASSET.test(spec.asset)
    && !spec.asset.split("/").includes("..")
    && typeof spec.animationClip === "string"
    && spec.animationClip.trim().length > 0
    && pipeline?.reference === AMBIENT_ASSET_PIPELINE.reference
    && pipeline?.multiview === AMBIENT_ASSET_PIPELINE.multiview
    && pipeline?.subjectProvider === AMBIENT_ASSET_PIPELINE.subjectProvider
    && pipeline?.animation === AMBIENT_ASSET_PIPELINE.animation
    && pipeline?.visualQa === AMBIENT_ASSET_PIPELINE.visualQa;
}

// Abstract point fields are intentionally named for what they render; they are not floral assets.
export const AMBIENT_LIFE_BY_SCENE = Object.freeze({
  "threshold-conservatory": EMPTY,
  "court-of-light": EMPTY,
  "water-and-light": EMPTY,
  "sunset-frames": EMPTY,
  "burning-sky": EMPTY,
  "petal-transition": EMPTY,
  "living-memory": EMPTY,
  "infinite-repetition": Object.freeze([
    pointField("dots", 24, 1801, [-6.5, 2.35, 2.1], [1.55, 1.75, 2.45], {
      color: 0xffd43b,
      period: 9,
      scale: 0.12
    })
  ]),
  "personal-dream-world": Object.freeze([
    pointField("firefly", 24, 1901, [0.2, 2.9, -3], [2.35, 1.45, 3.9], {
      color: 0xffe6a8,
      period: 8,
      scale: 0.075
    })
  ])
});

export const AMBIENT_SCENE_IDS = Object.freeze(Object.keys(AMBIENT_LIFE_BY_SCENE));

export function ambientLifeForScene(sceneId) {
  return AMBIENT_LIFE_BY_SCENE[sceneId] || EMPTY;
}
