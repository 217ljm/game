export interface ExamQuestion {
  id: string;
  subject: "语文" | "数学" | "常识" | "时代";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const EXAM_QUESTIONS_DATABASE: ExamQuestion[] = [
  {
    id: "q1",
    subject: "语文",
    question: "在著名课文《草船借箭》中，诸葛亮是向谁“借”到了十万支箭？",
    options: ["A. 周瑜", "B. 曹操", "C. 鲁肃", "D. 孙权"],
    correctIndex: 1,
    explanation: "曹操生性多疑，下令弓弩手乱箭射向草船，诸葛亮满载而归。",
  },
  {
    id: "q2",
    subject: "数学",
    question: "鸡兔同笼，共有头 10 个，足 28 只，请问笼中共有几只兔子？",
    options: ["A. 2 只", "B. 4 只", "C. 6 只", "D. 8 只"],
    correctIndex: 1,
    explanation: "假设全是鸡有20只脚，多出8只脚除以2，得出兔子为4只。",
  },
  {
    id: "q3",
    subject: "常识",
    question: "红领巾是少先队员的标志，它代表的是什么的一部分？",
    options: ["A. 国旗的一角", "B. 红军军旗", "C. 团旗", "D. 时代红绸"],
    correctIndex: 0,
    explanation: "红领巾代表红旗的一角，是用革命先辈的鲜血染成的。",
  },
  {
    id: "q4",
    subject: "时代",
    question: "1978年12月召开的具有深远历史意义的重要会议是？",
    options: ["A. 党的十一届三中全会", "B. 党的十二大", "C. 深圳特区成立大会", "D. 第一届全国人大会议"],
    correctIndex: 0,
    explanation: "十一届三中全会开启了改革开放和社会主义现代化的伟大新征程。",
  },
  {
    id: "q5",
    subject: "数学",
    question: "一个直角三角形的两条直角边分别为 3 厘米和 4 厘米，其斜边长度为？",
    options: ["A. 5 厘米", "B. 6 厘米", "C. 7 厘米", "D. 8 厘米"],
    correctIndex: 0,
    explanation: "由勾股定理 3² + 4² = 25 = 5²，斜边为 5 厘米。",
  },
];

export interface ExamQuizState {
  currentQuestionIndex: number;
  totalScore: number;
  answers: Array<{ questionId: string; selectedIndex: number; isCorrect: boolean }>;
  isFinished: boolean;
}

export class ExamQuizMiniGame {
  public state: ExamQuizState;
  public questions: ExamQuestion[];

  constructor() {
    // 随机抽取 3 道题目
    this.questions = [...EXAM_QUESTIONS_DATABASE].sort(() => 0.5 - Math.random()).slice(0, 3);
    this.state = {
      currentQuestionIndex: 0,
      totalScore: 0,
      answers: [],
      isFinished: false,
    };
  }

  getCurrentQuestion(): ExamQuestion | null {
    if (this.state.currentQuestionIndex >= this.questions.length) return null;
    return this.questions[this.state.currentQuestionIndex];
  }

  submitAnswer(optionIndex: number): { isCorrect: boolean; scoreGained: number; isFinished: boolean } {
    const q = this.getCurrentQuestion();
    if (!q) return { isCorrect: false, scoreGained: 0, isFinished: true };

    const isCorrect = optionIndex === q.correctIndex;
    const scoreGained = isCorrect ? Math.round(100 / this.questions.length) : 0;

    this.state.answers.push({
      questionId: q.id,
      selectedIndex: optionIndex,
      isCorrect,
    });

    if (isCorrect) {
      this.state.totalScore += scoreGained;
    }

    this.state.currentQuestionIndex += 1;
    if (this.state.currentQuestionIndex >= this.questions.length) {
      this.state.isFinished = true;
      // 修正满分为 100 分
      if (this.state.answers.every((a) => a.isCorrect)) {
        this.state.totalScore = 100;
      }
    }

    return { isCorrect, scoreGained, isFinished: this.state.isFinished };
  }
}
