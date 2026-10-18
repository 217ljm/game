/**
 * 职场职级晋升系统 (Career Promotion System)
 * 包含体制内公务员、国企央企干部、外企/互联网大厂、自主创业企业家四大发展路线
 * 严格落实考核标准、资历年限、绩效指标、职称考评与破格提拔机制
 */

export type CareerTrack = "government" | "state_owned" | "tech_internet" | "entrepreneur";

export type ProfessionalTitleLevel = "none" | "junior" | "intermediate" | "senior" | "fellow";

export interface ProfessionalTitle {
  id: string;
  name: string;
  level: ProfessionalTitleLevel;
  track: CareerTrack;
  bonusPrestige: number;
  salaryMultiplier: number;
  description: string;
}

export interface CareerRankDefinition {
  id: string;
  track: CareerTrack;
  level: number; // 1 ~ 6
  title: string;
  icon: string;
  baseMonthlySalary: number; // 基础税前月薪 (元)
  yearEndBonusMonths: number; // 年终奖月数
  stockOptionsAnnualYuan: number; // 年化股票期权/分红 (元)
  prestige: number; // 社会威望与社会地位加成
  socialInsuranceBase: number; // 五险一金缴纳基数 (元)
  minYearsRequired: number; // 上一职级最低任职年限
  minIntelligence: number; // 智力与专业能力门槛
  minCharm: number; // 情商与社交人脉门槛
  minHealth: number; // 体魄与精力门槛
  minCashRequired?: number; // 创业路线所需自有资金
  description: string;
  duties: string;
}

export interface CareerWorkAction {
  id: string;
  name: string;
  icon: string;
  description: string;
  costEnergy: number; // 消耗精力
  costCash: number; // 消耗资金 (如交际应酬、培训考证)
  performanceGain: number; // 增加年度绩效考核分
  charmOrConnectionGain: number; // 增加人脉/领导好感
  skillGain: number; // 业务技能提升
  stressGain: number; // 职业压力/健康影响
}

export interface PromotionEvaluationResult {
  success: boolean;
  type: "promoted" | "fast_tracked" | "deferred" | "demoted";
  previousRank: CareerRankDefinition;
  targetRank: CareerRankDefinition;
  score: number; // 综合评审得分 (0~100)
  scoreBreakdown: {
    performanceScore: number;
    seniorityScore: number;
    abilityScore: number;
    networkScore: number;
    titleScore: number;
  };
  narrative: string;
  unlockedPrivileges: string[];
}

export interface CareerState {
  currentTrack: CareerTrack;
  currentRankId: string;
  yearsInCurrentRank: number; // 当前职级任职年限
  totalWorkYears: number; // 累计工龄
  currentPerformanceScore: number; // 本年绩效考评积分 (0~100, 初始60)
  lastYearPerformanceGrade: "S" | "A" | "B" | "C" | "D"; // 去年绩效评级
  politicalIntegrity: number; // 廉政素养 (体制内专有, 0~100)
  professionalTitle: ProfessionalTitleLevel; // 职称等级
  workStress: number; // 职场压力 (0~100)
  companyValuationYuan?: number; // 创业公司估值 (元)
  annualRevenueYuan?: number; // 创业公司年营收 (元)
  employeeCount?: number; // 团队员工规模
  fundingRound?: "self" | "angel" | "series_a" | "series_b" | "pre_ipo" | "listed"; // 融资轮次
}

// -------------------------------------------------------------
// 1. 四大职业路线职级数据库
// -------------------------------------------------------------
export const CAREER_RANKS_DATABASE: Record<string, CareerRankDefinition> = {
  // ===================== 体制内公务员路线 =====================
  "gov_clerk": {
    id: "gov_clerk",
    track: "government",
    level: 1,
    title: "机关科员 / 基层办事员",
    icon: "📋",
    baseMonthlySalary: 4800,
    yearEndBonusMonths: 2.5,
    stockOptionsAnnualYuan: 0,
    prestige: 35,
    socialInsuranceBase: 5000,
    minYearsRequired: 0,
    minIntelligence: 45,
    minCharm: 40,
    minHealth: 50,
    description: "通过国家/地方公务员考试录用，负责公文收发、会务筹备与日常政务处理。",
    duties: "起草日常政务简报、参与基层联络调研、协助科室日常运行。",
  },
  "gov_deputy_section": {
    id: "gov_deputy_section",
    track: "government",
    level: 2,
    title: "副科级 / 副股长 / 乡镇副职",
    icon: "🎖️",
    baseMonthlySalary: 7200,
    yearEndBonusMonths: 3.0,
    stockOptionsAnnualYuan: 0,
    prestige: 55,
    socialInsuranceBase: 7500,
    minYearsRequired: 3,
    minIntelligence: 55,
    minCharm: 50,
    minHealth: 50,
    description: "具备一定工作年限与基层锻炼经验，担任科室副职或驻村第一书记，初具协调管理职权。",
    duties: "牵头专项政策落地、负责辖区专项督导、组织基层群众工作与重点任务攻坚。",
  },
  "gov_section_chief": {
    id: "gov_section_chief",
    track: "government",
    level: 3,
    title: "正科级 / 机关科长 / 乡镇长 / 街道主任",
    icon: "🏛️",
    baseMonthlySalary: 10500,
    yearEndBonusMonths: 3.5,
    stockOptionsAnnualYuan: 0,
    prestige: 75,
    socialInsuranceBase: 11000,
    minYearsRequired: 3,
    minIntelligence: 65,
    minCharm: 62,
    minHealth: 52,
    description: "地方政务中流砥柱，主政一方乡镇或执掌市县核心职能局机关处室，拥有实质性行政审批权。",
    duties: "主持科室/乡镇全面工作、统筹辖区经济民生建设、处置应急突发事件。",
  },
  "gov_deputy_division": {
    id: "gov_deputy_division",
    track: "government",
    level: 4,
    title: "副处级 / 副县长 / 市局副局长",
    icon: "📜",
    baseMonthlySalary: 15500,
    yearEndBonusMonths: 4.0,
    stockOptionsAnnualYuan: 0,
    prestige: 90,
    socialInsuranceBase: 16000,
    minYearsRequired: 4,
    minIntelligence: 75,
    minCharm: 75,
    minHealth: 55,
    description: "跨入县处级领导干部序列，分管重点领域（如招商引资、城建规划、教育卫生等）。",
    duties: "协助主要领导统筹分管战线、出席重大政企签约会谈、主导区域重大规划论证。",
  },
  "gov_division_chief": {
    id: "gov_division_chief",
    track: "government",
    level: 5,
    title: "正处级 / 县委书记 / 县长 / 市局局长",
    icon: "🌟",
    baseMonthlySalary: 21000,
    yearEndBonusMonths: 4.5,
    stockOptionsAnnualYuan: 0,
    prestige: 110,
    socialInsuranceBase: 22000,
    minYearsRequired: 4,
    minIntelligence: 82,
    minCharm: 85,
    minHealth: 58,
    description: "主政一县数十万人口或执掌市级核心大局，主政一方，影响力深远，属于关键执政骨干。",
    duties: "主持全县/全局全面工作、把握重大战略方向、任免干部与统领区域高质量发展。",
  },
  "gov_deputy_department": {
    id: "gov_deputy_department",
    track: "government",
    level: 6,
    title: "副厅级 / 地级市副市长 / 省直厅局副厅长",
    icon: "👑",
    baseMonthlySalary: 28000,
    yearEndBonusMonths: 5.0,
    stockOptionsAnnualYuan: 0,
    prestige: 135,
    socialInsuranceBase: 30000,
    minYearsRequired: 5,
    minIntelligence: 88,
    minCharm: 92,
    minHealth: 60,
    description: "高级领导干部，执掌全省重点行业政策制定或分管百万人口地级市全局工作，名重一方。",
    duties: "制定全省性行业规划法规、协调重特大跨区域项目、参与省部级高规格经济民生决策。",
  },

  // ===================== 国企央企干部路线 =====================
  "so_intern_engineer": {
    id: "so_intern_engineer",
    track: "state_owned",
    level: 1,
    title: "见习业务员 / 助理工程师",
    icon: "⚙️",
    baseMonthlySalary: 5800,
    yearEndBonusMonths: 3.0,
    stockOptionsAnnualYuan: 0,
    prestige: 30,
    socialInsuranceBase: 6000,
    minYearsRequired: 0,
    minIntelligence: 50,
    minCharm: 40,
    minHealth: 50,
    description: "大型国企央企校招入职，在生产一线、设计院或业务部进行轮岗实训与技术沉淀。",
    duties: "执行标准化生产与工艺流程、编写工程日志与试验报告、配合老师傅技术攻关。",
  },
  "so_senior_specialist": {
    id: "so_senior_specialist",
    track: "state_owned",
    level: 2,
    title: "业务骨干 / 项目主管 / 工程师",
    icon: "📐",
    baseMonthlySalary: 9500,
    yearEndBonusMonths: 3.5,
    stockOptionsAnnualYuan: 0,
    prestige: 50,
    socialInsuranceBase: 10000,
    minYearsRequired: 2,
    minIntelligence: 60,
    minCharm: 50,
    minHealth: 50,
    description: "掌握核心业务流程或专业技术，能独立主导央企重大工程子项目并带教徒弟。",
    duties: "负责项目质量安全进度全流程把控、攻克重点工艺难关、编写技术规范与专利交底书。",
  },
  "so_assistant_director": {
    id: "so_assistant_director",
    track: "state_owned",
    level: 3,
    title: "部长助理 / 中层副职 / 高级工程师",
    icon: "🏭",
    baseMonthlySalary: 16500,
    yearEndBonusMonths: 4.0,
    stockOptionsAnnualYuan: 20000,
    prestige: 70,
    socialInsuranceBase: 18000,
    minYearsRequired: 3,
    minIntelligence: 70,
    minCharm: 62,
    minHealth: 52,
    description: "跻身国企中层骨干，统筹跨车间/跨部门业务协同，承担国有资产保值增值考核指标。",
    duties: "组织大宗物资招投标采购、统筹生产计划排期、参与集团内部科研成果产业化推广。",
  },
  "so_department_head": {
    id: "so_department_head",
    track: "state_owned",
    level: 4,
    title: "部门部长 / 分厂厂长 / 分公司总经理",
    icon: "🏢",
    baseMonthlySalary: 28000,
    yearEndBonusMonths: 5.0,
    stockOptionsAnnualYuan: 60000,
    prestige: 88,
    socialInsuranceBase: 30000,
    minYearsRequired: 3,
    minIntelligence: 78,
    minCharm: 76,
    minHealth: 55,
    description: "国企中流砥柱，统领千人分厂或核心事业部，具备人财物独立调配权，深得组织信任。",
    duties: "全面负责分厂/部门生产经营安全指标、落实党风廉政责任制、主导引进国际先进生产线。",
  },
  "so_deputy_gm": {
    id: "so_deputy_gm",
    track: "state_owned",
    level: 5,
    title: "集团副总经理 / 总工程师 / 党委委员",
    icon: "🎖️",
    baseMonthlySalary: 45000,
    yearEndBonusMonths: 6.0,
    stockOptionsAnnualYuan: 150000,
    prestige: 105,
    socialInsuranceBase: 35000,
    minYearsRequired: 4,
    minIntelligence: 85,
    minCharm: 85,
    minHealth: 58,
    description: "集团高管领导班子成员，主管全集团科技创新研发、海外投资并购或资本运作。",
    duties: "把控国家级重大专项技术攻坚、布局海外新兴市场产业链、代表集团签署央企战略合作协议。",
  },
  "so_party_secretary_gm": {
    id: "so_party_secretary_gm",
    track: "state_owned",
    level: 6,
    title: "集团党委书记 / 董事长 / 总经理",
    icon: "💎",
    baseMonthlySalary: 75000,
    yearEndBonusMonths: 8.0,
    stockOptionsAnnualYuan: 400000,
    prestige: 130,
    socialInsuranceBase: 38000,
    minYearsRequired: 4,
    minIntelligence: 90,
    minCharm: 92,
    minHealth: 60,
    description: "掌舵世界500强或千亿级骨干央企，是国民经济压舱石的主帅，享受正厅/省部级待遇。",
    duties: "制定集团中长期全球发展战略、向国资委汇报重大经营决策、保障国家战略物资供应链安全。",
  },

  // ===================== 外企/互联网大厂路线 =====================
  "tech_p5": {
    id: "tech_p5",
    track: "tech_internet",
    level: 1,
    title: "P5 初级研发工程师 / 产品运营",
    icon: "💻",
    baseMonthlySalary: 14000,
    yearEndBonusMonths: 3.0,
    stockOptionsAnnualYuan: 0,
    prestige: 22,
    socialInsuranceBase: 14000,
    minYearsRequired: 0,
    minIntelligence: 62,
    minCharm: 40,
    minHealth: 55,
    description: "名校或社招精英入职顶尖科技大厂，参与高并发微服务业务模块开发与敏捷迭代。",
    duties: "完成产品需求PRD与高质量代码交付、参与Code Review、跟进线上Bug快速修复。",
  },
  "tech_p6": {
    id: "tech_p6",
    track: "tech_internet",
    level: 2,
    title: "P6 资深开发 / 独立负责业务模块",
    icon: "⚡",
    baseMonthlySalary: 24000,
    yearEndBonusMonths: 3.5,
    stockOptionsAnnualYuan: 50000,
    prestige: 42,
    socialInsuranceBase: 24000,
    minYearsRequired: 2,
    minIntelligence: 72,
    minCharm: 50,
    minHealth: 55,
    description: "具备极强独当一面能力，能端到端扛起千万级DAU核心微服务子系统，技术视野开阔。",
    duties: "负责系统高可用架构设计、压测调优与熔断限流、带教校招应届生与实习生。",
  },
  "tech_p7": {
    id: "tech_p7",
    track: "tech_internet",
    level: 3,
    title: "P7 技术专家 / 业务小组 Tech Lead",
    icon: "🚀",
    baseMonthlySalary: 38000,
    yearEndBonusMonths: 4.0,
    stockOptionsAnnualYuan: 160000,
    prestige: 68,
    socialInsuranceBase: 35000,
    minYearsRequired: 3,
    minIntelligence: 80,
    minCharm: 65,
    minHealth: 55,
    description: "大厂骨干技术先锋，主导跨团队重大技术重构与架构升级，享受可观股票期权激励(RSU)。",
    duties: "制定季度技术规划与Roadmap、主导千万级流量中台建设、攻坚线上P0重大架构故障。",
  },
  "tech_p8": {
    id: "tech_p8",
    track: "tech_internet",
    level: 4,
    title: "P8 高级技术专家 / 总监 / 部门负责人",
    icon: "🛰️",
    baseMonthlySalary: 58000,
    yearEndBonusMonths: 4.5,
    stockOptionsAnnualYuan: 400000,
    prestige: 88,
    socialInsuranceBase: 38000,
    minYearsRequired: 3,
    minIntelligence: 86,
    minCharm: 78,
    minHealth: 58,
    description: "执掌百人技术/产研团队，通过技术创新驱动商业增长，具有极高的行业知名度与话语权。",
    duties: "统筹年度组织架构与产研预算、主导前沿大模型/AI基础架构落地、向副总裁汇报业务成果。",
  },
  "tech_p9": {
    id: "tech_p9",
    track: "tech_internet",
    level: 5,
    title: "P9 资深总监 / 集团首席架构师",
    icon: "🔮",
    baseMonthlySalary: 92000,
    yearEndBonusMonths: 5.0,
    stockOptionsAnnualYuan: 900000,
    prestige: 105,
    socialInsuranceBase: 40000,
    minYearsRequired: 4,
    minIntelligence: 92,
    minCharm: 85,
    minHealth: 60,
    description: "顶尖科技大厂核心智囊团，负责全集团底层技术生态与前瞻性技术布局，主导开源界重大贡献。",
    duties: "制定全集团技术战略标准、主导并购技术团队整合、担任国际顶会联席主席与行业标准起草人。",
  },
  "tech_vp": {
    id: "tech_vp",
    track: "tech_internet",
    level: 6,
    title: "VP / 集团副总裁 / 高级合伙人",
    icon: "💎",
    baseMonthlySalary: 160000,
    yearEndBonusMonths: 6.0,
    stockOptionsAnnualYuan: 2200000,
    prestige: 125,
    socialInsuranceBase: 42000,
    minYearsRequired: 4,
    minIntelligence: 94,
    minCharm: 92,
    minHealth: 62,
    description: "科技巨头最高经营决策委员会核心成员，统率万名产研精英，主宰百亿级商业版图。",
    duties: "对千亿级业务线经营损益P&L负责、制定全球化战略、代表集团出席世界互联网大会做主题发言。",
  },

  // ===================== 自主创业企业家路线 =====================
  "ent_self_employed": {
    id: "ent_self_employed",
    track: "entrepreneur",
    level: 1,
    title: "个体工商户 / 独立工作室主理人",
    icon: "🏪",
    baseMonthlySalary: 8500,
    yearEndBonusMonths: 2.0,
    stockOptionsAnnualYuan: 20000,
    prestige: 25,
    socialInsuranceBase: 6000,
    minYearsRequired: 0,
    minIntelligence: 55,
    minCharm: 52,
    minHealth: 55,
    minCashRequired: 20000,
    description: "下海创业自谋生路，经营实体门面、电商网店或创意工作室，自负盈亏，时间自由。",
    duties: "亲自选品进货、接待客户、记账纳税与维系店铺日常运转。",
  },
  "ent_startup_founder": {
    id: "ent_startup_founder",
    track: "entrepreneur",
    level: 2,
    title: "初创公司创始人 (天使轮/年营收百万)",
    icon: "🌱",
    baseMonthlySalary: 18000,
    yearEndBonusMonths: 3.0,
    stockOptionsAnnualYuan: 80000,
    prestige: 52,
    socialInsuranceBase: 12000,
    minYearsRequired: 2,
    minIntelligence: 68,
    minCharm: 65,
    minHealth: 58,
    minCashRequired: 100000,
    description: "组建10~20人初始精英团队，跑通商业闭环与MVP产品，获得知名天使投资人注资。",
    duties: "奔波于各地路演拉投资、打磨核心产品体验、稳定早期现金流与招募核心骨干。",
  },
  "ent_growth_enterprise": {
    id: "ent_growth_enterprise",
    track: "entrepreneur",
    level: 3,
    title: "成长型高新企业老板 (A/B轮融资/年营收数千万)",
    icon: "🏢",
    baseMonthlySalary: 45000,
    yearEndBonusMonths: 4.0,
    stockOptionsAnnualYuan: 300000,
    prestige: 78,
    socialInsuranceBase: 25000,
    minYearsRequired: 3,
    minIntelligence: 78,
    minCharm: 78,
    minHealth: 60,
    minCashRequired: 500000,
    description: "企业进入高速发展期，员工达上百人，完成数千万元VC融资，具备成熟销售网络与技术壁垒。",
    duties: "拓展全国渠道代理网络、主导研发技术迭代、引入职业经理人规范公司内控治理。",
  },
  "ent_industry_leader": {
    id: "ent_industry_leader",
    track: "entrepreneur",
    level: 4,
    title: "行业隐形冠军董事长 (准独角兽/年营收过亿)",
    icon: "🏰",
    baseMonthlySalary: 90000,
    yearEndBonusMonths: 5.0,
    stockOptionsAnnualYuan: 1200000,
    prestige: 100,
    socialInsuranceBase: 38000,
    minYearsRequired: 3,
    minIntelligence: 86,
    minCharm: 88,
    minHealth: 62,
    minCashRequired: 2000000,
    description: "企业成为细分行业领头羊，营收数亿元，启动券商辅导与股改，向A股/港股IPO发起最后冲刺。",
    duties: "与券商投行推进IPO股改上市合规、主导产业链上下游战略兼并收购、设立产业创新基金。",
  },
  "ent_listed_tycoon": {
    id: "ent_listed_tycoon",
    track: "entrepreneur",
    level: 5,
    title: "上市公司掌舵人 / 商界领袖 (主板敲钟/百亿市值)",
    icon: "👑",
    baseMonthlySalary: 200000,
    yearEndBonusMonths: 6.0,
    stockOptionsAnnualYuan: 5000000,
    prestige: 135,
    socialInsuranceBase: 45000,
    minYearsRequired: 4,
    minIntelligence: 92,
    minCharm: 95,
    minHealth: 65,
    minCashRequired: 10000000,
    description: "在证券交易所敲响上市宝钟，公司市值超百亿，跻身福布斯/胡润富豪榜，受地方政府崇高礼遇。",
    duties: "主导全球化产业并购布局、发起慈善公益基金会、在达沃斯经济论坛发表主旨演讲。",
  },
};

// -------------------------------------------------------------
// 2. 职场季度行动列表
// -------------------------------------------------------------
export const CAREER_WORK_ACTIONS: CareerWorkAction[] = [
  {
    id: "overtime_deliver",
    name: "攻坚重点重大攻坚项目",
    icon: "🔥",
    description: "主动申请加班带头攻坚重点专项或攻关技术难题，争取在年终产出爆炸性业绩亮眼表现。",
    costEnergy: 25,
    costCash: 0,
    performanceGain: 18,
    charmOrConnectionGain: 3,
    skillGain: 5,
    stressGain: 15,
  },
  {
    id: "report_and_network",
    name: "向上汇报与领导对饮交流",
    icon: "🤝",
    description: "主动向分管领导进行精细化业务汇报，下班后参加团建聚餐与同侪社交，巩固人脉信任。",
    costEnergy: 18,
    costCash: 300,
    performanceGain: 8,
    charmOrConnectionGain: 14,
    skillGain: 2,
    stressGain: 5,
  },
  {
    id: "exam_qualification",
    name: "备战考取高级专业资格证书",
    icon: "📚",
    description: "利用业余时间挑灯夜读，报考全国统一职称评定（中/高级工程师、经济师、CPA等）。",
    costEnergy: 22,
    costCash: 600,
    performanceGain: 6,
    charmOrConnectionGain: 0,
    skillGain: 18,
    stressGain: 10,
  },
  {
    id: "team_mentorship",
    name: "团队带教与部门知识分享",
    icon: "👨‍🏫",
    description: "精心组织部门内部分享会，耐心带教新入职员工与徒弟，树立德高望重的导师口碑。",
    costEnergy: 15,
    costCash: 100,
    performanceGain: 10,
    charmOrConnectionGain: 10,
    skillGain: 6,
    stressGain: -5,
  },
  {
    id: "biz_pitch_investment",
    name: "拜访战略投资人与政企大客户",
    icon: "💼",
    description: "携带商业计划书与产品样品辗转各地洽谈，争取数千万元大额订单或战略融资注入。",
    costEnergy: 30,
    costCash: 1200,
    performanceGain: 22,
    charmOrConnectionGain: 18,
    skillGain: 10,
    stressGain: 20,
  },
];

// -------------------------------------------------------------
// 3. 职称评定目录
// -------------------------------------------------------------
export const PROFESSIONAL_TITLES: Record<ProfessionalTitleLevel, ProfessionalTitle> = {
  none: {
    id: "none",
    name: "无专业职称",
    level: "none",
    track: "state_owned",
    bonusPrestige: 0,
    salaryMultiplier: 1.0,
    description: "尚未取得任何官方认定的专业技术职称。",
  },
  junior: {
    id: "junior",
    name: "初级职称 / 助理工程师 / 初级经济师",
    level: "junior",
    track: "state_owned",
    bonusPrestige: 5,
    salaryMultiplier: 1.05,
    description: "通过初级水平能力认定，具备扎实的专业基础知识。",
  },
  intermediate: {
    id: "intermediate",
    name: "中级职称 / 工程师 / 中级经济师",
    level: "intermediate",
    track: "state_owned",
    bonusPrestige: 15,
    salaryMultiplier: 1.15,
    description: "省市人社部门评定中级职称，具备独立解决复杂工程与业务问题能力。",
  },
  senior: {
    id: "senior",
    name: "高级职称 / 高级工程师 / 高级会计师",
    level: "senior",
    track: "state_owned",
    bonusPrestige: 30,
    salaryMultiplier: 1.30,
    description: "高级专家资质，享受特殊专业津贴与专家评审委员会评审资格。",
  },
  fellow: {
    id: "fellow",
    name: "正高级职称 / 教授级高工 / 国务院特贴专家",
    level: "fellow",
    track: "state_owned",
    bonusPrestige: 50,
    salaryMultiplier: 1.50,
    description: "国家行业最高技术权威，享受国务院政府特殊津贴，参与国家重大科技决策。",
  },
};

// -------------------------------------------------------------
// 4. 职业晋升系统核心实现
// -------------------------------------------------------------
export class CareerPromotionSystem {
  public state: CareerState = {
    currentTrack: "tech_internet",
    currentRankId: "tech_p5",
    yearsInCurrentRank: 0,
    totalWorkYears: 0,
    currentPerformanceScore: 65,
    lastYearPerformanceGrade: "B",
    politicalIntegrity: 80,
    professionalTitle: "none",
    workStress: 20,
  };

  /**
   * 初始化职业状态
   */
  constructor(track?: CareerTrack, rankId?: string) {
    if (track) this.state.currentTrack = track;
    if (rankId && CAREER_RANKS_DATABASE[rankId]) {
      this.state.currentRankId = rankId;
    } else {
      this.setDefaultRank(this.state.currentTrack);
    }
  }

  /**
   * 根据路线设置默认初始职级
   */
  public setDefaultRank(track: CareerTrack): void {
    this.state.currentTrack = track;
    switch (track) {
      case "government":
        this.state.currentRankId = "gov_clerk";
        break;
      case "state_owned":
        this.state.currentRankId = "so_intern_engineer";
        break;
      case "tech_internet":
        this.state.currentRankId = "tech_p5";
        break;
      case "entrepreneur":
        this.state.currentRankId = "ent_self_employed";
        this.state.companyValuationYuan = 100000;
        this.state.annualRevenueYuan = 120000;
        this.state.employeeCount = 2;
        this.state.fundingRound = "self";
        break;
    }
    this.state.yearsInCurrentRank = 0;
    this.state.currentPerformanceScore = 65;
  }

  /**
   * 获取当前职级详情
   */
  public getCurrentRank(): CareerRankDefinition {
    return CAREER_RANKS_DATABASE[this.state.currentRankId] || CAREER_RANKS_DATABASE["tech_p5"];
  }

  /**
   * 获取下一个可晋升的职级
   */
  public getNextRank(): CareerRankDefinition | null {
    const current = this.getCurrentRank();
    const trackRanks = Object.values(CAREER_RANKS_DATABASE)
      .filter((r) => r.track === current.track)
      .sort((a, b) => a.level - b.level);

    const nextIndex = trackRanks.findIndex((r) => r.id === current.id) + 1;
    return nextIndex < trackRanks.length ? trackRanks[nextIndex] : null;
  }

  /**
   * 执行季度职场行动
   */
  public performQuarterAction(actionId: string, playerCash: number): {
    success: boolean;
    costCash: number;
    costEnergy: number;
    msg: string;
  } {
    const act = CAREER_WORK_ACTIONS.find((a) => a.id === actionId);
    if (!act) {
      return { success: false, costCash: 0, costEnergy: 0, msg: "未找到该行动！" };
    }

    if (playerCash < act.costCash) {
      return { success: false, costCash: 0, costEnergy: 0, msg: `资金不足，需要 ¥${act.costCash} 元！` };
    }

    // 增加绩效与属性
    this.state.currentPerformanceScore = Math.min(100, this.state.currentPerformanceScore + act.performanceGain);
    this.state.workStress = Math.max(0, Math.min(100, this.state.workStress + act.stressGain));

    let extraMsg = "";
    if (this.state.currentTrack === "entrepreneur" && act.id === "biz_pitch_investment") {
      if (this.state.annualRevenueYuan) {
        this.state.annualRevenueYuan = Math.round(this.state.annualRevenueYuan * 1.25);
      }
      if (this.state.companyValuationYuan) {
        this.state.companyValuationYuan = Math.round(this.state.companyValuationYuan * 1.30);
      }
      extraMsg = " 🏢 业务大获成功，公司营收与估值显著攀升！";
    }

    return {
      success: true,
      costCash: act.costCash,
      costEnergy: act.costEnergy,
      msg: `【${act.name}】执行完毕！绩效 +${act.performanceGain}分，职场压力 ${act.stressGain >= 0 ? "+" + act.stressGain : act.stressGain}。${extraMsg}`,
    };
  }

  /**
   * 年度绩效结算 (在每年 Q4 结算时触发)
   */
  public settleAnnualPerformance(): {
    grade: "S" | "A" | "B" | "C" | "D";
    score: number;
    bonusMultiplier: number;
    evaluationText: string;
  } {
    const score = this.state.currentPerformanceScore;
    let grade: "S" | "A" | "B" | "C" | "D" = "B";
    let bonusMultiplier = 1.0;
    let evaluationText = "";

    if (score >= 90) {
      grade = "S";
      bonusMultiplier = 1.8;
      evaluationText = "【卓越顶尖 (S / 3.75+)】在年度重大战役中建立奇功，获得全组织极高赞誉与特等奖金！";
    } else if (score >= 80) {
      grade = "A";
      bonusMultiplier = 1.3;
      evaluationText = "【超出预期 (A / 3.5)】业务表现卓越，圆满达成年度各项战略考核指标。";
    } else if (score >= 65) {
      grade = "B";
      bonusMultiplier = 1.0;
      evaluationText = "【符合预期 (B / 3.25)】稳健完成岗位既定日常职责，表现中规中矩。";
    } else if (score >= 50) {
      grade = "C";
      bonusMultiplier = 0.5;
      evaluationText = "【亟待改进 (C / 3.0)】部分考核指标落后，被主管列入季度改进计划 (PIP)。";
    } else {
      grade = "D";
      bonusMultiplier = 0.0;
      evaluationText = "【考核不合格 (D)】严重落后，面临降职淘汰或组织优化风险。";
    }

    this.state.lastYearPerformanceGrade = grade;
    this.state.yearsInCurrentRank += 1;
    this.state.totalWorkYears += 1;
    // 重置下一年绩效分至基准 60 分
    this.state.currentPerformanceScore = 60;

    return { grade, score, bonusMultiplier, evaluationText };
  }

  /**
   * 发起职级晋升考核评审
   */
  public evaluatePromotion(playerStats: {
    intelligence: number;
    charm: number;
    health: number;
    cashYuan: number;
  }): PromotionEvaluationResult {
    const current = this.getCurrentRank();
    const target = this.getNextRank();

    if (!target) {
      return {
        success: false,
        type: "deferred",
        previousRank: current,
        targetRank: current,
        score: 100,
        scoreBreakdown: { performanceScore: 30, seniorityScore: 25, abilityScore: 25, networkScore: 10, titleScore: 10 },
        narrative: `您已达到【${current.title}】的职业荣誉巅峰，功勋卓著，无需再行晋升！`,
        unlockedPrivileges: ["行业泰斗终身荣誉", "最高级别薪资待遇"],
      };
    }

    // 1. 绩效得分 (满分 30)
    let performanceScore = 0;
    if (this.state.lastYearPerformanceGrade === "S") performanceScore = 30;
    else if (this.state.lastYearPerformanceGrade === "A") performanceScore = 24;
    else if (this.state.lastYearPerformanceGrade === "B") performanceScore = 15;
    else if (this.state.lastYearPerformanceGrade === "C") performanceScore = 5;
    else performanceScore = 0;

    // 2. 资历年限得分 (满分 25)
    let seniorityScore = Math.min(25, Math.round((this.state.yearsInCurrentRank / Math.max(1, target.minYearsRequired)) * 25));

    // 3. 智力/业务能力得分 (满分 20)
    let abilityScore = Math.min(20, Math.round((playerStats.intelligence / target.minIntelligence) * 20));

    // 4. 情商与人脉得分 (满分 15)
    let networkScore = Math.min(15, Math.round((playerStats.charm / target.minCharm) * 15));

    // 5. 职称/硬性资质加分 (满分 10)
    let titleScore = 0;
    if (this.state.professionalTitle === "fellow") titleScore = 10;
    else if (this.state.professionalTitle === "senior") titleScore = 8;
    else if (this.state.professionalTitle === "intermediate") titleScore = 5;
    else if (this.state.professionalTitle === "junior") titleScore = 2;

    // 针对创业路线特殊考核资金储备
    if (target.track === "entrepreneur" && target.minCashRequired) {
      if (playerStats.cashYuan < target.minCashRequired) {
        return {
          success: false,
          type: "deferred",
          previousRank: current,
          targetRank: target,
          score: 40,
          scoreBreakdown: { performanceScore, seniorityScore, abilityScore, networkScore, titleScore },
          narrative: `企业规模扩张资金不足！晋升至【${target.title}】需要自有周转资金储备 ¥${target.minCashRequired.toLocaleString()} 元（当前仅 ¥${playerStats.cashYuan.toLocaleString()} 元）。`,
          unlockedPrivileges: [],
        };
      }
    }

    const totalScore = performanceScore + seniorityScore + abilityScore + networkScore + titleScore;

    // 破格提拔判定：绩效连续S且能力超群，即使年限不足也可破格
    if (this.state.lastYearPerformanceGrade === "S" && abilityScore >= 18 && totalScore >= 78) {
      this.state.currentRankId = target.id;
      this.state.yearsInCurrentRank = 0;
      return {
        success: true,
        type: "fast_tracked",
        previousRank: current,
        targetRank: target,
        score: totalScore,
        scoreBreakdown: { performanceScore, seniorityScore, abilityScore, networkScore, titleScore },
        narrative: `⚡【破格提拔公示】鉴于您在重大关键战役中的卓越贡献与过硬能力，组织决定打破资历年限常规，破格提拔您晋升为【${target.title}】！`,
        unlockedPrivileges: [
          `基础月薪提升至 ¥${target.baseMonthlySalary.toLocaleString()} 元`,
          `社会威望提升至 +${target.prestige} 点`,
          `年终奖提高至 ${target.yearEndBonusMonths} 个月`,
          target.stockOptionsAnnualYuan > 0 ? `获得年化股权期权分红 ¥${target.stockOptionsAnnualYuan.toLocaleString()} 元` : "享受专属专车与行政待遇",
        ],
      };
    }

    // 常规晋升判定：总分>=70 且年限达到基本门槛
    if (totalScore >= 70 && this.state.yearsInCurrentRank >= target.minYearsRequired) {
      this.state.currentRankId = target.id;
      this.state.yearsInCurrentRank = 0;
      return {
        success: true,
        type: "promoted",
        previousRank: current,
        targetRank: target,
        score: totalScore,
        scoreBreakdown: { performanceScore, seniorityScore, abilityScore, networkScore, titleScore },
        narrative: `🎉【正式任命】经党委/高管委员会综合民主测评与答辩评审，您的综合得分为 ${totalScore} 分，成功晋升为【${target.title}】！`,
        unlockedPrivileges: [
          `基础月薪提升至 ¥${target.baseMonthlySalary.toLocaleString()} 元`,
          `社会威望提升至 +${target.prestige} 点`,
          `社保缴纳基数提高至 ¥${target.socialInsuranceBase.toLocaleString()} 元`,
          `年终奖标准提升至 ${target.yearEndBonusMonths} 个月`,
        ],
      };
    }

    // 晋升暂缓
    return {
      success: false,
      type: "deferred",
      previousRank: current,
      targetRank: target,
      score: totalScore,
      scoreBreakdown: { performanceScore, seniorityScore, abilityScore, networkScore, titleScore },
      narrative: `【评审结果：暂缓晋升】评审委员会综合得分为 ${totalScore} 分（合格线 70 分，当前在职年限 ${this.state.yearsInCurrentRank}/${target.minYearsRequired} 年）。需进一步在业绩攻坚与人脉能力上继续沉淀。`,
      unlockedPrivileges: [],
    };
  }

  /**
   * 考取职称评定
   */
  public applyProfessionalTitle(targetLevel: ProfessionalTitleLevel, playerIntelligence: number, playerCash: number): {
    success: boolean;
    costCash: number;
    msg: string;
  } {
    const target = PROFESSIONAL_TITLES[targetLevel];
    if (!target || targetLevel === "none") {
      return { success: false, costCash: 0, msg: "无效的职称类型！" };
    }

    const feeMap: Record<ProfessionalTitleLevel, number> = {
      none: 0,
      junior: 800,
      intermediate: 2000,
      senior: 5000,
      fellow: 12000,
    };
    const intelMap: Record<ProfessionalTitleLevel, number> = {
      none: 0,
      junior: 50,
      intermediate: 65,
      senior: 80,
      fellow: 92,
    };

    const fee = feeMap[targetLevel];
    const requiredIntel = intelMap[targetLevel];

    if (playerCash < fee) {
      return { success: false, costCash: 0, msg: `报考与评审费用不足，需要 ¥${fee} 元！` };
    }

    if (playerIntelligence < requiredIntel) {
      return { success: false, costCash: fee, msg: `评审未通过！该级别职称要求智力/专业能力达到 ${requiredIntel}（当前 ${playerIntelligence}）。` };
    }

    this.state.professionalTitle = targetLevel;
    return {
      success: true,
      costCash: fee,
      msg: `🎖️ 恭喜！您已成功通过人社部评审，正式取得【${target.name}】！威望 +${target.bonusPrestige}，薪资倍率提升至 ${target.salaryMultiplier}x！`,
    };
  }

  /**
   * 切换职业路线 (下海创业/考公/跳槽)
   */
  public switchCareerTrack(newTrack: CareerTrack, playerCash: number): {
    success: boolean;
    msg: string;
  } {
    if (newTrack === this.state.currentTrack) {
      return { success: false, msg: "您已在该职业路线中！" };
    }

    if (newTrack === "entrepreneur" && playerCash < 20000) {
      return { success: false, msg: "下海自主创业需要至少 ¥20,000 元启动资金！" };
    }

    this.setDefaultRank(newTrack);
    const rank = this.getCurrentRank();
    return {
      success: true,
      msg: `🎯 成功转型为【${rank.title}】！开启全新的人生奋斗篇章！`,
    };
  }
}
