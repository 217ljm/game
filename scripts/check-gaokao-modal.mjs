/**
 * 高考答题与文理分科 UI 组件及状态机全流程测试验证脚本 (Gaokao Modal & State Machine Checker)
 *
 * 验证目标：
 * 1. 契约规范与文件导出：GaokaoModal、GaokaoStateMachine 与 390x844 竖屏视口参数
 * 2. 阶段 1：文理分科仪式 (TrackSelection) 状态机流转与选科响应
 * 3. 阶段 2：高考真题答题大考 (ExamSession) 准考证与学术真题组卷、选项作答记录、上一题/下一题边界
 * 4. 阶段 3：放榜与录取通知书 (ScoreAndAdmission) 满分 750 算分、全省排位位次、各梯次志愿投档录取、红金信函展开与属性增益
 * 5. UI 诊断数据协议 (protocol: "gaokao-modal-v1") 与自动化测试闭环
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(".");
const modalPath = path.resolve(root, "apps/game/src/education/ui/gaokao-modal.ts");
const indexPath = path.resolve(root, "apps/game/src/education/index.ts");
const enginePath = path.resolve(root, "apps/game/src/education/gaokao-engine.ts");
const questionBankPath = path.resolve(root, "apps/game/src/education/gaokao-question-bank.ts");
const contractsPath = path.resolve(root, "apps/game/src/education/gaokao-contracts.ts");

console.log("================================================================");
console.log("【高考答题与文理分科 UI 交互组件与状态机自动化回归验证】");
console.log("================================================================");

// ----------------------------------------------------
// 1. 源码契约与视口规范静态检查
// ----------------------------------------------------
console.log("[测试 1: 静态契约与 390x844 竖屏视口规范校验]");
{
  assert.ok(fs.existsSync(modalPath), `GaokaoModal 组件文件必须存在: ${modalPath}`);
  assert.ok(fs.existsSync(indexPath), `出口文件必须存在: ${indexPath}`);
  assert.ok(fs.existsSync(enginePath), `引擎文件必须存在: ${enginePath}`);
  assert.ok(fs.existsSync(questionBankPath), `题库文件必须存在: ${questionBankPath}`);
  assert.ok(fs.existsSync(contractsPath), `契约文件必须存在: ${contractsPath}`);

  const modalSource = fs.readFileSync(modalPath, "utf8");
  const indexSource = fs.readFileSync(indexPath, "utf8");

  // 必须继承自 Phaser.GameObjects.Container
  assert.ok(
    modalSource.includes("export class GaokaoModal extends Phaser.GameObjects.Container"),
    "GaokaoModal 必须继承自 Phaser.GameObjects.Container"
  );
  // 必须导出纯状态机控制器 GaokaoStateMachine
  assert.ok(
    modalSource.includes("export class GaokaoStateMachine"),
    "必须导出纯状态机控制器 GaokaoStateMachine"
  );
  // 必须导出 GaokaoModalStage
  assert.ok(
    modalSource.includes("export type GaokaoModalStage"),
    "必须导出 GaokaoModalStage"
  );
  // 必须适配 390x844 竖屏
  assert.ok(
    modalSource.includes("config.width ?? 390") && modalSource.includes("config.height ?? 844"),
    "必须严格默认 390x844 竖屏视口"
  );
  // 必须置顶弹出
  assert.ok(
    modalSource.includes("this.setDepth(1000)"),
    "必须设置置顶深度 (setDepth 1000)"
  );
  // 必须导出协议 gaokao-modal-v1
  assert.ok(
    modalSource.includes('protocol: "gaokao-modal-v1"'),
    "必须实现 protocol: gaokao-modal-v1 诊断协议"
  );
  // 统一导出检查
  assert.ok(
    indexSource.includes('export * from "./ui/gaokao-modal.ts";'),
    "apps/game/src/education/index.ts 必须统一导出 ui/gaokao-modal.ts"
  );

  console.log("✅ 静态源码契约、继承关系与 390x844 竖屏视口配置校验完全通过！");
}

// ----------------------------------------------------
// 2. 动态加载模块与状态机运行测试
// ----------------------------------------------------
console.log("----------------------------------------------------------------");
console.log("🎓 正在动态加载高考核心状态机与题库模块...");
const modalUrl = pathToFileURL(modalPath).href;
const eduUrl = pathToFileURL(indexPath).href;

const modalModule = await import(modalUrl);
const { GaokaoStateMachine } = modalModule;

// ----------------------------------------------------
// 3. 阶段 1：文理分科仪式 (TrackSelection) 流转测试
// ----------------------------------------------------
console.log("----------------------------------------------------------------");
console.log("【测试 2: 阶段 1 文理分科仪式 (TrackSelection) 状态机流转与选科响应】");
{
  const sm = new GaokaoStateMachine({
    initialStage: "track_selection",
    candidateName: "林远",
    candidateAge: 16,
    year: 2026,
    chosenTrack: "science",
  });

  assert.equal(sm.stage, "track_selection", "初始阶段必须为 track_selection");
  assert.equal(sm.chosenTrack, "science", "初始选科必须为 science");
  assert.equal(sm.candidateName, "林远", "考生姓名校验");

  // 测试切换为文科
  sm.selectTrack("arts");
  assert.equal(sm.chosenTrack, "arts", "切换后选科必须为 arts");
  assert.equal(sm.volunteer.track, "arts", "志愿对应科类必须自动同步为 arts");
  assert.equal(sm.volunteer.firstChoice.universityId, "peking_univ", "文科默认首选志愿应为北大光华");

  // 测试重新切换为理科
  sm.selectTrack("science");
  assert.equal(sm.chosenTrack, "science", "重新切换为 science");

  console.log("✅ 阶段 1 文理分科仪式状态流转与科类志愿适配校验完全通过！");
}

// ----------------------------------------------------
// 4. 阶段 2：高考真题答题大考 (ExamSession) 流转测试
// ----------------------------------------------------
console.log("----------------------------------------------------------------");
console.log("【测试 3: 阶段 2 高考真题大考 (ExamSession) 准考证、真题抽取与作答】");
{
  const sm = new GaokaoStateMachine({
    initialStage: "track_selection",
    candidateName: "林远",
    candidateAge: 18,
    year: 2026,
    chosenTrack: "science",
  });

  // 启动大考
  const paper = sm.startExamSession();
  assert.equal(sm.stage, "exam_session", "进入答题大考阶段后 stage 必须为 exam_session");
  assert.ok(paper != null, "考卷生成不能为空");
  assert.equal(paper.track, "science", "理科考卷科目属性校验");

  const questions = sm.getAllQuestions();
  assert.ok(questions.length >= 12, "考卷题目总数应充足 (>=12 题)");
  assert.equal(sm.currentQuestionIndex, 0, "起始题目索引应为 0");

  const firstQ = sm.getCurrentQuestion();
  assert.ok(firstQ != null, "首题不能为空");
  assert.equal(firstQ.subject, "chinese", "第一科必须是语文");

  // 记录答案
  sm.recordAnswer(firstQ.id, 0); // 选中 A
  assert.equal(sm.userAnswers[firstQ.id], 0, "用户答案应被正确记录");

  // 测试翻题导航边界
  const canPrevOnFirst = sm.prevQuestion();
  assert.equal(canPrevOnFirst, false, "第一题时 prevQuestion 应返回 false");

  const canNext = sm.nextQuestion();
  assert.equal(canNext, true, "能够顺利导航到下一题");
  assert.equal(sm.currentQuestionIndex, 1, "题目索引应递增为 1");

  // 模拟全卷依次作答
  while (sm.currentQuestionIndex < questions.length - 1) {
    const curQ = sm.getCurrentQuestion();
    assert.ok(curQ != null);
    sm.recordAnswer(curQ.id, curQ.correctIndex); // 模拟答对
    sm.nextQuestion();
  }
  const lastQ = sm.getCurrentQuestion();
  assert.ok(lastQ != null);
  sm.recordAnswer(lastQ.id, lastQ.correctIndex);

  const canNextOnLast = sm.nextQuestion();
  assert.equal(canNextOnLast, false, "最后一题时 nextQuestion 应返回 false");
  assert.equal(Object.keys(sm.userAnswers).length, questions.length, "全卷所有题目均已记录作答");

  console.log(`✅ 阶段 2 高考真题大考组卷 (${questions.length} 题)、作答记录与翻题边界校验通过！`);
}

// ----------------------------------------------------
// 5. 阶段 3：放榜成绩单与大学录取通知书 (ScoreAndAdmission) 验证
// ----------------------------------------------------
console.log("----------------------------------------------------------------");
console.log("【测试 4: 阶段 3 放榜成绩单 (ScoreBoard) 与录取通知书 (AdmissionLetter)】");
{
  const sm = new GaokaoStateMachine({
    candidateName: "林远",
    candidateAge: 18,
    year: 2026,
    chosenTrack: "science",
    foundation: {
      chinese: 96,
      math: 98,
      english: 95,
      physics: 96,
      chemistry: 94,
      biology: 95,
      stability: 90,
    },
    volunteer: {
      firstChoice: {
        universityId: "tsinghua_univ",
        majorName: "计算机科学实验班 (姚班)",
      },
      secondChoice: {
        universityId: "fudan_univ",
        majorName: "微电子科学与工程 (国家集成电路拔尖班)",
      },
      thirdChoice: {
        universityId: "zhejiang_univ",
        majorName: "计算机科学与技术 (竺可桢学院图灵班)",
      },
      obeyAdjustment: true,
    },
  });

  sm.startExamSession();
  const questions = sm.getAllQuestions();
  // 全部答对
  questions.forEach((q) => {
    sm.recordAnswer(q.id, q.correctIndex);
  });

  // 交卷
  const { report, letter, statGains } = sm.submitExam();

  // 1. 验证成绩单
  assert.equal(sm.stage, "score_and_admission");
  assert.equal(sm.subStage, "score_board");
  assert.ok(report.totalScore >= 690 && report.totalScore <= 750, `顶尖总分应在清北线 690~750 (实际: ${report.totalScore})`);
  assert.ok(report.provinceRank <= 500, `全省位次应排在前列 (实际: 第 ${report.provinceRank} 名)`);
  assert.equal(report.eligibleTier, "c9_top", "梯度应为 c9_top");
  assert.equal(report.chineseScore <= 150, true);
  assert.equal(report.mathScore <= 150, true);
  assert.equal(report.englishScore <= 150, true);
  assert.equal(report.comprehensiveScore <= 300, true);

  // 2. 验证录取通知书
  assert.equal(letter.universityName, "清华大学");
  assert.equal(letter.majorName, "计算机科学实验班 (姚班)");
  assert.ok(letter.admissionNo.includes("2026-GK-C9_TOP"));
  assert.ok(letter.presidentSignature.includes("清华大学 校长"));
  assert.ok(letter.congratulationCouplet[0].length > 0 && letter.congratulationCouplet[1].length > 0);

  // 3. 验证属性增益
  assert.ok(statGains.intelligence >= 25, "顶尖学府智力提升显著");
  assert.ok(statGains.reputation >= 40, "金榜题名声誉提升显著");
  assert.ok(statGains.happiness >= 25, "心情大幅愉悦");

  console.log(`✅ 成绩单揭榜: ${report.totalScore} 分 (满分 750)，全省位次: 第 ${report.provinceRank} 名`);
  console.log(`✅ 录取通知书: ${letter.universityName}【${letter.collegeName} · ${letter.majorName}】`);
  console.log(`✅ 属性收益结算: 智力 +${statGains.intelligence}，声望 +${statGains.reputation}，心情 +${statGains.happiness}`);
}

// ----------------------------------------------------
// 6. 文科考生全流程闭环验证
// ----------------------------------------------------
console.log("----------------------------------------------------------------");
console.log("【测试 5: 文科考生全流程从分科到北大光华管理学院录取闭环】");
{
  const smArts = new GaokaoStateMachine({
    candidateName: "苏晓",
    candidateAge: 18,
    year: 2026,
    chosenTrack: "arts",
    foundation: {
      chinese: 95,
      math: 92,
      english: 96,
      history: 95,
      politics: 94,
      geography: 93,
      stability: 90,
    },
    volunteer: {
      firstChoice: {
        universityId: "peking_univ",
        majorName: "光华管理学院金融经济实验班",
      },
      secondChoice: {
        universityId: "renmin_univ",
        majorName: "法学院卓越法律人才班",
      },
      thirdChoice: {
        universityId: "fudan_univ",
        majorName: "国际政治与外交学",
      },
      obeyAdjustment: true,
    },
  });

  assert.equal(smArts.chosenTrack, "arts");
  smArts.startExamSession();
  const qList = smArts.getAllQuestions();
  qList.forEach((q) => {
    smArts.recordAnswer(q.id, q.correctIndex);
  });

  const { report, letter } = smArts.submitExam();
  assert.ok(report.totalScore >= 665, `文科顶尖分数应达清北线 (实际: ${report.totalScore})`);
  assert.equal(letter.universityName, "北京大学");
  assert.equal(letter.majorName, "光华管理学院金融经济实验班");
  assert.ok(letter.welcomeMessage.includes("思想自由，兼容并包"));

  console.log(`✅ 文科考生总分: ${report.totalScore} / 750，成功考入: ${letter.universityName} ${letter.majorName}`);
}

console.log("\n================================================================");
console.log("🎉 【100% 通过】GaokaoModal 状态机与文理分科大考全部核心业务验证成功！");
console.log("================================================================");
