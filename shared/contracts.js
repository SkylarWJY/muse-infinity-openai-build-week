import { EXHIBITION_SPINE } from "../src/config/exhibitionSpine.js";
import { SCENE_COLLECTIONS } from "../src/config/sceneCollections.js";

export const OPENAI_MODEL = "gpt-5.6";
export const REALTIME_MODEL = "gpt-realtime-2.1";
export const MANIFEST_VERSION = "muse-infinity-v3";
export const LESSON_CONTRACT_VERSION = "3.0";
const LEGACY_LESSON_CONTRACT_VERSION = "2.0";

export const ALLOWED_GESTURES = Object.freeze(["point", "open", "reflect"]);
export const ALLOWED_EFFECTS = Object.freeze(["ripple", "warmth", "focus", "constellation", "echo", "stillness"]);
export const PHILOSOPHY_AXES = Object.freeze(["perception", "emotion", "invention"]);
export const PROCESS_SCENE_IDS = Object.freeze(EXHIBITION_SPINE.map((scene) => scene.id));

export const AI_INTERPRETIVE_LENSES = Object.freeze([
  companion("monet", "Claude Monet", "Light changes an answer before the scene can settle."),
  companion("van-gogh", "Vincent van Gogh", "Color carries pressure, work and emotional temperature."),
  companion("socrates", "Socrates", "Every image is a claim waiting to be examined."),
  companion("frida", "Frida Kahlo", "An image can make a body, a wound and an offering visible together."),
  companion("picasso", "Pablo Picasso", "One viewpoint is never enough to hold the whole truth."),
  companion("freud", "Sigmund Freud", "Inherited desires often speak before conscious intention."),
  companion("qi-baishi", "Qi Baishi", "A spare mark can still contain a living world."),
  companion("yayoi-kusama", "Infinity & Repetition Lens", "Repetition can dissolve the boundary of the self.")
]);
// Compatibility export for persisted sessions and older integrations.
export const HISTORICAL_COMPANIONS = AI_INTERPRETIVE_LENSES;
export const DEFAULT_COMPANION_IDS = Object.freeze(["monet", "van-gogh", "socrates"]);

const COMPANIONS_BY_ID = new Map(AI_INTERPRETIVE_LENSES.map((item) => [item.id, item]));
const COMPANION_IDS = new Set(COMPANIONS_BY_ID.keys());
const STOP_IDS = new Set(PROCESS_SCENE_IDS);
const GESTURES = new Set(ALLOWED_GESTURES);
const EFFECTS = new Set(ALLOWED_EFFECTS);
const AXES = new Set(PHILOSOPHY_AXES);

const FALLBACK_AXIS_COPY = Object.freeze({
  perception: Object.freeze({
    world_title: "The World That Notices Back",
    arc: "trace a movement from visibility through perception toward a self changed by precise attention.",
    principle: "Build a world where precise attention changes both the observer and what can be observed.",
    visual_prompt: "A responsive field of light, layered viewpoints, living marks, private symbols and repetition where each act of perception changes the spatial answer."
  }),
  emotion: Object.freeze({
    world_title: "The World That Feels Back",
    arc: "carry emotion from inherited pressure into color, symbol and a form that can be shared without turning pain into spectacle.",
    principle: "Let feeling become shared form while protecting the lived experience that gave it meaning.",
    visual_prompt: "An emotionally responsive world of warm color, reflected water, intimate symbols and shimmering spheres whose light changes with the visitor's presence."
  }),
  invention: Object.freeze({
    world_title: "The World With Another Door",
    arc: "turn invention into a practice of holding incompatible frames until an unexpected route becomes possible.",
    principle: "Invent by keeping several truths in view long enough for a new relationship to appear.",
    visual_prompt: "An inhabitable collage of competing frames, minimal living marks, repeated portals and impossible shimmering paths assembled from all eight observations."
  })
});

const FALLBACK_TRANSFORMATION_COPY = Object.freeze({
  perception: Object.freeze({
    world_title: "The Aperture That Answers",
    arc: "The decision makes perception reciprocal: every clearer view also changes the person who chose to look.",
    principle: "Treat attention as a reciprocal act: every clearer view must also revise the viewer.",
    visual_prompt: "A path of responsive apertures, reflected thresholds and living marks where each act of looking turns the spatial field back toward the visitor."
  }),
  emotion: Object.freeze({
    world_title: "The Pulse Made Shareable",
    arc: "The decision carries feeling out of private pressure and into a form others can enter without claiming ownership of it.",
    principle: "Give feeling a shareable form while protecting the lived experience that made it necessary.",
    visual_prompt: "A breathing field of warm color, waterborne reflections, protected symbols and luminous chambers that open through emotional proximity rather than spectacle."
  }),
  invention: Object.freeze({
    world_title: "The Door Built Between Truths",
    arc: "The decision turns contradiction into construction, joining incompatible frames without flattening the difference between them.",
    principle: "Build new relations between competing truths without forcing them into one viewpoint.",
    visual_prompt: "An inhabitable assembly of offset frames, spare living marks, repeated doors and shimmering paths that connect incompatible observations without erasing their edges."
  })
});

export const SCENE_MANIFEST = Object.freeze({
  version: MANIFEST_VERSION,
  stops: Object.freeze(EXHIBITION_SPINE.map((scene) => Object.freeze({
    id: scene.id,
    stop_id: scene.id,
    worldId: scene.worldId,
    world_id: scene.worldId,
    chapter: scene.chapter,
    title: scene.title,
    artist: scene.artist,
    guide: scene.guide,
    image: scene.image,
    thumbnail: scene.thumbnail,
    prompt: scene.prompt,
    question: scene.question,
    details: Object.freeze([scene.detail]),
    artworks: Object.freeze((SCENE_COLLECTIONS[scene.id] || []).map(manifestArtwork))
  })))
});

const DETAILS_BY_STOP = new Map(SCENE_MANIFEST.stops.map((item) => [
  item.id,
  new Set(item.details.map((detail) => detail.id))
]));
const ARTWORK_IDS_BY_STOP = new Map(SCENE_MANIFEST.stops.map((item) => [
  item.id,
  new Set(item.artworks.map((artwork) => artwork.artwork_id))
]));
const CANONICAL_STATIONS = Object.freeze(SCENE_MANIFEST.stops.flatMap((stop, sceneIndex) => (
  stop.artworks.slice(0, 3).map((artwork, stationIndex) => Object.freeze({
    scene_id: stop.stop_id,
    station_id: `${stop.stop_id}:station-${stationIndex + 1}`,
    scene_order: sceneIndex + 1,
    station_order: stationIndex + 1,
    artwork_id: artwork.artwork_id,
    evidence_fact_ids: Object.freeze(artwork.visual_facts.map((fact) => fact.id))
  }))
)));
const CANONICAL_STATIONS_BY_ID = new Map(CANONICAL_STATIONS.map((station) => [station.station_id, station]));
const CANONICAL_STATIONS_BY_ARTWORK = new Map(CANONICAL_STATIONS.map((station) => [station.artwork_id, station]));

const FALLBACK_COPY = Object.freeze([
  fallbackCopy(
    "Begin at the threshold. Notice what the conservatory reveals slowly rather than all at once.",
    [
      choice("concealed", "What remains concealed", "You treated absence as evidence and made room for the next question.", "focus"),
      choice("emerging", "What is beginning to emerge", "You followed visibility as an event rather than a fixed fact.", "constellation"),
      choice("unresolved", "What should stay unresolved", "You protected uncertainty as a condition for deeper attention rather than a failure to answer.", "echo")
    ]
  ),
  fallbackCopy(
    "Freud asks you to hear two voices inside the same question: conscious intention and inherited desire.",
    [
      choice("chosen", "The part I chose", "You located agency without pretending inheritance disappears.", "warmth"),
      choice("inherited", "The part I inherited", "You noticed that a question can arrive before its author understands it.", "echo"),
      choice("renegotiated", "The part I can renegotiate", "You treated inheritance as pressure that can be examined and revised, not simply accepted or denied.", "ripple")
    ]
  ),
  fallbackCopy(
    "Monet lets light reorganize the garden. Look for the instant when attention changes what the world seems to contain.",
    [
      choice("surface", "The surface becoming clear", "Precision gave the visible world more structure.", "focus"),
      choice("change", "The change itself", "You noticed perception as an active process.", "ripple"),
      choice("reciprocal", "The observer changing too", "You recognized that sustained attention can revise both the scene and the habits brought to it.", "echo")
    ]
  ),
  fallbackCopy(
    "Picasso holds several frames open at once. Test whether contradiction can enlarge rather than weaken a truth.",
    [
      choice("single", "One decisive frame", "You tested what coherence gains and what it excludes.", "stillness"),
      choice("multiple", "Several competing frames", "You allowed invention to hold incompatible evidence together.", "constellation"),
      choice("interval", "The gap between frames", "You treated disagreement between viewpoints as evidence that no single frame can contain.", "ripple")
    ]
  ),
  fallbackCopy(
    "Van Gogh turns the sky into pressure. Separate the intensity that sharpens attention from the struggle that consumes it.",
    [
      choice("pressure", "The pressure in the color", "You read emotion as a force moving through form.", "warmth"),
      choice("clarity", "The clarity inside the pressure", "You found attention without romanticizing pain.", "focus"),
      choice("care", "The care that contains pressure", "You separated artistic discipline from suffering and refused to make pain the source of value.", "stillness")
    ]
  ),
  fallbackCopy(
    "Qi Baishi asks how little a mark needs before it feels alive. Let restraint carry more than emptiness.",
    [
      choice("minimal", "The smallest living mark", "You found a world concentrated rather than diminished.", "stillness"),
      choice("abundant", "The space around the mark", "You treated the unpainted field as active form.", "ripple"),
      choice("relation", "The relation of mark and space", "You located vitality in the tension between presence and restraint rather than in either alone.", "constellation")
    ]
  ),
  fallbackCopy(
    "Frida makes private memory legible through symbol. Notice what changes when an intimate image becomes shareable.",
    [
      choice("private", "What remains private", "You protected the irreducible part of lived experience.", "echo"),
      choice("shared", "What the symbol lets others enter", "You saw identity become relation without becoming generic.", "warmth"),
      choice("transformed", "What sharing changes", "You noticed that making memory legible can transform it without exhausting its private meaning.", "constellation")
    ]
  ),
  fallbackCopy(
    "The Infinity & Repetition Lens extends the field until the border of the self becomes uncertain. Decide what repetition removes and what it reveals.",
    [
      choice("dissolve", "The self dissolves", "You let infinity loosen the demand for a fixed identity.", "constellation"),
      choice("remain", "A singular trace remains", "You found difference persisting inside repetition.", "stillness"),
      choice("rhythm", "The rhythm between both", "You held dissolution and singularity as alternating experiences rather than forcing a final choice.", "ripple")
    ]
  )
]);

export function createFallbackLesson(goal = "Notice how worlds shape attention") {
  const safeGoal = normalizeText(goal, 120) || "Notice how worlds shape attention";
  return {
    contract_version: LESSON_CONTRACT_VERSION,
    title: "Eight worlds for one living question",
    learning_goal: safeGoal,
    opening: "Mira will keep the exhibition's eight-world sequence intact. In every scene, observe before interpreting and carry one choice forward.",
    start_stop_id: PROCESS_SCENE_IDS[0],
    stops: EXHIBITION_SPINE.map((scene, index) => lessonStop(scene, index, safeGoal)),
    recap_prompt: "Use evidence from all eight worlds to name the principle your final world should embody."
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
  rejectUnknownFields(candidate, ["contract_version", "title", "learning_goal", "opening", "start_stop_id", "stops", "recap_prompt"], "root", errors);
  const legacy = candidate.contract_version === LEGACY_LESSON_CONTRACT_VERSION;
  if (candidate.contract_version !== LESSON_CONTRACT_VERSION && !legacy) errors.push("unsupported contract version");
  if (candidate.start_stop_id !== PROCESS_SCENE_IDS[0]) errors.push("invalid start stop");
  if (!Array.isArray(candidate.stops) || candidate.stops.length !== PROCESS_SCENE_IDS.length) {
    errors.push("exactly eight ordered stops required");
  }
  for (const [index, item] of (Array.isArray(candidate.stops) ? candidate.stops : []).entries()) {
    validateStop(item, index, errors, { legacy });
  }
  for (const field of ["title", "learning_goal", "opening", "recap_prompt"]) {
    if (!normalizeText(candidate[field], field === "opening" ? 360 : 180)) errors.push(`invalid ${field}`);
  }
  return errors.length ? { ok: false, errors } : { ok: true, value: sanitizeLessonPlan(candidate) };
}

function validateStop(item, index, errors, { legacy = false } = {}) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    errors.push(`invalid stop object at ${index}`);
    return;
  }
  rejectUnknownFields(item, ["stop_id", "detail_id", "guide_line", "prompt", "gesture", "stations", "choices"], "stop", errors);
  const expectedId = PROCESS_SCENE_IDS[index];
  if (item.stop_id !== expectedId) errors.push(`ordered stop required at ${index}: ${expectedId}`);
  if (!STOP_IDS.has(item.stop_id)) errors.push(`invalid stop id: ${item.stop_id}`);
  if (!DETAILS_BY_STOP.get(item.stop_id)?.has(item.detail_id)) errors.push(`invalid detail for ${item.stop_id}`);
  if (!GESTURES.has(item.gesture)) errors.push(`invalid gesture: ${item.gesture}`);
  if (!normalizeText(item.guide_line, 320) || !normalizeText(item.prompt, 180)) errors.push(`invalid stop text: ${item.stop_id}`);
  if (!legacy || item.stations !== undefined) validateStations(item.stations, item.stop_id, errors);
  const validReflectionCount = Array.isArray(item.choices)
    && (legacy ? item.choices.length >= 2 && item.choices.length <= 3 : item.choices.length === 3);
  if (!validReflectionCount) errors.push(`invalid choices: ${item.stop_id}`);
  const values = new Set();
  const expectedNext = PROCESS_SCENE_IDS[index + 1] || null;
  for (const candidate of Array.isArray(item.choices) ? item.choices : []) {
    rejectUnknownFields(candidate || {}, ["value", "label", "feedback", "effect", "next_stop_id"], "choice", errors);
    const value = normalizeText(candidate?.value, 32);
    if (!value || values.has(value)) errors.push(`invalid choice value: ${item.stop_id}`);
    values.add(value);
    if (!normalizeText(candidate?.label, 80) || !normalizeText(candidate?.feedback, 180)) errors.push(`invalid choice text: ${item.stop_id}`);
    if (!EFFECTS.has(candidate?.effect)) errors.push(`invalid effect: ${candidate?.effect}`);
    if (candidate?.next_stop_id !== expectedNext) errors.push(`choice must use canonical next stop: ${item.stop_id}`);
  }
}

function validateStations(stations, stopId, errors) {
  if (!Array.isArray(stations) || stations.length !== 3) {
    errors.push(`exactly three artwork stations required: ${stopId}`);
    return;
  }
  const expectedArtworkIds = SCENE_MANIFEST.stops.find((item) => item.stop_id === stopId)
    ?.artworks.slice(0, 3).map((artwork) => artwork.artwork_id) || [];
  const stationIds = new Set();
  for (const [index, station] of stations.entries()) {
    if (!station || typeof station !== "object" || Array.isArray(station)) {
      errors.push(`invalid station object: ${stopId}`);
      continue;
    }
    // lead_companion_id is accepted only to read early v3 plans; the runtime rotates the
    // visitor's actually selected company and sanitized plans no longer retain this field.
    rejectUnknownFields(station, ["station_id", "artwork_id", "focus_question", "lead_companion_id", "choices"], "station", errors);
    const stationId = normalizeText(station.station_id, 120);
    if (!stationId || stationIds.has(stationId) || !stationId.startsWith(`${stopId}:`)) errors.push(`invalid station id: ${stopId}`);
    stationIds.add(stationId);
    if (!ARTWORK_IDS_BY_STOP.get(stopId)?.has(station.artwork_id) || station.artwork_id !== expectedArtworkIds[index]) {
      errors.push(`station must use canonical artwork at ${stopId}:${index}`);
    }
    if (!normalizeText(station.focus_question, 280)) errors.push(`invalid station focus question: ${stopId}:${index}`);
    if (station.lead_companion_id !== undefined && !COMPANION_IDS.has(station.lead_companion_id)) {
      errors.push(`invalid legacy station lead companion: ${stopId}:${index}`);
    }
    if (!Array.isArray(station.choices) || station.choices.length !== 3) {
      errors.push(`exactly three station choices required: ${stopId}:${index}`);
      continue;
    }
    const values = new Set();
    for (const option of station.choices) {
      rejectUnknownFields(option || {}, ["value", "label", "stance", "evidence_prompt", "effect"], "station choice", errors);
      const value = normalizeText(option?.value, 48);
      if (!value || values.has(value)) errors.push(`invalid station choice value: ${stopId}:${index}`);
      values.add(value);
      if (!normalizeText(option?.label, 120)
        || !normalizeText(option?.stance, 320)
        || !normalizeText(option?.evidence_prompt, 240)) errors.push(`invalid station choice text: ${stopId}:${index}`);
      if (!EFFECTS.has(option?.effect)) errors.push(`invalid station choice effect: ${stopId}:${index}`);
    }
  }
}

export function sanitizeLessonPlan(plan) {
  return {
    contract_version: LESSON_CONTRACT_VERSION,
    title: normalizeText(plan.title, 180),
    learning_goal: normalizeText(plan.learning_goal, 180),
    opening: normalizeText(plan.opening, 360),
    start_stop_id: PROCESS_SCENE_IDS[0],
    stops: plan.stops.map((item, index) => ({
      stop_id: PROCESS_SCENE_IDS[index],
      detail_id: item.detail_id,
      guide_line: normalizeText(item.guide_line, 320),
      prompt: normalizeText(item.prompt, 180),
      gesture: item.gesture,
      stations: sanitizeStations(item.stations, EXHIBITION_SPINE[index], index, plan.learning_goal),
      choices: item.choices.map((candidate) => ({
        value: normalizeText(candidate.value, 32),
        label: normalizeText(candidate.label, 80),
        feedback: normalizeText(candidate.feedback, 180),
        effect: candidate.effect,
        next_stop_id: PROCESS_SCENE_IDS[index + 1] || null
      }))
    })),
    recap_prompt: normalizeText(plan.recap_prompt, 180)
  };
}

export function getStop(plan, stopId) {
  return plan?.stops?.find((item) => item.stop_id === stopId) || null;
}

export function resolveChoice(plan, stopId, value, visited = []) {
  const current = getStop(plan, stopId);
  const selected = current?.choices.find((item) => item.value === value);
  if (!selected) return null;
  const index = PROCESS_SCENE_IDS.indexOf(stopId);
  const next = PROCESS_SCENE_IDS[index + 1] || null;
  return { ...selected, next_stop_id: next && new Set(visited).has(next) ? null : next };
}

export function createSessionDigest(session) {
  const seen = new Set();
  const visits = [];
  for (const visit of Array.isArray(session?.visits) ? session.visits : []) {
    if (!STOP_IDS.has(visit?.stop_id) || seen.has(visit.stop_id)) continue;
    seen.add(visit.stop_id);
    visits.push({
      stop_id: visit.stop_id,
      detail_id: normalizeText(visit.detail_id, 48),
      answer: normalizeText(visit.answer, 80),
      effect: EFFECTS.has(visit.effect) ? visit.effect : "stillness"
    });
    if (visits.length === PROCESS_SCENE_IDS.length) break;
  }
  visits.sort((left, right) => PROCESS_SCENE_IDS.indexOf(left.stop_id) - PROCESS_SCENE_IDS.indexOf(right.stop_id));
  const companionIds = sanitizeCompanionIds(session?.companion_ids || session?.companions);
  return {
    learning_goal: normalizeText(session?.learning_goal, 120),
    companion_ids: companionIds,
    visits,
    station_evidence: sanitizeStationEvidence(
      session?.station_evidence || session?.stationEvidence,
      companionIds
    )
  };
}

function sanitizeStationEvidence(input, companionIds) {
  const selectedCompanions = new Set(companionIds);
  const latestByStation = new Map();
  const source = Array.isArray(input) ? input.slice(-96) : [];

  for (const candidate of source) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
    const stationId = normalizeText(candidate.station_id || candidate.stationId, 120);
    const artworkId = normalizeText(candidate.artwork_id || candidate.artworkId, 100);
    const sceneId = normalizeText(candidate.scene_id || candidate.sceneId || candidate.stop_id || candidate.stopId, 80);
    const stationFromId = CANONICAL_STATIONS_BY_ID.get(stationId);
    const stationFromArtwork = CANONICAL_STATIONS_BY_ARTWORK.get(artworkId);
    const canonical = stationFromId || stationFromArtwork;
    const compatibleLegacyStationId = Boolean(
      !stationFromId
      && stationFromArtwork
      && stationId.startsWith(`${stationFromArtwork.scene_id}:`)
    );
    if (!canonical
      || (stationFromId && stationFromArtwork && stationFromId.station_id !== stationFromArtwork.station_id)
      || (stationId && stationId !== canonical.station_id && !compatibleLegacyStationId)
      || (artworkId && artworkId !== canonical.artwork_id)
      || (sceneId && sceneId !== canonical.scene_id)) continue;

    const choiceSource = candidate.choice && typeof candidate.choice === "object" && !Array.isArray(candidate.choice)
      ? candidate.choice
      : {};
    const choice = {
      value: normalizeText(choiceSource.value, 48),
      label: normalizeText(choiceSource.label, 120),
      stance: normalizeText(choiceSource.stance, 240),
      evidence_prompt: normalizeText(choiceSource.evidence_prompt || choiceSource.evidencePrompt, 240),
      effect: EFFECTS.has(choiceSource.effect) ? choiceSource.effect : "stillness"
    };
    let visitorObservation = normalizeText(
      candidate.visitor_observation || candidate.visitorObservation || candidate.observation,
      240
    );
    let inquiry = normalizeText(
      candidate.inquiry || candidate.inquiry_prompt || candidate.inquiryPrompt
        || candidate.visitor_question || candidate.visitorQuestion,
      240
    );

    // Earlier clients copied a selected stance label into visitor_observation. A selected
    // method is an inquiry path, not evidence that the visitor actually saw that label.
    if (choice.value !== "free-observation" && visitorObservation && visitorObservation === choice.label) {
      visitorObservation = "";
      inquiry ||= choice.evidence_prompt;
    }
    inquiry ||= choice.evidence_prompt;
    if (!visitorObservation && !inquiry) continue;

    const requestedFactIds = new Set((Array.isArray(candidate.evidence_fact_ids)
      ? candidate.evidence_fact_ids
      : Array.isArray(candidate.evidenceFactIds) ? candidate.evidenceFactIds : [])
      .map((value) => normalizeText(value, 100)));
    const evidenceFactIds = canonical.evidence_fact_ids.filter((id) => requestedFactIds.has(id));
    const perspectives = [];
    const seenPerspectives = new Set();
    for (const perspective of (Array.isArray(candidate.perspectives) ? candidate.perspectives : []).slice(-6)) {
      const companionId = normalizeText(
        perspective?.companion_id || perspective?.companionId || perspective?.speaker_id || perspective?.speakerId,
        48
      );
      const perspectiveText = normalizeText(perspective?.text || perspective?.summary || perspective?.interpretation, 360);
      if (!selectedCompanions.has(companionId) || seenPerspectives.has(companionId) || !perspectiveText) continue;
      seenPerspectives.add(companionId);
      perspectives.push({ companion_id: companionId, text: perspectiveText });
      if (perspectives.length === 3) break;
    }

    latestByStation.set(canonical.station_id, {
      scene_id: canonical.scene_id,
      station_id: canonical.station_id,
      scene_order: canonical.scene_order,
      station_order: canonical.station_order,
      artwork_id: canonical.artwork_id,
      focus_question: normalizeText(candidate.focus_question || candidate.focusQuestion, 280),
      choice,
      visitor_observation: visitorObservation,
      inquiry,
      evidence_kind: visitorObservation ? (inquiry ? "observation_and_inquiry" : "observation") : "inquiry",
      evidence_fact_ids: evidenceFactIds,
      perspectives
    });
  }

  return [...latestByStation.values()]
    .sort((left, right) => left.scene_order - right.scene_order || left.station_order - right.station_order)
    .slice(0, CANONICAL_STATIONS.length);
}

export function isCompleteDigest(digest) {
  return PROCESS_SCENE_IDS.every((id, index) => digest?.visits?.[index]?.stop_id === id)
    && digest?.visits?.length === PROCESS_SCENE_IDS.length;
}

export function createFallbackSalon(input, chosenAxis = "perception") {
  const digest = input?.visits ? createSessionDigest(input) : createSessionDigest({});
  const sceneIds = digest.visits.map((visit) => visit.stop_id);
  const company = digest.companion_ids.map((id) => COMPANIONS_BY_ID.get(id)).filter(Boolean);
  const axis = AXES.has(chosenAxis) ? chosenAxis : "perception";
  const axisCopy = FALLBACK_AXIS_COPY[axis];
  const evidence = fallbackEvidence(digest);
  return {
    world_title: axisCopy.world_title,
    synthesis: normalizeText(`Curated demo ${axis} synthesis for "${evidence.question}". Scene reflections: ${evidence.answers}. ${evidence.stations} Together these records ${axisCopy.arc} The archived shimmering-spheres world is a prepared realization, not newly generated geometry.`, 700),
    principle: axisCopy.principle,
    philosophy_axis: axis,
    visual_prompt: axisCopy.visual_prompt,
    evidence_scene_ids: sceneIds,
    perspectives: company.map((profile) => ({
      character_id: profile.id,
      name: profile.name,
      stance: `Curated ${profile.name} lens on "${evidence.question}": ${profile.lens} This reading uses the complete recorded route, not a live model response.`,
      evidence_stop_ids: [...sceneIds]
    }))
  };
}

export function createFallbackTransformation(input, chosenAxis) {
  const axis = AXES.has(chosenAxis) ? chosenAxis : "perception";
  const provisional = createFallbackSalon(input, axis);
  const copy = FALLBACK_TRANSFORMATION_COPY[axis];
  const evidence = fallbackEvidence(createSessionDigest(input));
  return {
    ...provisional,
    world_title: copy.world_title,
    synthesis: normalizeText(`Curated demo post-decision ${axis} transformation for "${evidence.question}". Scene reflections: ${evidence.answers}. ${evidence.stations} ${copy.arc} The archived shimmering-spheres world is a prepared realization of this revised concept, not newly generated geometry.`, 700),
    principle: copy.principle,
    visual_prompt: copy.visual_prompt
  };
}

export function validateSalon(candidate, digestInput, chosenAxis = null) {
  const digest = createSessionDigest(digestInput);
  const errors = [];
  if (!isCompleteDigest(digest)) errors.push("eight visited scenes required before final synthesis");
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return { ok: false, errors: [...errors, "final concept must be an object"] };
  }
  rejectUnknownFields(candidate, ["world_title", "synthesis", "principle", "philosophy_axis", "visual_prompt", "evidence_scene_ids", "perspectives"], "final concept", errors);
  for (const [field, max] of [["world_title", 80], ["synthesis", 700], ["principle", 240], ["visual_prompt", 500]]) {
    if (!normalizeText(candidate[field], max)) errors.push(`invalid ${field}`);
  }
  if (!AXES.has(candidate.philosophy_axis)) errors.push("invalid philosophy_axis");
  if (AXES.has(chosenAxis) && candidate.philosophy_axis !== chosenAxis) {
    errors.push(`final concept must embody chosen contradiction: ${chosenAxis}`);
  }
  const evidenceIds = Array.isArray(candidate.evidence_scene_ids) ? candidate.evidence_scene_ids : [];
  if (!sameOrderedValues(evidenceIds, PROCESS_SCENE_IDS)) errors.push("final concept must cite all eight scenes in order");

  const expectedCompanions = digest.companion_ids;
  const perspectives = Array.isArray(candidate.perspectives) ? candidate.perspectives : [];
  if (perspectives.length !== expectedCompanions.length) errors.push("one perspective required for each selected companion");
  const outputPerspectives = [];
  const coveredScenes = new Set();
  for (const [index, item] of perspectives.entries()) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push("invalid perspective object");
      continue;
    }
    rejectUnknownFields(item, ["character_id", "name", "stance", "evidence_stop_ids"], "perspective", errors);
    const expectedId = expectedCompanions[index];
    const profile = COMPANIONS_BY_ID.get(expectedId);
    if (!profile || item.character_id !== expectedId) errors.push("perspectives must match selected companion order");
    const name = normalizeText(item.name, 48);
    const stance = normalizeText(item.stance, 360);
    if (!name || !stance || (profile && name !== profile.name)) errors.push("invalid perspective text");
    const ids = Array.isArray(item.evidence_stop_ids) ? item.evidence_stop_ids : [];
    if (!ids.length || ids.some((id) => !STOP_IDS.has(id) || !evidenceIds.includes(id))) errors.push("ungrounded evidence");
    for (const id of ids) coveredScenes.add(id);
    outputPerspectives.push({ character_id: item.character_id, name, stance, evidence_stop_ids: [...ids] });
  }
  if (PROCESS_SCENE_IDS.some((id) => !coveredScenes.has(id))) errors.push("companion perspectives must collectively ground all eight scenes");
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      world_title: normalizeText(candidate.world_title, 80),
      synthesis: normalizeText(candidate.synthesis, 700),
      principle: normalizeText(candidate.principle, 240),
      philosophy_axis: candidate.philosophy_axis,
      visual_prompt: normalizeText(candidate.visual_prompt, 500),
      evidence_scene_ids: [...PROCESS_SCENE_IDS],
      perspectives: outputPerspectives
    }
  };
}

export function validateTransformation(candidate, digestInput, chosenAxis, priorCandidate) {
  const transformed = validateSalon(candidate, digestInput, chosenAxis);
  const prior = validateSalon(priorCandidate, digestInput);
  const errors = [
    ...(transformed.ok ? [] : transformed.errors),
    ...(prior.ok ? [] : prior.errors.map((error) => `invalid provisional concept: ${error}`))
  ];
  if (transformed.ok && prior.ok) {
    for (const field of ["world_title", "synthesis", "principle", "visual_prompt"]) {
      if (transformed.value[field] === prior.value[field]) errors.push(`transformation must change ${field}`);
    }
  }
  return errors.length ? { ok: false, errors } : transformed;
}

export const LESSON_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["contract_version", "title", "learning_goal", "opening", "start_stop_id", "stops", "recap_prompt"],
  properties: {
    contract_version: { type: "string", enum: [LESSON_CONTRACT_VERSION] },
    title: { type: "string", maxLength: 180 },
    learning_goal: { type: "string", maxLength: 180 },
    opening: { type: "string", maxLength: 360 },
    start_stop_id: { type: "string", enum: [PROCESS_SCENE_IDS[0]] },
    stops: {
      type: "array",
      minItems: PROCESS_SCENE_IDS.length,
      maxItems: PROCESS_SCENE_IDS.length,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["stop_id", "detail_id", "guide_line", "prompt", "gesture", "stations", "choices"],
        properties: {
          stop_id: { type: "string", enum: [...PROCESS_SCENE_IDS] },
          detail_id: { type: "string", enum: EXHIBITION_SPINE.map((scene) => scene.detail.id) },
          guide_line: { type: "string", maxLength: 320 },
          prompt: { type: "string", maxLength: 180 },
          gesture: { type: "string", enum: [...ALLOWED_GESTURES] },
          stations: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["station_id", "artwork_id", "focus_question", "choices"],
              properties: {
                station_id: { type: "string", maxLength: 120 },
                artwork_id: {
                  type: "string",
                  enum: SCENE_MANIFEST.stops.flatMap((stop) => stop.artworks.map((artwork) => artwork.artwork_id))
                },
                focus_question: { type: "string", maxLength: 280 },
                choices: {
                  type: "array",
                  minItems: 3,
                  maxItems: 3,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["value", "label", "stance", "evidence_prompt", "effect"],
                    properties: {
                      value: { type: "string", maxLength: 48 },
                      label: { type: "string", maxLength: 120 },
                      stance: { type: "string", maxLength: 320 },
                      evidence_prompt: { type: "string", maxLength: 240 },
                      effect: { type: "string", enum: [...ALLOWED_EFFECTS] }
                    }
                  }
                }
              }
            }
          },
          choices: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["value", "label", "feedback", "effect", "next_stop_id"],
              properties: {
                value: { type: "string", maxLength: 32 },
                label: { type: "string", maxLength: 80 },
                feedback: { type: "string", maxLength: 180 },
                effect: { type: "string", enum: [...ALLOWED_EFFECTS] },
                next_stop_id: { anyOf: [{ type: "string", enum: [...PROCESS_SCENE_IDS] }, { type: "null" }] }
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
  required: ["world_title", "synthesis", "principle", "philosophy_axis", "visual_prompt", "evidence_scene_ids", "perspectives"],
  properties: {
    world_title: { type: "string", maxLength: 80 },
    synthesis: { type: "string", maxLength: 700 },
    principle: { type: "string", maxLength: 240 },
    philosophy_axis: { type: "string", enum: [...PHILOSOPHY_AXES] },
    visual_prompt: { type: "string", maxLength: 500 },
    evidence_scene_ids: { type: "array", minItems: 8, maxItems: 8, items: { type: "string", enum: [...PROCESS_SCENE_IDS] } },
    perspectives: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["character_id", "name", "stance", "evidence_stop_ids"],
        properties: {
          character_id: { type: "string", enum: [...COMPANION_IDS] },
          name: { type: "string", maxLength: 48 },
          stance: { type: "string", maxLength: 360 },
          evidence_stop_ids: { type: "array", minItems: 1, maxItems: 8, items: { type: "string", enum: [...PROCESS_SCENE_IDS] } }
        }
      }
    }
  }
};

export const FINAL_CONCEPT_JSON_SCHEMA = SALON_JSON_SCHEMA;

function fallbackEvidence(digest) {
  const question = normalizeText(digest.learning_goal, 72) || "the question carried through the museum";
  const answers = digest.visits.length
    ? digest.visits.map((visit, index) => `${index + 1}:${normalizeText(visit.answer, 32) || "observed"}`).join(" | ")
    : "no completed scene observations";
  const observations = digest.station_evidence.filter((item) => item.visitor_observation);
  const inquiries = digest.station_evidence.filter((item) => item.inquiry);
  const observedSample = observations[0]
    ? ` Attributed observation: “${normalizeText(observations[0].visitor_observation, 72)}”.`
    : " No visitor-authored visual observation was recorded; stances are not facts.";
  const stations = digest.station_evidence.length
    ? `Stations: ${digest.station_evidence.length}; visitor observations: ${observations.length}; inquiries: ${inquiries.length}.${observedSample}`
    : "No station record was supplied; no station observation is inferred.";
  return { question, answers, stations };
}

function lessonStop(scene, index, carryingQuestion) {
  const copy = FALLBACK_COPY[index];
  const next = PROCESS_SCENE_IDS[index + 1] || null;
  return {
    stop_id: scene.id,
    detail_id: scene.detail.id,
    guide_line: copy.guide_line,
    prompt: normalizeText(`Carrying “${carryingQuestion}”, this world asks: ${scene.question}`, 180),
    gesture: index % 3 === 0 ? "open" : index % 3 === 1 ? "reflect" : "point",
    stations: lessonStations(scene, index, carryingQuestion),
    choices: copy.choices.map((item) => ({ ...item, next_stop_id: next }))
  };
}

function lessonStations(scene, sceneIndex, carryingQuestion) {
  const manifestStop = SCENE_MANIFEST.stops.find((item) => item.stop_id === scene.id);
  return manifestStop.artworks.slice(0, 3).map((artwork, stationIndex) => {
    const title = artwork.title;
    return {
      station_id: `${scene.id}:station-${stationIndex + 1}`,
      artwork_id: artwork.artwork_id,
      focus_question: fallbackStationQuestion(scene, title, stationIndex, carryingQuestion),
      choices: fallbackStationChoices(title, sceneIndex, stationIndex)
    };
  });
}

function fallbackStationQuestion(scene, title, stationIndex, carryingQuestion) {
  const carrying = `For your carrying question, “${carryingQuestion},”`;
  if (stationIndex === 0) {
    return normalizeText(`${carrying} what exact relationship in ${title} can establish evidence for this world's lens, “${scene.question}”?`, 280);
  }
  if (stationIndex === 1) {
    return normalizeText(`${carrying} where does ${title} reinforce, complicate, or overturn the answer emerging from the first work?`, 280);
  }
  return normalizeText(`${carrying} what does ${title} make impossible to ignore across all three works, and which earlier claim now needs revision?`, 280);
}

function fallbackStationChoices(title, sceneIndex, stationIndex) {
  if (stationIndex === 1) {
    return [
      {
        value: "trace-continuity",
        label: "Trace a continuity",
        stance: `Look for a relationship in ${title} that sustains the first work's claim, while testing whether similarity is more than surface resemblance.`,
        evidence_prompt: "Name one comparable formal relation in both works and one difference that limits the comparison.",
        effect: "focus"
      },
      {
        value: "prioritize-rupture",
        label: "Let the difference interrupt",
        stance: `Treat the strongest difference in ${title} as a challenge to the first reading rather than fitting both works into a convenient theme.`,
        evidence_prompt: "Point to the precise difference and state which earlier assumption it weakens or overturns.",
        effect: "ripple"
      },
      {
        value: "test-context",
        label: "Use context as a counterweight",
        stance: `Compare ${title}'s verified catalog context with the first work without allowing title, maker, or date to dictate what must be seen.`,
        evidence_prompt: "Cite one catalog fact and one observation from each work, then identify where context fails to settle the comparison.",
        effect: "echo"
      }
    ];
  }
  if (stationIndex === 2) {
    return [
      {
        value: "seek-convergence",
        label: "Build a shared claim",
        stance: `Use ${title} to formulate one claim that genuinely survives all three works without erasing their formal differences.`,
        evidence_prompt: "Support the claim with one distinct observation from each work and name its narrowest defensible scope.",
        effect: "constellation"
      },
      {
        value: "keep-contradiction",
        label: "Keep the contradiction open",
        stance: `Let ${title} preserve a conflict the earlier works cannot resolve, treating disagreement as the scene's strongest evidence.`,
        evidence_prompt: "State the two incompatible readings and cite the observation that prevents either one from absorbing the other.",
        effect: "stillness"
      },
      {
        value: "revise-first-claim",
        label: "Revise the first claim",
        stance: `Allow the evidence accumulated by ${title} to change your starting position rather than merely adding a third example.`,
        evidence_prompt: "Quote your earlier claim in brief, name the decisive new observation, and state exactly what changed.",
        effect: sceneIndex % 2 === 0 ? "warmth" : "ripple"
      }
    ];
  }
  return [
    {
      value: "form-first",
      label: "Let composition lead",
      stance: `Treat the relationships you can point to inside ${title} as primary, even if that postpones an emotional conclusion.`,
      evidence_prompt: "Name one specific edge, interval, direction, repetition, or contrast that another visitor could verify.",
      effect: "focus"
    },
    {
      value: "feeling-first",
      label: "Let felt pressure lead",
      stance: `Use your response to ${title} as a hypothesis, while accepting that feeling alone cannot prove what the work means.`,
      evidence_prompt: "Identify the exact visible relationship that produces the feeling, then name what would weaken your reading.",
      effect: sceneIndex % 2 === 0 ? "warmth" : "ripple"
    },
    {
      value: "context-in-tension",
      label: "Hold image and context in tension",
      stance: "Test the visible work against its verified title, maker, and date without allowing the catalog label to settle the interpretation.",
      evidence_prompt: "Cite one catalog fact and one visible or visitor-recorded observation, then explain where they support or resist each other.",
      effect: "constellation"
    }
  ];
}

function sanitizeStations(stations, scene, sceneIndex, carryingQuestion) {
  const source = Array.isArray(stations) && stations.length === 3
    ? stations
    : lessonStations(scene, sceneIndex, normalizeText(carryingQuestion, 120) || scene.question);
  return source.map((station, stationIndex) => ({
    station_id: `${scene.id}:station-${stationIndex + 1}`,
    artwork_id: station.artwork_id,
    focus_question: normalizeText(station.focus_question, 280),
    choices: station.choices.map((option) => ({
      value: normalizeText(option.value, 48),
      label: normalizeText(option.label, 120),
      stance: normalizeText(option.stance, 320),
      evidence_prompt: normalizeText(option.evidence_prompt, 240),
      effect: option.effect
    }))
  }));
}

function manifestArtwork(artwork) {
  const artworkId = normalizeText(artwork.id, 100);
  const title = normalizeText(artwork.title, 160);
  const artist = normalizeText(artwork.artist, 120);
  const date = normalizeText(artwork.date, 60);
  return Object.freeze({
    id: artworkId,
    artwork_id: artworkId,
    title,
    artist,
    date,
    visual_facts: Object.freeze([
      catalogFact(artworkId, "title", `The collection catalog title is “${title}”.`),
      catalogFact(artworkId, "artist", `The collection catalog attributes the work to ${artist}.`),
      catalogFact(artworkId, "date", `The collection catalog dates the work ${date}.`)
    ])
  });
}

function catalogFact(artworkId, field, text) {
  return Object.freeze({
    id: `${artworkId}:catalog-${field}`,
    kind: "catalog_metadata",
    text: normalizeText(text, 240)
  });
}

function fallbackCopy(guide_line, choices) {
  return Object.freeze({ guide_line, choices: Object.freeze(choices) });
}

function choice(value, label, feedback, effect) {
  return Object.freeze({ value, label, feedback, effect });
}

function companion(id, name, lens) {
  return Object.freeze({ id, name, lens });
}

function sanitizeCompanionIds(input) {
  const output = [];
  for (const candidate of Array.isArray(input) ? input : []) {
    const id = typeof candidate === "string" ? candidate : candidate?.id;
    if (!COMPANION_IDS.has(id) || output.includes(id)) continue;
    output.push(id);
    if (output.length === 3) break;
  }
  return output.length ? output : [...DEFAULT_COMPANION_IDS];
}

function sameOrderedValues(left, right) {
  return left.length === right.length && right.every((value, index) => left[index] === value);
}

function rejectUnknownFields(value, allowed, label, errors) {
  const fields = new Set(allowed);
  for (const key of Object.keys(value || {})) if (!fields.has(key)) errors.push(`unknown ${label} field: ${key}`);
}
