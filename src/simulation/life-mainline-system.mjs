import { youthMainlinePayoffReview } from "./youth-mainline-payoff-system.mjs";

const CHAPTERS = [
  {
    id: "first_world",
    minAge: 0,
    maxAge: 5,
    label: "第一章 · 认识世界",
    question: "我在怎样的生活里长大，又会反复靠近什么？",
  },
  {
    id: "school_and_home",
    minAge: 6,
    maxAge: 11,
    label: "第二章 · 家庭与学校",
    question: "在功课、家庭、朋友和玩耍之间，我正在长成怎样的人？",
  },
  {
    id: "choosing_a_direction",
    minAge: 12,
    maxAge: 17,
    label: "第三章 · 开始选择方向",
    question: "成年生活正在靠近，我准备把时间和本事带到哪里？",
  },
  {
    id: "entering_society",
    minAge: 18,
    maxAge: 24,
    label: "第四章 · 进入社会",
    question: "我怎样获得自己的生活入口，又愿意为哪条路付出时间？",
  },
  {
    id: "building_a_life",
    minAge: 25,
    maxAge: 39,
    label: "第五章 · 建立自己的生活",
    question: "工作、住处、关系和愿望之间，我要建立怎样的生活？",
  },
  {
    id: "keeping_and_changing",
    minAge: 40,
    maxAge: 59,
    label: "第六章 · 守住与改变",
    question: "责任越来越多，我要守住什么，又还有什么可以重新选择？",
  },
  {
    id: "later_years",
    minAge: 60,
    maxAge: 120,
    label: "第七章 · 后来的日子",
    question: "离开全职工作以后，我怎样生活，又会把什么留在关系和记忆里？",
  },
];

const DIRECTIONS = [
  {
    id: "understanding",
    label: "理解与求知",
    description: "阅读、提问、观察和推理反复出现在你的生活里。",
    interestIds: ["reading_language", "numbers_logic", "nature_observation"],
    categories: ["learning", "exploration"],
  },
  {
    id: "practice",
    label: "动手与实践",
    description: "制作、修理、技能和具体劳动逐渐连成一条路。",
    interestIds: ["making_repair", "practical_work"],
    categories: ["work", "exploration"],
  },
  {
    id: "expression",
    label: "表达与创造",
    description: "画面、声音、故事和表演成为你表达生活的方式。",
    interestIds: ["visual_art", "music_performance", "storytelling_media"],
    categories: ["entertainment"],
  },
  {
    id: "belonging",
    label: "关系与共同生活",
    description: "朋友、家人和共同完成的事情在你的选择中占据重要位置。",
    interestIds: ["social_organizing"],
    categories: ["social", "family"],
  },
  {
    id: "vitality",
    label: "身体与生活节律",
    description: "运动、休息和对身体的照顾持续影响你的生活方式。",
    interestIds: ["sports_movement"],
    categories: ["health"],
  },
  {
    id: "security",
    label: "工作与生活保障",
    description: "工作、收入、储蓄和生活安排构成你争取余地的方式。",
    interestIds: ["practical_work", "numbers_logic"],
    categories: ["work", "finance"],
  },
];

const QUEST_TYPE_LABELS = {
  survival: "眼下要维持",
  development: "正在积累",
  aspiration: "想要靠近",
};

const STAT_LABELS = {
  health: "健康",
  wealth: "财富",
  mood: "心情",
  ability: "认知能力",
  relationships: "关系",
};

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function clone(value) {
  return structuredClone(value);
}

function currentAge(result) {
  return result.currentState?.currentAge
    ?? result.ending?.age
    ?? result.currentState?.annualRecords?.at(-1)?.age
    ?? 0;
}

function currentYear(result) {
  return result.currentState?.annualRecords?.at(-1)?.calendarYear
    ?? result.ending?.calendarYear
    ?? result.profile.person.birthYear;
}

function allRecords(result) {
  return Object.entries(result.stages ?? {})
    .flatMap(([stage, state]) => (state.annualRecords ?? []).map((record) => ({ stage, record })))
    .sort((left, right) => (
      left.record.calendarYear - right.record.calendarYear
      || left.record.age - right.record.age
    ));
}

function uniqueQuarters(records) {
  const byKey = new Map();
  for (const { stage, record } of records) {
    for (const quarter of record.quarterRecords ?? []) {
      const key = `${record.calendarYear}:Q${quarter.quarter}`;
      const existing = byKey.get(key);
      if (!existing || (quarter.activities?.length ?? 0) > (existing.quarter.activities?.length ?? 0)) {
        byKey.set(key, { stage, record, quarter });
      }
    }
  }
  return [...byKey.values()].sort((left, right) => (
    left.record.calendarYear - right.record.calendarYear
    || left.quarter.quarter - right.quarter.quarter
  ));
}

function allFacts(records) {
  return records.flatMap(({ stage, record }) => (
    (record.facts ?? []).map((fact) => ({ stage, record, fact }))
  ));
}

function statValue(state, id) {
  return Number(state.visibleStats?.[id]?.value ?? 0);
}

function growthPoints(state, ids) {
  return ids.reduce((sum, id) => sum + Number(state.childhoodGrowth?.paths?.[id]?.points ?? 0), 0);
}

function metric(id, label, current, target, options = {}) {
  const numericCurrent = Number.isFinite(Number(current)) ? Number(current) : 0;
  const numericTarget = Math.max(1, Number(target) || 1);
  const progress = options.boolean
    ? (current ? 100 : 0)
    : clamp(numericCurrent / numericTarget * 100);
  return {
    id,
    label,
    current: options.boolean ? (current ? 1 : 0) : Math.round(numericCurrent * 10) / 10,
    target: options.boolean ? 1 : numericTarget,
    unit: options.unit ?? "",
    progress: Math.round(progress),
    weight: options.weight ?? 1,
    valueLabel: options.valueLabel
      ?? (options.boolean
        ? (current ? options.trueLabel ?? "已有事实" : options.falseLabel ?? "尚未形成")
        : `${Math.round(numericCurrent * 10) / 10}${options.unit ?? ""} / ${numericTarget}${options.unit ?? ""}`),
  };
}

function makeQuest(id, type, title, summary, metrics) {
  const totalWeight = metrics.reduce((sum, entry) => sum + entry.weight, 0) || 1;
  const progress = Math.round(metrics.reduce(
    (sum, entry) => sum + entry.progress * entry.weight,
    0,
  ) / totalWeight);
  const weakest = [...metrics].sort((left, right) => left.progress - right.progress)[0];
  const statusLabel = progress >= 90
    ? "这一阶段已经站稳"
    : progress >= 65
      ? "正在形成连续性"
      : progress >= 35
        ? "已经有迹可循"
        : "仍在起步";
  return {
    id,
    type,
    typeLabel: QUEST_TYPE_LABELS[type],
    title,
    summary,
    progress,
    statusLabel,
    metrics,
    nextHint: progress >= 90
      ? "接下来的选择会决定它如何延续，而不是继续刷同一个数值。"
      : `目前最缺的是：${weakest.label}（${weakest.valueLabel}）。`,
  };
}

function directionScores(result, records = allRecords(result)) {
  const state = result.currentState;
  const interests = state.interests ?? {};
  const quarters = uniqueQuarters(records);
  return DIRECTIONS.map((direction) => {
    const interestEntries = direction.interestIds
      .map((id) => interests[id])
      .filter(Boolean);
    const currentInterest = interestEntries.reduce((sum, entry) => sum + Math.max(0, entry.score ?? 0), 0);
    const lifetimeHours = interestEntries.reduce((sum, entry) => sum + Math.max(0, entry.totalHours ?? 0), 0);
    const matchingActions = quarters.flatMap(({ quarter }) => quarter.activities ?? [])
      .filter((activity) => (
        (activity.interestTags ?? []).some((id) => direction.interestIds.includes(id))
        || direction.categories.includes(activity.category)
      ));
    const lastAction = [...quarters].reverse().find(({ quarter }) => (
      (quarter.activities ?? []).some((activity) => (
        (activity.interestTags ?? []).some((id) => direction.interestIds.includes(id))
        || direction.categories.includes(activity.category)
      ))
    ));
    const score = clamp(
      currentInterest * 0.52
      + Math.log10(lifetimeHours + 1) * 11
      + Math.min(26, matchingActions.length * 1.15),
    );
    const levelLabel = score >= 80
      ? "已经成为生活的一部分"
      : score >= 55
        ? "持续发展"
        : score >= 30
          ? "反复出现"
          : score >= 12
            ? "开始显露"
            : "尚未定型";
    return {
      ...clone(direction),
      score: Math.round(score),
      levelLabel,
      currentInterest: Math.round(currentInterest),
      lifetimeHours: Math.round(lifetimeHours),
      actionCount: matchingActions.length,
      lastActiveYear: lastAction?.record.calendarYear
        ?? Math.max(0, ...interestEntries.map((entry) => entry.lastActiveYear ?? 0))
        ?? null,
      evidence: [
        `${matchingActions.length}次季度行动与这条方向有关`,
        lifetimeHours > 0 ? `相关兴趣累计约${Math.round(lifetimeHours)}小时` : "还没有形成持续投入",
      ],
    };
  }).sort((left, right) => right.score - left.score || left.label.localeCompare(right.label, "zh-CN"));
}

function currentChapterForAge(age) {
  return CHAPTERS.find((entry) => age >= entry.minAge && age <= entry.maxAge) ?? CHAPTERS.at(-1);
}

function educationOrWorkStatus(state) {
  const studying = state.education?.status === "enrolled_primary"
    || state.path === "junior_student"
    || state.education?.senior?.status === "enrolled"
    || state.education?.higher?.status === "enrolled";
  const workStatus = state.employment?.status;
  const working = Boolean(state.employment?.currentJob)
    || ["employed", "family_economic_activity", "self_employed", "retired"].includes(workStatus);
  return { studying, working, active: studying || working };
}

function annualIncome(state) {
  return Number(
    state.finance?.lastAnnualRecord?.annualHouseholdCashIncomeYuan
      ?? state.household?.finance?.annualHouseholdIncomeYuan
      ?? state.annualRecords?.at(-1)?.endState?.annualHouseholdIncomeYuan
      ?? 0,
  );
}

function currentQuestSet(result, chapter, directions) {
  const state = result.currentState;
  const age = currentAge(result);
  const record = state.annualRecords?.at(-1);
  const quarters = record?.quarterRecords?.length ?? 0;
  const health = statValue(state, "health");
  const ability = statValue(state, "ability");
  const relationships = statValue(state, "relationships");
  const interests = Object.values(state.interests ?? {});
  const exposedInterests = interests.filter((entry) => (entry.totalHours ?? 0) > 0).length;
  const activeInterests = interests.filter((entry) => (entry.score ?? 0) >= 12).length;
  const primaryDirection = directions[0];
  const currentStatus = educationOrWorkStatus(state);
  const income = annualIncome(state);
  const socialPeople = (state.socialNetwork ?? []).filter((person) => person.active).length;
  const netWorth = Number(state.finance?.netWorthYuan ?? state.finance?.endingNetWorthYuan ?? 0);
  const housingKnown = Boolean(state.housing?.arrangement ?? state.housing?.tenure ?? state.household?.housing?.tenure);
  const jobYears = (state.employment?.history ?? []).reduce((sum, job) => sum + Number(job.yearsInJob ?? 0), 0);
  const healthyRhythm = growthPoints(state, ["healthy_rhythm"]);
  const exploration = growthPoints(state, ["interest_exploration", "practical_independence"]);
  const schoolGrowth = growthPoints(state, ["school_confidence", "interest_exploration"]);
  const familyGrowth = growthPoints(state, ["family_participation", "peer_bond"]);

  if (chapter.id === "first_world") {
    return [
      makeQuest("keep_growing", "survival", "在照护和身体变化中继续长大", "健康和日常节律决定你有多少精力认识世界。", [
        metric("health", "当前健康", health, 70, { unit: "/100", weight: 2 }),
        metric("quarters", "本年已经生活过", quarters, 4, { unit: "个季度" }),
        metric("rhythm", "活动与休息成长", healthyRhythm, 12, { unit: "点" }),
      ]),
      makeQuest("learn_the_world", "development", "用身体、声音和物件认识周围", "认知不是出生时决定的，而是从反复尝试中逐渐积累。", [
        metric("ability", "认知能力", ability, Math.max(8, 6 + age * 5), { unit: "/100", weight: 2 }),
        metric("exploration", "探索与动手成长", exploration, 18, { unit: "点" }),
        metric("exposures", "接触过的兴趣", exposedInterests, 3, { unit: "类" }),
      ]),
      makeQuest("wish_without_name", "aspiration", primaryDirection.score >= 12 ? `开始靠近“${primaryDirection.label}”` : "愿望还没有名字", "早期行为不是职业选择，但会让某些事物一次次吸引你。", [
        metric("direction", "最常出现的方向", primaryDirection.score, 45, { unit: "/100", weight: 2 }),
        metric("interest", "开始留下的兴趣", activeInterests, 2, { unit: "类" }),
      ]),
    ];
  }

  if (chapter.id === "school_and_home") {
    return [
      makeQuest("daily_balance", "survival", "在上学、家庭和休息之间过日子", "这一阶段首先要让学习与日常生活能够同时继续。", [
        metric("health", "当前健康", health, 68, { unit: "/100", weight: 2 }),
        metric("quarters", "本年已经生活过", quarters, 4, { unit: "个季度" }),
        metric("family", "家庭与同伴成长", familyGrowth, 20, { unit: "点" }),
      ]),
      makeQuest("build_a_way_to_learn", "development", "形成自己的学习与做事方式", "学校只是其中一部分，练习、求助、家务和动手经验都会进入成长。", [
        metric("ability", "认知能力", ability, 45, { unit: "/100", weight: 2 }),
        metric("school", "学校适应与探索", schoolGrowth, 30, { unit: "点" }),
        metric("exposures", "实际接触的兴趣", exposedInterests, 4, { unit: "类" }),
      ]),
      makeQuest("keep_a_liking", "aspiration", `让“${primaryDirection.label}”不只出现一次`, "喜欢的事情需要反复投入，才会成为以后仍能回到的道路。", [
        metric("direction", "当前人生方向", primaryDirection.score, 60, { unit: "/100", weight: 2 }),
        metric("interest", "形成中的兴趣", activeInterests, 2, { unit: "类" }),
      ]),
    ];
  }

  if (chapter.id === "choosing_a_direction") {
    return [
      makeQuest("finish_transition", "survival", "完成眼前的教育或生活过渡", "是否在校不是唯一答案，但必须形成一种真实可继续的日常。", [
        metric("health", "当前健康", health, 65, { unit: "/100" }),
        metric("active_path", "教育或劳动路径", currentStatus.active, 1, { boolean: true, weight: 2, trueLabel: currentStatus.studying ? "正在学习" : "已有劳动记录", falseLabel: "尚未形成" }),
        metric("quarters", "本年已经生活过", quarters, 4, { unit: "个季度" }),
      ]),
      makeQuest("prepare_for_adulthood", "development", "把能力变成成年入口前的准备", "功课、技能、家庭劳动和社会接触会通向不同入口。", [
        metric("ability", "认知能力", ability, 58, { unit: "/100", weight: 2 }),
        metric("growth", "学习、探索与独立成长", schoolGrowth + exploration, 54, { unit: "点" }),
        metric("people", "持续出现的同伴", socialPeople, 2, { unit: "人" }),
      ]),
      makeQuest("name_a_direction", "aspiration", `确认是否继续靠近“${primaryDirection.label}”`, "这不是终身职业宣言，而是此刻最有连续性的生活方向。", [
        metric("direction", "方向连续性", primaryDirection.score, 72, { unit: "/100", weight: 2 }),
        metric("interest", "仍在发展的兴趣", activeInterests, 2, { unit: "类" }),
      ]),
    ];
  }

  if (chapter.id === "entering_society") {
    return [
      makeQuest("independent_entry", "survival", "获得可以继续的社会生活入口", "求学、受训、就业或家庭经济活动都必须落成实际状态。", [
        metric("path", "教育或工作入口", currentStatus.active, 1, { boolean: true, weight: 2, trueLabel: currentStatus.studying ? "正在继续教育" : "已有实际工作", falseLabel: "仍在寻找入口" }),
        metric("income", "本年实际家庭收入", income > 0, 1, { boolean: true, trueLabel: "已有账本", falseLabel: "尚待结算" }),
        metric("health", "当前健康", health, 62, { unit: "/100" }),
      ]),
      makeQuest("turn_preparation_into_path", "development", "把学习或技能转化成下一条道路", "重要的不是抽象学历高低，而是现在能否继续学习、工作和改变。", [
        metric("ability", "认知能力", ability, 65, { unit: "/100", weight: 2 }),
        metric("job_years", "实际工作积累", jobYears, 2, { unit: "年" }),
        metric("contacts", "持续联系的人", socialPeople, 2, { unit: "人" }),
      ]),
      makeQuest("youth_direction", "aspiration", `决定愿意把青春投入“${primaryDirection.label}”到什么程度`, "个人愿望可以与谋生一致，也可能需要在工作之外保存。", [
        metric("direction", "方向连续性", primaryDirection.score, 78, { unit: "/100", weight: 2 }),
        metric("interest", "仍在发展的兴趣", activeInterests, 2, { unit: "类" }),
      ]),
    ];
  }

  if (chapter.id === "building_a_life") {
    return [
      makeQuest("hold_daily_life", "survival", "让工作、住处、健康和账本能够继续", "建立生活不是拥有某件标准答案，而是让现实安排经得住下一次变化。", [
        metric("work", "教育或工作状态", currentStatus.active, 1, { boolean: true, weight: 2, trueLabel: currentStatus.working ? "已有工作记录" : "正在继续教育", falseLabel: "当前没有稳定入口" }),
        metric("housing", "实际住处", housingKnown, 1, { boolean: true, trueLabel: "已有住房事实", falseLabel: "尚未形成" }),
        metric("health", "当前健康", health, 58, { unit: "/100" }),
        metric("income", "本年收入账本", income > 0, 1, { boolean: true, trueLabel: "已有结算", falseLabel: "尚待结算" }),
      ]),
      makeQuest("build_room_to_choose", "development", "给未来保留可以改变的余地", "职业经验、能力、现金缓冲和关系共同决定遇到变化时还有哪些路。", [
        metric("ability", "认知能力", ability, 72, { unit: "/100" }),
        metric("job_years", "实际工作积累", jobYears, 8, { unit: "年", weight: 2 }),
        metric("net_worth", "净资产不再为负", netWorth >= 0, 1, { boolean: true, trueLabel: "已有非负净资产", falseLabel: `当前${Math.round(netWorth)}元` }),
      ]),
      makeQuest("keep_personal_life", "aspiration", `别让“${primaryDirection.label}”完全被责任挤走`, "个人生活不一定带来收入，但会决定这段人生是否只剩义务。", [
        metric("direction", "方向连续性", primaryDirection.score, 82, { unit: "/100", weight: 2 }),
        metric("interest", "仍在发展的兴趣", activeInterests, 2, { unit: "类" }),
        metric("relationships", "关系状态", relationships, 65, { unit: "/100" }),
      ]),
    ];
  }

  if (chapter.id === "keeping_and_changing") {
    return [
      makeQuest("carry_responsibility", "survival", "应对工作、家庭和身体的变化", "这一阶段的压力来自实际责任，而不是预设的中年标签。", [
        metric("health", "当前健康", health, 52, { unit: "/100", weight: 2 }),
        metric("income", "本年收入账本", income > 0, 1, { boolean: true, trueLabel: "已有结算", falseLabel: "尚待结算" }),
        metric("housing", "实际住处", housingKnown, 1, { boolean: true, trueLabel: "已有住房事实", falseLabel: "尚未形成" }),
      ]),
      makeQuest("retain_change_capacity", "development", "保留重新选择的能力", "经验、健康、现金缓冲和持续学习决定转折时是否只能被动接受。", [
        metric("ability", "认知能力", ability, 78, { unit: "/100" }),
        metric("job_years", "实际工作积累", jobYears, 18, { unit: "年", weight: 2 }),
        metric("net_worth", "净资产不再为负", netWorth >= 0, 1, { boolean: true, trueLabel: "已有非负净资产", falseLabel: `当前${Math.round(netWorth)}元` }),
      ]),
      makeQuest("decide_what_to_keep", "aspiration", `决定后半生是否继续守住“${primaryDirection.label}”`, "守住、改变或放下都不是失败，但会留下不同的人生证据。", [
        metric("direction", "方向连续性", primaryDirection.score, 85, { unit: "/100", weight: 2 }),
        metric("interest", "仍在发展的兴趣", activeInterests, 2, { unit: "类" }),
        metric("people", "持续联系的人", socialPeople, 3, { unit: "人" }),
      ]),
    ];
  }

  return [
    makeQuest("later_daily_life", "survival", "安排身体、住处和每天的生活", "退休不等于人生自动结束，日常仍需要被具体安排。", [
      metric("health", "当前健康", health, 45, { unit: "/100", weight: 2 }),
      metric("housing", "实际住处", housingKnown, 1, { boolean: true, trueLabel: "已有住房事实", falseLabel: "尚未形成" }),
      metric("quarters", "本年已经生活过", quarters, 4, { unit: "个季度" }),
    ]),
    makeQuest("stay_connected", "development", "继续参与关系和身边生活", "经验只有继续被使用、讲述和分享，才会进入晚年生活。", [
      metric("relationships", "关系状态", relationships, 68, { unit: "/100", weight: 2 }),
      metric("people", "持续联系的人", socialPeople, 3, { unit: "人" }),
      metric("active_interest", "仍在发展的兴趣", activeInterests, 1, { unit: "类" }),
    ]),
    makeQuest("unfinished_wish", "aspiration", `看看“${primaryDirection.label}”还能留下什么`, "这条愿望可能变成日常、关系、传授，也可能只留下回忆。", [
      metric("direction", "一生方向的连续性", primaryDirection.score, 88, { unit: "/100", weight: 2 }),
      metric("interest", "仍在发展的兴趣", activeInterests, 1, { unit: "类" }),
    ]),
  ];
}

const TURNING_POINT_TEXT = {
  primary_school_assigned: "开始进入实际学校生活",
  primary_graduation_outcome: "小学阶段形成了明确结果",
  junior_graduation_outcome: "初中阶段形成了明确结果",
  senior_school_assigned: "进入高中或中职道路",
  senior_graduation_outcome: "高中阶段教育形成了结果",
  higher_education_graduation_outcome: "高等教育形成了结果",
  first_actual_work_started: "开始第一份实际工作",
  adult_job_started: "开始一段新的工作",
  partner_household_formed: "开始与伴侣共同生活",
  first_child_attempt_outcome: "家庭生育经历形成了结果",
  housing_choice_outcome: "住房安排发生重要变化",
  retirement_started: "结束全职工作并进入退休",
};

function chapterDirection(records) {
  const actions = uniqueQuarters(records).flatMap(({ quarter }) => quarter.activities ?? []);
  const scored = DIRECTIONS.map((direction) => {
    const matching = actions.filter((activity) => (
      (activity.interestTags ?? []).some((id) => direction.interestIds.includes(id))
      || direction.categories.includes(activity.category)
    ));
    const hours = matching.reduce((sum, activity) => sum + Number(activity.timeUseHoursPerWeek ?? 0), 0);
    return { direction, score: matching.length * 5 + hours, count: matching.length };
  }).sort((left, right) => right.score - left.score);
  return scored[0] ?? { direction: DIRECTIONS[0], score: 0, count: 0 };
}

function chapterReviews(result, records) {
  const age = currentAge(result);
  const birthYear = result.profile.person.birthYear;
  return CHAPTERS.filter((chapter) => age > chapter.maxAge && chapter.maxAge < 120)
    .map((chapter) => {
      const chapterRecords = records.filter(({ record }) => record.age >= chapter.minAge && record.age <= chapter.maxAge);
      const dominant = chapterDirection(chapterRecords);
      const facts = allFacts(chapterRecords);
      const turningPoints = facts
        .filter(({ fact }) => TURNING_POINT_TEXT[fact.type])
        .map(({ record, fact }) => ({
          year: record.calendarYear,
          text: TURNING_POINT_TEXT[fact.type],
        }))
        .filter((entry, index, entries) => entries.findIndex((candidate) => candidate.text === entry.text) === index)
        .slice(-2);
      const firstStats = chapterRecords.find(({ record }) => record.endState?.visibleStats)?.record.endState.visibleStats ?? {};
      const lastStats = [...chapterRecords].reverse().find(({ record }) => record.endState?.visibleStats)?.record.endState.visibleStats ?? {};
      const statChanges = Object.keys(lastStats).map((id) => ({
        id,
        label: STAT_LABELS[id] ?? id,
        delta: Number(lastStats[id] ?? 0) - Number(firstStats[id] ?? 0),
      })).sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta));
      const clearestChange = statChanges[0];
      const quarterCount = uniqueQuarters(chapterRecords).length;
      const activityCount = uniqueQuarters(chapterRecords)
        .reduce((sum, entry) => sum + (entry.quarter.activities?.length ?? 0), 0);
      const cashCost = uniqueQuarters(chapterRecords)
        .reduce((sum, entry) => sum + Number(entry.quarter.cashCostYuan ?? 0), 0);
      const evidence = [
        `${quarterCount}个季度留下记录，安排过${activityCount}项具体行动`,
        dominant.count > 0 ? `${dominant.count}项行动与“${dominant.direction.label}”有关` : "这一章主要由家庭和环境安排",
        clearestChange && clearestChange.delta !== 0
          ? `${clearestChange.label}${clearestChange.delta > 0 ? "提高" : "下降"}${Math.abs(Math.round(clearestChange.delta))}点`
          : "可见属性总体没有明显位移",
        cashCost > 0 ? `为主动安排实际支出约${Math.round(cashCost)}元` : "主动安排没有形成额外现金支出",
      ];
      return {
        id: chapter.id,
        label: chapter.label,
        question: chapter.question,
        startYear: birthYear + chapter.minAge,
        endYear: birthYear + chapter.maxAge,
        dominantDirectionId: dominant.direction.id,
        dominantDirectionLabel: dominant.direction.label,
        summary: dominant.count > 0
          ? `这一章里，你反复把时间给了“${dominant.direction.label}”。${turningPoints.at(-1)?.text ? `同时，${turningPoints.at(-1).text}。` : "它开始成为后续选择的一部分。"}`
          : "这一章的生活主要由年龄、家庭和环境推动，个人方向仍在形成。",
        evidence,
        turningPoints,
      };
    });
}

function endingMainlineReview(result, directions, chapters) {
  if (result.status !== "completed") return null;
  const year = currentYear(result);
  const interests = Object.values(result.currentState.interests ?? {});
  const kept = directions
    .filter((direction) => direction.score >= 45 && (direction.lastActiveYear ?? 0) >= year - 8)
    .slice(0, 3)
    .map((direction) => direction.label);
  const laidDown = interests
    .filter((interest) => (interest.totalHours ?? 0) >= 100 && (interest.score ?? 0) < 12 && (interest.lastActiveYear ?? year) < year - 8)
    .sort((left, right) => (right.totalHours ?? 0) - (left.totalHours ?? 0))
    .slice(0, 3)
    .map((interest) => interest.label);
  const primary = directions[0];
  return {
    title: `这一生反复走向“${primary.label}”`,
    became: primary.description,
    kept: kept.length > 0 ? kept : [primary.label],
    laidDown,
    chapterCount: chapters.length,
    summary: `你走过${chapters.length}个人生章节。没有单一分数判断它是否成功；行动、关系和现实结果共同说明你成为了怎样的人。`,
  };
}

export function buildLifeMainline(result) {
  const age = currentAge(result);
  const year = currentYear(result);
  const records = allRecords(result);
  const chapter = currentChapterForAge(age);
  const directions = directionScores(result, records);
  const primaryDirection = directions[0];
  const quests = currentQuestSet(result, chapter, directions);
  const chapters = chapterReviews(result, records);
  const chapterYears = chapter.maxAge >= 120 ? null : chapter.maxAge - chapter.minAge + 1;
  const currentYearInChapter = Math.max(1, age - chapter.minAge + 1);
  const youthPayoffReview = age >= 18
    ? youthMainlinePayoffReview(result.currentState)
    : null;
  return {
    theme: "在时代和现实条件中，逐渐成为一个具体的人",
    age,
    year,
    chapter: {
      ...clone(chapter),
      currentYear: currentYearInChapter,
      totalYears: chapterYears,
      progress: chapterYears == null ? null : Math.round(clamp(currentYearInChapter / chapterYears * 100)),
    },
    directionStatus: age < 3 && primaryDirection.score < 12
      ? "方向尚未形成；每一次靠近和回避都在留下痕迹"
      : `目前最有连续性的方向：${primaryDirection.label} · ${primaryDirection.levelLabel}`,
    primaryDirection,
    directions,
    quests,
    completedChapters: chapters,
    youthPayoffReview,
    ending: endingMainlineReview(result, directions, chapters),
  };
}

export function mainlineLinksForOption(option, mainline) {
  if (!option || option.isPlanControl || !mainline) return [];
  const links = [];
  const category = option.category;
  const statChanges = option.statChanges ?? {};
  const interests = option.interestTags ?? [];
  const primary = mainline.primaryDirection;
  const survival = mainline.quests.find((quest) => quest.type === "survival");
  const development = mainline.quests.find((quest) => quest.type === "development");
  const aspiration = mainline.quests.find((quest) => quest.type === "aspiration");
  if (
    (statChanges.health ?? 0) > 0
    || ["health", "finance"].includes(category)
    || (category === "family" && (statChanges.relationships ?? 0) > 0)
  ) {
    links.push({ type: "survival", label: `推进：${survival.title}` });
  }
  if (
    (statChanges.ability ?? 0) > 0
    || ["learning", "work", "exploration"].includes(category)
  ) {
    links.push({ type: "development", label: `推进：${development.title}` });
  }
  if (
    interests.some((id) => primary.interestIds.includes(id))
    || primary.categories.includes(category)
  ) {
    links.push({ type: "aspiration", label: `靠近：${primary.label}` });
  }
  if (links.length === 0 && interests.length > 0) {
    links.push({ type: "aspiration", label: "探索另一种可能的人生方向" });
  }
  return links.slice(0, 2);
}

export function lifeMainlineTimelineEntries(mainline) {
  const chapters = (mainline?.completedChapters ?? []).map((chapter) => ({
    year: chapter.endYear,
    age: CHAPTERS.find((entry) => entry.id === chapter.id).maxAge,
    stage: "mainline",
    stageLabel: "人生主线",
    text: `${chapter.label}结束：${chapter.summary}`,
    mainline: true,
  }));
  const review = mainline?.youthPayoffReview;
  if (!review) return chapters;
  const last = review.chain.at(-1);
  return [...chapters, {
    year: (last?.calendarYear ?? mainline.year) + 1,
    age: 18,
    stage: "mainline",
    stageLabel: "人生主线",
    text: `0—18岁经历复盘：${review.summary}`,
    mainline: true,
  }];
}

export { CHAPTERS, DIRECTIONS, QUEST_TYPE_LABELS };
