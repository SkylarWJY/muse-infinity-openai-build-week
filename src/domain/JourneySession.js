import { ARCHIVED_WORLDS, COMPANIONS } from "../config/legacyAssets.js";

export const JOURNEY_STAGES = Object.freeze(["threshold", "company", "curation", "walk", "salon", "rewrite"]);
export const DEFAULT_COMPANIONS = Object.freeze(["monet", "van-gogh", "socrates"]);

const COMPANION_IDS = new Set(COMPANIONS.map((item) => item.id));
const WORLD_IDS = new Set(ARCHIVED_WORLDS.map((item) => item.id));

export class JourneySession {
  constructor() {
    this.reset();
  }

  reset() {
    this.stage = "threshold";
    this.question = "";
    this.companions = [...DEFAULT_COMPANIONS];
    this.rewriteWorldId = null;
  }

  setQuestion(value) {
    const question = String(value || "").replace(/\s+/g, " ").trim().slice(0, 120);
    if (!question) throw new Error("question_required");
    this.question = question;
    this.stage = "company";
    return this.stage;
  }

  setCompanions(ids) {
    const unique = [...new Set(Array.isArray(ids) ? ids : [])];
    if (!unique.length) throw new Error("companions_required");
    if (unique.length > 3) throw new Error("too_many_companions");
    if (unique.some((id) => !COMPANION_IDS.has(id))) throw new Error("unknown_companion");
    this.companions = unique;
    return [...this.companions];
  }

  advance() {
    const index = JOURNEY_STAGES.indexOf(this.stage);
    if (index < 0 || index >= JOURNEY_STAGES.length - 1) return this.stage;
    this.stage = JOURNEY_STAGES[index + 1];
    return this.stage;
  }

  chooseRewrite(worldId) {
    if (this.stage !== "salon") throw new Error("rewrite_requires_salon");
    if (!WORLD_IDS.has(worldId) || worldId === "bright-gallery") throw new Error("unknown_rewrite_world");
    this.rewriteWorldId = worldId;
    this.stage = "rewrite";
    return this.stage;
  }
}
