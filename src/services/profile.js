const STORAGE_KEY = "muse.profile.v1";

export class ProfileStore {
  load() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return value && typeof value === "object" ? value : { name: "", goals: [], history: [] };
    } catch {
      return { name: "", goals: [], history: [] };
    }
  }

  save(patch) {
    const current = this.load();
    const next = {
      name: clean(patch.name ?? current.name, 40),
      goals: Array.from(new Set([...(patch.goals || current.goals || [])].map((item) => clean(item, 120)).filter(Boolean))).slice(-8),
      history: [...(patch.history || current.history || [])].slice(-12)
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  record(goal, recap) {
    const profile = this.load();
    return this.save({
      ...profile,
      goals: [...profile.goals, goal],
      history: [...profile.history, { goal: clean(goal, 120), summary: clean(recap?.summary, 240), at: new Date().toISOString() }]
    });
  }
}

function clean(value, max) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}
