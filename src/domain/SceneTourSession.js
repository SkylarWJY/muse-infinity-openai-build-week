const MIN_STATION_COUNT = 3;
const MAX_STATION_COUNT = 4;
const DEFAULT_REQUIRED_STATION_COUNT = 3;

export class SceneTourSession {
  constructor() {
    this.token = 0;
    this.reset();
  }

  reset() {
    this.token += 1;
    this.phase = "idle";
    this.sceneId = null;
    this.stations = [];
    this.companionIds = [];
    this.requiredStationCount = DEFAULT_REQUIRED_STATION_COUNT;
    this.stationIndex = null;
    this.stationEvidence = [];
    this.skippedStationIds = [];
    this.sceneReflection = null;
    return this.token;
  }

  start({ sceneId, stations, companionIds, requiredStationCount = DEFAULT_REQUIRED_STATION_COUNT } = {}) {
    const config = validateConfig({ sceneId, stations, companionIds, requiredStationCount });
    this.reset();
    this.sceneId = config.sceneId;
    this.stations = config.stations;
    this.companionIds = config.companionIds;
    this.requiredStationCount = config.requiredStationCount;
    this.phase = "scene-walking";
    return this.token;
  }

  get focusedArtworkId() {
    return this.stationIndex === null ? null : this.stations[this.stationIndex] || null;
  }

  get leadCompanionId() {
    if (this.stationIndex === null || !this.companionIds.length) return null;
    return this.companionIds[this.stationIndex % this.companionIds.length];
  }

  get speakerOrder() {
    if (this.stationIndex === null || !this.companionIds.length) return [];
    const leadIndex = this.stationIndex % this.companionIds.length;
    return this.companionIds.map((_, offset) => (
      this.companionIds[(leadIndex + offset) % this.companionIds.length]
    ));
  }

  get metrics() {
    const explored = this.stationEvidence.length;
    const skipped = this.skippedStationIds.length;
    const resolved = explored + skipped;
    return {
      required: this.requiredStationCount,
      explored,
      skipped,
      resolved,
      remaining: Math.max(0, this.requiredStationCount - resolved)
    };
  }

  arriveScene(token = this.token) {
    this.#requireToken(token);
    this.#requirePhase("scene-walking", "arrive_scene");
    this.stationIndex = 0;
    this.phase = "station-walking";
    return this.#stationContext();
  }

  arriveStation(token = this.token) {
    this.#requireToken(token);
    this.#requirePhase("station-walking", "arrive_station");
    this.phase = "station-ready";
    return this.#stationContext();
  }

  beginDiscussion(token = this.token) {
    this.#requireToken(token);
    this.#requirePhase("station-ready", "begin_discussion");
    this.phase = "discussing";
    return this.#stationContext();
  }

  recordStationEvidence(value, token = this.token) {
    this.#requireToken(token);
    this.#requirePhase("discussing", "record_station_evidence");
    const evidence = validateEvidence(value, this.focusedArtworkId, this.speakerOrder);
    this.stationEvidence.push(evidence);
    this.phase = "station-reflecting";
    return evidence;
  }

  skipStation(token = this.token) {
    this.#requireToken(token);
    if (!["station-walking", "station-ready", "discussing"].includes(this.phase)) {
      throw new Error(`cannot_skip_station_from_${this.phase}`);
    }
    const artworkId = this.focusedArtworkId;
    if (!artworkId) throw new Error("station_required_before_skip");
    if (!this.skippedStationIds.includes(artworkId)) this.skippedStationIds.push(artworkId);
    this.phase = "station-reflecting";
    return artworkId;
  }

  continue(token = this.token) {
    this.#requireToken(token);
    this.#requirePhase("station-reflecting", "continue");
    if (this.metrics.resolved >= this.requiredStationCount) {
      this.stationIndex = null;
      this.phase = "scene-reflection";
      return null;
    }
    this.stationIndex += 1;
    this.phase = "station-walking";
    return this.#stationContext();
  }

  completeScene(value, token = this.token) {
    this.#requireToken(token);
    this.#requirePhase("scene-reflection", "complete_scene");
    const reflection = clean(value, 1200);
    if (!reflection) throw new Error("scene_reflection_required");
    this.sceneReflection = reflection;
    this.phase = "complete";
    return reflection;
  }

  #stationContext() {
    return {
      sceneId: this.sceneId,
      stationIndex: this.stationIndex,
      artworkId: this.focusedArtworkId,
      leadCompanionId: this.leadCompanionId,
      speakerOrder: this.speakerOrder
    };
  }

  #requireToken(token) {
    if (token !== this.token) throw new Error("stale_scene_tour_token");
  }

  #requirePhase(expected, action) {
    if (this.phase !== expected) throw new Error(`cannot_${action}_from_${this.phase}`);
  }
}

function validateConfig({ sceneId, stations, companionIds, requiredStationCount }) {
  const normalizedSceneId = clean(sceneId, 120);
  if (!normalizedSceneId) throw new Error("scene_tour_requires_scene_id");

  if (!Array.isArray(stations) || stations.length < MIN_STATION_COUNT || stations.length > MAX_STATION_COUNT) {
    throw new Error("scene_tour_requires_three_or_four_stations");
  }
  const normalizedStations = stations.map((station) => cleanArtworkId(station));
  if (normalizedStations.some((artworkId) => !artworkId)) throw new Error("station_artwork_id_required");
  if (new Set(normalizedStations).size !== normalizedStations.length) throw new Error("duplicate_station_artwork");

  if (!Array.isArray(companionIds) || !companionIds.length) throw new Error("scene_tour_requires_companions");
  const normalizedCompanions = companionIds.map((companionId) => clean(companionId, 80));
  if (normalizedCompanions.some((companionId) => !companionId)) throw new Error("companion_id_required");
  if (new Set(normalizedCompanions).size !== normalizedCompanions.length) throw new Error("duplicate_scene_tour_companion");

  if (!Number.isInteger(requiredStationCount)
    || requiredStationCount < MIN_STATION_COUNT
    || requiredStationCount > normalizedStations.length) {
    throw new Error("invalid_required_station_count");
  }

  return {
    sceneId: normalizedSceneId,
    stations: normalizedStations,
    companionIds: normalizedCompanions,
    requiredStationCount
  };
}

function validateEvidence(value, artworkId, speakerOrder) {
  const visitorObservation = clean(value?.visitorObservation, 600);
  const visitorQuestion = clean(value?.visitorQuestion, 400);
  if (!visitorObservation && !visitorQuestion) throw new Error("visitor_reflection_required");

  const perspectives = Array.isArray(value?.perspectives)
    ? value.perspectives.map((item) => ({
      companionId: clean(item?.companionId, 80),
      text: clean(item?.text, 800)
    }))
    : [];
  const followsSpeakerOrder = perspectives.length === speakerOrder.length
    && perspectives.every((item, index) => item.companionId === speakerOrder[index] && item.text);
  if (!followsSpeakerOrder) throw new Error("perspectives_must_follow_speaker_order");

  return {
    artworkId,
    visitorObservation,
    visitorQuestion,
    perspectives
  };
}

function cleanArtworkId(station) {
  if (typeof station === "string") return clean(station, 160);
  return clean(station?.artworkId || station?.id, 160);
}

function clean(value, maxLength) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}
