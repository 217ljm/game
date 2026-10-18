/**
 * 《1978—一生》英雄联盟时代奇遇与职业起点事件链 (LOL Narrative Events & Milestones)
 * 纯逻辑、无 DOM、强类型架构。
 * 
 * 严格对齐中国英雄联盟真实历史轨迹 (2011~2013 早期草莽与职业萌芽)：
 * 1. 【15岁 · 2011年秋（9月22日国服公测）】
 *    《🖥️ 街头网吧初见英雄联盟 · 寒冰射手首战五杀》
 *    老物件：lol_2011_cbt_card（《2011英雄联盟国服公测纪念封测卡》）
 * 2. 【16岁 · 2012年（S2 登顶艾欧尼亚第一与家庭冲突）】
 *    《⚡ 电信一区艾欧尼亚登顶 · 八仙桌前的家庭抉择协议》
 *    老物件：lol_ob_king_screenshot（《电信一区艾欧尼亚登顶最强王者第一纪念截图》）
 * 3. 【17岁 · 2013年（LPL 元年与俱乐部青训邀约）】
 *    《📜 首届 LPL 元年开启 · 豪门俱乐部青训试训函》
 *    老物件：lol_first_lpl_invitation（《2013首届LPL豪门战队青训试训录取函》）
 * 
 * 导出老物件、事件目录、专属天赋及与 LolCareerManager (lolCareerMgr.startAmateurEra() 等) 的联动辅助函数。
 */

import type { PlayerMicroStats } from "./esports-contracts.ts";
import { LolCareerManager } from "./lol-career-manager.ts";
import type { EventOption, LifeEventDefinition, VintageAsset } from "../systems/esports-events-catalog.ts";

// =========================================================================
// 1. 英雄联盟时代老物件资产库 (LOL Narrative Vintage Assets)
// =========================================================================

export const LOL_NARRATIVE_VINTAGE_ASSETS: Record<string, VintageAsset> = {
  lol_2011_cbt_card: {
    id: "lol_2011_cbt_card",
    name: "《2011英雄联盟国服公测纪念封测卡》",
    icon: "🎟️",
    category: "commemoration",
    yearAcquired: 2011,
    description: "2011年9月22日腾讯首发的磨砂纪念纸卡，印有艾希与安妮经典初代原画，背面16位CD-KEY激活码早已刮开。它见证了黑网吧大头CRT显示器前，中国一代少年踏入召唤师峡谷的破晓晨光。",
    bonusText: "解锁天赋【电竞微操直觉】· 神经反应延时 -25ms · 极限手速 +15 · 开启电竞路人王征程",
  },
  lol_ob_king_screenshot: {
    id: "lol_ob_king_screenshot",
    name: "《电信一区艾欧尼亚登顶最强王者第一纪念截图》",
    icon: "👑",
    category: "commemoration",
    yearAcquired: 2012,
    description: "2012年S2赛季以惊人胜率冲上电信一区胜点第一时，用键盘PrintScreen键定格的照片。榜首ID被多玩LOL盒子首页置顶推荐，引爆百度贴吧与掌上英雄联盟数十万点击，成为全国网吧玩家膜拜的路人王图腾。",
    bonusText: "艾欧尼亚第一之证 · 战术大局观 +15 · 抗压心理 +15 · 智力 +12 · 轰动电竞全网",
  },
  lol_first_lpl_invitation: {
    id: "lol_first_lpl_invitation",
    name: "《2013首届LPL豪门战队青训试训录取函》",
    icon: "📜",
    category: "commemoration",
    yearAcquired: 2013,
    description: "2013年春首届LPL在江苏太仓演播厅打响之际，由豪门俱乐部赛训总监亲笔签字并加盖红印的牛皮纸试训挂号信，信封里还夹着一张前往上海松江基地的绿皮火车硬卧车票。",
    bonusText: "LPL职业殿堂入场券 · 职业资格解锁 · 魅力 +20 · 战术大局观 +20 · 正式开启职业生涯",
  },
};

// =========================================================================
// 2. 专属电竞天赋系统 (LOL Narrative Talents)
// =========================================================================

export interface LolTalent {
  id: string;
  name: string;
  icon: string;
  description: string;
  effectSummary: string;
  unlockedAtAge: number;
  statBonus: Partial<PlayerMicroStats>;
}

export const LOL_TALENTS: Record<string, LolTalent> = {
  micro_instinct: {
    id: "micro_instinct",
    name: "电竞微操直觉",
    icon: "⚡",
    description: "天生拥有惊人的动态视力与肌肉记忆，走砍拉扯如呼吸般自然，在0.1秒的交锋中能本能躲避关键控制技能。",
    effectSummary: "反应速度大幅提升 (+18) · 极限微操大幅提升 (+15) · 神经反应延时显著缩短",
    unlockedAtAge: 15,
    statBonus: {
      reaction: 18,
      mechanics: 15,
      consistency: 8,
    },
  },
  iron_discipline: {
    id: "iron_discipline",
    name: "八仙桌之约·自律心流",
    icon: "📜",
    description: "在家庭与梦想的十字路口立下军令状，学会高度自我约束，高压之下能兼顾学业思维与天梯专注力。",
    effectSummary: "抗压心态 (+15) · 战术大局观 (+12) · 稳定性 (+10)",
    unlockedAtAge: 16,
    statBonus: {
      mentality: 15,
      gameSense: 12,
      consistency: 10,
    },
  },
  pro_awakening: {
    id: "pro_awakening",
    name: "职业觉醒·大将之风",
    icon: "🏆",
    description: "收到LPL豪门青训邀约那一刻起，心态从网吧路人王彻底升华为职业选手，具备极高赛训纪律与团队大局观。",
    effectSummary: "战术大局观 (+20) · 团队协作 (+16) · 竞技领袖气场",
    unlockedAtAge: 17,
    statBonus: {
      gameSense: 20,
      teamwork: 16,
      mentality: 12,
    },
  },
};

// =========================================================================
// 3. 增强型事件选项与定义 (Extended Event Interfaces)
// =========================================================================

export interface LolNarrativeOption extends EventOption {
  esportsAction?: "start_amateur" | "pact_academic" | "pact_pro" | "join_academy" | "remain_amateur";
  unlockTalentId?: string;
  careerImpactDesc?: string;
}

export interface LolNarrativeLifeEvent extends LifeEventDefinition {
  options: LolNarrativeOption[];
  historicalYear: number;
  eraContext: string;
}

// =========================================================================
// 4. 英雄联盟三大时代奇遇与职业抉择事件链定义
// =========================================================================

export const LOL_NARRATIVE_EVENTS: LolNarrativeLifeEvent[] = [
  // -----------------------------------------------------------------------
  // 事件 1：【15岁 · 2011年秋（9月22日国服公测）】
  // -----------------------------------------------------------------------
  {
    id: "lol_2011_netbar_debut",
    category: "historical",
    minAge: 15,
    maxAge: 15,
    weight: 100,
    historicalYear: 2011,
    eraContext: "2011年秋季，腾讯正式开启《英雄联盟》国服公测，中国MOBA生态进入全新时代。",
    title: "🖥️ 街头网吧初见英雄联盟 · 寒冰射手首战五杀",
    icon: "🖥️",
    narrative:
      "2011年9月下旬的深秋傍晚，街头黑网吧里大头CRT显示器散发着温热的静电气息。屋顶风扇吱呀作响，空气中弥漫着廉价方便面与烟草的呛鼻味道。大部分屏幕上还在运行着澄海3C、真三国无双与DOTA，但网吧吧台最显眼处已拉出崭新的横幅海报——“腾讯全新3D团队对战网游《英雄联盟》9月22日正式公测”！\n\n你的发小拍着你的肩膀，激动地递来一张磨砂封测账号卡：“快上机！电信一区艾欧尼亚，带你玩个新鲜的！”你注册下人生第一个召唤师账号，选下了新手导师推荐的寒冰射手艾希……在冰霜射击与魔法水晶箭破空呼啸中，你凭着天生的敏锐手速，在召唤师峡谷首战豪取震撼全网吧的【Penta Kill 五杀】！屏幕闪烁着耀眼金光，整间网吧的目光都聚焦在你的显示器上……",
    options: [
      {
        label: "【通宵钻研走砍与微操，拿下网吧五连胜金牌】",
        hint: "沉迷峡谷 · 激发极致电竞天资",
        resultDesc:
          "你在网吧包宿鏖战整夜，凭借令人咋舌的甩尾走砍与技能预判横扫艾欧尼亚天梯！网吧老板亲自在全吧广播播放‘恭喜本吧某号机大神豪取排位十连胜’并颁发奖金与免单VIP金卡！你觉醒了罕见的天赋【电竞微操直觉】，正式踏上路人王封神之路！",
        esportsAction: "start_amateur",
        unlockTalentId: "micro_instinct",
        careerImpactDesc: "正式激活网吧路人王生涯！神经反射与微操手速质变跃升！",
        effect: {
          intelligence: 8,
          charm: 10,
          happiness: 15,
          cash: 200,
          unlockAssetId: "lol_2011_cbt_card",
        },
      },
      {
        label: "【浅尝辄止，牢记中考学业，偶尔周末娱乐】",
        hint: "理智克制 · 平衡学业与游戏情怀",
        resultDesc:
          "你克制住了通宵冲动的渴望，将首战五杀的震撼深埋心底。你把那张珍贵的公测封测卡夹入课本作为书签，牢记即将到来的升学考试，仅在周末偶尔与好友在匹配局中欢声笑语，享受纯粹青春的快乐。",
        esportsAction: "remain_amateur",
        careerImpactDesc: "保持业余爱好者身份，专注当下学业积累。",
        effect: {
          intelligence: 12,
          happiness: 8,
          cash: 50,
          unlockAssetId: "lol_2011_cbt_card",
        },
      },
    ],
  },

  // -----------------------------------------------------------------------
  // 事件 2：【16岁 · 2012年（S2 登顶艾欧尼亚第一与家庭冲突）】
  // -----------------------------------------------------------------------
  {
    id: "lol_2012_ionia_rank1_family",
    category: "milestone",
    minAge: 16,
    maxAge: 16,
    weight: 100,
    historicalYear: 2012,
    eraContext: "2012年WE战队远征IPL5夺得中国首个LOL世界冠军，掀起全民开黑狂潮。",
    title: "⚡ 电信一区艾欧尼亚登顶 · 八仙桌前的家庭抉择协议",
    icon: "⚡",
    narrative:
      "2012年冬，Team WE在拉斯维加斯IPL5力克世界豪强斩获中国第一个英雄联盟世界冠军，全国高校与网吧彻底沸腾！而此时的你，在电信一区艾欧尼亚以一波惊世骇俗的28连胜，一跃登上国服最强王者胜点第一的宝座！多玩LOL盒子首页头条被你的专属ID霸榜，各路路人王与解说纷纷前来OB围观……\n\n然而深夜回到家中，客厅八仙桌前气氛凝重如铁。父亲将烟头狠狠按熄在玻璃烟灰缸里，母亲红着眼眶握着一张印满你游戏录像与网吧账单的纸页。父亲拍桌喝道：“全家指望你考个好大学，你天天泡在网吧敲键盘，打游戏能当饭吃？！能给你交社保、买房娶媳妇吗？！”家庭观念的剧烈碰撞已到不可调和的临界点……",
    options: [
      {
        label: "【签下学业对赌协议，约定高二考进前五名换取周末训练权】",
        hint: "兼顾自律 · 坚毅破解家庭阻力",
        resultDesc:
          "你在八仙桌前研墨立下字据：“高二期末考进年级前五名！若有一次下滑，立刻交出鼠标键盘安心备考！”父母见你眼神炽热而坚定，神情不再是任性顽劣，而是男儿立世的沉稳担当，长叹一声郑重签字答应！你不仅在期末兑现承诺跻身前列，更在周末训练中保持着艾欧尼亚第一的统治力！",
        esportsAction: "pact_academic",
        unlockTalentId: "iron_discipline",
        careerImpactDesc: "觉醒【自律心流】天赋！学业心智与天梯抗压心态双丰收，家庭关系彻底破冰！",
        effect: {
          intelligence: 15,
          happiness: 12,
          charm: 10,
          affinityTarget: "father",
          affinityDelta: 20,
          unlockAssetId: "lol_ob_king_screenshot",
        },
      },
      {
        label: "【决意为梦想全力一搏，向父母展示网吧联赛奖金与职业愿景】",
        hint: "破釜沉舟 · 用职业愿景打动双亲",
        resultDesc:
          "你从书包中掏出沉甸甸的数千元网吧冠军奖金与国家体育总局承认电竞为正式体育项目的权威报纸，指着IPL5世界夺冠的新闻真诚讲述：“爸、妈，这不是玩物丧志，是正在登上世界大舞台的新时代竞技！”父母被你的眼界与执着深深打动，决定给予你有限度的梦想支持！",
        esportsAction: "pact_pro",
        careerImpactDesc: "坚定走向职业道路，天梯声望大噪，提前进入各大战队星探引援雷达！",
        effect: {
          charm: 16,
          happiness: 14,
          cash: 3000,
          affinityTarget: "mother",
          affinityDelta: 18,
          unlockAssetId: "lol_ob_king_screenshot",
        },
      },
    ],
  },

  // -----------------------------------------------------------------------
  // 事件 3：【17岁 · 2013年（LPL 元年与俱乐部青训邀约）】
  // -----------------------------------------------------------------------
  {
    id: "lol_2013_lpl_youth_invite",
    category: "milestone",
    minAge: 17,
    maxAge: 17,
    weight: 100,
    historicalYear: 2013,
    eraContext: "2013年3月16日首届LPL职业联赛在江苏太仓开幕，中国英雄联盟电竞步入正规联赛元年。",
    title: "📜 首届 LPL 元年开启 · 豪门俱乐部青训试训函",
    icon: "📜",
    narrative:
      "2013年春天，首届英雄联盟职业联赛 (LPL) 春季赛在江苏太仓演播大厅正式拉开战幕！OMG黑暗势力的凌厉速推流横扫赛场，皇族与WE的龙争虎斗引得数以千万计的召唤师日夜守候在电脑前……中国电竞正规职业化的大幕已然轰轰烈烈拉开！\n\n就在这一周，一封印着知名豪门战队烫金徽章的特快专递挂号信送到了你的手中——由于你在艾欧尼亚王者顶峰常年名列前茅、打法凶悍多变，俱乐部赛训管理层在数千名高分天才中锁定了你！信中白纸黑字盖着俱乐部公章：“诚挚邀请你参加本俱乐部青训营线下试训。俱乐部全额报销往返差旅，食宿全包，考核通过即签署正式青训学徒合同！”人生最重大的转折点赫然摆在眼前……",
    options: [
      {
        label: "【正式接受青训试训邀请，收拾行囊奔赴俱乐部基地】",
        hint: "逐梦巅峰 · 迈向 LPL 职业赛场",
        resultDesc:
          "你怀揣着那张绿皮火车票与滚烫的试训函，告别家人踏上了奔赴俱乐部基地的列车！在满是冠军奖杯与明星选手的基地里，你在BO3 Solo对抗中凭借极其凶猛的单杀技惊四座，主教练当场拍板：“签！马上办理注册手续！”你正式披上战队队服，开启属于你的LPL职业传奇纪元！",
        esportsAction: "join_academy",
        unlockTalentId: "pro_awakening",
        careerImpactDesc: "正式迈入职业电竞殿堂！与顶级豪门签署青训合同，开启赛训与次级/顶级联赛征程！",
        effect: {
          charm: 20,
          happiness: 25,
          cash: 8000,
          unlockAssetId: "lol_first_lpl_invitation",
        },
      },
      {
        label: "【选择作为高分业余主播/高考生，留作人生遗憾与青春回忆】",
        hint: "安稳人生 · 珍藏属于自己的传奇",
        resultDesc:
          "你在长久思索后，深知职业电竞残酷的淘汰率与伤病压力，决定将这份试训函装裱在卧室床头作为最骄傲的青春勋章。你一边备战高考，一边在业余时间开启高分排位直播，凭借国服第一的身手成为人气极高的大主播，用另一种方式拥抱属于你的英雄联盟。",
        esportsAction: "remain_amateur",
        careerImpactDesc: "选择现实安稳路线，成为名震江湖的传奇高分主播与高考生。",
        effect: {
          intelligence: 20,
          charm: 18,
          happiness: 15,
          cash: 12000,
          unlockAssetId: "lol_first_lpl_invitation",
        },
      },
    ],
  },
];

// =========================================================================
// 5. 核心单例实例与状态联动接口
// =========================================================================

/**
 * 默认预设的职业生涯管理器全局单例
 */
export const lolCareerMgr: LolCareerManager = new LolCareerManager(15, 2011);

/**
 * 抉择处理结果结构
 */
export interface LolNarrativeChoiceResult {
  success: boolean;
  eventId: string;
  optionIndex: number;
  optionLabel: string;
  narrativeResult: string;
  careerImpactDesc?: string;
  unlockedAsset?: VintageAsset;
  unlockedTalent?: LolTalent;
  esportsStatsGained: Partial<PlayerMicroStats>;
  careerStageBefore: string;
  careerStageAfter: string;
  careerMessage?: string;
}

/**
 * 英雄联盟时代叙事事件与职业生涯管理器联动核心辅助函数
 * 
 * 联动机制：
 * 1. 当玩家在15岁事件选择A（通宵钻研走砍）时，自动调用 careerMgr.startAmateurEra(15)；
 *    并注入天赋【电竞微操直觉】，大幅提升 reaction (+18) 和 mechanics (+15)；
 * 2. 当玩家在16岁事件中做出抉择时，注入【自律心流】或坚毅信念，并巩固天梯艾欧尼亚第1名胜点；
 * 3. 当玩家在17岁事件选择A（接受青训邀请）时，自动调用 careerMgr.signTraineeContract()，
 *    激活【职业觉醒·大将之风】并直接将状态机跃迁至 "academy_trainee"，开启正式联赛赛程！
 */
export function applyLolNarrativeChoice(
  eventId: string,
  optionIndex: number,
  careerMgr: LolCareerManager = lolCareerMgr
): LolNarrativeChoiceResult {
  const event = LOL_NARRATIVE_EVENTS.find(e => e.id === eventId);
  if (!event) {
    return {
      success: false,
      eventId,
      optionIndex,
      optionLabel: "",
      narrativeResult: `未找到事件 ID: ${eventId}`,
      esportsStatsGained: {},
      careerStageBefore: careerMgr.state.stage,
      careerStageAfter: careerMgr.state.stage,
    };
  }

  const option = event.options[optionIndex] || event.options[0];
  const stageBefore = careerMgr.state.stage;
  let careerMessage = "";
  const statsGained: Partial<PlayerMicroStats> = {};

  // 1. 解锁天赋处理
  let unlockedTalent: LolTalent | undefined;
  if (option.unlockTalentId && LOL_TALENTS[option.unlockTalentId]) {
    unlockedTalent = LOL_TALENTS[option.unlockTalentId];
    Object.assign(statsGained, unlockedTalent.statBonus);
    Object.assign(careerMgr.state.playerStats, unlockedTalent.statBonus);
  }

  // 2. 解锁老物件处理
  let unlockedAsset: VintageAsset | undefined;
  if (option.effect.unlockAssetId && LOL_NARRATIVE_VINTAGE_ASSETS[option.effect.unlockAssetId]) {
    unlockedAsset = LOL_NARRATIVE_VINTAGE_ASSETS[option.effect.unlockAssetId];
  }

  // 3. 现金奖励增加到选手累计身家
  if (option.effect.cash) {
    careerMgr.state.careerCash += option.effect.cash;
  }

  // 4. 电竞动作精准联动
  switch (option.esportsAction) {
    case "start_amateur": {
      // 激活网吧路人王阶段
      const res = careerMgr.startAmateurEra(15);
      careerMessage = res.narrative;
      careerMgr.state.rankPoints = 500;
      careerMgr.state.rankServer = "电信一区 艾欧尼亚";
      careerMgr.state.rankTier = "challenger";
      break;
    }
    case "pact_academic": {
      // 兼顾学业与天梯，强化心智，胜点进一步提升
      careerMgr.state.rankPoints += 300;
      careerMgr.state.playerStats.mentality = Math.min(99, careerMgr.state.playerStats.mentality + 10);
      careerMgr.state.playerStats.gameSense = Math.min(99, careerMgr.state.playerStats.gameSense + 8);
      careerMessage = "八仙桌对赌协议达成！兼具极高自律与坚毅品格，电信一区榜首统治力牢不可破！";
      break;
    }
    case "pact_pro": {
      // 决意职业，展示奖金，天梯知名度暴涨
      careerMgr.state.rankPoints += 250;
      careerMgr.state.fansCount += 15000;
      careerMgr.state.playerStats.mechanics = Math.min(99, careerMgr.state.playerStats.mechanics + 8);
      careerMessage = "矢志不渝的职业决心感染了家庭，天梯知名度引爆全网，各大俱乐部星探纷至沓来！";
      break;
    }
    case "join_academy": {
      // 正式接受试训，签约青训学徒合同，迈入职业殿堂
      const signRes = careerMgr.signTraineeContract("we", "Team WE (西安曲江)");
      careerMessage = signRes.narrative;
      careerMgr.state.rankPoints += 400;
      careerMgr.state.fansCount += 35000;
      careerMgr.initLeagueSeason();
      break;
    }
    case "remain_amateur": {
      careerMessage = "你将登顶荣誉珍藏心底，作为高人气路人王和高考生，继续书写属于自己的青春篇章。";
      break;
    }
    default:
      break;
  }

  const stageAfter = careerMgr.state.stage;

  return {
    success: true,
    eventId,
    optionIndex,
    optionLabel: option.label,
    narrativeResult: option.resultDesc,
    careerImpactDesc: option.careerImpactDesc,
    unlockedAsset,
    unlockedTalent,
    esportsStatsGained: statsGained,
    careerStageBefore: stageBefore,
    careerStageAfter: stageAfter,
    careerMessage,
  };
}

// =========================================================================
// 6. 辅助查询与检验函数
// =========================================================================

/**
 * 根据年份和年龄判断某个事件是否可触发
 */
export function isLolNarrativeEventAvailable(
  event: LolNarrativeLifeEvent,
  year: number,
  age: number
): boolean {
  if (event.historicalYear && event.historicalYear !== year) {
    return false;
  }
  return age >= event.minAge && age <= event.maxAge;
}

/**
 * 获取当前年份和年龄下所有适用的英雄联盟时代事件
 */
export function getAvailableLolNarrativeEvents(
  year: number,
  age: number
): LolNarrativeLifeEvent[] {
  return LOL_NARRATIVE_EVENTS.filter(event => isLolNarrativeEventAvailable(event, year, age));
}

/**
 * 根据 ID 查找叙事事件
 */
export function getLolNarrativeEventById(eventId: string): LolNarrativeLifeEvent | undefined {
  return LOL_NARRATIVE_EVENTS.find(e => e.id === eventId);
}

/**
 * 根据 ID 查找老物件
 */
export function getLolNarrativeAssetById(assetId: string): VintageAsset | undefined {
  return LOL_NARRATIVE_VINTAGE_ASSETS[assetId];
}
