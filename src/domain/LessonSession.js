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
    this.pendingChoice = resolved;
    this.phase = "reflecting";
    this.visited.push(this.currentStopId);
    this.visits.push({
      stop_id: this.currentStopId,
      detail_id: this.currentStop.detail_id,
      answer: resolved.label,
      effect: resolved.effect
    });
    return resolved;
  }

  continue() {
    if (this.phase !== "reflecting") throw new Error(`cannot_continue_from_${this.phase}`);
    if (this.visited.length >= this.plan.stops.length || !this.pendingChoice?.next_stop_id) {
      this.phase = "complete";
      this.currentStopId = null;
      this.pendingChoice = null;
      return null;
    }
    this.currentStopId = this.pendingChoice.next_stop_id;
    this.pendingChoice = null;
    this.phase = "walking";
    return this.currentStop;
  }

  digest(context = {}) {
    return createSessionDigest({
      learning_goal: this.plan?.learning_goal,
      visits: this.visits,
      companion_ids: context.companion_ids || context.companions
    });
  }
}
