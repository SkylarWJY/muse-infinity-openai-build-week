import { SCENE_MANIFEST } from "../../shared/contracts.js";
import { ARCHIVED_WORLDS, stopsForWorld } from "./legacyAssets.js";

export const WORLDS = ARCHIVED_WORLDS;

export function getSceneStop(id, worldId = ARCHIVED_WORLDS[0].id) {
  return stopsForWorld(worldId).find((stop) => stop.id === id) || null;
}

export { SCENE_MANIFEST };
