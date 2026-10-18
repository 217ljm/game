export interface SubjectScoreRecord {
  baseScore: number; // 平时活动积累基准分 (0~70)
  examBonus: number; // 考试答题附加分 (0~30)
}

export class AcademicScoreSystem {
  // 六大学科基准分积累 (0~70分)
  public subjects: Record<string, SubjectScoreRecord> = {
    chinese: { baseScore: 45, examBonus: 0 },
    math: { baseScore: 45, examBonus: 0 },
    english: { baseScore: 40, examBonus: 0 },
    physics_history: { baseScore: 42, examBonus: 0 },
    chemistry_politics: { baseScore: 42, examBonus: 0 },
    comprehensive: { baseScore: 45, examBonus: 0 },
  };

  // 学习投入度与习惯 (每季度活动结算)
  public studyEffortThisYear: number = 0;

  // 记录学习活动提升基准分
  addStudyActivity(activityType: "library_study" | "class_focus" | "homework" | "interest_class" | "night_study"): void {
    const gainMap: Record<string, number> = {
      library_study: 4,
      class_focus: 3,
      homework: 3,
      interest_class: 2,
      night_study: 5,
    };
    const gain = gainMap[activityType] || 2;
    this.studyEffortThisYear += gain;

    Object.keys(this.subjects).forEach((sub) => {
      this.subjects[sub].baseScore = Math.min(70, this.subjects[sub].baseScore + gain * (0.8 + Math.random() * 0.4));
    });
  }

  // 打游戏或贪玩轻微衰减学业基准分
  penalizeGaming(): void {
    Object.keys(this.subjects).forEach((sub) => {
      this.subjects[sub].baseScore = Math.max(20, this.subjects[sub].baseScore - 1.5);
    });
  }

  // 年度自然遗忘与刷新 (微量衰减)
  annualTick(): void {
    Object.keys(this.subjects).forEach((sub) => {
      this.subjects[sub].baseScore = Math.max(25, this.subjects[sub].baseScore - 1.0);
      this.subjects[sub].examBonus = 0; // 重置考试附加分
    });
    this.studyEffortThisYear = 0;
  }

  // 设置某科目考试附加分 (0~30)
  setExamBonus(subKey: string, bonus: number): void {
    if (this.subjects[subKey]) {
      this.subjects[subKey].examBonus = Math.min(30, Math.max(0, bonus));
    }
  }

  // 计算某科目总分 (0~100)
  getSubjectFinalScore(subKey: string): number {
    const rec = this.subjects[subKey];
    if (!rec) return 60;
    return Math.min(100, Math.round(rec.baseScore + rec.examBonus));
  }

  // 计算 6 科全科高考/大考总分 (0~600)
  getTotalExamScore(): number {
    return Object.keys(this.subjects).reduce((sum, k) => sum + this.getSubjectFinalScore(k), 0);
  }

  // 计算平均分与全省排名百分比 (基于省份难度系数)
  getRankPercentile(provinceDifficulty: number = 1.0): number {
    const total = this.getTotalExamScore();
    const normalized = (total / 600) / provinceDifficulty;
    return Math.min(99.9, Math.max(1.0, Math.round(normalized * 100 * 10) / 10));
  }
}
