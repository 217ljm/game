/**
 * 真实高考核心引擎 (Gaokao Engine)
 *
 * 核心功能：
 * 1. 高二文理分科仪式 (Track Decision Ceremony)
 * 2. 模拟考与高考考卷确定性组卷生成 (Paper Generation)
 * 3. 双轨制严密评卷模型 (平时学科功底 55% + 考场真题表现 45% = 满分 750)
 * 4. 全省位次与考分排位计算模型 (省级大考基数确定性偏态分布映射)
 * 5. 志愿梯度录取引擎 (清北/华五/985/211/一本/二本/专科平行志愿)
 * 6. 录取通知书生成与官方评语
 */

import {
  GAOKAO_SUBJECT_MAX_SCORES,
  type AcademicFoundation,
  type ExamAnswerSheet,
  type ExamSessionType,
  type GaokaoAdmissionLetter,
  type GaokaoPaper,
  type GaokaoQuestion,
  type GaokaoScoreReport,
  type GaokaoTrack,
  type UniversityProfile,
  type UniversityTier,
  type VolunteerSubmission,
} from "./gaokao-contracts.ts";
import { GAOKAO_QUESTION_BANK } from "./gaokao-question-bank.ts";

/**
 * 确定性伪随机数发生器 (LCG 算法)
 * 保证同一随机种子下生成的试卷和模拟结果 100% 可重现、确定性
 */
export class DeterministicRNG {
  private seed: number;

  constructor(seed: number = 19780607) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  public nextFloat(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  public nextInt(min: number, max: number): number {
    return Math.floor(min + this.nextFloat() * (max - min + 1));
  }
}

/** 全国高校梯度全真数据库 (涵盖清北华五顶尖名校至专科) */
export const UNIVERSITIES_DATABASE: UniversityProfile[] = [
  // ----------------------------------------------------
  // 1. C9 顶尖清北联盟 (理科 690+ / 文科 665+)
  // ----------------------------------------------------
  {
    id: "tsinghua_univ",
    name: "清华大学",
    tier: "c9_top",
    tierDisplayName: "C9顶尖名校 · 清北联盟",
    location: "北京 · 海淀清华园",
    motto: "自强不息，厚德载物",
    minScienceScore: 692,
    minArtsScore: 668,
    minRankPercentile: 0.0003, // 全省前万分之三
    majors: [
      {
        name: "计算机科学实验班 (姚班)",
        category: "science",
        isElite: true,
        minScoreOffset: 8,
        description: "由图灵奖得主姚期智院士创办，致力于培养世界顶尖计算机科学家与算法大师。",
      },
      {
        name: "自动化与人工智能",
        category: "science",
        isElite: true,
        minScoreOffset: 5,
        description: "国家重点一级学科，涵盖智能无人系统、脑机接口与大模型控制理论。",
      },
      {
        name: "建筑学",
        category: "both",
        isElite: false,
        minScoreOffset: 1,
        description: "梁思成先生创立，中国现代建筑学殿堂与人居环境设计前沿。",
      },
    ],
  },
  {
    id: "peking_univ",
    name: "北京大学",
    tier: "c9_top",
    tierDisplayName: "C9顶尖名校 · 清北联盟",
    location: "北京 · 海淀燕园",
    motto: "思想自由，兼容并包",
    minScienceScore: 690,
    minArtsScore: 665,
    minRankPercentile: 0.0004,
    majors: [
      {
        name: "元培学院跨学科理科/文科综合班",
        category: "both",
        isElite: true,
        minScoreOffset: 6,
        description: "低年级不分专业，自由选课，跨学科融通培养学术大师与战略科学家。",
      },
      {
        name: "光华管理学院金融经济实验班",
        category: "both",
        isElite: true,
        minScoreOffset: 7,
        description: "中国顶级商科学府，汇聚各省高考文理科状元与未来金融领袖。",
      },
      {
        name: "法学卓越法律人才班",
        category: "arts",
        isElite: true,
        minScoreOffset: 4,
        description: "法学学科泰斗，培养国家立法司法机关骨干与国际法涉外领军人才。",
      },
      {
        name: "中国语言文学系 (汉语言文学)",
        category: "arts",
        isElite: false,
        minScoreOffset: 0,
        description: "百年中文传统，传承国学文脉与现代人文学术根基。",
      },
    ],
  },

  // ----------------------------------------------------
  // 2. 华东五校强校集团 (理科 668+ / 文科 636+)
  // ----------------------------------------------------
  {
    id: "fudan_univ",
    name: "复旦大学",
    tier: "east_china_5",
    tierDisplayName: "华东五校 · 江南科教高地",
    location: "上海 · 杨浦邯郸路",
    motto: "博学而笃志，切问而近思",
    minScienceScore: 673,
    minArtsScore: 642,
    minRankPercentile: 0.0022,
    majors: [
      {
        name: "微电子科学与工程 (国家集成电路拔尖班)",
        category: "science",
        isElite: true,
        minScoreOffset: 5,
        description: "攻坚国家“卡脖子”核心芯片与先进半导体工艺器件研制。",
      },
      {
        name: "基础医学院 (临床医学八年制本博连读)",
        category: "science",
        isElite: true,
        minScoreOffset: 6,
        description: "复旦上医深厚底蕴，直属中山、华山等国家级三甲医院临床规培。",
      },
      {
        name: "国际政治与外交学",
        category: "arts",
        isElite: true,
        minScoreOffset: 3,
        description: "培养全球治理、外交外事与国际智库核心学术骨干。",
      },
      {
        name: "历史学系",
        category: "arts",
        isElite: false,
        minScoreOffset: 0,
        description: "教育部首批拔尖计划基地，扎实考据与现代史学视野。",
      },
    ],
  },
  {
    id: "shanghai_jiaotong_univ",
    name: "上海交通大学",
    tier: "east_china_5",
    tierDisplayName: "华东五校 · 东方工科重镇",
    location: "上海 · 闵行东川路",
    motto: "饮水思源，爱国荣校",
    minScienceScore: 675,
    minArtsScore: 640,
    minRankPercentile: 0.002,
    majors: [
      {
        name: "电子信息类 (IEEE荣誉试点班)",
        category: "science",
        isElite: true,
        minScoreOffset: 6,
        description: "电院荣誉尖兵，主攻高端计算机系统架构与信息通信前沿。",
      },
      {
        name: "船舶与海洋工程",
        category: "science",
        isElite: false,
        minScoreOffset: 0,
        description: "全国排名第一的王牌学科，大国重器航母与深海科考船摇篮。",
      },
      {
        name: "安泰经济与管理学院 (金融学)",
        category: "both",
        isElite: true,
        minScoreOffset: 4,
        description: "亚太顶级商学院之一，深耕国际金融与数字化资产管理。",
      },
    ],
  },
  {
    id: "zhejiang_univ",
    name: "浙江大学",
    tier: "east_china_5",
    tierDisplayName: "华东五校 · 东方剑桥",
    location: "浙江 · 杭州紫金港",
    motto: "求是创新",
    minScienceScore: 668,
    minArtsScore: 636,
    minRankPercentile: 0.0035,
    majors: [
      {
        name: "控制科学与工程",
        category: "science",
        isElite: true,
        minScoreOffset: 4,
        description: "工业控制国家重点实验室依托，高端工业机器人与智能无人控制系统。",
      },
      {
        name: "计算机科学与技术 (竺可桢学院图灵班)",
        category: "science",
        isElite: true,
        minScoreOffset: 6,
        description: "浙大顶尖王牌，培育互联网与新一代人工智能技术开拓者。",
      },
      {
        name: "中国现当代文学",
        category: "arts",
        isElite: false,
        minScoreOffset: 0,
        description: "深厚的人文积淀，培养文化学者与新时代传媒主干。",
      },
    ],
  },
  {
    id: "nanjing_univ",
    name: "南京大学",
    tier: "east_china_5",
    tierDisplayName: "华东五校 · 金陵百年学府",
    location: "江苏 · 南京仙林",
    motto: "诚朴雄伟，励学敦行",
    minScienceScore: 663,
    minArtsScore: 634,
    minRankPercentile: 0.0042,
    majors: [
      {
        name: "物理学院 (物理学拔尖班)",
        category: "science",
        isElite: true,
        minScoreOffset: 5,
        description: "在人工微结构、凝聚态物理领域享有崇高国际声誉。",
      },
      {
        name: "天文学与空间科学",
        category: "science",
        isElite: true,
        minScoreOffset: 3,
        description: "全国天文学科标杆，深度参与国家重大深空探测工程。",
      },
      {
        name: "哲学系 (马克思主义哲学与伦理学)",
        category: "arts",
        isElite: false,
        minScoreOffset: 0,
        description: "曾引领“实践是检验真理的唯一标准”大讨论的人文哲学策源地。",
      },
    ],
  },

  // ----------------------------------------------------
  // 3. 一流 985 高校 (理科 640+ / 文科 615+)
  // ----------------------------------------------------
  {
    id: "renmin_univ",
    name: "中国人民大学",
    tier: "top_985",
    tierDisplayName: "一流985 · 人文社科龙头",
    location: "北京 · 海淀中关村大街",
    motto: "实事求是",
    minScienceScore: 656,
    minArtsScore: 645,
    minRankPercentile: 0.006,
    majors: [
      {
        name: "理论经济学与应用金融",
        category: "both",
        isElite: true,
        minScoreOffset: 5,
        description: "全国A+学科第一，国家宏观经济政策制定与金融学权威摇篮。",
      },
      {
        name: "法学院卓越法律人才班",
        category: "arts",
        isElite: true,
        minScoreOffset: 6,
        description: "中国法学教育的一面旗帜，培养最高法与立法机构栋梁。",
      },
      {
        name: "应用统计学与大数据分析",
        category: "science",
        isElite: false,
        minScoreOffset: 2,
        description: "传统统计第一强系，融合现代机器学习与精算模型。",
      },
    ],
  },
  {
    id: "beihang_univ",
    name: "北京航空航天大学",
    tier: "top_985",
    tierDisplayName: "一流985 · 航空航天国之重器",
    location: "北京 · 海淀学院路",
    motto: "德才兼备，知行合一",
    minScienceScore: 652,
    minArtsScore: 618,
    minRankPercentile: 0.0075,
    majors: [
      {
        name: "飞行器设计与工程",
        category: "science",
        isElite: true,
        minScoreOffset: 5,
        description: "中国航空航天总设计师与大飞机研制核心摇篮。",
      },
      {
        name: "软件工程与网络安全",
        category: "science",
        isElite: true,
        minScoreOffset: 4,
        description: "软件工程A+学科，承接国家级核心操作系统攻关项目。",
      },
      {
        name: "外国语言文学",
        category: "arts",
        isElite: false,
        minScoreOffset: 0,
        description: "结合科技外语与国际工程翻译的应用型人文专业。",
      },
    ],
  },

  // ----------------------------------------------------
  // 4. 中坚 985 高校 (理科 615+ / 文科 590+)
  // ----------------------------------------------------
  {
    id: "sichuan_univ",
    name: "四川大学",
    tier: "mid_985",
    tierDisplayName: "中坚985 · 西南综合巨擘",
    location: "四川 · 成都望江",
    motto: "海纳百川，有容乃大",
    minScienceScore: 622,
    minArtsScore: 602,
    minRankPercentile: 0.022,
    majors: [
      {
        name: "华西口腔医学院 (口腔医学八年制)",
        category: "science",
        isElite: true,
        minScoreOffset: 16,
        description: "享誉全国第一的“华西口腔”，录取线直逼清北顶尖分数线！",
      },
      {
        name: "高分子材料与工程",
        category: "science",
        isElite: false,
        minScoreOffset: 0,
        description: "国家重点学科，高分子材料工程国家重点实验室依托。",
      },
      {
        name: "中国古典文献学",
        category: "arts",
        isElite: false,
        minScoreOffset: 0,
        description: "古典文史研究底蕴厚重，整理巴蜀与国家珍贵古籍文献。",
      },
    ],
  },

  // ----------------------------------------------------
  // 5. 骨干优质 211 院校 (理科 585+ / 文科 565+)
  // ----------------------------------------------------
  {
    id: "bupt_univ",
    name: "北京邮电大学",
    tier: "key_211",
    tierDisplayName: "骨干211 · 信息黄埔",
    location: "北京 · 海淀西土城",
    motto: "厚德博学，敬业乐群",
    minScienceScore: 638,
    minArtsScore: 590,
    minRankPercentile: 0.014,
    majors: [
      {
        name: "通信工程卓越工程师班",
        category: "science",
        isElite: true,
        minScoreOffset: 6,
        description: "信息通信国家重点学科，主导 5G/6G 标准与移动通信技术革新。",
      },
      {
        name: "网络空间安全",
        category: "science",
        isElite: true,
        minScoreOffset: 5,
        description: "国家网络安全学院，守护关键信息基础设施与国防安全。",
      },
      {
        name: "现代邮政管理与数字供应链",
        category: "both",
        isElite: false,
        minScoreOffset: 0,
        description: "邮政行业管理骨干学科，服务现代智慧物流与数字经济。",
      },
    ],
  },
  {
    id: "cufe_univ",
    name: "中央财经大学",
    tier: "key_211",
    tierDisplayName: "骨干211 · 财经黄埔",
    location: "北京 · 海淀学院南路",
    motto: "忠诚、团结、求实、创新",
    minScienceScore: 630,
    minArtsScore: 615,
    minRankPercentile: 0.018,
    majors: [
      {
        name: "金融学 (国际金融与金融科技)",
        category: "both",
        isElite: true,
        minScoreOffset: 5,
        description: "金融业核心人脉网络与商业银行/券商/基金首选目标校。",
      },
      {
        name: "会计学 (注册会计师专门化方向)",
        category: "both",
        isElite: true,
        minScoreOffset: 4,
        description: "国家级特色专业，四大会计师事务所与央企财务总监摇篮。",
      },
      {
        name: "财政学",
        category: "arts",
        isElite: false,
        minScoreOffset: 0,
        description: "财政部直属原班底，税务与财政收支管理专业标杆。",
      },
    ],
  },

  // ----------------------------------------------------
  // 6. 省属重点一本大学 (理科 540+ / 文科 525+)
  // ----------------------------------------------------
  {
    id: "provincial_polytech",
    name: "省属重点工业大学",
    tier: "regular_first_tier",
    tierDisplayName: "省属重点一本 · 工业骨干",
    location: "省会 · 高新大学城",
    motto: "笃实励新，工程报国",
    minScienceScore: 540,
    minArtsScore: 525,
    minRankPercentile: 0.12,
    majors: [
      {
        name: "机械电子工程",
        category: "science",
        isElite: true,
        minScoreOffset: 3,
        description: "省重点学科，紧密对接区域先进制造业与数控自动化产线。",
      },
      {
        name: "计算机科学与技术",
        category: "science",
        isElite: false,
        minScoreOffset: 2,
        description: "实用型软件研发与互联网系统运维中坚力量。",
      },
      {
        name: "国际经济与贸易",
        category: "arts",
        isElite: false,
        minScoreOffset: 0,
        description: "服务外向型经济与跨境物流实务的人才培育基地。",
      },
    ],
  },

  // ----------------------------------------------------
  // 7. 普通公办二本大学 (理科 460+ / 文科 445+)
  // ----------------------------------------------------
  {
    id: "city_college",
    name: "省立应用技术联合学院",
    tier: "second_tier",
    tierDisplayName: "公办普通本科 · 应用型二本",
    location: "地级市 · 滨江新区",
    motto: "厚德博学，崇实尚用",
    minScienceScore: 460,
    minArtsScore: 445,
    minRankPercentile: 0.35,
    majors: [
      {
        name: "软件工程与应用开发",
        category: "science",
        isElite: false,
        minScoreOffset: 0,
        description: "面向中小企业信息化建设，注重编码与实用技术栈实操。",
      },
      {
        name: "电子商务与现代文秘",
        category: "arts",
        isElite: false,
        minScoreOffset: 0,
        description: "扎根基层政企管理与电商营销服务。",
      },
    ],
  },

  // ----------------------------------------------------
  // 8. 职业技术高等专科 (理科 280+ / 文科 280+)
  // ----------------------------------------------------
  {
    id: "provincial_vocational",
    name: "省全日制职业技术学院",
    tier: "vocational",
    tierDisplayName: "全日制高职专科 · 大国工匠摇篮",
    location: "工业示范区 · 职教园区",
    motto: "精工细作，行稳致远",
    minScienceScore: 280,
    minArtsScore: 280,
    minRankPercentile: 0.75,
    majors: [
      {
        name: "新能源汽车检测与维修技术",
        category: "science",
        isElite: false,
        minScoreOffset: 0,
        description: "校企联合实训基地，掌握动力电池与电控系统维修核心技能。",
      },
      {
        name: "现代物流管理与仓储运营",
        category: "both",
        isElite: false,
        minScoreOffset: 0,
        description: "培养现代智慧物流枢纽调度员与供应链实务人才。",
      },
    ],
  },
];

/**
 * 高考与高中教育模拟系统核心引擎
 */
export class GaokaoEngine {
  private rng: DeterministicRNG;

  constructor(seed: number = 19780607) {
    this.rng = new DeterministicRNG(seed);
  }

  /**
   * 1. 高二文理分科仪式 (Track Decision Ceremony)
   * 根据学生选择的分科与平时各项科目潜能，生成分科决策报告
   */
  public performTrackDecision(
    chosenTrack: GaokaoTrack,
    currentFoundation: AcademicFoundation
  ): {
    track: GaokaoTrack;
    declaration: string;
    focusSubjects: string[];
    recommendedMajors: string[];
  } {
    if (chosenTrack === "science") {
      return {
        track: "science",
        declaration:
          "“格物致知，科技强国！”你毅然选择了理科（物理·化学·生物）。愿你在逻辑的深邃与科学的严谨中探索宇宙的奥秘！",
        focusSubjects: ["语文", "理科数学", "英语", "理科综合 (物理 110、化学 100、生物 90)"],
        recommendedMajors: ["计算机科学", "人工智能", "临床医学", "电子微电子", "航空航天", "物理学"],
      };
    } else {
      return {
        track: "arts",
        declaration:
          "“通古今之变，究天人之际！”你坚定选择了文科（历史·政治·地理）。愿你在历史的沉思与人性的温情中书写时代的华章！",
        focusSubjects: ["语文", "文科数学", "英语", "文科综合 (政治 100、历史 100、地理 100)"],
        recommendedMajors: ["理论经济学与金融", "法学卓越人才班", "新闻传播学", "国际政治", "中国古典文献学"],
      };
    }
  }

  /**
   * 2. 全科考卷确定性生成 (Exam Paper Generation)
   * 依据文理科分类，从严谨真题库中抽取标准题卷
   */
  public generateExamPaper(
    track: GaokaoTrack,
    sessionType: ExamSessionType = "gaokao",
    year: number = 2026
  ): GaokaoPaper {
    const sessionNames: Record<ExamSessionType, string> = {
      mock_1: "普通高中高三第一学期全省统考 (一模)",
      mock_2: "普通高中高三高强度攻坚诊断考 (二模)",
      mock_3: "普通高中高考考前适应性模拟考 (三模)",
      gaokao: "中华人民共和国普通高等学校招生全国统一考试 (全国卷)",
    };

    // 语文题目（通用）
    const chineseQuestions = GAOKAO_QUESTION_BANK.filter(
      (q) => q.subject === "chinese"
    );

    // 数学题目（区分文数与理数）
    const mathSubject = track === "science" ? "math_science" : "math_arts";
    const mathQuestions = GAOKAO_QUESTION_BANK.filter(
      (q) => q.subject === mathSubject
    );

    // 英语题目（通用）
    const englishQuestions = GAOKAO_QUESTION_BANK.filter(
      (q) => q.subject === "english"
    );

    // 综合科目题目（理科抽取物化生，文科抽取史政地）
    let comprehensiveQuestions: GaokaoQuestion[] = [];
    if (track === "science") {
      comprehensiveQuestions = GAOKAO_QUESTION_BANK.filter((q) =>
        ["physics", "chemistry", "biology"].includes(q.subject)
      );
    } else {
      comprehensiveQuestions = GAOKAO_QUESTION_BANK.filter((q) =>
        ["history", "politics", "geography"].includes(q.subject)
      );
    }

    const totalQuestionCount =
      chineseQuestions.length +
      mathQuestions.length +
      englishQuestions.length +
      comprehensiveQuestions.length;

    return {
      sessionId: `${sessionType}_${year}_${track}`,
      sessionType,
      sessionName: sessionNames[sessionType],
      track,
      year,
      chineseQuestions,
      mathQuestions,
      englishQuestions,
      comprehensiveQuestions,
      totalQuestionCount,
    };
  }

  /**
   * 3. 双轨制科学算分模型 (Scoring Model)
   * 单科最终得分 = 基础功底积累 (55%) + 考场真题实操得分 (45%)
   * 严格按照标准高考满分制（语150、数150、英150、综300，全卷750）
   */
  public evaluateExamResults(
    paper: GaokaoPaper,
    answerSheet: ExamAnswerSheet,
    foundation: AcademicFoundation
  ): GaokaoScoreReport {
    // 1. 语文计算 (150 分)
    const chineseScore = this.calcSubjectScore(
      paper.chineseQuestions,
      answerSheet.answers,
      foundation.chinese,
      GAOKAO_SUBJECT_MAX_SCORES.chinese,
      foundation.stability
    );

    // 2. 数学计算 (150 分)
    const mathScore = this.calcSubjectScore(
      paper.mathQuestions,
      answerSheet.answers,
      foundation.math,
      GAOKAO_SUBJECT_MAX_SCORES.math,
      foundation.stability
    );

    // 3. 英语计算 (150 分)
    const englishScore = this.calcSubjectScore(
      paper.englishQuestions,
      answerSheet.answers,
      foundation.english,
      GAOKAO_SUBJECT_MAX_SCORES.english,
      foundation.stability
    );

    // 4. 综合科目与单科小分计算 (300 分)
    let compSub1Score = 0;
    let compSub2Score = 0;
    let compSub3Score = 0;
    let compDetail: GaokaoScoreReport["comprehensiveDetail"];

    if (paper.track === "science") {
      // 物理 (110 分)
      const phyQs = paper.comprehensiveQuestions.filter((q) => q.subject === "physics");
      compSub1Score = this.calcSubjectScore(
        phyQs,
        answerSheet.answers,
        foundation.physics,
        GAOKAO_SUBJECT_MAX_SCORES.physics,
        foundation.stability
      );
      // 化学 (100 分)
      const chemQs = paper.comprehensiveQuestions.filter((q) => q.subject === "chemistry");
      compSub2Score = this.calcSubjectScore(
        chemQs,
        answerSheet.answers,
        foundation.chemistry,
        GAOKAO_SUBJECT_MAX_SCORES.chemistry,
        foundation.stability
      );
      // 生物 (90 分)
      const bioQs = paper.comprehensiveQuestions.filter((q) => q.subject === "biology");
      compSub3Score = this.calcSubjectScore(
        bioQs,
        answerSheet.answers,
        foundation.biology,
        GAOKAO_SUBJECT_MAX_SCORES.biology,
        foundation.stability
      );

      compDetail = {
        sub1: { name: "物理", score: compSub1Score, maxScore: GAOKAO_SUBJECT_MAX_SCORES.physics },
        sub2: { name: "化学", score: compSub2Score, maxScore: GAOKAO_SUBJECT_MAX_SCORES.chemistry },
        sub3: { name: "生物", score: compSub3Score, maxScore: GAOKAO_SUBJECT_MAX_SCORES.biology },
      };
    } else {
      // 历史 (100 分)
      const hisQs = paper.comprehensiveQuestions.filter((q) => q.subject === "history");
      compSub1Score = this.calcSubjectScore(
        hisQs,
        answerSheet.answers,
        foundation.history,
        GAOKAO_SUBJECT_MAX_SCORES.history,
        foundation.stability
      );
      // 政治 (100 分)
      const polQs = paper.comprehensiveQuestions.filter((q) => q.subject === "politics");
      compSub2Score = this.calcSubjectScore(
        polQs,
        answerSheet.answers,
        foundation.politics,
        GAOKAO_SUBJECT_MAX_SCORES.politics,
        foundation.stability
      );
      // 地理 (100 分)
      const geoQs = paper.comprehensiveQuestions.filter((q) => q.subject === "geography");
      compSub3Score = this.calcSubjectScore(
        geoQs,
        answerSheet.answers,
        foundation.geography,
        GAOKAO_SUBJECT_MAX_SCORES.geography,
        foundation.stability
      );

      compDetail = {
        sub1: { name: "历史", score: compSub1Score, maxScore: GAOKAO_SUBJECT_MAX_SCORES.history },
        sub2: { name: "思想政治", score: compSub2Score, maxScore: GAOKAO_SUBJECT_MAX_SCORES.politics },
        sub3: { name: "地理", score: compSub3Score, maxScore: GAOKAO_SUBJECT_MAX_SCORES.geography },
      };
    }

    const comprehensiveScore = compSub1Score + compSub2Score + compSub3Score;
    const totalScore = Math.min(
      GAOKAO_SUBJECT_MAX_SCORES.total,
      chineseScore + mathScore + englishScore + comprehensiveScore
    );

    // 5. 全省位次与前百分比计算
    const totalCandidatesInProvince = 650000; // 标准高考大省 65 万同科类考生基数
    const { provinceRank, percentileRank } = this.calculateProvinceRank(
      totalScore,
      paper.track,
      totalCandidatesInProvince
    );

    // 6. 最高可达志愿批次判断
    const eligibleTier = this.determineEligibleTier(totalScore, paper.track);

    // 7. 招生考试院官方评语生成
    const evaluationComment = this.generateOfficialComment(totalScore, provinceRank, eligibleTier);

    return {
      sessionId: paper.sessionId,
      sessionName: paper.sessionName,
      candidateName: answerSheet.candidateName,
      track: paper.track,
      chineseScore,
      mathScore,
      englishScore,
      comprehensiveScore,
      comprehensiveDetail: compDetail,
      totalScore,
      provinceRank,
      totalCandidatesInProvince,
      percentileRank,
      eligibleTier,
      evaluationComment,
    };
  }

  /** 单科得分计算辅助逻辑 */
  private calcSubjectScore(
    questions: GaokaoQuestion[],
    userAnswers: Record<string, number>,
    foundationValue: number, // 0~100
    subjectMax: number,
    stability: number // 0~100
  ): number {
    if (questions.length === 0) {
      // 容错退化（若无题目直接依基础折算）
      return Math.round((foundationValue / 100) * subjectMax);
    }

    // 考场做题得分率计算 (0~1)
    let totalQuestions = questions.length;
    let correctCount = 0;
    for (const q of questions) {
      if (userAnswers[q.id] === q.correctIndex) {
        correctCount += 1;
      }
    }
    const examAccuracy = correctCount / totalQuestions;

    // 平时功底掌握度 (0~1)
    const foundationRatio = Math.min(1.0, Math.max(0.0, foundationValue / 100));

    // 稳定性对发挥的影响 (稳定性 80+ 带来微弱正向发挥增益)
    const stabilityBonus = ((stability - 50) / 100) * 0.04; // -2% ~ +2%

    // 双轨合成比例：平时底蕴 55% + 现场答卷 45% + 稳定性增益
    const combinedRatio = Math.min(
      1.0,
      Math.max(
        0.05,
        foundationRatio * 0.55 + examAccuracy * 0.45 + stabilityBonus
      )
    );

    return Math.min(subjectMax, Math.round(combinedRatio * subjectMax));
  }

  /**
   * 4. 全省位次与名次排位模型 (Province Rank Calculation)
   * 严格基于高考大省 65 万考生的经典分数分布密度进行分段映射
   */
  public calculateProvinceRank(
    totalScore: number,
    track: GaokaoTrack,
    totalCandidates: number = 650000
  ): { provinceRank: number; percentileRank: number } {
    // 文理科在超高分段略有差异（理科高分线通常比文科高 20~25 分）
    const effectiveScore = track === "arts" ? totalScore + 25 : totalScore;

    let provinceRank = 0;
    if (effectiveScore >= 715) {
      // 极顶尖状元档
      provinceRank = Math.max(1, Math.round(15 - (effectiveScore - 715) * 0.5));
    } else if (effectiveScore >= 700) {
      // 700~714 分：全省 16 ~ 50 名 (清北顶尖极高分段，全省前 50)
      const ratio = (715 - effectiveScore) / 15;
      provinceRank = Math.round(16 + ratio * (50 - 16));
    } else if (effectiveScore >= 685) {
      // 685~699 分：全省 51 ~ 550 名 (清北华五高分线)
      const ratio = (700 - effectiveScore) / 15;
      provinceRank = Math.round(51 + ratio * (550 - 51));
    } else if (effectiveScore >= 665) {
      // 665~684 分：全省 551 ~ 2,800 名 (华东五校线)
      const ratio = (685 - effectiveScore) / 20;
      provinceRank = Math.round(551 + ratio * (2800 - 551));
    } else if (effectiveScore >= 635) {
      // 635~664 分：全省 2,801 ~ 13,500 名 (一流985线)
      const ratio = (665 - effectiveScore) / 30;
      provinceRank = Math.round(2801 + ratio * (13500 - 2801));
    } else if (effectiveScore >= 600) {
      // 600~634 分：全省 13,501 ~ 36,000 名 (中坚985/顶尖211线)
      const ratio = (635 - effectiveScore) / 35;
      provinceRank = Math.round(13501 + ratio * (36000 - 13501));
    } else if (effectiveScore >= 550) {
      // 550~599 分：全省 36,001 ~ 92,000 名 (骨干211/一本线)
      const ratio = (600 - effectiveScore) / 50;
      provinceRank = Math.round(36001 + ratio * (92000 - 36001));
    } else if (effectiveScore >= 480) {
      // 480~549 分：全省 92,001 ~ 195,000 名 (省属公办本科线)
      const ratio = (550 - effectiveScore) / 70;
      provinceRank = Math.round(92001 + ratio * (195000 - 92001));
    } else if (effectiveScore >= 400) {
      // 400~479 分：全省 195,001 ~ 340,000 名 (普通二本/民办线)
      const ratio = (480 - effectiveScore) / 80;
      provinceRank = Math.round(195001 + ratio * (340000 - 195001));
    } else if (effectiveScore >= 280) {
      // 280~399 分：全省 340,001 ~ 550,000 名 (专科批)
      const ratio = (400 - effectiveScore) / 120;
      provinceRank = Math.round(340001 + ratio * (550000 - 340001));
    } else {
      // 280 分以下：落榜尾段
      provinceRank = Math.min(
        totalCandidates,
        Math.round(550001 + (280 - effectiveScore) * 350)
      );
    }

    const percentileRank = Number(
      ((provinceRank / totalCandidates) * 100).toFixed(4)
    );

    return { provinceRank, percentileRank };
  }

  /** 判断最高可达梯度批次 */
  public determineEligibleTier(
    totalScore: number,
    track: GaokaoTrack
  ): UniversityTier {
    const isSci = track === "science";
    if (isSci ? totalScore >= 690 : totalScore >= 665) return "c9_top";
    if (isSci ? totalScore >= 665 : totalScore >= 635) return "east_china_5";
    if (isSci ? totalScore >= 640 : totalScore >= 615) return "top_985";
    if (isSci ? totalScore >= 610 : totalScore >= 585) return "mid_985";
    if (isSci ? totalScore >= 580 : totalScore >= 560) return "key_211";
    if (isSci ? totalScore >= 530 : totalScore >= 515) return "regular_first_tier";
    if (isSci ? totalScore >= 450 : totalScore >= 435) return "second_tier";
    return "vocational";
  }

  /** 官方招生办官方评语 */
  private generateOfficialComment(
    totalScore: number,
    rank: number,
    tier: UniversityTier
  ): string {
    if (tier === "c9_top") {
      return `【全省金榜顶尖榜眼】总分 ${totalScore} 分，位列全省第 ${rank} 名！雄踞全省前列，清华大学、北京大学向你敞开顶尖学术圣殿大门！`;
    }
    if (tier === "east_china_5") {
      return `【华东名校栋梁之材】总分 ${totalScore} 分，全省位次第 ${rank} 名！表现极其优异，成功锁定华东五校（复旦/交大/浙大/南大/中科大）顶尖王牌专业！`;
    }
    if (tier === "top_985" || tier === "mid_985") {
      return `【国家重点大学翘楚】总分 ${totalScore} 分，全省排位第 ${rank} 名！扎实的功底铸就一流战绩，稳步入选国家 985 工程重点大学优势拔尖学科！`;
    }
    if (tier === "key_211") {
      return `【行业领军优质学子】总分 ${totalScore} 分，全省名次第 ${rank} 名！成功通过国家 211 工程高水平大学投档线，专业前景广阔！`;
    }
    if (tier === "regular_first_tier") {
      return `【重点一本金榜题名】总分 ${totalScore} 分，顺利跨越省重点本科第一批次投档线，可择优攻读省属龙头大学核心王牌专业！`;
    }
    if (tier === "second_tier") {
      return `【全日制本科圆梦】总分 ${totalScore} 分，成功达到公办普通本科录取控制分数线，学有所成，未来可期！`;
    }
    return `【职业技能深造上线】总分 ${totalScore} 分，达到高等职业专科录取标准，练就大国工匠过硬本领！`;
  }

  /**
   * 5. 志愿梯度录取引擎 (Volunteer Admission Engine)
   * 模拟平行志愿（分数优先、遵循志愿）投档录取
   */
  public processVolunteerAdmission(
    report: GaokaoScoreReport,
    submission: VolunteerSubmission,
    enrollmentYear: number = 2026
  ): GaokaoAdmissionLetter {
    const choices = [
      submission.firstChoice,
      submission.secondChoice,
      submission.thirdChoice,
    ];

    let admittedUniv: UniversityProfile | null = null;
    let admittedMajorName = "";
    let isEliteAdmitted = false;

    // 依序检索各志愿
    for (const choice of choices) {
      const univ = UNIVERSITIES_DATABASE.find((u) => u.id === choice.universityId);
      if (!univ) continue;

      const minScore =
        report.track === "science" ? univ.minScienceScore : univ.minArtsScore;

      // 检查是否达到该校投档线
      if (report.totalScore >= minScore) {
        // 达到学校投档线，检查所填专业
        const targetMajor = univ.majors.find((m) => m.name === choice.majorName);
        const requiredMajorScore = minScore + (targetMajor?.minScoreOffset || 0);

        if (report.totalScore >= requiredMajorScore && targetMajor) {
          // 分数充足，直接录取填报的专业
          admittedUniv = univ;
          admittedMajorName = targetMajor.name;
          isEliteAdmitted = targetMajor.isElite;
          break;
        } else if (submission.obeyAdjustment) {
          // 分数未达该专业但勾选了“服从校内专业调剂”
          // 挑选校内达到分数线的可用专业，或保底专业
          const availableMajors = univ.majors.filter(
            (m) =>
              (m.category === "both" || m.category === report.track) &&
              report.totalScore >= minScore + m.minScoreOffset
          );

          admittedUniv = univ;
          if (availableMajors.length > 0) {
            admittedMajorName = availableMajors[0].name;
            isEliteAdmitted = availableMajors[0].isElite;
          } else {
            // 调剂到校内保底普通专业
            admittedMajorName =
              univ.majors.find((m) => !m.isElite)?.name || univ.majors[0].name;
            isEliteAdmitted = false;
          }
          break;
        }
        // 若不服从调剂且专业分不够，则发生滑档，进入下一个志愿
      }
    }

    // 若填报的三个志愿均未投档，则由省教育考试院兜底投档到对应批次保底高校
    if (!admittedUniv) {
      if (report.eligibleTier === "c9_top" || report.eligibleTier === "east_china_5") {
        admittedUniv = UNIVERSITIES_DATABASE[2]; // 复旦
      } else if (report.eligibleTier === "top_985" || report.eligibleTier === "mid_985") {
        admittedUniv = UNIVERSITIES_DATABASE[7]; // 四川大学
      } else if (report.eligibleTier === "key_211") {
        admittedUniv = UNIVERSITIES_DATABASE[9]; // 中央财大
      } else if (report.eligibleTier === "regular_first_tier") {
        admittedUniv = UNIVERSITIES_DATABASE[10]; // 省属重点一本
      } else if (report.eligibleTier === "second_tier") {
        admittedUniv = UNIVERSITIES_DATABASE[11]; // 二本
      } else {
        admittedUniv = UNIVERSITIES_DATABASE[12]; // 高职专科
      }
      admittedMajorName = admittedUniv.majors[0].name;
    }

    // 构造正式录取通知书
    const admissionNo = `${enrollmentYear}-GK-${admittedUniv.tier.toUpperCase()}-${String(
      report.provinceRank
    ).padStart(6, "0")}`;

    const collegeName = this.getCollegeDepartmentName(admittedUniv, admittedMajorName);

    const couplet: [string, string] = isEliteAdmitted
      ? ["十年寒窗磨利剑，今朝出鞘动九州", "金榜题名登绝顶，丹心报国写春秋"]
      : ["书山有路勤为径，学海无涯苦作舟", "鲲鹏展翅乘风起，前程似锦壮志酬"];

    return {
      candidateName: report.candidateName,
      admissionNo,
      universityName: admittedUniv.name,
      tierDisplayName: admittedUniv.tierDisplayName,
      collegeName,
      majorName: admittedMajorName,
      enrollmentYear,
      presidentSignature: `${admittedUniv.name} 校长`,
      welcomeMessage: `热烈祝贺你被${admittedUniv.name}正式录取！校训“${admittedUniv.motto}”将引领你开启追求真理与人生理想的崭新征程。`,
      reportDate: `${enrollmentYear}年9月1日~9月3日`,
      congratulationCouplet: couplet,
    };
  }

  /** 获取专业对应的院系名称 */
  private getCollegeDepartmentName(
    univ: UniversityProfile,
    majorName: string
  ): string {
    if (majorName.includes("计算机") || majorName.includes("姚班")) {
      return "交叉信息研究院 / 计算机系";
    }
    if (majorName.includes("人工智能") || majorName.includes("自动化")) {
      return "自动化与智能科学系";
    }
    if (majorName.includes("金融") || majorName.includes("经济") || majorName.includes("管理")) {
      return "经济与管理学院 / 商学院";
    }
    if (majorName.includes("法学")) {
      return "法学院";
    }
    if (majorName.includes("医")) {
      return "医学院 / 华西口腔医学院";
    }
    if (majorName.includes("通信") || majorName.includes("电子信息")) {
      return "信息与通信工程学院";
    }
    if (majorName.includes("物理") || majorName.includes("天文")) {
      return "物理与空间科学学院";
    }
    if (majorName.includes("建筑")) {
      return "建筑学院";
    }
    if (majorName.includes("航天") || majorName.includes("飞行器")) {
      return "航空航天工程学院";
    }
    return "综合拔尖培养学院";
  }
}
