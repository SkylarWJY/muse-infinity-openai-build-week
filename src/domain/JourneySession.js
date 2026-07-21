import {
  DEFAULT_COMPANION_IDS,
  HISTORICAL_COMPANIONS,
  PHILOSOPHY_AXES,
  PROCESS_SCENE_IDS,
  validateSalon,
  validateTransformation
} from "../../shared/contracts.js";
import { FINAL_SCENE } from "../config/exhibitionSpine.js";

export const JOURNEY_STAGES = Object.freeze([
  "threshold",
  "life_question",
  "companion_selection",
  "ai_curation",
  "world_exploration",
  "summoning",
  "roundtable",
  "decision",
  "world_transformation",
  "manifesto"
]);

export const DEFAULT_COMPANIONS = DEFAULT_COMPANION_IDS;

const COMPANION_IDS = new Set(HISTORICAL_COMPANIONS.map((item) => item.id));
const AXES = new Set(PHILOSOPHY_AXES);
const PROCESS_SCENE_ID_SET = new Set(PROCESS_SCENE_IDS);

export class JourneySession {
  constructor() {
    this.reset();
  }

  reset() {
    this.stage = "threshold";
    this.question = "";
    this.companions = [...DEFAULT_COMPANIONS];
    this.visitedSceneIds = [];
    this.finalConcept = null;
    this.contradiction = null;
    this.manifesto = "";
    this.finalWorldEntered = false;
  }

  crossThreshold() {
    this.#requireStage("threshold", "threshold_required");
    this.stage = "life_question";
    return this.stage;
  }

  setQuestion(value) {
    this.#requireStage("life_question", "question_requires_life_question");
    const question = clean(value, 160);
    if (!question) throw new Error("question_required");
    this.question = question;
    this.stage = "companion_selection";
    return this.stage;
  }

  setCompanions(ids) {
    this.#requireStage("companion_selection", "companions_require_selection_stage");
    const unique = [...new Set(Array.isArray(ids) ? ids : [])];
    if (!unique.length) throw new Error("companions_required");
    if (unique.length > 3) throw new Error("too_many_companions");
    if (unique.some((id) => !COMPANION_IDS.has(id))) throw new Error("unknown_companion");
    this.companions = unique;
    return [...this.companions];
  }

  beginCuration() {
    this.#requireStage("companion_selection", "curation_requires_companion_selection");
    if (!this.question) throw new Error("question_required");
    if (!this.companions.length) throw new Error("companions_required");
    this.stage = "ai_curation";
    return this.stage;
  }

  acceptCuration() {
    this.#requireStage("ai_curation", "exploration_requires_curation");
    this.stage = "world_exploration";
    return this.stage;
  }

  recordSceneVisit(sceneId) {
    this.#requireStage("world_exploration", "scene_visit_requires_world_exploration");
    if (!PROCESS_SCENE_ID_SET.has(sceneId)) throw new Error(`unknown_process_scene:${sceneId}`);
    if (this.visitedSceneIds.includes(sceneId)) throw new Error(`scene_already_recorded:${sceneId}`);
    this.visitedSceneIds.push(sceneId);
    this.visitedSceneIds.sort((left, right) => PROCESS_SCENE_IDS.indexOf(left) - PROCESS_SCENE_IDS.indexOf(right));
    return this.visitedSceneIds.length;
  }

  beginSummoning() {
    this.#requireStage("world_exploration", "summoning_requires_world_exploration");
    if (!hasAllProcessScenes(this.visitedSceneIds)) throw new Error("complete_eight_scenes_before_summoning");
    this.stage = "summoning";
    return this.stage;
  }

  openRoundtable() {
    this.#requireStage("summoning", "roundtable_requires_summoning");
    this.stage = "roundtable";
    return this.stage;
  }

  completeRoundtable(concept) {
    this.#requireStage("roundtable", "decision_requires_roundtable");
    const validated = validateSalon(concept, this.#conceptDigest());
    if (!validated.ok) throw new Error(`invalid_final_concept:${validated.errors.join("|")}`);
    this.finalConcept = validated.value;
    this.stage = "decision";
    return this.stage;
  }

  chooseContradiction(axis) {
    this.#requireStage("decision", "transformation_requires_decision");
    if (!AXES.has(axis)) throw new Error("unknown_contradiction");
    this.contradiction = axis;
    this.stage = "world_transformation";
    return this.stage;
  }

  completeTransformation(concept) {
    this.#requireStage("world_transformation", "manifesto_requires_transformation");
    if (!this.finalConcept || !this.contradiction) throw new Error("transformation_incomplete");
    const validated = validateTransformation(concept, this.#conceptDigest(), this.contradiction, this.finalConcept);
    if (!validated.ok) throw new Error(`invalid_transformed_concept:${validated.errors.join("|")}`);
    this.finalConcept = validated.value;
    this.stage = "manifesto";
    return this.stage;
  }

  publishManifesto(value = this.finalConcept?.principle) {
    this.#requireStage("manifesto", "manifesto_stage_required");
    const manifesto = clean(value, 360);
    if (!manifesto) throw new Error("manifesto_required");
    this.manifesto = manifesto;
    return this.manifesto;
  }

  prepareFinalWorld() {
    if (this.stage !== "manifesto" || !this.manifesto || !this.finalConcept) {
      throw new Error("final_world_requires_manifesto");
    }
    return FINAL_SCENE;
  }

  enterFinalWorld() {
    const scene = this.prepareFinalWorld();
    this.finalWorldEntered = true;
    return scene;
  }

  #requireStage(expected, error) {
    if (this.stage !== expected) throw new Error(error);
  }

  #conceptDigest() {
    return {
      companion_ids: this.companions,
      visits: this.visitedSceneIds.map((stop_id) => ({
        stop_id,
        detail_id: "recorded",
        answer: "recorded",
        effect: "stillness"
      }))
    };
  }
}

function clean(value, maxLength) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function hasAllProcessScenes(sceneIds) {
  const completed = new Set(sceneIds);
  return completed.size === PROCESS_SCENE_IDS.length && PROCESS_SCENE_IDS.every((id) => completed.has(id));
}
