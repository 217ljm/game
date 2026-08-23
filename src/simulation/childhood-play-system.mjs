import { clamp } from "./random.mjs";
import { ensureSocialCharacter, recordSharedActivity } from "./social-character-system.mjs";

function clone(value) {
  return structuredClone(value);
}

function roundOne(value) {
  return Math.round(value * 10) / 10;
}

function matchesPool(pool, context) {
  if (!pool.stages.includes(context.stage)) return false;
  if (context.age < pool.minAge || context.age > pool.maxAge) return false;
  const when = pool.when ?? {};
  if (when.educationStatusIn && !when.educationStatusIn.includes(context.educationStatus)) {
    return false;
  }
  if (when.residenceIn && !when.residenceIn.includes(context.residence)) return false;
  if (when.gradeMin != null && (!Number.isFinite(context.grade) || context.grade < when.gradeMin)) {
    return false;
  }
  if (when.gradeMax != null && (!Number.isFinite(context.grade) || context.grade > when.gradeMax)) {
    return false;
  }
  return true;
}

function ensureGrowthState(state, content) {
  state.childhoodGrowth ??= {
    schemaVersion: 1,
    paths: {},
    memories: [],
    activityHistory: [],
    activityCounts: {},
    experiencedActivityIds: [],
    reachedMilestoneIds: [],
  };
  for (const [id, definition] of Object.entries(content?.growthPaths ?? {})) {
    state.childhoodGrowth.paths[id] ??= {
      id,
      label: definition.label,
      description: definition.description,
      points: 0,
      levelId: "not_started",
      levelLabel: "尚未形成经历",
      lastActiveYear: null,
      lastActivityLabel: null,
    };
  }
  return state.childhoodGrowth;
}

export function childGrowthLevel(points) {
  if (points >= 24) return { id: "established", label: "形成稳定方式", floor: 24 };
  if (points >= 12) return { id: "developing", label: "持续发展", floor: 12 };
  if (points >= 4) return { id: "started", label: "开始形成", floor: 4 };
  if (points > 0) return { id: "experienced", label: "已有接触", floor: 1 };
  return { id: "not_started", label: "尚未形成经历", floor: 0 };
}

function growthRequirementStatus(option, state, content) {
  const growth = ensureGrowthState(state, content);
  const missing = [];
  for (const [pathId, threshold] of Object.entries(option.requiresGrowth ?? {})) {
    const path = growth.paths[pathId];
    if ((path?.points ?? 0) < threshold) {
      missing.push(`${path?.label ?? pathId}达到${threshold}点（当前${path?.points ?? 0}点）`);
    }
  }
  return {
    available: missing.length === 0,
    reason: missing.length > 0 ? `过去的经历还不足：${missing.join("；")}` : null,
  };
}

export function buildChildhoodPlayActivities(content, state, context) {
  const play = content?.childhoodPlay;
  if (!play || context.age < play.rules.minAge || context.age > play.rules.maxAge) return [];
  ensureGrowthState(state, play);
  return play.activityPools
    .filter((pool) => matchesPool(pool, context))
    .flatMap((pool) => pool.options.map((option) => {
      const requirement = growthRequirementStatus(option, state, play);
      return {
        ...clone(option),
        sourcePoolId: pool.id,
        available: option.available !== false && requirement.available,
        unavailableReason: option.available === false
          ? option.unavailableReason
          : requirement.reason,
        effectSummary: option.effectSummary
          ?? Object.entries(option.growthChanges ?? {})
            .map(([id]) => play.growthPaths[id]?.label)
            .filter(Boolean)
            .join("、"),
      };
    }));
}

function choose(random, values, fallback) {
  if (!Array.isArray(values) || values.length === 0) return fallback;
  return values[Math.min(values.length - 1, Math.floor(random() * values.length))];
}

const FAMILY_LABELS = {
  mother: "母亲",
  father: "父亲",
  grandmother: "祖母或外祖母",
  grandfather: "祖父或外祖父",
  older_sibling: "哥哥或姐姐",
  younger_sibling: "弟弟或妹妹",
};

function familyActor(state, preferred = null) {
  const candidates = state.household?.members ?? [];
  if (preferred === "sibling") {
    const sibling = candidates.find((member) => member.relation?.includes("sibling"));
    if (sibling) return { id: sibling.id, name: FAMILY_LABELS[sibling.relation], roleLabel: "共同生活的手足", fictional: false };
  }
  const member = candidates.find((entry) => entry.relation === "mother")
    ?? candidates.find((entry) => entry.relation === "father")
    ?? candidates.find((entry) => FAMILY_LABELS[entry.relation]);
  return member
    ? { id: member.id, name: FAMILY_LABELS[member.relation] ?? "家里人", roleLabel: "共同生活的家人", fictional: false }
    : { id: null, name: "家里人", roleLabel: "共同生活的家人", fictional: false };
}

function socialRoleFor(actorRole, stage, educationStatus) {
  if (actorRole === "teacher") return "primary_teacher";
  if (actorRole === "peer") {
    return stage === "primary" && educationStatus === "enrolled_primary"
      ? "primary_peer"
      : "neighborhood_friend";
  }
  if (actorRole === "friend") return stage === "primary" ? "primary_peer" : "neighborhood_friend";
  return null;
}

function resolveActor({ state, record, activity, context, socialCatalog, random, addFact }) {
  const actorRole = activity.experience?.actorRole ?? (
    /teacher/.test(activity.id) ? "teacher" : (
      /peer|friend|play_nearby|with_peers/.test(activity.id) || activity.category === "social"
        ? "peer"
        : (/caregiver|household|family/.test(activity.id) || activity.category === "family"
            ? "caregiver"
            : "self")
    )
  );
  if (actorRole === "self") {
    return { id: state.personId, name: "我自己", roleLabel: "自己", fictional: false, person: null };
  }
  if (["caregiver", "family", "sibling"].includes(actorRole)) {
    return { ...familyActor(state, actorRole), person: null };
  }
  const roleId = socialRoleFor(actorRole, context.stage, context.educationStatus);
  const person = ensureSocialCharacter({
    state,
    record,
    catalog: socialCatalog,
    roleId,
    random,
    addFact,
  });
  if (!person) {
    const fallback = actorRole === "teacher" ? "老师" : (actorRole === "peer" ? "一名同学" : "附近的孩子");
    return { id: null, name: fallback, roleLabel: fallback, fictional: true, person: null };
  }
  return {
    id: person.id,
    name: person.displayName,
    roleLabel: person.roleLabel,
    fictional: person.fictional,
    person,
  };
}

function genericProcess(activity) {
  const category = activity.category;
  const process = {
    learning: ["先找出这一季最具体的一项内容", "按固定时间重复练习", "把不会的部分留下来再核对"],
    entertainment: ["先准备身边实际能用的东西", "按自己的方式重复玩了几次", "把最喜欢的部分留到下一次"],
    social: ["先找到愿意一起参与的人", "相处中确认规则和边界", "结束前说好下一次是否继续"],
    exploration: ["先确定想观察的问题", "在不同时间再看一次", "把实际看见的部分和猜测分开"],
    family: ["先听清家里真正需要什么", "完成自己能力范围内的步骤", "做完后让家人确认结果"],
    health: ["先选择身体能承受的活动", "活动和休息交替进行", "不适时减少强度并告诉身边的人"],
    work: ["先观察完整做法", "在安全范围内自己完成步骤", "根据实际结果调整一次"],
  };
  return process[category] ?? ["先开始做一小段", "根据实际情况继续", "结束时记下发生了什么"];
}

function genericResponse(activity, actor) {
  if (actor.name === "我自己") return "没有人替你决定结果；你根据这次经历决定下次是否继续。";
  if (activity.category === "social") return `${actor.name}没有完全照你的办法做，但愿意和你把这次活动继续下去。`;
  if (activity.category === "family") return `${actor.name}检查了结果，并说明了哪些部分下次可以由你自己完成。`;
  if (activity.category === "learning") return `${actor.name}指出一个具体问题，没有把整项任务替你做完。`;
  return `${actor.name}看到了你的投入，并对其中一个具体步骤作出回应。`;
}

function addMemory(growth, memory, maximum) {
  growth.memories.push(memory);
  growth.memories = growth.memories.slice(-maximum);
}

function applyGrowthChanges({ state, record, activity, result, content, quarter, addFact }) {
  const growth = ensureGrowthState(state, content);
  const reached = [];
  const changes = {};
  for (const [pathId, rawDelta] of Object.entries(activity.growthChanges ?? {})) {
    const path = growth.paths[pathId];
    if (!path) continue;
    const before = path.points;
    const executionShare = result.plannedHours > 0 ? result.actualHours / result.plannedHours : 1;
    const delta = Math.max(1, Math.round(rawDelta * clamp(executionShare, 0.5, 1)));
    changes[pathId] = (changes[pathId] ?? 0) + delta;
    path.points += delta;
    path.lastActiveYear = record.calendarYear;
    path.lastActivityLabel = activity.label;
    const level = childGrowthLevel(path.points);
    path.levelId = level.id;
    path.levelLabel = level.label;
    for (const milestone of content.milestones.filter((entry) => entry.pathId === pathId)) {
      if (
        before < milestone.threshold
        && path.points >= milestone.threshold
        && !growth.reachedMilestoneIds.includes(milestone.id)
      ) {
        growth.reachedMilestoneIds.push(milestone.id);
        const fact = addFact(record, "childhood_growth_milestone", {
          milestoneId: milestone.id,
          pathId,
          pathLabel: path.label,
          threshold: milestone.threshold,
          pointsAfter: path.points,
          title: milestone.title,
          description: milestone.description,
          unlockHint: milestone.unlockHint,
          sourceActivityId: activity.id,
          sourceActivityLabel: activity.label,
          quarter,
        });
        const reachedEntry = { ...clone(milestone), sourceFactId: fact.id, pointsAfter: path.points };
        reached.push(reachedEntry);
        addMemory(growth, {
          id: `memory:${milestone.id}`,
          type: "growth_milestone",
          calendarYear: record.calendarYear,
          age: record.age,
          quarter,
          title: milestone.title,
          summary: milestone.description,
          people: result.actor.id ? [result.actor.id] : [],
          sourceFactId: fact.id,
          importance: 3,
        }, content.rules.maximumMemories);
      }
    }
  }
  return { milestones: reached, changes };
}

function experienceSetting(activity, context) {
  return activity.experience?.settingByResidence?.[context.residence]
    ?? activity.experience?.setting
    ?? (context.stage === "primary" ? "学校、放学路上或家中" : "住处附近的日常活动范围");
}

function effectiveGrowthChanges(activity, stage) {
  if (Object.keys(activity.growthChanges ?? {}).length > 0) return clone(activity.growthChanges);
  const changes = {};
  const tags = new Set(activity.interestTags ?? []);
  if (
    tags.has("social_organizing")
    || activity.category === "social"
    || /peer|friend|play_nearby|with_peers/.test(activity.id)
  ) changes.peer_bond = 1;
  if (tags.has("sports_movement") || activity.category === "health") changes.healthy_rhythm = 1;
  if (
    tags.has("making_repair")
    || tags.has("practical_work")
    || activity.category === "work"
  ) changes.practical_independence = 1;
  if (activity.category === "family") changes.family_participation = 1;
  if (activity.category === "learning" && stage === "primary") changes.school_confidence = 1;
  if (
    ["learning", "entertainment", "exploration"].includes(activity.category)
    || [...tags].some((tag) => [
      "reading_language",
      "numbers_logic",
      "visual_art",
      "music_performance",
      "nature_observation",
      "storytelling_media",
    ].includes(tag))
  ) changes.interest_exploration = 1;
  if (Object.keys(changes).length === 0) changes.interest_exploration = 1;
  return changes;
}

export function settleChildQuarter({
  state,
  record,
  content,
  stage,
  quarter,
  plan,
  context,
  socialCatalog,
  random,
  addFact,
}) {
  const play = content?.childhoodPlay;
  if (!play || record.age < play.rules.minAge || record.age > play.rules.maxAge) {
    return { results: [], milestones: [] };
  }
  const growth = ensureGrowthState(state, play);
  const illness = record.facts.find((fact) => [
    "child_illness_year_summary",
    "primary_child_health_year_summary",
  ].includes(fact.type));
  const symptomDays = illness?.symptomDays ?? 0;
  const results = [];
  const milestones = [];

  for (const activity of plan.activities ?? []) {
    const growthChanges = effectiveGrowthChanges(activity, stage);
    const actor = resolveActor({
      state,
      record,
      activity,
      context: { ...context, stage },
      socialCatalog,
      random,
      addFact,
    });
    const healthPenalty = Math.min(0.16, symptomDays / 180);
    const share = clamp(
      play.rules.actualHoursMinimumShare + random() * (
        play.rules.actualHoursMaximumShare - play.rules.actualHoursMinimumShare
      ) - healthPenalty,
      0.5,
      play.rules.actualHoursMaximumShare,
    );
    const plannedHours = activity.plannedHours ?? activity.hoursPerWeek * 13;
    const executableHours = activity.executedHours ?? plannedHours;
    const actualHours = roundOne(executableHours * share);
    const response = choose(
      random,
      activity.experience?.responses,
      genericResponse(activity, actor),
    );
    const outcome = choose(
      random,
      activity.experience?.outcomes,
      `你完成了约${actualHours}小时的实际投入，并知道下次从哪里继续。`,
    );
    const friction = /争|不高兴|迟到|没有完全|失败|不服/.test(`${response}${outcome}`);
    const result = {
      id: `${record.calendarYear}:Q${quarter}:${activity.id}`,
      activityId: activity.id,
      activityLabel: activity.label,
      category: activity.category,
      categoryLabel: activity.categoryLabel,
      setting: experienceSetting(activity, context),
      actor: {
        id: actor.id,
        name: actor.name,
        roleLabel: actor.roleLabel,
        fictional: actor.fictional,
      },
      process: clone(activity.experience?.process ?? genericProcess(activity)),
      response,
      outcome,
      plannedHours: roundOne(plannedHours),
      executableHours: roundOne(executableHours),
      executionRate: activity.executionRate ?? 1,
      actualHours,
      completionStatus: actualHours >= plannedHours * 0.82 ? "completed" : "partly_completed",
      completionLabel: actualHours >= plannedHours * 0.82 ? "基本按计划完成" : "受现实情况影响，只完成一部分",
      cashCostYuan: activity.cashCostYuan ?? 0,
      growthChanges,
      interestTags: clone(activity.interestTags ?? []),
    };
    const fact = addFact(record, "child_quarter_activity_outcome", {
      quarter,
      activityId: activity.id,
      activityLabel: activity.label,
      category: activity.category,
      setting: result.setting,
      actorId: actor.id,
      actorName: actor.name,
      actorRoleLabel: actor.roleLabel,
      plannedHours: result.plannedHours,
      actualHours: result.actualHours,
      completionStatus: result.completionStatus,
      process: result.process,
      response,
      outcome,
      growthChanges: result.growthChanges,
      interestTags: result.interestTags,
    });
    result.sourceFactId = fact.id;
    const growthOutcome = applyGrowthChanges({
      state,
      record,
      activity: { ...activity, growthChanges },
      result,
      content: play,
      quarter,
      addFact,
    });
    result.appliedGrowthChanges = growthOutcome.changes;
    milestones.push(...growthOutcome.milestones);
    if (actor.person) {
      recordSharedActivity({
        person: actor.person,
        record,
        activityId: activity.id,
        activityLabel: activity.label,
        quarter,
        response,
        closenessChange: activity.category === "social" ? 2 : 1,
        trustChange: friction ? 0 : 1,
        conflictChange: friction ? 1 : 0,
        addFact,
      });
    }
    const count = (growth.activityCounts[activity.id] ?? 0) + 1;
    growth.activityCounts[activity.id] = count;
    if (!growth.experiencedActivityIds.includes(activity.id)) {
      growth.experiencedActivityIds.push(activity.id);
      addMemory(growth, {
        id: `memory:${record.calendarYear}:Q${quarter}:${activity.id}`,
        type: "first_activity_experience",
        calendarYear: record.calendarYear,
        age: record.age,
        quarter,
        title: `第一次认真去做“${activity.label}”`,
        summary: `${actor.name}在场。${outcome}`,
        people: actor.id ? [actor.id] : [],
        sourceFactId: fact.id,
        importance: 1,
      }, play.rules.maximumMemories);
    }
    growth.activityHistory.push({
      ...clone(result),
      calendarYear: record.calendarYear,
      age: record.age,
      quarter,
      occurrence: count,
    });
    growth.activityHistory = growth.activityHistory.slice(-180);
    results.push(result);
  }
  return {
    results,
    milestones,
    growthChanges: results.reduce((totals, entry) => {
      for (const [pathId, delta] of Object.entries(entry.appliedGrowthChanges ?? {})) {
        totals[pathId] = (totals[pathId] ?? 0) + delta;
      }
      return totals;
    }, {}),
  };
}

export function childhoodGrowthView(state) {
  return Object.values(state.childhoodGrowth?.paths ?? {})
    .filter((path) => path.points > 0)
    .sort((left, right) => right.points - left.points)
    .map((path) => ({
      id: path.id,
      label: path.label,
      points: path.points,
      levelId: path.levelId,
      levelLabel: path.levelLabel,
      lastActivityLabel: path.lastActivityLabel,
      nextThreshold: [4, 12, 24].find((threshold) => threshold > path.points) ?? null,
    }));
}

export function applyChildRandomEventGrowth({
  state,
  record,
  content,
  event,
  selected,
  quarter,
  sourceFactId,
  addFact,
}) {
  const play = content?.childhoodPlay;
  if (!play || record.age < play.rules.minAge || record.age > play.rules.maxAge) {
    return { growthChanges: {}, milestones: [] };
  }
  const growth = ensureGrowthState(state, play);
  const growthChanges = clone(selected.growthChanges ?? {});
  const interestIds = Object.keys(selected.interestChanges ?? {});
  if (interestIds.some((id) => [
    "reading_language", "numbers_logic", "visual_art", "music_performance",
    "nature_observation", "storytelling_media",
  ].includes(id))) growthChanges.interest_exploration ??= 2;
  if (interestIds.includes("social_organizing") || (selected.statChanges?.relationships ?? 0) > 0) {
    growthChanges.peer_bond ??= 1;
  }
  if (interestIds.includes("sports_movement") || (selected.statChanges?.health ?? 0) > 0) {
    growthChanges.healthy_rhythm ??= 1;
  }
  if (interestIds.some((id) => ["making_repair", "practical_work"].includes(id))) {
    growthChanges.practical_independence ??= 1;
  }
  if (/家|父|母|手足|照看/.test(`${event.title}${event.scene}`)) {
    growthChanges.family_participation ??= 1;
  }
  if (Object.keys(growthChanges).length === 0) growthChanges.interest_exploration = 1;
  const syntheticResult = {
    actor: { id: null },
    plannedHours: 1,
    actualHours: 1,
  };
  const growthOutcome = applyGrowthChanges({
    state,
    record,
    activity: {
      id: `random_event:${event.id}:${selected.id}`,
      label: `${event.title}：${selected.label}`,
      growthChanges,
    },
    result: syntheticResult,
    content: play,
    quarter,
    addFact,
  });
  addMemory(growth, {
    id: `memory:random:${record.calendarYear}:Q${quarter}:${event.id}`,
    type: "random_event_choice",
    calendarYear: record.calendarYear,
    age: record.age,
    quarter,
    title: event.title,
    summary: `你选择了“${selected.label}”。${selected.description}`,
    people: [],
    sourceFactId,
    importance: 2,
  }, play.rules.maximumMemories);
  return { growthChanges: growthOutcome.changes, milestones: growthOutcome.milestones };
}
