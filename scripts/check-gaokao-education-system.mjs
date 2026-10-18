/**
 * 真实高中与高考系统自动化深度校验脚本 (Gaokao Education System Checker)
 *
 * 验证目标：
 * 1. 契约规范与各科分值校验（满分 750 分，理综物化生 110/100/90，文综史政地 100/100/100）；
 * 2. 真实严肃题库完整性校验（摒弃一切段子烂梗，考查名篇默写、立几解几、孟德尔遗传、阿伏加德罗、辛亥革命、价值规律、晨昏线等）；
 * 3. 高二文理分科仪式逻辑校验；
 * 4. 模拟考与高考考卷确定性组卷校验；
 * 5. 双轨制科学算分模型与全省位次偏态排位校验；
 * 6. 平行志愿梯度录取与王牌专业/服从调剂机制校验；
 * 7. 正式高等学校招生录取通知书生成校验；
 * 8. 100% 确定性全流程可重现测试。
 */

import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

const educationPath = path.resolve("apps/game/src/education/index.ts");
const educationUrl = pathToFileURL(educationPath).href;

console.log("🎓 正在加载高中分科与高考系统核心模块:", educationUrl);
const eduModule = await import(educationUrl);

const {
  GAOKAO_SUBJECT_MAX_SCORES,
  GAOKAO_QUESTION_BANK,
  UNIVERSITIES_DATABASE,
  GaokaoEngine,
  DeterministicRNG,
} = eduModule;

console.log("================================================================");
console.log("【测试 1: 满分 750 分各科分值标准与文理分科契约校验】");
{
  assert.equal(GAOKAO_SUBJECT_MAX_SCORES.total, 750, "高考全卷总分必须严格为 750 分");
  assert.equal(GAOKAO_SUBJECT_MAX_SCORES.chinese, 150, "语文满分必须为 150 分");
  assert.equal(GAOKAO_SUBJECT_MAX_SCORES.math, 150, "数学满分必须为 150 分");
  assert.equal(GAOKAO_SUBJECT_MAX_SCORES.english, 150, "英语满分必须为 150 分");
  assert.equal(GAOKAO_SUBJECT_MAX_SCORES.science_comprehensive, 300, "理科综合满分必须为 300 分");
  assert.equal(GAOKAO_SUBJECT_MAX_SCORES.arts_comprehensive, 300, "文科综合满分必须为 300 分");

  // 理综小分核算
  const sciSum =
    GAOKAO_SUBJECT_MAX_SCORES.physics +
    GAOKAO_SUBJECT_MAX_SCORES.chemistry +
    GAOKAO_SUBJECT_MAX_SCORES.biology;
  assert.equal(sciSum, 300, "理综物理(110)+化学(100)+生物(90)总和必须严格等于 300 分");

  // 文综小分核算
  const artsSum =
    GAOKAO_SUBJECT_MAX_SCORES.history +
    GAOKAO_SUBJECT_MAX_SCORES.politics +
    GAOKAO_SUBJECT_MAX_SCORES.geography;
  assert.equal(artsSum, 300, "文综历史(100)+政治(100)+地理(100)总和必须严格等于 300 分");

  console.log("✅ 750分制与文理各科分值标准校验完全通过！");
}

console.log("----------------------------------------------------------------");
console.log("【测试 2: 学术真题库严谨性与知识点考查深度校验】");
{
  assert(GAOKAO_QUESTION_BANK.length >= 20, "真题库题量应丰富充沛 (>=20)");

  // 1. 验证语文模块
  const chnQuestions = GAOKAO_QUESTION_BANK.filter((q) => q.subject === "chinese");
  assert(chnQuestions.some((q) => q.subTopic.includes("文言实词")), "语文题库必须包含文言实词虚词考查");
  assert(chnQuestions.some((q) => q.subTopic.includes("逍遥游")), "语文题库必须包含《逍遥游》名篇默写");
  assert(chnQuestions.some((q) => q.subTopic.includes("琵琶行")), "语文题库必须包含《琵琶行》名篇默写");
  assert(chnQuestions.some((q) => q.subTopic.includes("病句")), "语文题库必须包含现代汉语病句辨析");

  // 2. 验证数学模块（文理分科）
  const mathSciQuestions = GAOKAO_QUESTION_BANK.filter((q) => q.subject === "math_science");
  const mathArtQuestions = GAOKAO_QUESTION_BANK.filter((q) => q.subject === "math_arts");
  assert(mathSciQuestions.length > 0, "必须包含理科数学题");
  assert(mathArtQuestions.length > 0, "必须包含文科数学题");
  assert(mathSciQuestions.some((q) => q.subTopic.includes("立体几何")), "理数必须考查立体几何垂直证明");
  assert(mathSciQuestions.some((q) => q.subTopic.includes("椭圆")), "理数必须考查解析几何椭圆离心率");
  assert(mathSciQuestions.some((q) => q.subTopic.includes("数列")), "理数必须考查数列裂项相消求和");
  assert(mathArtQuestions.some((q) => q.subTopic.includes("双曲线")), "文数必须考查双曲线渐近线");

  // 3. 验证英语模块
  const engQuestions = GAOKAO_QUESTION_BANK.filter((q) => q.subject === "english");
  assert(engQuestions.some((q) => q.subTopic.includes("非谓语动词")), "英语必须考查非谓语动词");
  assert(engQuestions.some((q) => q.subTopic.includes("定语从句")), "英语必须考查定语从句关系代词/副词");
  assert(engQuestions.some((q) => q.subTopic.includes("虚拟语气")), "英语必须考查虚拟语气");

  // 4. 验证理综模块（物化生）
  const phyQuestions = GAOKAO_QUESTION_BANK.filter((q) => q.subject === "physics");
  const chemQuestions = GAOKAO_QUESTION_BANK.filter((q) => q.subject === "chemistry");
  const bioQuestions = GAOKAO_QUESTION_BANK.filter((q) => q.subject === "biology");
  assert(phyQuestions.some((q) => q.subTopic.includes("牛顿第二定律")), "物理必须考查牛顿第二定律斜面模型");
  assert(phyQuestions.some((q) => q.subTopic.includes("磁场")), "物理必须考查带电粒子磁场偏转");
  assert(chemQuestions.some((q) => q.subTopic.includes("阿伏加德罗")), "化学必须考查阿伏加德罗常数 NA 辨析");
  assert(chemQuestions.some((q) => q.subTopic.includes("原电池")), "化学必须考查原电池电极方程式书写");
  assert(bioQuestions.some((q) => q.subTopic.includes("孟德尔")), "生物必须考查孟德尔自由组合定律概率");
  assert(bioQuestions.some((q) => q.subTopic.includes("伴 X 染色体")), "生物必须考查伴性遗传概率推导");

  // 5. 验证文综模块（史政地）
  const hisQuestions = GAOKAO_QUESTION_BANK.filter((q) => q.subject === "history");
  const polQuestions = GAOKAO_QUESTION_BANK.filter((q) => q.subject === "politics");
  const geoQuestions = GAOKAO_QUESTION_BANK.filter((q) => q.subject === "geography");
  assert(hisQuestions.some((q) => q.subTopic.includes("辛亥革命")), "历史必须考查辛亥革命历史功绩与意义");
  assert(hisQuestions.some((q) => q.subTopic.includes("十一届三中全会")), "历史必须考查十一届三中全会伟大转折");
  assert(polQuestions.some((q) => q.subTopic.includes("价值规律")), "政治必须考查经济生活价值规律");
  assert(polQuestions.some((q) => q.subTopic.includes("人民代表大会")), "政治必须考查人民代表大会制度民主集中制");
  assert(geoQuestions.some((q) => q.subTopic.includes("晨昏线")), "地理必须考查自然地理晨昏线判读");
  assert(geoQuestions.some((q) => q.subTopic.includes("地中海气候")), "地理必须考查气候类型分布与大气环流成因");

  // 6. 严密品质检查：所有试题必须具备 4 个选项，且选项互不相同，解析详尽
  for (const q of GAOKAO_QUESTION_BANK) {
    assert.equal(q.options.length, 4, `试题 [${q.id}] 必须严格包含 4 个选项`);
    assert(q.correctIndex >= 0 && q.correctIndex <= 3, `试题 [${q.id}] 正确索引必须在 0~3 之间`);
    assert(q.analysis.length >= 30, `试题 [${q.id}] 必须配有名师详尽解题思路与考点剖析`);
    // 检查绝无网络烂梗关键词
    const rawText = q.stem + q.options.join("") + q.analysis;
    assert(!rawText.includes("买橘子"), `试题 [${q.id}] 严禁出现网络烂梗“买橘子”`);
    assert(!rawText.includes("水池放水"), `试题 [${q.id}] 严禁出现网络烂梗“水池放水”`);
    assert(!rawText.includes("蒙题口诀"), `试题 [${q.id}] 严禁出现网络烂梗“蒙题口诀”`);
  }

  console.log(`✅ 学术真题库 (${GAOKAO_QUESTION_BANK.length} 道全真名题) 严谨性与知识点深度覆盖全部通过！`);
}

console.log("----------------------------------------------------------------");
console.log("【测试 3: 高二文理分科仪式与宣誓逻辑】");
{
  const engine = new GaokaoEngine(2026);
  const foundation = {
    chinese: 85,
    math: 90,
    english: 82,
    physics: 92,
    chemistry: 88,
    biology: 86,
    history: 70,
    politics: 68,
    geography: 72,
    stability: 80,
  };

  const sciDecision = engine.performTrackDecision("science", foundation);
  assert.equal(sciDecision.track, "science");
  assert(sciDecision.declaration.includes("理科"), "理科宣誓词必须契合科技强国主题");
  assert(sciDecision.focusSubjects.some((s) => s.includes("物理 110")), "理科应强化物化生 110/100/90 分制");

  const artDecision = engine.performTrackDecision("arts", foundation);
  assert.equal(artDecision.track, "arts");
  assert(artDecision.declaration.includes("文科"), "文科宣誓词必须契合人文修养主题");
  assert(artDecision.focusSubjects.some((s) => s.includes("政治 100")), "文科应强化史政地各100分制");

  console.log("✅ 文理分科仪式与主攻方向确认校验通过！");
}

console.log("----------------------------------------------------------------");
console.log("【测试 4: 模拟考与高考考卷确定性组卷校验】");
{
  const engine = new GaokaoEngine(42);

  // 生成理科高考试卷
  const sciPaper = engine.generateExamPaper("science", "gaokao", 2026);
  assert.equal(sciPaper.track, "science");
  assert(sciPaper.mathQuestions.every((q) => q.subject === "math_science"), "理科考卷数学部分必须为理数");
  assert(sciPaper.comprehensiveQuestions.some((q) => q.subject === "physics"), "理科综合必须包含物理");
  assert(sciPaper.comprehensiveQuestions.some((q) => q.subject === "chemistry"), "理科综合必须包含化学");
  assert(sciPaper.comprehensiveQuestions.some((q) => q.subject === "biology"), "理科综合必须包含生物");
  assert(!sciPaper.comprehensiveQuestions.some((q) => q.subject === "history"), "理科综合严禁包含历史题");

  // 生成文科高考试卷
  const artPaper = engine.generateExamPaper("arts", "gaokao", 2026);
  assert.equal(artPaper.track, "arts");
  assert(artPaper.mathQuestions.every((q) => q.subject === "math_arts"), "文科考卷数学部分必须为文数");
  assert(artPaper.comprehensiveQuestions.some((q) => q.subject === "history"), "文科综合必须包含历史");
  assert(artPaper.comprehensiveQuestions.some((q) => q.subject === "politics"), "文科综合必须包含政治");
  assert(artPaper.comprehensiveQuestions.some((q) => q.subject === "geography"), "文科综合必须包含地理");
  assert(!artPaper.comprehensiveQuestions.some((q) => q.subject === "physics"), "文科综合严禁包含物理题");

  console.log(`✅ 理科考卷 (${sciPaper.totalQuestionCount} 题) 与文科考卷 (${artPaper.totalQuestionCount} 题) 组卷分流校验通过！`);
}

console.log("----------------------------------------------------------------");
console.log("【测试 5: 双轨制算分模型、各科小分与全省位次排位校验】");
{
  const engine = new GaokaoEngine(123456);
  const sciPaper = engine.generateExamPaper("science", "gaokao", 2026);

  // 场景 A：省前百名顶尖理科学霸（平时 96+，考场全部正确）
  const topFoundation = {
    chinese: 95,
    math: 98,
    english: 96,
    physics: 98,
    chemistry: 95,
    biology: 96,
    history: 60,
    politics: 60,
    geography: 60,
    stability: 95,
  };
  const perfectAnswers = {};
  for (const q of [
    ...sciPaper.chineseQuestions,
    ...sciPaper.mathQuestions,
    ...sciPaper.englishQuestions,
    ...sciPaper.comprehensiveQuestions,
  ]) {
    perfectAnswers[q.id] = q.correctIndex;
  }

  const topReport = engine.evaluateExamResults(
    sciPaper,
    { sessionId: sciPaper.sessionId, candidateName: "林晨 (理科学霸)", track: "science", answers: perfectAnswers },
    topFoundation
  );

  console.log(`[顶尖学霸战报] 语文: ${topReport.chineseScore}/150, 数学: ${topReport.mathScore}/150, 英语: ${topReport.englishScore}/150, 理综: ${topReport.comprehensiveScore}/300 (物:${topReport.comprehensiveDetail.sub1.score}, 化:${topReport.comprehensiveDetail.sub2.score}, 生:${topReport.comprehensiveDetail.sub3.score}), 总分: ${topReport.totalScore}/750`);
  console.log(`全省位次: 第 ${topReport.provinceRank} 名 / 前 ${topReport.percentileRank}% (基数 650,000 考生)`);

  assert(topReport.totalScore >= 700, "平时优秀且考场全对者总分应突破 700 分");
  assert(topReport.provinceRank <= 50, "700+ 超高分位次应处于全省前 50 名之内");
  assert.equal(topReport.eligibleTier, "c9_top", "700+ 高分应达到 C9 清北最高梯队资格");

  // 场景 B：重点一本水平考生（平时 82 分，考场大部分正确）
  const firstTierFoundation = {
    chinese: 82,
    math: 85,
    english: 80,
    physics: 84,
    chemistry: 80,
    biology: 82,
    history: 60,
    politics: 60,
    geography: 60,
    stability: 75,
  };
  const mostlyCorrectAnswers = {};
  [
    ...sciPaper.chineseQuestions,
    ...sciPaper.mathQuestions,
    ...sciPaper.englishQuestions,
    ...sciPaper.comprehensiveQuestions,
  ].forEach((q, idx) => {
    // 80% 答对
    mostlyCorrectAnswers[q.id] = idx % 5 === 0 ? (q.correctIndex + 1) % 4 : q.correctIndex;
  });

  const firstTierReport = engine.evaluateExamResults(
    sciPaper,
    { sessionId: sciPaper.sessionId, candidateName: "张扬 (一本考生)", track: "science", answers: mostlyCorrectAnswers },
    firstTierFoundation
  );

  console.log(`[一本考生战报] 语文: ${firstTierReport.chineseScore}, 数学: ${firstTierReport.mathScore}, 英语: ${firstTierReport.englishScore}, 理综: ${firstTierReport.comprehensiveScore}, 总分: ${firstTierReport.totalScore}`);
  console.log(`全省位次: 第 ${firstTierReport.provinceRank} 名 / 前 ${firstTierReport.percentileRank}%`);

  assert(firstTierReport.totalScore >= 550 && firstTierReport.totalScore <= 630, "重点一本档总分应在 550~630 分区间");
  assert(firstTierReport.provinceRank > 10000, "一本段全省位次应在 10,000 名开外");

  console.log("✅ 双轨制算分模型与全省位次排位模型校验完全通过！");
}

console.log("----------------------------------------------------------------");
console.log("【测试 6: 平行志愿录取、王牌专业竞争与服从调剂机制】");
{
  const engine = new GaokaoEngine(8888);

  // 1. 模拟学霸第一志愿报考清华大学姚班
  const reportHigh = {
    sessionId: "gaokao_2026_science",
    sessionName: "普通高等学校招生全国统一考试",
    candidateName: "陈志远",
    track: "science",
    chineseScore: 140,
    mathScore: 148,
    englishScore: 142,
    comprehensiveScore: 285,
    comprehensiveDetail: {
      sub1: { name: "物理", score: 106, maxScore: 110 },
      sub2: { name: "化学", score: 95, maxScore: 100 },
      sub3: { name: "生物", score: 84, maxScore: 90 },
    },
    totalScore: 715,
    provinceRank: 12,
    totalCandidatesInProvince: 650000,
    percentileRank: 0.0018,
    eligibleTier: "c9_top",
    evaluationComment: "全省金榜前列！",
  };

  const volunteerSubmissionA = {
    candidateName: "陈志远",
    track: "science",
    firstChoice: { universityId: "tsinghua_univ", majorName: "计算机科学实验班 (姚班)" },
    secondChoice: { universityId: "peking_univ", majorName: "基础数学拔尖人才培养计划" },
    thirdChoice: { universityId: "shanghai_jiaotong_univ", majorName: "电子信息类 (IEEE荣誉试点班)" },
    obeyAdjustment: true,
  };

  const noticeA = engine.processVolunteerAdmission(reportHigh, volunteerSubmissionA, 2026);
  console.log(`[录取通知书 A] 考生: ${noticeA.candidateName}, 录取高校: ${noticeA.universityName}, 专业: ${noticeA.majorName}, 编号: ${noticeA.admissionNo}`);
  assert.equal(noticeA.universityName, "清华大学", "715超高分必须被第一志愿清华大学录取");
  assert.equal(noticeA.majorName, "计算机科学实验班 (姚班)", "总分达标应成功录取至清华姚班王牌专业");
  assert(noticeA.congratulationCouplet[0].includes("十年寒窗"), "王牌录取应生成霸气名牌对联");

  // 2. 模拟分数达到交大投档线，但申报热门专业溢价分不足、勾选服从调剂成功录取保底专业
  const reportMid985 = {
    sessionId: "gaokao_2026_science",
    sessionName: "普通高等学校招生全国统一考试",
    candidateName: "李思睿",
    track: "science",
    chineseScore: 128,
    mathScore: 135,
    englishScore: 132,
    comprehensiveScore: 281,
    comprehensiveDetail: {
      sub1: { name: "物理", score: 102, maxScore: 110 },
      sub2: { name: "化学", score: 94, maxScore: 100 },
      sub3: { name: "生物", score: 85, maxScore: 90 },
    },
    totalScore: 676, // 交大理科投档线 675，但 IEEE 班需要 675 + 6 = 681
    provinceRank: 1850,
    totalCandidatesInProvince: 650000,
    percentileRank: 0.28,
    eligibleTier: "east_china_5",
    evaluationComment: "华东五校录取！",
  };

  const volunteerSubmissionB = {
    candidateName: "李思睿",
    track: "science",
    firstChoice: { universityId: "shanghai_jiaotong_univ", majorName: "电子信息类 (IEEE荣誉试点班)" }, // 需要681
    secondChoice: { universityId: "zhejiang_univ", majorName: "控制科学与工程" },
    thirdChoice: { universityId: "nanjing_univ", majorName: "物理学拔尖班" },
    obeyAdjustment: true, // 服从专业调剂
  };

  const noticeB = engine.processVolunteerAdmission(reportMid985, volunteerSubmissionB, 2026);
  console.log(`[录取通知书 B] 考生: ${noticeB.candidateName}, 录取高校: ${noticeB.universityName}, 专业: ${noticeB.majorName} (服从调剂)`);
  assert.equal(noticeB.universityName, "上海交通大学", "达到投档线675必须被交大提档");
  assert.notEqual(noticeB.majorName, "电子信息类 (IEEE荣誉试点班)", "分数未达681不得直接入选IEEE班");
  assert(noticeB.majorName.length > 0, "服从调剂必须分配校内专业（如船舶与海洋工程等）");

  console.log("✅ 平行志愿录取与王牌专业/服从调剂机制验证完全通过！");
}

console.log("----------------------------------------------------------------");
console.log("【测试 7: 100% 确定性可重现性测试】");
{
  const runSimulation = (seed) => {
    const engine = new GaokaoEngine(seed);
    const paper = engine.generateExamPaper("science", "gaokao", 2026);
    const foundation = {
      chinese: 88,
      math: 92,
      english: 85,
      physics: 89,
      chemistry: 86,
      biology: 84,
      history: 60,
      politics: 60,
      geography: 60,
      stability: 80,
    };
    const answers = {};
    paper.chineseQuestions.forEach((q) => (answers[q.id] = q.correctIndex));
    paper.mathQuestions.forEach((q) => (answers[q.id] = q.correctIndex));
    paper.englishQuestions.forEach((q) => (answers[q.id] = (q.correctIndex + 1) % 4));
    paper.comprehensiveQuestions.forEach((q) => (answers[q.id] = q.correctIndex));

    const report = engine.evaluateExamResults(
      paper,
      { sessionId: paper.sessionId, candidateName: "测试员", track: "science", answers },
      foundation
    );

    const submission = {
      candidateName: "测试员",
      track: "science",
      firstChoice: { universityId: "zhejiang_univ", majorName: "控制科学与工程" },
      secondChoice: { universityId: "sichuan_univ", majorName: "华西口腔医学院 (口腔医学八年制)" },
      thirdChoice: { universityId: "bupt_univ", majorName: "通信工程卓越工程师班" },
      obeyAdjustment: true,
    };

    const notice = engine.processVolunteerAdmission(report, submission, 2026);
    return {
      totalScore: report.totalScore,
      provinceRank: report.provinceRank,
      universityName: notice.universityName,
      majorName: notice.majorName,
      admissionNo: notice.admissionNo,
    };
  };

  const res1 = runSimulation(99999);
  const res2 = runSimulation(99999);
  const res3 = runSimulation(99999);

  assert.deepEqual(res1, res2, "同种子两次推演必须 100% 完全相同");
  assert.deepEqual(res2, res3, "多次重放必须绝对确定性");

  console.log(`确定性验证结果: 总分 ${res1.totalScore}, 位次 ${res1.provinceRank}, 录取 ${res1.universityName} ${res1.majorName}`);
  console.log("✅ 100% 确定性全流程回归测试完全通过！");
}

console.log("================================================================");
console.log("🎉 高中分科与高考真题系统所有测试全部一次性顺利通过！");
