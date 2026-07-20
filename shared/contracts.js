export const OPENAI_MODEL = "gpt-5.6";
export const REALTIME_MODEL = "gpt-realtime";
export const MANIFEST_VERSION = "muse-gallery-v1";

export const ALLOWED_GESTURES = Object.freeze(["point", "open", "reflect"]);
export const ALLOWED_EFFECTS = Object.freeze(["ripple", "warmth", "focus", "constellation", "echo", "stillness"]);

export const SCENE_MANIFEST = Object.freeze({
  version: MANIFEST_VERSION,
  stops: [
    {
      id: "water-lilies",
      title: "Water Lilies",
      artist: "Claude Monet",
      year: "1916-1919",
      image: "/assets/art/water-lilies.jpg",
      position: [-7.2, 0, -5.2],
      lookAt: [-8.25, 2.45, -5.2],
      guideAnchor: [-6.2, 0, -5.2],
      details: [
        { id: "broken-reflection", label: "broken reflections" },
        { id: "cool-edge", label: "cool color at the edge" }
      ]
    },
    {
      id: "bedroom",
      title: "The Bedroom",
      artist: "Vincent van Gogh",
      year: "1889",
      image: "/assets/art/bedroom.jpg",
      position: [0, 0, -10.4],
      lookAt: [0, 2.45, -11.2],
      guideAnchor: [0, 0, -9.2],
      details: [
        { id: "tilted-lines", label: "tilted lines" },
        { id: "compressed-space", label: "compressed space" }
      ]
    },
    {
      id: "grande-jatte",
      title: "A Sunday on La Grande Jatte",
      artist: "Georges Seurat",
      year: "1884-1886",
      image: "/assets/art/grande-jatte.jpg",
      position: [7.2, 0, -5.2],
      lookAt: [8.25, 2.45, -5.2],
      guideAnchor: [6.2, 0, -5.2],
      details: [
        { id: "color-dots", label: "separate dots of color" },
        { id: "frozen-figures", label: "frozen figures" }
      ]
    }
  ]
});

const STOP_IDS = new Set(SCENE_MANIFEST.stops.map((stop) => stop.id));
const DETAILS_BY_STOP = new Map(SCENE_MANIFEST.stops.map((stop) => [stop.id, new Set(stop.details.map((detail) => detail.id))]));
const GESTURES = new Set(ALLOWED_GESTURES);
const EFFECTS = new Set(ALLOWED_EFFECTS);

const stop = (stop_id, detail_id, guide_line, prompt, choices, gesture = "point") => ({
  stop_id,
  detail_id,
  guide_line,
  prompt,
  gesture,
  choices
});

export function createFallbackLesson(goal = "Notice how artists shape attention") {
  const safeGoal = normalizeText(goal, 120) || "Notice how artists shape attention";
  return {
    contract_version: "1.0",
    title: "A path for looking closely",
    learning_goal: safeGoal,
    opening: "Follow Mira. At each work, make one observation before hearing an interpretation.",
    start_stop_id: "water-lilies",
    stops: [
      stop(
        "water-lilies",
        "broken-reflection",
        "Start with the water, not the flowers. The reflection never closes into a perfect mirror.",
        "What reaches you first?",
        [
          { value: "quiet", label: "A quiet surface", feedback: "Then test whether structure can disturb that calm.", effect: "ripple", next_stop_id: "bedroom" },
          { value: "motion", label: "Restless motion", feedback: "Then compare motion made from many fixed marks.", effect: "echo", next_stop_id: "grande-jatte" }
        ]
      ),
      stop(
        "bedroom",
        "tilted-lines",
        "The furniture looks familiar, but the lines refuse to settle into ordinary perspective.",
        "What makes this room feel most personal?",
        [
          { value: "angle", label: "Its leaning angles", feedback: "You noticed space acting like emotion.", effect: "focus", next_stop_id: "grande-jatte" },
          { value: "color", label: "Its blocks of color", feedback: "Color is carrying the room's mood.", effect: "warmth", next_stop_id: "grande-jatte" }
        ]
      ),
      stop(
        "grande-jatte",
        "color-dots",
        "Up close, the scene breaks into separate marks. Step back and your eye performs the mixing.",
        "Where does the picture happen?",
        [
          { value: "canvas", label: "On the canvas", feedback: "The marks provide the evidence.", effect: "constellation", next_stop_id: null },
          { value: "vision", label: "In my perception", feedback: "Your seeing completes the system.", effect: "stillness", next_stop_id: null }
        ]
      )
    ],
    recap_prompt: "Connect one visual detail to a change in how you looked."
  };
}

export function normalizeText(value, maxLength = 240) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function validateLessonPlan(candidate) {
  const errors = [];
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return { ok: false, errors: ["plan must be an object"] };
  }
  const allowedRoot = new Set(["contract_version", "title", "learning_goal", "opening", "start_stop_id", "stops", "recap_prompt"]);
  for (const key of Object.keys(candidate)) if (!allowedRoot.has(key)) errors.push(`unknown root field: ${key}`);
  if (candidate.contract_version !== "1.0") errors.push("unsupported contract version");
  if (!STOP_IDS.has(candidate.start_stop_id)) errors.push("invalid start stop");
  if (!Array.isArray(candidate.stops) || candidate.stops.length !== 3) errors.push("exactly three stops required");
  const seen = new Set();
  for (const item of Array.isArray(candidate.stops) ? candidate.stops : []) {
    validateStop(item, errors);
    if (item && seen.has(item.stop_id)) errors.push(`duplicate stop: ${item.stop_id}`);
    if (item) seen.add(item.stop_id);
  }
  for (const field of ["title", "learning_goal", "opening", "recap_prompt"]) {
    if (!normalizeText(candidate[field], field === "opening" ? 360 : 180)) errors.push(`invalid ${field}`);
  }
  return errors.length ? { ok: false, errors } : { ok: true, value: sanitizeLessonPlan(candidate) };
}

function validateStop(item, errors) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    errors.push("invalid stop object");
    return;
  }
  const allowed = new Set(["stop_id", "detail_id", "guide_line", "prompt", "gesture", "choices"]);
  for (const key of Object.keys(item)) if (!allowed.has(key)) errors.push(`unknown stop field: ${key}`);
  if (!STOP_IDS.has(item.stop_id)) errors.push(`invalid stop id: ${item.stop_id}`);
  if (!DETAILS_BY_STOP.get(item.stop_id)?.has(item.detail_id)) errors.push(`invalid detail for ${item.stop_id}`);
  if (!GESTURES.has(item.gesture)) errors.push(`invalid gesture: ${item.gesture}`);
  if (!normalizeText(item.guide_line, 320) || !normalizeText(item.prompt, 180)) errors.push(`invalid stop text: ${item.stop_id}`);
  if (!Array.isArray(item.choices) || item.choices.length < 2 || item.choices.length > 3) errors.push(`invalid choices: ${item.stop_id}`);
  const values = new Set();
  for (const choice of Array.isArray(item.choices) ? item.choices : []) {
    const keys = new Set(["value", "label", "feedback", "effect", "next_stop_id"]);
    for (const key of Object.keys(choice || {})) if (!keys.has(key)) errors.push(`unknown choice field: ${key}`);
    const value = normalizeText(choice?.value, 32);
    if (!value || values.has(value)) errors.push(`invalid choice value: ${item.stop_id}`);
    values.add(value);
    if (!normalizeText(choice?.label, 80) || !normalizeText(choice?.feedback, 180)) errors.push(`invalid choice text: ${item.stop_id}`);
    if (!EFFECTS.has(choice?.effect)) errors.push(`invalid effect: ${choice?.effect}`);
    if (choice?.next_stop_id !== null && !STOP_IDS.has(choice?.next_stop_id)) errors.push(`invalid next stop: ${choice?.next_stop_id}`);
  }
}

export function sanitizeLessonPlan(plan) {
  return {
    contract_version: "1.0",
    title: normalizeText(plan.title, 180),
    learning_goal: normalizeText(plan.learning_goal, 180),
    opening: normalizeText(plan.opening, 360),
    start_stop_id: plan.start_stop_id,
    stops: plan.stops.map((item) => ({
      stop_id: item.stop_id,
      detail_id: item.detail_id,
      guide_line: normalizeText(item.guide_line, 320),
      prompt: normalizeText(item.prompt, 180),
      gesture: item.gesture,
      choices: item.choices.map((choice) => ({
        value: normalizeText(choice.value, 32),
        label: normalizeText(choice.label, 80),
        feedback: normalizeText(choice.feedback, 180),
        effect: choice.effect,
        next_stop_id: choice.next_stop_id
      }))
    })),
    recap_prompt: normalizeText(plan.recap_prompt, 180)
  };
}

export function getStop(plan, stopId) {
  return plan.stops.find((item) => item.stop_id === stopId) || null;
}

export function resolveChoice(plan, stopId, value, visited = []) {
  const current = getStop(plan, stopId);
  const choice = current?.choices.find((item) => item.value === value);
  if (!choice) return null;
  const visitedSet = new Set(visited);
  const declared = choice.next_stop_id;
  const fallback = plan.stops.find((item) => !visitedSet.has(item.stop_id) && item.stop_id !== stopId)?.stop_id || null;
  return { ...choice, next_stop_id: declared && !visitedSet.has(declared) ? declared : fallback };
}

export function createSessionDigest(session) {
  const visits = Array.isArray(session?.visits) ? session.visits.slice(-3) : [];
  return {
    learning_goal: normalizeText(session?.learning_goal, 120),
    visits: visits.map((visit) => ({
      stop_id: STOP_IDS.has(visit.stop_id) ? visit.stop_id : "unknown",
      detail_id: normalizeText(visit.detail_id, 48),
      answer: normalizeText(visit.answer, 80),
      effect: EFFECTS.has(visit.effect) ? visit.effect : "stillness"
    }))
  };
}

export function createFallbackSalon(digest) {
  const seen = digest.visits.map((visit) => visit.stop_id);
  const evidence = seen.length ? seen.join(", ") : "your chosen works";
  return {
    perspectives: [
      { character_id: "maker", name: "The Maker", stance: `Composition turns ${evidence} into a path for the eye.`, evidence_stop_ids: seen },
      { character_id: "witness", name: "The Witness", stance: "Your first observation is evidence too; interpretation begins after attention.", evidence_stop_ids: seen },
      { character_id: "skeptic", name: "The Skeptic", stance: "Try the opposite reading and ask which visible detail survives the test.", evidence_stop_ids: seen }
    ]
  };
}

export function validateSalon(candidate, digest) {
  const characters = new Set(["maker", "witness", "skeptic"]);
  const evidence = new Set(digest.visits.map((visit) => visit.stop_id));
  if (!candidate || !Array.isArray(candidate.perspectives) || candidate.perspectives.length !== 3) return { ok: false, errors: ["three perspectives required"] };
  const seen = new Set();
  const output = [];
  for (const item of candidate.perspectives) {
    if (!item || !characters.has(item.character_id) || seen.has(item.character_id)) return { ok: false, errors: ["invalid character"] };
    const ids = Array.isArray(item.evidence_stop_ids) ? item.evidence_stop_ids : [];
    if (ids.some((id) => !evidence.has(id))) return { ok: false, errors: ["ungrounded evidence"] };
    const name = normalizeText(item.name, 48);
    const stance = normalizeText(item.stance, 240);
    if (!name || !stance) return { ok: false, errors: ["invalid perspective text"] };
    seen.add(item.character_id);
    output.push({ character_id: item.character_id, name, stance, evidence_stop_ids: ids });
  }
  return { ok: true, value: { perspectives: output } };
}

export const LESSON_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["contract_version", "title", "learning_goal", "opening", "start_stop_id", "stops", "recap_prompt"],
  properties: {
    contract_version: { type: "string", enum: ["1.0"] },
    title: { type: "string", maxLength: 180 },
    learning_goal: { type: "string", maxLength: 180 },
    opening: { type: "string", maxLength: 360 },
    start_stop_id: { type: "string", enum: [...STOP_IDS] },
    stops: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["stop_id", "detail_id", "guide_line", "prompt", "gesture", "choices"],
        properties: {
          stop_id: { type: "string", enum: [...STOP_IDS] },
          detail_id: { type: "string", enum: [...new Set(SCENE_MANIFEST.stops.flatMap((item) => item.details.map((detail) => detail.id)))] },
          guide_line: { type: "string", maxLength: 320 },
          prompt: { type: "string", maxLength: 180 },
          gesture: { type: "string", enum: [...GESTURES] },
          choices: {
            type: "array",
            minItems: 2,
            maxItems: 3,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["value", "label", "feedback", "effect", "next_stop_id"],
              properties: {
                value: { type: "string", maxLength: 32 },
                label: { type: "string", maxLength: 80 },
                feedback: { type: "string", maxLength: 180 },
                effect: { type: "string", enum: [...EFFECTS] },
                next_stop_id: { anyOf: [{ type: "string", enum: [...STOP_IDS] }, { type: "null" }] }
              }
            }
          }
        }
      }
    },
    recap_prompt: { type: "string", maxLength: 180 }
  }
};

export const SALON_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["perspectives"],
  properties: {
    perspectives: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["character_id", "name", "stance", "evidence_stop_ids"],
        properties: {
          character_id: { type: "string", enum: ["maker", "witness", "skeptic"] },
          name: { type: "string", maxLength: 48 },
          stance: { type: "string", maxLength: 240 },
          evidence_stop_ids: { type: "array", maxItems: 3, items: { type: "string", enum: [...STOP_IDS] } }
        }
      }
    }
  }
};
