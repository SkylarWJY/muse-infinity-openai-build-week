const placement = (x, z, groundY, yaw, guideAnchor, freestanding) => Object.freeze({
  x,
  z,
  groundY,
  yaw,
  guideAnchor: Object.freeze(guideAnchor),
  lookAt: Object.freeze([x, groundY + 1.48, z]),
  freestanding
});

// Authored from the shipped collider geometry. Keeping this manifest deterministic
// avoids repeating expensive full-scene raycast searches during every world switch.
const PLACEMENTS = Object.freeze({
  "threshold-conservatory": Object.freeze([
    placement(0.80129, -8.23513, 0.08206, -1.3403, [-3.52798, 0.1135, -7.22031], true),
    placement(1.48, -16.22667, 0.48687, -Math.PI / 2, [-2.72, 0.06254, -16.22667], true),
    placement(1.48, -22.69333, 0.40306, -Math.PI / 2, [-2.72, -0.01244, -22.69333], true),
    placement(6.96459, -34.99974, 1.5362, -1.56419, [-12, 1.5162, -35], false)
  ]),
  "court-of-light": Object.freeze([
    placement(-2.228, -0.274, 0.61097, Math.PI / 2, [1.972, 0.24479, -0.274], true),
    placement(2.4, -7, 0.11851, -Math.PI / 2, [-1, 0.23623, -7], true),
    placement(2.4, -11, 0.28084, -Math.PI / 2, [-1, 0.12988, -11], true),
    placement(0.7, -12.05551, 0.60536, -2.61799, [-1, 0.63014, -15], true)
  ]),
  "water-and-light": Object.freeze([
    placement(4.20706, -30.60294, 0.28767, -1.92786, [2.08738, 0.22819, -31.39369], true),
    placement(3.76, -26, 0.04546, -Math.PI / 2, [1.36, -0.06536, -26], true),
    placement(-4.59118, -34.00488, -0.14672, 1.69311, [-2, -0.16672, -34], false),
    placement(0.73883, -11.68178, -0.72537, 2.87979, [1.36, -0.65215, -14], true)
  ]),
  "sunset-frames": Object.freeze([
    placement(-4.25462, -1.43692, 1.87798, 2.7468, [-2.87, 1.86188, -4.76], true),
    placement(1.48, -12.82667, 0.46716, -Math.PI / 2, [-2.72, 0.56936, -12.82667], true),
    placement(1.48, -19.29333, 0.49476, -Math.PI / 2, [-2.72, 0.43472, -19.29333], true),
    placement(1.48, -25.76, 0.31838, -Math.PI / 2, [-2.72, 0.54284, -25.76], true)
  ]),
  "burning-sky": Object.freeze([
    placement(4.4, 2.8, 0.00884, -Math.PI / 2, [1.8, 0, 2.8], true),
    placement(0.29989, 5.98774, 0.072696, 1.88241, [4.3, 0.02156, 5.4], false),
    placement(3.043, 9, 0.00405, Math.PI, [3.043, 0.05224, 6.8], true),
    placement(1.62117, -5.18178, 0.02247, -2.87979, [1, 0.38432, -7.5], true)
  ]),
  "petal-transition": Object.freeze([
    placement(-14.10128, 34.86858, 2.55476, Math.PI, [-14.10128, 2.57991, 30.46858], true),
    placement(-12.55731, 37.97244, 1.50618, Math.PI, [-12.55731, 1.89556, 33.57244], true),
    placement(-9.87022, 41.37435, 1.16462, Math.PI, [-9.87022, 1.55911, 38.97435], true),
    placement(-2.25639, 37.61964, 0.329, -1.72657, [-9, 0.309, 41], false)
  ]),
  "living-memory": Object.freeze([
    placement(0.557, -3.691, -0.30343, Math.PI / 2, [3.757, 0.02083, -3.691], true),
    placement(0.557, -10.15767, -0.13301, Math.PI / 2, [3.757, -0.06771, -10.15767], true),
    placement(0.557, -16.62433, 0.15363, Math.PI / 2, [3.757, 0.41689, -16.62433], true),
    placement(6.957, -17.191, 0.25503, -Math.PI / 2, [3.757, 0.47716, -17.191], true)
  ]),
  "infinite-repetition": Object.freeze([
    placement(-3.92, -1.6016, -0.28321, 0, [-3.92, -0.15036, 1], true),
    placement(2.54667, -1.6016, 0.15136, 0, [2.54667, 0.34322, 1], true),
    placement(9.01333, -1.6016, 0.79095, 0, [9.01333, 0.81706, 1], true),
    placement(14.08, -1.2, 1.3086, 0, [14.08, 1.21198, 1], true)
  ]),
  "personal-dream-world": Object.freeze([
    placement(0.216, -2.306, -0.17145, 0, [0.2, 0.1, 1.3], true),
    placement(-1.2, 9, 0.49708, 2.661, [0, 0.37, 6.7], true),
    placement(-0.7, 14, 0.6, 2.912, [0, 0.5, 11], true),
    placement(0.216, -10.36467, -0.96844, 0, [0.216, -0.66865, -7.36467], true)
  ])
});

export function artworkPlacementsForScene(sceneId) {
  return PLACEMENTS[sceneId] || null;
}
