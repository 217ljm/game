import { clamp, randomInt } from "./random.mjs";

export const CHARACTER_MODEL_VERSION = 1;

export const CORE_ATTRIBUTE_KEYS = [
  "health",
  "fitness",
  "intelligence",
  "appearance",
  "social",
  "willpower",
];

const CATEGORY_ATTRIBUTE_EXPERIENCE = {
  health: { fitness: 16, willpower: 3 },
  learning: { intelligence: 16, willpower: 5 },
  exploration: { intelligence: 12, willpower: 4 },
  social: { social: 15, willpower: 3 },
  family: { social: 10, willpower: 6 },
  work: { intelligence: 7, willpower: 12 },
  finance: { intelligence: 8, willpower: 10 },
  entertainment: { intelligence: 5, social: 5 },
};

const INTENSITY_MULTIPLIER = {
  trial: 0.75,
  regular: 1,
  focus: 1.55,
};

function emptyAttributeProgress() {
  return Object.fromEntries(CORE_ATTRIBUTE_KEYS.map((key) => [key, 0]));
}

function naturalQuarterExperience(age) {
  if (age <= 2) return { fitness: 11, intelligence: 11, social: 8, willpower: 7 };
  if (age <= 5) return { fitness: 9, intelligence: 10, social: 7, willpower: 6 };
  if (age <= 11) return { fitness: 7, intelligence: 9, social: 5, willpower: 5 };
  if (age <= 17) return { fitness: 7, intelligence: 8, social: 6, willpower: 6 };
  if (age <= 24) return { fitness: 2, intelligence: 5, social: 4, willpower: 4 };
  if (age <= 39) return { intelligence: 3, social: 3, willpower: 3 };
  if (age <= 59) return { intelligence: 2, social: 2, willpower: 2 };
  return { intelligence: 1, social: 2, willpower: 2 };
}

function pointThreshold(value) {
  return 80 + Math.max(0, Math.round(value)) * 2;
}

function clampScore(value) {
  return Math.round(clamp(Number(value) || 0, 0, 100));
}

/**
 * 使用与出生主随机流分离的确定性随机源创建终身人物模型。
 * @param {{ random: () => number, birthHealth: any }} input
 */
export function createBirthCharacterModel({ random, birthHealth }) {
  const health = clampScore(birthHealth?.reserveScore ?? 82);
  const appearanceBase = clampScore(randomInt(random, 35, 65) + Math.round((health - 82) * 0.12));
  return {
    version: CHARACTER_MODEL_VERSION,
    attributes: {
      health,
      fitness: randomInt(random, 1, 4),
      intelligence: randomInt(random, 1, 3),
      appearance: appearanceBase,
      social: randomInt(random, 0, 2),
      willpower: randomInt(random, 1, 4),
    },
    state: {
      mood: 55,
      stress: 0,
      fatigue: 0,
      quarterEnergy: 0,
      illnessIds: [],
      injuryIds: [],
    },
    progress: emptyAttributeProgress(),
    potential: {
      fitness: randomInt(random, 45, 85),
      intelligence: randomInt(random, 45, 85),
      appearance: randomInt(random, 40, 80),
      social: randomInt(random, 40, 85),
      willpower: randomInt(random, 40, 85),
    },
    lastQuarterGrowth: null,
  };
}

/** @param {any} state */
export function ensureCharacterModel(state) {
  if (state.characterModel?.version === CHARACTER_MODEL_VERSION) return state.characterModel;
  const legacyHealth = state.visibleStats?.health?.value ?? 82;
  state.characterModel = {
    version: CHARACTER_MODEL_VERSION,
    attributes: {
      health: clampScore(legacyHealth),
      fitness: 1,
      intelligence: clampScore(state.visibleStats?.ability?.value ?? 1),
      appearance: 50,
      social: 1,
      willpower: 1,
    },
    state: {
      mood: clampScore(state.visibleStats?.mood?.value ?? 50),
      stress: 0,
      fatigue: 0,
      quarterEnergy: 0,
      illnessIds: [],
      injuryIds: [],
    },
    progress: emptyAttributeProgress(),
    potential: {
      fitness: 65,
      intelligence: 65,
      appearance: 60,
      social: 65,
      willpower: 65,
    },
    lastQuarterGrowth: null,
  };
  return state.characterModel;
}

/**
 * 在旧模拟仍运行期间，把健康、心情和旧能力事实同步到新模型。
 * 不把旧“关系”50分基线误当作角色社交能力。
 * @param {any} state
 */
export function syncCharacterModelFromLegacyState(state) {
  const model = ensureCharacterModel(state);
  if (Number.isFinite(state.visibleStats?.health?.value)) {
    model.attributes.health = clampScore(state.visibleStats.health.value);
  }
  if (Number.isFinite(state.visibleStats?.mood?.value)) {
    model.state.mood = clampScore(state.visibleStats.mood.value);
  }
  if (Number.isFinite(state.visibleStats?.ability?.value)) {
    model.attributes.intelligence = Math.max(
      model.attributes.intelligence,
      clampScore(state.visibleStats.ability.value),
    );
  }
  return model;
}

function mergeExperience(target, source, multiplier = 1) {
  for (const [attribute, amount] of Object.entries(source ?? {})) {
    if (!CORE_ATTRIBUTE_KEYS.includes(attribute) || attribute === "health") continue;
    target[attribute] = (target[attribute] ?? 0) + amount * multiplier;
  }
}

function activityIntensity(activity, allocations) {
  return allocations?.find((entry) => entry.actionId === activity.id)?.intensity
    ?? activity.defaultIntensity
    ?? "regular";
}

/**
 * 累积一个季度的自然发育和行动经验，并只在越过阈值时改变可见属性。
 * @param {{ state: any, age: number, quarter: number, activities: any[], allocations?: any[] }} input
 */
export function applyQuarterCharacterGrowth({
  state,
  age,
  quarter,
  activities,
  allocations = [],
}) {
  const model = syncCharacterModelFromLegacyState(state);
  const experience = emptyAttributeProgress();
  mergeExperience(experience, naturalQuarterExperience(age));

  for (const activity of activities ?? []) {
    const intensity = activityIntensity(activity, allocations);
    const multiplier = (INTENSITY_MULTIPLIER[intensity] ?? 1) * (activity.executionRate ?? 1);
    if (activity.resourceEffect !== "recovery") {
      mergeExperience(
        experience,
        CATEGORY_ATTRIBUTE_EXPERIENCE[activity.category] ?? CATEGORY_ATTRIBUTE_EXPERIENCE.exploration,
        multiplier,
      );
    }
    if ((activity.statChanges?.ability ?? 0) > 0) {
      experience.intelligence += activity.statChanges.ability * 5 * multiplier;
    }
    if ((activity.statChanges?.relationships ?? 0) > 0) {
      experience.social += activity.statChanges.relationships * 5 * multiplier;
    }
    if ((activity.statChanges?.health ?? 0) > 0 && activity.category === "health") {
      experience.fitness += activity.statChanges.health * 5 * multiplier;
    }
  }

  const before = { ...model.attributes };
  const applied = {};
  for (const attribute of CORE_ATTRIBUTE_KEYS) {
    if (attribute === "health") continue;
    model.progress[attribute] = (model.progress[attribute] ?? 0) + (experience[attribute] ?? 0);
    while (
      model.attributes[attribute] < 100
      && model.progress[attribute] >= pointThreshold(model.attributes[attribute])
    ) {
      model.progress[attribute] -= pointThreshold(model.attributes[attribute]);
      model.attributes[attribute] += 1;
      applied[attribute] = (applied[attribute] ?? 0) + 1;
    }
  }

  model.lastQuarterGrowth = {
    age,
    quarter,
    experience: Object.fromEntries(
      Object.entries(experience).filter(([, amount]) => Math.abs(amount) >= 0.01),
    ),
    applied,
    before,
    after: { ...model.attributes },
  };
  return structuredClone(model.lastQuarterGrowth);
}
