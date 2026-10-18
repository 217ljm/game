/**
 * 高中分科与高考系统契约 (Gaokao Contracts)
 *
 * 规范标准：中国传统文理分科大考制（满分 750 分）
 * - 语文：150 分
 * - 数学：150 分（分文科数学与理科数学）
 * - 英语：150 分
 * - 综合：300 分
 *   * 理科综合（300 分）：物理 110 分、化学 100 分、生物 90 分
 *   * 文科综合（300 分）：思想政治 100 分、历史 100 分、地理 100 分
 */

/** 高中选科类型 */
export type GaokaoTrack = "science" | "arts";

/** 学科分类 */
export type SubjectKey =
  | "chinese"
  | "math"
  | "english"
  | "physics"
  | "chemistry"
  | "biology"
  | "history"
  | "politics"
  | "geography";

/** 各科目满分定义 */
export const GAOKAO_SUBJECT_MAX_SCORES = {
  chinese: 150,
  math: 150,
  english: 150,
  // 理综满分 300
  science_comprehensive: 300,
  physics: 110,
  chemistry: 100,
  biology: 90,
  // 文综满分 300
  arts_comprehensive: 300,
  politics: 100,
  history: 100,
  geography: 100,
  // 全卷满分 750
  total: 750,
} as const;

/** 题目难度等级 */
export type QuestionDifficulty = "foundation" | "medium" | "hard";

/** 试题分类（涵盖文理科专属数学与综合科目） */
export type ExamQuestionSubject =
  | "chinese"
  | "math_arts"
  | "math_science"
  | "english"
  | "physics"
  | "chemistry"
  | "biology"
  | "history"
  | "politics"
  | "geography";

/** 学术真题数据结构（严禁网络烂梗，严格高考考纲标准） */
export interface GaokaoQuestion {
  /** 试题唯一ID */
  id: string;
  /** 所属学科 */
  subject: ExamQuestionSubject;
  /** 具体知识模块考点 */
  subTopic: string;
  /** 题干（学术严密，提供完整语境与已知条件） */
  stem: string;
  /** 四个选项 A, B, C, D */
  options: [string, string, string, string];
  /** 正确答案索引 (0: A, 1: B, 2: C, 3: D) */
  correctIndex: 0 | 1 | 2 | 3;
  /** 名师详尽解析（公式推导/历史因果/语法逻辑/考点解构） */
  analysis: string;
  /** 难度系数分级 */
  difficulty: QuestionDifficulty;
  /** 适用分科 */
  applicableTrack: "both" | "arts" | "science";
  /** 本题卷面对应分值权重 */
  scoreWeight: number;
}

/** 学生平时学科基础储备（平时功底累计，0~100 分制） */
export interface AcademicFoundation {
  chinese: number;
  math: number;
  english: number;
  physics: number;
  chemistry: number;
  biology: number;
  history: number;
  politics: number;
  geography: number;
  /** 学习专注力与心理素质（抗压与考场发挥稳定性，0~100） */
  stability: number;
}

/** 模拟考与大考类型 */
export type ExamSessionType = "mock_1" | "mock_2" | "mock_3" | "gaokao";

/** 考卷结构 */
export interface GaokaoPaper {
  sessionId: string;
  sessionType: ExamSessionType;
  sessionName: string;
  track: GaokaoTrack;
  year: number;
  chineseQuestions: GaokaoQuestion[];
  mathQuestions: GaokaoQuestion[];
  englishQuestions: GaokaoQuestion[];
  comprehensiveQuestions: GaokaoQuestion[];
  totalQuestionCount: number;
}

/** 单科作答记录 */
export interface SubjectAnswerRecord {
  subject: ExamQuestionSubject;
  questionId: string;
  selectedOption: number;
  isCorrect: boolean;
  scoreEarned: number;
  maxScore: number;
}

/** 考场整卷答题卡提交 */
export interface ExamAnswerSheet {
  sessionId: string;
  candidateName: string;
  track: GaokaoTrack;
  answers: Record<string, number>; // questionId -> selectedOption (0..3)
}

/** 综合科目详细单科小分 */
export interface ComprehensiveDetailScores {
  sub1: { name: string; score: number; maxScore: number }; // 物理(110) 或 历史(100)
  sub2: { name: string; score: number; maxScore: number }; // 化学(100) 或 政治(100)
  sub3: { name: string; score: number; maxScore: number }; // 生物(90)  或 地理(100)
}

/** 最终高考/模拟考成绩单 */
export interface GaokaoScoreReport {
  sessionId: string;
  sessionName: string;
  candidateName: string;
  track: GaokaoTrack;
  chineseScore: number; // 满分 150
  mathScore: number; // 满分 150
  englishScore: number; // 满分 150
  comprehensiveScore: number; // 满分 300
  comprehensiveDetail: ComprehensiveDetailScores;
  totalScore: number; // 满分 750
  provinceRank: number; // 全省同科类名次位次
  totalCandidatesInProvince: number; // 全省考生基数（如 650,000）
  percentileRank: number; // 前百分之几（如 0.08% 表示全省前万分之八）
  eligibleTier: UniversityTier; // 最高可冲刺梯度
  evaluationComment: string; // 招生考试院官方评语
}

/** 大学录取批次与梯度 */
export type UniversityTier =
  | "c9_top" // 清华北大
  | "east_china_5" // 华东五校
  | "top_985" // 一流985
  | "mid_985" // 中坚985
  | "key_211" // 骨干优质211
  | "regular_first_tier" // 省属重点一本
  | "second_tier" // 公办普通二本
  | "vocational"; // 专科高职

/** 大学与特色优势学科 */
export interface UniversityProfile {
  id: string;
  name: string;
  tier: UniversityTier;
  tierDisplayName: string;
  location: string;
  motto: string; // 校训
  minScienceScore: number; // 理科参考最低投档分 (750分制)
  minArtsScore: number; // 文科参考最低投档分 (750分制)
  minRankPercentile: number; // 最低全省位次百分比要求 (如 0.1% = 0.001)
  majors: {
    name: string;
    category: "science" | "arts" | "both";
    isElite: boolean; // 是否为王牌王牌专业（如姚班、元培、华西口腔等）
    minScoreOffset: number; // 该专业录取相较于学校投档线的溢价分
    description: string;
  }[];
}

/** 考生志愿填报记录 */
export interface VolunteerSubmission {
  candidateName: string;
  track: GaokaoTrack;
  firstChoice: { universityId: string; majorName: string };
  secondChoice: { universityId: string; majorName: string };
  thirdChoice: { universityId: string; majorName: string };
  obeyAdjustment: boolean; // 是否服从校内专业调剂
}

/** 最终高等学校录取通知书 */
export interface GaokaoAdmissionLetter {
  candidateName: string;
  admissionNo: string; // 录取通知书编号（如 2026-GK-9850123）
  universityName: string;
  tierDisplayName: string;
  collegeName: string; // 学院名称（如 交叉信息研究院、光华管理学院）
  majorName: string; // 录取专业
  enrollmentYear: number;
  presidentSignature: string; // 校长签发
  welcomeMessage: string; // 校训与录取寄语
  reportDate: string; // 报到日期
  congratulationCouplet: [string, string]; // 喜报对联
}
