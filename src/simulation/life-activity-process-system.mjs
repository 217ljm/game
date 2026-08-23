import { clamp } from "./random.mjs";

const PROCESS_BY_CATEGORY = {
  learning: ["先确定这一季真正要学会的内容", "在三个月里按计划练习并处理卡住的地方", "月底整理结果，决定下一季从哪里继续"],
  work: ["先确认任务、工时和能够使用的条件", "在实际岗位或练习环境里反复完成具体任务", "回看结果、代价和下一步能够争取的机会"],
  social: ["先主动发起一次联系或共同安排", "在三个月里保持见面、通信或共同活动", "从对方回应中判断这段关系怎样继续"],
  family: ["先把需要共同处理的事情说清楚", "在日常家务、照护或相处中实际投入时间", "和家人确认哪些事情得到改善、哪些仍有压力"],
  health: ["先根据当前身体状态确定能够承受的量", "在三个月里持续活动并在不适时调整", "观察睡眠、疲劳和身体反应是否改变"],
  recovery: ["先主动减少一部分额外安排", "把空出的时间用于睡眠、安静活动和恢复", "月底重新判断精力是否适合增加行动"],
  finance: ["先核对手头现金、收入和必须支出", "在三个月里记录实际花费并执行选择", "月底查看结余，而不是只凭感觉判断"],
  entertainment: ["先找到当时实际能够接触的娱乐方式", "把一部分空闲时间稳定留给它", "观察新鲜感是否变成愿意继续的兴趣"],
  exploration: ["先确定一个真正想弄明白的问题", "通过观察、询问或亲手尝试收集线索", "把得到的经验和仍不明白的地方记下来"],
};

function rounded(value) {
  return Math.round(value * 10) / 10;
}

function actorCandidates(state, category) {
  const active = (state.socialNetwork ?? []).filter((person) => person.active !== false);
  const patterns = {
    learning: /teacher|peer|school|同学|老师|培训/,
    work: /work|coworker|contact|同事|工作|师傅/,
    social: /friend|peer|neighbor|朋友|同学|邻里/,
    family: /family|relative|家人|亲属/,
  };
  const preferred = patterns[category]
    ? active.filter((person) => patterns[category].test(`${person.roleId ?? ""} ${person.roleLabel ?? ""}`))
    : [];
  return [...preferred, ...active.filter((person) => !preferred.includes(person))]
    .sort((left, right) => (right.closeness ?? 0) - (left.closeness ?? 0));
}

function familyActor(state) {
  if (state.family?.partner) {
    return { id: state.family.partner.id ?? "partner", name: state.family.partner.name ?? "伴侣", roleLabel: "伴侣", person: null };
  }
  const parent = state.family?.originMembers?.find((entry) => entry.alive && ["mother", "father"].includes(entry.relation));
  if (parent) {
    return {
      id: parent.id,
      name: parent.relation === "mother" ? "母亲" : "父亲",
      roleLabel: "家人",
      person: null,
    };
  }
  return null;
}

function resolveActor(state, activity) {
  if (activity.category === "recovery" || activity.category === "finance") {
    return { id: "self", name: "你自己", roleLabel: "自己", person: null };
  }
  const person = actorCandidates(state, activity.category)[0];
  if (person) {
    return {
      id: person.id,
      name: person.displayName,
      roleLabel: person.roleLabel,
      person,
    };
  }
  return familyActor(state)
    ?? { id: "self", name: "你自己", roleLabel: "自己", person: null };
}

function activitySetting(state, context, activity) {
  if (activity.category === "learning") {
    if (["enrolled", "enrolled_junior", "enrolled_primary"].includes(context.educationStatus)) return "当前学校与课后学习地点";
    return "家中或当时能够使用的学习地点";
  }
  if (activity.category === "work") {
    return state.employment?.currentJob?.label
      ? `${state.employment.currentJob.label}的实际工作环境`
      : "能够接触到的实作或求职环境";
  }
  if (activity.category === "family" || activity.category === "finance") return "当前共同生活的家中";
  if (activity.category === "social") return context.residence === "rural" ? "村庄与附近往来地点" : "住处、学校或工作地附近";
  if (activity.category === "health") return "住处附近能够安全活动的地方";
  if (activity.category === "recovery") return "当前住处";
  return context.residence === "rural" ? "村庄和日常活动范围" : "居住地附近能够到达的地方";
}

function actorResponse(actor, activity, completionStatus) {
  if (actor.roleLabel === "自己") {
    return completionStatus === "completed"
      ? "你能感觉到这项安排已经形成节奏，不再只是临时起意。"
      : "你发现现实占用了原定时间，需要降低目标或换一种做法。";
  }
  const response = {
    learning: "对方指出了一个具体问题，也愿意在下次继续交换做法。",
    work: "对方根据你实际完成的任务给出反馈，没有把一次尝试直接当成稳定机会。",
    social: "对方有自己的时间和想法，但这次共同经历让你们多了一段可以继续的联系。",
    family: "对方注意到你的实际投入，也说出了仍需要一起承担的部分。",
    health: "对方提醒你观察身体反应，不要为了完成计划忽略明显不适。",
  }[activity.category];
  return response ?? "对方看见了你的投入，并用自己的方式作出回应。";
}

function updateSharedMemory(actor, record, activity, response) {
  if (!actor.person) return;
  const person = actor.person;
  person.closeness = clamp((person.closeness ?? 40) + (activity.category === "social" ? 2 : 1), 0, 100);
  person.familiarity = clamp((person.familiarity ?? person.closeness) + 1, 0, 100);
  person.trust = clamp((person.trust ?? 40) + 1, 0, 100);
  person.lastContactYear = record.calendarYear;
  person.sharedMemories ??= [];
  person.sharedMemories.push({
    id: `memory:${record.calendarYear}:Q${record.quarter ?? 0}:${activity.id}:${person.id}`,
    calendarYear: record.calendarYear,
    age: record.age,
    title: `一起经历“${activity.label}”`,
    summary: response,
    activityId: activity.id,
  });
  person.sharedMemories = person.sharedMemories.slice(-24);
}

/** 为13岁以后生成场景、人物、三步过程、回应和实际结果。 */
export function settleLifeQuarterProcess({
  state,
  record,
  stage,
  quarter,
  plan,
  context,
  addFact,
}) {
  if (record.age <= 12) return { results: [] };
  const results = [];
  for (const activity of plan.activities ?? []) {
    const actor = resolveActor(state, activity);
    const plannedHours = rounded(activity.plannedHours ?? activity.hoursPerWeek * 13);
    const actualHours = rounded(activity.executedHours ?? plannedHours);
    const completionStatus = actualHours + 0.1 >= plannedHours * 0.82
      ? "completed"
      : "partly_completed";
    const response = actorResponse(actor, activity, completionStatus);
    const outcome = completionStatus === "completed"
      ? `你实际投入约${actualHours}小时；这项行动已经留下可以延续的经验。`
      : `你原计划投入约${plannedHours}小时，实际完成约${actualHours}小时；未完成部分被现实事件或精力限制打断。`;
    const result = {
      id: `${record.calendarYear}:Q${quarter}:${activity.id}:life-process`,
      activityId: activity.id,
      activityLabel: activity.label,
      category: activity.category,
      categoryLabel: activity.categoryLabel,
      setting: activitySetting(state, context, activity),
      actor: {
        id: actor.id,
        name: actor.name,
        roleLabel: actor.roleLabel,
        fictional: actor.person?.fictional ?? false,
      },
      process: structuredClone(PROCESS_BY_CATEGORY[activity.category] ?? PROCESS_BY_CATEGORY.exploration),
      response,
      outcome,
      plannedHours,
      actualHours,
      executionRate: activity.executionRate ?? 1,
      completionStatus,
      completionLabel: completionStatus === "completed" ? "基本按计划完成" : "受现实情况影响，只完成一部分",
      cashCostYuan: activity.cashCostYuan ?? 0,
      growthChanges: {},
      interestTags: structuredClone(activity.interestTags ?? []),
    };
    const fact = addFact(record, "quarter_activity_process", {
      stage,
      quarter,
      activityId: activity.id,
      activityLabel: activity.label,
      category: activity.category,
      setting: result.setting,
      actorId: actor.id,
      actorName: actor.name,
      actorRoleLabel: actor.roleLabel,
      plannedHours,
      actualHours,
      executionRate: result.executionRate,
      completionStatus,
      process: result.process,
      response,
      outcome,
    });
    result.sourceFactId = fact.id;
    updateSharedMemory(actor, { ...record, quarter }, activity, response);
    results.push(result);
  }
  return { results };
}
