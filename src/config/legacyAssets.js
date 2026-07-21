import { SCENE_MANIFEST } from "../../shared/contracts.js";

const palette = (sky, floor, wall, accent) => Object.freeze({ sky, floor, wall, accent });

const CANONICAL_WORLDS = [
  {
    id: "grand-conservatory-with-lush-gardens",
    sceneId: "threshold-conservatory",
    name: "Grand Conservatory with Lush Gardens",
    subtitle: "01 / ARRIVAL · The Threshold Conservatory",
    scene: scene("threshold-conservatory", "The Threshold Conservatory", "A cross-temporal salon", "/assets/scenes/01-entrance-conservatory.png"),
    rad: "/assets/worlds/grand-conservatory.rad",
    collider: "/assets/worlds/grand-conservatory-collider.glb",
    thumb: "/assets/thumbs/grand-conservatory-with-lush-gardens.jpg",
    sourceSplats: 4_320_000,
    worldScale: 1.7,
    palette: palette(0xdce7df, 0x788a70, 0xd8dfd1, 0xc5ef5a),
    profile: profile(-1.6, -4.8, 0.9, -47.15, 41.28, -56.41, 39.15, 0, 400)
  },
  {
    id: "elegant-floral-palace-interior",
    sceneId: "court-of-light",
    name: "Elegant Floral Palace Interior",
    subtitle: "02 / QUESTION · The Court of Light",
    scene: scene("court-of-light", "The Court of Light", "Sigmund Freud", "/assets/scenes/02-court-of-light.png"),
    rad: "/assets/worlds/elegant-floral-palace.rad",
    collider: "/assets/worlds/elegant-floral-palace-collider.glb",
    thumb: "/assets/thumbs/elegant-floral-palace-interior.jpg",
    sourceSplats: 4_320_000,
    worldScale: 1.7,
    palette: palette(0xf2e3dd, 0xccb7ad, 0xf0dfdb, 0xe999a4),
    profile: profile(1.16, 0.78, 0.2, -8.12, 12.73, -10.4, 11.44, 0, 200)
  },
  {
    id: "enchanted-water-garden-sanctuary",
    sceneId: "water-and-light",
    name: "Enchanted Water Garden Sanctuary",
    subtitle: "03 / PERCEPTION · The Garden of Water and Light",
    scene: scene("water-and-light", "The Garden of Water and Light", "Claude Monet", "/assets/scenes/03-monet-water-and-light.png"),
    rad: "/assets/worlds/enchanted-water-garden.rad",
    collider: "/assets/worlds/enchanted-water-garden-collider.glb",
    thumb: "/assets/thumbs/enchanted-water-garden-sanctuary.jpg",
    sourceSplats: 4_320_000,
    worldScale: 1.7,
    palette: palette(0xc7dedc, 0x718e7c, 0xdce5d8, 0x74cec0),
    profile: profile(0.8, -19, 1.1, -6.36, 23.3, -41.25, 16.21, Math.PI, 400)
  },
  {
    id: "dreamlike-coastal-villa-gardens",
    sceneId: "sunset-frames",
    name: "Dreamlike Coastal Villa Gardens",
    subtitle: "04 / INVENTION · The Sunset Frame Gallery",
    scene: scene("sunset-frames", "The Sunset Frame Gallery", "Pablo Picasso", "/assets/scenes/04-sunset-frame-gallery.png"),
    rad: "/assets/worlds/dreamlike-coastal-villa.rad",
    collider: "/assets/worlds/dreamlike-coastal-villa-collider.glb",
    thumb: "/assets/thumbs/dreamlike-coastal-villa-gardens.jpg",
    sourceSplats: 2_400_000,
    worldScale: 1.7,
    palette: palette(0xeccfc0, 0xa58d78, 0xe9d3c5, 0xe7705c),
    profile: profile(-1.6, -2.8, 5.6, -30.63, 21.07, -39.06, 33.44, 0, 400)
  },
  {
    id: "van-gogh-inspired-gallery-interior",
    sceneId: "burning-sky",
    name: "Van Gogh Inspired Gallery Interior",
    subtitle: "05 / INTENSITY · The Studio of the Burning Sky",
    scene: scene("burning-sky", "The Studio of the Burning Sky", "Vincent van Gogh", "/assets/scenes/05-van-gogh-burning-sky.png"),
    rad: "/assets/worlds/van-gogh-gallery-hd.rad",
    collider: "/assets/worlds/van-gogh-gallery-hd-collider.glb",
    thumb: "/assets/thumbs/van-gogh-inspired-gallery-interior.jpg",
    sourceSplats: 3_840_000,
    worldScale: 1.7,
    palette: palette(0x171925, 0x34363e, 0x4d453e, 0xf2b943),
    profile: profile(1.79, 0.3, 0, -2.47, 10, -14.62, 13.73, 0, 200)
  },
  {
    id: "sunlit-palace-gardens",
    sceneId: "petal-transition",
    name: "Sunlit Palace Gardens",
    subtitle: "06 / TRANSFORMATION · The Petal Transition Hall",
    scene: scene("petal-transition", "The Petal Transition Hall", "Qi Baishi", "/assets/scenes/06-petal-transition-hall.png"),
    rad: "/assets/worlds/sunlit-palace-gardens.rad",
    collider: "/assets/worlds/sunlit-palace-gardens-collider.glb",
    thumb: "/assets/thumbs/sunlit-palace-gardens.jpg",
    sourceSplats: 4_320_000,
    worldScale: 1.7,
    palette: palette(0xeadfc4, 0x9b9c70, 0xe5d6ad, 0xd8965d),
    profile: profile(-7.3838, 16.9279, 1.256, -75.29, 68.24, 1.12, 82.68, 2.68, 400)
  },
  {
    id: "mexican-courtyard-bedroom-fantasy",
    sceneId: "living-memory",
    name: "Mexican Courtyard Bedroom Fantasy",
    subtitle: "07 / IDENTITY · The Courtyard of Living Memory",
    scene: scene("living-memory", "The Courtyard of Living Memory", "Frida Kahlo", "/assets/scenes/07-frida-living-memory.png"),
    rad: "/assets/worlds/mexican-courtyard.rad",
    collider: "/assets/worlds/mexican-courtyard-collider.glb",
    thumb: "/assets/thumbs/mexican-courtyard-bedroom-fantasy.jpg",
    sourceSplats: 4_320_000,
    worldScale: 1.7,
    palette: palette(0x8fb9b4, 0xa05f46, 0xdbc18e, 0xe65858),
    profile: profile(2.21, -1.23, 0.1, -21.02, 23.04, -22.3, 17.39, 0, 400)
  },
  {
    id: "yellow-polka-dot-infinity-room",
    sceneId: "infinite-repetition",
    name: "Yellow Polka Dot Infinity Room",
    subtitle: "08 / INFINITY · The Infinite Repetition Chamber",
    scene: scene("infinite-repetition", "The Infinite Repetition Chamber", "Yayoi Kusama", "/assets/scenes/08-kusama-infinite-dots.png"),
    render: "mesh",
    mesh: "/assets/worlds/yellow-infinity-room-texture-mesh.glb",
    splat: "/assets/worlds/yellow-infinity-room.spz",
    collider: "/assets/worlds/yellow-infinity-room-collider.glb",
    thumb: "/assets/thumbs/yellow-polka-dot-infinity-room.jpg",
    sourceSplats: 1_920_000,
    worldScale: 2,
    palette: palette(0x100e08, 0x2d281c, 0x4b3e23, 0xffd43b),
    profile: profile(-2.76, 0.5, 0, -4.43, 8.48, -2.68, 5.45, -Math.PI / 2, 200, 0.2, 6.8)
  },
  {
    id: "fantasy-realm-of-shimmering-spheres",
    sceneId: "personal-dream-world",
    name: "Fantasy Realm of Shimmering Spheres",
    subtitle: "09 / ANSWER · Your Dream World",
    scene: scene("personal-dream-world", "Your Dream World", "MUSE + visitor", "/assets/scenes/09-final-dream-world.png"),
    render: "mesh",
    mesh: "/assets/worlds/fantasy-shimmering-spheres-texture-mesh.glb",
    collider: "/assets/worlds/fantasy-shimmering-spheres-collider.glb",
    thumb: "/assets/thumbs/fantasy-realm-of-shimmering-spheres.jpg",
    sourceSplats: null,
    worldScale: 1.8,
    palette: palette(0x05070a, 0x1c2230, 0x303749, 0xc9e8ff),
    profile: profile(0.12, 0.83, 0.5, -2.08, 2.08, -6.83, 9.99, 0, 200)
  }
];

export const ARCHIVED_WORLDS = Object.freeze(CANONICAL_WORLDS.map(world));

export const COMPANIONS = Object.freeze([
  companion("monet", "Claude Monet", "MONET", "Light changes the answer before the scene can settle.", "#76b8ad"),
  companion("van-gogh", "Vincent van Gogh", "VAN GOGH", "Color carries pressure, work, and emotional temperature.", "#e0ae4e"),
  companion("socrates", "Socrates", "SOCRATES", "Every image is a claim waiting to be examined.", "#d2c9bb"),
  companion("frida", "Frida Kahlo", "FRIDA", "The image becomes a body, a wound, and an offering.", "#c85a74"),
  companion("picasso", "Pablo Picasso", "PICASSO", "One viewpoint is never enough to hold the whole truth.", "#df786d"),
  companion("freud", "Sigmund Freud", "FREUD", "Inherited desires often speak before conscious intention.", "#8d8294", "/assets/portraits/freud-card.jpg"),
  companion("qi-baishi", "Qi Baishi", "QI BAISHI", "A spare mark can still contain a living world.", "#76926a", "/assets/portraits/qi-baishi-card.jpg"),
  companion("yayoi-kusama", "Yayoi Kusama", "KUSAMA", "Repetition can dissolve the boundary of the self.", "#e6bf32", "/assets/portraits/yayoi-kusama-card.jpg")
]);

export function getWorld(id) {
  return ARCHIVED_WORLDS.find((item) => item.id === id) || ARCHIVED_WORLDS[0];
}

export function getCompanion(id) {
  return COMPANIONS.find((item) => item.id === id) || null;
}

export function stopsForWorld(worldId) {
  const active = getWorld(worldId);
  const manifestStops = Array.isArray(SCENE_MANIFEST?.stops) ? SCENE_MANIFEST.stops : [];
  const declared = manifestStops.find((stop) => {
    const stopWorld = stop.worldId || stop.world_id;
    const stopId = stop.id || stop.stop_id;
    return stopWorld === active.id || stopId === active.sceneId;
  });
  const source = declared || active.scene;
  const id = source.id || source.stop_id || active.sceneId;
  const { spawn, yaw, groundY } = active.profile;
  const forward = { x: Math.sin(yaw), z: -Math.cos(yaw) };
  const right = { x: Math.cos(yaw), z: Math.sin(yaw) };
  const guideAnchor = [spawn.x + forward.x * 3.1 - right.x * 0.7, groundY, spawn.z + forward.z * 3.1 - right.z * 0.7];
  const artworkPosition = [spawn.x + forward.x * 4.3 + right.x * 1.65, groundY + 1.55, spawn.z + forward.z * 4.3 + right.z * 1.65];
  return [Object.freeze({
    ...source,
    id,
    stop_id: id,
    worldId: active.id,
    image: source.image || source.thumbnail || active.scene.image,
    guideAnchor: source.guideAnchor || guideAnchor,
    lookAt: source.lookAt || artworkPosition,
    artworkPosition: source.artworkPosition || artworkPosition,
    artworkYaw: Number.isFinite(source.artworkYaw) ? source.artworkYaw : yaw - Math.PI / 2
  })];
}

function world(value) {
  const render = value.render || (value.mesh ? "mesh" : "splat");
  const scale = value.worldScale || 1;
  const scaled = scaleProfile(value.profile, scale);
  const guideRight = { x: Math.cos(scaled.yaw), z: Math.sin(scaled.yaw) };
  scaled.guideSpawn = Object.freeze({
    x: scaled.spawn.x - guideRight.x * 1.15,
    z: scaled.spawn.z - guideRight.z * 1.15
  });
  return Object.freeze({
    ...value,
    render,
    archived: true,
    deployedSplats: value.sourceSplats,
    deployment: render === "mesh" ? "Archived 8K texture mesh" : "Quality RAD streamed from the original World Labs SPZ",
    transform: Object.freeze({ scale, rotationX: 0, y: 0 }),
    profile: Object.freeze(scaled),
    provenance: "World Labs archive from muse-infinity; native proportions preserved"
  });
}

function scaleProfile(value, scale) {
  return {
    spawn: Object.freeze({ x: value.spawn.x * scale, z: value.spawn.z * scale }),
    groundY: value.groundY * scale,
    bounds: Object.freeze({
      minX: value.bounds.minX * scale,
      maxX: value.bounds.maxX * scale,
      minZ: value.bounds.minZ * scale,
      maxZ: value.bounds.maxZ * scale
    }),
    yaw: value.yaw,
    cameraFar: value.cameraFar * Math.max(1, scale),
    cameraPitch: value.cameraPitch,
    cameraDistance: value.cameraDistance
  };
}

function profile(x, z, groundY, minX, maxX, minZ, maxZ, yaw, cameraFar, cameraPitch = -0.14, cameraDistance = 5.6) {
  return { spawn: { x, z }, groundY, bounds: { minX, maxX, minZ, maxZ }, yaw, cameraFar, cameraPitch, cameraDistance };
}

function scene(id, title, artist, image) {
  return Object.freeze({ id, stop_id: id, title, artist, image });
}

function companion(id, fullName, name, lens, color, portrait = `/assets/portraits/${id}.jpg`) {
  return Object.freeze({
    id,
    fullName,
    name,
    lens,
    color,
    model: `/assets/characters/${id}.glb`,
    portrait,
    provenance: "Optimized from the corresponding muse-infinity character GLB"
  });
}
