/**
 * 真实高考真题题库 (Gaokao Question Bank)
 *
 * 严格按照中国高考教育部统一考纲编纂
 * 彻底摒弃网络段子与低俗烂梗，严谨考查高中各科核心素养与推演能力：
 * - 语文：文言实词虚词、名篇名句默写《逍遥游》《琵琶行》《赤壁赋》、经典病句辨析
 * - 数学：立体几何垂直证明、三角函数化简、解析几何椭圆双曲线、数列求和（区分文数与理数）
 * - 英语：核心词汇辨析、非谓语动词、定语从句、虚拟语气
 * - 理综：牛顿第二定律综合、磁场洛伦兹力偏转、阿伏加德罗常数 NA、原电池电极反应式、孟德尔伴性遗传概率
 * - 文综：辛亥革命历史功绩、十一届三中全会转折、价值规律与商品经济、人民代表大会制度、晨昏线与气候成因
 */

import type { GaokaoQuestion } from "./gaokao-contracts";

export const GAOKAO_QUESTION_BANK: GaokaoQuestion[] = [
  // ==========================================
  // 【语文 (Chinese)】
  // ==========================================
  {
    id: "chn_01_wenyan",
    subject: "chinese",
    subTopic: "文言实词与文言现象",
    stem: "荀子《劝学》中写道：“假舆马者，非利足也，而致千里；假舟楫者，非能水也，而绝江河。”下列关于句中文言实词与词类活用的解说，正确的一项是：",
    options: [
      "A. “假”意为“借助、利用”；“致”意为“达到”；“水”为名词作动词，意为“游泳”",
      "B. “假”意为“假装、伪造”；“利”意为“锋利”；“绝”意为“断绝”",
      "C. “假”意为“借给”；“致”意为“招致”；“能”与现代汉语“能够”用法完全相同",
      "D. “舆”意为“驾车”；“足”为使动用法；“绝”通“决”，意为“决定”",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】本题考查文言实词、古今异义及词类活用。“假”在此处取“凭借、借助”之义；“致”表示“达到、到达”；“水”本为名词，在“非能”之后活用为动词，意为“游泳”；“绝”表示“横渡”。全句意为：借助车马的人，并不是脚走得快，却能到达千里之外；借助舟船的人，并不是会游泳，却能横渡江河。说明君子善于假借外物来弥补自身不足。",
    difficulty: "foundation",
    applicableTrack: "both",
    scoreWeight: 15,
  },
  {
    id: "chn_02_recitation_xiaoyaoyou",
    subject: "chinese",
    subTopic: "名篇名句默写 · 庄子《逍遥游》",
    stem: "庄子在《逍遥游》中阐述万物“有所待”的哲学思想时，以大鹏展翅为例，写大鹏需要浩荡的大风支撑才能飞往南海。文中表明唯有风力积聚到九万里的厚度才足以负载大翼的对应句子是：",
    options: [
      "A. 故九万里，则风斯在下矣，而后乃今培风",
      "B. 水击三千里，抟扶摇而上者九万里",
      "C. 野马也，尘埃也，生物之以息相吹也",
      "D. 背负青天，而莫之夭阏者，而后乃今将图南",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】《逍遥游》原文：“风之积也不厚，则其负大翼也无力。故九万里，则风斯在下矣，而后乃今培风；背负青天，而莫之夭阏者，而后乃今将图南。”庄子通过水浅舟沉与风薄鹏坠的对比，生动论证了世间万事万物的行动皆受客观条件的限制与依托（有待之境）。",
    difficulty: "medium",
    applicableTrack: "both",
    scoreWeight: 15,
  },
  {
    id: "chn_03_recitation_pipaxing",
    subject: "chinese",
    subTopic: "名篇名句默写 · 白居易《琵琶行》",
    stem: "白居易《琵琶行》中运用通感与精妙的比喻描摹琵琶声。在描写音乐由婉转流利骤然转向幽咽低沉、乐声暂歇却酝酿着更深层次的情感波澜，随后激昂爆发的名句是：",
    options: [
      "A. 别有幽愁暗恨生，此时无声胜有声。银瓶乍破水浆迸，铁骑突出刀枪鸣",
      "B. 大弦嘈嘈如急雨，小弦切切如私语。嘈嘈切切错杂弹，大珠小珠落玉盘",
      "C. 间关莺语花底滑，幽咽泉流冰下难。冰泉冷涩弦凝绝，凝绝不通声暂歇",
      "D. 曲终收拨当心画，四弦一声如裂帛。东船西舫悄无言，唯见江心秋月白",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】《琵琶行》名句：“别有幽愁暗恨生，此时无声胜有声。银瓶乍破水浆迸，铁骑突出刀枪鸣。”诗人写音乐由“声暂歇”的休止符突然激荡转化为刀枪齐鸣、水浆迸溅的高潮，体现了以静衬动、虚实相生的顶级艺术造诣。",
    difficulty: "medium",
    applicableTrack: "both",
    scoreWeight: 15,
  },
  {
    id: "chn_04_bingju",
    subject: "chinese",
    subTopic: "现代汉语病句辨析",
    stem: "下列各句中，没有语病且表意明确严谨的一项是：",
    options: [
      "A. 能否切实提高课堂教学效率，狠抓基础核心知识落实，是新一轮普通高中课程改革能否取得成效的关键所在。",
      "B. 由于《流浪地球》等硬核科幻电影在全国各大院线的持续热映，使广大中学生重新燃起了对天体物理与航空航天的浓厚探索兴趣。",
      "C. 随着我国空间站科学实验的全面展开，不仅刷新了人类空间轨道长期驻留的工程记录，而且还铸就了严谨求实的载人航天精神。",
      "D. 本届国际青年物理学家学术研讨会的与会人数之所以创下历史新高，其根本原因主要是由于国际学术委员会采取了线上线下混合办会机制导致的。",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】A项前后均为“两面对两面”（“能否...是能否...”），主谓宾搭配协调，逻辑缜密，没有语病。\nB项“由于……使……”滥用介词短语，淹没句子主语，导致成分残缺；\nC项“随着……不仅刷新……”同样介词滥用导致主语残缺，且语序不当；\nD项“根本原因主要是由于……导致的”犯了高考典型的“句式杂糅”错误（把“原因是……”和“是由……导致的”混在一起）。",
    difficulty: "hard",
    applicableTrack: "both",
    scoreWeight: 20,
  },
  {
    id: "chn_05_recitation_chibifu",
    subject: "chinese",
    subTopic: "名篇名句默写 · 苏轼《赤壁赋》",
    stem: "苏轼在《赤壁赋》中凭吊赤壁古战场，借客之口感叹人生短促、个体在浩瀚宇宙面前极其渺小的名句是：",
    options: [
      "A. 寄蜉蝣于天地，渺沧海之一粟。哀吾生之须臾，羡长江之无穷",
      "B. 清风徐来，水波不兴。举酒属客，诵明月之诗，歌窈窕之章",
      "C. 白露横江，水光接天。纵一苇之所如，凌万顷之茫然",
      "D. 舞幽壑之潜蛟，泣孤舟之嫠妇。客有吹洞箫者，倚歌而和之",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】《赤壁赋》名句：“寄蜉蝣于天地，渺沧海之一粟。哀吾生之须臾，羡长江之无穷。”客由曹操当年“舳舻千里，旌旗蔽空”的不可一世，联想到英雄安在，进而抒发人生虚无短促之悲，苏轼随后则以“自其变者而观之，则天地曾不能以一瞬；自其不变者而观之，则物与我皆无尽也”进行哲学开解。",
    difficulty: "medium",
    applicableTrack: "both",
    scoreWeight: 15,
  },

  // ==========================================
  // 【理科数学 (Math Science)】
  // ==========================================
  {
    id: "math_sci_01_solid_geometry",
    subject: "math_science",
    subTopic: "立体几何 · 线面垂直判定与空间位置关系",
    stem: "在直四棱柱 ABCD-A1B1C1D1 中，底面 ABCD 为正方形，AA1 = 2AB，点 E 为棱 AA1 的中点。下列关于该空间几何体位置关系的命题中，正确的是：",
    options: [
      "A. AC ⊥ B1D 恒成立",
      "B. 直线 CE ⊥ 平面 B1DE",
      "C. 直线 A1C 与底面 ABCD 所成角的正切值为 √2",
      "D. 平面 B1DE 与底面 ABCD 互相垂直",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】\n在直四棱柱中，底面 ABCD 为正方形，故对角线 AC ⊥ BD。\n又因为侧棱 DD1 ⊥ 底面 ABCD，且 AC ⊂ 平面 ABCD，所以 DD1 ⊥ AC。\n因为 BD ∩ DD1 = D，且 BD, DD1 ⊂ 平面 BDD1B1，\n所以 AC ⊥ 平面 BDD1B1。\n又因为体对角线 B1D ⊂ 平面 BDD1B1，\n因此必有 AC ⊥ B1D 恒成立！故 A 项命题正确。",
    difficulty: "medium",
    applicableTrack: "science",
    scoreWeight: 20,
  },
  {
    id: "math_sci_02_trig_function",
    subject: "math_science",
    subTopic: "三角恒等变换 · 辅助角公式与性质",
    stem: "已知函数 f(x) = √3 sin(2x) + cos(2x) - 1，下列关于函数 f(x) 的周期、最值及单调性的描述中，正确的是：",
    options: [
      "A. 函数 f(x) 的最小正周期为 π，且在区间 [0, π/6] 上单调递增，最大值为 1",
      "B. 函数 f(x) 的最小正周期为 2π，最大值为 √3 + 1",
      "C. 函数 f(x) 的图像关于直线 x = π/3 对称",
      "D. 函数 f(x) 的值域为 [-2, 2]",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】\n利用辅助角公式化简：\nf(x) = 2 * [ (√3/2)sin(2x) + (1/2)cos(2x) ] - 1 = 2 sin(2x + π/6) - 1。\n(1) 周期 T = 2π / ω = 2π / 2 = π。\n(2) 当 2x + π/6 = π/2 时，sin 取得最大值 1，此时 f(x)_max = 2(1) - 1 = 1。\n(3) 当 x ∈ [0, π/6] 时，2x + π/6 ∈ [π/6, π/2]，正弦函数在该区间单调递增，因此 f(x) 单调递增。故 A 正确。",
    difficulty: "medium",
    applicableTrack: "science",
    scoreWeight: 20,
  },
  {
    id: "math_sci_03_conic_ellipse",
    subject: "math_science",
    subTopic: "解析几何 · 椭圆离心率推导",
    stem: "已知椭圆 C: x²/a² + y²/b² = 1 (a > b > 0) 的左、右焦点分别为 F1, F2，上顶点为 B。若 ∠F1BF2 = 90°，则该椭圆的离心率 e 为：",
    options: [
      "A. √2 / 2",
      "B. 1 / 2",
      "C. √3 / 2",
      "D. (√5 - 1) / 2",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】\n上顶点坐标为 B(0, b)，焦点为 F1(-c, 0), F2(c, 0)。\n根据椭圆定义与对称性，|BF1| = |BF2| = a。\n在 △F1BF2 中，∠F1BF2 = 90°，且 |BF1| = |BF2| = a，故 △F1BF2 是等腰直角三角形。\n底边 |F1F2| = 2c。\n由勾股定理：a² + a² = (2c)² ⇒ 2a² = 4c² ⇒ a² = 2c²。\n因此 c/a = 1/√2 = √2 / 2。椭圆的离心率 e = c/a = √2 / 2。故选 A。",
    difficulty: "hard",
    applicableTrack: "science",
    scoreWeight: 20,
  },
  {
    id: "math_sci_04_sequence_split",
    subject: "math_science",
    subTopic: "数列 · 裂项相消法求和",
    stem: "已知等差数列 {a_n} 满足 a1 = 1，公差 d = 2。令 b_n = 1 / (a_n * a_{n+1})，则数列 {b_n} 的前 n 项和 S_n 等于：",
    options: [
      "A. n / (2n + 1)",
      "B. (2n) / (2n + 1)",
      "C. 1 / 2 * [ 1 - 1 / (2n - 1) ]",
      "D. (n + 1) / (2n + 3)",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】\n通项 a_n = 1 + (n - 1)*2 = 2n - 1，则 a_{n+1} = 2n + 1。\n于是 b_n = 1 / [ (2n - 1)(2n + 1) ] = 1/2 * [ 1/(2n - 1) - 1/(2n + 1) ]。\n裂项相消求和：\nS_n = 1/2 * [ (1 - 1/3) + (1/3 - 1/5) + ... + (1/(2n - 1) - 1/(2n + 1)) ]\n    = 1/2 * [ 1 - 1/(2n + 1) ] = 1/2 * [ (2n) / (2n + 1) ] = n / (2n + 1)。故选 A。",
    difficulty: "medium",
    applicableTrack: "science",
    scoreWeight: 20,
  },
  {
    id: "math_sci_05_derivative",
    subject: "math_science",
    subTopic: "导数综合 · 曲线切线方程与函数极值单调性",
    stem: "已知函数 f(x) = (x - 1) * e^x。下列关于曲线 y = f(x) 在点 (0, f(0)) 处的切线方程以及函数 f(x) 极值与单调性的判定中，正确的是：",
    options: [
      "A. 切线方程为 y = -1，函数 f(x) 在区间 (0, +∞) 上单调递增，且在 x = 0 处取得极小值 -1",
      "B. 切线方程为 y = x - 1，函数 f(x) 在 R 上单调递增，无极值",
      "C. 切线方程为 y = -x - 1，函数 f(x) 在区间 (-∞, 0) 上单调递增",
      "D. 切线方程为 y = -1，函数 f(x) 在区间 (-∞, 1) 上单调递减",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】\n(1) 求导：f'(x) = 1 * e^x + (x - 1) * e^x = x * e^x。\n(2) 在点 (0, f(0)) 处：f(0) = (0 - 1)*e^0 = -1，切线斜率 k = f'(0) = 0 * e^0 = 0。\n因此切线方程为水平线 y - (-1) = 0*(x - 0) ⇒ y = -1。\n(3) 单调性与极值：因为 e^x > 0 恒成立，所以 f'(x) 的符号完全取决于 x：\n当 x ∈ (-∞, 0) 时，f'(x) < 0，f(x) 单调递减；\n当 x ∈ (0, +∞) 时，f'(x) > 0，f(x) 单调递增。\n因此在 x = 0 处取得极小值 f(0) = -1。故选 A。",
    difficulty: "hard",
    applicableTrack: "science",
    scoreWeight: 20,
  },

  // ==========================================
  // 【文科数学 (Math Arts)】
  // ==========================================
  {
    id: "math_art_01_trig_double",
    subject: "math_arts",
    subTopic: "三角函数 · 二倍角公式与象限角",
    stem: "已知 sin α = 3/5，且 α 为第二象限角 (α ∈ (π/2, π))，则 cos(2α) 的值为：",
    options: [
      "A. 7/25",
      "B. -7/25",
      "C. 24/25",
      "D. -24/25",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】\n直接利用余弦的二倍角降幂公式：cos(2α) = 1 - 2 sin²α。\n代入 sin α = 3/5 得：\ncos(2α) = 1 - 2 * (3/5)² = 1 - 2 * (9/25) = 1 - 18/25 = 7/25。\n注意此处无需计算 cos α 即可直接求得，属于高考文科高频得分题。",
    difficulty: "foundation",
    applicableTrack: "arts",
    scoreWeight: 20,
  },
  {
    id: "math_art_02_hyperbola_asymptote",
    subject: "math_arts",
    subTopic: "圆锥曲线 · 双曲线渐近线与基本量",
    stem: "已知双曲线的标准方程为 x²/9 - y²/16 = 1，则该双曲线的渐近线方程与离心率分别为：",
    options: [
      "A. y = ± (4/3)x，离心率 e = 5/3",
      "B. y = ± (3/4)x，离心率 e = 5/4",
      "C. y = ± (16/9)x，离心率 e = √7 / 3",
      "D. y = ± (4/3)x，离心率 e = 4/3",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】\n由方程 x²/9 - y²/16 = 1 可知焦点在 x 轴上，a² = 9 ⇒ a = 3，b² = 16 ⇒ b = 4。\n焦点半距 c = √(a² + b²) = √(9 + 16) = √25 = 5。\n双曲线渐近线方程为 y = ± (b/a)x = ± (4/3)x。\n离心率 e = c / a = 5/3。故选 A。",
    difficulty: "medium",
    applicableTrack: "arts",
    scoreWeight: 20,
  },
  {
    id: "math_art_03_line_plane_parallel",
    subject: "math_arts",
    subTopic: "立体几何 · 线面平行判定定理",
    stem: "在空间四面体 ABCD 中，E, F 分别是棱 AB, AD 的中点。下列关于直线 EF 与平面 BCD 位置关系的结论中，正确的是：",
    options: [
      "A. 直线 EF 平行于平面 BCD",
      "B. 直线 EF 与平面 BCD 斜交",
      "C. 直线 EF 包含于平面 BCD 内",
      "D. 直线 EF 垂直于平面 BCD",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】\n在 △ABD 中，E, F 分别为 AB, AD 的中点，由三角形中位线定理可知 EF ∥ BD。\n又因为直线 EF ⊄ 平面 BCD，而直线 BD ⊂ 平面 BCD，\n根据空间线面平行判定定理（若平面外一条直线平行于平面内的一条直线，则该直线平行于该平面），可知 EF ∥ 平面 BCD。故选 A。",
    difficulty: "foundation",
    applicableTrack: "arts",
    scoreWeight: 20,
  },
  {
    id: "math_art_04_derivative_tangent",
    subject: "math_arts",
    subTopic: "导数应用 · 曲线在某点处的切线方程",
    stem: "已知函数 f(x) = x³ - 3x + 1。则曲线 y = f(x) 在点 P(2, f(2)) 处的切线方程为：",
    options: [
      "A. 9x - y - 15 = 0",
      "B. 3x - y - 3 = 0",
      "C. 9x + y - 21 = 0",
      "D. x - y + 1 = 0",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】\n(1) 计算切点坐标：f(2) = 2³ - 3*2 + 1 = 8 - 6 + 1 = 3，切点 P(2, 3)。\n(2) 求导函数：f'(x) = 3x² - 3。\n(3) 计算切线斜率：k = f'(2) = 3*(2)² - 3 = 12 - 3 = 9。\n(4) 由点斜式写出切线方程：y - 3 = 9*(x - 2) ⇒ y - 3 = 9x - 18 ⇒ 9x - y - 15 = 0。故选 A。",
    difficulty: "foundation",
    applicableTrack: "arts",
    scoreWeight: 20,
  },

  // ==========================================
  // 【英语 (English)】
  // ==========================================
  {
    id: "eng_01_adverb_logic",
    subject: "english",
    subTopic: "高频核心副词与语境逻辑衔接",
    stem: "The introduction of automated high-speed railway networks has not only shortened commuting time between cities, but also ______ spurred regional economic integration.",
    options: [
      "A. significantly",
      "B. suspiciously",
      "C. hesitantly",
      "D. desperately",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】\n题意：“高速铁路网的引入不仅缩短了城际通勤时间，而且‘显著地’推动了区域经济一体化。”\nA. significantly（显著地、大幅度地），符合递进逻辑；\nB. suspiciously（怀疑地、可疑地）；\nC. hesitantly（迟疑地、踌躇地）；\nD. desperately（绝望地、不顾一切地）。故选 A。",
    difficulty: "foundation",
    applicableTrack: "both",
    scoreWeight: 15,
  },
  {
    id: "eng_02_non_finite_verb",
    subject: "english",
    subTopic: "非谓语动词 · 过去分词作状语",
    stem: "______ by her high school chemistry mentor to explore traditional medicine, Tu Youyou dedicated decades of tireless effort to the discovery of artemisinin.",
    options: [
      "A. Encouraged",
      "B. Encouraging",
      "C. Having encouraged",
      "D. To encourage",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】\n句子的逻辑主语是屠呦呦（Tu Youyou）。屠呦呦与动词 encourage 之间为被动关系（受到化学老师的鼓励），因此应用过去分词 Encouraged 作原因/时间状语；Encouraging 与 Having encouraged 均表示主动，To encourage 表目的。故正确答案为 A。",
    difficulty: "medium",
    applicableTrack: "both",
    scoreWeight: 15,
  },
  {
    id: "eng_03_relative_clause",
    subject: "english",
    subTopic: "定语从句 · 关系副词与关系代词辨析",
    stem: "Astronomers have discovered an Earth-like exoplanet in the habitable zone, ______ conditions may be suitable for liquid water and microbial life.",
    options: [
      "A. where",
      "B. which",
      "C. that",
      "D. whose",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】\n先行词为 exoplanet（系外行星），在后面的非限制性定语从句中做地点状语（“在这一系外行星上，环境可能适合液态水存在”），因此需要使用关系副词 where 引导。若选用 which 或 that，从句中必须缺少主语或宾语，但从句“conditions may be suitable...”主谓表结构完整。故选 A。",
    difficulty: "medium",
    applicableTrack: "both",
    scoreWeight: 15,
  },
  {
    id: "eng_04_subjunctive_mood",
    subject: "english",
    subTopic: "虚拟语气 · 与过去事实相反",
    stem: "If the geological survey team ______ with satellite radar detectors in advance, they would have pinpointed the deep copper reserves much earlier.",
    options: [
      "A. had been equipped",
      "B. were equipped",
      "C. have been equipped",
      "D. would be equipped",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】\n主句谓语为 would have pinpointed，明确表示与过去事实相反的虚拟语气。在 if 引导的非真实条件句中，表示与过去事实相反时，从句谓语动词需采用 had + 过去分词结构。主语 survey team 与 equip 之间为被动关系（被装备），故使用 had been equipped。选 A。",
    difficulty: "hard",
    applicableTrack: "both",
    scoreWeight: 20,
  },

  // ==========================================
  // 【理综 · 物理 (Physics)】满分 110 分
  // ==========================================
  {
    id: "phy_01_newton_second_law",
    subject: "physics",
    subTopic: "力学综合 · 牛顿第二定律斜面滑块模型",
    stem: "质量 m = 2.0 kg 的物块置于倾角 θ = 30° 的固定粗糙斜面上，物块与斜面间的动摩擦因数 μ = √3 / 6。重力加速度 g 取 10 m/s²。若物块由静止开始沿斜面下滑，其加速度 a 的大小为：",
    options: [
      "A. 2.5 m/s²",
      "B. 3.0 m/s²",
      "C. 4.0 m/s²",
      "D. 5.0 m/s²",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】\n沿斜面方向受力分析：\n(1) 重力沿斜面向下的分力：G_x = mg sin 30° = 2.0 * 10 * 0.5 = 10 N；\n(2) 斜面对物块的支持力：N = mg cos 30° = 2.0 * 10 * (√3/2) = 10√3 N；\n(3) 滑动摩擦力大小：f = μN = (√3 / 6) * 10√3 = (3/6) * 10 = 5 N；\n(4) 沿斜面向下的合外力：F_合 = G_x - f = 10 - 5 = 5 N；\n由牛顿第二定律 F_合 = ma，得加速度 a = 5 / 2.0 = 2.5 m/s²。故选 A。",
    difficulty: "medium",
    applicableTrack: "science",
    scoreWeight: 35,
  },
  {
    id: "phy_02_magnetic_deflection",
    subject: "physics",
    subTopic: "电磁学 · 带电粒子在匀强磁场中的偏转",
    stem: "一个质量为 m、电荷量为 +q 的带电粒子（不计重力），以速率 v 垂直射入磁感应强度为 B 的匀强磁场中。下列关于该粒子在磁场中做匀速圆周运动的轨道半径 R 与周期 T 的表达式，正确的是：",
    options: [
      "A. R = (mv) / (qB)，且周期 T = (2πm) / (qB)，周期与速度 v 无关",
      "B. R = (qB) / (mv)，且周期 T = (πm) / (qB)",
      "C. R = (mv²) / (qB)，且周期 T 随速度增大而增大",
      "D. R = (mv) / (2qB)，且周期 T = (2πq) / (mB)",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】\n带电粒子在匀强磁场中垂直入射时，洛伦兹力提供向心力：\nqvB = m (v² / R) ⇒ 轨道半径 R = (mv) / (qB)。\n运动周期 T = 2πR / v = 2π * [ (mv) / (qB) ] / v = (2πm) / (qB)。\n由此可见，带电粒子在匀强磁场中的圆周运动周期只取决于粒子自身的荷质比与磁感应强度 B，与运动速率 v 及轨道半径 R 均无关。故选 A。",
    difficulty: "hard",
    applicableTrack: "science",
    scoreWeight: 35,
  },

  // ==========================================
  // 【理综 · 化学 (Chemistry)】满分 100 分
  // ==========================================
  {
    id: "chem_01_avogadro_constant",
    subject: "chemistry",
    subTopic: "基本概念 · 阿伏加德罗常数 NA 经典辨析",
    stem: "设 N_A 为阿伏加德罗常数的值。下列关于微粒数目与化学计量的表述中，严格正确的是：",
    options: [
      "A. 标准状况下（0℃，101 kPa），22.4 L CH4（甲烷）气体中所含的共价键数目为 4 N_A",
      "B. 常温常压下，22.4 L Cl2 气体中含有的氯气分子数目为 N_A",
      "C. 1.0 L 0.1 mol/L 的 CH3COOH（醋酸）溶液中含有的 H+ 离子数目为 0.1 N_A",
      "D. 5.6 g Fe 铁粉与足量高温水蒸气充分反应，转移的电子数为 0.3 N_A",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】\nA项：标况下 22.4 L 甲烷气体的物质的量为 1 mol，每个 CH4 分子含有 4 个 C-H 共价键，因此共价键总数为 4 N_A，正确；\nB项：常温常压下气体摩尔体积 Vm 约为 24.5 L/mol，22.4 L Cl2 的物质的量小于 1 mol，分子数少于 N_A；\nC项：醋酸为一元弱酸，在水溶液中发生部分电离，故 H+ 数目远小于 0.1 N_A；\nD项：Fe 与水蒸气在高温下反应生成 Fe3O4 和 H2（3Fe + 4H2O(g) = Fe3O4 + 4H2），5.6 g Fe 为 0.1 mol，转移电子数为 0.1 * (8/3) N_A ≈ 0.267 N_A，而非 0.3 N_A。故选 A。",
    difficulty: "medium",
    applicableTrack: "science",
    scoreWeight: 35,
  },
  {
    id: "chem_02_galvanic_cell",
    subject: "chemistry",
    subTopic: "电化学 · 原电池与氢氧燃料电池电极反应式书写",
    stem: "氢氧燃料电池是一种高效清洁能源装置。若采用稀硫酸作为酸性电解质溶液，通入 H2 的一极作为原电池负极。该负极的电极反应式书写正确的是：",
    options: [
      "A. H2 - 2e⁻ = 2H⁺",
      "B. H2 + 2OH⁻ - 2e⁻ = 2H2O",
      "C. O2 + 4H⁺ + 4e⁻ = 2H2O",
      "D. O2 + 2H2O + 4e⁻ = 4OH⁻",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】\n负极发生氧化反应，通入还原剂 H2。在酸性电解质溶液（稀硫酸）中，溶液中存在大量 H⁺，因此 H2 失电子生成的产物为 H⁺，电极反应式为：H2 - 2e⁻ = 2H⁺。\nB项为碱性电解质溶液中的负极反应；\nC项为酸性电解质溶液中的正极反应（O2 得电子结合 H⁺ 生成 H2O）；\nD项为中性或碱性电解质溶液中的正极反应。故选 A。",
    difficulty: "hard",
    applicableTrack: "science",
    scoreWeight: 35,
  },

  // ==========================================
  // 【理综 · 生物 (Biology)】满分 90 分
  // ==========================================
  {
    id: "bio_01_mendel_probability",
    subject: "biology",
    subTopic: "遗传学 · 孟德尔自由组合定律概率计算",
    stem: "已知豌豆的黄色子叶（Y）对绿色子叶（y）为显性，圆粒种子（R）对皱粒种子（r）为显性，两对等位基因独立遗传。现将基因型为 YyRr 的黄色圆粒豌豆自交，后代中表现型为“绿色圆粒”且基因型为纯合子的个体占后代总数的比例为：",
    options: [
      "A. 1/16",
      "B. 3/16",
      "C. 1/8",
      "D. 9/16",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】\n基因型为 YyRr 的双杂合子自交：\n(1) 子叶颜色：Yy × Yy ⇒ 1/4 YY, 1/2 Yy, 1/4 yy（绿色子叶基因型必须为 yy，概率为 1/4）；\n(2) 种子形状：Rr × Rr ⇒ 1/4 RR, 1/2 Rr, 1/4 rr（圆粒纯合子基因型必须为 RR，概率为 1/4）；\n两对等位基因独立遗传，应用乘法法则：纯合绿色圆粒豌豆（yyRR）在全部后代中所占比例 = (1/4) * (1/4) = 1/16。\n注意题干强调“且为纯合子”，若仅问“表现型为绿色圆粒”则为 3/16。故选 A。",
    difficulty: "medium",
    applicableTrack: "science",
    scoreWeight: 30,
  },
  {
    id: "bio_02_sex_linked_inheritance",
    subject: "biology",
    subTopic: "遗传学 · 伴 X 染色体隐性遗传概率推导",
    stem: "人类红绿色盲属于伴 X 染色体隐性遗传病（致病基因用 b 表示）。一对表型正常的夫妇，妻子的父亲是红绿色盲患者。若这对夫妇已确定怀上了一个男胎，则该男孩患红绿色盲的概率为：",
    options: [
      "A. 1/2",
      "B. 1/4",
      "C. 1/8",
      "D. 0",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】\n(1) 丈夫表型正常，其基因型为 X^B Y；\n(2) 妻子的父亲是红绿色盲患者（X^b Y），故妻子必然从其父亲处继承一条含致病基因的 X^b 染色体；又因妻子表型正常，故其基因型必然为杂合子 X^B X^b；\n(3) 题干明确说明“已确定怀上了一个男胎”，即该孩子必然从父亲处继承 Y 染色体；\n因此，该男孩是否患病完全取决于从母亲处继承哪条 X 染色体：继承 X^b 的概率为 1/2，继承 X^B 的概率为 1/2。\n故该男孩患红绿色盲的概率为 1/2。选 A。",
    difficulty: "hard",
    applicableTrack: "science",
    scoreWeight: 30,
  },
  {
    id: "bio_03_action_potential",
    subject: "biology",
    subTopic: "神经调节 · 兴奋在神经纤维上的产生与电位传导机制",
    stem: "在离体神经纤维某一点给予适宜刺激后，受刺激部位的膜电位会发生短暂逆转（产生动作电位）。下列关于神经冲动产生与膜电位变化的叙述中，正确的是：",
    options: [
      "A. 静息电位表现为内负外正，主要是由 K⁺ 外流维持的；受刺激产生动作电位时，主要是 Na⁺ 大量顺浓度梯度内流导致的",
      "B. 静息电位表现为内正外负，由 Na⁺ 外流维持；动作电位由 K⁺ 内流产生",
      "C. 兴奋在神经纤维上的传导方向与膜内局部电流的方向相反，与膜外局部电流方向相同",
      "D. 动作电位峰值的大小随着传导距离的增加而逐渐衰减为零",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】\n(1) 静息状态下，神经元细胞膜对 K⁺ 通透性大，K⁺ 顺浓度梯度外流，形成膜外为正、膜内为负的静息电位；\n(2) 受到适宜刺激时，膜上的 Na⁺ 通道开放，Na⁺ 顺浓度梯度大量快速内流，使膜电位迅速逆转为“外负内正”的动作电位；\n(3) 兴奋在神经纤维上的传导方向与膜内局部电流方向一致（均由兴奋区流向未兴奋区），与膜外局部电流方向相反；\n(4) 在正常生理条件下，神经纤维上的动作电位传导具有“不衰减性”。故 A 项正确。",
    difficulty: "medium",
    applicableTrack: "science",
    scoreWeight: 30,
  },

  // ==========================================
  // 【文综 · 历史 (History)】满分 100 分
  // ==========================================
  {
    id: "his_01_xinhai_revolution",
    subject: "history",
    subTopic: "近代史 · 辛亥革命的历史功绩与局限",
    stem: "1911 年爆发的辛亥革命是近代中国一次伟大的资产阶级民主革命。下列关于辛亥革命历史功绩的评价中，最符合历史唯物主义唯真史实的是：",
    options: [
      "A. 推翻了清王朝的封建反动统治，终结了延续两千多年的君主专制制度，使民主共和观念深入人心",
      "B. 彻底改变了近代中国半殖民地半封建的社会性质，完成了反帝反封建的历史使命",
      "C. 废除了封建地主土地所有制，全面实现了孙中山先生提出的“平均地权”纲领",
      "D. 彻底清除了封建主义思想文化在民间的残余影响，为新文化运动奠定了制度前提",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】\n辛亥革命的最大历史功绩在于推翻了统治中国两百六十多年的清王朝，宣告了延续两千多年的封建君主专制制度的终结，建立了亚洲第一个资产阶级民主共和国——中华民国，颁布了《中华民国临时约法》，推动了中华民族的思想解放。\n但辛亥革命具有历史局限性：资产阶级革命派的软弱妥协导致胜利果实被袁世凯窃取，并未彻底完成反帝反封建的任务，也没有废除封建地主土地所有制。故选 A。",
    difficulty: "medium",
    applicableTrack: "arts",
    scoreWeight: 35,
  },
  {
    id: "his_02_third_plenum_1978",
    subject: "history",
    subTopic: "现代史 · 党的十一届三中全会伟大转折",
    stem: "1978 年 12 月在北京召开的党的十一届三中全会，是新中国成立以来党和国家历史上具有深远意义的伟大转折。这次全会作出的最核心的战略决策是：",
    options: [
      "A. 果断停止使用“以阶级斗争为纲”的口号，把全党工作重点和全国人民注意力转移到社会主义现代化建设上来，实行改革开放",
      "B. 首次提出建立社会主义市场经济体制的经济体制改革总体目标",
      "C. 系统阐述了社会主义初级阶段理论，制定了“三步走”发展战略",
      "D. 作出开展真理标准问题大讨论的决定，彻底平反冤假错案",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】\n十一届三中全会重新确立了马克思主义的思想路线、政治路线和组织路线，果断抛弃“以阶级斗争为纲”，作出了把党和国家工作重点转移到经济建设上来、实行改革开放的伟大历史抉择，开启了社会主义现代化建设的新时期。\nB项“社会主义市场经济体制目标”确立于 1992 年党的十四大；\nC项“初级阶段理论与三步走”系统阐述于 1987 年党的十三大；\nD项真理标准问题大讨论是在全会召开前夕（1978年5月）由思想理论界自发掀起的。故选 A。",
    difficulty: "hard",
    applicableTrack: "arts",
    scoreWeight: 35,
  },
  {
    id: "his_03_shangyang_reform",
    subject: "history",
    subTopic: "古代史 · 战国秦国商鞅变法的制度创新与历史影响",
    stem: "公元前 356 年，秦孝公任用商鞅主持变法。商鞅变法推行“废井田、开阡陌，重农抑商、奖励耕织，奖励军功、废除贵族世卿世禄制，确立县制”。下列对商鞅变法历史意义的阐释，最客观全面的是：",
    options: [
      "A. 从经济基础和上层建筑层面瓦解了奴隶制贵族特权，确立了封建土地私有制，增强了秦国综合国力与军队战斗力，为秦统一六国奠定了坚实制度基石",
      "B. 彻底消除了秦国内部的阶级矛盾与地域分歧，建立了君臣完全平等的法治社会",
      "C. 全面恢复了西周初年的分封宗法制度，极大地调动了诸侯贵族保卫王室的积极性",
      "D. 率先推行儒家的仁政爱民思想，废除了残酷的肉刑连坐，赢得了六国士民的一致归附",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】\n商鞅变法是战国时期最彻底的一次地主阶级封建化政治经济改革。\n经济上废除井田制、确立封建土地私有制，重农抑商激发小农生产积极性；军事上奖励军功建立二十等爵制，打破世卿世禄贵族垄断；政治上普遍推行县制由国君直接任命官吏，加强了中央集权。\n商鞅变法虽伴随严刑酷法与重刑主义，但顺应了历史发展潮流，使秦国一跃成为战国后期最富强的国家，为秦始皇统一中国奠定了不可逆转的物质与制度基础。故选 A。",
    difficulty: "medium",
    applicableTrack: "arts",
    scoreWeight: 30,
  },

  // ==========================================
  // 【文综 · 政治 (Politics)】满分 100 分
  // ==========================================
  {
    id: "pol_01_law_of_value",
    subject: "politics",
    subTopic: "经济生活 · 价值规律的表现形式与作用",
    stem: "在社会主义市场经济条件下，各类商品的价格经常受到供求关系的影响而上下波动，但价格始终不可能无限上涨，也不可能无限下跌。这是因为：",
    options: [
      "A. 价值是价格的基础，价格由价值决定，商品交换必须以社会必要劳动时间决定的价值量为基础实行等价交换",
      "B. 国家发展改革委对市场上所有生活资料与生产资料的终端销售价格实行了严格的统一行政定价",
      "C. 纸币的实际购买力由国家中央银行在发行货币时强制法定规定，与市场供求无任何关联",
      "D. 生产者的个别劳动生产率在市场竞争中会自动等同于社会必要劳动时间，消除了价格差",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】\n价值规律是商品经济的基本规律。价值是价格的基础，价格是价值的货币表现。虽然供求关系影响价格围绕价值上下波动，但价格的波动范围始终受制于商品本身的价值量。商品价值量由生产该商品的社会必要劳动时间决定，商品交换以价值量为基础实行等价交换。故选 A。",
    difficulty: "medium",
    applicableTrack: "arts",
    scoreWeight: 35,
  },
  {
    id: "pol_02_national_peoples_congress",
    subject: "politics",
    subTopic: "政治生活 · 人民代表大会制度与民主集中制",
    stem: "我国宪法第二条明确规定：“中华人民共和国的一切权力属于人民。人民行使国家权力的机关是全国人民代表大会和地方各级人民代表大会。”下列关于人民代表大会制度的表述，正确的是：",
    options: [
      "A. 人民代表大会制度是我国的根本政治制度，坚持民主集中制原则，国家行政、监察、审判、检察机关都由人大产生、对它负责、受它监督",
      "B. 全国人民代表大会是我国的最高国家行政机关，依法统筹各部委的行政决策与执行事务",
      "C. 人大代表拥有国家法律的最终解释权和对重大违法案件的独立终审司法裁判权",
      "D. 全国人大常委会是国家最高司法机关，代表全体人民直接行使国家的法律监督职能",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】\n人民代表大会制度是我国的政体，是我国的根本政治制度。它按照民主集中制原则组织和运转：国家行政机关（人民政府/一府）、监察机关（监察委员会/一委）、审判机关（人民法院/两院之一）、检察机关（人民检察院/两院之一）均由人民代表大会产生，对它负责，受它监督。\nB项最高行政机关是国务院；\nC项司法裁判权专属于人民法院；\nD项法律监督机关是人民检察院。故选 A。",
    difficulty: "hard",
    applicableTrack: "arts",
    scoreWeight: 35,
  },
  {
    id: "pol_03_materialist_dialectics",
    subject: "politics",
    subTopic: "生活与哲学 · 唯物辩证法矛盾的对立统一与具体问题具体分析",
    stem: "习近平总书记指出：“改革是由问题倒逼而产生，又在不断解决问题中得以深化。”在推进中国式现代化进程中，既要坚持全国一盘棋的宏观顶层设计，又要因地制宜鼓励各地进行差别化试点探索。这体现的唯物辩证法核心哲理是：",
    options: [
      "A. 矛盾的普遍性与特殊性相互联结，普遍性寓于特殊性之中并通过特殊性表现出来，要求坚持共性与个性的具体的历史的统一",
      "B. 矛盾的斗争性是绝对的，同一性是相对的，斗争性最终必将彻底取代同一性",
      "C. 主要矛盾决定事物的性质，只要抓住主要矛盾，次要矛盾就会自然彻底消除",
      "D. 事物发展的总趋势是波浪式前进与循环往复的静止状态，外因是事物变化的根本原因",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】\n全国一盘棋的宏观顶层设计体现的是矛盾的普遍性与共性要求；各地因地制宜的差别化探索体现的是矛盾的特殊性与个性特征。\n唯物辩证法认为：矛盾的普遍性与特殊性相互联结，普遍性寓于特殊性之中，没有特殊性就没有普遍性；特殊性也离不开普遍性。顶层设计指导地方探索，地方经验丰富国家顶层设计，正是坚持共性与个性、普遍性与特殊性具体的历史的统一。B、C、D项均存在哲学概念性错误。故选 A。",
    difficulty: "medium",
    applicableTrack: "arts",
    scoreWeight: 30,
  },

  // ==========================================
  // 【文综 · 地理 (Geography)】满分 100 分
  // ==========================================
  {
    id: "geo_01_terminator_line",
    subject: "geography",
    subTopic: "自然地理 · 晨昏线空间特征与地球自转判读",
    stem: "晨昏线是地球表面昼半球与夜半球的分界线。下列关于晨昏线的空间几何特征与时间判读的说法中，正确的是：",
    options: [
      "A. 晨昏线平面始终垂直于太阳光线且永远平分地球赤道；顺着地球自转方向，由夜半球跨入昼半球的界线为晨线",
      "B. 晨昏线在一年四季中始终与地轴经线圈完全重合，全球各地每天日落时间均为地方时 18 点",
      "C. 北半球夏至日时，晨昏线与北极圈相交成 45° 夹角，且北极圈内全部发生极夜现象",
      "D. 晨昏线上的各点太阳高度角均达到当天最大值，且各点的地方时完全相同",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】\n晨昏线是一个过地心的大圆，其平面始终垂直于太阳平行光线，因此必然平分赤道，赤道全年昼夜等长（晨线与赤道交点地方时恒为 6:00，昏线为 18:00）。顺着地球自转方向，从黑夜进入白天的为晨线，从白天进入黑夜的为昏线。晨昏线上各点的太阳高度角均为 0°。仅在二分日（春分/秋分）晨昏线才与经线重合。故选 A。",
    difficulty: "medium",
    applicableTrack: "arts",
    scoreWeight: 35,
  },
  {
    id: "geo_02_mediterranean_climate",
    subject: "geography",
    subTopic: "气候学 · 地中海气候与气压带风带季节移动",
    stem: "分布在南北纬 30°~40° 大陆西岸的地中海沿岸地区（如意大利罗马、希腊雅典），形成了典型的地中海气候。该气候“夏季炎热干燥、冬季温和多雨”的根本大气环流成因是：",
    options: [
      "A. 夏季受副热带高气压带控制气流下沉炎热干燥，冬季受盛行西风带控制温和多雨",
      "B. 全年受副热带高气压带与信风带交替控制，蒸发量远大于降水量",
      "C. 受海陆热力性质差异显著影响，夏季盛行东南季风，冬季盛行西北季风",
      "D. 全年受西风漂流与极地东风带辐合抬升影响，气温年较差极小",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】\n地中海气候分布于南北纬 30°~40° 的大陆西岸。由于太阳直射点和气压带风带的季节性南北移动：\n(1) 夏季气压带风带北移（北半球），副热带高气压带控制该区域，盛行下沉气流，晴朗干燥炎热；\n(2) 冬季气压带风带南移，西风带南移控制该区域，来自海洋的温和湿润西风带来丰富降水。\n因此形成了独特的“夏干冬雨”特征。故选 A。",
    difficulty: "hard",
    applicableTrack: "arts",
    scoreWeight: 35,
  },
  {
    id: "geo_03_soil_erosion_loess",
    subject: "geography",
    subTopic: "区域地理 · 黄土高原水土流失成因与综合生态治理",
    stem: "我国黄土高原地区千沟万壑、支离破碎的地表形态，是长期严重水土流失的结果。下列关于黄土高原水土流失的自然与人为成因及小流域综合治理措施的分析，正确的是：",
    options: [
      "A. 黄土土质疏松垂直节理发育、夏季多暴雨冲刷是主要自然原因；过度开垦与植被破坏是主导人为原因；治理应坚持工程措施、生物措施与农业技术措施相结合",
      "B. 地壳持续剧烈水平挤压隆起是主要动力；应在全高原大面积全面栽种单一速生热带阔叶桉树林",
      "C. 冰川长期侵蚀打磨是形成沟壑的主要外力；治理只需在上游修建超大型拦水水库即可彻底根治",
      "D. 全年降水极其丰沛且各月分配均匀；主要危害是导致当地土壤过度湿化与大面积沼泽化",
    ],
    correctIndex: 0,
    analysis:
      "【考点精析】\n(1) 自然原因：黄土土质疏松，多孔隙，垂直节理发育，极易溶于水；温带季风气候，夏季降水集中且多暴雨，地表径流冲刷力极强；\n(2) 人为原因：长期过度樵采、毁林开荒、陡坡开垦、露天采矿等严重破坏了地表植被，是导致水土流失急剧恶化的主导因素；\n(3) 治理措施：推行“保塬、护坡、固沟”的小流域综合治理方针，生物措施（退耕还林还草、封山育林）与工程措施（修建水平梯田、打坝淤地）紧密结合。故选 A。",
    difficulty: "medium",
    applicableTrack: "arts",
    scoreWeight: 30,
  },
];
