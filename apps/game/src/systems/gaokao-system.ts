import { AcademicScoreSystem } from "./academic-score-system";
import { EXAM_QUESTION_DATABASE, type ExamQuestion } from "./exam-question-bank";

export interface UniversityOption {
  id: string;
  name: string;
  tier: string;
  tierName: string;
  minScore: number;
  majors: string[];
  fameDesc: string;
}

export const UNIVERSITIES_DATABASE: UniversityOption[] = [
  {
    id: "tsinghua_pku",
    name: "北京顶级名校联盟 (清华/北大)",
    tier: "top_985",
    tierName: "C9顶尖名校",
    minScore: 560,
    majors: ["计算机科学与技术", "经济金融实验班", "人工智能与自动化", "临床医学八年制", "法学尖子班"],
    fameDesc: "全国顶尖学府殿堂，未来学者泰斗、国家栋梁与商界领军人摇篮！",
  },
  {
    id: "east_china_five",
    name: "华东五校强校联盟 (浙大/复旦/上交/南大/中科大)",
    tier: "985",
    tierName: "一流985高校",
    minScore: 520,
    majors: ["软件工程与大数据", "金融学与国际贸易", "微电子与集成电路", "临床医学", "电气工程"],
    fameDesc: "江南科教高地，享誉海内外的顶尖一流综合性大学！",
  },
  {
    id: "provincial_key_211",
    name: "国家骨干重点大学 (211工程院校)",
    tier: "211",
    tierName: "省属重点211",
    minScore: 460,
    majors: ["电子信息工程", "机械设计制造", "会计学与财务管理", "汉语言文学", "应用数学"],
    fameDesc: "国家骨干重点大学，行业认可度高，考研与考公优势显著！",
  },
  {
    id: "regular_undergrad",
    name: "省属全日制公办本科大学",
    tier: "regular_1",
    tierName: "普通公立本科",
    minScore: 390,
    majors: ["计算机应用", "国际经济与贸易", "机械制造", "工商管理", "英语教育"],
    fameDesc: "扎实求真，培育各行各业实用型骨干人才。",
  },
  {
    id: "vocational_college",
    name: "省职业技术学院 (全日制专科高职)",
    tier: "college",
    tierName: "高等职业专科",
    minScore: 280,
    majors: ["新能源汽车检测维修", "数控机床与智能制造", "电子商务与直播运营", "现代物流与供应链管理"],
    fameDesc: "强化职业技能与校企合作，动手能力强，毕业即就业！",
  },
];

export class GaokaoManager {
  public questions: ExamQuestion[];
  public currentQuestionIndex: number = 0;
  public userAnswers: number[] = [];
  public phase: "exam" | "score_board" | "volunteer_form" | "admission_letter" = "exam";
  public selectedUniversity: UniversityOption | null = null;
  public selectedMajor: string = "计算机科学与技术";
  public totalScore: number = 0;

  constructor() {
    this.questions = EXAM_QUESTION_DATABASE.filter((q) => q.category === "gaokao").slice(0, 3);
  }

  submitAnswer(optIdx: number, scoreSys: AcademicScoreSystem): boolean {
    this.userAnswers.push(optIdx);
    this.currentQuestionIndex += 1;
    if (this.currentQuestionIndex >= this.questions.length) {
      let correct = 0;
      this.questions.forEach((q, i) => {
        if (this.userAnswers[i] === q.correctIndex) correct += 1;
      });
      scoreSys.setExamBonus("chinese", correct >= 1 ? 25 : 15);
      scoreSys.setExamBonus("math", correct >= 2 ? 28 : 18);
      scoreSys.setExamBonus("comprehensive", correct >= 3 ? 30 : 20);

      this.totalScore = scoreSys.getTotalExamScore();
      this.phase = "score_board";
      return true;
    }
    return false;
  }

  proceedToVolunteer(): void {
    this.phase = "volunteer_form";
  }

  submitVolunteer(uniId: string, major: string): UniversityOption {
    const uni = UNIVERSITIES_DATABASE.find((u) => u.id === uniId) || UNIVERSITIES_DATABASE[3];
    this.selectedUniversity = uni;
    this.selectedMajor = major;
    this.phase = "admission_letter";
    return uni;
  }
}
