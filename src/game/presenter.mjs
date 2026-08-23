import { childhoodGrowthView } from "../simulation/childhood-play-system.mjs";
import { buildCharacterVisualView } from "./character-visual-presenter.mjs";
import {
  buildLifeMainline,
  mainlineLinksForOption,
} from "../simulation/life-mainline-system.mjs";

function clone(value) {
  return structuredClone(value);
}

const STAGE_LABELS = {
  childhood: "童年",
  primary: "小学阶段",
  adolescence: "青少年",
  youth: "升学与初职",
  adult: "成年人生",
};

const STAT_LABELS = {
  health: "健康",
  fitness: "体能",
  intelligence: "智力",
  appearance: "外表",
  social: "社交",
  willpower: "意志",
  wealth: "财富",
  mood: "心情",
  ability: "认知能力",
  relationships: "关系",
};

const ARCHETYPE_TEXT = {
  early_childhood_death: ["很短的一段人生", "生命在幼年因未能细分诊断的健康事件结束。档案仍保留出生家庭与经历。"],
  unfinished_journey: ["未走完的旅程", "人生在六十岁以前结束，但已经发生的学习、工作和关系都留在时间线上。"],
  skill_became_lifelong_work: ["把本事做成了一生的工作", "多年的学习、换岗与职责积累，让能力真正进入了职业轨迹。"],
  a_long_road_with_company: ["有人同行的长路", "重要关系经受了时间、工作和家庭事务，陪你走过人生的大部分路。"],
  unhurried_and_resourced: ["从容而有余地", "长期收入、储蓄与生活节奏共同留下了较宽的选择空间。"],
  busy_years_quiet_room: ["忙碌之后的安静房间", "职业和资产留下了痕迹，关系与心情却承受了另一部分代价。"],
  ordinary_complete_life: ["平常而完整的一生", "没有单一指标定义这段人生；学习、劳动、家庭、住房和晚年共同组成了它。"],
};

const EDUCATION_LABELS = {
  none: "尚未完成学校教育",
  primary: "小学",
  junior_secondary: "初中",
  academic_senior: "普通高中",
  academic_senior_secondary: "普通高中",
  vocational_secondary: "中等职业教育",
  regular_higher_education: "普通高等教育",
};

const HOUSING_LABELS = {
  private_rental: "市场租住",
  public_rental: "公房租住",
  employer_provided: "单位提供住房",
  owner_occupied: "自有住房",
  owner_occupied_mortgaged_home: "有按揭的自有住房",
  owner_occupied_debt_free_home: "已还清贷款的自有住房",
  rural_family_housing: "农村家庭住房",
  family_house_on_collective_land: "集体土地上的家庭住房",
  family_housing: "使用家庭住房",
  living_with_origin_family: "与原生家庭共同居住",
  independent_rental_after_migration: "迁移后独立租住",
  independent_rental_after_purchase_shortfall: "购房资金不足后继续租住",
};

const HOUSING_RESULT_LABELS = {
  continued_or_started_private_rental: "继续或开始市场租住",
  family_housing_used: "继续使用家庭住房",
  home_purchased_with_mortgage: "支付首付并以按揭购房",
  purchase_not_completed: "可用现金不足，购房没有完成",
};

const RELATIONSHIP_LABELS = {
  single: "目前单身",
  single_by_current_choice: "目前保持独立生活",
  partnered: "与伴侣共同生活",
  separated: "共同生活关系已结束",
  widowed: "伴侣已经去世",
};

const UNIT_TYPE_LABELS = {
  family_operation: "家庭经营",
  people_commune_collective: "人民公社集体",
  household_operation_on_collective_land: "集体土地上的家庭经营",
  township_collective_enterprise: "乡镇集体企业",
  state_owned_unit: "国有单位",
  urban_collective_unit: "城镇集体单位",
  private_enterprise: "私营企业",
  foreign_invested_enterprise: "外商投资企业",
  individual_business: "个体经营",
  public_institution: "事业单位",
  collective_construction_team: "集体施工队",
  collective_service_unit: "集体服务单位",
};

const POSITION_LEVEL_LABELS = {
  entry: "入门岗位",
  experienced: "熟练岗位",
  senior_or_supervisory: "资深或带班岗位",
};

const CHILD_LIFE_STAGE_LABELS = {
  infancy: "婴幼儿阶段",
  early_childhood: "学龄前阶段",
  primary_school_age: "小学年龄阶段",
  junior_secondary_age: "初中年龄阶段",
  senior_secondary_age: "高中阶段年龄",
  youth_transition: "升学与走向独立的阶段",
  adult_independent_life: "已经进入成年生活",
};

const FAMILY_RELATION_LABELS = {
  mother: "母亲",
  father: "父亲",
  older_sibling: "年长手足",
  maternal_grandmother: "外祖母",
  paternal_grandmother: "祖母",
  maternal_grandfather: "外祖父",
  paternal_grandfather: "祖父",
};

const OPTION_CONFIG_KEYS = [
  "childhoodEvents",
  "primaryEvents",
  "adolescenceEvents",
  "youthEvents",
  "adultEvents",
];

const ERA_LABELS = {
  reform_opening_start: "改革开放进入新的历史时期",
  compulsory_education_law: "《义务教育法》开始实施",
  labor_law_effective: "《劳动法》开始实施",
  vocational_education_law_effective: "职业教育制度进入新的法律阶段",
  state_enterprise_layoff_and_reemployment: "国有和集体单位就业调整加深",
  higher_education_expansion: "普通高等教育扩招",
  higher_education_expansion_observed: "普通高等教育扩招",
  china_wto_accession: "中国加入世界贸易组织",
  china_joins_wto: "中国加入世界贸易组织",
  employment_and_reemployment_policy: "就业和再就业政策继续调整",
  urban_housing_monetization: "城镇住房制度改革推进",
  housing_provident_fund_regulation: "住房公积金制度进一步规范",
  labor_contract_law_effective: "《劳动合同法》开始实施",
  revised_compulsory_education_law: "修订后的《义务教育法》开始实施",
  urban_compulsory_education_fees_removed: "城市义务教育阶段学杂费政策发生变化",
  gradual_retirement_reform_effective: "渐进式延迟法定退休年龄开始实施",
  state_unit_restructuring_1998_2002: "国有和集体单位岗位调整期",
  market_employment_shock_2008: "2008年市场岗位环境波动",
  contact_service_disruption_2020: "2020年接触型服务岗位受到冲击",
};

function eraList(ids = []) {
  return ids.map((id) => ERA_LABELS[id] ?? id).join("、");
}

function globalEraFacts(data, year) {
  const period = (data.timeline?.eraPeriods ?? [])
    .find((entry) => year >= entry.startYear && year <= entry.endYear);
  const milestones = (data.timeline?.policyMilestones ?? [])
    .filter((milestone) => milestone.year === year);
  const facts = [];
  if (period) facts.push(`时代环境：${period.label}。${period.description}`);
  if (milestones.length > 0) {
    facts.push(`时代节点：${eraList(milestones.map((milestone) => milestone.id))}。`);
  }
  return facts;
}

export function formatCurrency(value) {
  if (!Number.isFinite(value)) return "未知";
  return `${Math.round(value).toLocaleString("zh-CN")}元`;
}

export function buildOptionIndex(data) {
  const index = new Map();
  for (const band of data.annualOperations?.bands ?? []) {
    for (const option of band.options ?? []) {
      index.set(option.id, option.label ?? option.id);
    }
  }
  for (const key of OPTION_CONFIG_KEYS) {
    for (const event of data[key]?.events ?? []) {
      for (const option of event.options) {
        index.set(option.id, option.label ?? option.text ?? option.id);
      }
    }
  }
  for (const ageOptions of Object.values(data.quarterlyLife?.infantReactions ?? {})) {
    for (const option of ageOptions) index.set(option.id, option.label ?? option.id);
  }
  for (const option of data.quarterlyLife?.eraLeisure ?? []) {
    index.set(option.id, option.label ?? option.id);
  }
  for (const pool of data.childhoodPlay?.activityPools ?? []) {
    for (const option of pool.options ?? []) index.set(option.id, option.label ?? option.id);
  }
  for (const event of data.quarterlyLife?.randomEvents ?? []) {
    for (const option of event.options ?? []) index.set(option.id, option.label ?? option.id);
  }
  return index;
}

function statValues(state) {
  if (state.characterModel?.attributes) {
    return ["health", "fitness", "intelligence", "appearance", "social", "willpower"]
      .map((id) => ({
        id,
        label: STAT_LABELS[id],
        value: state.characterModel.attributes[id],
        basis: "终身统一的0～100绝对数值，不进行年龄校准",
        progress: state.characterModel.progress?.[id] ?? 0,
      }));
  }
  return Object.entries(state.visibleStats).map(([id, entry]) => ({
    id,
    label: STAT_LABELS[id] ?? id,
    value: entry.value,
    basis: entry.basis,
  }));
}

function characterStateValues(state) {
  const modelState = state.characterModel?.state ?? {};
  const illnessCount = modelState.illnessIds?.length ?? 0;
  const injuryCount = modelState.injuryIds?.length ?? 0;
  return [
    { id: "mood", label: "心情", value: Math.round(modelState.mood ?? 50), max: 100, tone: "positive" },
    { id: "stress", label: "压力", value: Math.round(modelState.stress ?? 0), max: 100, tone: "warning" },
    { id: "fatigue", label: "疲劳", value: Math.round(modelState.fatigue ?? 0), max: 100, tone: "warning" },
    { id: "condition", label: "身体状态", value: illnessCount + injuryCount, max: null, tone: illnessCount + injuryCount > 0 ? "danger" : "positive", text: illnessCount + injuryCount > 0 ? `${illnessCount}项疾病 · ${injuryCount}项伤势` : "没有疾病或伤势" },
  ];
}

function optionMeta(option) {
  const parts = [];
  if (option.categoryLabel) parts.push(option.categoryLabel);
  if (option.repetitionLabel) parts.push(option.repetitionLabel);
  if (Number.isFinite(option.timeSlots)) parts.push(`${option.timeSlots}格时间`);
  if (Number.isFinite(option.energyCost)) parts.push(`${option.energyCost}点精力`);
  if (Number.isFinite(option.recoveryEnergy) && option.recoveryEnergy > 0) {
    parts.push(`可恢复${option.recoveryEnergy}点精力`);
  }
  if (Number.isFinite(option.timeUseHoursPerWeek)) {
    parts.push(`每周约${option.timeUseHoursPerWeek}小时`);
  }
  if (Number.isFinite(option.cashCostYuan) && option.cashCostYuan > 0) {
    parts.push(`预计支出${formatCurrency(option.cashCostYuan)}`);
  }
  if (option.unavailableReason) parts.push(`当前不可执行：${option.unavailableReason}`);
  if (option.effectSummary) parts.push(option.effectSummary);
  if (Number.isFinite(option.planImpact?.executionRate) && option.planImpact.executionRate < 1) {
    parts.push(`事件发生后原计划预计完成${Math.round(option.planImpact.executionRate * 100)}%`);
  }
  if (option.unitType) parts.push(`单位：${UNIT_TYPE_LABELS[option.unitType] ?? option.unitType}`);
  if (Number.isFinite(option.weeklyHours)) parts.push(`每周${option.weeklyHours}小时`);
  const income = option.personalIncomeThisYearYuan
    ?? option.personalCashIncomeThisYearYuan;
  if (Number.isFinite(income)) parts.push(`本年约${formatCurrency(income)}`);
  return parts;
}

function roundedDelta(value) {
  return Math.round(value * 100) / 100;
}

function actionEffectView(option, data, mainline) {
  const interestDomains = data.quarterlyLife?.interestDomains ?? {};
  const growthPaths = data.childhoodPlay?.growthPaths ?? {};
  const tagCount = Math.max(1, option.interestTags?.length ?? 0);
  const estimatedInterestGain = Math.max(
    1,
    Math.round((option.timeUseHoursPerWeek ?? 2) * 1.5 / tagCount),
  );
  return {
    stats: Object.entries(option.statChanges ?? {}).map(([id, value]) => ({
      id,
      label: STAT_LABELS[id] ?? id,
      delta: roundedDelta(value / 4),
    })),
    interests: (option.interestTags ?? []).map((id) => ({
      id,
      label: interestDomains[id] ?? id,
      delta: estimatedInterestGain,
    })),
    growth: Object.entries(option.growthChanges ?? {}).map(([id, value]) => ({
      id,
      label: growthPaths[id]?.label ?? id,
      delta: value,
    })),
    requirements: Object.entries(option.requiresGrowth ?? {}).map(([id, value]) => ({
      id,
      label: growthPaths[id]?.label ?? id,
      value,
    })),
    gains: clone(option.gains ?? []),
    costs: clone(option.costs ?? []),
    mainline: mainlineLinksForOption(option, mainline),
  };
}

function latestRecord(result) {
  return result.currentState.annualRecords.at(-1) ?? null;
}

function educationSituation(result) {
  const state = result.currentState;
  if (result.stage === "childhood") {
    return result.currentState.currentAge < 6 ? "尚未入学" : "正在准备入学";
  }
  if (result.stage === "primary") {
    const education = state.education;
    if (education.status === "enrolled_primary") return `小学${education.currentGrade}年级`;
    return education.completedGrades > 0
      ? `已完成小学${education.completedGrades}个年级`
      : "本年尚未入学";
  }
  if (result.stage === "adolescence") {
    const junior = state.education.junior;
    return state.path === "junior_student"
      ? `初中${junior.currentGrade}年级`
      : `${EDUCATION_LABELS[state.education.primaryEnding?.highestCompletedEducation] ?? "已离开学校"}后的非在校阶段`;
  }
  if (result.stage === "youth") {
    if (state.education.senior?.status === "enrolled") {
      const track = state.education.senior.track === "academic_senior" ? "普通高中" : "中等职业教育";
      return `${track}${state.education.senior.currentGrade}年级`;
    }
    return EDUCATION_LABELS[state.education.highestCompleted] ?? state.education.highestCompleted;
  }
  if (state.education.higher?.status === "enrolled") {
    const level = state.education.higher.level === "undergraduate" ? "本科" : "专科";
    return `${level}第${state.education.higher.currentYear}年`;
  }
  return EDUCATION_LABELS[state.education.highestCompleted] ?? state.education.highestCompleted;
}

function employmentSituation(result) {
  const state = result.currentState;
  if (!["youth", "adult"].includes(result.stage)) return "未到正式就业阶段";
  const employment = state.employment;
  if (employment.status === "retired") return "已结束全职工作并退休";
  if (employment.currentJob) {
    const job = employment.currentJob;
    return `${job.label ?? job.occupation} · ${POSITION_LEVEL_LABELS[job.positionLevel] ?? "当前岗位"} · 每周${job.weeklyHours}小时`;
  }
  if (employment.status === "unemployed_searching") return "目前没有工作，正在寻找具体岗位";
  if (state.education?.higher?.status === "enrolled") return "目前以高等教育学习为主";
  return "尚未形成第一份实际工作";
}

function familySituation(result) {
  const state = result.currentState;
  if (result.stage !== "adult") {
    return `共同生活${state.household.members.length}人`;
  }
  const relationship = RELATIONSHIP_LABELS[state.family.relationshipStatus]
    ?? state.family.relationshipStatus;
  return state.family.child ? `${relationship} · 有1个孩子` : `${relationship} · 没有孩子记录`;
}

function housingSituation(result) {
  const state = result.currentState;
  const housing = result.stage === "adult" ? state.housing : state.household.housing;
  return HOUSING_LABELS[housing.arrangement]
    ?? HOUSING_LABELS[housing.tenure]
    ?? housing.tenure
    ?? "住房事实未知";
}

function financeSituation(result) {
  const state = result.currentState;
  if (result.stage === "adult") {
    const finance = state.finance.lastAnnualRecord;
    return finance
      ? `最近结算收入${formatCurrency(finance.annualHouseholdCashIncomeYuan)} · 支出${formatCurrency(finance.annualTotalExpenseYuan)} · 净资产${formatCurrency(finance.endingNetWorthYuan)}`
      : `当前可确认净资产${formatCurrency(state.finance.netWorthYuan)}`;
  }
  const finance = state.household.finance;
  return `本年家庭收入${formatCurrency(finance.annualHouseholdIncomeYuan)}`;
}

function currentSituation(result) {
  return [
    { id: "education", label: "教育", value: educationSituation(result) },
    { id: "employment", label: "工作", value: employmentSituation(result) },
    { id: "family", label: "家庭", value: familySituation(result) },
    { id: "housing", label: "住房", value: housingSituation(result) },
    { id: "finance", label: "账本", value: financeSituation(result) },
  ];
}

function factOf(record, type) {
  return record?.facts.find((fact) => fact.type === type) ?? null;
}

function currentYearLedger(result) {
  const record = latestRecord(result);
  if (!record) return [];
  const annual = factOf(record, "annual_operation");
  const operationExpense = factOf(record, "annual_operation_cash_expense");
  const job = factOf(record, "adult_job_year")
    ?? factOf(record, "first_actual_work_started")
    ?? factOf(record, "adult_job_started");
  const school = factOf(record, "higher_education_year")
    ?? factOf(record, "senior_school_year_attendance_and_learning")
    ?? factOf(record, "junior_school_year_attendance_and_learning")
    ?? factOf(record, "primary_school_year_attendance_and_learning");
  const adultFinance = factOf(record, "adult_household_finance");
  const householdFinance = factOf(record, "youth_household_finance_settled")
    ?? factOf(record, "adolescence_household_finance_settled")
    ?? factOf(record, "primary_household_finance_settled")
    ?? factOf(record, "household_finance_settled");
  const partner = factOf(record, "partner_relationship_year");
  const child = factOf(record, "child_year");
  const parents = factOf(record, "origin_family_support_year");
  const completedQuarters = record.quarterRecords ?? [];
  const latestQuarter = completedQuarters.at(-1);

  let workStudy = "本年尚未形成学习或工作结算";
  if (job) {
    workStudy = `${job.jobLabel ?? job.label ?? job.occupation} · ${job.workMonths ?? job.workMonthsThisYear ?? 0}个月 · 每周${job.weeklyHours}小时`;
  } else if (school) {
    const hours = school.studyHoursPerWeek ?? school.classHoursPerWeek
      ?? school.practiceHoursPerWeek;
    workStudy = `${school.attendedDays != null ? `实际到校${school.attendedDays}天` : `学习进展${school.learningProgressScore}/100`}${hours != null ? ` · 每周投入${hours}小时` : ""}`;
  }

  const familyParts = [];
  if (partner) familyParts.push(`伴侣相处每周${partner.relationshipHoursPerWeek}小时，关系记录${partner.qualityAfter}/100`);
  if (child) familyParts.push(`与${child.childAge}岁孩子每周相处${child.playerInteractionHoursPerWeek}小时`);
  if (parents) familyParts.push(`父母照护安排每周${parents.familyCareHoursPerWeek}小时`);
  if (familyParts.length === 0) {
    familyParts.push(result.stage === "adult"
      ? (RELATIONSHIP_LABELS[result.currentState.family.relationshipStatus] ?? "本年没有新的家庭事件")
      : `共同生活${result.currentState.household.members.length}人`);
  }

  let money = "本年现金账尚未结算";
  if (adultFinance) {
    money = `收入${formatCurrency(adultFinance.annualHouseholdCashIncomeYuan)} · 支出${formatCurrency(adultFinance.annualTotalExpenseYuan)} · 年末净资产${formatCurrency(adultFinance.endingNetWorthYuan)}`;
  } else if (householdFinance) {
    money = `家庭收入${formatCurrency(householdFinance.annualHouseholdIncomeYuan)}`;
    if (operationExpense) money += ` · 本行动支出${formatCurrency(operationExpense.amountYuan)}`;
  }

  return [
    {
      id: "time",
      label: "主要时间安排",
      value: annual
        ? `${annual.label} · 全年平均每周约${annual.timeUseHoursPerWeek}小时`
        : (latestQuarter
            ? `${latestQuarter.label}：${latestQuarter.operationLabel} · 每周安排${latestQuarter.timeUseHoursPerWeek}小时，另有${latestQuarter.unallocatedHoursPerWeek ?? 0}小时留给普通生活`
            : "等待安排第一季度"),
    },
    { id: "work_study", label: "学习与工作", value: workStudy },
    { id: "family", label: "关系与照护", value: familyParts.join("；") },
    { id: "money", label: "现金与资产", value: money },
  ];
}

function currentInterests(result) {
  return Object.values(result.currentState.interests ?? {})
    .filter((interest) => interest.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 6)
    .map((interest) => ({
      id: interest.id,
      label: interest.label,
      score: interest.score,
      stageId: interest.stageId,
      stageLabel: {
        exposure: "偶尔接触",
        emerging: "兴趣萌芽",
        hobby: "稳定爱好",
        lasting: "长期爱好",
      }[interest.stageId] ?? "尚未形成",
      totalHours: Math.round(interest.totalHours ?? 0),
      lastActivityLabel: interest.lastActivityLabel ?? null,
    }));
}

function currentPeople(result) {
  const state = result.currentState;
  const people = [];
  if (result.stage !== "adult" && state.household?.members) {
    for (const member of state.household.members
      .filter((entry) => entry.relation !== "self" && FAMILY_RELATION_LABELS[entry.relation])
      .slice(0, 6)) {
      const age = (member.ageAtBirth ?? 0) + Math.max(0, state.currentAge ?? 0);
      people.push({
        id: member.id,
        name: FAMILY_RELATION_LABELS[member.relation],
        role: ["mother", "father"].includes(member.relation) ? "原生家庭" : "共同生活的家人",
        detail: `${age}岁 · ${member.job?.occupationLabel ? `从事${member.job.occupationLabel}` : "与家庭共同生活"}`,
        fictional: true,
      });
    }
  }
  if (result.stage === "adult" && state.family.partner) {
    people.push({
      id: state.family.partner.id,
      name: "共同生活的伴侣",
      role: state.family.partner.job?.label ?? state.family.partner.job?.occupation ?? "伴侣",
      detail: state.family.relationshipQuality == null
        ? "关系质量尚未形成记录"
        : `共同生活关系仍在延续，关系记录${state.family.relationshipQuality}/100`,
      fictional: true,
    });
  }
  if (result.stage === "adult" && state.family.child) {
    const child = state.family.child;
    const currentYear = state.birthYear + state.currentAge;
    const childAge = Math.max(0, currentYear - child.birthYear);
    people.push({
      id: child.id,
      name: child.sex === "female" ? "女儿" : "儿子",
      role: "孩子",
      detail: `${childAge}岁 · ${CHILD_LIFE_STAGE_LABELS[child.currentLifeStage] ?? "成长中"} · 关系记录${child.relationshipWithPlayer ?? 60}/100`,
      fictional: true,
    });
  }
  if (result.stage === "adult") {
    const currentYear = state.birthYear + state.currentAge;
    for (const parent of state.family.originMembers
      .filter((member) => member.alive && FAMILY_RELATION_LABELS[member.relation])
      .slice(0, 2)) {
      const parentAge = currentYear - parent.birthYear;
      people.push({
        id: parent.id,
        name: FAMILY_RELATION_LABELS[parent.relation],
        role: "原生家庭",
        detail: `${parentAge}岁 · ${parentAge >= 65 ? "进入年长阶段" : "仍在自己的生活阶段"}`,
        fictional: true,
      });
    }
  }
  for (const person of [...(state.socialNetwork ?? [])]
    .filter((entry) => entry.active)
    .sort((left, right) => right.closeness - left.closeness)
    .slice(0, 4)) {
    people.push({
      id: person.id,
      name: person.displayName,
      role: person.roleLabel,
      detail: [
        `认识${Math.max(1, (state.birthYear + state.currentAge) - person.metYear + 1)}年`,
        person.temperament,
        Number.isFinite(person.trust) ? `熟悉${Math.round(person.familiarity ?? person.closeness)}/100 · 信任${Math.round(person.trust)}/100` : `关系记录${Math.round(person.closeness)}/100`,
        person.sharedMemories?.at(-1)?.title ? `最近共同经历：${person.sharedMemories.at(-1).title}` : `最近联系${person.lastContactYear}年`,
      ].filter(Boolean).join(" · "),
      fictional: person.fictional,
    });
  }
  return people;
}

function latestQuarterExperience(record) {
  const quarter = [...(record?.quarterRecords ?? [])]
    .reverse()
    .find((entry) => entry.activityResults?.length > 0);
  if (!quarter) return null;
  return {
    quarter: quarter.quarter,
    label: quarter.label,
    age: record.age,
    calendarYear: record.calendarYear,
    source: quarter.source,
    results: quarter.activityResults.map((result) => ({
      id: result.id,
      activityLabel: result.activityLabel,
      categoryLabel: result.categoryLabel,
      setting: result.setting,
      actorName: result.actor.name,
      actorRoleLabel: result.actor.roleLabel,
      process: result.process,
      response: result.response,
      outcome: result.outcome,
      plannedHours: result.plannedHours,
      actualHours: result.actualHours,
      completionLabel: result.completionLabel,
      growthChanges: clone(result.appliedGrowthChanges ?? {}),
    })),
    randomEvents: (quarter.randomEventResults ?? []).map((event) => ({
      ...clone(event),
      stats: Object.entries(event.statChanges ?? {}).map(([id, delta]) => ({
        id,
        label: STAT_LABELS[id] ?? id,
        delta,
      })),
    })),
    milestones: clone(quarter.growthMilestones ?? []),
  };
}

function latestQuarterOutcome(record, data, mainline) {
  const quarter = record?.quarterRecords?.at(-1);
  if (!quarter) return null;
  return quarterOutcomeView(quarter, data, mainline);
}

function latestQuarterOutcomeAcrossLife(result, data, mainline) {
  const records = Object.values(result.stages)
    .flatMap((stage) => stage.annualRecords ?? [])
    .sort((left, right) => left.calendarYear - right.calendarYear);
  for (const record of records.reverse()) {
    const outcome = latestQuarterOutcome(record, data, mainline);
    if (outcome) return outcome;
  }
  return null;
}

function quarterOutcomeView(quarter, data, mainline) {
  const interestDomains = data.quarterlyLife?.interestDomains ?? {};
  const growthPaths = data.childhoodPlay?.growthPaths ?? {};
  return {
    quarter: quarter.quarter,
    label: quarter.label,
    operationLabel: quarter.operationLabel,
    detail: `${quarter.activities?.length ?? 0}项行动 · 实际${quarter.timeSlotsUsed ?? 0}/${quarter.plannedTimeSlots ?? quarter.timeSlotsUsed ?? 0}格 · ${quarter.energySpent ?? 0}点精力 · ${quarter.monthTicks?.length ?? 0}个月已执行${quarter.executionRate < 1 ? ` · 完成${Math.round(quarter.executionRate * 100)}%` : ""}`,
    activities: clone(quarter.activities ?? []),
    monthTicks: clone(quarter.monthTicks ?? []),
    obligations: clone(quarter.quarterBudget?.obligations ?? []),
    interruption: clone(quarter.planInterruption ?? null),
    randomEvents: (quarter.randomEventResults ?? []).map((event) => ({
      ...clone(event),
      stats: Object.entries(event.statChanges ?? {}).map(([id, delta]) => ({
        id,
        label: STAT_LABELS[id] ?? id,
        delta,
      })),
    })),
    executionRate: quarter.executionRate ?? 1,
    recoveryEnergy: quarter.monthSimulation?.recoveryEnergy ?? 0,
    energyRemaining: quarter.energyRemaining ?? 0,
    overdraftEnergy: quarter.overdraftEnergy ?? 0,
    stats: Object.entries(quarter.statChanges ?? {}).map(([id, delta]) => ({
      id,
      label: STAT_LABELS[id] ?? id,
      delta: roundedDelta(delta),
    })),
    statProgress: Object.entries(quarter.statProgress ?? {}).map(([id, delta]) => ({
      id,
      label: STAT_LABELS[id] ?? id,
      delta: roundedDelta(delta),
    })),
    interests: Object.entries(quarter.interestChanges ?? {}).map(([id, delta]) => ({
      id,
      label: interestDomains[id] ?? id,
      delta,
    })),
    growth: Object.entries(quarter.growthChanges ?? {}).map(([id, delta]) => ({
      id,
      label: growthPaths[id]?.label ?? id,
      delta,
    })),
    milestones: clone(quarter.growthMilestones ?? []),
    mainline: [...new Map((quarter.activities ?? [])
      .flatMap((activity) => mainlineLinksForOption(activity, mainline))
      .map((entry) => [`${entry.type}:${entry.label}`, entry])).values()],
  };
}

function quarterOutcomeViews(record, data, mainline) {
  return (record?.quarterRecords ?? []).map((quarter) => quarterOutcomeView(quarter, data, mainline));
}

function factLine(fact) {
  const handlers = {
    year_context: () => "家庭、健康与当年生活条件已完成结算。",
    household_finance_settled: () => `家庭本年收入 ${formatCurrency(fact.annualHouseholdIncomeYuan)}。`,
    primary_household_finance_settled: () => `家庭本年收入 ${formatCurrency(fact.annualHouseholdIncomeYuan)}。`,
    adolescence_household_finance_settled: () => `家庭本年收入 ${formatCurrency(fact.annualHouseholdIncomeYuan)}。`,
    youth_household_finance_settled: () => `家庭本年总收入 ${formatCurrency(fact.annualHouseholdIncomeYuan)}。`,
    adult_household_finance: () => `家庭现金收入 ${formatCurrency(fact.annualHouseholdCashIncomeYuan)}，支出 ${formatCurrency(fact.annualTotalExpenseYuan)}，年末净资产 ${formatCurrency(fact.endingNetWorthYuan)}。`,
    child_illness_year_summary: () => `本年有 ${fact.episodeCount ?? fact.symptomEpisodeCount ?? 0} 次健康不适记录。`,
    adult_health_year_summary: () => fact.chronicHealthEventOccurred
      ? "本年发生一次没有伪造具体诊断的慢性健康事件。"
      : `本年记录 ${fact.symptomDays} 个症状日。`,
    primary_school_year_attendance_and_learning: () => `本年实际到校 ${fact.attendedDays} 天，学习进展 ${fact.learningProgressScore}/100。`,
    junior_school_year_attendance_and_learning: () => `本年实际到校 ${fact.attendedDays} 天，学习进展 ${fact.learningProgressScore}/100。`,
    senior_school_year_attendance_and_learning: () => `本年实际到校 ${fact.attendedDays} 天，学习或实训进展 ${fact.learningProgressScore}/100。`,
    higher_education_year: () => `高等教育第 ${fact.yearOfStudy} 年，学习进展 ${fact.learningProgressScore}/100，现金支出 ${formatCurrency(fact.educationCashExpenseYuan)}。`,
    adult_job_year: () => `${fact.jobLabel ?? fact.label ?? fact.occupation}：本年工作 ${fact.workMonths} 个月，每周 ${fact.weeklyHours} 小时，收入 ${formatCurrency(fact.personalIncomeThisYearYuan)}。`,
    first_actual_work_started: () => `开始从事${fact.label ?? fact.occupation}，单位性质为${UNIT_TYPE_LABELS[fact.unitType] ?? fact.unitType}，每周${fact.weeklyHours}小时。`,
    adult_job_started: () => `开始新的${fact.label ?? fact.occupation}工作，单位性质为${UNIT_TYPE_LABELS[fact.unitType] ?? fact.unitType}。`,
    partner_household_formed: () => `开始与伴侣共同生活；对方从事${fact.partnerJob.label ?? fact.partnerJob.occupation}。`,
    first_child_attempt_outcome: () => fact.childBorn ? "家庭迎来一个孩子。" : "这次生育尝试没有迎来孩子。",
    housing_choice_outcome: () => `住房选择结果：${HOUSING_RESULT_LABELS[fact.result] ?? fact.result}。`,
    retirement_started: () => `本年 ${fact.retirementAge} 岁，结束全职工作并进入退休。`,
    adult_mortality_outcome: () => fact.died ? "这一年，生命走到了终点。" : null,
    annual_operation: () => `这一年的主要行动：${fact.label}（每周约${fact.timeUseHoursPerWeek}小时）。`,
    annual_operation_cash_expense: () => `为“${fact.purpose}”支出${formatCurrency(fact.amountYuan)}，已进入本年现金记录。`,
    annual_operation_echo: () => `${fact.title}：这是相关行动累计到第${fact.accumulatedYears}年后出现的长期回响。`,
    quarter_random_event: () => `${fact.title}：你选择了“${fact.selectedLabel}”。`,
    quarter_growth_effects: () => {
      const changes = [
        ...Object.entries(fact.statChanges ?? {}).map(([id, delta]) => `${STAT_LABELS[id] ?? id}${delta >= 0 ? "+" : ""}${roundedDelta(delta)}`),
        ...Object.entries(fact.interestChanges ?? {}).map(([id, delta]) => `${id}兴趣+${delta}`),
      ];
      return changes.length > 0 ? `第${fact.quarter}季度成长：${changes.join("、")}。` : null;
    },
    child_quarter_activity_outcome: () => `${fact.actorName}参与了“${fact.activityLabel}”：实际投入约${fact.actualHours}小时；${fact.outcome}`,
    quarter_activity_process: () => `${fact.actorName}参与了“${fact.activityLabel}”：实际投入约${fact.actualHours}小时；${fact.outcome}`,
    childhood_growth_milestone: () => `${fact.pathLabel}成长节点“${fact.title}”：${fact.description}`,
    child_person_shared_activity: () => `你和${fact.displayName}共同经历了“${fact.activityLabel}”，信任记录${fact.trustAfter}/100。`,
    interest_stage_changed: () => `${fact.interestLabel}进入“${fact.stageLabel}”，累计投入约${fact.accumulatedHours}小时。`,
    youth_year_context: () => fact.historicalMilestones?.length
      ? `时代节点：${eraList(fact.historicalMilestones.map((entry) => entry.id))}。`
      : null,
    adult_year_context: () => fact.policyMilestones?.length
      ? `制度节点：${eraList(fact.policyMilestones.map((entry) => entry.id))}。`
      : null,
    historical_job_shock_exposure: () => `当前${fact.jobLabel ?? fact.occupation}处在${eraList(fact.exposureIds)}；模型中的岗位结束风险发生变化，但结果并非预先决定。`,
    origin_family_support_year: () => `父母仍有${fact.livingParentCount}人在世；本年家庭照护安排为每周${fact.familyCareHoursPerWeek}小时。`,
    child_year: () => `孩子${fact.childAge}岁，处于${CHILD_LIFE_STAGE_LABELS[fact.lifeStage] ?? "成长阶段"}；每周共同相处约${fact.playerInteractionHoursPerWeek}小时。`,
    child_life_stage_transition: () => `孩子进入${CHILD_LIFE_STAGE_LABELS[fact.to] ?? "新的成长阶段"}。`,
    recurring_person_met: () => `你认识了${fact.roleLabel}${fact.displayName}；这是游戏生成的虚构人物。`,
    recurring_person_contact: () => `你与${fact.displayName}保持了联系，这是你们共同经历的第${fact.sharedYears}年。`,
    youth_mainline_opportunity: () => `${fact.title}：你选择了“${fact.selectedLabel}”。得到：${fact.gain}；代价：${fact.tradeoff}。`,
    youth_mainline_follow_through: () => `你再次投入“${fact.activityLabel}”，这条经历已连续进入${fact.totalQuarterCount}个季度。`,
    youth_mainline_delayed_echo: () => `早期经历回响：${fact.text}`,
  };
  return handlers[fact.type]?.() ?? null;
}

function currentQuarterProgress(record, pending) {
  const quarterRecords = record?.quarterRecords ?? [];
  const settledRecords = quarterRecords.filter((entry) => entry.monthTicks?.length === 3);
  const currentQuarter = ["quarter_plan", "random_life_event", "mainline_event"].includes(pending?.kind)
    ? pending.quarter
    : (settledRecords.length === 4 ? 4 : Math.min(4, settledRecords.length + 1));
  const sourceLabels = {
    provided: "主动安排",
    continue: "延续安排",
    maintain_to_year_end: "维持到年底",
    notify_only: "自动推进",
    family_continuation: "家庭连续执行",
    stage_continuation: "连续执行",
    automatic_continuation: "连续执行",
    development_continuation: "幼儿日常延续",
    age_appropriate_observation: "按年龄自动经历",
    automatic: "自动安排",
  };
  return {
    currentQuarter,
    completedCount: settledRecords.length,
    allCompleted: settledRecords.length === 4,
    quarters: Array.from({ length: 4 }, (_, index) => {
      const quarter = index + 1;
      const settled = settledRecords.find((entry) => entry.quarter === quarter);
      return {
        quarter,
        label: `Q${quarter}`,
        status: settled ? "completed" : (quarter === currentQuarter ? "current" : "upcoming"),
        plan: settled?.operationLabel ?? null,
        detail: settled
          ? `${settled.activities?.length ?? 0}项活动 · ${settled.timeUseHoursPerWeek}小时/周 · ${sourceLabels[settled.source] ?? "已结算"}`
          : null,
        quickSettled: Boolean(settled?.quickSettled),
      };
    }),
  };
}

function currentFactLines(record) {
  if (!record) return [];
  const preferredTypes = [
    "youth_mainline_opportunity",
    "youth_mainline_follow_through",
    "youth_mainline_delayed_echo",
    "quarter_random_event",
    "childhood_growth_milestone",
    "child_quarter_activity_outcome",
    "interest_stage_changed",
    "adult_job_year",
    "annual_operation",
    "annual_operation_cash_expense",
    "annual_operation_echo",
    "recurring_person_met",
    "recurring_person_contact",
    "historical_job_shock_exposure",
    "child_life_stage_transition",
    "child_year",
    "origin_family_support_year",
    "youth_year_context",
    "adult_year_context",
    "higher_education_year",
    "senior_school_year_attendance_and_learning",
    "junior_school_year_attendance_and_learning",
    "primary_school_year_attendance_and_learning",
    "partner_household_formed",
    "first_child_attempt_outcome",
    "housing_choice_outcome",
    "adult_household_finance",
    "youth_household_finance_settled",
    "adolescence_household_finance_settled",
    "primary_household_finance_settled",
    "household_finance_settled",
    "adult_health_year_summary",
  ];
  const lines = [];
  for (const type of preferredTypes) {
    for (const fact of record.facts.filter((entry) => entry.type === type)) {
      const line = factLine(fact);
      if (line && !lines.includes(line)) lines.push(line);
      if (lines.length >= 4) return lines;
    }
  }
  return lines;
}

function allDecisions(result) {
  return Object.values(result.stages).flatMap((stage) => stage.decisions ?? []);
}

function latestDecisionView(result, optionIndex) {
  const decision = allDecisions(result).at(-1);
  if (!decision) return null;
  const chosenId = decision.selectedOptionId ?? decision.chosenOptionId;
  const unchosen = decision.unchosenCandidates
    ? decision.unchosenCandidates.map((candidate) => ({
        id: candidate.id,
        label: candidate.label,
        meta: optionMeta(candidate),
      }))
    : (decision.unchosenOptions ?? decision.unchosenOptionIds ?? []).map((entry) => {
        const id = typeof entry === "string" ? entry : entry.id;
        return {
          id,
          label: typeof entry === "string"
            ? (optionIndex.get(entry) ?? entry)
            : (entry.label ?? optionIndex.get(id) ?? id),
          meta: typeof entry === "string" ? [] : optionMeta(entry),
        };
      });
  return {
    eventId: decision.eventId,
    chosenId,
    chosenLabel: optionIndex.get(chosenId) ?? decision.selectedLabel ?? chosenId,
    unchosen,
  };
}

export function presentGame(result, data) {
  const record = latestRecord(result);
  const optionIndex = buildOptionIndex(data);
  const pending = result.pendingDecision;
  const dataStatus = record?.dataStatus === "scenario" ? "scenario" : "history";
  const mainline = buildLifeMainline(result);
  return {
    status: result.status,
    stage: result.stage,
    stageLabel: STAGE_LABELS[result.stage] ?? result.stage,
    year: record?.calendarYear ?? result.profile.person.birthYear,
    age: record?.age ?? 0,
    dataStatus,
    dataStatusLabel: dataStatus === "scenario" ? "2026年后情景" : "历史观测范围",
    introduction: result.profile.introduction,
    situation: currentSituation(result),
    yearLedger: currentYearLedger(result),
    quarterProgress: currentQuarterProgress(record, pending),
    latestQuarterOutcome: latestQuarterOutcomeAcrossLife(result, data, mainline),
    quarterOutcomes: quarterOutcomeViews(record, data, mainline),
    childhoodExperience: latestQuarterExperience(record),
    childhoodGrowth: childhoodGrowthView(result.currentState),
    childhoodMemories: clone(result.currentState.childhoodGrowth?.memories?.slice(-4).reverse() ?? []),
    interests: currentInterests(result),
    people: currentPeople(result),
    stats: statValues(result.currentState),
    characterStates: characterStateValues(result.currentState),
    visual: buildCharacterVisualView(
      result,
      record?.age ?? 0,
      record?.calendarYear ?? result.profile.person.birthYear,
    ),
    facts: [
      ...globalEraFacts(data, record?.calendarYear),
      ...(record?.age === 0 && result.profile.person.healthAtBirth
        ? [`出生健康基础：${result.profile.person.healthAtBirth.reserveScore}/100。依据1981年婴儿死亡率37.6‰校准，仅是游戏状态，不是临床评分或诊断。`]
        : []),
      ...currentFactLines(record),
    ].slice(0, 6),
    pending: pending
      ? {
          ...pending,
          options: pending.options.map((option) => ({
            ...option,
            meta: optionMeta(option).filter((entry) => (
              pending.kind !== "mainline_event" || entry !== option.effectSummary
            )),
            effects: actionEffectView(option, data, mainline),
          })),
        }
      : null,
    latestDecision: latestDecisionView(result, optionIndex),
    mainline,
    lifeReview: result.lifeReview
      ? {
          ...result.lifeReview,
          title: ARCHETYPE_TEXT[result.lifeReview.archetypeId]?.[0]
            ?? result.lifeReview.archetypeId,
          summary: ARCHETYPE_TEXT[result.lifeReview.archetypeId]?.[1] ?? "",
        }
      : null,
  };
}

function highlightText(fact) {
  const map = {
    sibling_birth: () => "家里多了一名共同生活的手足。",
    primary_school_assigned: () => `进入 ${fact.schoolForm ?? "小学"}。`,
    primary_graduation_outcome: () => fact.graduated ? "完成小学教育。" : null,
    junior_graduation_outcome: () => fact.graduated ? "完成初中教育。" : null,
    senior_school_assigned: () => fact.track === "academic_senior" ? "进入普通高中。" : "进入中等职业教育。",
    senior_graduation_outcome: () => fact.graduated ? "完成高中阶段教育。" : null,
    higher_education_graduation_outcome: () => fact.graduated ? "完成普通高等教育。" : null,
    first_actual_work_started: () => `开始第一份实际工作：${fact.label ?? fact.occupation}。`,
    adult_job_started: () => `开始新工作：${fact.label ?? fact.occupation}。`,
    employment_ended: () => "一段工作经历结束。",
    career_promotion: () => `岗位职责提升为${POSITION_LEVEL_LABELS[fact.newPositionLevel] ?? fact.newPositionLevel}。`,
    partner_household_formed: () => "开始与伴侣共同生活。",
    partner_household_separated: () => "共同生活关系结束。",
    partner_death: () => "伴侣在这一年去世。",
    first_child_attempt_outcome: () => fact.childBorn ? "家庭迎来一个孩子。" : null,
    child_life_stage_transition: () => `孩子进入${CHILD_LIFE_STAGE_LABELS[fact.to] ?? "新的成长阶段"}。`,
    housing_choice_outcome: () => `住房安排：${HOUSING_RESULT_LABELS[fact.result] ?? fact.result}。`,
    retirement_started: () => "结束全职工作，进入退休。",
    adult_mortality_outcome: () => fact.died ? "生命在这一年结束。" : null,
    fatal_child_health_event: () => "生命在幼年结束。",
    annual_operation: () => `这一年的主要行动：${fact.label}。`,
    annual_operation_echo: () => `长期回响：${fact.title}。`,
    quarter_random_event: () => `${fact.title}：${fact.selectedLabel}。`,
    childhood_growth_milestone: () => `${fact.pathLabel}：${fact.title}。`,
    child_quarter_activity_outcome: () => `${fact.actorName}与你一起完成“${fact.activityLabel}”：${fact.outcome}`,
    interest_stage_changed: () => `${fact.interestLabel}成为“${fact.stageLabel}”。`,
    historical_job_shock_exposure: () => `${eraList(fact.exposureIds)}影响了当前岗位环境。`,
    recurring_person_met: () => `认识了${fact.roleLabel}${fact.displayName}。`,
    recurring_person_contact: () => `与${fact.displayName}保持联系。`,
    youth_mainline_opportunity: () => `${fact.title}：选择“${fact.selectedLabel}”，得到${fact.gain}，也承担${fact.tradeoff}。`,
    youth_mainline_follow_through: () => `继续投入“${fact.activityLabel}”，早期选择开始形成连续经历。`,
    youth_mainline_delayed_echo: () => `早期经历在${fact.yearsSince}年后产生回响。`,
    youth_year_context: () => fact.historicalMilestones?.length
      ? `时代节点：${eraList(fact.historicalMilestones.map((entry) => entry.id))}。`
      : null,
    adult_year_context: () => fact.policyMilestones?.length
      ? `制度节点：${eraList(fact.policyMilestones.map((entry) => entry.id))}。`
      : null,
  };
  return map[fact.type]?.() ?? null;
}

export function buildTimeline(result) {
  const timeline = [];
  for (const [stage, state] of Object.entries(result.stages)) {
    for (const record of state.annualRecords ?? []) {
      for (const quarter of record.quarterRecords ?? []) {
        timeline.push({
          year: record.calendarYear,
          age: record.age,
          stage,
          stageLabel: STAGE_LABELS[stage] ?? stage,
          quarter: quarter.quarter,
          text: `${quarter.label}：${quarter.experience ? `${quarter.experience} ` : ""}${quarter.activities?.length ? `你安排了${quarter.activities.map((activity) => activity.label).join("、")}；每周约${quarter.timeUseHoursPerWeek}小时` : "没有被赋予超出年龄的主动安排"}${quarter.activityResults?.length ? `。实际经历：${quarter.activityResults.map((entry) => `${entry.actor.name}参与“${entry.activityLabel}”，${entry.outcome}`).join("；")}` : ""}${quarter.growthMilestones?.length ? `。成长节点：${quarter.growthMilestones.map((entry) => entry.title).join("、")}` : ""}${quarter.quickSettled ? "，由连续计划快速结算" : ""}。`,
        });
      }
      for (const fact of record.facts ?? []) {
        const text = highlightText(fact);
        if (text) {
          timeline.push({
            year: record.calendarYear,
            age: record.age,
            stage,
            stageLabel: STAGE_LABELS[stage] ?? stage,
            text,
          });
        }
      }
    }
  }
  return timeline;
}

export { ARCHETYPE_TEXT, STAGE_LABELS, STAT_LABELS };
