import { SCENE_MANIFEST } from "../../shared/contracts.js";

const palette = (sky, floor, wall, accent) => ({ sky, floor, wall, accent });

export const ARCHIVED_WORLDS = Object.freeze([
  world({
    id: "bright-gallery",
    name: "Bright Gallery Hall",
    subtitle: "World Labs archive · the threshold and main exhibition",
    splat: "/assets/worlds/bright-gallery.spz",
    thumb: "/assets/thumbs/bright-gallery.jpg",
    palette: palette(0xdce4df, 0xd8d3c8, 0xefede7, 0xd8ff42),
    transform: { scale: 0.80177665, rotationX: Math.PI, y: 0.5 },
    sourceSplats: 500000,
    deployedSplats: 500000,
    deployment: "Original muse-infinity web export",
    profile: {
      spawn: { x: 0, z: -1.14 },
      guideSpawn: { x: -0.55, z: -2.5 },
      groundY: 0,
      bounds: { minX: -2.42, maxX: 2.36, minZ: -26.84, maxZ: 24.55 },
      yaw: 0,
      cameraFar: 300,
      routeDistances: [4.8, 11.6, 18.4],
      frameLateral: 2.05,
      guideLateral: 0.72
    },
    provenance: "World Labs Marble world ID prefix 705b7748...; archived by muse-infinity"
  }),
  world({
    id: "van-gogh-gallery",
    name: "Van Gogh Gallery",
    subtitle: "Archived world · emotion turns into architecture",
    splat: "/assets/worlds/van-gogh-gallery.spz",
    thumb: "/assets/thumbs/van-gogh-gallery.jpg",
    palette: palette(0x141820, 0x30343a, 0x47413b, 0xffbd45),
    transform: { scale: 1.7, rotationX: 0, y: 0 },
    sourceSplats: 3840000,
    deployedSplats: 500000,
    deployment: "Deterministic area-compensated web derivative",
    profile: {
      spawn: { x: 3.043, z: 0.51 },
      guideSpawn: { x: 2.3, z: -1.2 },
      groundY: 0,
      bounds: { minX: -4.199, maxX: 17, minZ: -24.854, maxZ: 23.341 },
      yaw: 0,
      cameraFar: 340,
      routeDistances: [5.2, 11.5, 18],
      frameLateral: 3,
      guideLateral: 1.15
    },
    provenance: "World Labs archived output from muse-infinity"
  }),
  world({
    id: "infinity-room",
    name: "Infinity Dot Room",
    subtitle: "Archived world · a final chamber for the rewritten answer",
    splat: "/assets/worlds/infinity-room.spz",
    thumb: "/assets/thumbs/infinity-room.jpg",
    palette: palette(0x120f0b, 0x2e281e, 0x4b3e23, 0xffd43b),
    transform: { scale: 2, rotationX: 0, y: 0 },
    sourceSplats: 1920000,
    deployedSplats: 500000,
    deployment: "Deterministic area-compensated web derivative",
    profile: {
      spawn: { x: 0.08, z: 0.5 },
      guideSpawn: { x: -1.2, z: 0 },
      groundY: 0,
      bounds: { minX: -8.86, maxX: 16.96, minZ: -5.36, maxZ: 10.9 },
      yaw: -Math.PI / 2,
      cameraFar: 300,
      routeDistances: [2.2, 4.8, 7.2],
      frameLateral: 3.2,
      guideLateral: 1.15
    },
    provenance: "World Labs archived output from muse-infinity"
  })
]);

export const COMPANIONS = Object.freeze([
  companion("monet", "Claude Monet", "MONET", "Light changes the answer before the scene can settle.", "#76b8ad"),
  companion("van-gogh", "Vincent van Gogh", "VAN GOGH", "Color carries pressure, work, and emotional temperature.", "#e0ae4e"),
  companion("socrates", "Socrates", "SOCRATES", "Every image is a claim waiting to be examined.", "#d2c9bb"),
  companion("frida", "Frida Kahlo", "FRIDA", "The image becomes a body, a wound, and an offering.", "#c85a74"),
  companion("picasso", "Pablo Picasso", "PICASSO", "One viewpoint is never enough to hold the whole truth.", "#df786d")
]);

export function getWorld(id) {
  return ARCHIVED_WORLDS.find((item) => item.id === id) || ARCHIVED_WORLDS[0];
}

export function getCompanion(id) {
  return COMPANIONS.find((item) => item.id === id) || null;
}

export function stopsForWorld(worldId) {
  const active = getWorld(worldId);
  const { spawn, yaw, routeDistances, frameLateral, guideLateral, groundY } = active.profile;
  const forward = { x: Math.sin(yaw), z: -Math.cos(yaw) };
  const right = { x: Math.cos(yaw), z: Math.sin(yaw) };
  return SCENE_MANIFEST.stops.map((stop, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    const distance = routeDistances[index];
    const center = {
      x: spawn.x + forward.x * distance,
      z: spawn.z + forward.z * distance
    };
    return Object.freeze({
      ...stop,
      guideAnchor: [center.x + right.x * guideLateral * side, groundY, center.z + right.z * guideLateral * side],
      lookAt: [center.x + right.x * frameLateral * side, groundY + 1.58, center.z + right.z * frameLateral * side],
      artworkPosition: [center.x + right.x * frameLateral * side, groundY + 1.58, center.z + right.z * frameLateral * side],
      artworkYaw: yaw + (side < 0 ? Math.PI / 2 : -Math.PI / 2)
    });
  });
}

function world(value) {
  return Object.freeze({ ...value, archived: true });
}

function companion(id, fullName, name, lens, color) {
  return Object.freeze({
    id,
    fullName,
    name,
    lens,
    color,
    model: `/assets/characters/${id}.glb`,
    portrait: `/assets/portraits/${id}.jpg`,
    provenance: "Optimized from the corresponding muse-infinity Tripo GLB"
  });
}
