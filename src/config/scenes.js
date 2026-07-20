import { SCENE_MANIFEST } from "../../shared/contracts.js";

export const WORLDS = Object.freeze([
  { id: "gallery", name: "Daylight Gallery", subtitle: "A precise room for close looking", palette: { sky: 0xb8d8dc, floor: 0xd9d5ca, wall: 0xf0eee7, accent: 0xd8ff42 } },
  { id: "garden", name: "Memory Garden", subtitle: "Observations leave a visible trace", palette: { sky: 0x8bb7aa, floor: 0x7e9271, wall: 0xdfe1cb, accent: 0xff6b4a } },
  { id: "salon", name: "Salon After Dark", subtitle: "Many readings share one source", palette: { sky: 0x1d282b, floor: 0x343938, wall: 0x4a4245, accent: 0x63dfe0 } },
  { id: "marble", name: "Marble Archive", subtitle: "World Labs spatial capture", palette: { sky: 0x151817, floor: 0x3b3d38, wall: 0x555650, accent: 0xd8ff42 }, splat: "/assets/worlds/bright-gallery.spz" }
]);

export function getSceneStop(id) {
  return SCENE_MANIFEST.stops.find((stop) => stop.id === id) || null;
}

export { SCENE_MANIFEST };
