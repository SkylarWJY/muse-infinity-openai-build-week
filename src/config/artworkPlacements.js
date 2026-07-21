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
    placement(-1.47, -8.16, 0.08206, -1.14246, [-3.52798, 0.1135, -7.22031], true),
    placement(4.45959, -12.69896, 1.21395, -1.54485, [-4, 1.19395, -12.7], false),
    placement(4.43523, -14.70165, 1.06713, -1.61207, [-4, 1.04713, -14.7], false),
    placement(0.48, -29.16, -0.02934, -Math.PI / 2, [-2.72, -0.2007, -29.16], true)
  ]),
  "court-of-light": Object.freeze([
    placement(-5.59736, -4.05776, 0.87519, 0.01005, [-1, 0.85519, 0.5], false),
    placement(1.4, -7, 0.11851, -Math.PI / 2, [-1, 0.23623, -7], true),
    placement(1.4, -11, 0.28084, -Math.PI / 2, [-1, 0.12988, -11], true),
    placement(0.2, -12.92154, 0.60536, -2.61799, [-1, 0.63014, -15], true)
  ]),
  "water-and-light": Object.freeze([
    placement(4.20706, -30.60294, 0.28767, -1.92786, [2.08738, 0.22819, -31.39369], true),
    placement(3.76, -26, 0.04546, -Math.PI / 2, [1.36, -0.06536, -26], true),
    placement(-4.59118, -34.00488, -0.14672, 1.69311, [-2, -0.16672, -34], false),
    placement(0.73883, -11.68178, -0.72537, 2.87979, [1.36, -0.65215, -14], true)
  ]),
  "sunset-frames": Object.freeze([
    placement(-3.87, -2.36, 1.87798, 2.7468, [-2.87, 1.86188, -4.76], true),
    placement(0.48, -12.82667, 0.46716, -Math.PI / 2, [-2.72, 0.56936, -12.82667], true),
    placement(0.48, -19.29333, 0.49476, -Math.PI / 2, [-2.72, 0.43472, -19.29333], true),
    placement(0.48, -25.76, 0.31838, -Math.PI / 2, [-2.72, 0.54284, -25.76], true)
  ]),
  "burning-sky": Object.freeze([
    placement(3.51417, 2.82822, 0.00884, -2.87979, [2.893, -0.01453, 0.51], true),
    placement(0.29989, 5.98774, 0.072696, 1.88241, [3.043, 0.052696, 6], false),
    placement(3.043, 0.4, 0.00405, Math.PI, [3.043, 0.0382, -2], true),
    placement(1.62117, -5.18178, 0.02247, -2.87979, [1, 0.38432, -7.5], true)
  ]),
  "petal-transition": Object.freeze([
    placement(-1.49712, 24.35291, 2.54679, -1.60652, [-14.5, 2.52679, 25.4], false),
    placement(-1.64687, 28.12474, 1.91556, -1.58529, [-12.55731, 1.89556, 33.57244], false),
    placement(-1.7518, 31.02913, 1.43382, -1.59858, [-12, 1.41382, 36], false),
    placement(-1.83507, 33.2794, 1.15598, -1.64137, [-10.53828, 1.13598, 37.63134], false)
  ]),
  "living-memory": Object.freeze([
    placement(3.757, -6.891, 0.05361, 0, [3.757, 0.02083, -3.691], true),
    placement(3.757, -13.357, 0.06456, 0, [3.757, -0.06618, -10.157], true),
    placement(6.957, -16.623, 0.26706, -Math.PI / 2, [3.757, 0.41682, -16.623], true),
    placement(3.69706, -16.30294, 0.40204, -3 * Math.PI / 4, [2, 0.27111, -18], true)
  ]),
  "infinite-repetition": Object.freeze([
    placement(-3.92, -1.6016, -0.28321, 0, [-3.92, -0.15036, 1], true),
    placement(2.54667, -1.6016, 0.15136, 0, [2.54667, 0.34322, 1], true),
    placement(9.01333, -1.6016, 0.79095, 0, [9.01333, 0.81706, 1], true),
    placement(14.08, -1.2, 1.3086, 0, [14.08, 1.21198, 1], true)
  ]),
  "personal-dream-world": Object.freeze([
    placement(0.216, -2.306, -0.17145, 0, [0.216, 0.00991, -0.106], true),
    placement(0.216, 9, 0.49708, Math.PI, [0.216, 0.37465, 6.7], true),
    placement(0.216, -10.36467, -0.96844, 0, [0.216, -0.66865, -7.36467], true),
    placement(0.216, -6.494, -0.58822, Math.PI, [0.216, -0.94601, -9.494], true)
  ])
});

export function artworkPlacementsForScene(sceneId) {
  return PLACEMENTS[sceneId] || null;
}
