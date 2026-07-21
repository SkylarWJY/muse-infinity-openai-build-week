import { SCENE_MANIFEST } from "../../shared/contracts.js";
import { ARCHIVED_WORLDS, stopsForWorld } from "./legacyAssets.js";

export const WORLDS = ARCHIVED_WORLDS;

export function getSceneStop(id, worldId = ARCHIVED_WORLDS[0].id) {
  return stopsForWorld(worldId).find((stop) => stop.id === id || stop.stop_id === id) || null;
}

export function getSceneWorld(sceneId) {
  return ARCHIVED_WORLDS.find((world) => world.sceneId === sceneId) || null;
}

export { SCENE_MANIFEST };
