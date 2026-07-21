const volume = (center, extent) => Object.freeze({
  center: Object.freeze([...center]),
  extent: Object.freeze([...extent])
});

const life = (kind, mode, count, seed, center, extent, options = {}) => Object.freeze({
  kind,
  mode,
  count,
  seed,
  volume: volume(center, extent),
  ...options
});

export const WHITE_DOVE_ASSET = "/assets/creatures/white-dove.glb";

// These are authored world-space volumes, not semantic regions inferred from navigation bounds.
export const AMBIENT_LIFE_BY_SCENE = Object.freeze({
  "threshold-conservatory": Object.freeze([
    life("butterfly", "drift", 2, 1101, [-1.2, 3.1, -13.2], [3.2, 0.9, 4.2], {
      color: 0xf0b7d1,
      period: 8.5,
      scale: 0.2
    }),
    life("white-dove", "flyby", 1, 1102, [-2.5, 7.2, -20], [10, 1.8, 5.5], {
      asset: WHITE_DOVE_ASSET,
      color: 0xf4f3ee,
      period: 12,
      scale: 0.55
    })
  ]),
  "court-of-light": Object.freeze([
    life("butterfly", "drift", 2, 1201, [2.4, 1.85, -3.8], [3.8, 0.85, 4.2], {
      color: 0xe58ea5,
      period: 9,
      scale: 0.18
    })
  ]),
  "water-and-light": Object.freeze([
    // The inherited collider places this pond surface near y=0.09; keep koi below it.
    life("koi", "orbit", 3, 1301, [1.6, -0.08, -28.4], [3.1, 0.16, 4.1], {
      color: 0xef744f,
      period: 10.5,
      scale: 0.48
    }),
    life("dragonfly", "drift", 1, 1302, [2.3, 0.82, -28.1], [3.8, 0.3, 4.6], {
      color: 0x55c5bd,
      period: 7,
      scale: 0.2
    })
  ]),
  "sunset-frames": Object.freeze([
    life("white-dove", "orbit", 2, 1401, [-1.5, 15.2, -15.8], [8.5, 1.9, 7.5], {
      asset: WHITE_DOVE_ASSET,
      color: 0xf4f3ee,
      period: 14,
      scale: 0.66
    })
  ]),
  "burning-sky": Object.freeze([
    life("crow", "flyby", 3, 1501, [3.7, 5.4, -11.2], [4.4, 0.9, 4.6], {
      color: 0x17191d,
      period: 10,
      scale: 0.58
    })
  ]),
  "petal-transition": Object.freeze([
    life("dragonfly", "drift", 2, 1601, [-13.6, 6.75, 31.2], [3.1, 0.75, 4.2], {
      color: 0xb67950,
      period: 7.5,
      scale: 0.2
    }),
    life("white-dove", "flyby", 1, 1602, [-9.5, 10.2, 38], [8.5, 1.7, 5.8], {
      asset: WHITE_DOVE_ASSET,
      color: 0xf4f3ee,
      period: 13,
      scale: 0.5
    })
  ]),
  "living-memory": Object.freeze([
    life("tropical-bird", "flyby", 1, 1701, [3.6, 4.8, -11.8], [7.2, 1.5, 5.5], {
      color: 0x4f9c76,
      accent: 0xd94f55,
      period: 12,
      scale: 0.58
    }),
    life("butterfly", "drift", 2, 1702, [4, 2, -6.4], [3.7, 0.85, 4], {
      color: 0xef9a52,
      period: 8,
      scale: 0.18
    })
  ]),
  "infinite-repetition": Object.freeze([
    life("dots", "float", 24, 1801, [-6.5, 2.35, 2.1], [1.55, 1.75, 2.45], {
      color: 0xffd43b,
      period: 9,
      scale: 0.12
    })
  ]),
  "personal-dream-world": Object.freeze([
    life("firefly", "float", 24, 1901, [0.2, 2.9, -3], [2.35, 1.45, 3.9], {
      color: 0xffe6a8,
      period: 8,
      scale: 0.075
    })
  ])
});

export const AMBIENT_SCENE_IDS = Object.freeze(Object.keys(AMBIENT_LIFE_BY_SCENE));

export function ambientLifeForScene(sceneId) {
  return AMBIENT_LIFE_BY_SCENE[sceneId] || Object.freeze([]);
}
