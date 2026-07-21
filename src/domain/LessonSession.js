import { createSessionDigest, getStop, normalizeText, resolveChoice, validateLessonPlan } from "../../shared/contracts.js";

export class LessonSession {
  constructor() {
    this.reset();
  }

  reset() {
    this.plan = null;
    this.phase = "idle";
    this.currentStopId = null;
    this.visited = [];
    this.visits = [];
    this.pendingChoice = null;
  }

  start(plan) {
    const validated = validateLessonPlan(plan);
    if (!validated.ok) throw new Error(`invalid_lesson:${validated.errors.join("|")}`);
    this.reset();
    this.plan = validated.value;
    this.currentStopId = this.plan.start_stop_id;
    this.phase = "walking";
    return this.currentStop;
  }

  get currentStop() {
    return this.plan ? getStop(this.plan, this.currentStopId) : null;
  }

  arrive() {
    if (this.phase !== "walking") throw new Error(`cannot_arrive_from_${this.phase}`);
    this.phase = "asking";
    return this.currentStop;
  }

  retryArrival() {
    if (this.phase !== "asking") throw new Error(`cannot_retry_arrival_from_${this.phase}`);
    this.phase = "walking";
    return this.currentStop;
  }

  jumpTo(stopId) {
    if (!this.plan) throw new Error("lesson_not_started");
    if (!this.plan.stops.some((stop) => stop.stop_id === stopId)) {
      throw new Error(`unknown_process_scene:${stopId}`);
    }
    this.currentStopId = stopId;
    this.pendingChoice = null;
    this.phase = "walking";
    return this.currentStop;
  }

  answer(value) {
    if (this.phase !== "asking") throw new Error(`cannot_answer_from_${this.phase}`);
    const resolved = resolveChoice(this.plan, this.currentStopId, value, this.visited);
    if (!resolved) throw new Error("unknown_answer");
    return this.#recordAnswer(resolved);
  }

  answerObservation(value) {
    if (this.phase !== "asking") throw new Error(`cannot_answer_from_${this.phase}`);
    const observation = normalizeText(value, 80);
    if (!observation) throw new Error("observation_required");
    const template = this.currentStop?.choices?.[0];
    const route = template ? resolveChoice(this.plan, this.currentStopId, template.value, this.visited) : null;
    if (!route) throw new Error("observation_route_unavailable");
    return this.#recordAnswer({
      ...route,
      value: "free-observation",
      label: observation,
      feedback: "Your own words are now part of the evidence this company must carry into the final concept.",
      effect: "focus"
    });
  }

  #recordAnswer(resolved) {
    const visit = {
      stop_id: this.currentStopId,
      detail_id: this.currentStop.detail_id,
      answer: resolved.label,
      effect: resolved.effect
    };
    const existingIndex = this.visits.findIndex((item) => item.stop_id === this.currentStopId);
    if (existingIndex >= 0) this.visits[existingIndex] = visit;
    else {
      this.visited.push(this.currentStopId);
      this.visits.push(visit);
    }
    const pendingChoice = { ...resolved, next_stop_id: this.#nextIncompleteStopId(this.currentStopId) };
    this.pendingChoice = pendingChoice;
    this.phase = "reflecting";
    return pendingChoice;
  }

  continue() {
    if (this.phase !== "reflecting") throw new Error(`cannot_continue_from_${this.phase}`);
    const nextStopId = this.#nextIncompleteStopId(this.currentStopId);
    if (!nextStopId) {
      this.phase = "complete";
      this.currentStopId = null;
      this.pendingChoice = null;
      return null;
    }
    this.currentStopId = nextStopId;
    this.pendingChoice = null;
    this.phase = "walking";
    return this.currentStop;
  }

  #nextIncompleteStopId(currentStopId) {
    const completed = new Set(this.visited);
    const currentIndex = this.plan.stops.findIndex((stop) => stop.stop_id === currentStopId);
    for (let offset = 1; offset <= this.plan.stops.length; offset += 1) {
      const stop = this.plan.stops[(currentIndex + offset) % this.plan.stops.length];
      if (!completed.has(stop.stop_id)) return stop.stop_id;
    }
    return null;
  }

  digest(context = {}) {
    return createSessionDigest({
      learning_goal: this.plan?.learning_goal,
      visits: this.visits,
      companion_ids: context.companion_ids || context.companions,
      station_evidence: context.station_evidence || context.stationEvidence
    });
  }
}
