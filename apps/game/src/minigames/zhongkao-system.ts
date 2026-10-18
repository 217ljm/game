export interface ZhongkaoQuestion {
  id: string;
  subject: "语文" | "数学" | "物理" | "化学" | "政治" | "历史";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const ZHONGKAO_QUESTIONS_DATABASE: ZhongkaoQuestion[] = [
  {
    id: "zk_yuwen",
    subject: "语文",
    question: "下列文言文名句中，出自范仲淹《岳阳楼记》的千古名句是？",
    options: [
      "A. 先天下之忧而忧，后天下之乐而乐",
      "B. 人生自古谁无死，留取丹心照汗青",
      "C. 落霞与孤鹜齐飞，秋水共长天一色",
      "D. 会当凌绝顶，一览众山小",
    ],
    correctIndex: 0,
    explanation: "范仲淹在《岳阳楼记》中写下“先天下之忧而忧，后天下之乐而乐”，表达忧国忧民的情怀。",
  },
  {
    id: "zk_shuxue",
    subject: "数学",
    question: "已知一元二次方程 x² - 5x + 6 = 0，则该方程的两个实数根分别为？",
    options: ["A. x₁ = 2, x₂ = 3", "B. x₁ = -2, x₂ = -3", "C. x₁ = 1, x₂ = 6", "D. x₁ = -1, x₂ = -6"],
    correctIndex: 0,
    explanation: "十字相乘 (x - 2)(x - 3) = 0，解得两根为 2 和 3。",
  },
  {
    id: "zk_wuli",
    subject: "物理",
    question: "在家庭电路中，电灯与控制它的开关之间的连接方式是？",
    options: ["A. 串联", "B. 并联", "C. 混联", "D. 短路连接"],
    correctIndex: 0,
    explanation: "开关必须与受控用电器串联，才能有效控制电路的通断。",
  },
  {
    id: "zk_huaxue",
    subject: "化学",
    question: "实验室制取氧气时，加热高锰酸钾固体发生的反应类型属于？",
    options: ["A. 分解反应", "B. 化合反应", "C. 置换反应", "D. 复分解反应"],
    correctIndex: 0,
    explanation: "高锰酸钾受热分解生成锰酸钾、二氧化锰和氧气，一变多，属于分解反应。",
  },
  {
    id: "zk_shidaizhengzhi",
    subject: "政治",
    question: "1978年开启的伟大转折，确立的我国根本国策与中心任务是？",
    options: [
      "A. 实行改革开放，以经济建设为中心",
      "B. 开展三线建设",
      "C. 大力发展重工业",
      "D. 全面推行包产到户",
    ],
    correctIndex: 0,
    explanation: "党的十一届三中全会做出了把工作重点转移到社会主义现代化建设上来的战略决策。",
  },
];

export interface SchoolOption {
  id: string;
  name: string;
  category: "key_high" | "regular_high" | "polytechnic_zhuan" | "vocational_tech";
  categoryName: string;
  minScore: number;
  description: string;
  futurePath: string;
  familyImpact: string;
  roleTitle: string;
}

export const SCHOOL_OPTIONS_DATABASE: SchoolOption[] = [
  {
    id: "provincial_key_high",
    name: "省立第一高级中学（理科实验班）",
    category: "key_high",
    categoryName: "重点高中",
    minScore: 85,
    description: "全省顶尖重点中学尖子班，师资雄厚，目标直指清华、北大等全国名校！",
    futurePath: "冲刺全国顶尖高等学府高考，未来从事科学家/国家高干/大型企业领军人",
    familyImpact: "全家乃至整个机床厂大院的骄傲，学业任务繁重需全力冲刺",
    roleTitle: "省重点高中尖子生",
  },
  {
    id: "state_polytechnic_zhuan",
    name: "国家部属重点电力工业学校（公费包分配中专）",
    category: "polytechnic_zhuan",
    categoryName: "重点中专(包分配)",
    minScore: 75,
    description: "80~90年代炙手可热的“小清华”！免学费、发饭票津贴，转城镇干部编制！",
    futurePath: "18岁毕业直接转正进省电力局国企干部岗，捧上铁饭碗，早拿工资提拔快",
    familyImpact: "大幅减轻父母经济负担，户口进城，邻里亲友交口称赞“端上公家饭”",
    roleTitle: "省部属中专公费生",
  },
  {
    id: "city_regular_high",
    name: "县第一中学（普通高中班）",
    category: "regular_high",
    categoryName: "普通高中",
    minScore: 60,
    description: "县直属普通高中，扎实稳健推进三年高中学业，备战高考。",
    futurePath: "参加普通全国高考，冲刺省属本科及专科院校",
    familyImpact: "平稳升学，家庭开销适中",
    roleTitle: "县一中普通高中生",
  },
  {
    id: "machinery_vocational_tech",
    name: "省机电工程职业技术学校（高级技工班）",
    category: "vocational_tech",
    categoryName: "技工职高",
    minScore: 0,
    description: "重在掌握实用硬核技术，开设有数控机床、汽车修理、电气焊专业。",
    futurePath: "考取高级技工等级证书，毕业成为工厂不可或缺的技术大拿或创业开修理厂",
    familyImpact: "动手实践能力极强，早早掌握一技之长立足社会",
    roleTitle: "机电高级技工学徒",
  },
];

export class ZhongkaoManager {
  public questions: ZhongkaoQuestion[];
  public currentQuestionIndex: number = 0;
  public userAnswers: number[] = [];
  public calculatedScore: number = 0;
  public phase: "exam" | "score_board" | "volunteer_form" | "admission_letter" = "exam";
  public selectedSchool: SchoolOption | null = null;

  constructor() {
    this.questions = [...ZHONGKAO_QUESTIONS_DATABASE].sort(() => 0.5 - Math.random()).slice(0, 3);
  }

  submitAnswer(optIdx: number): boolean {
    this.userAnswers.push(optIdx);
    this.currentQuestionIndex += 1;
    if (this.currentQuestionIndex >= this.questions.length) {
      // 算分 (结合基础 70 分 + 答对题目)
      let correctCount = 0;
      this.questions.forEach((q, i) => {
        if (this.userAnswers[i] === q.correctIndex) correctCount += 1;
      });
      this.calculatedScore = Math.min(100, Math.round(65 + (correctCount / this.questions.length) * 35));
      this.phase = "score_board";
      return true;
    }
    return false;
  }

  proceedToVolunteer(): void {
    this.phase = "volunteer_form";
  }

  submitVolunteer(schoolId: string): SchoolOption {
    const school = SCHOOL_OPTIONS_DATABASE.find((s) => s.id === schoolId) || SCHOOL_OPTIONS_DATABASE[2];
    this.selectedSchool = school;
    this.phase = "admission_letter";
    return school;
  }
}
