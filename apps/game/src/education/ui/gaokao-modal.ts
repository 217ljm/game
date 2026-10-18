import Phaser from "phaser";
import {
  type AcademicFoundation,
  type ExamAnswerSheet,
  type GaokaoAdmissionLetter,
  type GaokaoPaper,
  type GaokaoQuestion,
  type GaokaoScoreReport,
  type GaokaoTrack,
  type VolunteerSubmission,
} from "../gaokao-contracts.ts";
import { GaokaoEngine, UNIVERSITIES_DATABASE } from "../gaokao-engine.ts";
import { DEFAULT_FONT_FAMILY, GAME_RESOLUTION } from "../../ui/game-text.ts";

/** 高考模态框主生命周期阶段 */
export type GaokaoModalStage =
  | "track_selection" // 阶段 1：文理分科仪式 (16岁)
  | "exam_session" // 阶段 2：高考真题答题大考 (准考证 + 真题作答)
  | "score_and_admission"; // 阶段 3：放榜成绩揭晓与大学录取通知书

/** 放榜阶段子展示状态 */
export type ScoreViewSubStage = "score_board" | "admission_letter";

/** 高考结算增益收益 */
export interface GaokaoStatGains {
  intelligence: number;
  reputation: number;
  happiness: number;
}

/** 高考全流程最终结果 */
export interface GaokaoCompletionResult {
  track: GaokaoTrack;
  scoreReport: GaokaoScoreReport;
  admissionLetter: GaokaoAdmissionLetter;
  statGains: GaokaoStatGains;
}

/** 弹窗配置项 */
export interface GaokaoModalConfig {
  scene: Phaser.Scene;
  x?: number;
  y?: number;
  width?: number; // 默认 390
  height?: number; // 默认 844
  initialStage?: GaokaoModalStage;
  candidateName?: string;
  candidateAge?: number;
  year?: number;
  chosenTrack?: GaokaoTrack;
  academicFoundation?: Partial<AcademicFoundation>;
  volunteerSubmission?: Partial<VolunteerSubmission>;
  onTrackSelected?: (track: GaokaoTrack) => void;
  onExamSubmitted?: (report: GaokaoScoreReport, letter: GaokaoAdmissionLetter) => void;
  onComplete?: (result: GaokaoCompletionResult) => void;
  onClose?: () => void;
}

/**
 * 纯状态机逻辑控制器 (GaokaoStateMachine)
 * 负责脱离 UI 的状态流转、试卷生成、答题记录、评分及志愿录取运算
 * 便于完整单元测试与确定性验证
 */
export class GaokaoStateMachine {
  public stage: GaokaoModalStage;
  public subStage: ScoreViewSubStage = "score_board";
  public candidateName: string;
  public candidateAge: number;
  public year: number;
  public chosenTrack: GaokaoTrack;
  public foundation: AcademicFoundation;
  public volunteer: VolunteerSubmission;
  public engine: GaokaoEngine;

  // 答卷运行时
  public currentPaper: GaokaoPaper | null = null;
  public currentQuestionIndex: number = 0;
  public userAnswers: Record<string, number> = {};

  // 成绩与录取
  public scoreReport: GaokaoScoreReport | null = null;
  public admissionLetter: GaokaoAdmissionLetter | null = null;
  public statGains: GaokaoStatGains | null = null;

  constructor(config: {
    initialStage?: GaokaoModalStage;
    candidateName?: string;
    candidateAge?: number;
    year?: number;
    chosenTrack?: GaokaoTrack;
    foundation?: Partial<AcademicFoundation>;
    volunteer?: Partial<VolunteerSubmission>;
    seed?: number;
  }) {
    this.stage = config.initialStage ?? "track_selection";
    this.candidateName = config.candidateName ?? "林远";
    this.candidateAge = config.candidateAge ?? 16;
    this.year = config.year ?? 2026;
    this.chosenTrack = config.chosenTrack ?? "science";

    this.foundation = {
      chinese: config.foundation?.chinese ?? 85,
      math: config.foundation?.math ?? 88,
      english: config.foundation?.english ?? 84,
      physics: config.foundation?.physics ?? 86,
      chemistry: config.foundation?.chemistry ?? 85,
      biology: config.foundation?.biology ?? 84,
      history: config.foundation?.history ?? 82,
      politics: config.foundation?.politics ?? 80,
      geography: config.foundation?.geography ?? 83,
      stability: config.foundation?.stability ?? 85,
    };

    this.volunteer = {
      candidateName: this.candidateName,
      track: this.chosenTrack,
      firstChoice: config.volunteer?.firstChoice ?? {
        universityId: "tsinghua_univ",
        majorName: "计算机科学实验班 (姚班)",
      },
      secondChoice: config.volunteer?.secondChoice ?? {
        universityId: "fudan_univ",
        majorName: "微电子科学与工程 (国家集成电路拔尖班)",
      },
      thirdChoice: config.volunteer?.thirdChoice ?? {
        universityId: "sichuan_univ",
        majorName: "华西口腔医学院 (口腔医学八年制)",
      },
      obeyAdjustment: config.volunteer?.obeyAdjustment ?? true,
    };

    this.engine = new GaokaoEngine(config.seed ?? 19780607);
  }

  /** 选择分科赛道 */
  public selectTrack(track: GaokaoTrack): void {
    this.chosenTrack = track;
    this.volunteer.track = track;
    // 根据文理科调整默认志愿（若用户未自定义）
    if (track === "arts") {
      this.volunteer.firstChoice = {
        universityId: "peking_univ",
        majorName: "光华管理学院金融经济实验班",
      };
      this.volunteer.secondChoice = {
        universityId: "renmin_univ",
        majorName: "法学院卓越法律人才班",
      };
      this.volunteer.thirdChoice = {
        universityId: "fudan_univ",
        majorName: "国际政治与外交学",
      };
    }
  }

  /** 进入高考答题大考阶段 */
  public startExamSession(): GaokaoPaper {
    this.stage = "exam_session";
    this.currentPaper = this.engine.generateExamPaper(this.chosenTrack, "gaokao", this.year);
    this.currentQuestionIndex = 0;
    this.userAnswers = {};
    return this.currentPaper;
  }

  /** 获取当前所有题目扁平列表 */
  public getAllQuestions(): GaokaoQuestion[] {
    if (!this.currentPaper) return [];
    return [
      ...this.currentPaper.chineseQuestions,
      ...this.currentPaper.mathQuestions,
      ...this.currentPaper.englishQuestions,
      ...this.currentPaper.comprehensiveQuestions,
    ];
  }

  /** 获取当前答题进度 */
  public getCurrentQuestion(): GaokaoQuestion | null {
    const questions = this.getAllQuestions();
    if (this.currentQuestionIndex < 0 || this.currentQuestionIndex >= questions.length) {
      return null;
    }
    return questions[this.currentQuestionIndex];
  }

  /** 记录某一题的选择 */
  public recordAnswer(questionId: string, optionIndex: number): void {
    this.userAnswers[questionId] = optionIndex;
  }

  /** 导航到下一题 */
  public nextQuestion(): boolean {
    const questions = this.getAllQuestions();
    if (this.currentQuestionIndex < questions.length - 1) {
      this.currentQuestionIndex += 1;
      return true;
    }
    return false;
  }

  /** 导航到上一题 */
  public prevQuestion(): boolean {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex -= 1;
      return true;
    }
    return false;
  }

  /** 提交试卷并完成算分与录取 */
  public submitExam(): {
    report: GaokaoScoreReport;
    letter: GaokaoAdmissionLetter;
    statGains: GaokaoStatGains;
  } {
    if (!this.currentPaper) {
      this.startExamSession();
    }
    const paper = this.currentPaper!;
    const answerSheet: ExamAnswerSheet = {
      sessionId: paper.sessionId,
      candidateName: this.candidateName,
      track: this.chosenTrack,
      answers: { ...this.userAnswers },
    };

    // 1. 双轨制算分
    this.scoreReport = this.engine.evaluateExamResults(paper, answerSheet, this.foundation);

    // 2. 志愿录取
    this.admissionLetter = this.engine.processVolunteerAdmission(
      this.scoreReport,
      this.volunteer,
      this.year
    );

    // 3. 结算属性收益（依名校梯度与总分计算）
    const total = this.scoreReport.totalScore;
    let intGain = 15;
    let repGain = 20;
    let hapGain = 20;

    if (total >= 680) {
      intGain = 30;
      repGain = 50;
      hapGain = 35;
    } else if (total >= 630) {
      intGain = 25;
      repGain = 38;
      hapGain = 28;
    } else if (total >= 580) {
      intGain = 20;
      repGain = 28;
      hapGain = 22;
    }

    this.statGains = {
      intelligence: intGain,
      reputation: repGain,
      happiness: hapGain,
    };

    this.stage = "score_and_admission";
    this.subStage = "score_board";

    return {
      report: this.scoreReport,
      letter: this.admissionLetter,
      statGains: this.statGains,
    };
  }
}

/**
 * 沉浸式像素高考弹窗交互组件 (GaokaoModal)
 * 严格适配 390x844 竖屏视口，居中置顶弹出
 */
export class GaokaoModal extends Phaser.GameObjects.Container {
  public readonly modalWidth: number;
  public readonly modalHeight: number;
  public readonly stateMachine: GaokaoStateMachine;

  // 回调事件
  private onTrackSelectedCallback?: (track: GaokaoTrack) => void;
  private onExamSubmittedCallback?: (report: GaokaoScoreReport, letter: GaokaoAdmissionLetter) => void;
  private onCompleteCallback?: (result: GaokaoCompletionResult) => void;
  private onCloseCallback?: () => void;

  // 内部视图渲染容器
  private contentContainer: Phaser.GameObjects.Container;
  private selectedTrackDraft: GaokaoTrack;

  constructor(config: GaokaoModalConfig) {
    super(config.scene, config.x ?? 0, config.y ?? 0);
    this.modalWidth = config.width ?? 390;
    this.modalHeight = config.height ?? 844;

    this.onTrackSelectedCallback = config.onTrackSelected;
    this.onExamSubmittedCallback = config.onExamSubmitted;
    this.onCompleteCallback = config.onComplete;
    this.onCloseCallback = config.onClose;

    this.selectedTrackDraft = config.chosenTrack ?? "science";

    this.stateMachine = new GaokaoStateMachine({
      initialStage: config.initialStage,
      candidateName: config.candidateName,
      candidateAge: config.candidateAge,
      year: config.year,
      chosenTrack: config.chosenTrack,
      foundation: config.academicFoundation,
      volunteer: config.volunteerSubmission,
    });

    this.contentContainer = this.scene.add.container(0, 0);
    this.add(this.contentContainer);

    this.createBackgroundOverlay();
    this.renderCurrentStage();

    this.scene.add.existing(this);
    this.setDepth(1000);
  }

  /** 获取当前阶段 */
  public getStage(): GaokaoModalStage {
    return this.stateMachine.stage;
  }

  /** 切换阶段 */
  public setStage(stage: GaokaoModalStage): void {
    this.stateMachine.stage = stage;
    this.renderCurrentStage();
  }

  /** 获取当前已选科类 */
  public getSelectedTrack(): GaokaoTrack {
    return this.stateMachine.chosenTrack;
  }

  /** 获取最终成绩单 */
  public getScoreReport(): GaokaoScoreReport | null {
    return this.stateMachine.scoreReport;
  }

  /** 获取最终录取通知书 */
  public getAdmissionLetter(): GaokaoAdmissionLetter | null {
    return this.stateMachine.admissionLetter;
  }

  /** 背景深色半透明遮罩与复古像素边框 */
  private createBackgroundOverlay(): void {
    const w = this.modalWidth;
    const h = this.modalHeight;

    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x060911, 0.94);
    overlay.fillRect(0, 0, w, h);
    overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, w, h),
      Phaser.Geom.Rectangle.Contains
    );
    this.addAt(overlay, 0);
  }

  /** 根据当前状态机阶段调度渲染 */
  public renderCurrentStage(): void {
    this.contentContainer.removeAll(true);

    switch (this.stateMachine.stage) {
      case "track_selection":
        this.renderTrackSelectionStage();
        break;
      case "exam_session":
        this.renderExamSessionStage();
        break;
      case "score_and_admission":
        if (this.stateMachine.subStage === "score_board") {
          this.renderScoreBoardStage();
        } else {
          this.renderAdmissionLetterStage();
        }
        break;
    }
  }

  // =========================================================================
  // 【阶段 1：文理分科仪式 (TrackSelection)】
  // =========================================================================
  private renderTrackSelectionStage(): void {
    const w = this.modalWidth;

    // 1. 顶部大红横匾与金边标题
    const topPlacard = this.scene.add.graphics();
    topPlacard.fillStyle(0x8f1d1d, 1);
    topPlacard.fillRoundedRect(20, 24, w - 40, 72, 8);
    topPlacard.lineStyle(2, 0xd4af37, 1);
    topPlacard.strokeRoundedRect(20, 24, w - 40, 72, 8);
    this.contentContainer.add(topPlacard);

    const titleText = this.scene.add.text(w / 2, 46, "【 高 中 文 理 分 科 大 典 】", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "19px",
      color: "#fff1c5",
      fontStyle: "bold",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);

    const subTitleText = this.scene.add.text(w / 2, 73, "高一学年结业 · 奠定学业与人生志向之基", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "12px",
      color: "#f5d491",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);
    this.contentContainer.add([titleText, subTitleText]);

    // 2. 理科班对比卡片 (Science)
    this.createTrackOptionCard({
      y: 110,
      track: "science",
      title: "【 理科班 · 重点实验方向 】",
      badge: "物 化 生",
      badgeColor: 0x22577a,
      motto: "格物致知 · 科技强国",
      features: [
        "核心科目：语文、理科数学、英语、理科综合 (300分)",
        "重点学科：物理(110分)、化学(100分)、生物(90分)",
        "培养优势：数理逻辑推演严密，攻坚前沿核心技术",
        "未来方向：计算机/人工智能、微电子芯片、临床医学、航空航天",
      ],
      selected: this.selectedTrackDraft === "science",
    });

    // 3. 文科班对比卡片 (Arts)
    this.createTrackOptionCard({
      y: 430,
      track: "arts",
      title: "【 文科班 · 卓越拔尖方向 】",
      badge: "史 地 政",
      badgeColor: 0x78290f,
      motto: "文以载道 · 经世致用",
      features: [
        "核心科目：语文、文科数学、英语、文科综合 (300分)",
        "重点学科：历史(100分)、思想政治(100分)、地理(100分)",
        "培养优势：洞察社会规律与时代脉络，博览群书，兼济天下",
        "未来方向：理论经济学与金融、法学卓越人才、国际政治、古典文献",
      ],
      selected: this.selectedTrackDraft === "arts",
    });

    // 4. 底部确认按钮 (高度 60)
    const btnY = 750;
    const confirmBtn = this.scene.add.graphics();
    confirmBtn.fillStyle(0x9e2a2b, 1);
    confirmBtn.fillRoundedRect(35, btnY, w - 70, 52, 10);
    confirmBtn.lineStyle(2, 0xf3c053, 1);
    confirmBtn.strokeRoundedRect(35, btnY, w - 70, 52, 10);

    const btnText = this.scene.add.text(
      w / 2,
      btnY + 26,
      `确认选择【${this.selectedTrackDraft === "science" ? "理科班" : "文科班"}】并正式入籍 ➔`,
      {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "16px",
        color: "#ffffff",
        fontStyle: "bold",
        resolution: GAME_RESOLUTION,
      }
    ).setOrigin(0.5);

    confirmBtn.setInteractive(
      new Phaser.Geom.Rectangle(35, btnY, w - 70, 52),
      Phaser.Geom.Rectangle.Contains
    );

    confirmBtn.on("pointerdown", () => {
      this.stateMachine.selectTrack(this.selectedTrackDraft);
      this.onTrackSelectedCallback?.(this.selectedTrackDraft);
      // 开启答题大考阶段
      this.stateMachine.startExamSession();
      this.renderCurrentStage();
    });

    this.contentContainer.add([confirmBtn, btnText]);
  }

  /** 创建分科对比卡片 */
  private createTrackOptionCard(params: {
    y: number;
    track: GaokaoTrack;
    title: string;
    badge: string;
    badgeColor: number;
    motto: string;
    features: string[];
    selected: boolean;
  }): void {
    const w = this.modalWidth;
    const cardW = w - 40;
    const cardH = 300;
    const x = 20;

    const card = this.scene.add.graphics();
    // 背景底色：若选中则为更亮更精致的象牙米黄底，未选中为偏灰复古底
    const bgColor = params.selected ? 0xfffcf2 : 0xf2ede4;
    const strokeColor = params.selected ? 0xc8963e : 0xb5a895;
    const strokeWidth = params.selected ? 3 : 1;

    card.fillStyle(bgColor, 1);
    card.fillRoundedRect(x, params.y, cardW, cardH, 8);
    card.lineStyle(strokeWidth, strokeColor, 1);
    card.strokeRoundedRect(x, params.y, cardW, cardH, 8);

    // 选中印章标致
    if (params.selected) {
      // 顶部右侧对勾角标
      card.fillStyle(0x9e2a2b, 1);
      card.fillRoundedRect(x + cardW - 74, params.y + 10, 64, 24, 4);
      const tagText = this.scene.add.text(x + cardW - 42, params.y + 22, "✓ 已选择", {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "12px",
        color: "#ffffff",
        fontStyle: "bold",
        resolution: GAME_RESOLUTION,
      }).setOrigin(0.5);
      this.contentContainer.add(tagText);
    }

    // 卡片标题
    const title = this.scene.add.text(x + 16, params.y + 18, params.title, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "16px",
      color: params.selected ? "#66101f" : "#333333",
      fontStyle: "bold",
      resolution: GAME_RESOLUTION,
    });

    // 标语横幅
    const mottoBg = this.scene.add.graphics();
    mottoBg.fillStyle(params.badgeColor, 0.12);
    mottoBg.fillRoundedRect(x + 16, params.y + 48, cardW - 32, 28, 4);
    const mottoText = this.scene.add.text(x + cardW / 2, params.y + 62, `“ ${params.motto} ”`, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "13px",
      color: `#${params.badgeColor.toString(16).padStart(6, "0")}`,
      fontStyle: "bold",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);

    this.contentContainer.add([card, title, mottoBg, mottoText]);

    // 特点列表
    let lineY = params.y + 92;
    params.features.forEach((feat, idx) => {
      const dot = this.scene.add.text(x + 16, lineY, `·`, {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "16px",
        color: params.selected ? "#8f1d1d" : "#666666",
        fontStyle: "bold",
        resolution: GAME_RESOLUTION,
      });
      const desc = this.scene.add.text(x + 28, lineY + 2, feat, {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "12px",
        color: "#222222",
        wordWrap: { width: cardW - 48 },
        resolution: GAME_RESOLUTION,
      });
      lineY += desc.height + 6;
      this.contentContainer.add([dot, desc]);
    });

    // 卡片整体点击切换选中
    card.setInteractive(
      new Phaser.Geom.Rectangle(x, params.y, cardW, cardH),
      Phaser.Geom.Rectangle.Contains
    );
    card.on("pointerdown", () => {
      this.selectedTrackDraft = params.track;
      this.renderTrackSelectionStage();
    });
  }

  // =========================================================================
  // 【阶段 2：高考真题答题大考 (ExamSession)】
  // =========================================================================
  private renderExamSessionStage(): void {
    const w = this.modalWidth;
    const q = this.stateMachine.getCurrentQuestion();
    const allQuestions = this.stateMachine.getAllQuestions();
    const totalCount = allQuestions.length;
    const currentIdx = this.stateMachine.currentQuestionIndex;

    // 1. 顶部经典准考证 (Admission Ticket HUD)
    const ticketBg = this.scene.add.graphics();
    ticketBg.fillStyle(0xf7f5e8, 1);
    ticketBg.fillRoundedRect(16, 16, w - 32, 92, 6);
    ticketBg.lineStyle(2, 0x2b4c3f, 1);
    ticketBg.strokeRoundedRect(16, 16, w - 32, 92, 6);
    // 准考证内细双红线
    ticketBg.lineStyle(1, 0xbf360c, 0.4);
    ticketBg.strokeRect(20, 20, w - 40, 84);
    this.contentContainer.add(ticketBg);

    const ticketTitle = this.scene.add.text(w / 2, 32, "普通高等学校招生全国统一考试 · 准考证", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "13px",
      color: "#bf360c",
      fontStyle: "bold",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);

    const trackLabel = this.stateMachine.chosenTrack === "science" ? "理科（物化生）" : "文科（史地政）";
    const ticketInfo1 = this.scene.add.text(
      28,
      54,
      `考生姓名：${this.stateMachine.candidateName}    科类：${trackLabel}`,
      {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "12px",
        color: "#1c2826",
        fontStyle: "bold",
        resolution: GAME_RESOLUTION,
      }
    );
    const ticketInfo2 = this.scene.add.text(
      28,
      76,
      `准考证号：2026-GK-985012    考点：第一高级中学 第01考场`,
      {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "11px",
        color: "#475569",
        resolution: GAME_RESOLUTION,
      }
    );
    this.contentContainer.add([ticketTitle, ticketInfo1, ticketInfo2]);

    if (!q) {
      return;
    }

    // 2. 考题进度与学科考点标签栏 (y: 118)
    const progressBg = this.scene.add.graphics();
    progressBg.fillStyle(0x192a3e, 0.9);
    progressBg.fillRoundedRect(16, 118, w - 32, 34, 6);
    this.contentContainer.add(progressBg);

    const subjectDisplayNames: Record<string, string> = {
      chinese: "【 语文 】",
      math_science: "【 理科数学 】",
      math_arts: "【 文科数学 】",
      english: "【 英语 】",
      physics: "【 理综 · 物理 】",
      chemistry: "【 理综 · 化学 】",
      biology: "【 理综 · 生物 】",
      history: "【 文综 · 历史 】",
      politics: "【 文综 · 思想政治 】",
      geography: "【 文综 · 地理 】",
    };

    const qSubj = subjectDisplayNames[q.subject] || q.subject;
    const progressText = this.scene.add.text(
      28,
      135,
      `${qSubj} 第 ${currentIdx + 1} / ${totalCount} 题`,
      {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "13px",
        color: "#e2e8f0",
        fontStyle: "bold",
        resolution: GAME_RESOLUTION,
      }
    ).setOrigin(0, 0.5);

    const topicTag = this.scene.add.text(w - 28, 135, q.subTopic, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "11px",
      color: "#94a3b8",
      resolution: GAME_RESOLUTION,
    }).setOrigin(1, 0.5);
    this.contentContainer.add([progressText, topicTag]);

    // 3. 题干卡片 (Question Stem, y: 160)
    const stemBg = this.scene.add.graphics();
    stemBg.fillStyle(0xfffdf7, 1);
    stemBg.fillRoundedRect(16, 160, w - 32, 190, 8);
    stemBg.lineStyle(1, 0xd0c8b6, 1);
    stemBg.strokeRoundedRect(16, 160, w - 32, 190, 8);
    this.contentContainer.add(stemBg);

    const stemText = this.scene.add.text(28, 172, q.stem, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "14px",
      color: "#1a1a1a",
      wordWrap: { width: w - 56 },
      lineSpacing: 5,
      resolution: GAME_RESOLUTION,
    });
    this.contentContainer.add(stemText);

    // 4. 四个选项按钮 (A, B, C, D) (y: 360 开始，每项高 78)
    const currentSelectedOption = this.stateMachine.userAnswers[q.id];
    let optY = 360;

    q.options.forEach((optStr, optIdx) => {
      const isSelected = currentSelectedOption === optIdx;
      const optCard = this.scene.add.graphics();
      const optBgColor = isSelected ? 0xfef9c3 : 0xffffff;
      const optStroke = isSelected ? 0xd97706 : 0xd1d5db;
      const optWidth = isSelected ? 2 : 1;

      optCard.fillStyle(optBgColor, 1);
      optCard.fillRoundedRect(16, optY, w - 32, 70, 8);
      optCard.lineStyle(optWidth, optStroke, 1);
      optCard.strokeRoundedRect(16, optY, w - 32, 70, 8);

      const optText = this.scene.add.text(28, optY + 10, optStr, {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "13px",
        color: isSelected ? "#92400e" : "#1f2937",
        fontStyle: isSelected ? "bold" : "normal",
        wordWrap: { width: w - 56 },
        lineSpacing: 3,
        resolution: GAME_RESOLUTION,
      });

      optCard.setInteractive(
        new Phaser.Geom.Rectangle(16, optY, w - 32, 70),
        Phaser.Geom.Rectangle.Contains
      );

      optCard.on("pointerdown", () => {
        this.stateMachine.recordAnswer(q.id, optIdx);
        this.renderExamSessionStage();
      });

      this.contentContainer.add([optCard, optText]);
      optY += 76;
    });

    // 5. 底部翻题与交卷操作栏 (y: 680 ~ 740)
    const navY = 684;

    // 上一题按钮
    if (currentIdx > 0) {
      const prevBtn = this.scene.add.graphics();
      prevBtn.fillStyle(0x334155, 1);
      prevBtn.fillRoundedRect(20, navY, 110, 44, 6);
      const prevText = this.scene.add.text(75, navY + 22, "◂ 上一题", {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "14px",
        color: "#ffffff",
        resolution: GAME_RESOLUTION,
      }).setOrigin(0.5);

      prevBtn.setInteractive(
        new Phaser.Geom.Rectangle(20, navY, 110, 44),
        Phaser.Geom.Rectangle.Contains
      );
      prevBtn.on("pointerdown", () => {
        this.stateMachine.prevQuestion();
        this.renderExamSessionStage();
      });
      this.contentContainer.add([prevBtn, prevText]);
    }

    // 下一题按钮
    if (currentIdx < totalCount - 1) {
      const nextBtn = this.scene.add.graphics();
      nextBtn.fillStyle(0x1e3a8a, 1);
      nextBtn.fillRoundedRect(w - 130, navY, 110, 44, 6);
      const nextText = this.scene.add.text(w - 75, navY + 22, "下一题 ▸", {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "14px",
        color: "#ffffff",
        fontStyle: "bold",
        resolution: GAME_RESOLUTION,
      }).setOrigin(0.5);

      nextBtn.setInteractive(
        new Phaser.Geom.Rectangle(w - 130, navY, 110, 44),
        Phaser.Geom.Rectangle.Contains
      );
      nextBtn.on("pointerdown", () => {
        this.stateMachine.nextQuestion();
        this.renderExamSessionStage();
      });
      this.contentContainer.add([nextBtn, nextText]);
    }

    // 底部正式交卷按钮 (大红大金)
    const submitBtnY = 746;
    const submitBtn = this.scene.add.graphics();
    submitBtn.fillStyle(0xb91c1c, 1);
    submitBtn.fillRoundedRect(20, submitBtnY, w - 40, 52, 10);
    submitBtn.lineStyle(2, 0xfacc15, 1);
    submitBtn.strokeRoundedRect(20, submitBtnY, w - 40, 52, 10);

    const submitText = this.scene.add.text(
      w / 2,
      submitBtnY + 26,
      "★ 检查无误 · 正式提交高考试卷 ★",
      {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "16px",
        color: "#ffffff",
        fontStyle: "bold",
        resolution: GAME_RESOLUTION,
      }
    ).setOrigin(0.5);

    submitBtn.setInteractive(
      new Phaser.Geom.Rectangle(20, submitBtnY, w - 40, 52),
      Phaser.Geom.Rectangle.Contains
    );

    submitBtn.on("pointerdown", () => {
      const { report, letter } = this.stateMachine.submitExam();
      this.onExamSubmittedCallback?.(report, letter);
      this.renderCurrentStage();
    });

    this.contentContainer.add([submitBtn, submitText]);
  }

  // =========================================================================
  // 【阶段 3A：高考放榜成绩单 (ScoreBoard)】
  // =========================================================================
  private renderScoreBoardStage(): void {
    const w = this.modalWidth;
    const report = this.stateMachine.scoreReport;
    if (!report) return;

    // 1. 顶部金榜横匾
    const topPlacard = this.scene.add.graphics();
    topPlacard.fillStyle(0x7f1d1d, 1);
    topPlacard.fillRoundedRect(20, 24, w - 40, 68, 8);
    topPlacard.lineStyle(2, 0xf59e0b, 1);
    topPlacard.strokeRoundedRect(20, 24, w - 40, 68, 8);
    this.contentContainer.add(topPlacard);

    const placardTitle = this.scene.add.text(w / 2, 44, "全国普通高考成绩放榜公报", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "18px",
      color: "#fef08a",
      fontStyle: "bold",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);

    const candidateSummary = this.scene.add.text(
      w / 2,
      70,
      `考生：${report.candidateName}  |  科类：${report.track === "science" ? "理科" : "文科"}`,
      {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "12px",
        color: "#fed7aa",
        resolution: GAME_RESOLUTION,
      }
    ).setOrigin(0.5);
    this.contentContainer.add([placardTitle, candidateSummary]);

    // 2. 总分大金字牌匾 (y: 104)
    const scoreCard = this.scene.add.graphics();
    scoreCard.fillStyle(0xfefce8, 1);
    scoreCard.fillRoundedRect(20, 104, w - 40, 130, 8);
    scoreCard.lineStyle(2, 0xd97706, 1);
    scoreCard.strokeRoundedRect(20, 104, w - 40, 130, 8);
    this.contentContainer.add(scoreCard);

    const totalLabel = this.scene.add.text(w / 2, 126, "高考全卷统考总分 (满分 750)", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "13px",
      color: "#78350f",
      fontStyle: "bold",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);

    const totalScoreText = this.scene.add.text(w / 2, 162, `${report.totalScore}`, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "44px",
      color: "#b91c1c",
      fontStyle: "bold",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);

    const rankText = this.scene.add.text(
      w / 2,
      204,
      `全省排位：第 ${report.provinceRank.toLocaleString()} 名 (全省前 ${report.percentileRank}%)`,
      {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "13px",
        color: "#1e3a8a",
        fontStyle: "bold",
        resolution: GAME_RESOLUTION,
      }
    ).setOrigin(0.5);
    this.contentContainer.add([totalLabel, totalScoreText, rankText]);

    // 3. 各单科成绩明细卡 (y: 246)
    const detailBg = this.scene.add.graphics();
    detailBg.fillStyle(0xffffff, 1);
    detailBg.fillRoundedRect(20, 246, w - 40, 240, 8);
    detailBg.lineStyle(1, 0xe2e8f0, 1);
    detailBg.strokeRoundedRect(20, 246, w - 40, 240, 8);
    this.contentContainer.add(detailBg);

    const detailTitle = this.scene.add.text(36, 260, "◆ 各学科实考成绩得分清单", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "13px",
      color: "#0f172a",
      fontStyle: "bold",
      resolution: GAME_RESOLUTION,
    });
    this.contentContainer.add(detailTitle);

    const scoreRows = [
      { name: "语文", score: report.chineseScore, max: 150 },
      { name: report.track === "science" ? "理科数学" : "文科数学", score: report.mathScore, max: 150 },
      { name: "英语", score: report.englishScore, max: 150 },
      {
        name: report.track === "science" ? "理科综合 (物化生)" : "文科综合 (史政地)",
        score: report.comprehensiveScore,
        max: 300,
      },
    ];

    let rowY = 290;
    scoreRows.forEach((row) => {
      const nameText = this.scene.add.text(36, rowY, row.name, {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "13px",
        color: "#334155",
        resolution: GAME_RESOLUTION,
      });

      // 进度条背景
      const barBg = this.scene.add.graphics();
      barBg.fillStyle(0xe2e8f0, 1);
      barBg.fillRoundedRect(170, rowY + 3, 100, 10, 4);

      // 得分进度条
      const ratio = Math.min(1, row.score / row.max);
      barBg.fillStyle(0x0284c7, 1);
      barBg.fillRoundedRect(170, rowY + 3, Math.round(100 * ratio), 10, 4);

      const valText = this.scene.add.text(285, rowY, `${row.score} / ${row.max}`, {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "13px",
        color: "#0f172a",
        fontStyle: "bold",
        resolution: GAME_RESOLUTION,
      });

      this.contentContainer.add([nameText, barBg, valText]);
      rowY += 28;
    });

    // 综合小分细目
    const sub = report.comprehensiveDetail;
    const subDetailText = this.scene.add.text(
      36,
      408,
      `综合小分：${sub.sub1.name} ${sub.sub1.score}分 · ${sub.sub2.name} ${sub.sub2.score}分 · ${sub.sub3.name} ${sub.sub3.score}分`,
      {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "12px",
        color: "#64748b",
        resolution: GAME_RESOLUTION,
      }
    );
    this.contentContainer.add(subDetailText);

    // 4. 招生考试院官方评语卡 (y: 498)
    const commentBg = this.scene.add.graphics();
    commentBg.fillStyle(0xf1f5f9, 1);
    commentBg.fillRoundedRect(20, 498, w - 40, 140, 8);
    commentBg.lineStyle(1, 0xcfd8dc, 1);
    commentBg.strokeRoundedRect(20, 498, w - 40, 140, 8);
    this.contentContainer.add(commentBg);

    const commentTag = this.scene.add.text(36, 510, "【省招生考试委员会评审意见】", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "13px",
      color: "#1e293b",
      fontStyle: "bold",
      resolution: GAME_RESOLUTION,
    });

    const commentContent = this.scene.add.text(36, 536, report.evaluationComment, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "13px",
      color: "#334155",
      wordWrap: { width: w - 72 },
      lineSpacing: 5,
      resolution: GAME_RESOLUTION,
    });
    this.contentContainer.add([commentTag, commentContent]);

    // 5. 底部按钮：拆开高校录取通知书 (y: 730)
    const letterBtnY = 740;
    const letterBtn = this.scene.add.graphics();
    letterBtn.fillStyle(0xd97706, 1);
    letterBtn.fillRoundedRect(25, letterBtnY, w - 50, 54, 10);
    letterBtn.lineStyle(2, 0xfef08a, 1);
    letterBtn.strokeRoundedRect(25, letterBtnY, w - 50, 54, 10);

    const letterBtnText = this.scene.add.text(
      w / 2,
      letterBtnY + 27,
      "✉ 拆启高等学校正式录取通知书 ➔",
      {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "16px",
        color: "#ffffff",
        fontStyle: "bold",
        resolution: GAME_RESOLUTION,
      }
    ).setOrigin(0.5);

    letterBtn.setInteractive(
      new Phaser.Geom.Rectangle(25, letterBtnY, w - 50, 54),
      Phaser.Geom.Rectangle.Contains
    );

    letterBtn.on("pointerdown", () => {
      this.stateMachine.subStage = "admission_letter";
      this.renderCurrentStage();
    });

    this.contentContainer.add([letterBtn, letterBtnText]);
  }

  // =========================================================================
  // 【阶段 3B：录取通知书信函展开 (AdmissionLetter)】
  // =========================================================================
  private renderAdmissionLetterStage(): void {
    const w = this.modalWidth;
    const letter = this.stateMachine.admissionLetter;
    const report = this.stateMachine.scoreReport;
    const gains = this.stateMachine.statGains;
    if (!letter) return;

    // 1. 典雅红金信封卡片 (高度 630，居中展开)
    const letterY = 24;
    const letterH = 650;
    const cardBg = this.scene.add.graphics();

    // 仿宣纸红金像素信函外框
    cardBg.fillStyle(0xfffdf5, 1);
    cardBg.fillRoundedRect(16, letterY, w - 32, letterH, 10);
    cardBg.lineStyle(3, 0x991b1b, 1);
    cardBg.strokeRoundedRect(16, letterY, w - 32, letterH, 10);

    // 双重回纹内金线
    cardBg.lineStyle(1.5, 0xd4af37, 1);
    cardBg.strokeRect(22, letterY + 6, w - 44, letterH - 12);
    this.contentContainer.add(cardBg);

    // 2. 烫金大字校名与录取通知书标头
    const univText = this.scene.add.text(w / 2, letterY + 36, letter.universityName, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "26px",
      color: "#991b1b",
      fontStyle: "bold",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);

    const letterTitle = this.scene.add.text(w / 2, letterY + 70, "【 录 取 通 知 书 】", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "17px",
      color: "#b45309",
      fontStyle: "bold",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);

    const tierBadge = this.scene.add.text(w / 2, letterY + 94, letter.tierDisplayName, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "12px",
      color: "#475569",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);
    this.contentContainer.add([univText, letterTitle, tierBadge]);

    // 3. 录取通知书正文
    const bodyContent =
      `　　${letter.candidateName} 同学：\n\n` +
      `　　欣闻你在 ${letter.enrollmentYear} 年全国普通高等学校招生考试中成绩优异，特此祝贺！\n\n` +
      `　　经各批次统一招生审核批准，现正式录取你入我校【${letter.collegeName}】之【${letter.majorName}】本科专业学习。\n\n` +
      `　　请凭本通知书于 ${letter.reportDate} 前往本校办理报到注册入学手续。`;

    const bodyText = this.scene.add.text(32, letterY + 124, bodyContent, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "13px",
      color: "#1e293b",
      wordWrap: { width: w - 64 },
      lineSpacing: 6,
      resolution: GAME_RESOLUTION,
    });
    this.contentContainer.add(bodyText);

    // 4. 校训寄语与对联贺词
    const coupletBox = this.scene.add.graphics();
    coupletBox.fillStyle(0xfef2f2, 1);
    coupletBox.fillRoundedRect(30, letterY + 320, w - 60, 84, 6);
    coupletBox.lineStyle(1, 0xfca5a5, 1);
    coupletBox.strokeRoundedRect(30, letterY + 320, w - 60, 84, 6);
    this.contentContainer.add(coupletBox);

    const couplet1 = this.scene.add.text(
      w / 2,
      letterY + 344,
      `“ ${letter.congratulationCouplet[0]} ”`,
      {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "13px",
        color: "#991b1b",
        fontStyle: "bold",
        resolution: GAME_RESOLUTION,
      }
    ).setOrigin(0.5);

    const couplet2 = this.scene.add.text(
      w / 2,
      letterY + 372,
      `“ ${letter.congratulationCouplet[1]} ”`,
      {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "13px",
        color: "#991b1b",
        fontStyle: "bold",
        resolution: GAME_RESOLUTION,
      }
    ).setOrigin(0.5);
    this.contentContainer.add([couplet1, couplet2]);

    // 5. 官方朱砂印章与校长签发
    const sealBox = this.scene.add.graphics();
    sealBox.lineStyle(2, 0xdc2626, 0.9);
    sealBox.strokeRect(w - 120, letterY + 418, 80, 50);
    const sealText1 = this.scene.add.text(w - 80, letterY + 432, "校招生办", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "12px",
      color: "#dc2626",
      fontStyle: "bold",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);
    const sealText2 = this.scene.add.text(w - 80, letterY + 452, "印 鉴", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "12px",
      color: "#dc2626",
      fontStyle: "bold",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);
    this.contentContainer.add([sealBox, sealText1, sealText2]);

    const signText = this.scene.add.text(
      w - 130,
      letterY + 482,
      `${letter.presidentSignature} 签发`,
      {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "12px",
        color: "#475569",
        fontStyle: "italic",
        resolution: GAME_RESOLUTION,
      }
    );
    this.contentContainer.add(signText);

    // 6. 属性结算增益展示 (y: letterY + 520)
    const gainsBox = this.scene.add.graphics();
    gainsBox.fillStyle(0xf0fdf4, 1);
    gainsBox.fillRoundedRect(30, letterY + 514, w - 60, 72, 6);
    gainsBox.lineStyle(1, 0x86efac, 1);
    gainsBox.strokeRoundedRect(30, letterY + 514, w - 60, 72, 6);
    this.contentContainer.add(gainsBox);

    const gainsTitle = this.scene.add.text(w / 2, letterY + 528, "★ 金榜题名 · 人生属性全面提升 ★", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "12px",
      color: "#166534",
      fontStyle: "bold",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);

    const intVal = gains?.intelligence ?? 25;
    const repVal = gains?.reputation ?? 40;
    const hapVal = gains?.happiness ?? 30;

    const gainsItems = this.scene.add.text(
      w / 2,
      letterY + 556,
      `智力潜能 +${intVal}    家族声望 +${repVal}    心情愉悦 +${hapVal}`,
      {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "13px",
        color: "#15803d",
        fontStyle: "bold",
        resolution: GAME_RESOLUTION,
      }
    ).setOrigin(0.5);
    this.contentContainer.add([gainsTitle, gainsItems]);

    // 7. 开启崭新大学人生按钮 (底部 y: 746)
    const startLifeBtnY = 746;
    const startLifeBtn = this.scene.add.graphics();
    startLifeBtn.fillStyle(0x991b1b, 1);
    startLifeBtn.fillRoundedRect(25, startLifeBtnY, w - 50, 52, 10);
    startLifeBtn.lineStyle(2, 0xfacc15, 1);
    startLifeBtn.strokeRoundedRect(25, startLifeBtnY, w - 50, 52, 10);

    const startLifeBtnText = this.scene.add.text(
      w / 2,
      startLifeBtnY + 26,
      "★ 开启崭新大学人生篇章 ★",
      {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "16px",
        color: "#ffffff",
        fontStyle: "bold",
        resolution: GAME_RESOLUTION,
      }
    ).setOrigin(0.5);

    startLifeBtn.setInteractive(
      new Phaser.Geom.Rectangle(25, startLifeBtnY, w - 50, 52),
      Phaser.Geom.Rectangle.Contains
    );

    startLifeBtn.on("pointerdown", () => {
      if (report && letter && gains) {
        this.onCompleteCallback?.({
          track: this.stateMachine.chosenTrack,
          scoreReport: report,
          admissionLetter: letter,
          statGains: gains,
        });
      }
      this.onCloseCallback?.();
      this.destroy();
    });

    this.contentContainer.add([startLifeBtn, startLifeBtnText]);
  }

  /** 获取 UI 诊断数据，便于自动化监控与回归断言 */
  public getUiDiagnostics(): Record<string, unknown> {
    const q = this.stateMachine.getCurrentQuestion();
    return {
      protocol: "gaokao-modal-v1",
      stage: this.stateMachine.stage,
      subStage: this.stateMachine.subStage,
      chosenTrack: this.stateMachine.chosenTrack,
      candidateName: this.stateMachine.candidateName,
      currentQuestionIndex: this.stateMachine.currentQuestionIndex,
      currentQuestionId: q?.id ?? null,
      answeredCount: Object.keys(this.stateMachine.userAnswers).length,
      totalScore: this.stateMachine.scoreReport?.totalScore ?? null,
      provinceRank: this.stateMachine.scoreReport?.provinceRank ?? null,
      admittedUniversity: this.stateMachine.admissionLetter?.universityName ?? null,
      admittedMajor: this.stateMachine.admissionLetter?.majorName ?? null,
    };
  }

  /** 销毁 */
  public destroy(fromScene?: boolean): void {
    this.contentContainer.destroy(fromScene);
    super.destroy(fromScene);
  }
}
