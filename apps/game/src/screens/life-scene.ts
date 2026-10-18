import Phaser from "phaser";
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  type GameRuntimePort,
  type GameRuntimeSnapshot,
  type PresentationCue,
  type RuntimeActionOption,
} from "../contracts";
import { bindInteractiveFeedback, DEFAULT_FONT_FAMILY, text } from "../ui/game-text";
import { GamePresentationDirector, ProceduralGameFeedback, type MotionLevel } from "../presentation";
import { HAPTIC_ENABLED_REGISTRY_KEY, MOTION_LEVEL_REGISTRY_KEY, REDUCED_MOTION_REGISTRY_KEY, SOUND_ENABLED_REGISTRY_KEY } from "./boot-scene";
import { SHUIHU_CARDS_DATABASE, SHUIHU_CARD_COMBOS, type ShuihuCard, type CardSetCombo } from "../minigames/shuihu-card-system";
import { CardSlapMiniGame } from "../minigames/card-slap-game";
import { MarblesMiniGame } from "../minigames/marbles-game";
import { ExamQuizMiniGame } from "../minigames/exam-quiz-game";
import { ZhongkaoManager, SCHOOL_OPTIONS_DATABASE, type SchoolOption } from "../minigames/zhongkao-system";
import { EsportsCareerManager } from "../minigames/esports-system";
import { BirthConfigManager, DECADES_DATABASE, PROVINCE_DATABASE } from "../systems/birth-config-system";
import { AcademicScoreSystem } from "../systems/academic-score-system";
import { GaokaoManager, UNIVERSITIES_DATABASE } from "../systems/gaokao-system";
import { SocialInsuranceSystem } from "../systems/social-insurance-system";
import { EsportsCareerSystem, type EsportsTacticsBP } from "../systems/esports-career-system";
import {
  RomanceMarriageSystem,
  GIFT_DATABASE,
  HOUSING_DATABASE,
  MARRIAGE_CONFLICT_DATABASE,
  type PartnerNPC,
  type MarriageConflictEvent,
} from "../systems/romance-marriage-system";
import {
  FertilitySystem,
  BIRTH_POLICY_DATABASE,
  INTEREST_COURSES_DATABASE,
  type ChildNPC,
} from "../systems/fertility-system";
import { FinanceStockSystem, HISTORICAL_STOCK_EVENTS } from "../systems/finance-stock-system";
import {
  CareerPromotionSystem,
  CAREER_RANKS_DATABASE,
  CAREER_WORK_ACTIONS,
  PROFESSIONAL_TITLES,
  type CareerTrack,
  type ProfessionalTitleLevel,
} from "../systems/career-promotion-system";
import { VEHICLES_DATABASE } from "../systems/transport-system";
import { ReactionTestGame } from "../minigames/reaction-test-game";
import {
  ESPORTS_VINTAGE_ASSETS,
  ESPORTS_LIFE_EVENTS,
} from "../systems/esports-events-catalog";
import { MILESTONE_EVENTS_DATABASE, MILESTONE_VINTAGE_ASSETS } from "../systems/milestone-events-catalog";
import { DAILY_LIFE_EVENTS_DATABASE, DAILY_LIFE_VINTAGE_ASSETS } from "../systems/daily-life-events-catalog";
import { SOCIAL_CHILDHOOD_EVENTS_DATABASE, SOCIAL_CHILDHOOD_VINTAGE_ASSETS } from "../systems/social-childhood-events-catalog";
import { RISK_ACCIDENT_EVENTS_DATABASE, RISK_ACCIDENT_VINTAGE_ASSETS } from "../systems/risk-accident-events-catalog";
import { SUPPLY_COOP_CATALOG, type SupplyItem } from "../systems/supply-coop-shop-system";
import { LIFE_QUESTS_CATALOG, type LifeQuest } from "../systems/life-quest-medal-system";
import {
  EsportsBpBoard,
  EsportsMatchView,
  EsportsQteSmite,
  EsportsSettlementModal,
  type EsportsBpResult,
  type EsportsMatchSummary,
} from "../esports/ui";
import { CharacterStageWidget } from "../views/character-stage-widget";
import {
  GaokaoModal,
  type GaokaoCompletionResult,
  type GaokaoModalStage,
} from "../education/ui/gaokao-modal";
import type { GaokaoTrack } from "../education/gaokao-contracts";
import {
  LolCareerManager,
  type NextMatchPreparation,
  type SoloRankTrainResult,
} from "../esports/lol-career-manager";
import {
  LOL_NARRATIVE_EVENTS,
  LOL_NARRATIVE_VINTAGE_ASSETS,
  applyLolNarrativeChoice,
} from "../esports/lol-narrative-events";
import {
  PixelUIHelper,
  createPixelRelationCard,
  createPixelLocationCard,
  createPixelVintageItemSlot,
  createPixelActionButton,
  createPixelButton,
} from "../ui-kit";
import { AdvanceDirector } from "./advance-director";
import { EraAssetsSystem } from "../systems/era-assets-system";

const FONT_FAMILY = DEFAULT_FONT_FAMILY;

type ActiveModal =
  | null
  | "zhuazhou"
  | "year_transition"
  | "life_event"
  | "gm_debug"
  | "location_detail"
  | "action_result"
  | "relationship_interact"
  | "shuihu_unboxing"
  | "shuihu_album"
  | "card_slap"
  | "marbles"
  | "exam_quiz"
  | "zhongkao"
  | "esports_match"
  | "birth_config"
  | "gaokao"
  | "romance_detail"
  | "fertility_detail"
  | "career_detail"
  | "stock_market"
  | "bank_finance"
  | "chronicle_archive"
  | "supply_coop_shop"
  | "medal_award";

export interface ActiveEsportsMatchSession {
  stage: "bp" | "live" | "settlement";
  myTeam: {
    name: string;
    shortName: string;
    league: string;
    badge: string;
    color: number;
    power: number;
    playerRole: string;
  };
  opponentTeam: {
    name: string;
    shortName: string;
    league: string;
    badge: string;
    color: number;
    power: number;
    acePlayer: string;
  };
  matchType: string;
  selectedTactics?: "tempo" | "dragon" | "pick";
  tacticsBP?: EsportsTacticsBP;
  tacticsLabel?: string;
  tacticsDesc?: string;
  liveStep: number;
  liveLogs: Array<{
    time: string;
    title: string;
    narrative: string;
    tag: string;
    tagColor: number;
    isMyAdvantage: boolean;
  }>;
  result: {
    isWin: boolean;
    myScore: number;
    oppScore: number;
    kda: string;
    damageShare: number;
    isMVP: boolean;
    mvpTitle: string;
    bonusCash: number;
    clubStandingDelta: string;
  };
}

export type LifeEventCategory = "milestone" | "general" | "emergent" | "accident" | "historical";

export interface VintageAsset {
  id: string;
  name: string;
  icon: string;
  category: "toy" | "clothing" | "food" | "appliance" | "commemoration";
  yearAcquired: number;
  description: string;
  bonusText: string;
}

export interface EventOption {
  label: string;
  hint: string;
  resultDesc: string;
  effect: {
    health?: number;
    intelligence?: number;
    charm?: number;
    happiness?: number;
    cash?: number;
    affinityTarget?: string;
    affinityDelta?: number;
    unlockAssetId?: string;
  };
}

export interface LifeEventDefinition {
  id: string;
  category: LifeEventCategory;
  minAge: number;
  maxAge: number;
  weight?: number;
  title: string;
  icon: string;
  narrative: string;
  options: EventOption[];
}

export const VINTAGE_ASSETS_CATALOG: Record<string, VintageAsset> = {
  ...MILESTONE_VINTAGE_ASSETS,
  ...DAILY_LIFE_VINTAGE_ASSETS,
  ...SOCIAL_CHILDHOOD_VINTAGE_ASSETS,
  ...RISK_ACCIDENT_VINTAGE_ASSETS,
  ...LOL_NARRATIVE_VINTAGE_ASSETS,
  abacus_and_coupons: {
    id: "abacus_and_coupons",
    name: "算盘与粮票",
    icon: "🧮",
    category: "commemoration",
    yearAcquired: 1979,
    description: "周岁抓周礼获得，70年代凭票供应与记账启蒙老物件",
    bonusText: "智力 +6 · 开启【数理与商业】天资",
  },
  storybook_and_pen: {
    id: "storybook_and_pen",
    name: "小人书与钢笔",
    icon: "📖",
    category: "commemoration",
    yearAcquired: 1979,
    description: "周岁抓周礼获得，经典连环画与英雄牌钢笔，文思启迪",
    bonusText: "智力 +8 · 开启【文学与表达】天资",
  },
  dragonfly_and_clay: {
    id: "dragonfly_and_clay",
    name: "竹蜻蜓与泥人",
    icon: "🐸",
    category: "commemoration",
    yearAcquired: 1979,
    description: "周岁抓周礼获得，大院手艺人手工打造的传统玩伴",
    bonusText: "健康 +8 · 开启【工巧与体魄】天资",
  },
  tiger_shoes: {
    id: "tiger_shoes",
    name: "手工纳底红布虎头鞋",
    icon: "👟",
    category: "clothing",
    yearAcquired: 1979,
    description: "母亲在缝纫机旁一针一线纳底缝制的红布虎头鞋，庇佑平安辟邪",
    bonusText: "亲情 +10 · 快乐 +6",
  },
  model_worker_mug: {
    id: "model_worker_mug",
    name: "先进工作者搪瓷小茶缸",
    icon: "🥛",
    category: "commemoration",
    yearAcquired: 1979,
    description: "父亲评选机床厂劳动模范发的红双喜搪瓷缸，冲甜红糖水专用",
    bonusText: "健康 +6 · 家族自豪",
  },
  malt_milk_tin: {
    id: "malt_milk_tin",
    name: "上海产红宝盒麦乳精铁罐",
    icon: "🥫",
    category: "food",
    yearAcquired: 1979,
    description: "70年代末高档滋补品，开水一冲满室奶香，舌尖最甜记忆",
    bonusText: "健康 +8 · 快乐 +5",
  },
  tin_jumping_frog: {
    id: "tin_jumping_frog",
    name: "绿皮发条铁皮跳跳蛙",
    icon: "🐸",
    category: "toy",
    yearAcquired: 1980,
    description: "经典发条玩具，拧上发条在大院水磨石地上连蹦带跳",
    bonusText: "快乐 +8 · 社交 +6",
  },
  pagoda_candy_tin: {
    id: "pagoda_candy_tin",
    name: "彩色宝塔糖（打虫糖）",
    icon: "🍬",
    category: "food",
    yearAcquired: 1980,
    description: "县卫生防疫站打疫苗奖励的宝塔形甜糖，80年代独家医疗记忆",
    bonusText: "健康 +10 · 坚毅 +4",
  },
  sugar_paper_collection: {
    id: "sugar_paper_collection",
    name: "珍藏高粱饴透明糖纸集",
    icon: "📜",
    category: "commemoration",
    yearAcquired: 1980,
    description: "夹在厚词典里的各色彩光玻璃糖纸，阳光下折射出彩虹光芒",
    bonusText: "魅力 +6 · 审美启蒙",
  },
  red_star_radio: {
    id: "red_star_radio",
    name: "红星牌半导体收音机",
    icon: "📻",
    category: "appliance",
    yearAcquired: 1980,
    description: "“小喇叭开始广播啦，嗒嘀嗒——”每天准时收听童话故事",
    bonusText: "智力 +8 · 专注 +6",
  },
  bicycle_child_seat: {
    id: "bicycle_child_seat",
    name: "永久二八大杠加装小藤椅",
    icon: "🚲",
    category: "toy",
    yearAcquired: 1980,
    description: "加装在父亲自行车前梁上的小藤椅，迎风兜风探索县城大街小巷",
    bonusText: "健康 +6 · 视野开阔",
  },
  nursery_red_star_bag: {
    id: "nursery_red_star_bag",
    name: "托儿所红五星小布包",
    icon: "🎒",
    category: "clothing",
    yearAcquired: 1981,
    description: "印有红五角星的帆布小挎包，上托儿所装手绢与铝饭盒",
    bonusText: "智力 +6 · 亲情 +6",
  },
  iron_hoop_and_hook: {
    id: "iron_hoop_and_hook",
    name: "大院自制滚铁环与铁钩",
    icon: "🛞",
    category: "toy",
    yearAcquired: 1981,
    description: "机床厂废钢圈与粗铁丝打磨的经典玩具，推起来风驰电掣",
    bonusText: "健康 +8 · 敏捷 +6",
  },
  white_rabbit_candy_tin: {
    id: "white_rabbit_candy_tin",
    name: "冠生园大白兔奶糖铁盒",
    icon: "🍬",
    category: "commemoration",
    yearAcquired: 1981,
    description: "珍藏各种精美糖纸与彩色玻璃珠的童年秘密宝盒",
    bonusText: "快乐 +8 · 亲情 +6",
  },
  volleyball_champion_basin: {
    id: "volleyball_champion_basin",
    name: "女排夺冠纪念大红搪瓷脸盆",
    icon: "🏆",
    category: "commemoration",
    yearAcquired: 1981,
    description: "1981年中国女排首夺世界冠军纪念，印有红牡丹与拼搏字样",
    bonusText: "魅力 +6 · 时代自豪",
  },
  kaleidoscope_toy: {
    id: "kaleidoscope_toy",
    name: "彩色纸筒旋转万花筒",
    icon: "✨",
    category: "toy",
    yearAcquired: 1982,
    description: "经典纸筒光学玩具，一转动展现千变万化的绚丽对称图案",
    bonusText: "智力 +8 · 审美启蒙",
  },
  monkey_king_comic: {
    id: "monkey_king_comic",
    name: "美影厂《大闹天宫》连环画",
    icon: "📕",
    category: "toy",
    yearAcquired: 1982,
    description: "上海美术电影制片厂正版彩绘小人书，孙悟空大显神通",
    bonusText: "智力 +8 · 专注 +6",
  },
  cricket_cage: {
    id: "cricket_cage",
    name: "手工竹编鸣蝉蝈蝈笼",
    icon: "🦗",
    category: "toy",
    yearAcquired: 1982,
    description: "大院手艺人劈竹编织的八角虫笼，盛夏伴着清脆虫鸣入眠",
    bonusText: "快乐 +8 · 工巧启迪",
  },
  spring_festival_postcard_1983: {
    id: "spring_festival_postcard_1983",
    name: "1983首届央视春晚纪念片",
    icon: "📺",
    category: "commemoration",
    yearAcquired: 1983,
    description: "李谷一《乡恋》与马季相声时代的珍贵电视文化记忆",
    bonusText: "魅力 +8 · 快乐 +6",
  },
  hero_cards_collection: {
    id: "hero_cards_collection",
    name: "满满一铁盒香烟洋画",
    icon: "🃏",
    category: "toy",
    yearAcquired: 1983,
    description: "收集了整套三国与水浒英雄牌，大院孩童社交的绝对硬通货",
    bonusText: "快乐 +8 · 社交 +8",
  },
  glass_marbles_pouch: {
    id: "glass_marbles_pouch",
    name: "彩色玻璃花弹珠布袋",
    icon: "🔮",
    category: "toy",
    yearAcquired: 1983,
    description: "装满晶莹剔透玻璃花弹珠的花布袋，清脆碰撞声回荡大院",
    bonusText: "健康 +6 · 敏捷 +8",
  },
  abacus_multiplication_board: {
    id: "abacus_multiplication_board",
    name: "九马乘法口诀小木牌",
    icon: "🪵",
    category: "commemoration",
    yearAcquired: 1983,
    description: "刻有珠算九九乘法表的小木板，托儿所算术领跑全班",
    bonusText: "智力 +10 · 专注 +6",
  },
  young_pioneer_scarf_badge: {
    id: "young_pioneer_scarf_badge",
    name: "少先队红领巾与红五星徽章",
    icon: "🧣",
    category: "commemoration",
    yearAcquired: 1985,
    description: "小学第一批光荣入队获得的红绸红领巾与金边红五星队徽，童年至高无上的荣誉",
    bonusText: "魅力 +10 · 智力 +6 · 自律 +8",
  },
  three_goods_certificate_diary: {
    id: "three_goods_certificate_diary",
    name: "市教育局三好学生奖状与红塑料皮日记本",
    icon: "📜",
    category: "commemoration",
    yearAcquired: 1986,
    description: "印有‘好好学习 天天向上’金色烫印大红奖状，奖品是带有锁扣的红塑料皮日记本",
    bonusText: "智力 +12 · 魅力 +8 · 家族声誉提升",
  },
  dragon_ball_comic_vol1: {
    id: "dragon_ball_comic_vol1",
    name: "海南版《七龙珠》卷一连环画",
    icon: "📖",
    category: "toy",
    yearAcquired: 1986,
    description: "80年代风靡小学校园的海南摄影美术版小开本黑白漫画，孙悟空初出茅庐的经典童年读物",
    bonusText: "智力 +8 · 专注 +6",
  },
  handmade_slingshot: {
    id: "handmade_slingshot",
    name: "大院木丫牛皮筋自制神射弹弓",
    icon: "🎯",
    category: "toy",
    yearAcquired: 1986,
    description: "用老槐树桠桠精心打磨、绑扎废弃自行车内胎与牛皮鞋舌的高精度弹弓，百步穿杨打靶夺冠的信物",
    bonusText: "健康 +8 · 敏捷 +8 · 神射手威名",
  },
  diy_crystal_radio: {
    id: "diy_crystal_radio",
    name: "少年宫自制矿石收音机与电路板",
    icon: "📻",
    category: "toy",
    yearAcquired: 1987,
    description: "在市少年宫无线电小组用电烙铁和松香亲手焊制的矿石收音机，能清晰听到中央人民广播电台",
    bonusText: "智力 +12 · 专注 +10 · 开启【无线电与科学探索】天资",
  },
  oilskin_umbrella_and_rag: {
    id: "oilskin_umbrella_and_rag",
    name: "老式黄油布大伞与擦车棉纱",
    icon: "☂️",
    category: "appliance",
    yearAcquired: 1987,
    description: "80年代大院工人家中常备的桐油防雨大黄伞与机修棉纱，暴雨天骑行抢修链条的得力助手",
    bonusText: "健康 +7 · 工巧 +6",
  },
  crayfish_bucket_set: {
    id: "crayfish_bucket_set",
    name: "秘密基地特制钓虾竹竿与白铁桶",
    icon: "🦞",
    category: "toy",
    yearAcquired: 1987,
    description: "厂区后山小水沟秘密基地的全套战利品装备，见证了少儿时代钓小龙虾、捉泥鳅的无忧无虑夏日时光",
    bonusText: "健康 +8 · 快乐 +8 · 野趣探险家",
  },
  transformers_optimus_prime: {
    id: "transformers_optimus_prime",
    name: "国产正版变形金刚擎天柱模型",
    icon: "🤖",
    category: "toy",
    yearAcquired: 1988,
    description: "80年代末风靡全国的童年神级玩具，红蓝合金重卡车头与可变身汽车人领袖，大院孩子围观焦点",
    bonusText: "快乐 +15 · 魅力 +10 · 社交 +12",
  },
  contra_fc_cartridge: {
    id: "contra_fc_cartridge",
    name: "经典黄卡八合一红白机卡带",
    icon: "🎮",
    category: "toy",
    yearAcquired: 1988,
    description: "80年代末插在小霸王/红白机上的经典黄色合体卡带，收录《魂斗罗》《赤色要塞》《沙罗曼蛇》等童年神作",
    bonusText: "智力 +8 · 快乐 +10 · 时代流行风向",
  },
  colorful_rubber_band_loop: {
    id: "colorful_rubber_band_loop",
    name: "彩色牛皮筋与跳皮筋歌谣折纸",
    icon: "🎀",
    category: "toy",
    yearAcquired: 1988,
    description: "一截截彩色橡胶圈手工套结而成的长皮筋，课间操场上伴随清脆歌谣跳动翻飞的时代印记",
    bonusText: "魅力 +8 · 敏捷 +7",
  },
  hualuogeng_math_medal: {
    id: "hualuogeng_math_medal",
    name: "华罗庚金杯数学竞赛荣誉奖章",
    icon: "🥇",
    category: "commemoration",
    yearAcquired: 1989,
    description: "全国青少年数学奥林匹克竞赛‘华杯赛’荣誉镀金奖章与精装《华氏数论题解》",
    bonusText: "智力 +15 · 专注 +10 · 逻辑思维蜕变",
  },
  shuihu_cards_album: {
    id: "shuihu_cards_album",
    name: "全套水浒一百单八将闪卡册",
    icon: "🃏",
    category: "commemoration",
    yearAcquired: 1989,
    description: "吃干脆面千辛万苦集齐的梁山好汉烫金闪卡全集，大院孩子眼中至高无上的社交硬通货与收藏荣耀",
    bonusText: "魅力 +10 · 社交 +8 · 典藏荣耀",
  },
  safety_pledge_certificate: {
    id: "safety_pledge_certificate",
    name: "少先队员暑期防溺水保证书",
    icon: "📜",
    category: "commemoration",
    yearAcquired: 1989,
    description: "印有少先队队徽的泛黄红白安全保证书，手写承诺防范危险，是敬畏生命与平安成长的烙印",
    bonusText: "智力 +6 · 亲情 +8",
  },
  asian_games_panpan_badge: {
    id: "asian_games_panpan_badge",
    name: "1990北京亚运会盼盼吉祥物纪念章",
    icon: "🐼",
    category: "commemoration",
    yearAcquired: 1990,
    description: "1990年北京亚运会官方正版熊猫盼盼手持金牌造型镀金纪念章与小学毕业同学录",
    bonusText: "魅力 +12 · 快乐 +10 · 时代自豪 · 开启重点中学篇章",
  },
  arcade_bronze_token: {
    id: "arcade_bronze_token",
    name: "工人文化宫街机厅老铜游戏币",
    icon: "🪙",
    category: "commemoration",
    yearAcquired: 1990,
    description: "刻有飞鹰图案的厚实老黄铜游戏代币，街机厅里一币通关《街头霸王》战神荣耀的永恒见证",
    bonusText: "智力 +8 · 魅力 +8 · 街机格斗神话",
  },
  handwritten_mistake_notebook: {
    id: "handwritten_mistake_notebook",
    name: "牛皮纸手抄算术错题集",
    icon: "📓",
    category: "commemoration",
    yearAcquired: 1990,
    description: "用废旧挂历和牛皮纸手工订合的算术错题本，用红蓝圆珠笔细致批注，见证求知严谨的足迹",
    bonusText: "智力 +10 · 专注 +8",
  },
  communist_youth_league_badge: {
    id: "communist_youth_league_badge",
    name: "中国共青团团员证与团徽徽章",
    icon: "🎖️",
    category: "commemoration",
    yearAcquired: 1991,
    description: "初一首批入团领取的中国共产主义青年团团员证与红底金边团徽，压在书桌玻璃板下熠熠生辉",
    bonusText: "魅力 +10 · 智力 +6 · 开启【青年先锋】声誉",
  },
  aiwa_walkman_cassette: {
    id: "aiwa_walkman_cassette",
    name: "爱华AIWA双卡立体声磁带随身听",
    icon: "📻",
    category: "appliance",
    yearAcquired: 1992,
    description: "90年代初风靡中学的便携磁带机，配立体声海绵耳机，一面放李雷韩梅梅英语磁带，一面藏着港台金曲",
    bonusText: "智力 +12 · 快乐 +10 · 语言感知 +2",
  },
  sports_relay_gold_medal: {
    id: "sports_relay_gold_medal",
    name: "校运会接力冠军金牌",
    icon: "🥇",
    category: "commemoration",
    yearAcquired: 1992,
    description: "90年代初秋季中学生田径运动会男子/女子4×100米接力决赛压轴逆转夺冠镀金奖牌与大红丝绒绶带",
    bonusText: "健康 +12 · 魅力 +10 · 班级凝聚力飙升",
  },
  iron_whistle_and_rubber_ball: {
    id: "iron_whistle_and_rubber_ball",
    name: "老式铁裁判哨与火车头篮球",
    icon: "🏀",
    category: "toy",
    yearAcquired: 1992,
    description: "黄泥操场上挥洒汗水的5号橡胶篮球与铁哨，象征着公平竞争与青春担当",
    bonusText: "魅力 +10 · 健康 +6 · 领袖魄力",
  },
  walkman_cassette_tape: {
    id: "walkman_cassette_tape",
    name: "爱华随身听与港台金曲翻录带",
    icon: "📼",
    category: "appliance",
    yearAcquired: 1992,
    description: "90年代初省吃俭用买下的磁带随身听，盒子里塞满用圆珠笔倒带的手抄歌词本与港台流行金曲翻录带",
    bonusText: "魅力 +8 · 快乐 +10 · 时代流行文化印记",
  },
  key_high_school_admission: {
    id: "key_high_school_admission",
    name: "省重点中学录取通知书与红校徽",
    icon: "🎯",
    category: "commemoration",
    yearAcquired: 1993,
    description: "1993年中考全区名列前茅斩获的省重点高中大红烫金录取通知书，别在胸前的铝制红色校徽是全家荣光",
    bonusText: "智力 +16 · 魅力 +10 · 重点高中声望",
  },
  leather_graduation_autograph_book: {
    id: "leather_graduation_autograph_book",
    name: "精装真皮烫金毕业同学录",
    icon: "📖",
    category: "commemoration",
    yearAcquired: 1993,
    description: "90年代风靡中学的硬皮烫金活页同学录，贴满一寸红底黑白免冠寸照、名人格言与夹有金黄枫叶书签的青涩赠言",
    bonusText: "魅力 +12 · 快乐 +10 · 青春羁绊永恒",
  },
  cooling_patch_and_thermometer: {
    id: "cooling_patch_and_thermometer",
    name: "水银体温计与清凉薄荷退热贴",
    icon: "🌡️",
    category: "commemoration",
    yearAcquired: 1993,
    description: "印着红十字的玻璃水银体温计与薄荷退热贴，见证考场上咬牙拼搏的钢铁意志",
    bonusText: "健康 +8 · 坚毅 +6 · 战胜逆境",
  },
  locked_leather_secret_diary: {
    id: "locked_leather_secret_diary",
    name: "带小黄铜锁的红皮青春日记本",
    icon: "📓",
    category: "commemoration",
    yearAcquired: 1993,
    description: "泛着皮革香气的小密码锁日记本，记录了懵懂年华的心事与和解后家庭的温暖尊重",
    bonusText: "魅力 +10 · 亲情 +8 · 心智成熟",
  },
  military_training_flask_cert: {
    id: "military_training_flask_cert",
    name: "军训优秀学员国防绿水壶与荣誉证书",
    icon: "🪖",
    category: "commemoration",
    yearAcquired: 1994,
    description: "高一封闭式军训烈日下摸爬滚打荣获的“优秀标兵”证书与压铸铝制国防绿军用水壶，刻满青春汗水",
    bonusText: "健康 +14 · 魅力 +8 · 坚毅意志",
  },
  kapok_folk_guitar: {
    id: "kapok_folk_guitar",
    name: "红棉牌民谣木吉他",
    icon: "🎸",
    category: "toy",
    yearAcquired: 1994,
    description: "广州红棉乐器厂出品的经典原木色缺角民谣吉他，在操场草坪与晚自习弹唱《同桌的你》《睡在我上铺的兄弟》的文艺青年标配",
    bonusText: "魅力 +15 · 智力 +8 · 开启【校园民谣与音乐创作】天资",
  },
  joint_exam_error_analysis_sheets: {
    id: "joint_exam_error_analysis_sheets",
    name: "八校联考错题归纳活页夹",
    icon: "📑",
    category: "commemoration",
    yearAcquired: 1994,
    description: "用蓝黑英雄墨水工整整理的重点题型与错因分析手札，是高中学海逆袭的无价之宝",
    bonusText: "智力 +10 · 专注 +8 · 逻辑思维升华",
  },
  olympiad_gold_fountain_pen: {
    id: "olympiad_gold_fountain_pen",
    name: "全国高中奥赛金奖纪念英雄金笔",
    icon: "✒️",
    category: "commemoration",
    yearAcquired: 1995,
    description: "全国数理化奥赛斩获省一等奖时省科协颁发的暗尖12K金笔，笔身刻有“攀登科学高峰”金色烫字",
    bonusText: "智力 +18 · 专注 +10 · 保送选拔加分",
  },
  floppy_disk_and_wubi_card: {
    id: "floppy_disk_and_wubi_card",
    name: "3.5英寸软盘与五笔字根卡片",
    icon: "💾",
    category: "toy",
    yearAcquired: 1995,
    description: "90年代中叶电脑室微机课必备的万胜1.44MB软盘与王码五笔字型字根助记卡，装有《仙剑奇侠传DOS版》锁妖塔通关存档",
    bonusText: "智力 +15 · 敏捷 +10 · 开启【信息技术与微机应用】天资",
  },
  gaokao_ticket_2b_pencil: {
    id: "gaokao_ticket_2b_pencil",
    name: "全国高考准考证与中华2B铅笔套装",
    icon: "✏️",
    category: "commemoration",
    yearAcquired: 1996,
    description: "1996年7月7~9日“黑色七月”千军万马过独木桥的准考证，配中华牌红木2B填涂铅笔与橡皮擦",
    bonusText: "智力 +15 · 坚毅 +12 · 考场定力",
  },
  university_admission_notice: {
    id: "university_admission_notice",
    name: "全国重点大学录取通知书与搪瓷校徽",
    icon: "🎓",
    category: "commemoration",
    yearAcquired: 1996,
    description: "由邮电局投递员骑着二八大杠特快专递送达的重点大学红色录取通知书，光宗耀祖的大喜捷报！",
    bonusText: "智力 +20 · 魅力 +15 · 人生跃迁",
  },
  gaokao_countdown_running_shoes: {
    id: "gaokao_countdown_running_shoes",
    name: "高考冲刺回力双星白球鞋",
    icon: "👟",
    category: "clothing",
    yearAcquired: 1996,
    description: "高三傍晚在红渣操场减压慢跑穿磨底的经典白球鞋，承载着追逐梦想的汗水与从容",
    bonusText: "健康 +12 · 快乐 +8 · 卸下包袱",
  },
  hk_return_commemorative_medal: {
    id: "hk_return_commemorative_medal",
    name: "1997香港回归纪念铜章与特别行政区首日封",
    icon: "🏅",
    category: "commemoration",
    yearAcquired: 1997,
    description: "1997年7月1日香港回归祖国时发行的紫荆花镀金纪念铜章与国家邮政局特发首日封，铭刻百年荣光",
    bonusText: "魅力 +16 · 智力 +12 · 爱国情怀与历史见证",
  },
  college_student_meal_card: {
    id: "college_student_meal_card",
    name: "大学录取通知书配套建设银行高校联名饭卡",
    icon: "💳",
    category: "commemoration",
    yearAcquired: 1997,
    description: "高校统一办理的红白塑料磁条饭卡与图书借阅卡，每天在大学一食堂打红烧大排与自习占座的青春凭证",
    bonusText: "健康 +10 · 快乐 +8 · 校园生活印记",
  },
  campus_201_ic_phone_card: {
    id: "campus_201_ic_phone_card",
    name: "201校园电话磁卡与公用电话亭充值卡集",
    icon: "☎️",
    category: "commemoration",
    yearAcquired: 1997,
    description: "90年代末大学宿舍楼下排队给远方父母报平安、与笔友倾诉心事的201校园电话卡，卡面印有世界名胜风光",
    bonusText: "亲情 +15 · 魅力 +10 · 情感连结",
  },
  flood_relief_volunteer_ribbon: {
    id: "flood_relief_volunteer_ribbon",
    name: "98抗洪救灾青年志愿突击队荣誉绶带与感谢信",
    icon: "🎗️",
    category: "commemoration",
    yearAcquired: 1998,
    description: "1998年特大洪灾期间随高校青年志愿者协会赴一线搬运救灾物资、组织义卖捐赠时获得的红绸绶带",
    bonusText: "坚毅 +16 · 魅力 +14 · 奉献勋章",
  },
  motorola_pager_beeper: {
    id: "motorola_pager_beeper",
    name: "摩托罗拉双行汉显寻呼机（BB机）与皮质腰套",
    icon: "📟",
    category: "appliance",
    yearAcquired: 1998,
    description: "“呼我必复，随时联络”，别在腰带上的摩托罗拉汉显寻呼机，世纪之交最前沿的时尚通讯象征",
    bonusText: "社交 +16 · 敏捷 +12 · 开启【即时通讯与人际网络】",
  },
  college_debate_crystal_trophy: {
    id: "college_debate_crystal_trophy",
    name: "千禧年全省高校大专辩论赛最佳辩手水晶奖杯",
    icon: "🏆",
    category: "commemoration",
    yearAcquired: 1999,
    description: "在省高校辩论赛上舌战群儒斩获一等奖的水晶奖杯，底座刻有“理明辞达，思辨求真”",
    bonusText: "智力 +20 · 魅力 +18 · 辩才无碍",
  },
  millennium_time_capsule: {
    id: "millennium_time_capsule",
    name: "2000千禧年愿望封存金属时间胶囊",
    icon: "⏳",
    category: "commemoration",
    yearAcquired: 1999,
    description: "在1999年12月31日千禧夜写下对21世纪人生规划与时代誓言的密封不锈钢胶囊，约定十年后开启",
    bonusText: "意志 +18 · 智力 +10 · 跨世纪远见",
  },
  bachelor_degree_and_gown: {
    id: "bachelor_degree_and_gown",
    name: "全国普通高等教育学士学位证书与红黑学士服",
    icon: "📜",
    category: "commemoration",
    yearAcquired: 2000,
    description: "世纪之交千禧年六月授予的工学/经济学学士学位证书与红黑流苏学士帽，定格大学四年风华正茂",
    bonusText: "智力 +22 · 魅力 +16 · 人生新起点",
  },
  nokia_5110_mobile_phone: {
    id: "nokia_5110_mobile_phone",
    name: "第一代诺基亚5110经典按键手机（带贪吃蛇）",
    icon: "📱",
    category: "appliance",
    yearAcquired: 2000,
    description: "大学毕业前夕用实习兼职工资购入的人生第一部移动手机，经典单色绿屏、可换彩壳与贪吃蛇游戏",
    bonusText: "魅力 +15 · 敏捷 +10 · 移动互联先驱",
  },
  zhongguancun_diy_pc_invoice: {
    id: "zhongguancun_diy_pc_invoice",
    name: "中关村组装奔腾III兼容机与联想天禧电脑发票",
    icon: "🖥️",
    category: "appliance",
    yearAcquired: 2000,
    description: "在中关村电脑城亲自挑选主板、奔腾III处理器与帝盟显卡组装的顶配电脑发票，开启第一波互联网冲浪",
    bonusText: "智力 +18 · 技能 +14 · 开启【PC互联网与极客】天资",
  },
  wto_entry_commemorative_stamps: {
    id: "wto_entry_commemorative_stamps",
    name: "中国加入WTO纪念邮票四方联与丝绸首日封",
    icon: "✉️",
    category: "commemoration",
    yearAcquired: 2001,
    description: "2001年12月中国正式加入世界贸易组织时中国邮政发行的特别纪念邮票，见证中国融入全球经济大舞台",
    bonusText: "智力 +16 · 魅力 +12 · 国际化大视野",
  },
  beijing_olympics_bid_newspaper: {
    id: "beijing_olympics_bid_newspaper",
    name: "2001年北京申奥成功号外《北京晚报》珍藏版",
    icon: "📰",
    category: "commemoration",
    yearAcquired: 2001,
    description: "“北京赢了！”2001年7月13日莫斯科萨马兰奇宣布北京当选2008奥运主办城市时的特刊号外报纸，字迹已微微发黄但热血依旧",
    bonusText: "快乐 +18 · 魅力 +14 · 世纪自豪",
  },
  first_job_contract_and_badge: {
    id: "first_job_contract_and_badge",
    name: "首份正式劳动合同书与亚克力工号胸牌",
    icon: "💼",
    category: "commemoration",
    yearAcquired: 2001,
    description: "初入职场签署的第一份正式劳动合同与印有工号、姓名的亚克力胸牌，标志着正式成为独立自足的职业人",
    bonusText: "存款 +500 · 智力 +12 · 职业立足",
  },
  first_salary_shanghai_watch: {
    id: "first_salary_shanghai_watch",
    name: "第一份工资给父母购买的上海牌全自动机械手表",
    icon: "⌚",
    category: "clothing",
    yearAcquired: 2001,
    description: "领到第一个月转正工资后走进百货大楼，为辛劳一生的父亲精挑细选的上海牌全钢机械表，父母逢人便夸孩子出息了",
    bonusText: "亲情 +25 · 快乐 +16 · 孝悌立身",
  },
  first_apartment_brass_key: {
    id: "first_apartment_brass_key",
    name: "青年单身公寓租房合同与第一把独立黄铜钥匙",
    icon: "🔑",
    category: "commemoration",
    yearAcquired: 2002,
    description: "告别集体宿舍后租下的第一套带阳台单身公寓合同与老式黄铜钥匙，在城市里拥有了属于自己的第一方独立天地",
    bonusText: "快乐 +15 · 魅力 +10 · 独立自强",
  },
  first_wool_business_suit: {
    id: "first_wool_business_suit",
    name: "职场第一套精仿羊毛西装与真皮公文包",
    icon: "👔",
    category: "clothing",
    yearAcquired: 2002,
    description: "为了主持首个跨部门重要商业发布会而量身定制的藏青色羊毛西服与真皮公文包，沉稳自信气场十足",
    bonusText: "魅力 +20 · 智力 +10 · 职场锋芒",
  },
  ...ESPORTS_VINTAGE_ASSETS,
  ...LOL_NARRATIVE_VINTAGE_ASSETS,
};

export const CHILDHOOD_EVENT_DATABASE: LifeEventDefinition[] = [
  ...MILESTONE_EVENTS_DATABASE,
  ...DAILY_LIFE_EVENTS_DATABASE,
  ...SOCIAL_CHILDHOOD_EVENTS_DATABASE,
  ...RISK_ACCIDENT_EVENTS_DATABASE,
  ...LOL_NARRATIVE_EVENTS,
  // ====================================================
  // 1. 特定年龄里程碑事件 (Milestone Events)
  // ====================================================
  {
    id: "ms_age1_tumble",
    category: "milestone",
    minAge: 1,
    maxAge: 1,
    title: "🚼 蹒跚学步摔倒的小插曲",
    icon: "🤕",
    narrative: "你在大院红砖小道上扶着竹椅颤颤巍巍迈步，重心一偏一屁股摔坐在地上，小手擦破了一点皮，父母快步赶来……",
    options: [
      {
        label: "骨碌爬起来继续往前走",
        hint: "坚毅勇敢 · 强健体魄",
        resultDesc: "你拍拍小手自己站了起来，街坊们纷纷鼓掌夸这娃皮实有出息！",
        effect: { health: 5, charm: 3, happiness: 4 },
      },
      {
        label: "扁起小嘴巴哇哇大哭要抱抱",
        hint: "撒娇依恋 · 亲情呵护",
        resultDesc: "母亲心疼地把你抱在怀里温柔安抚，哼着摇篮曲喂了一勺热麦乳精。",
        effect: { happiness: 8, charm: 4, affinityTarget: "mother", affinityDelta: 6 },
      },
    ],
  },
  {
    id: "ms_age3_nursery",
    category: "milestone",
    minAge: 3,
    maxAge: 3,
    title: "🎒 托儿所第一天入园仪式",
    icon: "🏫",
    narrative: "满三岁的你戴上红五星小布包来到县机床厂职工托儿所，许多小娃娃抱着爸妈大腿哭，阿姨手里拿着一篮大红苹果微笑招手……",
    options: [
      {
        label: "大方挥手跟爸妈再见昂首进教室",
        hint: "独立自强 · 幼童模范",
        resultDesc: "阿姨在全班小朋友面前表扬了你，并在你额头上贴了一朵闪闪发光的大红花！",
        effect: { intelligence: 6, charm: 5, happiness: 6, unlockAssetId: "nursery_red_star_bag" },
      },
      {
        label: "眼圈泛红依依不舍拉着妈妈手指",
        hint: "依恋温情 · 亲情满溢",
        resultDesc: "母亲温柔地亲了亲你的小脸颊，从口袋里掏出两块大白兔奶糖塞进你的小布包里。",
        effect: { happiness: 6, affinityTarget: "mother", affinityDelta: 8, unlockAssetId: "white_rabbit_candy_tin" },
      },
    ],
  },
  {
    id: "ms_age5_preschool",
    category: "milestone",
    minAge: 5,
    maxAge: 5,
    title: "🧮 托儿所大班算术识字神童",
    icon: "📝",
    narrative: "托儿所大班老师在小黑板上出了几道复杂的 100 以内加减法和古诗背诵，台下许多小朋友咬着铅笔头犯难……",
    options: [
      {
        label: "快速举起小手心算报出准确答案并流畅背诗",
        hint: "拔尖领跑 · 开智神童",
        resultDesc: "老师惊喜地连连夸奖，为你颁发了九九乘法小木牌，全班都投来钦佩目光！",
        effect: { intelligence: 10, charm: 6, happiness: 6, unlockAssetId: "abacus_multiplication_board" },
      },
      {
        label: "主动转过身耐心地教同桌王小军数手指算题",
        hint: "乐于助人 · 友爱同伴",
        resultDesc: "在你的耐心帮助下小军也算出了答案，两人的友谊更加深厚坚固！",
        effect: { charm: 8, intelligence: 6, affinityTarget: "friend_xiaojun", affinityDelta: 15 },
      },
    ],
  },
  {
    id: "ms_age6_primary",
    category: "milestone",
    minAge: 6,
    maxAge: 6,
    title: "🎖️ 背上军绿书包 · 升入厂矿子弟第一小学",
    icon: "🏫",
    narrative: "迎着金秋晨光，你背上崭新的军绿斜挎帆布书包，跨入国营机床厂子弟第一小学的校门，开启了真正的小学学业生涯！",
    options: [
      {
        label: "挺直腰板端坐在第一排竞选班长",
        hint: "领袖气质 · 拔尖奋进",
        resultDesc: "你响亮自豪的发言赢得了班主任刘老师的大力赞许，当选为一年级一班代理班长！",
        effect: { intelligence: 8, charm: 8, happiness: 6 },
      },
      {
        label: "拉着发小王小军抢占靠窗的最佳同桌位置",
        hint: "发小情深 · 快乐求学",
        resultDesc: "两人相视一笑成为同桌，上课一起认真听讲，下课一起在操场跳皮筋打弹珠！",
        effect: { happiness: 8, affinityTarget: "friend_xiaojun", affinityDelta: 15 },
      },
    ],
  },

  // ====================================================
  // 2. 童年通用生活事件库 (General Recurring Pool · 1~6岁)
  // ====================================================
  {
    id: "gen_piggy_bank",
    category: "general",
    minAge: 1,
    maxAge: 6,
    title: "🐷 摇晃小猪陶罐扑满",
    icon: "🪙",
    narrative: "你坐在床沿摇晃沉甸甸的小泥猪储蓄罐，里面哗啦啦作响，装着长辈平时给你的铝分币……",
    options: [
      {
        label: "忍住嘴馋继续往里存进一分钱纸币",
        hint: "勤俭节约 · 财商启蒙",
        resultDesc: "听着硬币落下的清脆响声，你懂得了积少成多的道理，心里格外踏实！",
        effect: { intelligence: 6, cash: 0.1, happiness: 4 },
      },
      {
        label: "倒出两枚二分硬币去买一根赤豆红水冰棍",
        hint: "享受当下 · 甜蜜童年",
        resultDesc: "咬下一口冰凉甜糯的赤豆冰棍，整个人在酷暑中精神大振！",
        effect: { happiness: 8, cash: -0.04 },
      },
    ],
  },
  {
    id: "gen_sewing_machine",
    category: "general",
    minAge: 1,
    maxAge: 6,
    title: "🧵 母亲的飞人牌缝纫机",
    icon: "🪡",
    narrative: "午后母亲在飞人牌缝纫机前咔哒咔哒踩着踏板为你改衣服，阳光洒在飞转的银色飞轮上……",
    options: [
      {
        label: "眯起眼睛帮母亲稳稳穿过细缝纫针线",
        hint: "眼神敏锐 · 孝顺贴心",
        resultDesc: "一次穿针成功！母亲开心地摸摸你的脸颊，夸你是家里最顶用的小助手。",
        effect: { intelligence: 6, charm: 6, affinityTarget: "mother", affinityDelta: 8 },
      },
      {
        label: "蹲在母亲脚边模仿踏板节奏踩小碎步",
        hint: "天真烂漫 · 逗乐全家",
        resultDesc: "你欢快的小动作把母亲逗得合不拢嘴，大院充满了温馨快活的空气。",
        effect: { happiness: 8, charm: 5 },
      },
    ],
  },
  {
    id: "gen_popcorn_vendor",
    category: "general",
    minAge: 2,
    maxAge: 6,
    title: "🍿 大院里来了爆米花老师傅",
    icon: "💥",
    narrative: "大院空地上传来熟悉的吆喝声，老师傅摇动着黑葫芦一样的爆米花铁炉，大院孩童们排成长队……",
    options: [
      {
        label: "双手死死捂住耳朵，等待“砰”的一声惊天巨响",
        hint: "沉稳期待 · 仪式感满分",
        resultDesc: "砰！白烟升腾，热腾腾香喷喷的玉米花散落一地，你抓了一大把塞进嘴里！",
        effect: { happiness: 8, health: 4 },
      },
      {
        label: "捧着自家搪瓷盆大方分给旁边排队的小伙伴",
        hint: "慷慨分享 · 大院好人缘",
        resultDesc: "小伙伴们围着你欢呼，大家互相交换不同味道的爆米花，其乐融融。",
        effect: { charm: 8, happiness: 6, affinityTarget: "friend_xiaojun", affinityDelta: 8 },
      },
    ],
  },
  {
    id: "gen_father_tools",
    category: "general",
    minAge: 1,
    maxAge: 6,
    title: "🔧 父亲的红木工具箱",
    icon: "🧰",
    narrative: "星期天父亲在院子里修理老收音机和台灯，打开了机床厂发的红木工具箱，各式螺丝刀和游标卡尺银光闪闪……",
    options: [
      {
        label: "好奇地蹲在旁边准确帮父亲递对应型号扳手",
        hint: "工巧潜能 · 父子默契",
        resultDesc: "父亲惊叹于你的辨识力，手把手教你认识了游标卡尺的读数，工匠精神悄然萌芽！",
        effect: { intelligence: 8, health: 4, affinityTarget: "father", affinityDelta: 10 },
      },
      {
        label: "拿起一颗废旧钢珠轴承在地上当陀螺飞转",
        hint: "玩具开发 · 活力无限",
        resultDesc: "轴承在水泥地上飞速旋转发出嗡嗡声，你和王小军比赛谁的轴承转得久！",
        effect: { health: 6, happiness: 8 },
      },
    ],
  },
  {
    id: "gen_water_melon_well",
    category: "general",
    minAge: 1,
    maxAge: 6,
    title: "🍉 深井冰镇大西瓜的夏日",
    icon: "🍧",
    narrative: "炎炎夏日，父亲用网兜将一整颗大红瓤西瓜吊入大院深水井中冰镇，傍晚捞起切开，咔嚓一声脆响……",
    options: [
      {
        label: "拿起小铁勺专挑最甜最沙的瓜心一口吞下",
        hint: "童年至味 · 畅快满足",
        resultDesc: "冰凉清甜的西瓜汁沁人心脾，炎热瞬间烟消云散，太痛快了！",
        effect: { happiness: 8, health: 5 },
      },
      {
        label: "端起切好的头两块大西瓜先送去给隔壁王阿姨",
        hint: "礼貌尊长 · 邻里温情",
        resultDesc: "王阿姨笑逐颜开连夸懂事，回赠了你一小把自炒的喷香葵花籽。",
        effect: { charm: 8, happiness: 5, intelligence: 4 },
      },
    ],
  },

  // ====================================================
  // 3. 突发生活事件库 (Emergent Events · 1~6岁)
  // ====================================================
  {
    id: "em_frog_toy",
    category: "emergent",
    minAge: 2,
    maxAge: 5,
    title: "🐸 王小军的发条铁皮青蛙",
    icon: "🕹️",
    narrative: "发小王小军在水磨石地板上玩一只绿皮发条跳跳蛙，青蛙咔哒咔哒欢快跳动，引得大院一群小娃娃围观……",
    options: [
      {
        label: "拿出竹蜻蜓主动找他交换玩",
        hint: "社交分享 · 共同玩耍",
        resultDesc: "两人在大院里交换玩具玩得满头大汗，王小军成了你最铁的小伙伴！",
        effect: { intelligence: 5, charm: 4, affinityTarget: "friend_xiaojun", affinityDelta: 12, unlockAssetId: "tin_jumping_frog" },
      },
      {
        label: "蹲在旁边使劲拍手加油叫好",
        hint: "乖巧助威 · 讨喜可爱",
        resultDesc: "王小军看你这么捧场，神气地把铁皮青蛙塞给你：“借你拧两圈发条！”",
        effect: { charm: 7, happiness: 6, unlockAssetId: "tin_jumping_frog" },
      },
    ],
  },
  {
    id: "em_dime_found",
    category: "emergent",
    minAge: 2,
    maxAge: 6,
    title: "💵 厂门口捡到一角钱纸币",
    icon: "💰",
    narrative: "你在机床厂大门口花坛边踢石子，忽然在冬青树叶下发现了一张崭新的一角钱纸币……",
    options: [
      {
        label: "拾金不昧交给厂保卫科值班室的大叔",
        hint: "品德高尚 · 诚实端正",
        resultDesc: "保卫科叔叔表扬了你，在厂大院广播里通报表扬你的诚实行径！",
        effect: { charm: 10, intelligence: 5, happiness: 6 },
      },
      {
        label: "飞奔去小卖部买两根小豆冰棍请发小吃",
        hint: "有福同享 · 快乐分享",
        resultDesc: "你和王小军坐在大院石凳上美滋滋吃着冰棍，友谊更加深厚！",
        effect: { happiness: 8, affinityTarget: "friend_xiaojun", affinityDelta: 10 },
      },
    ],
  },
  {
    id: "em_chalk_drawing",
    category: "emergent",
    minAge: 2,
    maxAge: 6,
    title: "🖍️ 粉笔头水泥地画跳房子",
    icon: "🎨",
    narrative: "你从托儿所捡来两截彩色粉笔头，在宿舍楼前的水泥地上画出标准的九宫格跳房子……",
    options: [
      {
        label: "单脚连续稳健跳跃准确踢沙包",
        hint: "平衡协调 · 运动强健",
        resultDesc: "你灵活的身姿赢得满场喝彩，夺得了这届大院跳房子冠军！",
        effect: { health: 8, charm: 5, happiness: 6 },
      },
      {
        label: "在旁边画了一幅生动的大院全家福",
        hint: "艺术审美 · 想象丰富",
        resultDesc: "路过的邻里街坊纷纷驻足夸赞，夸这娃打小就有画画天赋！",
        effect: { intelligence: 8, charm: 7 },
      },
    ],
  },
  {
    id: "em_ant_colony",
    category: "emergent",
    minAge: 1,
    maxAge: 5,
    title: "🐜 红砖缝里的蚂蚁搬家",
    icon: "🔍",
    narrative: "夏日暴雨前夕，你发现红砖墙脚密密麻麻排着长长的黑蚂蚁队伍，正齐心协力搬运一粒大馒头渣……",
    options: [
      {
        label: "趴在地上用小放大镜仔细观察蚂蚁分工",
        hint: "科学观察 · 专注求知",
        resultDesc: "你聚精会神看了一下午，写意地理解了自然界团结协作的力量！",
        effect: { intelligence: 8, health: 4 },
      },
      {
        label: "跑回厨房拿来一块白糖放在队伍前方支援",
        hint: "心地善良 · 关爱生灵",
        resultDesc: "蚂蚁们兴奋地包围了白糖，你开心地拍着小手，心情格外明朗。",
        effect: { charm: 6, happiness: 8 },
      },
    ],
  },
  {
    id: "em_monkey_king",
    category: "emergent",
    minAge: 3,
    maxAge: 6,
    title: "📖 小书摊上的《大闹天宫》",
    icon: "📕",
    narrative: "托儿所门口的小书摊摆出最新版彩绘《大闹天宫》连环画，美猴王威风凛凛，许多小朋友蹲在地上看……",
    options: [
      {
        label: "找妈妈买下回家绘声绘色讲给小伙伴听",
        hint: "文学表达 · 绘声绘色",
        resultDesc: "你凭借过人记忆力讲得跌宕起伏，大院小朋友排排坐听得入迷，人缘极佳！",
        effect: { intelligence: 8, charm: 6, unlockAssetId: "monkey_king_comic" },
      },
      {
        label: "和小伙伴们凑钱在书摊前席地而坐一起翻阅",
        hint: "分享共读 · 童趣融融",
        resultDesc: "你和小军头挨着头一页一页翻看，被孙悟空七十二变逗得前仰后合。",
        effect: { happiness: 8, charm: 5, affinityTarget: "friend_xiaojun", affinityDelta: 8 },
      },
    ],
  },
  {
    id: "em_hero_cards",
    category: "emergent",
    minAge: 3,
    maxAge: 6,
    title: "🃏 大院洋画与弹珠争霸",
    icon: "🎯",
    narrative: "大院空地上，王小军等一群孩童在红砖地上拍香烟洋画、弹彩色玻璃球，周围欢呼声阵阵……",
    options: [
      {
        label: "凭借精准手劲和风向一记拍翻整叠洋画",
        hint: "身手不凡 · 赢得全套",
        resultDesc: "啪的一声脆响，整叠洋画全被掀翻，你赢回了满满一铁盒三国水浒英雄牌！",
        effect: { health: 6, intelligence: 6, happiness: 8, unlockAssetId: "hero_cards_collection", affinityTarget: "friend_xiaojun", affinityDelta: 10 },
      },
      {
        label: "拿出最漂亮的彩色玻璃弹珠精准比拼",
        hint: "专注命中 · 弹无虚发",
        resultDesc: "你单膝跪地凝神瞄准，啪的一声击中目标，赢得了全场阵阵喝彩！",
        effect: { intelligence: 7, health: 6, unlockAssetId: "glass_marbles_pouch" },
      },
    ],
  },

  // ====================================================
  // 4. 意外与风险事件库 (Accidental / Risk Events)
  // ====================================================
  {
    id: "acc_goose_chase",
    category: "accident",
    minAge: 1,
    maxAge: 6,
    title: "🪿 被隔壁李大爷家大白鹅追赶",
    icon: "🏃",
    narrative: "你路过隔壁小院，一只昂首挺胸的大白鹅扑棱着翅膀、伸长脖子大叫着朝你狂奔冲来……",
    options: [
      {
        label: "捡起一根小柳树枝勇敢站定挥舞对峙",
        hint: "临危不惧 · 勇敢坚毅",
        resultDesc: "大白鹅被你的威严气势震慑，悻悻地转身回窝，你成了大院降鹅小英雄！",
        effect: { health: 6, intelligence: 6, charm: 5 },
      },
      {
        label: "使出吃奶力气拔腿狂奔哭着呼唤妈妈",
        hint: "敏捷逃跑 · 亲情庇护",
        resultDesc: "母亲闻声冲出厨房一把抄起扫帚赶走大鹅，把你抱在怀里温柔安抚。",
        effect: { health: 4, happiness: 4, affinityTarget: "mother", affinityDelta: 8 },
      },
    ],
  },
  {
    id: "acc_scraped_knee",
    category: "accident",
    minAge: 1,
    maxAge: 6,
    title: "🩹 奔跑太急磕破了膝盖",
    icon: "🤕",
    narrative: "捉迷藏时跑得太急，你在红砖台阶前脚下一滑摔倒，膝盖擦破了皮渗出点点血迹……",
    options: [
      {
        label: "强忍泪水拍拍灰尘自己站起来继续走",
        hint: "坚毅勇敢 · 小小汉子",
        resultDesc: "你咬着嘴唇没掉一滴泪，街坊阿姨赞不绝口，给你抹上红药水。",
        effect: { health: 6, intelligence: 4, charm: 4 },
      },
      {
        label: "坐在地上扁着嘴抹眼泪等爸爸来抱",
        hint: "寻求呵护 · 亲情依恋",
        resultDesc: "父亲快步赶来背起你回到家，细心用双氧水消毒并贴上一张小纱布。",
        effect: { happiness: 6, affinityTarget: "father", affinityDelta: 8 },
      },
    ],
  },
  {
    id: "acc_vaccine_shot",
    category: "accident",
    minAge: 1,
    maxAge: 4,
    title: "💉 县卫生防疫站打百白破疫苗",
    icon: "🏥",
    narrative: "母亲带你来到县卫生防疫站接种疫苗，白大褂医生拿着针筒，旁边摆着一盘粉白相间的宝塔形打虫甜糖……",
    options: [
      {
        label: "咬紧牙关憋着不哭当个小勇士",
        hint: "坚毅勇敢 · 领宝塔糖",
        resultDesc: "你一声没吭，白大褂医生阿姨大声夸奖，特意奖励了你两颗甜甜的宝塔糖！",
        effect: { health: 8, intelligence: 4, unlockAssetId: "pagoda_candy_tin" },
      },
      {
        label: "吓得钻进妈妈怀里闭上眼睛",
        hint: "寻求呵护 · 亲情温暖",
        resultDesc: "虽然挨了一针掉了两颗金豆豆，但妈妈心疼地抱在怀里，回程路上买了根小冰棍！",
        effect: { happiness: 6, charm: 4, affinityTarget: "mother", affinityDelta: 8 },
      },
    ],
  },
  {
    id: "acc_fever_midnight",
    category: "accident",
    minAge: 1,
    maxAge: 5,
    title: "🌙 半夜突发高烧与卫生所",
    icon: "🌡️",
    narrative: "半夜你额头滚烫突发高烧，父母连夜轮流背着你来到厂职工卫生所，医生配了一碗苦涩的草药汤……",
    options: [
      {
        label: "懂事地捏紧小鼻子一饮而尽不让父母操心",
        hint: "乖巧坚毅 · 战胜病魔",
        resultDesc: "药力发散出一身透汗，天亮时高烧退去，父母悬着的心终于放下，满眼欣慰。",
        effect: { health: 8, intelligence: 5, happiness: 4 },
      },
      {
        label: "娇气地要父亲背着在大院走廊看满天繁星",
        hint: "夜空繁星 · 深刻记忆",
        resultDesc: "趴在父亲宽阔坚实的背上，微风拂面数着星星，你甜甜地进入了梦乡。",
        effect: { happiness: 8, charm: 6, affinityTarget: "father", affinityDelta: 10 },
      },
    ],
  },

  // ====================================================
  // 5. 少儿期里程碑事件 (Milestone Events · 7~12岁)
  // ====================================================
  {
    id: "ms_age7_young_pioneer",
    category: "milestone",
    minAge: 7,
    maxAge: 7,
    title: "🎖️ 少年先锋队第一批入队仪式与红领巾",
    icon: "🧣",
    narrative: "“六一”前夕学校大操场上队旗飘扬，大喇叭播放着《我们是共产主义接班人》。作为全校第一批表现优秀的少先队员，高年级大队长迈步向前，亲手为你系上平整鲜艳的红领巾！",
    options: [
      {
        label: "挺直腰板高举右拳庄严宣誓，标准行少先队队礼",
        hint: "品学兼优 · 模范先锋（解锁老物件）",
        resultDesc: "你响亮自豪的宣誓声响彻操场，校长亲自为你佩戴了闪闪发光的红五星队徽！全校师生投来羡慕赞许的目光。",
        effect: {
          intelligence: 8,
          charm: 10,
          happiness: 8,
          unlockAssetId: "young_pioneer_scarf_badge",
        },
      },
      {
        label: "散会后飞奔回家第一时间给父母戴上红领巾展示",
        hint: "孝顺分享 · 阖家欢欣",
        resultDesc: "母亲欣慰地眼角泛光，父亲特地去照相馆为你拍了一张佩戴红领巾的标准半身红底寸照留念！",
        effect: {
          happiness: 12,
          charm: 6,
          affinityTarget: "mother",
          affinityDelta: 15,
          unlockAssetId: "young_pioneer_scarf_badge",
        },
      },
    ],
  },
  {
    id: "ms_age8_three_goods_student",
    category: "milestone",
    minAge: 8,
    maxAge: 8,
    title: "📜 期末全校三好学生大红奖状",
    icon: "📜",
    narrative: "期末全校总结表彰大会在礼堂隆重举行。广播里宣读市教育局‘德智体美劳全面发展三好学生’名单，你的名字响亮地传遍整个校园，台下爆发雷鸣般的掌声！",
    options: [
      {
        label: "端正走上领奖台双手接过大红奖状与日记本",
        hint: "沉稳大气 · 拔尖翘楚（解锁老物件）",
        resultDesc: "班主任刘老师向你竖起大拇指。你将金字大红奖状端端正正贴在家中堂屋最显眼的正中央，邻里街坊纷纷登门夸赞！",
        effect: {
          intelligence: 12,
          charm: 8,
          happiness: 10,
          unlockAssetId: "three_goods_certificate_diary",
        },
      },
      {
        label: "走下领奖台主动与落选的发小击掌打气相约下学期一起争优",
        hint: "谦虚友爱 · 领袖风范",
        resultDesc: "你的真诚与大度感染了身边的每一个同学，小伙伴们发自内心地佩服你，全班凝聚力空前高涨！",
        effect: {
          charm: 12,
          intelligence: 8,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 18,
          unlockAssetId: "three_goods_certificate_diary",
        },
      },
    ],
  },
  {
    id: "ms_age9_science_palace",
    category: "milestone",
    minAge: 9,
    maxAge: 9,
    title: "🔭 少年宫无线电兴趣班与小发明",
    icon: "📻",
    narrative: "市少年宫开设第一期青少年无线电与电子科技班。在选拔考核中，你展现出惊人的动手天赋，手握滚烫的电烙铁与焊锡，独立组装完成了人生第一台矿石收音机！",
    options: [
      {
        label: "反复调试可变电容器，戴上高阻耳机捕捉纯净电波",
        hint: "专注钻研 · 科学启蒙（解锁老物件）",
        resultDesc: "耳机里清晰传出中央人民广播电台的报时声！少年宫指导老师赞叹不已，将你的作品评为区级科技小发明一等奖！",
        effect: {
          intelligence: 14,
          health: 4,
          happiness: 8,
          unlockAssetId: "diy_crystal_radio",
        },
      },
      {
        label: "把收音机带回大院，召集小伙伴们轮流戴耳机收听评书连播",
        hint: "分享快乐 · 孩子王风采",
        resultDesc: "大院里十几个孩子围着你轮流听《岳飞传》，大家惊奇地盯着这台不用插电的神奇小盒子，你成了名副其实的大院科技小明星！",
        effect: {
          charm: 12,
          happiness: 12,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 15,
          unlockAssetId: "diy_crystal_radio",
        },
      },
    ],
  },
  {
    id: "ms_age10_transformers_birthday",
    category: "milestone",
    minAge: 10,
    maxAge: 10,
    title: "🎂 十周岁少年礼与变形金刚模型",
    icon: "🤖",
    narrative: "十岁生日当天，家里张罗了长寿面与荷包蛋。饭后父亲神秘地拿出一个沉甸甸的大红纸盒——打开一看，竟然是上海引进发行的正版孩之宝变形金刚‘擎天柱’重卡模型！全楼孩子都投来了炽热渴望的目光！",
    options: [
      {
        label: "熟练背诵变形口诀，当众完成从重型卡车到汽车人领袖的变形",
        hint: "机巧灵动 · 童年巅峰（解锁老物件）",
        resultDesc: "咔嗒咔嗒的关节转动声伴随着汽车人经典的变形姿态，全场爆发出震耳欲聋的欢呼声！你成为了整条街最耀眼的存在！",
        effect: {
          happiness: 16,
          charm: 12,
          cash: -0.5,
          unlockAssetId: "transformers_optimus_prime",
        },
      },
      {
        label: "郑重将模型摆在书桌最上方，向父母保证以擎天柱为榜样刻苦自律",
        hint: "志存高远 · 懂事明理",
        resultDesc: "父母欣慰地相视一笑，擎天柱威严的目光每天注视着你认真完成作业，你的学业与心智愈发成熟坚定！",
        effect: {
          intelligence: 12,
          happiness: 10,
          affinityTarget: "father",
          affinityDelta: 16,
          unlockAssetId: "transformers_optimus_prime",
        },
      },
    ],
  },
  {
    id: "ms_age11_math_olympiad",
    category: "milestone",
    minAge: 11,
    maxAge: 11,
    title: "📐 全国小学华罗庚金杯数学邀请赛",
    icon: "🥇",
    narrative: "你代表学校参加全市‘华罗庚金杯’少年数学奥林匹克选拔赛。考场上最后一道数论与几何压轴大题难度极高，整间教室里绝大多数考生都在抓耳挠腮、冷汗直冒……",
    options: [
      {
        label: "沉着冷静在草稿纸上构造辅助线，运用逆向归纳法破题",
        hint: "神机妙算 · 奥数金牌（解锁老物件）",
        resultDesc: "思路如泉涌！你完美写出严丝合缝的解答步骤，以满分斩获全市特等奖，市重点中学招生老师当场递来保送邀请函！",
        effect: {
          intelligence: 16,
          charm: 8,
          happiness: 10,
          unlockAssetId: "hualuogeng_math_medal",
        },
      },
      {
        label: "稳扎稳打反复复查前置基础大题，确保基础分一分不丢",
        hint: "稳健从容 · 零失误一等奖",
        resultDesc: "凭借超强的心态和零失误的发挥，你稳稳拿下一等奖银牌，充分展现了坚实过硬的数理基本功！",
        effect: {
          intelligence: 12,
          health: 6,
          happiness: 8,
          unlockAssetId: "hualuogeng_math_medal",
        },
      },
    ],
  },
  {
    id: "ms_age12_primary_graduation_asian_games",
    category: "milestone",
    minAge: 12,
    maxAge: 12,
    title: "🎒 小学毕业升学大考与北京亚运会",
    icon: "🐼",
    narrative: "1990年盛夏，大街小巷都在播放刘欢与韦唯高亢激昂的《亚洲雄风》。你在小学毕业统一升学考试中金榜题名顺利考入市重点中学实验班，同时在迎亚运知识竞赛中斩获吉祥物熊猫‘盼盼’金质纪念章！",
    options: [
      {
        label: "在毕业同学录上郑重题写‘海阔凭鱼跃’，佩戴盼盼徽章跨入重点中学",
        hint: "壮志凌云 · 挥别童年（解锁老物件）",
        resultDesc: "戴着熊猫盼盼纪念章，你告别了朝夕相处六年的小学母校与老师，带着满满的自信与知识储备，大步迈入中学时代的崭新篇章！",
        effect: {
          intelligence: 14,
          charm: 12,
          happiness: 12,
          unlockAssetId: "asian_games_panpan_badge",
        },
      },
      {
        label: "召集全班同学在亚运会开幕式当晚齐聚收看彩电直播，为中国健儿呐喊",
        hint: "热血青春 · 铭刻时代",
        resultDesc: "电视机前大家挥舞着小国旗为中国健儿的夺冠热泪盈眶，大家相拥约定十年后再相聚，友情在时代浪潮中历久弥新！",
        effect: {
          happiness: 16,
          charm: 10,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 20,
          unlockAssetId: "asian_games_panpan_badge",
        },
      },
    ],
  },

  // ====================================================
  // 6. 少儿期日常通用生活事件 (General Recurring · 7~12岁)
  // ====================================================
  {
    id: "gen_bicycle_repair",
    category: "general",
    minAge: 7,
    maxAge: 12,
    title: "🚲 帮父亲在院子里给自行车补胎上链条油",
    icon: "🚲",
    narrative: "周末阳光洒满大院，父亲把家里顶梁柱一般的二八大杠自行车倒扣在水磨石空地上。车后胎被扎了小洞，链条也有些干涩作响。父亲递给你小油壶和螺丝刀，招呼你过来打下手……",
    options: [
      {
        label: "细致帮父亲用锉刀打磨内胎并点上机油",
        hint: "工巧手艺 · 父子默契",
        resultDesc: "你手拿小铁锉小心翼翼打磨内胎创口，涂上补胎胶水牢牢贴好生胶皮，又用长嘴油壶精准给链条滚轴点上润滑油。父亲赞不绝口，夸你颇有工匠天赋！",
        effect: {
          intelligence: 8,
          health: 5,
          affinityTarget: "father",
          affinityDelta: 8,
          happiness: 6,
        },
      },
      {
        label: "握住脚踏板飞速摇动，弄满手黑油放声大笑",
        hint: "天真活泼 · 欢乐童趣",
        resultDesc: "你卖力地摇转脚踏板让后轮呼呼飞转，飞溅的机油蹭得脸上和鼻尖像只小花猫。虽然弄脏了小背心，但整座大院都回荡着你快活的笑声。",
        effect: {
          happiness: 10,
          charm: 6,
          health: 4,
          affinityTarget: "father",
          affinityDelta: 4,
        },
      },
    ],
  },
  {
    id: "gen_soy_sauce_run",
    category: "general",
    minAge: 7,
    maxAge: 12,
    title: "🍶 拿着玻璃酱油瓶去国营门市部打酱油",
    icon: "🍶",
    narrative: "傍晚母亲做饭时发现酱油瓶空了，递给你一个洗干净的透明玻璃空瓶和一张五角纸币，叮嘱你去街口的国营副食门市部打半斤散装酱油……",
    options: [
      {
        label: "认真心算核对找零，把五分硬币分毫不差带回",
        hint: "严谨懂事 · 财商启蒙",
        resultDesc: "你在柜台前专注看着售货员阿姨用竹筒提子将酱油顺着铁皮漏斗灌入瓶中。你心算找零分毫不差，把找回的几枚铝分币完好交还给母亲，母亲夸你精明能干！",
        effect: {
          intelligence: 8,
          charm: 6,
          affinityTarget: "mother",
          affinityDelta: 8,
          cash: 0.05,
        },
      },
      {
        label: "嘴馋用找回的两分钱买了两颗酸梅糖含在嘴里",
        hint: "甜美诱惑 · 童年小确幸",
        resultDesc: "你抵挡不住玻璃柜台里大广口瓶的诱惑，用找零买了两颗酸梅糖。嘴里含着酸甜爆汁的硬糖一蹦一跳跑回家，并主动向母亲坦白，母亲笑着刮了刮你的鼻子。",
        effect: {
          happiness: 9,
          charm: 5,
          cash: -0.02,
          affinityTarget: "mother",
          affinityDelta: 4,
        },
      },
    ],
  },
  {
    id: "gen_summer_storytelling",
    category: "general",
    minAge: 7,
    maxAge: 12,
    title: "📻 夏夜大院乘凉听单田芳评书《三侠五义》",
    icon: "📻",
    narrative: "三伏夏夜，大院里竹床与藤椅排成长龙。老槐树下微风习习，摆在当中的红星半导体收音机正播送着单田芳先生经典的评书《三侠五义》，那沙哑浑厚的“且听下回分解”引人入胜……",
    options: [
      {
        label: "端坐小板凳聚精会神听书，脑补南侠英姿",
        hint: "文史熏陶 · 侠义情怀",
        resultDesc: "你听得如痴如醉，脑海中浮现出南侠展昭剑履生风、开封府包大人秉公断案的壮阔图景。你不仅记住了精彩桥段，还向小伙伴们生动转述，俨然成了大院小评书家！",
        effect: {
          intelligence: 9,
          charm: 7,
          happiness: 6,
        },
      },
      {
        label: "手握大芭蕉蒲扇，卖力帮长辈摇风驱赶蚊虫",
        hint: "孝顺贴心 · 邻里称赞",
        resultDesc: "你双手轮换摇动大蒲扇，给身旁闭目养神的父母和邻居爷爷扇去习习凉风。长辈们连连赞叹你懂事体贴，邻居奶奶还特意剥了一把炒花生塞进你的小兜里。",
        effect: {
          charm: 9,
          health: 5,
          affinityTarget: "mother",
          affinityDelta: 6,
          happiness: 7,
        },
      },
    ],
  },
  {
    id: "gen_green_bean_popsicle",
    category: "general",
    minAge: 7,
    maxAge: 12,
    title: "🍧 厨房小铝碗自制绿豆沙冰棍",
    icon: "🍧",
    narrative: "炎炎夏日，母亲在厨房煮好了一大锅绿豆沙甜汤。你突发奇想，找来几个盛饭用的小铝碗和洗净的雪糕木棒，准备做一回“家庭冷饮厂厂长”，自制原汁原味绿豆沙冰棍……",
    options: [
      {
        label: "调配白糖倒入铝碗，借隔壁雪花冰箱冷冻",
        hint: "动手实践 · 消暑至味",
        resultDesc: "你在碗底铺上厚厚的软烂绿豆沙，淋上白糖水，插上木棒端到隔壁李叔家新买的雪花牌单门冰箱里。几个小时后脱模咬上一口，清甜沙软、透心凉爽！",
        effect: {
          intelligence: 7,
          health: 6,
          happiness: 8,
        },
      },
      {
        label: "冰棍冻好脱模切块，大方分给满头大汗的小伙伴",
        hint: "慷慨分享 · 人气之王",
        resultDesc: "你将冻得硬邦邦的绿豆冰沙切成小块分装在搪瓷盘里端到院子里。正在跳皮筋的小伙伴们欢呼雀跃一拥而上，大家都称赞你是大院里最讲义气的大哥/大姐头！",
        effect: {
          charm: 10,
          happiness: 9,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 10,
        },
      },
    ],
  },
  {
    id: "gen_housework_cooking",
    category: "general",
    minAge: 7,
    maxAge: 12,
    title: "🍳 第一次学用大铁锅帮母亲煮荷包蛋面",
    icon: "🍳",
    narrative: "傍晚时分，母亲在厂里加班尚未归家。肚子咕咕叫的你踩上小木凳，系上蓝布围裙，决定在沉重的大铁锅前大显身手，给疲惫的母亲煮一碗热气腾腾的葱油荷包蛋挂面……",
    options: [
      {
        label: "掌握火候热油炝葱花，精准慢煨溏心荷包蛋",
        hint: "烹饪巧手 · 独立生活",
        resultDesc: "你学着母亲平时的手法，用一点猪油爆香葱花，打入新鲜鸡蛋煨成白嫩完整的荷包蛋，再下入一把银丝挂面。面条劲道汤底清亮，厨艺潜能悄然觉醒！",
        effect: {
          intelligence: 8,
          health: 6,
          happiness: 7,
          affinityTarget: "mother",
          affinityDelta: 8,
        },
      },
      {
        label: "面条虽略微坨了，但热腾腾的心意逗得母亲热泪盈眶",
        hint: "温暖反哺 · 亲情浓郁",
        resultDesc: "虽然手忙脚乱把面汤煮得稍有些浓稠，但当你端着满满一大碗热面递给拖着疲惫身躯推门而入的母亲时，母亲激动得一把将你搂入怀中，直夸孩子真正长大了！",
        effect: {
          charm: 8,
          happiness: 10,
          affinityTarget: "mother",
          affinityDelta: 12,
        },
      },
    ],
  },

  // ====================================================
  // 7. 少儿期突发社交与童年游戏事件 (Emergent · 7~12岁)
  // ====================================================
  {
    id: "em_gameboy_contra",
    category: "emergent",
    minAge: 7,
    maxAge: 12,
    title: "🎮 王小军家悄悄玩小霸王红白机《魂斗罗》",
    icon: "🕹️",
    narrative: "周六下午王小军趁父母去工厂车间加班，神秘兮兮地把你拉进他家，悄悄把红白机接在大屁股黑白电视上。两人紧握着十字键手柄，电视屏幕闪烁着动感热血的《魂斗罗》八位机开场电子乐……",
    options: [
      {
        label: "熟练按出“上上下下左右左右BA”调出30条命",
        hint: "秘籍速通 · 八位机高手",
        resultDesc: "“借命！借命！”三十条命到手，你一路S弹扫射横推八大关卡直捣红鹰老巢！小军敬佩得五体投地，主动把珍藏的卡带塞进你的书包借你畅玩！",
        effect: {
          intelligence: 10,
          happiness: 10,
          charm: 6,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 15,
          unlockAssetId: "contra_fc_cartridge",
        },
      },
      {
        label: "专注掩护与让出最强S弹，协助发小合力通关",
        hint: "兄弟情深 · 黄金搭档",
        resultDesc: "你舍身挡弹、主动让出威力最强的扩散S弹，两人步步为营攻克最终关！小军激动地与你击掌欢呼，并把珍贵的合体卡带送给你留念！",
        effect: {
          charm: 10,
          happiness: 10,
          intelligence: 6,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 20,
          unlockAssetId: "contra_fc_cartridge",
        },
      },
    ],
  },
  {
    id: "em_shuihu_cards",
    category: "emergent",
    minAge: 7,
    maxAge: 12,
    title: "🃏 小卖部买干脆面集水浒一百单八将卡",
    icon: "🎴",
    narrative: "校门口小卖部最新进了一批附赠水浒英雄卡的干脆面，全校掀起集卡狂潮。你用攒下的零花钱买了两包，撕开包装金光一闪——竟开出全校罕见的烫金闪卡【天雄星·豹子头林冲】！全班同学瞬间沸腾将你团团围住……",
    options: [
      {
        label: "大方与发小/同桌交换，互通有无凑齐天罡星卡组",
        hint: "豪爽仗义 · 社交核心",
        resultDesc: "你大方地拿重复卡与林冲闪卡跟同伴互换，帮发小补全了阵容。大家纷纷佩服你为人仗义，你在大院和班里一跃成为最受欢迎的孩子王！",
        effect: {
          charm: 12,
          happiness: 8,
          intelligence: 6,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 18,
        },
      },
      {
        label: "小心翼翼塑封收进集卡册，冲击全套大满贯",
        hint: "典藏荣耀 · 完美集卡",
        resultDesc: "你细心地用透明塑料膜封装好闪卡，整齐插进厚厚的集卡册中，终于集齐了整套一百单八将！翻开卡册金光熠熠，成为大院里唯一的集卡传说！",
        effect: {
          intelligence: 10,
          happiness: 12,
          charm: 8,
          unlockAssetId: "shuihu_cards_album",
        },
      },
    ],
  },
  {
    id: "em_slingshot_contest",
    category: "emergent",
    minAge: 7,
    maxAge: 12,
    title: "🎯 大院自制弹弓打泥丸靶心比赛",
    icon: "🏹",
    narrative: "厂区后面的老槐树林里，大院孩子们用老树丫、自行车废内胎和旧皮鞋舌做成了各式强力弹弓，在斑驳红砖墙上用粉笔画上同心圆靶心，举办了一场百步穿杨的弹弓争霸赛……",
    options: [
      {
        label: "屏息凝神三点一线，拉满皮筋正中十环靶心夺冠",
        hint: "百步穿杨 · 技压全场",
        resultDesc: "啪的一声清脆爆响，黄泥丸正中粉笔红心化为粉末！全场爆发出雷鸣般的喝彩，大家心服口服地把自制弹弓王冠与木丫神弓赠予了你！",
        effect: {
          health: 8,
          intelligence: 8,
          charm: 10,
          happiness: 8,
          unlockAssetId: "handmade_slingshot",
        },
      },
      {
        label: "调配细黄泥与棉絮，帮大家揉捏结实圆润的竞赛泥丸",
        hint: "工巧精研 · 靠谱后勤",
        resultDesc: "你搓出的泥丸圆润瓷实、风阻极小，参赛伙伴们争相向你讨要弹药，纷纷夸赞你是大院里最不可或缺的后勤军师！",
        effect: {
          intelligence: 10,
          charm: 8,
          happiness: 6,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 15,
        },
      },
    ],
  },
  {
    id: "em_crayfish_secret_base",
    category: "emergent",
    minAge: 7,
    maxAge: 12,
    title: "🦞 厂后小水沟秘密基地钓小龙虾与捉泥鳅",
    icon: "🎣",
    narrative: "初夏周末放学，你和小伙伴们带着棉线、肥肉诱饵和白铁桶，溜到机床厂后排洪沟的秘密基地。清澈的水草丛中，一只只挥舞着威风大钳的红亮小龙虾正悄悄探头探脑……",
    options: [
      {
        label: "手稳心细精准提线，手脚麻利钓满整整一大白铁桶",
        hint: "满载而归 · 丰盛野趣",
        resultDesc: "你凭借敏锐的手感连连提钩，白铁桶里挤满了张牙舞爪的小龙虾！傍晚带回家，母亲做了一大盆油亮喷香的红烧小龙虾，全家赞不绝口！",
        effect: {
          health: 10,
          happiness: 10,
          intelligence: 6,
          unlockAssetId: "crayfish_bucket_set",
        },
      },
      {
        label: "用红砖与碎石引水筑坝，搭建水下秘密生态观察池",
        hint: "工巧建造 · 秘密乐园",
        resultDesc: "你带领小伙伴们搭出了清澈见底的砖石微缩水族箱，大家蹲在水边观察泥鳅钻泥、龙虾筑巢，度过了一个充满奇思妙想的欢畅午后！",
        effect: {
          intelligence: 10,
          charm: 8,
          happiness: 8,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 15,
        },
      },
    ],
  },
  {
    id: "em_street_fighter_arcade",
    category: "emergent",
    minAge: 7,
    maxAge: 12,
    title: "🕹️ 县工人文化宫街机厅围观《街头霸王》",
    icon: "🥊",
    narrative: "县工人文化宫侧门新开了一家街机游戏厅，昏暗大厅里回荡着激昂热烈的投币音效和“阿道根”的发波呐喊。最火爆的《街头霸王》彩电大机台前被大院孩童和青年工人们围得水泄不通……",
    options: [
      {
        label: "看准时机投下一枚珍贵铜币，行云流水搓招一币通关",
        hint: "手法超群 · 街机战神",
        resultDesc: "“KO！”随着隆的一记升龙拳凌空击倒终极BOSS维加，整个街机厅爆发出震耳欲聋的喝彩声！你成了文化宫公认的“街机小神童”，老玩家们连连称奇！",
        effect: {
          intelligence: 12,
          charm: 12,
          happiness: 10,
          unlockAssetId: "arcade_bronze_token",
        },
      },
      {
        label: "踩在高木凳上激情解说局势，为主力伙伴大声叫好助威",
        hint: "气氛担当 · 社交明星",
        resultDesc: "你的呐喊助威点燃了全场士气，对战的发小在绝境中反杀强敌！打完后发小激动地塞给你一枚带飞鹰图案的老铜币，拉你一起并肩再战一局！",
        effect: {
          charm: 10,
          happiness: 8,
          cash: 0.2,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 16,
        },
      },
    ],
  },

  // ====================================================
  // 8. 少儿期意外与生活风险事件 (Accident · 7~12岁)
  // ====================================================
  {
    id: "acc_comic_caught_in_class",
    category: "accident",
    minAge: 7,
    maxAge: 12,
    title: "📖 上课偷看《七龙珠》连环画被班主任没收",
    icon: "📚",
    narrative: "自习课上，你把刚借来的《七龙珠》小人书悄悄垫在厚厚的语文课本下，正沉迷于天下第一武道会的激烈战斗中，后门窗边班主任李老师威严的目光已悄然注视你多时。随着课桌被轻轻叩响，连环画被当场收走，全班瞬间鸦雀无声……",
    options: [
      {
        label: "诚恳起立认错深刻反思，保证期末考全班第一把书赎回",
        hint: "知耻后勇 · 冲刺第一",
        resultDesc: "你红着脸向老师鞠躬认错，从此课上聚精会神、发奋苦读，期末果然斩获算术语文双百，老师欣慰地在评语本上写下赞扬并归还了连环画！",
        effect: {
          intelligence: 8,
          charm: 6,
          happiness: 5,
          unlockAssetId: "dragon_ball_comic_vol1",
        },
      },
      {
        label: "委婉向老师解释是自习课借阅，承诺写一份诚恳千字深刻检查",
        hint: "深刻检查 · 文采斐然",
        resultDesc: "你挑灯夜战写下一篇条理清晰、情真意切的千字检讨《论自律与课外读物之辩》，李老师阅后忍俊不禁，更赞赏你的文字功底与诚实担当！",
        effect: {
          intelligence: 6,
          charm: 8,
          happiness: 4,
          unlockAssetId: "inspect_self_criticism_note",
        },
      },
    ],
  },
  {
    id: "acc_bike_chain_rainstorm",
    category: "accident",
    minAge: 8,
    maxAge: 12,
    title: "🌧️ 放学突降暴雨自行车掉链条",
    icon: "🚲",
    narrative: "放学铃声刚响，天边骤然乌云密布，倾盆暴雨倾泻而下。你正奋力蹬着加重自行车往家赶，路过泥泞的大院水坑时“咔哒”一声脆响，链条从后飞轮上脱轨卡死在齿缝间，冰冷的雨水瞬间打湿了衣襟……",
    options: [
      {
        label: "冒雨蹲在供销社屋檐下，顶着黑油污渍熟练把链条归位",
        hint: "熟练动手 · 顶风冒雨",
        resultDesc: "你从书包摸出一截枯树枝，顶着一手乌黑的机油熟练转动脚踏挂链归位，踩着水花风雨无阻平安冲回家中，动手能力大获夸奖！",
        effect: {
          health: 7,
          intelligence: 7,
          happiness: 4,
          unlockAssetId: "oilskin_umbrella_and_rag",
        },
      },
      {
        label: "推着车与同路发小共撑一把黄色油布大伞，踩着水坑边走边笑",
        hint: "风雨同舟 · 纯真情谊",
        resultDesc: "发小赶忙撑开宽大的老油布伞替你遮雨，两人推着车踩着水洼一路欢声笑语，暴雨天的大院林荫道成了童年最温暖动人的画卷。",
        effect: {
          happiness: 8,
          charm: 6,
          health: 5,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 10,
        },
      },
    ],
  },
  {
    id: "acc_rubber_band_dispute",
    category: "accident",
    minAge: 7,
    maxAge: 11,
    title: "🤸 课间跳橡皮筋引发的规则小争执",
    icon: "🎀",
    narrative: "课间十分钟，红砖操场上拉起了长长的牛皮筋，两拨小伙伴玩到了最刺激的“齐腰高难度关卡”。然而因一次落地究竟是“踩线压死”还是“过关”，双方争得面红耳赤，眼看马上就要上课了……",
    options: [
      {
        label: "主动站出来当公正小裁判，用红领巾重新丈量标准高度化解矛盾",
        hint: "公正决断 · 领袖魅力",
        resultDesc: "你拿出红领巾精准标定高度，客观公正重新判定并制定了大家信服的统一规则，争执烟消云散，你被大伙推举为全班文体总裁判！",
        effect: {
          intelligence: 7,
          charm: 8,
          happiness: 5,
          unlockAssetId: "colorful_rubber_band_loop",
        },
      },
      {
        label: "自告奋勇下场示范高难度的“马莲开花”绝技压轴跳法镇住全场",
        hint: "身手矫健 · 惊艳四座",
        resultDesc: "你腾空跃起，脚尖轻盈勾带翻飞，一气呵成完成了腋下高度的绝技动作，潇洒落地赢得满场雷鸣般的欢呼与喝彩！",
        effect: {
          health: 8,
          charm: 7,
          happiness: 7,
        },
      },
    ],
  },
  {
    id: "acc_river_swimming_scolded",
    category: "accident",
    minAge: 8,
    maxAge: 12,
    title: "🏊 酷暑擅自跟伙伴下河野泳被抓现行",
    icon: "🌊",
    narrative: "盛夏午后知了声声，耐不住酷暑的你与几个要好的小伙伴偷偷溜到大院后河野塘戏水打水仗。正玩得兴高采烈时，岸边树荫下突然传来父亲威严的呵斥声与巡防联防队员的哨声……",
    options: [
      {
        label: "老老实实低头挨训，诚恳向父母写下《防溺水安全保证书》",
        hint: "安全第一 · 敬畏生命",
        resultDesc: "你深刻意识到私自下水的巨大危险，回家主动工工整整写下安全守则贴在墙上，父母既心疼又欣慰地递来了一牙冰镇甜西瓜。",
        effect: {
          intelligence: 6,
          health: 6,
          affinityTarget: "father",
          affinityDelta: 8,
          unlockAssetId: "safety_pledge_certificate",
        },
      },
      {
        label: "挺起胸膛帮年幼的同伴承担带头责任，主动背锅展现义气",
        hint: "仗义担当 · 伙伴敬仰",
        resultDesc: "你一人扛下了被责罚的差事，虽然回家被罚抄了三遍守则，但小伙伴们从此视你为大院最靠谱、最有义气的大哥/大姐！",
        effect: {
          charm: 9,
          happiness: 6,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 12,
        },
      },
    ],
  },
  {
    id: "acc_exam_careless_parent_call",
    category: "accident",
    minAge: 7,
    maxAge: 12,
    title: "📝 期中算术考试粗心漏做一道大题被请家长",
    icon: "✏️",
    narrative: "期中算术考试放榜，本以为能拿满分的你，却因交卷匆忙漏看了试卷背面分值高达20分的综合应用大题！班主任不仅在试卷上批了醒目的大红问号，还通知放学请家长到办公室沟通谈心……",
    options: [
      {
        label: "回家主动向父母坦承粗心失误，拿出自制错题集工整订正重做",
        hint: "诚实自觉 · 查漏补缺",
        resultDesc: "面对你的诚实与严谨工整的错题反思本，父母没有严加责备，反而温和鼓励你“胜不骄败不馁”，亲子沟通变得更加深厚融洽。",
        effect: {
          intelligence: 9,
          charm: 6,
          affinityTarget: "mother",
          affinityDelta: 8,
          unlockAssetId: "handwritten_mistake_notebook",
        },
      },
      {
        label: "虚心接受老师与父母的联合教导，制定作息表与强化复习计划",
        hint: "虚心受教 · 科学自律",
        resultDesc: "你在书桌前贴上了每日作息时间表，克服粗心毛病，每日坚持打草稿验算，在后续的学期统考中稳居年级榜首！",
        effect: {
          intelligence: 8,
          health: 5,
          happiness: 6,
        },
      },
    ],
  },

  // ====================================================
  // 9. 青年期里程碑事件 (Milestone Events · 13~18岁)
  // ====================================================
  {
    id: "ms_age13_youth_league_oath",
    category: "milestone",
    minAge: 13,
    maxAge: 13,
    title: "🎖️ 共产主义青年团入团宣誓",
    icon: "🎖️",
    narrative: "初一下学期五四青年节，学校礼堂举行庄严的入团仪式。作为初一年级第一批光荣加入中国共产主义青年团的先进少年，你佩戴着闪闪发光的团徽，站在鲜艳的团旗下举起右拳，心潮澎湃！",
    options: [
      {
        label: "庄严领誓共青团誓词，宣读青年先锋倡议书",
        hint: "品学兼优 · 青年先锋（解锁老物件）",
        resultDesc: "你的领誓铿锵有力、字字千钧！校团委书记当场提议由你担任初一年级团支部书记，全校师生投来由衷钦佩的目光！",
        effect: {
          intelligence: 10,
          charm: 12,
          happiness: 10,
          unlockAssetId: "communist_youth_league_badge",
        },
      },
      {
        label: "将崭新的团员证与团徽带回家，郑重递给长辈端详分享喜悦",
        hint: "薪火相传 · 门楣生辉",
        resultDesc: "长辈颤抖着双手抚摸着金光闪闪的团徽，眼角泛光连夸‘好孩子，有出息！’，并从抽屉里拿出珍藏的钢笔作为奖赏！",
        effect: {
          happiness: 14,
          charm: 8,
          affinityTarget: "father",
          affinityDelta: 20,
          unlockAssetId: "communist_youth_league_badge",
        },
      },
    ],
  },
  {
    id: "ms_age14_aiwa_walkman_english",
    category: "milestone",
    minAge: 14,
    maxAge: 14,
    title: "📻 英语听力测试与爱华随身听",
    icon: "📻",
    narrative: "1992年人教版初中英语教材（李雷与韩梅梅、Polly鹦鹉）全面普及，期末首次引入全省统一英语听力测试。为了攻克听力难关，父母咬牙为你购置了一台原装爱华（AIWA）双卡磁带随身听！",
    options: [
      {
        label: "晨昏反复精听英语磁带，做满两厚本跟读与纠错笔记",
        hint: "苦练听说 · 满分折桂（解锁老物件）",
        resultDesc: "在全省期末统一听力测试中，你以无可挑剔的满分斩获全校第一名，英语教研组长将你的学习笔记作为全校模范传阅！",
        effect: {
          intelligence: 14,
          charm: 6,
          happiness: 10,
          unlockAssetId: "aiwa_walkman_cassette",
        },
      },
      {
        label: "学完听力后悄悄换上小虎队与四大天王流行磁带，与好友共享耳机",
        hint: "潮流先锋 · 青春悸动",
        resultDesc: "“对你爱不完”的动感旋律在海绵耳机里回荡，你成为班里最懂流行音乐的时髦焦点，同窗好友对你崇拜不已！",
        effect: {
          charm: 14,
          happiness: 16,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 18,
          unlockAssetId: "aiwa_walkman_cassette",
        },
      },
    ],
  },
  {
    id: "ms_age15_senior_high_entrance_exam",
    category: "milestone",
    minAge: 15,
    maxAge: 15,
    title: "🎯 初中毕业中考分流与省重点高中录取",
    icon: "🎯",
    narrative: "1993年盛夏，被称为‘人生第一道分水岭’的初升高统考（中考）放榜！大批考生面临中专包分配、职高就业与省重点普通高中的残酷分流，全家焦急守候在电话查分机旁……",
    options: [
      {
        label: "以全区前五名绝对高分被省重点高中理科实验班尖子批次录取",
        hint: "学霸登顶 · 问鼎名校（解锁老物件）",
        resultDesc: "省重点高中的大红烫金喜报与红校徽送到家门，父母在筒子楼走廊里摆了谢师宴，邻里赞不绝口，你正式踏上名校快车道！",
        effect: {
          intelligence: 18,
          charm: 12,
          happiness: 14,
          unlockAssetId: "key_high_school_admission",
        },
      },
      {
        label: "全面权衡文理特长与顶尖师资，以第一志愿稳妥入读老牌省重点",
        hint: "从容笃定 · 全面发展",
        resultDesc: "你以过硬的综合素质昂首跨入省重点高中，文理综合底子扎实，各科骨干教师纷纷看好你在高中阶段的巨大潜力！",
        effect: {
          intelligence: 15,
          health: 6,
          happiness: 12,
          unlockAssetId: "key_high_school_admission",
        },
      },
    ],
  },
  {
    id: "ms_age16_military_training_parade",
    category: "milestone",
    minAge: 16,
    maxAge: 16,
    title: "🪖 高一开学全封闭军训结业大阅兵",
    icon: "🪖",
    narrative: "进入省重点高中的第一课，是前往部队驻地进行为期两周的封闭式军事训练。烈日炙烤的水泥操场上，站军姿、踢正步、叠豆腐块被子、夜间拉练，淬炼着高一新生的坚毅意志与体魄！",
    options: [
      {
        label: "烈日下纹丝不动咬牙坚持，以标准军姿担任分列式阅兵领队",
        hint: "铁血军魂 · 标兵风采（解锁老物件）",
        resultDesc: "“一二一！向右看——！”你口令洪亮、步履如磐，带领方阵斩获全校阅兵第一，部队教官与校长亲自为你颁发‘优秀标兵’！",
        effect: {
          health: 16,
          charm: 12,
          happiness: 10,
          unlockAssetId: "military_training_flask_cert",
        },
      },
      {
        label: "主动担任排头兵并照料中暑同窗，拉歌环节带领全连唱响军歌",
        hint: "团结友爱 · 众望所归",
        resultDesc: "你的热忱与担当赢得了教官和全班同学的敬重，军训晚会上大家将你高高抛起，你以全票当选高一新学期班长！",
        effect: {
          charm: 16,
          health: 12,
          happiness: 14,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 20,
          unlockAssetId: "military_training_flask_cert",
        },
      },
    ],
  },
  {
    id: "ms_age17_subject_stream_olympiad",
    category: "milestone",
    minAge: 17,
    maxAge: 17,
    title: "📚 高二文理分科与全国数理化竞赛",
    icon: "📚",
    narrative: "高二学年文理分科尘埃落定，全国高中数学、物理、化学奥林匹克联赛在金秋拉开帷幕。晚自习的白炽灯下堆满了《五年高考三年模拟》与黄冈密卷，你迎来了高中最具分量的学术攻坚！",
    options: [
      {
        label: "主攻全国数理化奥赛，在省级复赛中攻破压轴大题勇夺一等奖",
        hint: "奥赛折桂 · 锁定保送（解锁老物件）",
        resultDesc: "你以精妙严谨的逻辑破开奥赛压轴大题，斩获全国一等奖（省赛区第一名），顶尖名校招生组当即进驻学校发出保送意向！",
        effect: {
          intelligence: 20,
          charm: 10,
          happiness: 14,
          unlockAssetId: "olympiad_gold_fountain_pen",
        },
      },
      {
        label: "坚持文理各科齐头并进，在期末省重点七校大联考中夺得全校总分第一",
        hint: "全科领跑 · 六边形学霸",
        resultDesc: "没有任何偏科短板！你的各科总分遥遥领先全校群雄，光荣榜榜首赫然写着你的名字，被全校公认为来年高考夺魁热门！",
        effect: {
          intelligence: 18,
          health: 6,
          charm: 12,
          happiness: 12,
          unlockAssetId: "olympiad_gold_fountain_pen",
        },
      },
    ],
  },
  {
    id: "ms_age18_national_gaokao_climax",
    category: "milestone",
    minAge: 18,
    maxAge: 18,
    title: "🎓 决战七月 · 全国普通高校统一招生高考大考",
    icon: "🎓",
    narrative: "1996年7月7日清晨，炎炎夏日蝉鸣阵阵，全国数百万学子迈入高考考场。考场外满是焦急守候的父母与送考老师，考场内笔尖沙沙作响，十二年寒窗苦读在此一战！",
    options: [
      {
        label: "沉着冷静应对压轴综合大题与作文，以顶尖总分斩获全国名校录取",
        hint: "金榜题名 · 问鼎名校（解锁老物件）",
        resultDesc: "高考放榜！你以远超重点线数十分的傲人成绩被国家顶尖名牌大学第一志愿录取！邮递员骑着自行车送来大红喜报，全家沸腾！",
        effect: {
          intelligence: 22,
          charm: 16,
          happiness: 20,
          unlockAssetId: "university_admission_notice",
        },
      },
      {
        label: "精细填涂2B机读卡，以绝对稳健的发挥考入一本重点大学王牌专业",
        hint: "稳扎稳打 · 前程似锦（解锁老物件）",
        resultDesc: "你的考分与志愿完美契合，稳稳录入国家重点大学最具前景的热门王牌专业，正式开启了弄潮时代的崭新大学生涯！",
        effect: {
          intelligence: 18,
          health: 8,
          charm: 14,
          happiness: 18,
          unlockAssetId: "university_admission_notice",
        },
      },
    ],
  },
  {
    id: "ms_age19_university_enlistment_hk_return",
    category: "milestone",
    minAge: 19,
    maxAge: 19,
    title: "🇭🇰 大一军训蜕变与全校守候香港回归祖国交接仪式",
    icon: "🇭🇰",
    narrative: "1997年盛夏，你背着行囊踏入大学校门，在烈日军训下拉歌走分列式。7月1日零点，全校数千师生齐聚大礼堂，屏息凝神仰望大彩电直播——当五星红旗在香港会展中心伴着雄壮国歌冉冉升起时，全场掌声雷动、热泪盈眶！",
    options: [
      {
        label: "在礼堂前排领唱《东方之珠》与《义勇军进行曲》，激昂见证世纪时刻",
        hint: "百年圆梦 · 赤子之心（解锁老物件）",
        resultDesc: "你的领唱引发全校师生排山倒海般的合唱狂潮，百年国耻一朝洗雪的澎湃自豪感深深烙印在心中，成为你大学奋发图强的最强精神坐标！",
        effect: {
          charm: 18,
          happiness: 18,
          intelligence: 12,
          unlockAssetId: "hk_return_commemorative_medal",
        },
      },
      {
        label: "军训中严于律己斩获“优秀军训学员”标兵称号，为大学四年打下硬核体魄",
        hint: "百炼成钢 · 严谨笃定（解锁老物件）",
        resultDesc: "你在正步踢腿与烈日站军姿中展现了顽强刚毅的作风，作为标兵代表上台受奖，迅速在全系树立了卓越的领袖声望！",
        effect: {
          health: 18,
          charm: 14,
          happiness: 14,
          intelligence: 10,
          unlockAssetId: "hk_return_commemorative_medal",
        },
      },
    ],
  },
  {
    id: "ms_age20_campus_internet_and_flood_relief",
    category: "milestone",
    minAge: 20,
    maxAge: 20,
    title: "🌊 98抗洪青年志愿救灾突击队与高校网络BBS启蒙",
    icon: "🌊",
    narrative: "1998年夏，长江松花江特大洪灾牵动全国人民的心。你毫不犹豫报名加入高校青年志愿救灾突击队，在车站通宵搬运救灾编织袋与急救药品；与此同时，高校校园网BBS（水木清华、未名湖畔）悄然开通，第一批网络电子论坛连接起全国高校学子！",
    options: [
      {
        label: "赴抗洪救灾一线通宵装运救灾物资并组织义捐义演，荣获荣誉绶带",
        hint: "万众一心 · 青年担当（解锁老物件）",
        resultDesc: "你连续奋战三昼夜搬运数吨急需药品与帐篷，组织校内义卖为灾区同胞筹集数万元善款，省市红十字会特发红绸荣誉绶带与感谢信！",
        effect: {
          charm: 20,
          health: 10,
          happiness: 16,
          intelligence: 8,
          unlockAssetId: "flood_relief_volunteer_ribbon",
        },
      },
      {
        label: "在高校BBS网络论坛担任首届版主，利用互联网搭建全国高校赈灾信息站",
        hint: "网络先驱 · 智识领航",
        resultDesc: "你用拨号调制解调器连接校园网服务器，在BBS上搭建了高效的灾区物资对接专版，展现了惊人的互联网思维与组织协调力！",
        effect: {
          intelligence: 18,
          charm: 16,
          happiness: 14,
          unlockAssetId: "flood_relief_volunteer_ribbon",
        },
      },
    ],
  },
  {
    id: "ms_age21_millennium_countdown_and_time_capsule",
    category: "milestone",
    minAge: 21,
    maxAge: 21,
    title: "🎆 迎千禧跨世纪狂欢夜 · 封存新世纪愿望时间胶囊",
    icon: "🎆",
    narrative: "1999年12月31日深夜，世纪之交的千禧钟声即将敲响！建国50周年大阅兵的威武震撼与澳门回归的《七子之歌》犹在耳畔，校园主干道上彩灯高挂、欢声笑语。你与挚友们手捧不锈钢时间胶囊，庄重写下对21世纪的宏伟人生规划与时代誓言……",
    options: [
      {
        label: "写下“做新世纪开拓者与栋梁之材”的庄严誓言，封存千禧时间胶囊",
        hint: "世纪豪情 · 志存高远（解锁老物件）",
        resultDesc: "在全场“5、4、3、2、1！新年快乐！”的千禧倒计时呐喊与漫天礼花中，你将时间胶囊深埋在世纪纪念树下，内心激荡着无与伦比的弄潮雄心！",
        effect: {
          intelligence: 18,
          charm: 18,
          happiness: 22,
          unlockAssetId: "millennium_time_capsule",
        },
      },
      {
        label: "千禧晚会上登台表演世纪畅想诗朗诵，赢得全场起立喝彩掌声",
        hint: "风采绝伦 · 时代之声（解锁老物件）",
        resultDesc: "你的朗诵声情并茂、气势磅礴，道出了青年一代迎接21世纪信息时代的昂扬斗志，掌声经久不息，你成为新世纪校园最具魅力的风云人物！",
        effect: {
          charm: 22,
          happiness: 18,
          intelligence: 12,
          unlockAssetId: "millennium_time_capsule",
        },
      },
    ],
  },
  {
    id: "ms_age22_graduation_thesis_and_job_offer",
    category: "milestone",
    minAge: 22,
    maxAge: 22,
    title: "🎓 本科毕业设计答辩折桂 · 世纪之交校招签约",
    icon: "📜",
    narrative: "2000年盛夏千禧毕业季！学术报告厅内，你身着白衬衫面对评审教授团从容展示毕业设计论文；几天后，高校大型毕业生供需双选会上人山人海，中关村高新技术企业、大型骨干国企与跨国名企纷纷向前排优秀毕业生递出橄榄枝！",
    options: [
      {
        label: "毕业答辩斩获全系唯一“特优毕业论文”，顺利签约行业领军单位",
        hint: "学业登顶 · 签约名企（解锁老物件）",
        resultDesc: "评委专家一致起立鼓掌，你的论文被推选为省级优秀学士学位论文！行业头部企业当场以顶格薪资向你递上三方签约协议与大红录取函！",
        effect: {
          intelligence: 24,
          charm: 18,
          happiness: 20,
          unlockAssetId: "bachelor_degree_and_gown",
        },
      },
      {
        label: "身披红黑学士服在图书馆前高高抛起学士帽，与恩师同窗合影定格风华",
        hint: "桃李天下 · 青春无悔（解锁老物件）",
        resultDesc: "快门按下的瞬间，红黑学士帽在蓝天下定格。四年同窗情谊化作相视一笑的泪水与拥抱，你怀揣沉甸甸的学位证书正式迈向广阔社会！",
        effect: {
          charm: 20,
          happiness: 22,
          intelligence: 16,
          unlockAssetId: "bachelor_degree_and_gown",
        },
      },
    ],
  },
  {
    id: "ms_age23_first_work_contract_and_wto_entry",
    category: "milestone",
    minAge: 23,
    maxAge: 23,
    title: "💼 转正签约首份正式合同 · 见证中国加入WTO与申奥成功",
    icon: "💼",
    narrative: "2001年，你顺利通过试用期拿到正式转正工卡，领到人生第一份可观的转正薪资！这注定是载入史册的辉煌一年：7月13日萨马兰奇宣布北京当选2008奥运会主办城市，11月中国正式签署加入世界贸易组织（WTO）议定书，世界舞台全面向中国敞开！",
    options: [
      {
        label: "用第一份薪水给辛劳半生的父母购买名牌全钢手表与大衣，感恩孝道",
        hint: "孝悌立身 · 尽享天伦（解锁老物件）",
        resultDesc: "当你把包装精美的上海牌手表戴在父亲微颤的手腕上时，父亲眼泛泪光、母亲欣慰抚摸着大衣，全家沉浸在孩子自立成材的无限幸福中！",
        effect: {
          charm: 20,
          happiness: 24,
          intelligence: 12,
          affinityTarget: "father",
          affinityDelta: 25,
          unlockAssetId: "first_salary_shanghai_watch",
        },
      },
      {
        label: "签署首份正式劳动合同书，与同事通宵走上天安门广场欢庆入世申奥",
        hint: "职场自立 · 举国同庆（解锁老物件）",
        resultDesc: "工号牌在胸前熠熠生辉！深夜与万千市民在广场上挥舞国旗狂欢高呼‘中国万岁’，你深刻感知到个人命运与国家腾飞的紧密脉动！",
        effect: {
          intelligence: 16,
          charm: 18,
          happiness: 22,
          cash: 500,
          unlockAssetId: "first_job_contract_and_badge",
        },
      },
    ],
  },
  {
    id: "ms_age24_lead_work_project_and_independent_renting",
    category: "milestone",
    minAge: 24,
    maxAge: 24,
    title: "🔑 职场独立担纲重大业务项目 · 租下人生第一套独立单身公寓",
    icon: "🔑",
    narrative: "2002年，入职一年的你在单位崭露头角，领导破格任命你为年度关键业务项目负责人，主持跨部门技术/市场攻坚；与此同时，你退掉了单位集体宿舍的上下铺，在市区租下了一套洒满阳光的带阳台单身公寓，开启完全独立的生活！",
    options: [
      {
        label: "量身定制正装西服主持项目誓师会，带领团队超额交付惊艳全公司",
        hint: "独当一面 · 职场骨干（解锁老物件）",
        resultDesc: "你在发布会上沉稳大气的控场与精益求精的方案征服了全体高管与客户，项目大获全胜，年底获评公司卓越骨干并获丰厚绩效奖金！",
        effect: {
          charm: 22,
          intelligence: 20,
          happiness: 18,
          cash: 1000,
          unlockAssetId: "first_wool_business_suit",
        },
      },
      {
        label: "转动黄铜钥匙推开属于自己的独立新居，在阳台亲手装点绿植与书桌",
        hint: "成家立业 · 独立天地（解锁老物件）",
        resultDesc: "暖黄色的落地灯亮起，听着CD机里的音乐在属于自己的书桌前静静夜读，你体会到了自立自强带来的踏实与尊严，人生翻开成熟新篇！",
        effect: {
          happiness: 24,
          health: 12,
          charm: 16,
          intelligence: 10,
          unlockAssetId: "first_apartment_brass_key",
        },
      },
    ],
  },

  // ====================================================
  // 10. 青年期日常通用生活事件 (General · 13~18岁)
  // ====================================================
  {
    id: "gen_cassette_mixtape",
    category: "general",
    minAge: 13,
    maxAge: 18,
    title: "📼 磁带随身听与翻录港台流行金曲",
    icon: "🎧",
    narrative:
      "90年代初，你攒下零花钱买来爱华磁带随身听。塑料盒里夹着手抄的歌词本，广播电台里正播放着张学友的《吻别》和小虎队的《爱》。你握着双卡录音机的翻录键，正盘算着今晚这盘TDK空白磁带该录些什么……",
    options: [
      {
        label: "按住REC双卡翻录港台金曲，跟着旋律轻声哼唱",
        hint: "流行风潮 · 魅力心境",
        resultDesc:
          "你小心翼翼用铅笔倒带，手抄本上抄满了歌词。随身听里流淌的旋律抚平了求学的疲惫，你成了班级里最懂流行音乐的时髦同学！",
        effect: {
          charm: 8,
          happiness: 10,
          intelligence: 2,
          unlockAssetId: "walkman_cassette_tape",
        },
      },
      {
        label: "塞进人教版初高中英语听力磁带，跟着疯狂大声朗诵",
        hint: "勤学苦读 · 听说提升",
        resultDesc:
          "A、B面反复倒带，你跟着磁带标准发音大声跟读。早自习上流利地领读课文，英语老师对你纯正的发音赞不绝口！",
        effect: {
          intelligence: 10,
          charm: 4,
          happiness: 4,
        },
      },
    ],
  },
  {
    id: "gen_bicycle_commute",
    category: "general",
    minAge: 13,
    maxAge: 18,
    title: "🚲 顶着晨雾跨区骑行十公里求学",
    icon: "🚴",
    narrative:
      "清晨六点半，县城与市郊还笼罩在一片薄雾之中。你跨上擦得锃亮的二八大杠自行车，车把上挂着铝制饭盒，清脆的铃铛声划破宁静的长街，迎着晨风开始一天的跨区求学之路……",
    options: [
      {
        label: "弓下身子加速冲坡，在晨雾与清风中锻炼体魄与意志",
        hint: "强身健体 · 坚毅体魄",
        resultDesc:
          "双腿飞蹬，链条沙沙作响。汗水拂过额头，数年风雨无阻的单车求学路练就了你钢铁般的好体魄！",
        effect: {
          health: 12,
          happiness: 5,
          intelligence: 2,
        },
      },
      {
        label: "减速在路口捎上顺路的好友，后座载人一路欢歌笑语",
        hint: "青春羁绊 · 同窗情深",
        resultDesc:
          "同伴跳上后座抓紧你的衣角，两辆自行车在大街小巷穿梭。你们聊着昨晚的作业与对未来的憧憬，青春在风中飞扬！",
        effect: {
          charm: 8,
          happiness: 10,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 12,
        },
      },
    ],
  },
  {
    id: "gen_night_study_snack",
    category: "general",
    minAge: 13,
    maxAge: 18,
    title: "🍜 深夜挑灯夜战母亲端来热馄饨",
    icon: "🥟",
    narrative:
      "深夜十一点，昏黄的台灯下摊满了密密麻麻的数理化试卷与黄冈密卷。房门被轻轻推开，母亲端着一碗热气腾腾的青菜小馄饨走进来，汤面上漂着翠绿的葱花与虾皮紫菜……",
    options: [
      {
        label: "趁热连汤带馅大口吃下，感受温情滋养后发奋苦读到深夜",
        hint: "亲情力量 · 专心向学",
        resultDesc:
          "一口热汤下肚，周身暖流涌动。看着母亲慈爱的眼神，你心中涌起无穷动力，连夜攻克了最后两道压轴大题！",
        effect: {
          intelligence: 10,
          health: 6,
          happiness: 6,
          affinityTarget: "mother",
          affinityDelta: 10,
        },
      },
      {
        label: "分半碗给母亲并劝她早点睡，自己吃完主动把碗筷刷洗干净",
        hint: "体贴入微 · 孝道家风",
        resultDesc:
          "母亲欣慰地摸摸你的头，夸你长大了懂得分担家务。温馨的家庭港湾让你感到无比踏实与安心。",
        effect: {
          charm: 8,
          happiness: 8,
          health: 4,
          affinityTarget: "mother",
          affinityDelta: 15,
        },
      },
    ],
  },
  {
    id: "gen_pocket_money_saving",
    category: "general",
    minAge: 13,
    maxAge: 18,
    title: "💰 攒零花钱去新华书店淘教辅与名著",
    icon: "📚",
    narrative:
      "省吃俭用攒下了几个月的五毛、一块零花钱，周末你直奔市中心飘着油墨香气的新华书店。书架前摩肩接踵，你手里攥着热乎乎的毛票，在教辅专区与文学经典书架前来回徘徊……",
    options: [
      {
        label: "买下厚重权威的《数理化解题题典》，回校钻研题型技巧",
        hint: "应试利器 · 逻辑思维",
        resultDesc:
          "你如获至宝，周末在书桌前把典型例题刷了个遍，解题逻辑大幅提升，随堂测验拔得头筹！",
        effect: {
          intelligence: 12,
          cash: -15,
          happiness: 4,
        },
      },
      {
        label: "买下路遥的《平凡的世界》名著，在文字中汲取精神力量",
        hint: "时代精神 · 人文素养",
        resultDesc:
          "孙少平在苦难中不屈奋斗的坚韧深深震撼了你，厚重的文字让你对人生与时代有了更深邃的胸怀！",
        effect: {
          intelligence: 8,
          charm: 10,
          happiness: 8,
          cash: -12,
        },
      },
    ],
  },
  {
    id: "gen_family_discussion_career",
    category: "general",
    minAge: 13,
    maxAge: 18,
    title: "👨‍👩‍👦 晚饭桌前探讨未来大学专业志向",
    icon: "🧭",
    narrative:
      "周日全家人围坐在八仙桌前吃晚饭，电视里正播放着南巡讲话后的经济热潮与浦东开发新闻。父亲倒上一盅酒，母亲夹来一筷子红烧肉，全家的话题自然落到了你未来的高考志向与专业选择上……",
    options: [
      {
        label: "立志报考理工科计算机与机械工程，走工业与科技报国之路",
        hint: "科技强国 · 严谨笃实",
        resultDesc:
          "父亲用力拍了拍你的肩膀连连叫好，工科强国是老一辈工人的期盼，长辈们纷纷为你加油打气！",
        effect: {
          intelligence: 12,
          charm: 4,
          happiness: 6,
          affinityTarget: "father",
          affinityDelta: 10,
        },
      },
      {
        label: "看好市场经济浪潮，立志攻读国际贸易与金融经济专业",
        hint: "时代潮头 · 商业视野",
        resultDesc:
          "母亲和长辈们赞叹你的敏锐眼光，时代春潮涌动，下海经商与金融外贸正成为全社会最耀眼的广阔舞台！",
        effect: {
          intelligence: 8,
          charm: 10,
          happiness: 8,
          affinityTarget: "mother",
          affinityDelta: 8,
        },
      },
    ],
  },

  // ====================================================
  // 10.1 大学与初入职场日常通用生活事件 (General · 19~24岁)
  // ====================================================
  {
    id: "gen_college_library_seat_rush",
    category: "general",
    minAge: 19,
    maxAge: 24,
    title: "📚 高校图书馆清晨排队占座与通宵自习室攻坚",
    icon: "📖",
    narrative:
      "清晨六点半，大学图书馆厚重的大门外已经排起百米长队。晨光熹微中，大家抱着厚厚的大部头专业书与水杯，等待开馆铃声敲响的一刻冲入自习室占下临窗的书桌，为期末统考、英语四六级与专业资格证通宵奋战……",
    options: [
      {
        label: "抢占向阳靠窗座位，沉浸式刷完两本厚重专业原版教材",
        hint: "博闻强识 · 学术深耕",
        resultDesc:
          "一整天的专注攻读让你彻底吃透了专业核心脉络与难点公式，期末考卷下发时你答得游刃有余、独占鳌头！",
        effect: {
          intelligence: 14,
          charm: 6,
          happiness: 8,
        },
      },
      {
        label: "与室友组成考证互助学习小组，互相抽背核心考点与真题",
        hint: "研学搭子 · 共同进步",
        resultDesc:
          "同窗之间热烈探讨、互相补位，学习小组全员以优异高分一次性通过全省统一等级考试，宿舍被评为全优模范寝室！",
        effect: {
          intelligence: 12,
          charm: 10,
          happiness: 10,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 12,
        },
      },
    ],
  },
  {
    id: "gen_campus_cafeteria_card_dinner",
    category: "general",
    minAge: 19,
    maxAge: 24,
    title: "🍛 大学一食堂充值校园卡与同窗围桌打牙祭",
    icon: "🍛",
    narrative:
      "第四节课下课铃声一响，校园主干道上人潮涌动。你与室友们手拿红白相间的校园磁卡冲进一食堂二楼风味餐厅，刷卡打上两份招牌红烧大排、糖醋里脊与热腾腾的番茄蛋花汤，几个人围坐在不锈钢餐桌前痛快朵颐……",
    options: [
      {
        label: "大方刷卡请室友们加菜加鸡腿，在欢声笑语中增进寝室情谊",
        hint: "同窗情谊 · 豪爽仗义（解锁老物件）",
        resultDesc:
          "餐桌上大家推杯换盏、互相打趣，天南地北的方言汇聚在一起，食堂的烟火气让寝室同窗真正成了胜似手足的好兄弟！",
        effect: {
          charm: 12,
          happiness: 14,
          health: 8,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 15,
          unlockAssetId: "college_student_meal_card",
        },
      },
      {
        label: "荤素合理搭配光盘行动，精打细算规划本月伙食开支结余",
        hint: "营养均衡 · 节俭持家（解锁老物件）",
        resultDesc:
          "你不仅保持了充沛的体能精力，还通过精细记账省下了半个月伙食费，展现了出色的生活规划能力！",
        effect: {
          health: 10,
          intelligence: 8,
          happiness: 8,
          unlockAssetId: "college_student_meal_card",
        },
      },
    ],
  },
  {
    id: "gen_201_phone_booth_family_call",
    category: "general",
    minAge: 19,
    maxAge: 24,
    title: "☎️ 校园宿舍楼下排队刷 201 电话卡给父母报平安",
    icon: "☎️",
    narrative:
      "周日傍晚，宿舍楼门厅旁的几个投币与插卡公用电话亭前排起了长队。你捏着印有名胜图案的 201 电话卡，听着话筒里清脆的插卡提示音，熟练地按下长长的账号密码，拨通了远方家中座机的熟悉号码……",
    options: [
      {
        label: "深情向父母汇报学业进步与生活近况，耐心倾听家中唠叨挂牵",
        hint: "百善孝先 · 暖心羁绊（解锁老物件）",
        resultDesc:
          "电话那头父母欣慰的笑声抚平了一周的疲倦，父亲叮嘱吃饱穿暖、母亲唠叨添衣，亲情的暖流跨越千山万水抚慰着游子心！",
        effect: {
          charm: 12,
          happiness: 16,
          intelligence: 6,
          affinityTarget: "mother",
          affinityDelta: 20,
          unlockAssetId: "campus_201_ic_phone_card",
        },
      },
      {
        label: "精简报平安并向父母请教人生抉择与社会阅历，汲取长辈智慧",
        hint: "传承家风 · 心智笃定（解锁老物件）",
        resultDesc:
          "父亲用沉淀数十年的实干经验为你点拨迷津，长辈的真知灼见让你在面对未来的复杂挑战时多了一份底气与成熟！",
        effect: {
          intelligence: 12,
          charm: 10,
          happiness: 12,
          affinityTarget: "father",
          affinityDelta: 18,
          unlockAssetId: "campus_201_ic_phone_card",
        },
      },
    ],
  },
  {
    id: "gen_motorola_beeper_page_reply",
    category: "general",
    minAge: 19,
    maxAge: 24,
    title: "📟 汉显寻呼机腰间鸣响与街头寻找电话亭回复急电",
    icon: "📟",
    narrative:
      "“嘀嘀嘀，嘀嘀嘀——”别在皮带上的摩托罗拉汉显寻呼机发出急促震动。绿色的双行屏幕上跳出一行字：“【导师/部门经理】：速回电，重要学术项目/紧急业务有新进展！”你三步并作两步穿过马路，在路口烟杂店前抓起红色公用电话……",
    options: [
      {
        label: "分秒必争迅速回电并条理清晰汇报进度，展现雷厉风行执行力",
        hint: "敏锐高效 · 职业素养（解锁老物件）",
        resultDesc:
          "你的即时响应与严谨汇报赢得了导师与领导的高度赞誉，重要业务机遇被你第一时间稳稳抓住，在团队中声名鹊起！",
        effect: {
          intelligence: 14,
          charm: 12,
          happiness: 10,
          unlockAssetId: "motorola_pager_beeper",
        },
      },
      {
        label: "冷静构思应对预案后再从容回复，给出周全无瑕的解决方案",
        hint: "沉稳大度 · 运筹帷幄（解锁老物件）",
        resultDesc:
          "你在电话中提出的破局方案令人耳目一新，领导在电话那头连声称赞‘后生可畏’，直接拍板将项目主导权交由你推进！",
        effect: {
          intelligence: 16,
          charm: 10,
          happiness: 12,
          unlockAssetId: "motorola_pager_beeper",
        },
      },
    ],
  },
  {
    id: "gen_street_food_beer_ideal_talk",
    category: "general",
    minAge: 19,
    maxAge: 24,
    title: "🍻 周末大排档路边摊喝啤酒同窗/同事畅谈理想",
    icon: "🍻",
    narrative:
      "夏夜微风拂过喧闹的长街，路边大排档的炒锅里火光冲天，空气中弥漫着烤串与毛豆花生的诱人香气。你与同窗好友、初入职场的同龄伙伴围坐在塑料矮凳上，磕开冰镇啤酒瓶盖，泡沫飞溅中，少年意气与时代宏愿在夜市中激荡……",
    options: [
      {
        label: "举杯畅谈对新世纪科技浪潮与创业大潮的构想，碰撞智慧火花",
        hint: "宏图大展 · 志同道合",
        resultDesc:
          "啤酒杯碰撞出清脆声响，你们相约在新世纪各展所长、顶峰相见！这场彻夜长谈成为多年后回味无穷的青春黄金记忆！",
        effect: {
          intelligence: 12,
          charm: 14,
          happiness: 16,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 16,
        },
      },
      {
        label: "倾听同伴初入社会的迷茫与困惑，真诚开导抚慰共度转型期",
        hint: "肝胆相照 · 挚友知音",
        resultDesc:
          "你的倾听与中肯建议帮伙伴重拾信心，两人建立了牢不可破的生死之交，成为彼此人生与职场路上最坚实的心灵后盾！",
        effect: {
          charm: 16,
          happiness: 14,
          intelligence: 8,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 20,
        },
      },
    ],
  },

  // ====================================================
  // 11. 青年期突发社交与青春奇遇事件 (Emergent · 13~18岁)
  // ====================================================
  {
    id: "em_school_sports_relay",
    category: "emergent",
    minAge: 13,
    maxAge: 18,
    title: "🏃 校运会压轴 4×100 米接力冲刺",
    icon: "🏃",
    narrative:
      "秋阳高照的中学校运会进入最高潮，压轴大戏 4×100 米接力决赛即将鸣枪。广播站里播送着各班激昂的加油稿，全校师生围在煤渣跑道两侧摇旗呐喊。作为第四棒压轴主将，你在最后一程交接棒落后前车两个身位的逆境中接过了铝合金接力棒……",
    options: [
      {
        label: "咬牙摆臂全速爆发，压线瞬间绝地反超夺冠",
        hint: "极限冲刺 · 逆转奇迹",
        resultDesc:
          "你如离弦之箭奋力狂奔，在终点红线前一步逆风反超、挺胸撞线！全班同学瞬间沸腾冲入跑道将你高高抛向空中，校领导亲自为你挂上闪耀的冠军金牌！",
        effect: {
          health: 12,
          charm: 12,
          happiness: 10,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 15,
          unlockAssetId: "sports_relay_gold_medal",
        },
      },
      {
        label: "默契精准稳健交接，带领全班夺得团体总分第一",
        hint: "大局掌控 · 团队领袖",
        resultDesc:
          "你与队友完成毫无瑕疵的教科书级平稳交接，顶住对手贴身施压稳扎稳打拿下决定性积分，带领全班荣登校运会精神文明与团体总分双料冠军宝座！",
        effect: {
          intelligence: 8,
          charm: 10,
          happiness: 10,
          health: 8,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 12,
          unlockAssetId: "sports_relay_gold_medal",
        },
      },
    ],
  },
  {
    id: "em_graduation_autograph",
    category: "emergent",
    minAge: 14,
    maxAge: 18,
    title: "📖 毕业前夕互相赠写同学录与彩色留言本",
    icon: "📘",
    narrative:
      "毕业季即将来临，初夏的教室里弥漫着离别的温情与淡淡感伤。桌上悄悄流转着一本本厚厚的精装烫金同学录，大家争相写下最喜欢的名人格言、粘贴红底黑白一寸证件照，用各色彩笔画上五角星与勿忘我花边……",
    options: [
      {
        label: "工整写下真挚的人生寄语并附赠珍藏红底寸照",
        hint: "情深意切 · 友谊长存",
        resultDesc:
          "你字斟句酌写下‘海内存知己，天涯若比邻’的墨宝，工整贴上免冠一寸照片。大家纷纷抢着把同学录递到你的桌前，留下了90年代最纯粹珍贵的青春墨香。",
        effect: {
          charm: 12,
          happiness: 8,
          intelligence: 6,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 18,
          unlockAssetId: "leather_graduation_autograph_book",
        },
      },
      {
        label: "悄悄在同学录里夹入亲手采摘压制的枫叶书签与青涩纸条",
        hint: "含蓄美好 · 岁月温存",
        resultDesc:
          "你在翻开同学录时，意外发现好友也为你夹了一枚金黄透亮的枫叶书签和一张折成爱心的小纸条，上面写着‘愿你历尽千帆，归来仍是少年’，心中泛起阵阵暖意。",
        effect: {
          charm: 10,
          happiness: 12,
          intelligence: 8,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 20,
          unlockAssetId: "leather_graduation_autograph_book",
        },
      },
    ],
  },
  {
    id: "em_guitar_rock_band",
    category: "emergent",
    minAge: 13,
    maxAge: 18,
    title: "🎸 少年宫琴房偷偷学弹民谣吉他《同桌的你》",
    icon: "🎸",
    narrative:
      "校园民谣风潮席卷大街小巷，《同桌的你》《睡在我上铺的兄弟》在随身听和双卡录音机里日夜循环。周末你溜进少年宫隔音琴房，抱起一把带缺角的红棉木吉他，看着手抄六线谱反复练习 53231323 分解和弦，左手指尖磨出了一层厚厚的老茧……",
    options: [
      {
        label: "抱琴在晚自习操场草坪深情弹唱，引全场师生合唱共鸣",
        hint: "民谣诗人 · 校园焦点",
        resultDesc:
          "清脆的扫弦声在星空下荡漾，你饱含深情的弹唱瞬间吸引了整座操场的目光，所有人情不自禁跟着拍手大合唱，你一跃成为全校皆知的校园民谣吉他之星！",
        effect: {
          charm: 16,
          happiness: 12,
          health: 4,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 20,
          unlockAssetId: "kapok_folk_guitar",
        },
      },
      {
        label: "废寝忘食钻研乐理和弦转换，开启音乐创作天赋",
        hint: "乐理精通 · 创作启蒙",
        resultDesc:
          "你从大三和弦一路钻研到七和弦与卡农进行，甚至在五线谱本上试着谱写出属于自己的第一首校园原创旋律，指导老师惊叹于你的惊人音乐天分！",
        effect: {
          intelligence: 12,
          charm: 10,
          happiness: 10,
          unlockAssetId: "kapok_folk_guitar",
        },
      },
    ],
  },
  {
    id: "em_desk_boundary_truce",
    category: "emergent",
    minAge: 13,
    maxAge: 17,
    title: "📏 课桌中央的“三八线”小风波与互助",
    icon: "📐",
    narrative:
      "同桌两人共用的双人木课桌上，早先因手肘占地用白粉笔画了一条泾渭分明的“三八线”，规定谁过线就挨尺子敲。今天期中模拟考前夕，同桌正为一道代数压轴题急得抓耳挠腮，胳膊肘不知不觉又越过了雷池半寸……",
    options: [
      {
        label: "大方用黑板擦擦掉粉笔线，主动耐心讲解答题思路成为互助搭子",
        hint: "冰释前嫌 · 互帮互助",
        resultDesc:
          "你轻轻擦去粉笔线，把自己的错题笔记推过去耐心拆解辅助线与公式。同桌感激涕零，回赠了一块香气扑鼻的草莓橡皮，两人从此成了并肩作战的最佳同桌！",
        effect: {
          charm: 10,
          intelligence: 8,
          happiness: 8,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 20,
        },
      },
      {
        label: "掏出半透明塑料三角板幽默假装丈量，逗得同桌破涕为笑",
        hint: "幽默风趣 · 调节气氛",
        resultDesc:
          "你一本正经地拿三角尺卡尺量‘越境面积’，幽默诙谐的俏皮话逗得同桌笑出眼泪，紧绷的备考压力烟消云散，同桌大方分了你半袋麦丽素！",
        effect: {
          charm: 12,
          happiness: 10,
          intelligence: 6,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 16,
        },
      },
    ],
  },
  ...ESPORTS_LIFE_EVENTS,
  ...LOL_NARRATIVE_EVENTS,
];

export interface LocationAction {
  id: string;
  name: string;
  icon: string;
  desc?: string;
  energyCost: number;
  cashCost: number;
  gainText: string;
  effect: {
    health?: number;
    intelligence?: number;
    charm?: number;
    happiness?: number;
    cash?: number;
  };
  narrative: string;
  unlockAssetId?: string;
  customAction?: "open_shuihu_unboxing" | "open_card_slap" | "open_marbles" | "open_exam_quiz";
}

export interface LifeLocation {
  id: string;
  name: string;
  icon: string;
  subtitle: string;
  themeColor: number;
  minAge: number;
  maxAge: number;
  era: string;
  description: string;
  actions: LocationAction[];
}

export const LIFE_LOCATIONS_DATABASE: LifeLocation[] = [
  {
    id: "courtyard",
    name: "家属大院与弄堂",
    icon: "🏡",
    subtitle: "市井温情 · 街坊邻里",
    themeColor: 0x76cbb7,
    minAge: 0,
    maxAge: 99,
    era: "全年代",
    description: "青砖瓦房与大槐树下，洋溢着浓郁的烟火气息与邻里互助的温情。",
    actions: [
      {
        id: "courtyard_card_slap",
        name: "🃏 红砖地拍画片对决",
        icon: "🃏",
        desc: "与大院伙伴下掌蓄力拍击翻面",
        energyCost: 15,
        cashCost: 0,
        gainText: "赢取画片 · 快乐 +8 · 魅力 +3",
        effect: { happiness: 8, charm: 3 },
        narrative: "你在红砖地上与大院伙伴摆开阵势，展开激烈的拍画片掌风对决！",
        customAction: "open_card_slap",
      },
      {
        id: "courtyard_marbles",
        name: "🔮 树荫泥地打弹珠竞技",
        icon: "🔮",
        desc: "拉线瞄准发射弹珠撞击出圈",
        energyCost: 15,
        cashCost: 0,
        gainText: "赢取猫眼弹珠 · 快乐 +8 · 健康 +4",
        effect: { happiness: 8, health: 4 },
        narrative: "你掏出心爱的弹珠，在梧桐树下展开百步穿杨弹射对决！",
        customAction: "open_marbles",
      },
      {
        id: "courtyard_story",
        name: "大槐树下听老人讲古",
        icon: "🌳",
        desc: "摇着蒲扇听爷爷们讲述过去的岁月",
        energyCost: 10,
        cashCost: 0,
        gainText: "智力 +2 · 快乐 +2",
        effect: { intelligence: 2, happiness: 2 },
        narrative: "老人们绘声绘色地讲述着当年的传奇与历史，你托着下巴听得入神，增长了许多见识。",
      },
      {
        id: "courtyard_chess",
        name: "观摩院里叔伯象棋残局",
        icon: "♟️",
        desc: "驻足楚河汉界，揣摩棋道对弈",
        energyCost: 15,
        cashCost: 0,
        gainText: "智力 +3 · 专注 +1",
        effect: { intelligence: 3, happiness: 1 },
        narrative: "黑红对垒，杀伐果断。你在旁凝神观战，默默推演着每一步棋路，心智愈发缜密沉稳。",
      },
    ],
  },
  {
    id: "supply_coop",
    name: "供销社与副食店",
    icon: "🏪",
    subtitle: "时代记忆 · 凭票供应",
    themeColor: 0xf6ad55,
    minAge: 0,
    maxAge: 99,
    era: "1978~1995",
    description: "玻璃柜台后摆满了搪瓷缸与各色糕点，是几代人舌尖上最甜蜜的期盼。",
    actions: [
      {
        id: "buy_candies",
        name: "买大白兔奶糖与水果糖",
        icon: "🍬",
        desc: "花几角钱称上半两浓香奶糖",
        energyCost: 5,
        cashCost: 0.5,
        gainText: "快乐 +5 · 健康 +1",
        effect: { happiness: 5, health: 1 },
        narrative: "剥开一层薄薄的糯米纸，浓郁醇厚的奶香在唇齿间化开，甜透了整个心窝！",
      },
      {
        id: "buy_popsicle",
        name: "炎夏买一根红果雪糕",
        icon: "🍦",
        desc: "从木箱棉被里挑一根冰凉酸甜的棒冰",
        energyCost: 5,
        cashCost: 0.2,
        gainText: "快乐 +4 · 暑气全消",
        effect: { happiness: 4 },
        narrative: "咬下一口冰凉透心的红果棒冰，酸酸甜甜的滋味瞬间驱散了夏日的酷暑燥热！",
      },
      {
        id: "buy_malt_extract",
        name: "购买乐口福与麦乳精",
        icon: "🥫",
        desc: "给家里带一罐营养香浓的麦乳精",
        energyCost: 5,
        cashCost: 3.5,
        gainText: "魅力 +4 · 快乐 +3 · 父母好感 +5",
        effect: { charm: 4, happiness: 3 },
        narrative: "用开水冲调一碗香气四溢的麦乳精，全家人围坐在一起分享这难得的滋补与温情。",
      },
      {
        id: "queue_supplies",
        name: "帮家里凭票排队领年货",
        icon: "📦",
        desc: "拿着肉票与粮油本排长队领物资",
        energyCost: 15,
        cashCost: 0,
        gainText: "魅力 +3 · 父母好感 +6",
        effect: { charm: 3, happiness: 2 },
        narrative: "你在寒风中耐心排了半小时队，顺利领齐了过年的凭票物资，父母直夸你懂事能干！",
      },
    ],
  },
  {
    id: "bookstore_library",
    name: "新华书店与图书馆",
    icon: "📚",
    subtitle: "知识殿堂 · 求知若渴",
    themeColor: 0x4299e1,
    minAge: 5,
    maxAge: 99,
    era: "全年代",
    description: "墨香四溢的书架与静谧的自习长桌，无数年轻学子在这里汲取改变命运的力量。",
    actions: [
      {
        id: "read_classics",
        name: "借阅中外文学名著",
        icon: "📖",
        desc: "在馆内安静阅读名著与历史典籍",
        energyCost: 15,
        cashCost: 0,
        gainText: "智力 +3 · 魅力 +2",
        effect: { intelligence: 3, charm: 2 },
        narrative: "你坐在靠窗的长桌旁，翻阅着泛黄的书页，沉浸在深邃宏大的文学世界中，文采斐然。",
      },
      {
        id: "read_comics",
        name: "翻阅连环画小人书与画报",
        icon: "📕",
        desc: "站着看《三国演义》《水浒传》画册",
        energyCost: 10,
        cashCost: 0,
        gainText: "智力 +2 · 快乐 +3",
        effect: { intelligence: 2, happiness: 3 },
        narrative: "精美的白描插画和跌宕起伏的历史演义让你如痴如醉，不知不觉度过了一个充实的下午。",
      },
      {
        id: "study_hard",
        name: "自习室攻坚刷题备考",
        icon: "📝",
        desc: "心无旁骛埋头做模拟试卷",
        energyCost: 20,
        cashCost: 0,
        gainText: "智力 +5 · 健康 -1",
        effect: { intelligence: 5, health: -1 },
        narrative: "草稿纸写满了一张又一张，你攻克了一道道数理化难题，学业功底愈发扎实稳固！",
      },
      {
        id: "buy_exam_books",
        name: "选购全国名师教辅试卷",
        icon: "📚",
        desc: "购买最新版黄冈海淀高考精编",
        energyCost: 10,
        cashCost: 4.5,
        gainText: "智力 +4 · 成绩突破",
        effect: { intelligence: 4, happiness: 1 },
        narrative: "捧着油墨清香的高考真题集，你如获至宝，掌握了更多解题套路与应试技巧。",
      },
      {
        id: "reading_salon",
        name: "参加周末青年读书会",
        icon: "💬",
        desc: "与志同道合的书友交流思想",
        energyCost: 20,
        cashCost: 0,
        gainText: "智力 +3 · 魅力 +4",
        effect: { intelligence: 3, charm: 4 },
        narrative: "你在读书沙龙上旁征博引、侃侃而谈，独到的见解赢得了同仁们由衷的赞许与掌声。",
      },
    ],
  },
  {
    id: "palace_culture",
    name: "工人文化宫与少年宫",
    icon: "🎪",
    subtitle: "文体荟萃 · 兴趣乐园",
    themeColor: 0x9f7aea,
    minAge: 5,
    maxAge: 99,
    era: "全年代",
    description: "乒乓球室的清脆声响、排练厅的悠扬琴声，这里是时代青年展现才华的舞台。",
    actions: [
      {
        id: "art_class",
        name: "报名国画与书法兴趣班",
        icon: "🎨",
        desc: "跟随老艺师练习毛笔楷书与水墨",
        energyCost: 20,
        cashCost: 2.0,
        gainText: "智力 +3 · 魅力 +4",
        effect: { intelligence: 3, charm: 4 },
        narrative: "宣纸上墨晕生动，行云流水。你的书画功底日渐醇厚，气质也变得更加儒雅温润。",
      },
      {
        id: "pingpong_match",
        name: "打乒乓球与羽毛球切磋",
        icon: "🏓",
        desc: "在水泥台或木地板上挥汗如雨",
        energyCost: 20,
        cashCost: 0,
        gainText: "健康 +5 · 快乐 +3",
        effect: { health: 5, happiness: 3 },
        narrative: "正手抽杀，反手变线！你在球台前身手矫健，酣畅淋漓的运动让你体魄愈发强健强盛！",
      },
      {
        id: "open_air_cinema",
        name: "大礼堂看周末露天电影",
        icon: "🎬",
        desc: "自带小板凳看《少林寺》《庐山恋》",
        energyCost: 15,
        cashCost: 0.5,
        gainText: "快乐 +6 · 魅力 +2",
        effect: { happiness: 6, charm: 2 },
        narrative: "银幕亮起，光影摇曳。全场观众随着剧情同喜同悲，浪漫与英雄情怀深深印入脑海。",
      },
      {
        id: "ballroom_dance",
        name: "观摩周末青年交谊舞会",
        icon: "💃",
        desc: "踩着轻快的三步四步舞曲翩翩起舞",
        energyCost: 20,
        cashCost: 1.0,
        gainText: "魅力 +5 · 快乐 +4",
        effect: { charm: 5, happiness: 4 },
        narrative: "伴随着留声机优美的旋律，你优雅从容地迈出舞步，举手投足间散发着迷人的青春风采。",
      },
    ],
  },
  {
    id: "city_park",
    name: "人民公园与护城河畔",
    icon: "🌳",
    subtitle: "绿意盎然 · 放松身心",
    themeColor: 0x48bb78,
    minAge: 0,
    maxAge: 99,
    era: "全年代",
    description: "湖畔垂柳依依，九曲长廊回环，是市民晨练、游憩泛舟与赏景的天然氧吧。",
    actions: [
      {
        id: "fly_kite",
        name: "春日大草坪放纸鸢风筝",
        icon: "🪁",
        desc: "手拽线拐，将七彩风筝送上蓝天",
        energyCost: 15,
        cashCost: 0,
        gainText: "健康 +3 · 快乐 +5",
        effect: { health: 3, happiness: 5 },
        narrative: "东风借力，风筝扶摇直上九万里。你仰望碧空，心情如同展翅翱翔的鸟儿般开阔舒畅。",
      },
      {
        id: "catch_tadpoles",
        name: "荷塘边捞蝌蚪与网知了",
        icon: "🐸",
        desc: "举着竹竿纱网在树荫池畔探索自然",
        energyCost: 15,
        cashCost: 0,
        gainText: "健康 +2 · 快乐 +5",
        effect: { health: 2, happiness: 5 },
        narrative: "你在湖边湿地上抓到几只活泼的小水生昆虫，大自然的生机盎然让你流连忘返。",
      },
      {
        id: "row_boat",
        name: "租木划船碧波泛舟赏景",
        icon: "🚣",
        desc: "荡起双桨，小船儿推开波浪",
        energyCost: 20,
        cashCost: 1.5,
        gainText: "健康 +3 · 快乐 +6",
        effect: { health: 3, happiness: 6 },
        narrative: "“海面倒映着美丽的白塔，四周环绕着绿树红墙……”你轻划木桨，沉醉在如画风光之中。",
      },
      {
        id: "morning_taichi",
        name: "慢跑晨练与打太极拳",
        icon: "🥋",
        desc: "清晨呼吸新鲜空气，舒展筋骨",
        energyCost: 15,
        cashCost: 0,
        gainText: "健康 +5 · 精力充沛",
        effect: { health: 5 },
        narrative: "一招一式行云流水，吐故纳新。清晨的锻炼让你整个人神清气爽，气血通畅充沛！",
      },
    ],
  },
  {
    id: "hospital_clinic",
    name: "职工医院与社区门诊",
    icon: "🏥",
    subtitle: "健康守卫 · 医者仁心",
    themeColor: 0xe53e3e,
    minAge: 0,
    maxAge: 99,
    era: "全年代",
    description: "白大褂与淡淡的来苏水气息，这里守护着全家人的身心健康与平安。",
    actions: [
      {
        id: "health_checkup",
        name: "年度全面健康体检与称重",
        icon: "🩺",
        desc: "听诊心肺、量血压、测视力身高",
        energyCost: 15,
        cashCost: 2.0,
        gainText: "健康 +6 · 防患未然",
        effect: { health: 6 },
        narrative: "医生拿着听诊器仔细检查后夸你身体底子很棒，各项生理指标健康达标，让你倍感安心。",
      },
      {
        id: "take_vaccine",
        name: "接种时令防疫疫苗",
        icon: "💉",
        desc: "打预防针或吃糖丸防病抗疫",
        energyCost: 10,
        cashCost: 1.0,
        gainText: "健康 +4 · 免疫增强",
        effect: { health: 4 },
        narrative: "虽然打针有一点点酸痛，但增强了身体对流行病菌的免疫防线，身体更加结实抗造！",
      },
      {
        id: "buy_tonic",
        name: "购买蜂皇浆与西洋参补品",
        icon: "💊",
        desc: "选用滋补名品强身健体",
        energyCost: 5,
        cashCost: 15.0,
        gainText: "健康 +8 · 滋阴补气",
        effect: { health: 8, happiness: 2 },
        narrative: "服用优质滋补营养液后，只觉得浑身暖融融的，气血精力大增，疲劳一扫而空！",
      },
    ],
  },
  {
    id: "arcade_billiards",
    name: "街头街机厅与台球房",
    icon: "🎮",
    subtitle: "热血竞技 · 青年潮流",
    themeColor: 0xed64a6,
    minAge: 10,
    maxAge: 25,
    era: "1990~2005",
    description: "嘈杂热烈的电子音效与摇杆碰撞声，承载着90年代最硬核的街头热血回忆。",
    actions: [
      {
        id: "play_kof",
        name: "投币通关《拳皇97/街霸》",
        icon: "🕹️",
        desc: "摇杆连招搓出华丽必杀技",
        energyCost: 20,
        cashCost: 2.0,
        gainText: "快乐 +8 · 魅力 +2",
        effect: { happiness: 8, charm: 2 },
        narrative: "八稚女必杀一出，全场围观少年爆发出阵阵喝彩！你一币通关，成为街机厅当之无愧的霸主！",
      },
      {
        id: "play_billiards",
        name: "台球桌切磋花式斯诺克",
        icon: "🎱",
        desc: "架杆瞄准，大力清台",
        energyCost: 20,
        cashCost: 3.0,
        gainText: "魅力 +4 · 快乐 +5",
        effect: { charm: 4, happiness: 5 },
        narrative: "白球旋转翻袋，精准入洞！你利落帅气的出杆姿态吸引了不少路人驻足观赏。",
      },
      {
        id: "watch_vcd",
        name: "录像厅看经典武侠港片",
        icon: "📼",
        desc: "大屏幕播放《英雄本色》《大话西游》",
        energyCost: 20,
        cashCost: 2.0,
        gainText: "快乐 +7 · 见闻开阔",
        effect: { happiness: 7 },
        narrative: "昏暗的录像厅里江湖豪气激荡，兄弟情深令人热血沸腾，深深开阔了你的审美视野。",
      },
    ],
  },
  {
    id: "department_store",
    name: "市百大楼与步行街",
    icon: "🏬",
    subtitle: "繁华都市 · 时尚前沿",
    themeColor: 0xd69e2e,
    minAge: 12,
    maxAge: 99,
    era: "全年代",
    description: "高耸的玻璃柜台与琳琅满目的新潮商品，见证着消费时代的崛起与生活品质的跃升。",
    actions: [
      {
        id: "buy_pen",
        name: "挑选英雄牌金尖钢笔与墨水",
        icon: "✒️",
        desc: "选购一支书写流畅的手工金笔",
        energyCost: 10,
        cashCost: 8.0,
        gainText: "智力 +2 · 魅力 +3",
        effect: { intelligence: 2, charm: 3 },
        narrative: "金属笔杆握在手里分量十足，笔尖划过纸张如行云流水，成为你学习办公的得力臂膀。",
      },
      {
        id: "buy_walkman",
        name: "选购随身听与正版磁带",
        icon: "📻",
        desc: "挑选爱华随身听与周杰伦/小虎队磁带",
        energyCost: 15,
        cashCost: 18.0,
        gainText: "魅力 +4 · 快乐 +6",
        effect: { charm: 4, happiness: 6 },
        narrative: "戴上海绵耳机，立体声旋律在耳边回荡，你走在街头感觉自己就是最潮的时尚青年！",
      },
      {
        id: "buy_fashion",
        name: "试穿购买前沿新潮服饰",
        icon: "👔",
        desc: "选购一件合身的牛仔外套或西装",
        energyCost: 15,
        cashCost: 45.0,
        gainText: "魅力 +6 · 快乐 +5",
        effect: { charm: 6, happiness: 5 },
        narrative: "换上笔挺修身的新衣照照镜子，整个人神采飞扬、气质出众，出门回头率爆表！",
      },
    ],
  },
  {
    id: "tech_market",
    name: "中关村与电脑城",
    icon: "💻",
    subtitle: "IT浪潮 · 硅谷传奇",
    themeColor: 0x319795,
    minAge: 15,
    maxAge: 99,
    era: "1995~2005",
    description: "芯片、主板与蜂鸣器交织的硬件海洋，中国信息高速公路在这里破土起航。",
    actions: [
      {
        id: "surf_internet",
        name: "体验Windows 98与拨号上网",
        icon: "🖥️",
        desc: "听着猫叫声拨号连接万维网",
        energyCost: 20,
        cashCost: 5.0,
        gainText: "智力 +5 · 快乐 +5",
        effect: { intelligence: 5, happiness: 5 },
        narrative: "“Modem连接成功！”浏览器载入浩瀚的互联网世界，你第一次感受到了地球村的辽阔与奇妙！",
      },
      {
        id: "assemble_pc",
        name: "兼职装配奔腾兼容机攒机",
        icon: "🔧",
        desc: "插拔内存条、涂抹硅脂装机赚外快",
        energyCost: 25,
        cashCost: 0,
        gainText: "智力 +4 · 兼职收入 +¥40.0",
        effect: { intelligence: 4, cash: 40.0, happiness: 2 },
        narrative: "你手法娴熟地点亮了一台又一台兼容机，老板对你的硬件技术赞不绝口，爽快结清了工钱！",
      },
      {
        id: "buy_software",
        name: "淘正版工具软件与光盘",
        icon: "💿",
        desc: "购买金山词霸与多媒体大百科",
        energyCost: 15,
        cashCost: 20.0,
        gainText: "智力 +6 · 技能精进",
        effect: { intelligence: 6 },
        narrative: "光驱高速旋转，你如饥似渴地安装学习各类专业工具软件，数字素养走在时代最前沿！",
      },
    ],
  },
  {
    id: "night_market_pub",
    name: "夜市大排档与青年茶座",
    icon: "🍻",
    subtitle: "市井江湖 · 畅谈理想",
    themeColor: 0xdd6b20,
    minAge: 18,
    maxAge: 99,
    era: "全年代",
    description: "炉火炭烤的香气与碰杯声交织，是青年们抒发胸臆、结交挚友的人间烟火地。",
    actions: [
      {
        id: "drink_beer",
        name: "喝冰镇啤酒同窗畅谈理想",
        icon: "🍺",
        desc: "毛豆花生配扎啤，畅聊未来天地",
        energyCost: 20,
        cashCost: 18.0,
        gainText: "快乐 +7 · 魅力 +3",
        effect: { happiness: 7, charm: 3 },
        narrative: "酒杯相碰的声音清脆响亮，你们谈及未来的事业、家庭与远大抱负，豪情万丈，意气风发！",
      },
      {
        id: "tea_talk",
        name: "茶座雅间品茶商议规划",
        icon: "☕",
        desc: "一壶龙井，探讨合作与职业发展",
        energyCost: 20,
        cashCost: 25.0,
        gainText: "智力 +4 · 魅力 +4",
        effect: { intelligence: 4, charm: 4 },
        narrative: "茶香袅袅，在推心置腹的深谈中，你理清了未来的职业跃升路径，结识了得力的商业伙伴。",
      },
    ],
  },
];

export interface YearSettlementData {
  fromYear: number;
  fromAge: number;
  toYear: number;
  toAge: number;
  historicalHeadline: string;
  historicalDetail: string;
  heightGainCm: number;
  weightGainKg: number;
  totalHeightCm: number;
  totalWeightKg: number;
  healthGain: number;
  intelligenceGain: number;
  charmGain: number;
  happinessGain: number;
  cashGain: number;
  cashGainReason: string;
}

export const HISTORICAL_CHRONICLES: Record<number, { headline: string; detail: string }> = {
  1978: {
    headline: "十一届三中全会召开 · 改革开放春风起",
    detail: "大院喇叭广播着时代变革的喜讯，工厂里工人们干劲十足，充满对未来的憧憬。",
  },
  1979: {
    headline: "对越自卫还击战打响 · 边境安宁与家庭温暖",
    detail: "机床厂工会慰问支前职工家属，大院里邻里互助，生活虽朴素却满怀希望。",
  },
  1980: {
    headline: "设立经济特区 · 时代春潮初涌动",
    detail: "深圳、珠海等特区成立的消息传遍大江南北，街头悄然出现了个体户与新风尚。",
  },
  1981: {
    headline: "中国女排首夺世界冠军 · 拼搏精神鼓舞万家",
    detail: "大院黑白电视机前围满了老少街坊，女排夺冠的欢呼声响彻整个家属区。",
  },
  1982: {
    headline: "新宪法通过 · 家庭联产承包责任制确立",
    detail: "农村改革如火如荼，集市上鸡鸭鱼肉逐渐丰富，凭票供应的日子开始松动。",
  },
  1983: {
    headline: "首届央视春晚播出 · 流行文化走进千家万户",
    detail: "李谷一的歌声传遍街头巷尾，年轻人们开始穿起喇叭裤，生活色彩愈发斑斓。",
  },
  1984: {
    headline: "国庆35周年大阅兵 · 邓小平题词改革开放",
    detail: "“小平您好”横幅引发全国共鸣，机械厂引进第一批新型数控设备，万象更新。",
  },
  1985: {
    headline: "新中国首个教师节设立 · 城市经济体制改革全面铺开",
    detail: "“尊师重教”蔚然成风，国营厂全面推行承包经营责任制，大院里不少敢为人先的叔伯停薪留职下海闯荡。",
  },
  1986: {
    headline: "《义务教育法》正式施行 · “863计划”绘制高科技蓝图",
    detail: "全国适龄儿童全面普及九年义务教育，国家启动高技术研究发展计划，广播里传来尖端科技攻坚的振奋喜讯。",
  },
  1987: {
    headline: "中共十三大确立初级阶段理论 · 肯德基内地首店落户北京前门",
    detail: "改革开放步入纵深，西式快餐引发排队尝鲜狂潮，彩色电视机、双缸洗衣机等大件电器逐渐进入普通职工家庭。",
  },
  1988: {
    headline: "海南建省办全国最大经济特区 · 《变形金刚》动画与彩电热潮席卷神州",
    detail: "“十万人才下海南”掀起闯海壮举，放学后大院里孩子们准时围坐在彩电前高呼“汽车人，变形出发！”。",
  },
  1989: {
    headline: "“希望工程”正式启动救助失学儿童 · 我国首台亿次巨型计算机投用",
    detail: "大眼睛女孩苏明娟渴望知识的眼神触动万千国人，工厂学校纷纷组织捐款捐书，科技自立自强步伐更加坚定。",
  },
  1990: {
    headline: "第十一届北京亚运会盛大开幕 · 上海证券交易所开市鸣锣",
    detail: "《亚洲雄风》响彻大江南北，吉祥物熊猫盼盼红遍大街小巷；浦江之畔首家证券交易所鸣锣开市，金融春潮涌动。",
  },
  1991: {
    headline: "海湾战争科技强军成共识 · 苏联解体国际格局深刻演变",
    detail: "海湾战争展现的信息化震撼全球，科技强军与科教兴国成为全民共识；中国坚定不移走中国特色社会主义道路。",
  },
  1992: {
    headline: "邓小平发表南方谈话 · 掀起全面深化改革开放新春潮",
    detail: "“发展才是硬道理”传遍神州大地，确立社会主义市场经济体制目标，全国掀起新一轮下海经商与创业热潮。",
  },
  1993: {
    headline: "全国正式告别粮票票证制度 · 社会主义市场经济全面腾飞",
    detail: "使用近40年的粮票、布票等票证正式退出历史舞台，商品市场琳琅满目，百姓生活从物资匮乏走向充裕多元。",
  },
  1994: {
    headline: "中国全功能接入国际互联网 · 分税制财政体制改革正式落地",
    detail: "中国通过一条64K国际专线全功能接入Internet，开启互联网纪元；分税制改革推行，国家财力显著增强。",
  },
  1995: {
    headline: "全国正式实行“双休日”五天工作制 · 世妇会在京召开",
    detail: "每周双休日让百姓文化休闲与旅游蓬勃兴起；北京世妇会召开，“男女平等”基本国策更加深入人心。",
  },
  1996: {
    headline: "亚特兰大奥运会健儿斩获16金 · 首届珠海航展盛大开幕",
    detail: "百年奥运中国代表团位列金牌榜第四，王军霞等名将闪耀世界；首届中国航展在珠海开幕，蓝天铸剑扬我国威。",
  },
  1997: {
    headline: "香港正式回归祖国洗雪百年国耻 · 东南亚金融危机暴发",
    detail: "7月1日零点五星红旗在香港会展中心庄严升起，百年沧桑一朝洗雪；同年末东南亚爆发金融风暴，中国坚持人民币不贬值展现大国担当。",
  },
  1998: {
    headline: "全国军民万众一心夺取抗洪斗争全面胜利 · 房改方案出台福利分房走向历史",
    detail: "长江、嫩江、松花江发生特大洪涝灾害，人民子弟兵以血肉之躯筑起钢铁长城；国务院出台城镇住房制度改革方案，福利分房终结、商品房时代拉开大幕。",
  },
  1999: {
    headline: "建国50周年盛大阅兵 · 澳门胜利回归 · 神舟一号无人飞船成功发射",
    detail: "国庆50周年世纪大阅兵威震寰宇；12月20日《七子之歌》响彻华夏，澳门回归祖国；神舟一号发射升空，中国载人航天工程迈出历史性第一步。",
  },
  2000: {
    headline: "人类迈入21世纪千禧之年 · 世纪之交高新技术与互联网浪潮席卷全国",
    detail: "千年交替钟声敲响，千禧跨年狂欢点亮神州；新浪、搜狐、网易等互联网企业蓬勃兴起，信息化与高新技术产业成为推动跨世纪发展的新引擎。",
  },
  2001: {
    headline: "中国正式加入世贸组织（WTO） · 北京成功获得2008年奥运会举办权",
    detail: "11月多哈会议通过中国入世决议，中国全面融入世界经济体系；7月13日莫斯科传来“BEIJING”喜讯，数十万市民涌向天安门广场通宵狂欢庆祝申奥成功！",
  },
  2002: {
    headline: "上海获得2010年世博会举办权 · 党的十六大提出全面建设小康社会奋斗目标",
    detail: "12月国际展览局宣布上海赢得2010世博会主办权；党的十六大胜利召开，翻开全面建设小康社会、加快推进社会主义现代化的崭新历史篇章。",
  },
  2003: {
    headline: "万众一心抗击非典取得重大胜利 · 神舟五号载人飞船首飞圆满成功",
    detail: "全国军民众志成城战胜非典疫情，构筑起公共卫生坚固防线；10月15日神舟五号发射升空，航天员杨利伟代表中国人巡天漫游，千年飞天圆梦！",
  },
  2004: {
    headline: "雅典奥运中国代表团获32金创历史新高 · 提出构建社会主义和谐社会",
    detail: "雅典奥运会刘翔以12秒91平世界纪录勇夺男子110米栏冠军、中国女排惊天大逆转夺金，闪耀世界体坛；党提出构建社会主义和谐社会宏伟蓝图。",
  },
  2005: {
    headline: "全国正式免征农业税终结两千年‘皇粮国税’ · 深入推进城镇住房与金融体制改革",
    detail: "十届全国人大常委会决定废止农业税条例，亿万农民告别缴纳千年的皇粮国税；城镇商品房建设与国有商业银行股份制改革进入全面深化提速期。",
  },
  2006: {
    headline: "青藏铁路全线建成通车 · 三峡大坝全线建成达到设计高程",
    detail: "7月1日‘钢铁巨龙’青藏铁路全线通车，打破世界铁路建设极限；举世瞩目的三峡大坝全线浇筑到顶，大国重器巍然屹立长江之畔。",
  },
  2007: {
    headline: "嫦娥一号探月卫星成功发射 · 党的十七大确立科学发展观重大战略思想",
    detail: "10月24日首颗月球探测卫星‘嫦娥一号’直冲九霄开启探月时代；党的十七大胜利召开，把科学发展观写入党章，推动经济社会又好又快发展。",
  },
  2008: {
    headline: "北京成功举办第29届无与伦比的奥运会 · 万众一心抗击汶川特大地震",
    detail: "8月8日北京奥运会盛大启幕，中国代表团勇夺51枚金牌荣登金牌榜首位；面对年初南方雨雪冰冻与5月12日汶川特大地震，中华儿女展现了惊天地泣鬼神的英雄气概与家国大爱！",
  },
  2009: {
    headline: "深圳证券交易所创业板正式开市鸣锣 · 深入推进四万亿经济一揽子计划",
    detail: "10月23日首批28家高科技企业登陆创业板，中国多层次资本市场掀开新篇章；四万亿投资带动基建与高铁产业强势启动，中国经济率先企稳回升。",
  },
  2010: {
    headline: "中国2010年上海世界博览会盛大开幕 · 中国经济总量跃升世界第二",
    detail: "以‘城市，让生活更美好’为主题的上海世博会迎来全球超7300万人次参观，中国馆东方之冠闪耀浦江；中国国内生产总值超越日本，正式跃升全球第二大经济体。",
  },
  2011: {
    headline: "京沪高速铁路全线正式通车运营 · 天宫一号与神舟八号交会对接圆满成功",
    detail: "全长1318公里的京沪高铁让千里一日还成为现实，中国高铁运营里程稳居全球第一；首个目标飞行器‘天宫一号’发射并与神舟八号实现太空浪漫牵手。",
  },
  2012: {
    headline: "首艘航空母舰‘辽宁舰’交付入列 · 党的十八大开启新时代征程 · 莫言荣获诺贝尔文学奖",
    detail: "9月25日辽宁舰交付海军，百年航母梦圆；神舟九号刘洋成为中国首位女航天员；党的十八大胜利召开，开创中国特色社会主义新时代；莫言成为首位获诺贝尔文学奖的中国籍作家。",
  },
  2013: {
    headline: "提出共建‘一带一路’重大战略倡议 · 中国（上海）自由贸易试验区正式挂牌",
    detail: "国家提出共建‘丝绸之路经济带’和‘21世纪海上丝绸之路’宏伟蓝图；首个自由贸易试验区在上海浦东挂牌运作，全面深化改革与高水平对外开放迈入新高潮。",
  },
  2014: {
    headline: "南水北调中线一期工程正式通水 · 首个国家宪法日设立与全面推进依法治国",
    detail: "长达1432公里的长江甘泉一路北上润泽京津冀豫数千万人；党的十八届四中全会审议通过依法治国决定，确立每年12月4日为国家宪法日。",
  },
  2015: {
    headline: "全面实施一对夫妇可生育两个孩子政策 · 屠呦呦荣获诺贝尔生理学或医学奖 · 北京张家口申冬奥成功",
    detail: "十八届五中全会决定全面放开二孩政策，促进人口长期均衡发展；屠呦呦因发现青蒿素摘得诺贝尔奖，中医药闪耀世界；北京成为全球首个‘双奥之城’。",
  },
  2016: {
    headline: "二十国集团（G20）领导人杭州峰会成功举办 · ‘中国天眼’FAST正式落成启用",
    detail: "9月西子湖畔G20峰会凝聚全球经济增长共识，展现大国风范；贵州深山500米口径球面射电望远镜FAST落成，中国射电天文领先全球；神舟十一号完成三十天中期在轨驻留。",
  },
  2017: {
    headline: "设立河北雄安新区千年大计 · 国产首款大飞机C919成功首飞 · 党的十九大确立新思想",
    detail: "4月1日国家决定设立雄安新区，定位千年大计、国家大事；5月5日自主研发的C919大飞机直冲云霄首飞成功；党的十九大胜利召开，宣告中国特色社会主义进入新时代。",
  },
  2018: {
    headline: "隆重庆祝改革开放40周年 · 港珠澳大桥正式开通运营 · 嫦娥四号开启人类首次月背之旅",
    detail: "12月18日党中央隆重召开庆祝改革开放40周年大会，颁授改革先锋奖章；10月24日‘新世界七大奇迹’港珠澳大桥飞架伶仃洋；嫦娥四号升空奔赴月球背面，开启探月新纪元。",
  },
};

export interface ZhuazhouItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  gainDesc: string;
  bonusText: string;
}

export const ZHUAZHOU_OPTIONS: ZhuazhouItem[] = [
  {
    id: "abacus_and_coupons",
    title: "算盘与粮票",
    subtitle: "商业数理启蒙",
    icon: "🧮",
    gainDesc: "自幼对数字与筹划敏感，开启【商业与数理】天资",
    bonusText: "智力 +6 · 适应天资 +1 · 快乐 +4",
  },
  {
    id: "storybook_and_pen",
    title: "小人书与钢笔",
    subtitle: "文学表达启蒙",
    icon: "📖",
    gainDesc: "沉迷翻阅图画与文字符号，开启【文学与表达】天资",
    bonusText: "智力 +8 · 专注天资 +1 · 快乐 +6",
  },
  {
    id: "dragonfly_and_clay",
    title: "竹蜻蜓与泥人",
    subtitle: "工巧体魄启蒙",
    icon: "🐸",
    gainDesc: "动手摆弄器物与户外玩耍，开启【工巧与体魄】天资",
    bonusText: "健康 +8 · 魅力 +4 · 快乐 +6",
  },
];

export class LifeScene extends Phaser.Scene {
  private readonly port: GameRuntimePort;
  private snapshot!: GameRuntimeSnapshot;
  private view!: Phaser.GameObjects.Group;
  private unsubscribe: (() => void) | null = null;
  private director!: GamePresentationDirector;
  private feedback = new ProceduralGameFeedback();
  private activeModal: ActiveModal = null;
  private collectedShuihuCardIds: Set<string> = new Set(["shi_qian", "sun_erniang"]);
  private activeCardSlapGame: CardSlapMiniGame | null = null;
  private activeMarblesGame: MarblesMiniGame | null = null;
  private activeExamQuizGame: ExamQuizMiniGame | null = null;
  private lastDrawnCard: ShuihuCard | null = null;
  private activeZhongkao: ZhongkaoManager | null = null;
  private activeEsportsCareer: EsportsCareerManager | null = null;
  private selectedSchool: SchoolOption | null = null;
  private isEsportsProPlayer: boolean = false;
  private esportsTrophies: string[] = [];
  private devTabMode: "academic" | "esports" = "academic";
  private activeEsportsSession: ActiveEsportsMatchSession | null = null;
  private lastRankTrainingResult: string | null = null;
  public birthConfigSys: BirthConfigManager = new BirthConfigManager();
  public academicScoreSys: AcademicScoreSystem = new AcademicScoreSystem();
  public socialInsuranceSys: SocialInsuranceSystem = new SocialInsuranceSystem();
  public esportsCareerSys: EsportsCareerSystem = new EsportsCareerSystem();
  public romanceMarriageSys: RomanceMarriageSystem = new RomanceMarriageSystem();
  public fertilitySys: FertilitySystem = new FertilitySystem();
  private romanceActiveTab: "interact" | "candidates" | "housing" | "conflict" = "interact";
  private activeMarriageConflict: MarriageConflictEvent | null = null;
  private selectedChildId: string | null = null;
  public financeStockSys: FinanceStockSystem = new FinanceStockSystem();
  public careerPromotionSys: CareerPromotionSystem = new CareerPromotionSystem();
  private careerActiveTab: "overview" | "actions" | "promotion" | "titles" = "overview";
  private lastCareerPromotionResult: string | null = null;
  private stockActiveTab: "quotes" | "portfolio" = "quotes";
  private bankActiveTab: "savings" | "time_deposits" | "mortgage" | "social_security" = "savings";
  private activeGaokao: GaokaoManager | null = null;
  private playerChosenTrack: GaokaoTrack = "science";
  private gaokaoInitialStage: GaokaoModalStage = "exam_session";
  private lastGaokaoResult: GaokaoCompletionResult | null = null;
  public lolCareerMgr: LolCareerManager = new LolCareerManager();
  public eraAssetsSys: EraAssetsSystem = new EraAssetsSystem();
  private activeReactionGame: ReactionTestGame | null = null;
  private currentVehicleId: string = "bicycle";
  private selectedFamilyMemberId: string | null = null;
  private completedZhuazhouItem: ZhuazhouItem | null = null;
  private pendingSettlement: YearSettlementData | null = null;
  private unlockedAssetIds: Set<string> = new Set(["tiger_shoes", "model_worker_mug"]);
  private currentLifeEvent: LifeEventDefinition | null = null;
  private eventHistoryRecords: Array<{ title: string; content: string; tag: string; tagColor: string }> = [];
  private completedEventIds: Set<string> = new Set();
  private activeTab: "home" | "relationships" | "locations" | "development" | "assets" = "home";
  private selectedLocationId: string | null = null;
  private activeMedalInfo: { title: string; desc: string; icon: string; bonus: string } | null = null;
  private completedQuestIds: Set<string> = new Set();
  private studyCountThisAge: number = 0;
  private familyChoreCount: number = 0;
  private lastActionResult: { title: string; narrative: string; gainText: string } | null = null;
  private energySpentThisYear: number = 0;
  private accumulatedYearBonus = {
    yearOffset: 0,
    happiness: 0,
    health: 0,
    intelligence: 0,
    charm: 0,
    cash: 0,
  };

  private triggerNextAgeEvent(age: number): boolean {
    const milestone = CHILDHOOD_EVENT_DATABASE.find(
      (e) => e.category === "milestone" && e.minAge <= age && e.maxAge >= age && !this.completedEventIds.has(e.id),
    );
    if (milestone) {
      this.currentLifeEvent = milestone;
      this.activeModal = "life_event";
      return true;
    }
    const candidates = CHILDHOOD_EVENT_DATABASE.filter(
      (e) => e.minAge <= age && e.maxAge >= age && !this.completedEventIds.has(e.id),
    );
    if (!candidates.length) return false;
    const chosenIndex = (age * 13 + this.eventHistoryRecords.length * 7) % candidates.length;
    this.currentLifeEvent = candidates[chosenIndex];
    this.activeModal = "life_event";
    return true;
  }

  private familyMembers = [
    { id: "father", role: "父亲", name: "李建华", avatar: "👨", identity: "国营机械厂二级钳工", affinity: 88, description: "性格沉稳刚毅，眼角有细细的笑纹，对你寄予厚望" },
    { id: "mother", role: "母亲", name: "张秀兰", avatar: "👩", identity: "县棉纺织厂细纱车间职工", affinity: 95, description: "温柔细心，心灵手巧，总能变着花样给你做好吃的" },
    { id: "friend_xiaojun", role: "发小", name: "王小军", avatar: "👦", identity: "机床厂家属院同龄伙伴", affinity: 90, description: "性子活泼好动，整天喊你一起滚铁环、捉迷藏" },
    { id: "teacher_zhang", role: "恩师", name: "张德华", avatar: "👨‍🏫", identity: "市重点中学优秀教师", affinity: 82, description: "治学严谨，循循善诱，格外关注你的学业与品德成长" },
    { id: "classmate_chen", role: "同窗知己", name: "陈静", avatar: "👧", identity: "同班学习委员", affinity: 85, description: "文雅恬静，成绩优异，经常和你一起讨论数理难题与理想" },
    { id: "boss_zhao", role: "职场导师", name: "赵建民", avatar: "👨‍💼", identity: "业务部资深科长", affinity: 78, description: "经验丰富，办事干练，在关键业务项目中对你多有提携" },
  ];

  private advanceDirector!: AdvanceDirector;

  constructor(port: GameRuntimePort) {
    super("LifeScene");
    this.port = port;
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.view = this.add.group();
    this.advanceDirector = new AdvanceDirector(this);
    this.unsubscribe = this.port.subscribe((snapshot, cues) => {
      if (snapshot.screen !== "life" || !this.scene.isActive()) return;
      this.snapshot = snapshot;
      this.render();
      void this.director.play(cues, {});
    });
    this.snapshot = this.port.getSnapshot();
    this.render();
  }

  shutdown(): void {
    this.director?.destroy();
    this.feedback.destroy();
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  getUiDiagnostics(): Record<string, unknown> {
    if (!this.snapshot) return { protocol: "p1-life-screen-loading-v1" };
    const stats = this.getEffectiveStats(this.snapshot);
    return {
      protocol: "p1-life-screen-v1",
      screen: "life",
      activeTab: this.activeTab,
      activeModal: this.activeModal,
      calendarYear: stats.calendarYear,
      age: stats.age,
      playerName: this.snapshot.playerName,
      availableEnergy: stats.availableEnergy,
      cashYuan: stats.cashYuan,
      familyMemberCount: this.familyMembers.length,
      unlockedAssetsCount: this.unlockedAssetIds.size,
      shuihuCardCount: this.collectedShuihuCardIds.size,
      selectedLocationId: this.selectedLocationId,
      selectedFamilyMemberId: this.selectedFamilyMemberId,
      devTabMode: this.devTabMode,
      recentLifeCount: this.getLifeChronicles().length,
      completedZhuazhou: this.completedZhuazhouItem?.id ?? null,
      pendingSettlement: this.pendingSettlement ? `${this.pendingSettlement.toYear}-${this.pendingSettlement.toAge}` : null,
    };
  }

  private getEffectiveStats(s: GameRuntimeSnapshot) {
    const age = s.age + this.accumulatedYearBonus.yearOffset;
    const calendarYear = s.calendarYear + this.accumulatedYearBonus.yearOffset;
    const happiness = Math.min(100, Math.max(0, 85 + this.accumulatedYearBonus.happiness));
    const health = Math.min(100, Math.max(0, 90 + this.accumulatedYearBonus.health));
    const intelligence = Math.min(100, Math.max(0, 65 + this.accumulatedYearBonus.intelligence));
    const charm = Math.min(100, Math.max(0, 70 + this.accumulatedYearBonus.charm));
    const cashYuan = Math.max(0, s.resources.cashYuan + this.accumulatedYearBonus.cash);
    const availableEnergy = Math.max(0, 100 - this.energySpentThisYear);
    return { age, calendarYear, happiness, health, intelligence, charm, cashYuan, availableEnergy };
  }

  private calculateYearSettlement(s: GameRuntimeSnapshot): YearSettlementData {
    const current = this.getEffectiveStats(s);
    const fromYear = current.calendarYear;
    const fromAge = current.age;
    const toYear = fromYear + 1;
    const toAge = fromAge + 1;

    const chronicle = HISTORICAL_CHRONICLES[fromYear] || {
      headline: `${fromYear}年 时代春风拂大地`,
      detail: "改革开放脚步稳健，大院生活蒸蒸日上，处处洋溢着蓬勃生机与希望。",
    };

    const heightGainCm = fromAge <= 2 ? 8 : 6;
    const weightGainKg = fromAge <= 2 ? 2.3 : 1.8;
    const totalHeightCm = 50 + fromAge * 8 + heightGainCm;
    const totalWeightKg = 3.5 + fromAge * 2.6 + weightGainKg;

    const healthGain = 6 + (toAge % 3);
    const intelligenceGain = 5 + (toAge % 4);
    const charmGain = 4 + (toAge % 3);
    const happinessGain = 6 + (toAge % 4);
    const cashGain = 2.0;
    const cashGainReason = "春节长辈走亲戚，塞来压岁钱与大白兔奶糖";

    return {
      fromYear,
      fromAge,
      toYear,
      toAge,
      historicalHeadline: chronicle.headline,
      historicalDetail: chronicle.detail,
      heightGainCm,
      weightGainKg,
      totalHeightCm,
      totalWeightKg: Math.round(totalWeightKg * 10) / 10,
      healthGain,
      intelligenceGain,
      charmGain,
      happinessGain,
      cashGain,
      cashGainReason,
    };
  }

  private render(): void {
    this.director?.destroy();
    this.director = new GamePresentationDirector(this, {
      motion: (this.registry.get(MOTION_LEVEL_REGISTRY_KEY) ?? "full") as MotionLevel,
      muted: !this.registry.get(SOUND_ENABLED_REGISTRY_KEY),
      haptics: this.registry.get(HAPTIC_ENABLED_REGISTRY_KEY) !== false,
    });

    this.view.clear(true, true);
    const s = this.snapshot;

    // 1. 全屏写实背景
    this.renderBackground();

    // 2. 顶部 HUD 状态栏（角色卡、四大属性柱状条、存款与精力，全局常驻）
    this.renderTopHud(s);

    // 3. 中间主要内容区域（根据 activeTab 独立切页渲染）
    switch (this.activeTab) {
      case "home":
        this.renderHomeTab(s);
        break;
      case "relationships":
        this.renderRelationshipsTab(s);
        break;
      case "locations":
        this.renderLocationsTab(s);
        break;
      case "development":
        this.renderDevelopmentTab(s);
        break;
      case "assets":
        this.renderAssetsTab(s);
        break;
    }

    // 4. 底部五大核心导航栏（全局常驻）
    this.renderBottomNavigation(s);

    // 5. 模态弹窗系统 (抓周 / 跨年结算 / 剧情事件 / 地点详情 / 行动结果 / GM测试)
    if (this.activeModal) {
      this.renderModal(s);
    }
  }

  // ==========================================
  // 1. 全屏写实背景
  // ==========================================
  private renderBackground(): void {
    const stats = this.getEffectiveStats(this.snapshot);
    const bgKey = stats.age < 6 ? "scene.growth" : "scene.relations";
    if (this.textures.exists(bgKey)) {
      const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, bgKey);
      const scale = Math.max(GAME_WIDTH / bg.width, GAME_HEIGHT / bg.height);
      bg.setScale(scale).setAlpha(0.25).setDepth(0);
      this.view.add(bg);
    }

    // 暗色渐变底板
    const gradient = this.add.graphics();
    gradient.fillStyle(0x061116, 0.94).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    gradient.setDepth(1);
    this.view.add(gradient);
  }

  // ==========================================
  // 2. 顶部 HUD 状态栏 (Y: 12 ~ 122, H: 110px)
  // ==========================================
  private renderTopHud(s: GameRuntimeSnapshot): void {
    const stats = this.getEffectiveStats(s);
    const hudX = 14;
    const hudY = 12;
    const hudW = 362;
    const hudH = 110;

    // HUD 底板
    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x08171f, 0.98).fillRoundedRect(hudX, hudY, hudW, hudH, 12);
    hudBg.lineStyle(1.5, 0xd4a359, 0.9).strokeRoundedRect(hudX, hudY, hudW, hudH, 12);
    hudBg.setDepth(5);
    this.view.add(hudBg);

    // 左上：头像徽章
    const avatarBg = this.add.graphics();
    avatarBg.fillStyle(0x132932, 1).fillCircle(hudX + 28, hudY + 30, 22);
    avatarBg.lineStyle(2, 0x76cbb7, 1).strokeCircle(hudX + 28, hudY + 30, 22);
    avatarBg.setDepth(6);
    this.view.add(avatarBg);

    const avatarEmoji = this.add.text(hudX + 28, hudY + 30, stats.age < 3 ? "👶" : stats.age < 6 ? "🧒" : stats.age < 18 ? "👦" : "👨", {
      fontSize: "22px",
    }).setOrigin(0.5).setDepth(7);
    this.view.add(avatarEmoji);

    // 角色姓名与年龄年份
    const nameText = this.add.text(hudX + 58, hudY + 14, s.playerName || "李建国", {
      fontFamily: FONT_FAMILY,
      fontSize: "17px",
      fontStyle: "bold",
      color: "#ffffff",
      padding: { x: 2, y: 2 },
    }).setDepth(6);
    this.view.add(nameText);

    // 快速 GM 调试徽章按钮
    const gmBadge = this.add.text(hudX + 132, hudY + 14, "🛠️GM", {
      fontFamily: FONT_FAMILY,
      fontSize: "12px",
      fontStyle: "bold",
      color: "#fbbf24",
      backgroundColor: "#78350f",
      padding: { x: 4, y: 2 },
    }).setDepth(7);
    gmBadge.setInteractive({ useHandCursor: true });
    gmBadge.on("pointerdown", () => {
      this.activeModal = "gm_debug";
      this.render();
    });
    this.view.add(gmBadge);

    const ageStage = stats.age < 3 ? "婴儿期" : stats.age < 6 ? "幼童期" : stats.age < 12 ? "少儿期" : stats.age < 18 ? "中学期" : stats.age < 22 ? "大学期" : "职场青年";
    const ageTag = this.add.text(hudX + 58, hudY + 37, `${stats.calendarYear}年 · ${stats.age}岁 (${ageStage})`, {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: "#ffd8a1",
      padding: { x: 2, y: 2 },
    }).setDepth(6);
    this.view.add(ageTag);

    // 右上：存款与精力
    const cashTag = this.add.text(hudX + hudW - 14, hudY + 14, `💰 存款: ¥${stats.cashYuan.toFixed(2)}`, {
      fontFamily: FONT_FAMILY,
      fontSize: "14px",
      fontStyle: "bold",
      color: "#ffd8a1",
      padding: { x: 2, y: 2 },
    }).setOrigin(1, 0).setDepth(6);
    this.view.add(cashTag);

    const isLowEnergy = stats.availableEnergy < 20;
    const energyTag = this.add.text(
      hudX + hudW - 14,
      hudY + 37,
      `⚡ 精力: ${stats.availableEnergy}/100`,
      {
        fontFamily: FONT_FAMILY,
        fontSize: "13px",
        fontStyle: "bold",
        color: isLowEnergy ? "#ff7875" : "#8be5d1",
        padding: { x: 2, y: 2 },
      },
    ).setOrigin(1, 0).setDepth(6);
    this.view.add(energyTag);

    // 下方：4 大核心属性条（快乐、健康、智力、魅力）
    const statRowY = hudY + 64;
    const statW = 82;
    const statGap = 8;
    const startStatX = hudX + 8;

    this.renderStatPill(startStatX + 0 * (statW + statGap), statRowY, statW, "😊 快乐", stats.happiness, 0xf6ad55);
    this.renderStatPill(startStatX + 1 * (statW + statGap), statRowY, statW, "❤️ 健康", stats.health, 0xf56565);
    this.renderStatPill(startStatX + 2 * (statW + statGap), statRowY, statW, "💡 智力", stats.intelligence, 0x4299e1);
    this.renderStatPill(startStatX + 3 * (statW + statGap), statRowY, statW, "🌸 魅力", stats.charm, 0xed64a6);
  }

  private renderStatPill(x: number, y: number, w: number, label: string, val: number, color: number): void {
    const pillG = this.add.graphics();
    pillG.fillStyle(0x0c1e26, 0.95).fillRoundedRect(x, y, w, 38, 8);
    pillG.lineStyle(1.5, 0x223841, 1).strokeRoundedRect(x, y, w, 38, 8);
    pillG.setDepth(6);
    this.view.add(pillG);

    const title = this.add.text(x + 6, y + 5, label, {
      fontFamily: FONT_FAMILY,
      fontSize: "12px",
      fontStyle: "bold",
      color: "#cbd5e1",
      padding: { x: 1, y: 1 },
    }).setDepth(7);
    this.view.add(title);

    const valTxt = this.add.text(x + w - 6, y + 5, `${val}`, {
      fontFamily: FONT_FAMILY,
      fontSize: "12px",
      fontStyle: "bold",
      color: "#ffffff",
      padding: { x: 1, y: 1 },
    }).setOrigin(1, 0).setDepth(7);
    this.view.add(valTxt);

    // 进度条槽底
    const barW = w - 12;
    pillG.fillStyle(0x1a2d36, 1).fillRoundedRect(x + 6, y + 25, barW, 6, 3);
    // 进度条填充
    const fillW = Math.max(4, barW * (val / 100));
    pillG.fillStyle(color, 1).fillRoundedRect(x + 6, y + 25, fillW, 6, 3);
  }

  public spawnFloatingText(x: number, y: number, textContent: string, color: string = "#ffd8a1"): void {
    const floatTxt = this.add.text(x, y, textContent, {
      fontFamily: FONT_FAMILY,
      fontSize: "15px",
      fontStyle: "bold",
      color,
      stroke: "#000000",
      strokeThickness: 3,
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(100);
    this.view.add(floatTxt);

    this.tweens.add({
      targets: floatTxt,
      y: y - 36,
      alpha: 0,
      duration: 1200,
      ease: "Cubic.easeOut",
      onComplete: () => {
        floatTxt.destroy();
      },
    });
  }

  // ==========================================
  // 3.1 主页 Tab：沉浸生活活体舞台 + 时代目标 + 快捷行动 + 推进按钮
  // ==========================================
  private renderHomeTab(s: GameRuntimeSnapshot): void {
    // 1. 中央核心：【沉浸生活活体舞台】(Y: 126 ~ 434)
    this.renderLivingStage(s);
    // 2. 时代人生奋斗目标栏 (Y: 440 ~ 504)
    this.renderLifeQuests(s);
    // 3. 核心日常行动快捷卡片栏 (Y: 510 ~ 640)
    this.renderQuickActionDeck(s);
    // 4. 底部核心大推进按钮——【 下一年 ▶ 】(Y: 648 ~ 708)
    this.renderAdvanceButton(s);
    // 5. 底部系统辅助按钮与大事记回忆录入口 (Y: 716 ~ 746)
    this.renderFooterUtilities();
  }

  // 1. 沉浸式活体生活舞台 (Living Stage)
  private renderLivingStage(s: GameRuntimeSnapshot): void {
    const stats = this.getEffectiveStats(s);
    const stageX = 14;
    const stageY = 126;
    const stageW = 362;
    const stageH = 308;

    // 舞台外框底板（深蓝青暖木质感复古框）
    const stageBg = this.add.graphics();
    stageBg.fillStyle(0x0a1c24, 0.98).fillRoundedRect(stageX, stageY, stageW, stageH, 14);
    stageBg.lineStyle(2, 0xd4a359, 0.9).strokeRoundedRect(stageX, stageY, stageW, stageH, 14);
    stageBg.setDepth(5);
    this.view.add(stageBg);

    // 舞台内部地面/地台（大院红砖与木地板暖色）
    const floorG = this.add.graphics();
    floorG.fillStyle(0x132e3b, 0.95).fillRoundedRect(stageX + 6, stageY + 160, stageW - 12, stageH - 166, 10);
    floorG.setDepth(6);
    this.view.add(floorG);

    // 顶部场景标题条
    const stageSceneTag = stats.age < 3
      ? "🍼 1978年代 · 温暖襁褓与摇篮卧房"
      : stats.age < 7
      ? `🧸 ${stats.calendarYear}年 · 机械厂家属院 · 6岁童年书房`
      : stats.age < 13
      ? `🎒 ${stats.calendarYear}年 · 红领巾少先队员 · 阳光书桌`
      : `🌟 ${stats.calendarYear}年 · 青春激昂 · 奋斗天地`;

    const tagText = this.add.text(stageX + stageW / 2, stageY + 16, stageSceneTag, {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: "#ffd8a1",
      backgroundColor: "#0d2733",
      padding: { x: 8, y: 3 },
    }).setOrigin(0.5, 0).setDepth(7);
    this.view.add(tagText);

    // 主角头顶动态心声气泡 (Speech Bubble)
    const bubbleBg = this.add.graphics();
    bubbleBg.fillStyle(0x102b35, 0.95).fillRoundedRect(stageX + 24, stageY + 44, stageW - 48, 36, 8);
    bubbleBg.lineStyle(1.5, 0x76cbb7, 0.8).strokeRoundedRect(stageX + 24, stageY + 44, stageW - 48, 36, 8);
    bubbleBg.setDepth(7);
    this.view.add(bubbleBg);

    const speechText = stats.availableEnergy < 20
      ? "💬 \"哈欠~ 玩累了，有点困了，休息会儿吧...\""
      : stats.age <= 1
      ? "💬 \"哇哇~ 看着大院梧桐树的新芽，感觉好新奇！\""
      : "💬 \"今天大院里好热闹，小军喊我去红砖地拍画片呢！\"";

    const bubbleLabel = this.add.text(stageX + stageW / 2, stageY + 62, speechText, {
      fontFamily: FONT_FAMILY,
      fontSize: "12px",
      fontStyle: "bold",
      color: "#8be5d1",
      align: "center",
      padding: { x: 2, y: 2 },
    }).setOrigin(0.5).setDepth(8);
    this.view.add(bubbleLabel);

    // 主角活体立绘：采用全新高品质复古像素角色展台组件 (CharacterStageWidget)
    // 覆盖 0~80 岁 7 大人生阶段像素立绘、动态眨眼、呼吸微动、状态铭牌与心声互动
    const stageWidget = new CharacterStageWidget(this, {
      x: stageX,
      y: stageY + 32,
      width: stageW,
      height: 266,
      characterName: s.playerName || "建国",
      age: stats.age,
      identityLabel: this.isEsportsProPlayer
        ? "⚡ 电竞职业选手"
        : stats.age === 18
        ? (this.playerChosenTrack === "science" ? "🎓 高三理科生 (物化生)" : "📜 高三文科生 (史地政)")
        : stats.age === 16 || stats.age === 17
        ? (this.playerChosenTrack === "science" ? "🔬 高中理科生" : "📖 高中文科生")
        : undefined,
      mood: stats.health < 35
        ? "sick"
        : stats.availableEnergy < 15
        ? "tired"
        : stats.happiness > 80
        ? "happy"
        : "calm",
      avatarScale: 1.25,
      depth: 8,
      interactive: true,
      onCharacterClick: (w) => {
        if (stats.availableEnergy >= 2) {
          this.accumulatedYearBonus.happiness += 1;
        }
      },
    });
    this.view.add(stageWidget);

    // ---- 场景四大微互动道具 (Clickable Scene Props) ----
    // 道具 1: 📻 红灯牌老收音机 (左下角)
    this.renderStageProp(
      stageX + 50,
      stageY + 245,
      "📻",
      "红灯收音机",
      () => {
        if (stats.availableEnergy < 2) {
          this.spawnFloatingText(stageX + 50, stageY + 220, "⚡ 精力不足！", "#ff7875");
          return;
        }
        this.energySpentThisYear += 2;
        this.accumulatedYearBonus.intelligence += 2;
        this.spawnFloatingText(stageX + 50, stageY + 210, "💡 智力+2 📻 听时代广播", "#4299e1");
        this.render();
      },
    );

    // 道具 2: 🧰 写字台小金库与抽屉 (右下角)
    this.renderStageProp(
      stageX + stageW - 50,
      stageY + 245,
      "🧰",
      "私房钱抽屉",
      () => {
        this.spawnFloatingText(
          stageX + stageW - 50,
          stageY + 210,
          `💰 存款: ¥${stats.cashYuan.toFixed(2)} · 存钱罐满满当当`,
          "#ffd8a1",
        );
      },
    );

    // 道具 3: 📖 连环画小人书 (左中)
    this.renderStageProp(
      stageX + 46,
      stageY + 115,
      "📖",
      "三国小人书",
      () => {
        if (stats.availableEnergy < 2) {
          this.spawnFloatingText(stageX + 46, stageY + 90, "⚡ 精力不足！", "#ff7875");
          return;
        }
        this.energySpentThisYear += 2;
        this.accumulatedYearBonus.happiness += 3;
        this.spawnFloatingText(stageX + 46, stageY + 80, "😊 快乐+3 📖 精彩连环画", "#f6ad55");
        this.render();
      },
    );

    // 道具 4: 👦 窗外发小王小军 (右中)
    this.renderStageProp(
      stageX + stageW - 46,
      stageY + 115,
      "👦",
      "发小王小军",
      () => {
        this.activeModal = "card_slap";
        this.render();
      },
      true, // 闪烁红点标记有约
    );
  }

  private renderStageProp(
    x: number,
    y: number,
    icon: string,
    label: string,
    onClick: () => void,
    hasNotification: boolean = false,
  ): void {
    const propBg = this.add.graphics();
    propBg.fillStyle(0x0e2733, 0.92).fillCircle(x, y, 22);
    propBg.lineStyle(1.5, 0xd4a359, 0.9).strokeCircle(x, y, 22);
    propBg.setDepth(7);
    this.view.add(propBg);

    const propIcon = this.add.text(x, y - 2, icon, { fontSize: "20px" }).setOrigin(0.5).setDepth(8);
    this.view.add(propIcon);

    const propLabel = this.add.text(x, y + 26, label, {
      fontFamily: FONT_FAMILY,
      fontSize: "11px",
      fontStyle: "bold",
      color: "#ffd8a1",
      backgroundColor: "#071720",
      padding: { x: 3, y: 1 },
    }).setOrigin(0.5).setDepth(8);
    this.view.add(propLabel);

    if (hasNotification) {
      const dot = this.add.graphics();
      dot.fillStyle(0xff4d4f, 1).fillCircle(x + 15, y - 14, 5);
      dot.setDepth(9);
      this.view.add(dot);
    }

    const hit = this.add.circle(x, y, 26, 0x000000, 0);
    hit.setInteractive({ useHandCursor: true }).setDepth(10);
    hit.on("pointerdown", () => {
      this.tweens.add({
        targets: [propIcon],
        scale: 1.25,
        duration: 100,
        yoyo: true,
      });
      onClick();
    });
    this.view.add(hit);
  }

  // 2. 时代人生奋斗目标栏 (Life Quests)
  private renderLifeQuests(s: GameRuntimeSnapshot): void {
    const stats = this.getEffectiveStats(s);
    const questX = 14;
    const questY = 442;
    const questW = 362;
    const questH = 62;

    const questBg = this.add.graphics();
    questBg.fillStyle(0x0f242e, 0.98).fillRoundedRect(questX, questY, questW, questH, 10);
    questBg.lineStyle(1.5, 0xf59e0b, 0.9).strokeRoundedRect(questX, questY, questW, questH, 10);
    questBg.setDepth(5);
    this.view.add(questBg);

    // 徽章图标
    const trophy = this.add.text(questX + 22, questY + 22, "🏆", { fontSize: "24px" }).setOrigin(0.5).setDepth(6);
    this.view.add(trophy);

    // 目标主标题
    const questTitle = stats.age < 7
      ? "🎯 幼童奋斗目标：【大院孩子王】"
      : stats.age < 13
      ? "🎯 少儿奋斗目标：【红领巾的骄傲】"
      : "🎯 青年奋斗目标：【时代弄潮儿】";

    const titleTxt = this.add.text(questX + 44, questY + 12, questTitle, {
      fontFamily: FONT_FAMILY,
      fontSize: "14px",
      fontStyle: "bold",
      color: "#fbbf24",
    }).setDepth(6);
    this.view.add(titleTxt);

    // 两个阶段目标标签
    const subQuestTxt = stats.age < 7
      ? "① 拍画片赢过王小军 (点击可发起对决) · ② 幼小认字启蒙"
      : "① 期末考试争取双百 · ② 集齐水浒五虎将卡片";

    const subTxt = this.add.text(questX + 44, questY + 36, subQuestTxt, {
      fontFamily: FONT_FAMILY,
      fontSize: "11px",
      color: "#cbd5e1",
    }).setDepth(6);
    this.view.add(subTxt);

    // 详情快捷点击
    const hit = this.add.rectangle(questX + questW / 2, questY + questH / 2, questW, questH, 0x000000, 0);
    hit.setInteractive({ useHandCursor: true }).setDepth(7);
    hit.on("pointerdown", () => {
      this.spawnFloatingText(questX + questW / 2, questY - 10, "🌟 达成目标可获得时代金星勋章！", "#fbbf24");
    });
    this.view.add(hit);
  }

  // 3. 核心日常行动快捷卡片栏 (Quick Actions Dock)
  private renderQuickActionDeck(s: GameRuntimeSnapshot): void {
    const stats = this.getEffectiveStats(s);
    const deckX = 14;
    const deckY = 512;
    const deckW = 362;
    const deckH = 130;

    // 4 张生活行动卡片 (2 列 × 2 行)
    const cardW = 176;
    const cardH = 58;
    const gapX = 10;
    const gapY = 8;

    const actionList = [
      {
        id: "card_slap",
        icon: "🃏",
        title: "拍画片对决",
        desc: "大战发小王小军",
        cost: "⚡-12精力 · 夺画片",
        color: 0x1d3c4a,
        border: 0xd4a359,
        action: () => {
          this.activeModal = "card_slap";
          this.render();
        },
      },
      {
        id: "study_words",
        icon: "📖",
        title: "学前认字启蒙",
        desc: "看拼音写生字",
        cost: "⚡-10精力 · 💡智力+6",
        color: 0x173644,
        border: 0x38bdf8,
        action: () => {
          if (stats.availableEnergy < 10) {
            this.spawnFloatingText(deckX + cardW / 2, deckY + cardH / 2, "⚡ 精力不足！", "#ff7875");
            return;
          }
          this.energySpentThisYear += 10;
          this.accumulatedYearBonus.intelligence += 6;
          this.studyCountThisAge++;
          if (this.studyCountThisAge >= 2 && !this.completedQuestIds.has("quest_age6_early_literacy")) {
            this.completedQuestIds.add("quest_age6_early_literacy");
            this.activeMedalInfo = {
              title: "🌟 时代金星 · 学前小神童勋章",
              desc: "书卷墨香启迪心智，父母深感荣耀，小学未入学便已锋芒毕露！",
              icon: "📖",
              bonus: "智力 +12 · 魅力 +6 · 开启【学前神童】声誉",
            };
            this.accumulatedYearBonus.intelligence += 12;
            this.accumulatedYearBonus.charm += 6;
            this.activeModal = "medal_award";
            this.render();
            return;
          }
          this.spawnFloatingText(deckX + cardW + gapX + cardW / 2, deckY + cardH / 2, "💡 智力+6 📖 认真识字", "#38bdf8");
          this.render();
        },
      },
      {
        id: "snack_store",
        icon: "🏪",
        title: "红星供销社",
        desc: "大白兔/冰棍/铁皮蛙",
        cost: "自选柜台 · 快乐翻倍",
        color: 0x22363e,
        border: 0xf59e0b,
        action: () => {
          this.activeModal = "supply_coop_shop";
          this.render();
        },
      },
      {
        id: "yard_play",
        icon: "🏃",
        title: "大院跳绳捉迷藏",
        desc: "锻炼体魄结交玩伴",
        cost: "⚡-10精力 · ❤️健康+5",
        color: 0x183a3f,
        border: 0x34d399,
        action: () => {
          if (stats.availableEnergy < 10) {
            this.spawnFloatingText(deckX + cardW + gapX + cardW / 2, deckY + cardH + gapY + cardH / 2, "⚡ 精力不足！", "#ff7875");
            return;
          }
          this.energySpentThisYear += 10;
          this.accumulatedYearBonus.health += 5;
          this.accumulatedYearBonus.charm += 3;
          this.spawnFloatingText(deckX + cardW + gapX + cardW / 2, deckY + cardH + gapY + cardH / 2, "❤️ 健康+5 🏃 欢快奔跑", "#34d399");
          this.render();
        },
      },
    ];

    actionList.forEach((act, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const cx = deckX + col * (cardW + gapX);
      const cy = deckY + row * (cardH + gapY);

      const cardBg = this.add.graphics();
      cardBg.fillStyle(act.color, 0.98).fillRoundedRect(cx, cy, cardW, cardH, 8);
      cardBg.lineStyle(1.5, act.border, 0.85).strokeRoundedRect(cx, cy, cardW, cardH, 8);
      cardBg.setDepth(5);
      this.view.add(cardBg);

      const iconTxt = this.add.text(cx + 20, cy + 22, act.icon, { fontSize: "22px" }).setOrigin(0.5).setDepth(6);
      this.view.add(iconTxt);

      const titleTxt = this.add.text(cx + 40, cy + 10, act.title, {
        fontFamily: FONT_FAMILY,
        fontSize: "13px",
        fontStyle: "bold",
        color: "#ffffff",
      }).setDepth(6);
      this.view.add(titleTxt);

      const costTxt = this.add.text(cx + 40, cy + 32, act.cost, {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        color: "#ffd8a1",
      }).setDepth(6);
      this.view.add(costTxt);

      const hit = this.add.rectangle(cx + cardW / 2, cy + cardH / 2, cardW, cardH, 0x000000, 0);
      hit.setInteractive({ useHandCursor: true }).setDepth(7);
      hit.on("pointerdown", () => {
        this.tweens.add({
          targets: iconTxt,
          scale: 1.25,
          duration: 100,
          yoyo: true,
        });
        act.action();
      });
      this.view.add(hit);
    });
  }

  private renderAdvanceButton(s: GameRuntimeSnapshot): void {
    const stats = this.getEffectiveStats(s);
    const btnX = 14;
    const btnY = 648;
    const btnW = 362;
    const btnH = 56;

    const nextAge = stats.age + 1;
    const nextYear = stats.calendarYear + 1;

    const btnG = this.add.graphics();
    btnG.fillStyle(0xb55a3c, 0.98).fillRoundedRect(btnX, btnY, btnW, btnH, 12);
    btnG.lineStyle(2, 0xffd8a1, 1).strokeRoundedRect(btnX, btnY, btnW, btnH, 12);
    btnG.setDepth(8);
    this.view.add(btnG);

    const btnText = this.add.text(
      btnX + btnW / 2,
      btnY + btnH / 2,
      `【 下一年 ▶ (${nextYear} 年 · ${nextAge} 岁) 】`,
      {
        fontFamily: FONT_FAMILY,
        fontSize: "17px",
        fontStyle: "bold",
        color: "#ffffff",
        padding: { x: 2, y: 2 },
      },
    ).setOrigin(0.5).setDepth(9);
    this.view.add(btnText);

    const hit = this.add.rectangle(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH, 0x000000, 0);
    hit.setInteractive({ useHandCursor: true }).setDepth(10);
    hit.on("pointerdown", () => {
      const settlement = this.calculateYearSettlement(s);
      this.pendingSettlement = settlement;
      this.advanceDirector.play({
        fromYear: settlement.fromYear,
        toYear: settlement.toYear,
        fromAge: settlement.fromAge,
        toAge: settlement.toAge,
        playerName: s.playerName || "建国",
        historicalHeadline: settlement.historicalHeadline,
        attributeChanges: [
          { label: "❤️ 健康", delta: settlement.healthGain, color: "#f87171" },
          { label: "💡 智力", delta: settlement.intelligenceGain, color: "#60a5fa" },
          { label: "🌸 魅力", delta: settlement.charmGain, color: "#f472b6" },
          { label: "😊 快乐", delta: settlement.happinessGain, color: "#fbbf24" },
          { label: "💰 压岁结余", delta: settlement.cashGain, color: "#34d399" },
        ],
        onComplete: () => {
          this.activeModal = "year_transition";
          this.render();
        },
      });
    });
    this.view.add(hit);
  }

  private renderFooterUtilities(): void {
    const footerY = 722;

    // 左侧：📜 人生生平大事记 (展开回忆录)
    const chronBtnBg = this.add.graphics();
    chronBtnBg.fillStyle(0x13303d, 0.95).fillRoundedRect(14, footerY - 14, 175, 28, 6);
    chronBtnBg.lineStyle(1.5, 0xd4a359, 1).strokeRoundedRect(14, footerY - 14, 175, 28, 6);
    chronBtnBg.setDepth(8);
    this.view.add(chronBtnBg);

    const chronBtn = text(this, 101, footerY, "📜 人生生平大事记", 13, 0xffe3ae, true)
      .setOrigin(0.5)
      .setDepth(9);
    chronBtn.setInteractive({ useHandCursor: true });
    bindInteractiveFeedback(chronBtn, {
      onPress: () => {
        this.activeModal = "chronicle_archive";
        this.render();
      },
    });
    this.view.add(chronBtn);

    // 右侧：🛠️ 测试GM工具箱
    const gmBtnBg = this.add.graphics();
    gmBtnBg.fillStyle(0xd97706, 0.95).fillRoundedRect(200, footerY - 14, 176, 28, 6);
    gmBtnBg.lineStyle(1.5, 0xfbbf24, 1).strokeRoundedRect(200, footerY - 14, 176, 28, 6);
    gmBtnBg.setDepth(8);
    this.view.add(gmBtnBg);

    const gmBtn = text(this, 288, footerY, "🛠️ 测试GM工具箱", 13, 0xffffff, true)
      .setOrigin(0.5)
      .setDepth(9);
    gmBtn.setInteractive({ useHandCursor: true });
    bindInteractiveFeedback(gmBtn, {
      onPress: () => {
        this.activeModal = "gm_debug";
        this.render();
      },
    });
    this.view.add(gmBtn);
  }

  // 大事纪回忆录全屏弹窗内容
  private renderChronicleArchiveModalContent(
    modalX: number,
    modalY: number,
    modalW: number,
    modalH: number,
    s: GameRuntimeSnapshot,
  ): void {
    const stats = this.getEffectiveStats(s);
    const headerTitle = this.add.text(
      modalX + 24,
      modalY + 22,
      `📜 ${stats.calendarYear} 年 · ${stats.age} 岁 · 人生生平大事记`,
      {
        fontFamily: FONT_FAMILY,
        fontSize: "16px",
        fontStyle: "bold",
        color: "#ffe3ae",
        padding: { x: 2, y: 2 },
      },
    ).setDepth(23);
    this.view.add(headerTitle);

    const chronicles = this.getLifeChronicles();
    let itemY = modalY + 62;
    chronicles.forEach((item) => {
      if (itemY > modalY + modalH - 50) return;

      const isInteractive = item.interactiveAction === "open_zhuazhou";
      const card = this.add.graphics();
      card.fillStyle(isInteractive ? 0x15313d : 0x0c202a, 0.95).fillRoundedRect(modalX + 16, itemY, modalW - 32, item.height, 10);
      card.lineStyle(1.5, isInteractive ? 0xffd8a1 : 0x1d3a46, 0.9).strokeRoundedRect(modalX + 16, itemY, modalW - 32, item.height, 10);
      card.setDepth(23);
      this.view.add(card);

      const dot = this.add.graphics();
      dot.fillStyle(item.dotColor, 1).fillCircle(modalX + 30, itemY + 18, 5);
      dot.setDepth(24);
      this.view.add(dot);

      const titleText = this.add.text(modalX + 42, itemY + 10, item.title, {
        fontFamily: FONT_FAMILY,
        fontSize: "15px",
        fontStyle: "bold",
        color: isInteractive ? "#ffe3ae" : "#ffffff",
        padding: { x: 2, y: 2 },
      }).setDepth(24);
      this.view.add(titleText);

      const descText = this.add.text(modalX + 42, itemY + 34, item.content, {
        fontFamily: FONT_FAMILY,
        fontSize: "13px",
        lineSpacing: 6,
        wordWrap: { width: modalW - 74, useAdvancedWrap: true },
        color: "#e2e8f0",
        padding: { x: 2, y: 2 },
      }).setDepth(24);
      this.view.add(descText);

      if (item.tag && !isInteractive) {
        const tagText = this.add.text(modalX + modalW - 28, itemY + 10, item.tag, {
          fontFamily: FONT_FAMILY,
          fontSize: "13px",
          fontStyle: "bold",
          color: item.tagColor,
          padding: { x: 2, y: 2 },
        }).setOrigin(1, 0).setDepth(24);
        this.view.add(tagText);
      }

      if (isInteractive) {
        const btn = this.add.graphics();
        btn.fillStyle(0xd4a359, 1).fillRoundedRect(modalX + modalW - 118, itemY + 12, 88, 30, 6);
        btn.setDepth(25);
        this.view.add(btn);

        const btnText = this.add.text(modalX + modalW - 74, itemY + 27, "前往抓周 ▶", {
          fontFamily: FONT_FAMILY,
          fontSize: "12px",
          fontStyle: "bold",
          color: "#0a171a",
        }).setOrigin(0.5).setDepth(26);
        this.view.add(btnText);

        const hit = this.add.rectangle(modalX + 16 + (modalW - 32) / 2, itemY + item.height / 2, modalW - 32, item.height, 0x000000, 0);
        hit.setInteractive({ useHandCursor: true }).setDepth(27);
        hit.on("pointerdown", () => {
          this.activeModal = "zhuazhou";
          this.render();
        });
        this.view.add(hit);
      }

      itemY += item.height + 10;
    });
  }

  // ==========================================
  // 3.2 关系 Tab：全景人际网与亲友交互切页
  // ==========================================
  private renderRelationshipsTab(s: GameRuntimeSnapshot): void {
    const tabX = 14;
    const tabY = 128;
    const tabW = 362;
    const tabH = 620;

    const tabBg = this.add.graphics();
    tabBg.fillStyle(0x071319, 0.98).fillRoundedRect(tabX, tabY, tabW, tabH, 14);
    tabBg.lineStyle(1.5, 0x76cbb7, 0.9).strokeRoundedRect(tabX, tabY, tabW, tabH, 14);
    tabBg.setDepth(5);
    this.view.add(tabBg);

    // 顶部标题
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x102b35, 0.98).fillRoundedRect(tabX + 12, tabY + 12, tabW - 24, 38, 8);
    headerBg.lineStyle(1.5, 0x274955, 1).strokeRoundedRect(tabX + 12, tabY + 12, tabW - 24, 38, 8);
    headerBg.setDepth(6);
    this.view.add(headerBg);

    const title = this.add.text(tabX + 24, tabY + 22, `👥 全景人际网 · 家庭与社交 (${this.familyMembers.length}位关系人)`, {
      fontFamily: FONT_FAMILY,
      fontSize: "15px",
      fontStyle: "bold",
      color: "#8be5d1",
    }).setDepth(7);
    this.view.add(title);

    let memberY = tabY + 58;
    this.familyMembers.forEach((member) => {
      const isSelected = this.selectedFamilyMemberId === member.id;

      const card = createPixelRelationCard(this, {
        x: tabX + 12,
        y: memberY,
        width: tabW - 24,
        name: member.name,
        relation: member.role,
        intimacy: member.affinity,
        statusText: `${member.identity} · ${member.description}`,
        avatarText: member.avatar,
        expandable: true,
        defaultExpanded: isSelected,
        depth: 6,
        onToggleExpand: (expanded) => {
          this.selectedFamilyMemberId = expanded ? member.id : null;
          this.render();
        },
        onChat: () => {
          member.affinity = Math.min(100, member.affinity + 4);
          this.accumulatedYearBonus.happiness += 2;
          this.lastActionResult = {
            title: `与${member.role}【${member.name}】谈心`,
            narrative: `你和${member.name}推心置腹地聊了聊近况与心愿，彼此的情感羁绊更加深厚。`,
            gainText: `好感度 +4 · 快乐 +2`,
          };
          this.activeModal = "action_result";
          this.render();
        },
        onGift: () => {
          member.affinity = Math.min(100, member.affinity + 12);
          this.accumulatedYearBonus.charm += 2;
          this.lastActionResult = {
            title: `给${member.role}【${member.name}】送上贴心礼物`,
            narrative: `你送上了精心准备的小礼品，${member.name}惊喜万分，对你的体贴懂事大加赞赏！`,
            gainText: `好感度 +12 · 魅力 +2`,
          };
          this.activeModal = "action_result";
          this.render();
        },
        onMoney: () => {
          this.accumulatedYearBonus.cash += 2.0;
          this.lastActionResult = {
            title: `向${member.role}【${member.name}】索要零花钱`,
            narrative: `${member.name}宠溺地捏了捏你的脸蛋，从衣兜里掏出几张崭新的纸币塞进你手里。`,
            gainText: `获得零花钱 +¥2.00 元`,
          };
          this.activeModal = "action_result";
          this.render();
        },
        onConsult: () => {
          this.accumulatedYearBonus.intelligence += 3;
          member.affinity = Math.min(100, member.affinity + 2);
          this.lastActionResult = {
            title: `向${member.role}【${member.name}】请教生活与学业`,
            narrative: `${member.name}耐心细致地给你指点迷津，传授了宝贵的实践经验，令你受益匪浅！`,
            gainText: `智力 +3 · 好感度 +2`,
          };
          this.activeModal = "action_result";
          this.render();
        },
      });

      this.view.add(card);
      memberY += card.getHeight() + 10;
    });
  }

  // ==========================================
  // 3.3 活动 Tab：时代生活地点与行动切页
  // ==========================================
  private renderLocationsTab(s: GameRuntimeSnapshot): void {
    const tabX = 14;
    const tabY = 128;
    const tabW = 362;
    const tabH = 620;

    const stats = this.getEffectiveStats(s);

    const tabBg = this.add.graphics();
    tabBg.fillStyle(0x071319, 0.98).fillRoundedRect(tabX, tabY, tabW, tabH, 14);
    tabBg.lineStyle(1.5, 0xf6ad55, 0.9).strokeRoundedRect(tabX, tabY, tabW, tabH, 14);
    tabBg.setDepth(5);
    this.view.add(tabBg);

    // 顶部标题与可用精力条
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x1c2419, 0.98).fillRoundedRect(tabX + 12, tabY + 12, tabW - 24, 38, 8);
    headerBg.lineStyle(1.5, 0x48bb78, 1).strokeRoundedRect(tabX + 12, tabY + 12, tabW - 24, 38, 8);
    headerBg.setDepth(6);
    this.view.add(headerBg);

    const title = this.add.text(tabX + 24, tabY + 22, `🗺️ 时代生活地点地图`, {
      fontFamily: FONT_FAMILY,
      fontSize: "15px",
      fontStyle: "bold",
      color: "#ffd8a1",
    }).setDepth(7);
    this.view.add(title);

    const energyTag = this.add.text(tabX + tabW - 24, tabY + 22, `⚡ 剩余精力: ${stats.availableEnergy}/100`, {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: stats.availableEnergy < 20 ? "#ff7875" : "#8be5d1",
    }).setOrigin(1, 0).setDepth(7);
    this.view.add(energyTag);

    // 筛选当前适龄的地点
    const availableLocations = LIFE_LOCATIONS_DATABASE.filter(
      (loc) => stats.age >= loc.minAge && stats.age <= loc.maxAge,
    );

    let locY = tabY + 58;
    availableLocations.slice(0, 6).forEach((loc) => {
      const minEnergy = Math.min(...loc.actions.map((a) => a.energyCost));
      const card = createPixelLocationCard(this, {
        x: tabX + 12,
        y: locY,
        width: tabW - 24,
        height: 80,
        title: loc.name,
        description: `【${loc.subtitle}】· ${loc.description}`,
        icon: loc.icon,
        energyCost: minEnergy,
        rewardBadge: `${loc.actions.length}项行动`,
        actionLabel: "前往 ▶",
        actionVariant: "primary",
        themeColor: loc.themeColor,
        depth: 6,
        onAction: () => {
          this.selectedLocationId = loc.id;
          this.activeModal = "location_detail";
          this.render();
        },
      });

      this.view.add(card);
      locY += 88;
    });
  }

  // ==========================================
  // 3.4 发展 Tab：学业成长与职场事业全景切页
  // ==========================================
  private renderDevelopmentTab(s: GameRuntimeSnapshot): void {
    const tabX = 14;
    const tabY = 128;
    const tabW = 362;
    const tabH = 620;

    const stats = this.getEffectiveStats(s);

    const tabBg = this.add.graphics();
    tabBg.fillStyle(0x071319, 0.98).fillRoundedRect(tabX, tabY, tabW, tabH, 14);
    tabBg.lineStyle(1.5, 0x4299e1, 0.9).strokeRoundedRect(tabX, tabY, tabW, tabH, 14);
    tabBg.setDepth(5);
    this.view.add(tabBg);

    // 顶部双子切页选择器
    const modeAcademic = this.devTabMode === "academic";
    const subTabW = (tabW - 28) / 2;

    // 子切页 1: 学业与常规事业
    const tab1Bg = this.add.graphics();
    tab1Bg.fillStyle(modeAcademic ? 0x1a365d : 0x0f1c24, 0.98).fillRoundedRect(tabX + 12, tabY + 12, subTabW, 36, 8);
    tab1Bg.lineStyle(1.5, modeAcademic ? 0x4299e1 : 0x274955, 1).strokeRoundedRect(tabX + 12, tabY + 12, subTabW, 36, 8);
    tab1Bg.setDepth(6);
    this.view.add(tab1Bg);

    const tab1T = this.add.text(tabX + 12 + subTabW / 2, tabY + 30, "🏫 学业与职场发展", {
      fontFamily: FONT_FAMILY,
      fontSize: "12.5px",
      fontStyle: modeAcademic ? "bold" : "normal",
      color: modeAcademic ? "#90cdf4" : "#94a3b8",
    }).setOrigin(0.5).setDepth(7);
    this.view.add(tab1T);

    const hit1 = this.add.rectangle(tabX + 12 + subTabW / 2, tabY + 30, subTabW, 36, 0x000000, 0);
    hit1.setInteractive({ useHandCursor: true }).setDepth(8);
    hit1.on("pointerdown", () => {
      this.devTabMode = "academic";
      this.render();
    });
    this.view.add(hit1);

    // 子切页 2: 职业电竞战队基地
    const tab2Bg = this.add.graphics();
    tab2Bg.fillStyle(!modeAcademic ? 0x132a22 : 0x0f1c24, 0.98).fillRoundedRect(tabX + 16 + subTabW, tabY + 12, subTabW, 36, 8);
    tab2Bg.lineStyle(1.5, !modeAcademic ? 0x34d399 : 0x274955, 1).strokeRoundedRect(tabX + 16 + subTabW, tabY + 12, subTabW, 36, 8);
    tab2Bg.setDepth(6);
    this.view.add(tab2Bg);

    const tab2T = this.add.text(tabX + 16 + subTabW + subTabW / 2, tabY + 30, "🎮 职业电竞战队 (NEW)", {
      fontFamily: FONT_FAMILY,
      fontSize: "12px",
      fontStyle: !modeAcademic ? "bold" : "normal",
      color: !modeAcademic ? "#34d399" : "#94a3b8",
    }).setOrigin(0.5).setDepth(7);
    this.view.add(tab2T);

    const hit2 = this.add.rectangle(tabX + 16 + subTabW + subTabW / 2, tabY + 30, subTabW, 36, 0x000000, 0);
    hit2.setInteractive({ useHandCursor: true }).setDepth(8);
    hit2.on("pointerdown", () => {
      this.devTabMode = "esports";
      this.render();
    });
    this.view.add(hit2);

    // 如果处于电竞模式，进入电竞专属展台渲染
    if (!modeAcademic) {
      this.renderEsportsCareerDevelopmentPanel(tabX, tabY, tabW, tabH, s);
      return;
    }

    let curY = tabY + 54;

    // 1. 当前身份头衔与阶段卡片
    const stageCard = this.add.graphics();
    stageCard.fillStyle(0x0c202a, 0.98).fillRoundedRect(tabX + 12, curY, tabW - 24, 88, 10);
    stageCard.lineStyle(1.5, 0xd4a359, 0.9).strokeRoundedRect(tabX + 12, curY, tabW - 24, 88, 10);
    stageCard.setDepth(6);
    this.view.add(stageCard);

    let roleName = "婴儿启蒙期";
    let roleDesc = "在父母温暖怀抱中健康成长，探索周围的未知世界。";
    let orgName = "家庭大院生活";

    if (this.isEsportsProPlayer) {
      roleName = "中国初代电竞职业选手 · 战队队长";
      roleDesc = "代表国家征战世界总决赛，载入中国电竞先驱名人堂！";
      orgName = "国家电子竞技职业俱乐部集训队";
    } else if (this.selectedSchool) {
      roleName = this.selectedSchool.roleTitle;
      roleDesc = this.selectedSchool.futurePath;
      orgName = this.selectedSchool.name;
    } else if (stats.age >= 3 && stats.age < 6) {
      roleName = "托儿所幼童班";
      roleDesc = "在国营机床厂办托儿所就读，性格活泼乖巧，表现优异。";
      orgName = "机床厂职工托儿所";
    } else if (stats.age >= 6 && stats.age < 12) {
      roleName = "重点小学少先队员";
      roleDesc = "佩戴红领巾，担任班级文体委员，各科成绩优异。";
      orgName = "县直属实验第一小学";
    } else if (stats.age >= 12 && stats.age < 15) {
      roleName = "初中毕业班备考中考生";
      roleDesc = "备战中考分流，冲刺重点高中或包分配重点中专。";
      orgName = "市重点初级中学";
    } else if (stats.age >= 15 && stats.age < 18) {
      roleName = "省重点高中尖子生";
      roleDesc = "文理兼修，全校模拟考名列前茅，目标直指全国顶尖学府！";
      orgName = "省立第一高级中学实验班";
    } else if (stats.age >= 18 && stats.age < 22) {
      roleName = "全国重点大学本科生";
      roleDesc = "主修计算机与经管双学位，斩获国家奖学金，签约名企校招。";
      orgName = "全国重点综合大学";
    } else if (stats.age >= 22) {
      roleName = "新时代骨干业务主管";
      roleDesc = "独立担纲重大商业与技术项目，深受领导器重与同事信赖。";
      orgName = "跨国高新技术实业集团";
    }

    const stageTitle = this.add.text(tabX + 24, curY + 12, `【当前身份】${roleName}`, {
      fontFamily: FONT_FAMILY,
      fontSize: "16px",
      fontStyle: "bold",
      color: "#ffd8a1",
    }).setDepth(7);
    this.view.add(stageTitle);

    const orgText = this.add.text(tabX + 24, curY + 36, `所属组织：${orgName}`, {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: "#8be5d1",
    }).setDepth(7);
    this.view.add(orgText);

    const descText = this.add.text(tabX + 24, curY + 58, roleDesc, {
      fontFamily: FONT_FAMILY,
      fontSize: "12px",
      color: "#cbd5e1",
      wordWrap: { width: tabW - 48, useAdvancedWrap: true },
    }).setDepth(7);
    this.view.add(descText);

    curY += 96;

    // 2. 学科/职业五维综合能力评定
    const abilityCard = this.add.graphics();
    abilityCard.fillStyle(0x0c202a, 0.98).fillRoundedRect(tabX + 12, curY, tabW - 24, 168, 10);
    abilityCard.lineStyle(1.5, 0x274955, 0.9).strokeRoundedRect(tabX + 12, curY, tabW - 24, 168, 10);
    abilityCard.setDepth(6);
    this.view.add(abilityCard);

    const abTitle = this.add.text(tabX + 24, curY + 10, `📊 综合素养与能力雷达评定`, {
      fontFamily: FONT_FAMILY,
      fontSize: "13.5px",
      fontStyle: "bold",
      color: "#ffffff",
    }).setDepth(7);
    this.view.add(abTitle);

    const abilities = [
      { name: "文学与语言表达", val: Math.min(100, stats.intelligence + 10), color: 0x4299e1 },
      { name: "数理逻辑与分析", val: Math.min(100, stats.intelligence + 15), color: 0x38bdf8 },
      { name: "体魄体能与耐力", val: Math.min(100, stats.health + 5), color: 0xf87171 },
      { name: "社交交往与人脉", val: Math.min(100, stats.charm + 10), color: 0xf472b6 },
      { name: "时代见识与格局", val: Math.min(100, 60 + stats.age * 2), color: 0xfbbf24 },
    ];

    abilities.forEach((ab, i) => {
      const ay = curY + 34 + i * 25;
      const abName = this.add.text(tabX + 24, ay, ab.name, {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: "#cbd5e1",
      }).setDepth(7);
      this.view.add(abName);

      // 进度槽
      const barX = tabX + 150;
      const barW = 140;
      abilityCard.fillStyle(0x1a2d36, 1).fillRoundedRect(barX, ay + 2, barW, 9, 4);
      abilityCard.fillStyle(ab.color, 1).fillRoundedRect(barX, ay + 2, barW * (ab.val / 100), 9, 4);

      const valT = this.add.text(barX + barW + 12, ay - 1, `${ab.val}分`, {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        fontStyle: "bold",
        color: "#ffffff",
      }).setDepth(7);
      this.view.add(valT);
    });

    curY += 176;

    // 3. 发展目标与成长指引
    const goalCard = this.add.graphics();
    goalCard.fillStyle(0x0e2430, 0.98).fillRoundedRect(tabX + 12, curY, tabW - 24, 114, 10);
    goalCard.lineStyle(1.5, 0x38bdf8, 0.8).strokeRoundedRect(tabX + 12, curY, tabW - 24, 114, 10);
    goalCard.setDepth(6);
    this.view.add(goalCard);

    const goalTitle = this.add.text(tabX + 24, curY + 10, `🎯 当前阶段成长发展指引`, {
      fontFamily: FONT_FAMILY,
      fontSize: "13.5px",
      fontStyle: "bold",
      color: "#38bdf8",
    }).setDepth(7);
    this.view.add(goalTitle);

    const guideTips = [
      "1. 每年在【🗺️ 活动】前往【新华书店与图书馆】自习可大幅提升智力与成绩；",
      "2. 前往【工人文化宫】与【人民公园】锻炼可保证充沛健康，避免生病风险；",
      "3. 在【👥 关系】中保持与父母良好亲密，可获得更多支持与压岁零花钱。",
    ];

    guideTips.forEach((tip, ti) => {
      const gt = this.add.text(tabX + 24, curY + 34 + ti * 24, tip, {
        fontFamily: FONT_FAMILY,
        fontSize: "11.5px",
        color: "#e2e8f0",
        wordWrap: { width: tabW - 48, useAdvancedWrap: true },
      }).setDepth(7);
      this.view.add(gt);
    });

    curY += 122;

    // 4. 高中文理分科与高考大考高光卡片 (16~18岁)
    if (stats.age >= 16 && stats.age <= 18) {
      const isGaokaoAge = stats.age === 18;
      const gaokaoCard = this.add.graphics();
      gaokaoCard.fillStyle(isGaokaoAge ? 0x2e1a05 : 0x0a1d2e, 0.98).fillRoundedRect(tabX + 12, curY, tabW - 24, 62, 8);
      gaokaoCard.lineStyle(1.5, isGaokaoAge ? 0xf59e0b : 0x38bdf8, 1).strokeRoundedRect(tabX + 12, curY, tabW - 24, 62, 8);
      gaokaoCard.setDepth(6);
      this.view.add(gaokaoCard);

      const gIcon = this.add.text(tabX + 34, curY + 31, isGaokaoAge ? "📜" : "🎓", { fontSize: "24px" }).setOrigin(0.5).setDepth(7);
      this.view.add(gIcon);

      const gTitle = this.add.text(
        tabX + 54,
        curY + 11,
        isGaokaoAge ? "【📜 全国统一普通高等学校招生考试】决战高考" : "【🎓 高一学年结束 · 文理分科仪式】",
        {
          fontFamily: FONT_FAMILY,
          fontSize: "13px",
          fontStyle: "bold",
          color: isGaokaoAge ? "#fbbf24" : "#90cdf4",
        }
      ).setDepth(7);
      this.view.add(gTitle);

      const gDesc = this.add.text(
        tabX + 54,
        curY + 34,
        isGaokaoAge
          ? "满分750分真题大考 · 语数英+文理综 · 揭榜全省排位与高校录取 ▶"
          : "文科班(史地政) vs 理科班(物化生) · 抉择人生命运十字路口 ▶",
        {
          fontFamily: FONT_FAMILY,
          fontSize: "10.5px",
          color: isGaokaoAge ? "#fef08a" : "#cbd5e1",
        }
      ).setDepth(7);
      this.view.add(gDesc);

      const hitG = this.add.rectangle(tabX + tabW / 2, curY + 31, tabW - 24, 62, 0x000000, 0);
      hitG.setInteractive({ useHandCursor: true }).setDepth(8);
      hitG.on("pointerdown", () => {
        this.gaokaoInitialStage = isGaokaoAge ? "exam" : "track_selection";
        this.activeModal = "gaokao";
        this.render();
      });
      this.view.add(hitG);

      curY += 68;
    }

    // 5. 电竞职业入口卡片
    const esportsEntryCard = this.add.graphics();
    esportsEntryCard.fillStyle(0x0a2620, 0.98).fillRoundedRect(tabX + 12, curY, tabW - 24, 58, 8);
    esportsEntryCard.lineStyle(1.5, 0x34d399, 0.9).strokeRoundedRect(tabX + 12, curY, tabW - 24, 58, 8);
    esportsEntryCard.setDepth(6);
    this.view.add(esportsEntryCard);

    const eeIcon = this.add.text(tabX + 34, curY + 29, "🎮", { fontSize: "24px" }).setOrigin(0.5).setDepth(7);
    this.view.add(eeIcon);

    const eeTitle = this.add.text(tabX + 54, curY + 10, "【职业电竞战队基地】开启职业选手生涯", {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: "#34d399",
    }).setDepth(7);
    this.view.add(eeTitle);

    const eeDesc = this.add.text(tabX + 54, curY + 32, "签约 LDL/LPL 豪门俱乐部 · 天梯排位冲分 · 正式出战大赛 ▶", {
      fontFamily: FONT_FAMILY,
      fontSize: "10.5px",
      color: "#a7f3d0",
    }).setDepth(7);
    this.view.add(eeDesc);

    const hitEntry = this.add.rectangle(tabX + tabW / 2, curY + 29, tabW - 24, 58, 0x000000, 0);
    hitEntry.setInteractive({ useHandCursor: true }).setDepth(8);
    hitEntry.on("pointerdown", () => {
      this.devTabMode = "esports";
      this.render();
    });
    this.view.add(hitEntry);
  }

  // ==========================================
  // 3.4.1 电竞职业路线专属交互展台
  // ==========================================
  private renderEsportsCareerDevelopmentPanel(
    tabX: number,
    tabY: number,
    tabW: number,
    tabH: number,
    s: GameRuntimeSnapshot,
  ): void {
    const stats = this.getEffectiveStats(s);
    const sys = this.esportsCareerSys;
    const st = sys.state;

    // 默认确保有签约合同与俱乐部
    if (!st.currentContract) {
      st.currentContract = {
        teamId: "team_young_miracles",
        teamName: "Young Miracles (YM 电竞黄埔军校)",
        teamTier: "T4_academy",
        role: "starter",
        roleName: "二队首发中单 · 潜力新秀",
        durationYears: 2,
        monthlyBaseSalary: 15000,
        sponsorshipShareRate: 0.2,
        streamingShareRate: 0.35,
        prizePoolShareRate: 0.3,
        buyoutFee: 1500000,
        signingBonus: 30000,
        estimatedAnnualTotal: 250000,
      };
      st.teamName = "Young Miracles (YM 电竞黄埔军校)";
      st.isSignedPro = true;
    }

    const contract = st.currentContract;
    const isLDL = contract.teamId.includes("young_miracles") || contract.teamTier === "T4_academy";
    const leagueName = isLDL ? "LDL 次级发展联赛" : "LPL 顶级职业联赛";
    const leagueBadge = isLDL ? "[LDL 次级发展]" : "[LPL 顶级职业]";
    const leagueBadgeColor = isLDL ? 0xf59e0b : 0x06b6d4;
    const teamBadgeIcon = isLDL
      ? "🦅"
      : contract.teamName.includes("BLG")
      ? "⚡"
      : contract.teamName.includes("EDG")
      ? "🛡️"
      : contract.teamName.includes("RNG")
      ? "👑"
      : "⚔️";

    let curY = tabY + 54;

    // 1. 当前所属联赛与俱乐部徽标卡片 (高度 84)
    const clubCard = this.add.graphics();
    clubCard.fillStyle(0x0c202a, 0.98).fillRoundedRect(tabX + 12, curY, tabW - 24, 84, 10);
    clubCard.lineStyle(1.5, 0xd4a359, 0.9).strokeRoundedRect(tabX + 12, curY, tabW - 24, 84, 10);
    clubCard.setDepth(6);
    this.view.add(clubCard);

    // 战队徽标圆形背景
    const badgeBg = this.add.graphics();
    badgeBg.fillStyle(leagueBadgeColor, 0.2).fillCircle(tabX + 38, curY + 42, 22);
    badgeBg.lineStyle(1.5, leagueBadgeColor, 0.9).strokeCircle(tabX + 38, curY + 42, 22);
    badgeBg.setDepth(7);
    this.view.add(badgeBg);

    const badgeText = this.add.text(tabX + 38, curY + 42, teamBadgeIcon, {
      fontSize: "22px",
    }).setOrigin(0.5).setDepth(8);
    this.view.add(badgeText);

    // 战队名与联赛
    const teamTitle = this.add.text(tabX + 68, curY + 12, `${contract.teamName.split(" ")[0]} 战队`, {
      fontFamily: FONT_FAMILY,
      fontSize: "15px",
      fontStyle: "bold",
      color: "#ffd8a1",
    }).setDepth(7);
    this.view.add(teamTitle);

    const leagueTag = this.add.text(tabX + tabW - 24, curY + 14, leagueBadge, {
      fontFamily: FONT_FAMILY,
      fontSize: "11px",
      fontStyle: "bold",
      color: isLDL ? "#f59e0b" : "#38bdf8",
    }).setOrigin(1, 0).setDepth(7);
    this.view.add(leagueTag);

    const roleText = this.add.text(tabX + 68, curY + 34, `身份：${contract.roleName} · 阶段：常规赛争冠期`, {
      fontFamily: FONT_FAMILY,
      fontSize: "12px",
      fontStyle: "bold",
      color: "#8be5d1",
    }).setDepth(7);
    this.view.add(roleText);

    const salaryText = this.add.text(
      tabX + 68,
      curY + 54,
      `月薪: ¥${contract.monthlyBaseSalary.toLocaleString()} · 违约金: ¥${(contract.buyoutFee / 10000).toFixed(0)}万 · 赞助分成: ${(contract.sponsorshipShareRate * 100).toFixed(0)}%`,
      {
        fontFamily: FONT_FAMILY,
        fontSize: "10.5px",
        color: "#94a3b8",
      },
    ).setDepth(7);
    this.view.add(salaryText);

    curY += 92;

    // 2. 当前战绩积分榜卡片 (高度 68)
    const standingCard = this.add.graphics();
    standingCard.fillStyle(0x0a1a24, 0.98).fillRoundedRect(tabX + 12, curY, tabW - 24, 68, 10);
    standingCard.lineStyle(1.5, 0x38bdf8, 0.8).strokeRoundedRect(tabX + 12, curY, tabW - 24, 68, 10);
    standingCard.setDepth(6);
    this.view.add(standingCard);

    // 计算战绩
    const matches = st.regularSeasonMatches;
    const wins = matches.length > 0 ? matches.filter((m) => m.isWin).length : 12;
    const losses = matches.length > 0 ? matches.filter((m) => !m.isWin).length : 3;
    const totalG = wins + losses;
    const winRate = totalG > 0 ? ((wins / totalG) * 100).toFixed(1) : "80.0";
    const netPoints = wins * 2 - losses;
    const rankNum = Math.max(1, 16 - wins);

    const standingTitle = this.add.text(tabX + 24, curY + 10, `🏆 ${leagueName} · 常规赛战绩积分榜`, {
      fontFamily: FONT_FAMILY,
      fontSize: "12.5px",
      fontStyle: "bold",
      color: "#38bdf8",
    }).setDepth(7);
    this.view.add(standingTitle);

    const standColW = (tabW - 48) / 4;
    const items = [
      { label: "战绩场次", val: `${wins}胜 ${losses}负`, color: "#ffd8a1" },
      { label: "胜率", val: `${winRate}%`, color: "#34d399" },
      { label: "净胜分", val: `+${netPoints > 0 ? netPoints : 0}`, color: "#fbbf24" },
      { label: "联赛排名", val: `第 ${rankNum} 名`, color: "#f87171" },
    ];

    items.forEach((it, idx) => {
      const ix = tabX + 24 + idx * standColW;
      const lT = this.add.text(ix, curY + 30, it.label, {
        fontFamily: FONT_FAMILY,
        fontSize: "10.5px",
        color: "#94a3b8",
      }).setDepth(7);
      this.view.add(lT);

      const vT = this.add.text(ix, curY + 46, it.val, {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        fontStyle: "bold",
        color: it.color,
      }).setDepth(7);
      this.view.add(vT);
    });

    curY += 76;

    // 3. 选手五维雷达图与疲劳/伤病健康状态条 (高度 180)
    const radarCard = this.add.graphics();
    radarCard.fillStyle(0x0c202a, 0.98).fillRoundedRect(tabX + 12, curY, tabW - 24, 180, 10);
    radarCard.lineStyle(1.5, 0x274955, 0.9).strokeRoundedRect(tabX + 12, curY, tabW - 24, 180, 10);
    radarCard.setDepth(6);
    this.view.add(radarCard);

    const cardTitle = this.add.text(tabX + 24, curY + 10, `📊 选手五维战力雷达与健康负荷`, {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: "#ffffff",
    }).setDepth(7);
    this.view.add(cardTitle);

    // 左侧五维雷达图绘制
    const rCx = tabX + 88;
    const rCy = curY + 102;
    const rMax = 44;
    const radarG = this.add.graphics();
    radarG.setDepth(7);
    this.view.add(radarG);

    // 绘制 2 层多边形参考网格与 5 条轴线
    [0.5, 1.0].forEach((ratio) => {
      radarG.lineStyle(1, 0x1d3a48, 0.8);
      const points: Phaser.Math.Vector2[] = [];
      for (let i = 0; i < 5; i++) {
        const ang = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        const px = rCx + Math.cos(ang) * (rMax * ratio);
        const py = rCy + Math.sin(ang) * (rMax * ratio);
        points.push(new Phaser.Math.Vector2(px, py));
      }
      points.push(points[0]);
      radarG.strokePoints(points);
    });

    // 轴线
    for (let i = 0; i < 5; i++) {
      const ang = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      radarG.lineStyle(1, 0x1a3340, 0.9);
      radarG.lineBetween(rCx, rCy, rCx + Math.cos(ang) * rMax, rCy + Math.sin(ang) * rMax);
    }

    // 选手五维属性
    const pStats = st.playerStats;
    const talent = sys.calculateTalentScore();
    const statVals = [
      { name: "微操", val: talent.effectiveMechanics },
      { name: "反应", val: talent.effectiveReaction },
      { name: "大局", val: pStats.gameSense },
      { name: "抗压", val: pStats.mentality },
      { name: "协作", val: pStats.teamwork },
    ];

    // 绘制选手数据多边形
    const valPoints: Phaser.Math.Vector2[] = [];
    statVals.forEach((sv, i) => {
      const ang = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const r = Math.max(10, Math.min(rMax, (sv.val / 100) * rMax));
      const vx = rCx + Math.cos(ang) * r;
      const vy = rCy + Math.sin(ang) * r;
      valPoints.push(new Phaser.Math.Vector2(vx, vy));

      // 顶点文字标签
      const lx = rCx + Math.cos(ang) * (rMax + 12);
      const ly = rCy + Math.sin(ang) * (rMax + 10);
      const sT = this.add.text(lx, ly, `${sv.name}${sv.val}`, {
        fontFamily: FONT_FAMILY,
        fontSize: "9.5px",
        fontStyle: "bold",
        color: "#94a3b8",
      }).setOrigin(0.5).setDepth(8);
      this.view.add(sT);
    });

    // 填充多边形
    radarG.fillStyle(0x10b981, 0.35);
    radarG.fillPoints(valPoints, true);
    radarG.lineStyle(2, 0x34d399, 1);
    radarG.strokePoints(valPoints, true);

    // 顶点发光小圆点
    valPoints.forEach((p) => {
      radarG.fillStyle(0xfde047, 1);
      radarG.fillCircle(p.x, p.y, 2.5);
    });

    // 右侧健康负荷看板
    const rightX = tabX + 175;
    const rightW = tabW - 195;

    // 评级徽章
    const ratingBg = this.add.graphics();
    ratingBg.fillStyle(0x1a2e3b, 1).fillRoundedRect(rightX, curY + 34, rightW, 26, 6);
    ratingBg.lineStyle(1.2, 0xd4a359, 0.9).strokeRoundedRect(rightX, curY + 34, rightW, 26, 6);
    ratingBg.setDepth(7);
    this.view.add(ratingBg);

    const ratingText = this.add.text(rightX + rightW / 2, curY + 47, `战力: ${talent.overallRating}分 · 【${talent.tierGrade}级王牌】`, {
      fontFamily: FONT_FAMILY,
      fontSize: "11px",
      fontStyle: "bold",
      color: "#ffd8a1",
    }).setOrigin(0.5).setDepth(8);
    this.view.add(ratingText);

    // 疲劳状态条
    const fatigue = st.physiology.fatigue;
    const fatColor = fatigue > 75 ? 0xef4444 : fatigue > 45 ? 0xf59e0b : 0x10b981;
    const fatLabel = this.add.text(rightX, curY + 68, `疲劳负荷: ${fatigue}/100 (${fatigue > 60 ? "重度疲劳" : "状态良好"})`, {
      fontFamily: FONT_FAMILY,
      fontSize: "11px",
      color: "#cbd5e1",
    }).setDepth(7);
    this.view.add(fatLabel);

    const fatBarBg = this.add.graphics();
    fatBarBg.fillStyle(0x1e293b, 1).fillRoundedRect(rightX, curY + 84, rightW, 8, 4);
    fatBarBg.fillStyle(fatColor, 1).fillRoundedRect(rightX, curY + 84, rightW * (fatigue / 100), 8, 4);
    fatBarBg.setDepth(7);
    this.view.add(fatBarBg);

    // 心理抗压状态条
    const pressure = st.physiology.mentalPressure;
    const pressLabel = this.add.text(rightX, curY + 98, `心态抗压: ${pressure}/100 (大心脏)`, {
      fontFamily: FONT_FAMILY,
      fontSize: "11px",
      color: "#cbd5e1",
    }).setDepth(7);
    this.view.add(pressLabel);

    const pressBarBg = this.add.graphics();
    pressBarBg.fillStyle(0x1e293b, 1).fillRoundedRect(rightX, curY + 114, rightW, 8, 4);
    pressBarBg.fillStyle(0x38bdf8, 1).fillRoundedRect(rightX, curY + 114, rightW * (pressure / 100), 8, 4);
    pressBarBg.setDepth(7);
    this.view.add(pressBarBg);

    // 伤病健康状态胶囊
    const injuries = st.physiology.injuries;
    const hasInjury = injuries.length > 0;
    const injText = hasInjury ? `🔴 职业伤病: ${injuries[0].name}` : `🟢 身体健康 · 巅峰状态`;

    const injG = this.add.graphics();
    injG.fillStyle(hasInjury ? 0x7f1d1d : 0x064e3b, 0.9).fillRoundedRect(rightX, curY + 130, rightW, 26, 6);
    injG.lineStyle(1, hasInjury ? 0xf87171 : 0x34d399, 0.9).strokeRoundedRect(rightX, curY + 130, rightW, 26, 6);
    injG.setDepth(7);
    this.view.add(injG);

    const injLabel = this.add.text(rightX + rightW / 2, curY + 143, injText, {
      fontFamily: FONT_FAMILY,
      fontSize: "10.5px",
      fontStyle: "bold",
      color: hasInjury ? "#fca5a5" : "#6ee7b7",
    }).setOrigin(0.5).setDepth(8);
    this.view.add(injLabel);

    curY += 188;

    // 4. 核心功能操作 4 大按钮 (2x2 网格)
    const btnW = (tabW - 32) / 2;
    const btnH = 44;

    const actionBtns = [
      {
        id: "train_rank",
        label: "🎮 排位训练冲分",
        desc: "天梯Rank · 涨胜点提微操",
        color: 0x0284c7,
        strokeColor: 0x38bdf8,
        handler: () => {
          const res = sys.trainRankMatch();
          this.lastRankTrainingResult = res.logText || "排位冲分完成！";
          this.render();
        },
      },
      {
        id: "medical_care",
        label: "🏥 队医理疗与抗压",
        desc: "推拿针灸 · 清空疲劳伤病",
        color: 0x059669,
        strokeColor: 0x34d399,
        handler: () => {
          const res = sys.receiveTherapy("acupuncture");
          this.lastRankTrainingResult = res.narrative;
          this.render();
        },
      },
      {
        id: "transfer_contract",
        label: "📋 商谈续约/转会",
        desc: "晋级LPL顶级豪门 · 拿高薪",
        color: 0xb45309,
        strokeColor: 0xfbbf24,
        handler: () => {
          if (isLDL) {
            // 从 YM 转会至 BLG
            st.currentContract = {
              teamId: "team_blg",
              teamName: "Bilibili Gaming (BLG 哔哩哔哩)",
              teamTier: "T1_elite",
              role: "starter",
              roleName: "一队首发核心中单",
              durationYears: 2,
              monthlyBaseSalary: 85000,
              sponsorshipShareRate: 0.4,
              streamingShareRate: 0.6,
              prizePoolShareRate: 0.5,
              buyoutFee: 15000000,
              signingBonus: 100000,
              estimatedAnnualTotal: 1500000,
            };
            st.teamName = "Bilibili Gaming (BLG 哔哩哔哩)";
            this.accumulatedYearBonus.cash += 100000;
            this.lastRankTrainingResult = "🎉 轰动转会期！你正式以顶级核心身份转会加盟【LPL · BLG 战队】，获得签约签字费 ¥100,000 元！";
          } else {
            // 在顶级联赛续约为建队基石
            if (st.currentContract) {
              st.currentContract.monthlyBaseSalary += 20000;
              st.currentContract.roleName = "建队基石 · 核心王牌";
            }
            this.accumulatedYearBonus.cash += 200000;
            this.lastRankTrainingResult = "👑 豪门锁定！俱乐部以建队基石顶薪与你续约，月薪提升至 ¥105,000，签字奖励 ¥200,000 元！";
          }
          this.render();
        },
      },
      {
        id: "play_match",
        label: "⚔️ 出战下一轮正式赛",
        desc: "战术BP对决 · 争夺奖金积分",
        color: 0xdc2626,
        strokeColor: 0xf87171,
        handler: () => {
          this.startEsportsMatchSession();
          this.activeModal = "esports_match";
          this.render();
        },
      },
    ];

    actionBtns.forEach((btn, bIdx) => {
      const bx = tabX + 12 + (bIdx % 2) * (btnW + 8);
      const by = curY + Math.floor(bIdx / 2) * (btnH + 8);

      const bG = this.add.graphics();
      bG.fillStyle(btn.color, 0.95).fillRoundedRect(bx, by, btnW, btnH, 8);
      bG.lineStyle(1.5, btn.strokeColor, 1).strokeRoundedRect(bx, by, btnW, btnH, 8);
      bG.setDepth(6);
      this.view.add(bG);

      const bT = this.add.text(bx + btnW / 2, by + 14, btn.label, {
        fontFamily: FONT_FAMILY,
        fontSize: "12.5px",
        fontStyle: "bold",
        color: "#ffffff",
      }).setOrigin(0.5).setDepth(7);
      this.view.add(bT);

      const bDesc = this.add.text(bx + btnW / 2, by + 30, btn.desc, {
        fontFamily: FONT_FAMILY,
        fontSize: "9.5px",
        color: "#e2e8f0",
      }).setOrigin(0.5).setDepth(7);
      this.view.add(bDesc);

      const hit = this.add.rectangle(bx + btnW / 2, by + btnH / 2, btnW, btnH, 0x000000, 0);
      hit.setInteractive({ useHandCursor: true }).setDepth(8);
      hit.on("pointerdown", () => btn.handler());
      this.view.add(hit);
    });

    curY += 108;

    // 底部动态日志或提示反馈框
    const logBox = this.add.graphics();
    logBox.fillStyle(0x0f232e, 0.98).fillRoundedRect(tabX + 12, curY, tabW - 24, 48, 8);
    logBox.lineStyle(1, 0x3d606d, 0.8).strokeRoundedRect(tabX + 12, curY, tabW - 24, 48, 8);
    logBox.setDepth(6);
    this.view.add(logBox);

    const logMsg = this.lastRankTrainingResult || "💡 职业战队提示：出战比赛前请保持疲劳在40以下；多参与天梯排位冲击王者，可大幅提高身价与顶级豪门签约机会！";
    const logT = this.add.text(tabX + 22, curY + 8, logMsg, {
      fontFamily: FONT_FAMILY,
      fontSize: "10.5px",
      color: "#ffd8a1",
      wordWrap: { width: tabW - 44, useAdvancedWrap: true },
    }).setDepth(7);
    this.view.add(logT);
  }

  // ==========================================
  // 3.5 资产 Tab：财富看板与老物件图鉴馆切页
  // ==========================================
  private renderAssetsTab(s: GameRuntimeSnapshot): void {
    const tabX = 14;
    const tabY = 128;
    const tabW = 362;
    const tabH = 620;

    const stats = this.getEffectiveStats(s);

    const tabBg = this.add.graphics();
    tabBg.fillStyle(0x071319, 0.98).fillRoundedRect(tabX, tabY, tabW, tabH, 14);
    tabBg.lineStyle(1.5, 0xd4a359, 0.9).strokeRoundedRect(tabX, tabY, tabW, tabH, 14);
    tabBg.setDepth(5);
    this.view.add(tabBg);

    // 顶部标题
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x231a0e, 0.98).fillRoundedRect(tabX + 12, tabY + 12, tabW - 24, 38, 8);
    headerBg.lineStyle(1.5, 0xd4a359, 1).strokeRoundedRect(tabX + 12, tabY + 12, tabW - 24, 38, 8);
    headerBg.setDepth(6);
    this.view.add(headerBg);

    const title = this.add.text(tabX + 24, tabY + 22, `💼 家族总净资产与时代财富展台`, {
      fontFamily: FONT_FAMILY,
      fontSize: "15px",
      fontStyle: "bold",
      color: "#ffd8a1",
    }).setDepth(7);
    this.view.add(title);

    let curY = tabY + 58;

    // 1. 家族总净资产像素总览看板
    const year = 1978 + stats.age;
    const netAssets = this.eraAssetsSys.calculateTotalNetAssets(year, stats.cashYuan);
    const moneyCard = this.add.graphics();
    moneyCard.fillStyle(0x0c202a, 0.98).fillRoundedRect(tabX + 12, curY, tabW - 24, 88, 10);
    moneyCard.lineStyle(1.5, 0xd4a359, 0.9).strokeRoundedRect(tabX + 12, curY, tabW - 24, 88, 10);
    moneyCard.setDepth(6);
    this.view.add(moneyCard);

    const cashIcon = this.add.text(tabX + 34, curY + 28, "👑", { fontSize: "28px" }).setOrigin(0.5).setDepth(7);
    this.view.add(cashIcon);

    const cashTitle = this.add.text(tabX + 58, curY + 12, `家族总净资产: ¥${netAssets.totalNetWorthYuan.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 元`, {
      fontFamily: FONT_FAMILY,
      fontSize: "14.5px",
      fontStyle: "bold",
      color: "#ffd8a1",
    }).setDepth(7);
    this.view.add(cashTitle);

    const breakdownText = this.add.text(
      tabX + 58,
      curY + 36,
      `💰流动私房: ¥${stats.cashYuan.toFixed(2)}  🏦储蓄: ¥${netAssets.bankSavingsTotal.toLocaleString()}\n🏠房产估值: ¥${netAssets.housingMarketValueTotal.toLocaleString()}  📈证券: ¥${netAssets.stockMarketValueTotal.toLocaleString()}`,
      {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        color: "#8be5d1",
        lineSpacing: 4,
      },
    ).setDepth(7);
    this.view.add(breakdownText);

    curY += 98;

    // 2. 水浒 108 将卡册馆入口
    const shuihuCount = this.collectedShuihuCardIds.size;
    const albumCard = this.add.graphics();
    albumCard.fillStyle(0x1a2e38, 0.98).fillRoundedRect(tabX + 12, curY, tabW - 24, 58, 8);
    albumCard.lineStyle(1.5, 0xf59e0b, 0.9).strokeRoundedRect(tabX + 12, curY, tabW - 24, 58, 8);
    albumCard.setDepth(6);
    this.view.add(albumCard);

    const shuihuIcon = this.add.text(tabX + 32, curY + 29, "🎴", { fontSize: "24px" }).setOrigin(0.5).setDepth(7);
    this.view.add(shuihuIcon);

    const shuihuTitle = this.add.text(tabX + 54, curY + 12, `水浒108将卡册馆 (已集: ${shuihuCount}/108) ▶`, {
      fontFamily: FONT_FAMILY,
      fontSize: "13.5px",
      fontStyle: "bold",
      color: "#ffd8a1",
    }).setDepth(7);
    this.view.add(shuihuTitle);

    const shuihuSub = this.add.text(tabX + 54, curY + 34, "全套天罡地煞梁山群雄卡 · 收集羁绊解锁永久属性", {
      fontFamily: FONT_FAMILY,
      fontSize: "10.5px",
      color: "#8be5d1",
    }).setDepth(7);
    this.view.add(shuihuSub);

    const albumHit = this.add.rectangle(tabX + (tabW - 24) / 2 + 12, curY + 29, tabW - 24, 58, 0x000000, 0);
    albumHit.setInteractive({ useHandCursor: true }).setDepth(8);
    albumHit.on("pointerdown", () => {
      this.activeModal = "shuihu_album";
      this.render();
    });
    this.view.add(albumHit);

    curY += 68;

    // 3. 时代老物件珍藏展柜 (PixelVintageItemSlot 4列网格)
    const unlockedCount = this.unlockedAssetIds.size;
    const totalCount = Object.keys(VINTAGE_ASSETS_CATALOG).length;

    const museumTitle = this.add.text(tabX + 18, curY, `🏛️ 时代老物件珍藏馆 (已收录: ${unlockedCount} / ${totalCount} 件)`, {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: "#ffd8a1",
    }).setDepth(7);
    this.view.add(museumTitle);

    curY += 22;

    const unlockedList: VintageAsset[] = [];
    this.unlockedAssetIds.forEach((id) => {
      const a = VINTAGE_ASSETS_CATALOG[id];
      if (a) unlockedList.push(a);
    });

    const slotSize = 72;
    const slotGap = (tabW - 24 - slotSize * 4) / 3;
    const displaySlots = unlockedList.slice(0, 8);

    displaySlots.forEach((asset, idx) => {
      const row = Math.floor(idx / 4);
      const col = idx % 4;
      const sx = tabX + 12 + col * (slotSize + slotGap);
      const sy = curY + row * (slotSize + 10);

      const quality: "common" | "rare" | "epic" | "legendary" =
        asset.id.includes("lpl") || asset.id.includes("ob_king") || asset.id.includes("optimus")
          ? "legendary"
          : asset.id.includes("radio") || asset.id.includes("cbt") || asset.id.includes("key")
          ? "epic"
          : asset.id.includes("shoes") || asset.id.includes("abacus")
          ? "rare"
          : "common";

      const slot = createPixelVintageItemSlot(this, {
        x: sx,
        y: sy,
        size: slotSize,
        name: asset.name,
        icon: asset.icon,
        quality,
        memoirText: `【${asset.name}】(${asset.yearAcquired}年)\n${asset.description}\n${asset.bonusText}`,
        isUnlocked: true,
        depth: 6,
        onClick: () => {
          this.lastActionResult = {
            title: `品鉴藏品 · ${asset.name}`,
            narrative: `你抚摸着这件${asset.yearAcquired}年获得的珍品：${asset.description}。岁月流转，它依然诉说着昔日的光阴故事。`,
            gainText: asset.bonusText,
          };
          this.activeModal = "action_result";
          this.render();
        },
      });

      this.view.add(slot);
    });

    const gridRows = Math.ceil(Math.min(8, displaySlots.length) / 4);
    curY += gridRows * (slotSize + 10) + 12;

    // 4. 时代房产与代步载具看板 (2列并排)
    const halfW = (tabW - 32) / 2;

    // 房产卡片
    const houseGfx = this.add.graphics();
    houseGfx.fillStyle(0x13232c, 0.98).fillRoundedRect(tabX + 12, curY, halfW, 78, 8);
    houseGfx.lineStyle(1.2, 0x48bb78, 0.8).strokeRoundedRect(tabX + 12, curY, halfW, 78, 8);
    houseGfx.setDepth(6);
    this.view.add(houseGfx);

    const houseTitle = this.add.text(tabX + 22, curY + 10, "🏠 时代房产居所", {
      fontFamily: FONT_FAMILY,
      fontSize: "12px",
      fontStyle: "bold",
      color: "#ffd8a1",
    }).setDepth(7);
    this.view.add(houseTitle);

    const houseInfo = stats.age < 18 ? "家属大院平房 (福利分房)" : stats.age < 25 ? "大学宿舍/青年公寓" : "市区电梯商品房";
    const houseDescText = this.add.text(tabX + 22, curY + 30, `${houseInfo}\n当前估值: ¥${netAssets.housingMarketValueTotal.toLocaleString()}元`, {
      fontFamily: FONT_FAMILY,
      fontSize: "10.5px",
      color: "#8be5d1",
      lineSpacing: 3,
    }).setDepth(7);
    this.view.add(houseDescText);

    // 载具卡片
    const carGfx = this.add.graphics();
    carGfx.fillStyle(0x13232c, 0.98).fillRoundedRect(tabX + 16 + halfW, curY, halfW, 78, 8);
    carGfx.lineStyle(1.2, 0x38bdf8, 0.8).strokeRoundedRect(tabX + 16 + halfW, curY, halfW, 78, 8);
    carGfx.setDepth(6);
    this.view.add(carGfx);

    const carTitle = this.add.text(tabX + 26 + halfW, curY + 10, "🚲 时代代步出行", {
      fontFamily: FONT_FAMILY,
      fontSize: "12px",
      fontStyle: "bold",
      color: "#ffd8a1",
    }).setDepth(7);
    this.view.add(carTitle);

    const vehicleInfo = stats.age < 16 ? "二八大杠自行车" : stats.age < 22 ? "变速山地车/嘉陵摩托" : "大众桑塔纳轿车";
    const carDescText = this.add.text(tabX + 26 + halfW, curY + 30, `${vehicleInfo}\n季养护省精力: +15⚡`, {
      fontFamily: FONT_FAMILY,
      fontSize: "10.5px",
      color: "#38bdf8",
      lineSpacing: 3,
    }).setDepth(7);
    this.view.add(carDescText);
  }

  // ==========================================
  // 4. 底部五大核心导航栏 (全局常驻, Y: 756 ~ 828, H: 72px)
  // ==========================================
  private renderBottomNavigation(s: GameRuntimeSnapshot): void {
    const navY = 756;
    const btnW = 68;
    const btnH = 68;
    const gap = 5;
    const startX = 10;

    const navTabs = [
      { id: "home" as const, icon: "🏠", label: "主页", desc: "大事纪", color: 0xd4a359 },
      { id: "relationships" as const, icon: "👥", label: "关系", desc: "亲友人际", color: 0x76cbb7 },
      { id: "locations" as const, icon: "🗺️", label: "活动", desc: "时代地点", color: 0xf6ad55 },
      { id: "development" as const, icon: "🏫", label: "发展", desc: "学业职场", color: 0x4299e1 },
      { id: "assets" as const, icon: "💼", label: "资产", desc: "物件财富", color: 0x9f7aea },
    ];

    navTabs.forEach((tab, index) => {
      const x = startX + index * (btnW + gap);
      const isSelected = this.activeTab === tab.id;

      const btnG = this.add.graphics();
      btnG.fillStyle(isSelected ? 0x1a3842 : 0x08151b, 0.98).fillRoundedRect(x, navY, btnW, btnH, 10);
      btnG.lineStyle(1.8, isSelected ? 0xffd8a1 : tab.color, isSelected ? 1 : 0.6).strokeRoundedRect(x, navY, btnW, btnH, 10);
      btnG.setDepth(15);
      this.view.add(btnG);

      const icon = this.add.text(x + btnW / 2, navY + 18, tab.icon, {
        fontSize: isSelected ? "22px" : "20px",
      }).setOrigin(0.5).setDepth(16);
      this.view.add(icon);

      const label = this.add.text(x + btnW / 2, navY + 41, tab.label, {
        fontFamily: FONT_FAMILY,
        fontSize: "13.5px",
        fontStyle: "bold",
        color: isSelected ? "#ffd8a1" : "#ffffff",
        padding: { x: 1, y: 1 },
      }).setOrigin(0.5).setDepth(16);
      this.view.add(label);

      const desc = this.add.text(x + btnW / 2, navY + 56, tab.desc, {
        fontFamily: FONT_FAMILY,
        fontSize: "10px",
        fontStyle: "bold",
        color: isSelected ? "#8be5d1" : "#94a3b8",
        padding: { x: 1, y: 1 },
      }).setOrigin(0.5).setDepth(16);
      this.view.add(desc);

      const hit = this.add.rectangle(x + btnW / 2, navY + btnH / 2, btnW, btnH, 0x000000, 0);
      hit.setInteractive({ useHandCursor: true }).setDepth(18);
      hit.on("pointerdown", () => {
        this.activeTab = tab.id;
        this.activeModal = null;
        this.render();
      });
      this.view.add(hit);
    });
  }

  // ==========================================
  // 5. 模态弹窗系统 (Modals)
  // ==========================================
  private renderModal(s: GameRuntimeSnapshot): void {
    // 全屏遮罩
    const modalMask = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.88);
    modalMask.setInteractive().setDepth(20);
    this.view.add(modalMask);

    const isTransitionModal = this.activeModal === "year_transition";
    const isLifeEventModal = this.activeModal === "life_event";
    const isGmDebugModal = this.activeModal === "gm_debug";
    const isLocationDetail = this.activeModal === "location_detail";
    const isActionResult = this.activeModal === "action_result";
    const isEsportsMatch = this.activeModal === "esports_match";
    const isChronicleModal = this.activeModal === "chronicle_archive";
    const isShopModal = this.activeModal === "supply_coop_shop";
    const isMedalModal = this.activeModal === "medal_award";

    const modalX = isEsportsMatch ? 14 : (isTransitionModal || isLifeEventModal || isGmDebugModal || isLocationDetail || isChronicleModal || isShopModal || isMedalModal ? 12 : 18);
    const modalY = isEsportsMatch ? 58 : (isTransitionModal ? 64 : isLifeEventModal ? 90 : isGmDebugModal ? 36 : isLocationDetail ? 80 : isChronicleModal ? 60 : isShopModal ? 70 : isMedalModal ? 140 : 160);
    const modalW = isEsportsMatch ? 362 : (isTransitionModal || isLifeEventModal || isGmDebugModal || isLocationDetail || isChronicleModal || isShopModal || isMedalModal ? 366 : 354);
    const modalH = isEsportsMatch ? 718 : (isTransitionModal ? 624 : isLifeEventModal ? 540 : isGmDebugModal ? 750 : isLocationDetail ? 560 : isChronicleModal ? 660 : isShopModal ? 640 : isMedalModal ? 470 : 380);

    // 模态弹窗底板
    const modalBg = this.add.graphics();
    modalBg.fillStyle(0x0a1d27, 1).fillRoundedRect(modalX, modalY, modalW, modalH, 14);
    modalBg.lineStyle(2, 0xd4a359, 1).strokeRoundedRect(modalX, modalY, modalW, modalH, 14);
    modalBg.setDepth(21);
    this.view.add(modalBg);

    // 关闭按钮 (右上角 X)
    const closeBtn = this.add.text(modalX + modalW - 22, modalY + 18, "✕", {
      fontFamily: FONT_FAMILY,
      fontSize: "20px",
      fontStyle: "bold",
      color: "#ffd8a1",
      padding: { x: 2, y: 2 },
    }).setOrigin(0.5).setDepth(25);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on("pointerdown", () => {
      this.activeModal = null;
      this.selectedLocationId = null;
      this.lastActionResult = null;
      this.pendingSettlement = null;
      this.currentLifeEvent = null;
      this.activeMedalInfo = null;
      this.render();
    });
    this.view.add(closeBtn);

    if (this.activeModal === "gm_debug") {
      this.renderGmDebugModalContent(modalX, modalY, modalW, modalH, s);
    } else if (this.activeModal === "life_event") {
      this.renderLifeEventModalContent(modalX, modalY, modalW, modalH, s);
    } else if (this.activeModal === "year_transition") {
      this.renderYearTransitionModalContent(modalX, modalY, modalW, modalH, s);
    } else if (this.activeModal === "zhuazhou") {
      this.renderZhuazhouModalContent(modalX, modalY, modalW, modalH);
    } else if (this.activeModal === "location_detail") {
      this.renderLocationDetailModalContent(modalX, modalY, modalW, modalH, s);
    } else if (this.activeModal === "action_result") {
      this.renderActionResultModalContent(modalX, modalY, modalW, modalH);
    } else if (this.activeModal === "shuihu_unboxing") {
      this.renderShuihuUnboxingModalContent(modalX, modalY, modalW, modalH);
    } else if (this.activeModal === "shuihu_album") {
      this.renderShuihuAlbumModalContent(modalX, modalY, modalW, modalH);
    } else if (this.activeModal === "card_slap") {
      this.renderCardSlapModalContent(modalX, modalY, modalW, modalH);
    } else if (this.activeModal === "marbles") {
      this.renderMarblesModalContent(modalX, modalY, modalW, modalH);
    } else if (this.activeModal === "exam_quiz") {
      this.renderExamQuizModalContent(modalX, modalY, modalW, modalH);
    } else if (this.activeModal === "zhongkao") {
      this.renderZhongkaoModalContent(modalX, modalY, modalW, modalH);
    } else if (this.activeModal === "esports_match") {
      this.renderEsportsMatchModalContent(modalX, modalY, modalW, modalH);
    } else if (this.activeModal === "birth_config") {
      this.renderBirthConfigModalContent(modalX, modalY, modalW, modalH);
    } else if (this.activeModal === "gaokao") {
      this.renderGaokaoModalContent(modalX, modalY, modalW, modalH);
    } else if (this.activeModal === "romance_detail") {
      this.renderRomanceDetailModalContent(modalX, modalY, modalW, modalH, s);
    } else if (this.activeModal === "fertility_detail") {
      this.renderFertilityModalContent(modalX, modalY, modalW, modalH, s);
    } else if (this.activeModal === "career_detail") {
      this.renderCareerDetailModalContent(modalX, modalY, modalW, modalH, s);
    } else if (this.activeModal === "stock_market") {
      this.renderStockMarketModalContent(modalX, modalY, modalW, modalH);
    } else if (this.activeModal === "bank_finance") {
      this.renderBankFinanceModalContent(modalX, modalY, modalW, modalH);
    } else if (this.activeModal === "chronicle_archive") {
      this.renderChronicleArchiveModalContent(modalX, modalY, modalW, modalH, s);
    } else if (this.activeModal === "supply_coop_shop") {
      this.renderSupplyCoopShopModalContent(modalX, modalY, modalW, modalH, s);
    } else if (this.activeModal === "medal_award") {
      this.renderMedalAwardModalContent(modalX, modalY, modalW, modalH);
    }
  }

  // 红星供销社玻璃柜台实景选购
  private renderSupplyCoopShopModalContent(
    x: number,
    y: number,
    w: number,
    h: number,
    s: GameRuntimeSnapshot,
  ): void {
    const stats = this.getEffectiveStats(s);

    const headerTitle = this.add.text(x + 20, y + 16, "🏪 红星供销社 · 玻璃柜台选购", {
      fontFamily: FONT_FAMILY,
      fontSize: "17px",
      fontStyle: "bold",
      color: "#ffd8a1",
    }).setDepth(23);
    this.view.add(headerTitle);

    const subTitle = this.add.text(
      x + 20,
      y + 40,
      `当前存款: ¥${stats.cashYuan.toFixed(2)} · 各种童年老物件与甜蜜零嘴`,
      {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: "#8be5d1",
      },
    ).setDepth(23);
    this.view.add(subTitle);

    let itemY = y + 68;
    SUPPLY_COOP_CATALOG.forEach((item) => {
      if (itemY > y + h - 60) return;

      const card = this.add.graphics();
      card.fillStyle(0x0e2733, 0.96).fillRoundedRect(x + 14, itemY, w - 28, 76, 8);
      card.lineStyle(1.5, 0xd4a359, 0.8).strokeRoundedRect(x + 14, itemY, w - 28, 76, 8);
      card.setDepth(23);
      this.view.add(card);

      const icon = this.add.text(x + 36, itemY + 36, item.icon, { fontSize: "30px" }).setOrigin(0.5).setDepth(24);
      this.view.add(icon);

      const name = this.add.text(x + 64, itemY + 12, item.name, {
        fontFamily: FONT_FAMILY,
        fontSize: "14px",
        fontStyle: "bold",
        color: "#ffffff",
      }).setDepth(24);
      this.view.add(name);

      const price = this.add.text(x + w - 24, itemY + 12, `¥${item.priceYuan.toFixed(2)}`, {
        fontFamily: FONT_FAMILY,
        fontSize: "14px",
        fontStyle: "bold",
        color: stats.cashYuan >= item.priceYuan ? "#f59e0b" : "#ff7875",
      }).setOrigin(1, 0).setDepth(24);
      this.view.add(price);

      const desc = this.add.text(x + 64, itemY + 34, item.description, {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        color: "#cbd5e1",
        wordWrap: { width: 195, useAdvancedWrap: true },
      }).setDepth(24);
      this.view.add(desc);

      const canAfford = stats.cashYuan >= item.priceYuan;
      const btnG = this.add.graphics();
      btnG.fillStyle(canAfford ? 0xd97706 : 0x334155, 1).fillRoundedRect(x + w - 74, itemY + 38, 56, 26, 6);
      btnG.setDepth(24);
      this.view.add(btnG);

      const btnTxt = this.add.text(x + w - 46, itemY + 51, canAfford ? "买下" : "差钱", {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffffff",
      }).setOrigin(0.5).setDepth(25);
      this.view.add(btnTxt);

      if (canAfford) {
        const hit = this.add.rectangle(x + w - 46, itemY + 51, 60, 30, 0x000000, 0);
        hit.setInteractive({ useHandCursor: true }).setDepth(26);
        hit.on("pointerdown", () => {
          this.accumulatedYearBonus.cash -= item.priceYuan;
          if (item.effect.happiness) this.accumulatedYearBonus.happiness += item.effect.happiness;
          if (item.effect.health) this.accumulatedYearBonus.health += item.effect.health;
          if (item.effect.intelligence) this.accumulatedYearBonus.intelligence += item.effect.intelligence;
          if (item.effect.charm) this.accumulatedYearBonus.charm += item.effect.charm;
          if (item.category === "toy" || item.category === "stationery") {
            if (!this.unlockedAssetIds.has(item.id)) {
              this.unlockedAssetIds.add(item.id);
              if (!VINTAGE_ASSETS_CATALOG[item.id]) {
                VINTAGE_ASSETS_CATALOG[item.id] = {
                  id: item.id,
                  name: item.name,
                  icon: item.icon,
                  category: item.category === "stationery" ? "appliance" : "toy",
                  yearAcquired: s.calendarYear || (1978 + (s.age ?? 0)),
                  description: item.description,
                  bonusText: item.narrative,
                };
              }
            }
          }
          this.spawnFloatingText(x + w / 2, itemY, `${item.icon} 买下${item.name}！`, "#f59e0b");
          this.render();
        });
        this.view.add(hit);
      }

      itemY += 84;
    });
  }

  // 时代金色勋章授奖仪式
  private renderMedalAwardModalContent(x: number, y: number, w: number, h: number): void {
    const medal = this.activeMedalInfo || {
      title: "🏅 时代金星 · 大院孩子王勋章",
      desc: "全大院孩子唯你马首是瞻，不仅声名远扬，更极大磨砺了自信体魄！",
      icon: "👑",
      bonus: "魅力 +10 · 快乐 +10 · 健康 +6",
    };

    const auraG = this.add.graphics();
    auraG.fillStyle(0xd97706, 0.35).fillCircle(x + w / 2, y + 100, 58);
    auraG.lineStyle(3, 0xfbbf24, 0.95).strokeCircle(x + w / 2, y + 100, 58);
    auraG.setDepth(23);
    this.view.add(auraG);

    const medalIcon = this.add.text(x + w / 2, y + 100, medal.icon, { fontSize: "60px" }).setOrigin(0.5).setDepth(24);
    this.view.add(medalIcon);

    this.tweens.add({
      targets: [medalIcon],
      scale: 1.15,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    const titleText = this.add.text(x + w / 2, y + 175, medal.title, {
      fontFamily: FONT_FAMILY,
      fontSize: "17px",
      fontStyle: "bold",
      color: "#fbbf24",
    }).setOrigin(0.5).setDepth(24);
    this.view.add(titleText);

    const descText = this.add.text(x + w / 2, y + 225, medal.desc, {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      lineSpacing: 6,
      align: "center",
      wordWrap: { width: w - 60, useAdvancedWrap: true },
      color: "#ffffff",
    }).setOrigin(0.5).setDepth(24);
    this.view.add(descText);

    const bonusTag = this.add.text(x + w / 2, y + 300, `【荣誉加成】${medal.bonus}`, {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: "#8be5d1",
      backgroundColor: "#13303d",
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(24);
    this.view.add(bonusTag);

    const confirmBtnG = this.add.graphics();
    confirmBtnG.fillStyle(0xd97706, 1).fillRoundedRect(x + 40, y + 360, w - 80, 48, 10);
    confirmBtnG.lineStyle(2, 0xfde68a, 1).strokeRoundedRect(x + 40, y + 360, w - 80, 48, 10);
    confirmBtnG.setDepth(24);
    this.view.add(confirmBtnG);

    const confirmTxt = this.add.text(x + w / 2, y + 384, "✨ 领受时代勋章与荣誉", {
      fontFamily: FONT_FAMILY,
      fontSize: "16px",
      fontStyle: "bold",
      color: "#ffffff",
    }).setOrigin(0.5).setDepth(25);
    this.view.add(confirmTxt);

    const hit = this.add.rectangle(x + w / 2, y + 384, w - 80, 48, 0x000000, 0);
    hit.setInteractive({ useHandCursor: true }).setDepth(26);
    hit.on("pointerdown", () => {
      this.spawnFloatingText(x + w / 2, y + 160, "🌟 时代勋章已载入人生档案！", "#fbbf24");
      this.activeModal = null;
      this.activeMedalInfo = null;
      this.render();
    });
    this.view.add(hit);
  }

  // 地点二级详情与行动交互弹窗内容
  private renderLocationDetailModalContent(x: number, y: number, w: number, h: number, s: GameRuntimeSnapshot): void {
    const loc = LIFE_LOCATIONS_DATABASE.find((l) => l.id === this.selectedLocationId);
    if (!loc) return;

    const stats = this.getEffectiveStats(s);

    // 1. 顶部地点名称与副标
    const title = this.add.text(x + 18, y + 16, `${loc.icon} ${loc.name}`, {
      fontFamily: FONT_FAMILY,
      fontSize: "18px",
      fontStyle: "bold",
      color: "#ffd8a1",
      padding: { x: 2, y: 2 },
    }).setDepth(22);
    this.view.add(title);

    const energyTag = this.add.text(x + w - 46, y + 18, `⚡ 精力: ${stats.availableEnergy}/100`, {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: stats.availableEnergy < 20 ? "#ff7875" : "#8be5d1",
    }).setOrigin(1, 0).setDepth(22);
    this.view.add(energyTag);

    // 2. 地点风貌描述卡片
    const descCard = this.add.graphics();
    descCard.fillStyle(0x0e2430, 0.98).fillRoundedRect(x + 14, y + 46, w - 28, 48, 8);
    descCard.lineStyle(1.2, 0x3d606d, 0.8).strokeRoundedRect(x + 14, y + 46, w - 28, 48, 8);
    descCard.setDepth(22);
    this.view.add(descCard);

    const descText = this.add.text(x + 24, y + 54, `【${loc.subtitle}】\n${loc.description}`, {
      fontFamily: FONT_FAMILY,
      fontSize: "12px",
      color: "#cbd5e1",
      lineSpacing: 3,
      wordWrap: { width: w - 48, useAdvancedWrap: true },
    }).setDepth(23);
    this.view.add(descText);

    // 3. 行动列表
    let actY = y + 102;
    loc.actions.forEach((act) => {
      const card = this.add.graphics();
      card.fillStyle(0x102b38, 0.98).fillRoundedRect(x + 14, actY, w - 28, 76, 10);
      card.lineStyle(1.5, 0xd4a359, 0.9).strokeRoundedRect(x + 14, actY, w - 28, 76, 10);
      card.setDepth(22);
      this.view.add(card);

      const icon = this.add.text(x + 34, actY + 24, act.icon, { fontSize: "24px" }).setOrigin(0.5).setDepth(23);
      this.view.add(icon);

      const name = this.add.text(x + 56, actY + 10, act.name, {
        fontFamily: FONT_FAMILY,
        fontSize: "15px",
        fontStyle: "bold",
        color: "#ffffff",
      }).setDepth(23);
      this.view.add(name);

      const gain = this.add.text(x + 56, actY + 34, `效果: ${act.gainText}`, {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        fontStyle: "bold",
        color: "#8be5d1",
      }).setDepth(23);
      this.view.add(gain);

      const costText = `消耗: ⚡${act.energyCost}点${act.cashCost > 0 ? ` · ¥${act.cashCost.toFixed(2)}` : ""}`;
      const cost = this.add.text(x + 56, actY + 52, costText, {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        color: "#ffd8a1",
      }).setDepth(23);
      this.view.add(cost);

      // 执行按钮
      const canExecute = stats.availableEnergy >= act.energyCost && stats.cashYuan >= act.cashCost;
      const doBtn = this.add.graphics();
      doBtn.fillStyle(canExecute ? 0xb55a3c : 0x334155, 1).fillRoundedRect(x + w - 88, actY + 18, 64, 40, 8);
      doBtn.lineStyle(1.5, canExecute ? 0xffd8a1 : 0x64748b, 1).strokeRoundedRect(x + w - 88, actY + 18, 64, 40, 8);
      doBtn.setDepth(23);
      this.view.add(doBtn);

      const doText = this.add.text(x + w - 56, actY + 38, canExecute ? "执行" : "不足", {
        fontFamily: FONT_FAMILY,
        fontSize: "14px",
        fontStyle: "bold",
        color: canExecute ? "#ffffff" : "#94a3b8",
      }).setOrigin(0.5).setDepth(24);
      this.view.add(doText);

      if (canExecute) {
        const hit = this.add.rectangle(x + w - 56, actY + 38, 64, 40, 0x000000, 0);
        hit.setInteractive({ useHandCursor: true }).setDepth(25);
        hit.on("pointerdown", () => {
          // 扣除精力与金钱
          this.energySpentThisYear += act.energyCost;
          this.accumulatedYearBonus.cash -= act.cashCost;

          // 增加属性
          if (act.effect.health) this.accumulatedYearBonus.health += act.effect.health;
          if (act.effect.intelligence) this.accumulatedYearBonus.intelligence += act.effect.intelligence;
          if (act.effect.charm) this.accumulatedYearBonus.charm += act.effect.charm;
          if (act.effect.happiness) this.accumulatedYearBonus.happiness += act.effect.happiness;
          if (act.effect.cash) this.accumulatedYearBonus.cash += act.effect.cash;

          if (act.unlockAssetId) {
            this.unlockedAssetIds.add(act.unlockAssetId);
          }

          // 记录日志
          this.eventHistoryRecords.unshift({
            title: `前往【${loc.name}】：${act.name}`,
            content: act.narrative,
            tag: `[${act.gainText}]`,
            tagColor: "#8be5d1",
          });

          // 分发到专属特色小游戏
          if (act.customAction === "open_card_slap") {
            this.activeCardSlapGame = new CardSlapMiniGame();
            this.activeModal = "card_slap";
          } else if (act.customAction === "open_marbles") {
            this.activeMarblesGame = new MarblesMiniGame();
            this.activeModal = "marbles";
          } else if (act.customAction === "open_shuihu_unboxing") {
            this.lastDrawnCard = this.drawRandomShuihuCard();
            this.collectedShuihuCardIds.add(this.lastDrawnCard.id);
            this.activeModal = "shuihu_unboxing";
          } else if (act.customAction === "open_exam_quiz") {
            this.activeExamQuizGame = new ExamQuizMiniGame();
            this.activeModal = "exam_quiz";
          } else if (act.customAction === "open_zhongkao") {
            this.activeZhongkao = new ZhongkaoManager();
            this.activeModal = "zhongkao";
          } else if (act.customAction === "open_esports") {
            this.activeEsportsCareer = new EsportsCareerManager();
            this.activeModal = "esports_match";
          } else {
            this.lastActionResult = {
              title: `${loc.icon} ${loc.name} · ${act.name}`,
              narrative: act.narrative,
              gainText: `${act.gainText} (消耗: ⚡${act.energyCost}点${act.cashCost > 0 ? ` · ¥${act.cashCost.toFixed(2)}` : ""})`,
            };
            this.activeModal = "action_result";
          }
          this.render();
        });
        this.view.add(hit);
      }

      actY += 86;
    });
  }

  // 行动即时反馈弹窗内容
  private renderActionResultModalContent(x: number, y: number, w: number, h: number): void {
    const res = this.lastActionResult;
    if (!res) return;

    const title = this.add.text(x + 18, y + 16, "✨ 行动完成与即时收获", {
      fontFamily: FONT_FAMILY,
      fontSize: "17px",
      fontStyle: "bold",
      color: "#ffd8a1",
      padding: { x: 2, y: 2 },
    }).setDepth(22);
    this.view.add(title);

    // 叙事卡片
    const storyBg = this.add.graphics();
    storyBg.fillStyle(0x0e2430, 0.98).fillRoundedRect(x + 14, y + 50, w - 28, 140, 10);
    storyBg.lineStyle(1.5, 0xd4a359, 0.9).strokeRoundedRect(x + 14, y + 50, w - 28, 140, 10);
    storyBg.setDepth(22);
    this.view.add(storyBg);

    const actTitle = this.add.text(x + 24, y + 62, res.title, {
      fontFamily: FONT_FAMILY,
      fontSize: "15px",
      fontStyle: "bold",
      color: "#ffffff",
    }).setDepth(23);
    this.view.add(actTitle);

    const actNarrative = this.add.text(x + 24, y + 90, res.narrative, {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      lineSpacing: 6,
      wordWrap: { width: w - 48, useAdvancedWrap: true },
      color: "#e2e8f0",
    }).setDepth(23);
    this.view.add(actNarrative);

    // 收益条
    const gainBg = this.add.graphics();
    gainBg.fillStyle(0x143440, 0.98).fillRoundedRect(x + 14, y + 204, w - 28, 48, 8);
    gainBg.lineStyle(1.2, 0x8be5d1, 0.9).strokeRoundedRect(x + 14, y + 204, w - 28, 48, 8);
    gainBg.setDepth(22);
    this.view.add(gainBg);

    const gainText = this.add.text(x + 24, y + 218, `🎁 收益结算: ${res.gainText}`, {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: "#8be5d1",
    }).setDepth(23);
    this.view.add(gainText);

    // 确认关闭按钮
    const okBtn = this.add.graphics();
    okBtn.fillStyle(0xb55a3c, 1).fillRoundedRect(x + 14, y + 268, w - 28, 48, 10);
    okBtn.lineStyle(2, 0xffd8a1, 1).strokeRoundedRect(x + 14, y + 268, w - 28, 48, 10);
    okBtn.setDepth(23);
    this.view.add(okBtn);

    const okText = this.add.text(x + w / 2, y + 292, "【 确 定 ▶ 】", {
      fontFamily: FONT_FAMILY,
      fontSize: "15px",
      fontStyle: "bold",
      color: "#ffffff",
    }).setOrigin(0.5).setDepth(24);
    this.view.add(okText);

    const okHit = this.add.rectangle(x + w / 2, y + 292, w - 28, 48, 0x000000, 0);
    okHit.setInteractive({ useHandCursor: true }).setDepth(25);
    okHit.on("pointerdown", () => {
      this.activeModal = null;
      this.lastActionResult = null;
      this.render();
    });
    this.view.add(okHit);
  }

  // 突发生活抉择事件弹窗内容
  private renderLifeEventModalContent(x: number, y: number, w: number, h: number, s: GameRuntimeSnapshot): void {
    const evt = this.currentLifeEvent;
    if (!evt) return;

    // 1. 顶部事件标题
    const title = this.add.text(x + 18, y + 16, `${evt.title}`, {
      fontFamily: FONT_FAMILY,
      fontSize: "17px",
      fontStyle: "bold",
      color: "#ffd8a1",
      padding: { x: 2, y: 2 },
    }).setDepth(22);
    this.view.add(title);

    // 2. 情景叙事卡片
    const storyBg = this.add.graphics();
    storyBg.fillStyle(0x0e2430, 0.98).fillRoundedRect(x + 14, y + 48, w - 28, 104, 10);
    storyBg.lineStyle(1.5, 0x3d606d, 0.8).strokeRoundedRect(x + 14, y + 48, w - 28, 104, 10);
    storyBg.setDepth(22);
    this.view.add(storyBg);

    const storyIcon = this.add.text(x + 32, y + 70, evt.icon, { fontSize: "24px" }).setOrigin(0.5).setDepth(23);
    this.view.add(storyIcon);

    const storyText = this.add.text(x + 50, y + 58, evt.narrative, {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      lineSpacing: 6,
      wordWrap: { width: w - 74, useAdvancedWrap: true },
      color: "#e2e8f0",
      padding: { x: 1, y: 1 },
    }).setDepth(23);
    this.view.add(storyText);

    // 3. 抉择选项列表
    let optY = y + 162;
    evt.options.forEach((opt, idx) => {
      const optBg = this.add.graphics();
      optBg.fillStyle(0x13303d, 0.98).fillRoundedRect(x + 14, optY, w - 28, 98, 10);
      optBg.lineStyle(1.5, 0xd4a359, 0.9).strokeRoundedRect(x + 14, optY, w - 28, 98, 10);
      optBg.setDepth(22);
      this.view.add(optBg);

      const optLabel = this.add.text(x + 24, optY + 12, `选项 ${idx + 1}：${opt.label}`, {
        fontFamily: FONT_FAMILY,
        fontSize: "15px",
        fontStyle: "bold",
        color: "#ffffff",
        padding: { x: 1, y: 1 },
      }).setDepth(23);
      this.view.add(optLabel);

      const optHint = this.add.text(x + 24, optY + 36, `【倾向】${opt.hint}`, {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        fontStyle: "bold",
        color: "#8be5d1",
        padding: { x: 1, y: 1 },
      }).setDepth(23);
      this.view.add(optHint);

      // 选择按钮
      const optBtn = this.add.graphics();
      optBtn.fillStyle(0xb55a3c, 1).fillRoundedRect(x + w - 94, optY + 28, 76, 42, 8);
      optBtn.lineStyle(1.5, 0xffd8a1, 1).strokeRoundedRect(x + w - 94, optY + 28, 76, 42, 8);
      optBtn.setDepth(23);
      this.view.add(optBtn);

      const btnText = this.add.text(x + w - 56, optY + 49, "做出抉择", {
        fontFamily: FONT_FAMILY,
        fontSize: "13px",
        fontStyle: "bold",
        color: "#ffffff",
        padding: { x: 1, y: 1 },
      }).setOrigin(0.5).setDepth(24);
      this.view.add(btnText);

      const hit = this.add.rectangle(x + (w - 28) / 2 + 14, optY + 49, w - 28, 98, 0x000000, 0);
      hit.setInteractive({ useHandCursor: true }).setDepth(25);
      hit.on("pointerdown", () => {
        // 应用效果
        if (opt.effect.happiness) this.accumulatedYearBonus.happiness += opt.effect.happiness;
        if (opt.effect.health) this.accumulatedYearBonus.health += opt.effect.health;
        if (opt.effect.intelligence) this.accumulatedYearBonus.intelligence += opt.effect.intelligence;
        if (opt.effect.charm) this.accumulatedYearBonus.charm += opt.effect.charm;
        if (opt.effect.cash) this.accumulatedYearBonus.cash += opt.effect.cash;

        if (opt.effect.unlockAssetId) {
          this.unlockedAssetIds.add(opt.effect.unlockAssetId);
        }

        if (opt.effect.affinityTarget && opt.effect.affinityDelta) {
          const member = this.familyMembers.find((m) => m.id === opt.effect.affinityTarget);
          if (member) member.affinity = Math.min(100, member.affinity + opt.effect.affinityDelta);
        }

        // 如果是 LOL 时代奇遇事件，额外联动 LOL 生涯管理器状态机与职业选手标记
        if (evt.id.startsWith("lol_")) {
          applyLolNarrativeChoice(evt.id, idx, this.lolCareerMgr);
          if (evt.id === "lol_2011_netbar_debut" && idx === 0) {
            this.isEsportsProPlayer = true;
          } else if (evt.id === "lol_2013_lpl_youth_invite" && idx === 0) {
            this.isEsportsProPlayer = true;
            this.devTabMode = "esports";
          }
        }

        // 记录抉择纪事
        this.eventHistoryRecords.unshift({
          title: `${evt.title}：${opt.label}`,
          content: opt.resultDesc,
          tag: `[${opt.hint}]`,
          tagColor: "#8be5d1",
        });

        this.completedEventIds.add(evt.id);
        this.currentLifeEvent = null;
        this.activeModal = null;
        this.render();
      });
      this.view.add(hit);

      optY += 108;
    });
  }

  // 年度成长结算与跨年过渡弹窗内容
  private renderYearTransitionModalContent(x: number, y: number, w: number, h: number, s: GameRuntimeSnapshot): void {
    const st = this.pendingSettlement ?? this.calculateYearSettlement(s);

    // 1. 顶部醒目标题
    const title = this.add.text(x + 18, y + 16, `🎉 ${st.fromYear} 年度总结 · 跨入 ${st.toAge} 岁`, {
      fontFamily: FONT_FAMILY,
      fontSize: "17px",
      fontStyle: "bold",
      color: "#ffd8a1",
      padding: { x: 2, y: 2 },
    }).setDepth(22);
    this.view.add(title);

    // 2. 时代大事件播报卡片
    const newsBg = this.add.graphics();
    newsBg.fillStyle(0x0e2430, 0.98).fillRoundedRect(x + 14, y + 46, w - 28, 86, 8);
    newsBg.lineStyle(1.5, 0xd4a359, 0.9).strokeRoundedRect(x + 14, y + 46, w - 28, 86, 8);
    newsBg.setDepth(22);
    this.view.add(newsBg);

    const newsIcon = this.add.text(x + 28, y + 62, "📻", { fontSize: "20px" }).setOrigin(0.5).setDepth(23);
    this.view.add(newsIcon);

    const newsTitle = this.add.text(x + 44, y + 54, `【时代纪事】${st.historicalHeadline}`, {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: "#ffd8a1",
      padding: { x: 1, y: 1 },
    }).setDepth(23);
    this.view.add(newsTitle);

    const newsDetail = this.add.text(x + 44, y + 74, st.historicalDetail, {
      fontFamily: FONT_FAMILY,
      fontSize: "12px",
      lineSpacing: 4,
      wordWrap: { width: w - 74, useAdvancedWrap: true },
      color: "#c1d0ce",
      padding: { x: 1, y: 1 },
    }).setDepth(23);
    this.view.add(newsDetail);

    // 3. 身体发育行
    const bodyBg = this.add.graphics();
    bodyBg.fillStyle(0x112732, 0.98).fillRoundedRect(x + 14, y + 140, w - 28, 46, 8);
    bodyBg.lineStyle(1.5, 0x3d606d, 0.8).strokeRoundedRect(x + 14, y + 140, w - 28, 46, 8);
    bodyBg.setDepth(22);
    this.view.add(bodyBg);

    const bodyText = this.add.text(
      x + 24,
      y + 154,
      `🌱 身高: +${st.heightGainCm}cm (现${st.totalHeightCm}cm) · 体重: +${st.weightGainKg}kg (现${st.totalWeightKg}kg)`,
      {
        fontFamily: FONT_FAMILY,
        fontSize: "13px",
        fontStyle: "bold",
        color: "#8be5d1",
        padding: { x: 1, y: 1 },
      },
    ).setDepth(23);
    this.view.add(bodyText);

    // 4. 核心四大属性成长网格
    const statGridY = y + 194;
    const cardW = (w - 36) / 2;
    const cardH = 50;

    const statsConfig = [
      { label: "😊 快乐", gain: st.happinessGain, note: "爱笑逗人喜欢", color: 0xf6ad55 },
      { label: "❤️ 健康", gain: st.healthGain, note: "茁壮自然成长", color: 0xf56565 },
      { label: "💡 智力", gain: st.intelligenceGain, note: "启蒙开窍潜能", color: 0x4299e1 },
      { label: "🌸 魅力", gain: st.charmGain, note: "清秀招人疼爱", color: 0xed64a6 },
    ];

    statsConfig.forEach((cfg, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const cardX = x + 14 + col * (cardW + 8);
      const cY = statGridY + row * (cardH + 8);

      const card = this.add.graphics();
      card.fillStyle(0x0c1e26, 0.98).fillRoundedRect(cardX, cY, cardW, cardH, 8);
      card.lineStyle(1.5, cfg.color, 0.7).strokeRoundedRect(cardX, cY, cardW, cardH, 8);
      card.setDepth(22);
      this.view.add(card);

      const cardTitle = this.add.text(cardX + 10, cY + 8, cfg.label, {
        fontFamily: FONT_FAMILY,
        fontSize: "13px",
        fontStyle: "bold",
        color: "#ffffff",
        padding: { x: 1, y: 1 },
      }).setDepth(23);
      this.view.add(cardTitle);

      const gainPill = this.add.text(cardX + cardW - 10, cY + 8, `+${cfg.gain} ▲`, {
        fontFamily: FONT_FAMILY,
        fontSize: "13px",
        fontStyle: "bold",
        color: "#8be5d1",
        padding: { x: 1, y: 1 },
      }).setOrigin(1, 0).setDepth(23);
      this.view.add(gainPill);

      const noteText = this.add.text(cardX + 10, cY + 28, cfg.note, {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        color: "#94a3b8",
        padding: { x: 1, y: 1 },
      }).setDepth(23);
      this.view.add(noteText);
    });

    // 5. 财富收支与精力恢复
    const moneyBg = this.add.graphics();
    moneyBg.fillStyle(0x112732, 0.98).fillRoundedRect(x + 14, y + 312, w - 28, 86, 8);
    moneyBg.lineStyle(1.5, 0xd4a359, 0.8).strokeRoundedRect(x + 14, y + 312, w - 28, 86, 8);
    moneyBg.setDepth(22);
    this.view.add(moneyBg);

    const cashTitle = this.add.text(x + 24, y + 322, `💰 压岁零花: +¥${st.cashGain.toFixed(2)} 元`, {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: "#ffd8a1",
      padding: { x: 1, y: 1 },
    }).setDepth(23);
    this.view.add(cashTitle);

    const cashDesc = this.add.text(x + 24, y + 342, st.cashGainReason, {
      fontFamily: FONT_FAMILY,
      fontSize: "12px",
      color: "#c1d0ce",
      padding: { x: 1, y: 1 },
    }).setDepth(23);
    this.view.add(cashDesc);

    const energyDesc = this.add.text(x + 24, y + 368, "⚡ 精力点数已恢复满格 (100/100) · 充满干劲！", {
      fontFamily: FONT_FAMILY,
      fontSize: "12px",
      fontStyle: "bold",
      color: "#8be5d1",
      padding: { x: 1, y: 1 },
    }).setDepth(23);
    this.view.add(energyDesc);

    // 6. 底部开启新岁按钮
    const enterBtnY = y + 414;
    const enterBtnH = 54;
    const enterBtnW = w - 28;

    const enterBtnG = this.add.graphics();
    enterBtnG.fillStyle(0xb55a3c, 1).fillRoundedRect(x + 14, enterBtnY, enterBtnW, enterBtnH, 12);
    enterBtnG.lineStyle(2, 0xffd8a1, 1).strokeRoundedRect(x + 14, enterBtnY, enterBtnW, enterBtnH, 12);
    enterBtnG.setDepth(23);
    this.view.add(enterBtnG);

    const enterBtnText = this.add.text(
      x + 14 + enterBtnW / 2,
      enterBtnY + enterBtnH / 2,
      `【 🧧 开启 ${st.toYear} 年 (${st.toAge}岁) 生活 ▶ 】`,
      {
        fontFamily: FONT_FAMILY,
        fontSize: "16px",
        fontStyle: "bold",
        color: "#ffffff",
        padding: { x: 2, y: 2 },
      },
    ).setOrigin(0.5).setDepth(24);
    this.view.add(enterBtnText);

    const hit = this.add.rectangle(x + 14 + enterBtnW / 2, enterBtnY + enterBtnH / 2, enterBtnW, enterBtnH, 0x000000, 0);
    hit.setInteractive({ useHandCursor: true }).setDepth(25);
    hit.on("pointerdown", () => {
      this.energySpentThisYear = 0; // 重置精力
      this.accumulatedYearBonus.yearOffset += 1;
      this.accumulatedYearBonus.happiness += st.happinessGain;
      this.accumulatedYearBonus.health += st.healthGain;
      this.accumulatedYearBonus.intelligence += st.intelligenceGain;
      this.accumulatedYearBonus.charm += st.charmGain;
      this.accumulatedYearBonus.cash += st.cashGain;

      // 时代资产系统推进周期（结算租金、存单到期、房贷、载具维保与股市分红）
      const curCash = Math.max(0, s.resources.cashYuan + this.accumulatedYearBonus.cash);
      const finReport = this.eraAssetsSys.advanceQuarterlyCycle(st.toYear, 1, curCash);
      if (finReport.netCashFlow !== 0) {
        this.accumulatedYearBonus.cash += finReport.netCashFlow;
      }

      this.port.dispatch({ type: "quarter.advance" });
      this.pendingSettlement = null;

      if (st.toAge === 16) {
        // 16 岁高一结束：文理分科仪式
        this.gaokaoInitialStage = "track_selection";
        this.activeModal = "gaokao";
      } else if (st.toAge === 18) {
        // 18 岁高三：全国统一高考大考与高校录取
        this.gaokaoInitialStage = "exam_session";
        this.activeModal = "gaokao";
      } else {
        const hasEvent = this.triggerNextAgeEvent(st.toAge);
        if (!hasEvent) {
          this.activeModal = null;
        }
      }
      this.render();
    });
    this.view.add(hit);
  }

  // 抓周大事件弹窗内容
  private renderZhuazhouModalContent(x: number, y: number, w: number, h: number): void {
    const title = this.add.text(x + 20, y + 16, "🎂 满周岁 · 红木八仙桌抓周礼", {
      fontFamily: FONT_FAMILY,
      fontSize: "17px",
      fontStyle: "bold",
      color: "#ffd8a1",
      padding: { x: 2, y: 2 },
    }).setDepth(22);
    this.view.add(title);

    const introBg = this.add.graphics();
    introBg.fillStyle(0x112732, 0.98).fillRoundedRect(x + 16, y + 50, w - 32, 50, 8);
    introBg.lineStyle(1, 0x3d606d, 0.8).strokeRoundedRect(x + 16, y + 50, w - 32, 50, 8);
    introBg.setDepth(22);
    this.view.add(introBg);

    const introText = this.add.text(
      x + 24,
      y + 56,
      "👨 父亲：“满周岁了！看看桌上老物件咱娃抓哪个！”\n👩 母亲：“抓啥都好，都是咱家心头肉！”",
      {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        lineSpacing: 4,
        color: "#c1d0ce",
        padding: { x: 2, y: 2 },
      },
    ).setDepth(23);
    this.view.add(introText);

    let itemY = y + 108;
    ZHUAZHOU_OPTIONS.forEach((item) => {
      const card = this.add.graphics();
      card.fillStyle(0x0c1e26, 0.98).fillRoundedRect(x + 16, itemY, w - 32, 94, 10);
      card.lineStyle(1.5, 0xd4a359, 0.9).strokeRoundedRect(x + 16, itemY, w - 32, 94, 10);
      card.setDepth(22);
      this.view.add(card);

      const icon = this.add.text(x + 36, itemY + 28, item.icon, { fontSize: "26px" }).setOrigin(0.5).setDepth(23);
      this.view.add(icon);

      const name = this.add.text(x + 58, itemY + 12, `${item.title} · ${item.subtitle}`, {
        fontFamily: FONT_FAMILY,
        fontSize: "15px",
        fontStyle: "bold",
        color: "#ffffff",
        padding: { x: 2, y: 2 },
      }).setDepth(23);
      this.view.add(name);

      const desc = this.add.text(x + 58, itemY + 36, item.gainDesc, {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        wordWrap: { width: 196, useAdvancedWrap: true },
        color: "#a4b4b2",
        padding: { x: 2, y: 2 },
      }).setDepth(23);
      this.view.add(desc);

      const bonus = this.add.text(x + 58, itemY + 70, item.bonusText, {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        fontStyle: "bold",
        color: "#8be5d1",
        padding: { x: 2, y: 2 },
      }).setDepth(23);
      this.view.add(bonus);

      const chooseBtn = this.add.graphics();
      chooseBtn.fillStyle(0xb55a3c, 1).fillRoundedRect(x + w - 84, itemY + 28, 64, 40, 8);
      chooseBtn.lineStyle(1.5, 0xffd8a1, 1).strokeRoundedRect(x + w - 84, itemY + 28, 64, 40, 8);
      chooseBtn.setDepth(23);
      this.view.add(chooseBtn);

      const chooseText = this.add.text(x + w - 52, itemY + 48, "抓取", {
        fontFamily: FONT_FAMILY,
        fontSize: "14px",
        fontStyle: "bold",
        color: "#ffffff",
        padding: { x: 2, y: 2 },
      }).setOrigin(0.5).setDepth(24);
      this.view.add(chooseText);

      const hit = this.add.rectangle(x + 16 + (w - 32) / 2, itemY + 47, w - 32, 94, 0x000000, 0);
      hit.setInteractive({ useHandCursor: true }).setDepth(25);
      hit.on("pointerdown", () => {
        this.completedZhuazhouItem = item;
        this.unlockedAssetIds.add(item.id);
        const hasEvent = this.triggerNextAgeEvent(1);
        if (!hasEvent) {
          this.activeModal = null;
        }
        this.render();
      });
      this.view.add(hit);

      itemY += 104;
    });
  }

  // 开发者测试与调试台 (GM Console)
  private renderGmDebugModalContent(x: number, y: number, w: number, _h: number, s: GameRuntimeSnapshot): void {
    const stats = this.getEffectiveStats(s);

    const title = this.add.text(x + 18, y + 14, "🛠️ 开发者测试与调试台 (GM)", {
      fontFamily: FONT_FAMILY,
      fontSize: "18px",
      fontStyle: "bold",
      color: "#ffd8a1",
      padding: { x: 2, y: 2 },
    }).setDepth(22);
    this.view.add(title);

    const subtitle = this.add.text(x + 18, y + 36, `当前: ${stats.calendarYear}年 · ${stats.age}岁 · 存款:¥${stats.cashYuan.toFixed(0)} · 老物件: ${this.unlockedAssetIds.size}件`, {
      fontFamily: FONT_FAMILY,
      fontSize: "11px",
      color: "#94a3b8",
      padding: { x: 2, y: 2 },
    }).setDepth(22);
    this.view.add(subtitle);

    let curY = y + 58;

    // 分区 1：⏱️ 年龄与年份快速直达
    const sec1Title = this.add.text(x + 18, curY, "⏱️ 核心年龄快速直达 (点击瞬间穿梭)", {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: "#76cbb7",
    }).setDepth(22);
    this.view.add(sec1Title);
    curY += 18;

    const ageTargets = [
      { age: 1, label: "👶 1岁(周岁抓周)" },
      { age: 6, label: "🧒 6岁(幼童入学)" },
      { age: 7, label: "🎒 7岁(少先队)" },
      { age: 12, label: "📘 12岁(北京亚运)" },
      { age: 15, label: "🏫 15岁(重点高中)" },
      { age: 18, label: "🎓 18岁(全国高考)" },
      { age: 19, label: "🇭🇰 19岁(香港回归)" },
      { age: 20, label: "🌊 20岁(98抗洪/BBS)" },
      { age: 21, label: "🎆 21岁(千禧倒计时)" },
      { age: 22, label: "📜 22岁(毕业/校招)" },
      { age: 23, label: "💼 23岁(入世/转正)" },
      { age: 24, label: "🔑 24岁(主持项目/租房)" },
      { age: 25, label: "🚀 25岁(非典/杨利伟)" },
      { age: 26, label: "⚡ 26岁(雅典奥运/刘翔)" },
      { age: 27, label: "🏠 27岁(首套房按揭)" },
      { age: 28, label: "💍 28岁(大婚成家)" },
      { age: 29, label: "📈 29岁(部门总管)" },
      { age: 30, label: "🏮 30岁(北京奥运)" },
      { age: 31, label: "📊 31岁(创业板/期权)" },
      { age: 32, label: "🌐 32岁(世博会/中国馆)" },
      { age: 33, label: "🚄 33岁(京沪高铁)" },
      { age: 34, label: "🚀 34岁(神九刘洋巡天)" },
      { age: 37, label: "👶 37岁(全面二孩降生)" },
      { age: 40, label: "🌉 40岁(港珠澳/不惑)" },
    ];

    const colW = Math.floor((w - 36 - 16) / 3);
    const rowH = 24;
    ageTargets.forEach((item, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const btnX = x + 18 + col * (colW + 8);
      const btnY = curY + row * (rowH + 4);

      const isCurrent = stats.age === item.age;
      const btnG = this.add.graphics();
      btnG.fillStyle(isCurrent ? 0x065f46 : 0x132e3b, 1).fillRoundedRect(btnX, btnY, colW, rowH, 6);
      btnG.lineStyle(1, isCurrent ? 0x34d399 : 0x38bdf8, 0.8).strokeRoundedRect(btnX, btnY, colW, rowH, 6);
      btnG.setDepth(22);
      this.view.add(btnG);

      const btnT = this.add.text(btnX + colW / 2, btnY + rowH / 2, item.label, {
        fontFamily: FONT_FAMILY,
        fontSize: "10px",
        fontStyle: "bold",
        color: isCurrent ? "#a7f3d0" : "#ffffff",
      }).setOrigin(0.5).setDepth(23);
      this.view.add(btnT);

      const hitZone = this.add.rectangle(btnX + colW / 2, btnY + rowH / 2, colW, rowH, 0x000000, 0);
      hitZone.setInteractive({ useHandCursor: true }).setDepth(24);
      hitZone.on("pointerdown", () => {
        const offset = item.age - s.age;
        this.accumulatedYearBonus.yearOffset = offset;
        this.pendingSettlement = null;
        this.currentLifeEvent = null;
        this.render();
      });
      this.view.add(hitZone);
    });

    curY += Math.ceil(ageTargets.length / 3) * (rowH + 4) + 4;

    const tweakBtns = [
      { label: "◀ -1岁", delta: -1 },
      { label: "+1岁 ▶", delta: 1 },
      { label: "+5岁 ⏩", delta: 5 },
    ];
    const tweakW = Math.floor((w - 36 - 16) / 3);
    tweakBtns.forEach((tb, i) => {
      const tx = x + 18 + i * (tweakW + 8);
      const tG = this.add.graphics();
      tG.fillStyle(0x1e293b, 1).fillRoundedRect(tx, curY, tweakW, 24, 6);
      tG.lineStyle(1, 0x64748b, 0.8).strokeRoundedRect(tx, curY, tweakW, 24, 6);
      tG.setDepth(22);
      this.view.add(tG);

      const tT = this.add.text(tx + tweakW / 2, curY + 12, tb.label, {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        fontStyle: "bold",
        color: "#cbd5e1",
      }).setOrigin(0.5).setDepth(23);
      this.view.add(tT);

      const tHit = this.add.rectangle(tx + tweakW / 2, curY + 12, tweakW, 24, 0x000000, 0);
      tHit.setInteractive({ useHandCursor: true }).setDepth(24);
      tHit.on("pointerdown", () => {
        this.accumulatedYearBonus.yearOffset += tb.delta;
        this.pendingSettlement = null;
        this.currentLifeEvent = null;
        this.render();
      });
      this.view.add(tHit);
    });

    curY += 30;

    // 分区 2：🎲 事件精准触发与重置
    const sec2Title = this.add.text(x + 18, curY, "🎲 剧情事件精准触发 (即刻呼出决策弹窗)", {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: "#ffd8a1",
    }).setDepth(22);
    this.view.add(sec2Title);
    curY += 18;

    const eventBtns = [
      {
        label: "🎯 触发本岁里程碑",
        handler: () => {
          const milestone = CHILDHOOD_EVENT_DATABASE.find(
            (e) => e.category === "milestone" && e.minAge <= stats.age && e.maxAge >= stats.age,
          );
          if (milestone) {
            this.currentLifeEvent = milestone;
            this.activeModal = "life_event";
          }
          this.render();
        },
      },
      {
        label: "🎲 触发随机通用事件",
        handler: () => {
          const list = CHILDHOOD_EVENT_DATABASE.filter((e) => e.category === "general" && e.minAge <= stats.age && e.maxAge >= stats.age);
          if (list.length > 0) {
            this.currentLifeEvent = list[Math.floor(Math.random() * list.length)];
            this.activeModal = "life_event";
          }
          this.render();
        },
      },
      {
        label: "⚡ 触发突发社交奇遇",
        handler: () => {
          const list = CHILDHOOD_EVENT_DATABASE.filter((e) => e.category === "emergent" && e.minAge <= stats.age && e.maxAge >= stats.age);
          if (list.length > 0) {
            this.currentLifeEvent = list[Math.floor(Math.random() * list.length)];
            this.activeModal = "life_event";
          }
          this.render();
        },
      },
      {
        label: "⚠️ 触发意外考验风险",
        handler: () => {
          const list = CHILDHOOD_EVENT_DATABASE.filter((e) => e.category === "accident" && e.minAge <= stats.age && e.maxAge >= stats.age);
          if (list.length > 0) {
            this.currentLifeEvent = list[Math.floor(Math.random() * list.length)];
            this.activeModal = "life_event";
          }
          this.render();
        },
      },
      {
        label: "🏆 触发电竞传奇大事件",
        handler: () => {
          const list = ESPORTS_LIFE_EVENTS;
          if (list.length > 0) {
            this.currentLifeEvent = list[Math.floor(Math.random() * list.length)];
            this.activeModal = "life_event";
          }
          this.render();
        },
      },
    ];

    const evW = Math.floor((w - 36 - 8) / 2);
    eventBtns.forEach((eb, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const ex = x + 18 + col * (evW + 8);
      const ey = curY + row * (26 + 5);

      const eG = this.add.graphics();
      eG.fillStyle(0x312e81, 1).fillRoundedRect(ex, ey, evW, 26, 6);
      eG.lineStyle(1, 0x818cf8, 0.8).strokeRoundedRect(ex, ey, evW, 26, 6);
      eG.setDepth(22);
      this.view.add(eG);

      const eT = this.add.text(ex + evW / 2, ey + 13, eb.label, {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        fontStyle: "bold",
        color: "#e0e7ff",
      }).setOrigin(0.5).setDepth(23);
      this.view.add(eT);

      const eHit = this.add.rectangle(ex + evW / 2, ey + 13, evW, 26, 0x000000, 0);
      eHit.setInteractive({ useHandCursor: true }).setDepth(24);
      eHit.on("pointerdown", eb.handler);
      this.view.add(eHit);
    });

    curY += 2 * (26 + 5) + 3;

    const resetEvtG = this.add.graphics();
    resetEvtG.fillStyle(0x1e1b4b, 1).fillRoundedRect(x + 18, curY, w - 36, 24, 6);
    resetEvtG.lineStyle(1, 0xa5b4fc, 0.6).strokeRoundedRect(x + 18, curY, w - 36, 24, 6);
    resetEvtG.setDepth(22);
    this.view.add(resetEvtG);

    const resetEvtT = this.add.text(x + w / 2, curY + 12, "🔄 清空已完成事件记录 (解除全部冷却限制)", {
      fontFamily: FONT_FAMILY,
      fontSize: "10.5px",
      fontStyle: "bold",
      color: "#c7d2fe",
    }).setOrigin(0.5).setDepth(23);
    this.view.add(resetEvtT);

    const resetEvtHit = this.add.rectangle(x + w / 2, curY + 12, w - 36, 24, 0x000000, 0);
    resetEvtHit.setInteractive({ useHandCursor: true }).setDepth(24);
    resetEvtHit.on("pointerdown", () => {
      this.completedEventIds.clear();
      this.render();
    });
    this.view.add(resetEvtHit);

    curY += 30;

    // 分区 3：🏠 老物件资产快捷管理 & 属性修改
    const sec3Title = this.add.text(x + 18, curY, "🏠 老物件资产与数值修改", {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: "#f472b6",
    }).setDepth(22);
    this.view.add(sec3Title);
    curY += 18;

    const miscBtns = [
      {
        label: "✨ 一键解锁全量时代老物件(107+)",
        handler: () => {
          this.unlockedAssetIds = new Set(Object.keys(VINTAGE_ASSETS_CATALOG));
          this.render();
        },
      },
      {
        label: "🗑️ 重置老物件库",
        handler: () => {
          this.unlockedAssetIds = new Set(["tiger_shoes", "model_worker_mug"]);
          this.render();
        },
      },
      {
        label: "💪 全属性拉满(100)",
        handler: () => {
          this.accumulatedYearBonus.happiness = 50;
          this.accumulatedYearBonus.health = 50;
          this.accumulatedYearBonus.intelligence = 50;
          this.accumulatedYearBonus.charm = 50;
          this.render();
        },
      },
      {
        label: "💰 存款+¥10,000 / 精力回满",
        handler: () => {
          this.accumulatedYearBonus.cash += 10000;
          this.energySpentThisYear = 0;
          this.render();
        },
      },
    ];

    miscBtns.forEach((mb, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const mx = x + 18 + col * (evW + 8);
      const my = curY + row * (26 + 5);

      const mG = this.add.graphics();
      mG.fillStyle(0x831843, 1).fillRoundedRect(mx, my, evW, 26, 6);
      mG.lineStyle(1, 0xf472b6, 0.8).strokeRoundedRect(mx, my, evW, 26, 6);
      mG.setDepth(22);
      this.view.add(mG);

      const mT = this.add.text(mx + evW / 2, my + 13, mb.label, {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        fontStyle: "bold",
        color: "#fce7f3",
      }).setOrigin(0.5).setDepth(23);
      this.view.add(mT);

      const mHit = this.add.rectangle(mx + evW / 2, my + 13, evW, 26, 0x000000, 0);
      mHit.setInteractive({ useHandCursor: true }).setDepth(24);
      mHit.on("pointerdown", mb.handler);
      this.view.add(mHit);
    });

    curY += 2 * (26 + 5) + 6;

    // 分区 4：🎮 特色小游戏与玩法直通
    const sec4Title = this.add.text(x + 18, curY, "🎮 特色小游戏与玩法直通 (点击立即开启)", {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: "#38bdf8",
    }).setDepth(22);
    this.view.add(sec4Title);
    curY += 18;

    const gameBtns = [
      {
        label: "🃏 启动拍画片对决",
        handler: () => {
          this.activeCardSlapGame = new CardSlapMiniGame();
          this.activeModal = "card_slap";
          this.render();
        },
      },
      {
        label: "🔮 启动打弹珠竞技",
        handler: () => {
          this.activeMarblesGame = new MarblesMiniGame();
          this.activeModal = "marbles";
          this.render();
        },
      },
      {
        label: "🦝 立即拆小浣熊卡",
        handler: () => {
          this.lastDrawnCard = this.drawRandomShuihuCard();
          this.collectedShuihuCardIds.add(this.lastDrawnCard.id);
          this.activeModal = "shuihu_unboxing";
          this.render();
        },
      },
      {
        label: "📝 启动期末油印真题",
        handler: () => {
          this.activeExamQuizGame = new ExamQuizMiniGame();
          this.activeModal = "exam_quiz";
          this.render();
        },
      },
      {
        label: "🎴 翻阅水浒108将卡册",
        handler: () => {
          this.activeModal = "shuihu_album";
          this.render();
        },
      },
      {
        label: "✨ 一键集齐108将卡牌",
        handler: () => {
          this.collectedShuihuCardIds = new Set(SHUIHU_CARDS_DATABASE.map((c) => c.id));
          this.activeModal = "shuihu_album";
          this.render();
        },
      },
      {
        label: "🎓 启动中考与志愿填报",
        handler: () => {
          this.activeZhongkao = new ZhongkaoManager();
          this.activeModal = "zhongkao";
          this.render();
        },
      },
      {
        label: "🏆 启动WCG世界总决赛",
        handler: () => {
          this.activeEsportsCareer = new EsportsCareerManager();
          this.activeModal = "esports_match";
          this.render();
        },
      },
      {
        label: "🌏 设定出生代际与省份",
        handler: () => {
          this.activeModal = "birth_config";
          this.render();
        },
      },
      {
        label: "📝 启动高考与大学志愿",
        handler: () => {
          this.activeGaokao = new GaokaoManager();
          this.activeModal = "gaokao";
          this.render();
        },
      },
      {
        label: "💍 启动恋爱与婚礼系统",
        handler: () => {
          this.activeModal = "romance_detail";
          this.render();
        },
      },
      {
        label: "👶 启动生育与家庭养育",
        handler: () => {
          this.activeModal = "fertility_detail";
          this.render();
        },
      },
      {
        label: "💼 启动职场晋升与五险一金",
        handler: () => {
          this.activeModal = "career_detail";
          this.render();
        },
      },
      {
        label: "📈 启动A股证券交易中心",
        handler: () => {
          this.financeStockSys.openAccount();
          this.activeModal = "stock_market";
          this.render();
        },
      },
      {
        label: "🏦 启动银行金融与公积金冲贷",
        handler: () => {
          this.activeModal = "bank_finance";
          this.render();
        },
      },
    ];

    gameBtns.forEach((gb, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const gx = x + 18 + col * (evW + 8);
      const gy = curY + row * (26 + 5);

      const gG = this.add.graphics();
      gG.fillStyle(0x0369a1, 1).fillRoundedRect(gx, gy, evW, 26, 6);
      gG.lineStyle(1, 0x38bdf8, 0.8).strokeRoundedRect(gx, gy, evW, 26, 6);
      gG.setDepth(22);
      this.view.add(gG);

      const gT = this.add.text(gx + evW / 2, gy + 13, gb.label, {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        fontStyle: "bold",
        color: "#e0f2fe",
      }).setOrigin(0.5).setDepth(23);
      this.view.add(gT);

      const gHit = this.add.rectangle(gx + evW / 2, gy + 13, evW, 26, 0x000000, 0);
      gHit.setInteractive({ useHandCursor: true }).setDepth(24);
      gHit.on("pointerdown", gb.handler);
      this.view.add(gHit);
    });
  }

  private getLifeChronicles(): Array<{
    title: string;
    content: string;
    dotColor: number;
    height: number;
    tag?: string;
    tagColor: string;
    interactiveAction?: "open_zhuazhou";
  }> {
    const stats = this.getEffectiveStats(this.snapshot);
    const list: Array<{
      title: string;
      content: string;
      dotColor: number;
      height: number;
      tag?: string;
      tagColor: string;
      interactiveAction?: "open_zhuazhou";
    }> = [];

    // 1. 优先展示已发生的突发生活事件记录
    this.eventHistoryRecords.forEach((rec) => {
      list.push({
        title: rec.title,
        content: rec.content,
        dotColor: 0x8be5d1,
        height: 78,
        tag: rec.tag,
        tagColor: rec.tagColor,
      });
    });

    if (stats.age <= 1) {
      if (!this.completedZhuazhouItem) {
        list.push({
          title: "🎂 满周岁 · 红木八仙桌抓周礼",
          content: "全家人围坐在红木八仙桌前，摆满了算盘、小人书、竹蜻蜓等老物件，期待着你伸出小手……",
          dotColor: 0xd4a359,
          height: 84,
          tag: "【⚡ 点击抓周】",
          tagColor: "#ffd8a1",
          interactiveAction: "open_zhuazhou",
        });
      } else {
        list.push({
          title: `满周岁抓周礼：《${this.completedZhuazhouItem.title}》`,
          content: `你在红木八仙桌上抓到了《${this.completedZhuazhouItem.title}》，父母满心欢喜，寄托了对你一生的期许。`,
          dotColor: 0xd4a359,
          height: 78,
          tag: "[启蒙完成]",
          tagColor: "#ffd8a1",
        });
      }
      list.push({
        title: "咿呀学语与认人",
        content: "这一年你学会了清脆地喊“爸爸、妈妈”，成了县机床厂大院里最受长辈喜爱的小开心果。",
        dotColor: 0x76cbb7,
        height: 78,
        tag: "[快乐 +10]",
        tagColor: "#8be5d1",
      });
      list.push({
        title: "家庭温暖陪伴",
        content: "父亲在国营机床厂评上先进标兵，发了半斤白糖，母亲给你冲了甜甜的红糖水喝。",
        dotColor: 0xff9e9e,
        height: 78,
        tag: "[健康 +5]",
        tagColor: "#ff9e9e",
      });
    } else if (stats.age === 2) {
      list.push({
        title: "大院里蹒跚学步与探索",
        content: "你已经能稳稳在大院红砖地上小跑，跟着王小军哥哥看蚂蚁搬家，笑声洒满梧桐树下。",
        dotColor: 0xd4a359,
        height: 78,
        tag: "[健康 +8]",
        tagColor: "#ffd8a1",
      });
      list.push({
        title: "隔壁王阿姨送的水果糖",
        content: "母亲帮邻居家踩缝纫机裁衣服，王阿姨特地塞给你两颗珍贵的高粱饴软糖，甜到了心窝里。",
        dotColor: 0x76cbb7,
        height: 78,
        tag: "[快乐 +8]",
        tagColor: "#8be5d1",
      });
    } else {
      list.push({
        title: `${stats.calendarYear} 年 · ${stats.age} 岁成长新篇`,
        content: `迎来了${stats.calendarYear}年新春，你在父母悉心呵护下茁壮成长，大院里人人夸你懂事灵秀。`,
        dotColor: 0xd4a359,
        height: 78,
        tag: `[剩余精力 ⚡${stats.availableEnergy}]`,
        tagColor: "#ffd8a1",
      });
      list.push({
        title: "大院邻里温暖日常生活",
        content: "隔壁邻居王阿姨常来串门，夸你越长越灵巧，大院里的小伙伴们天天喊你一起跳房子捉迷藏。",
        dotColor: 0x76cbb7,
        height: 78,
        tag: "[亲情 +5]",
        tagColor: "#8be5d1",
      });
      list.push({
        title: "时代春风拂面",
        content: "大院广播站播放着《在希望的田野上》，街道上骑自行车的人越来越多，处处洋溢着蓬勃生机。",
        dotColor: 0x4299e1,
        height: 78,
        tag: "[智力 +5]",
        tagColor: "#90cdf4",
      });
    }

    return list;
  }

  private drawRandomShuihuCard(): ShuihuCard {
    const rand = Math.random();
    let candidates: ShuihuCard[];
    if (rand < 0.18) {
      candidates = SHUIHU_CARDS_DATABASE.filter((c) => c.rarity === "gold");
    } else if (rand < 0.50) {
      candidates = SHUIHU_CARDS_DATABASE.filter((c) => c.rarity === "silver");
    } else {
      candidates = SHUIHU_CARDS_DATABASE.filter((c) => c.rarity === "normal");
    }
    if (!candidates || candidates.length === 0) candidates = SHUIHU_CARDS_DATABASE;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // ==========================================
  // 5.1 撕开小浣熊干脆面开卡弹窗
  // ==========================================
  private renderShuihuUnboxingModalContent(x: number, y: number, w: number, h: number): void {
    const card = this.lastDrawnCard;
    if (!card) return;

    const isGold = card.rarity === "gold";
    const isSilver = card.rarity === "silver";

    const title = this.add.text(x + 18, y + 16, "🦝 小浣熊干脆面 · 拆袋寻卡", {
      fontFamily: FONT_FAMILY,
      fontSize: "17px",
      fontStyle: "bold",
      color: "#ffd8a1",
    }).setDepth(22);
    this.view.add(title);

    // 卡牌大画框
    const cardFrame = this.add.graphics();
    cardFrame.fillStyle(isGold ? 0x2e1a06 : isSilver ? 0x1e293b : 0x0c202a, 0.98).fillRoundedRect(x + 24, y + 54, w - 48, 200, 12);
    cardFrame.lineStyle(2.5, isGold ? 0xf59e0b : isSilver ? 0x94a3b8 : 0x48bb78, 1).strokeRoundedRect(x + 24, y + 54, w - 48, 200, 12);
    cardFrame.setDepth(22);
    this.view.add(cardFrame);

    const rarityBadge = isGold ? "🌟 绝版特级金闪卡 🌟" : isSilver ? "✨ 稀有银闪卡 ✨" : "🎴 经典水浒普卡";
    const badgeText = this.add.text(x + w / 2, y + 72, rarityBadge, {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: isGold ? "#fbbf24" : isSilver ? "#cbd5e1" : "#8be5d1",
    }).setOrigin(0.5).setDepth(23);
    this.view.add(badgeText);

    const icon = this.add.text(x + w / 2, y + 120, card.icon, { fontSize: "44px" }).setOrigin(0.5).setDepth(23);
    this.view.add(icon);

    const nameText = this.add.text(x + w / 2, y + 168, `${card.star} · ${card.nickname} · ${card.name}`, {
      fontFamily: FONT_FAMILY,
      fontSize: "17px",
      fontStyle: "bold",
      color: "#ffffff",
    }).setOrigin(0.5).setDepth(23);
    this.view.add(nameText);

    const rankText = this.add.text(x + w / 2, y + 194, `梁山座次：第 ${card.ranking} 位 · 战力: ⚔️${card.attack} / 🛡️${card.defense}`, {
      fontFamily: FONT_FAMILY,
      fontSize: "12px",
      fontStyle: "bold",
      color: "#ffd8a1",
    }).setOrigin(0.5).setDepth(23);
    this.view.add(rankText);

    const quoteText = this.add.text(x + w / 2, y + 226, `“${card.quote}”`, {
      fontFamily: FONT_FAMILY,
      fontSize: "11px",
      fontStyle: "italic",
      color: "#94a3b8",
      wordWrap: { width: w - 70, useAdvancedWrap: true },
      align: "center",
    }).setOrigin(0.5).setDepth(23);
    this.view.add(quoteText);

    // 收入卡册按钮
    const btnG = this.add.graphics();
    btnG.fillStyle(0xb55a3c, 1).fillRoundedRect(x + 24, y + 270, w - 48, 48, 10);
    btnG.lineStyle(2, 0xffd8a1, 1).strokeRoundedRect(x + 24, y + 270, w - 48, 48, 10);
    btnG.setDepth(23);
    this.view.add(btnG);

    const btnText = this.add.text(x + w / 2, y + 294, "【 收入水浒卡册馆 ▶ 】", {
      fontFamily: FONT_FAMILY,
      fontSize: "15px",
      fontStyle: "bold",
      color: "#ffffff",
    }).setOrigin(0.5).setDepth(24);
    this.view.add(btnText);

    const hit = this.add.rectangle(x + w / 2, y + 294, w - 48, 48, 0x000000, 0);
    hit.setInteractive({ useHandCursor: true }).setDepth(25);
    hit.on("pointerdown", () => {
      this.activeModal = null;
      this.render();
    });
    this.view.add(hit);
  }

  // ==========================================
  // 5.2 水浒 108 将卡册馆全屏浏览
  // ==========================================
  private renderShuihuAlbumModalContent(x: number, y: number, w: number, h: number): void {
    const title = this.add.text(x + 18, y + 16, `🎴 水浒108将收藏卡册 (已集齐: ${this.collectedShuihuCardIds.size} / 108)`, {
      fontFamily: FONT_FAMILY,
      fontSize: "16px",
      fontStyle: "bold",
      color: "#ffd8a1",
    }).setDepth(22);
    this.view.add(title);

    let curY = y + 46;

    // 1. 羁绊加成状态栏
    SHUIHU_CARD_COMBOS.forEach((combo) => {
      const isUnlocked = combo.requiredCardIds.every((id) => this.collectedShuihuCardIds.has(id));
      const comboCard = this.add.graphics();
      comboCard.fillStyle(isUnlocked ? 0x1d3a2b : 0x111c22, 0.98).fillRoundedRect(x + 14, curY, w - 28, 38, 6);
      comboCard.lineStyle(1, isUnlocked ? 0x34d399 : 0x334155, 0.9).strokeRoundedRect(x + 14, curY, w - 28, 38, 6);
      comboCard.setDepth(22);
      this.view.add(comboCard);

      const cTitle = this.add.text(x + 22, curY + 6, `【${combo.name}】${isUnlocked ? "✅ 已激活" : "🔒 待集齐"}`, {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        fontStyle: "bold",
        color: isUnlocked ? "#6ee7b7" : "#94a3b8",
      }).setDepth(23);
      this.view.add(cTitle);

      const cDesc = this.add.text(x + 22, curY + 22, combo.bonusDesc, {
        fontFamily: FONT_FAMILY,
        fontSize: "10.5px",
        color: isUnlocked ? "#a7f3d0" : "#64748b",
      }).setDepth(23);
      this.view.add(cDesc);

      curY += 44;
    });

    // 2. 卡牌网格列表 (展示前 9 张卡)
    const cardGridW = (w - 44) / 3;
    const cardGridH = 82;
    SHUIHU_CARDS_DATABASE.slice(0, 9).forEach((card, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const cx = x + 14 + col * (cardGridW + 8);
      const cy = curY + row * (cardGridH + 8);

      const hasThisCard = this.collectedShuihuCardIds.has(card.id);
      const cG = this.add.graphics();
      cG.fillStyle(hasThisCard ? (card.rarity === "gold" ? 0x2e1a06 : 0x102b38) : 0x0a141a, 0.98).fillRoundedRect(cx, cy, cardGridW, cardGridH, 8);
      cG.lineStyle(1.2, hasThisCard ? (card.rarity === "gold" ? 0xf59e0b : 0x38bdf8) : 0x1e293b, 0.8).strokeRoundedRect(cx, cy, cardGridW, cardGridH, 8);
      cG.setDepth(22);
      this.view.add(cG);

      const cIcon = this.add.text(cx + cardGridW / 2, cy + 24, hasThisCard ? card.icon : "❓", {
        fontSize: "22px",
      }).setOrigin(0.5).setDepth(23);
      this.view.add(cIcon);

      const cName = this.add.text(cx + cardGridW / 2, cy + 48, hasThisCard ? card.name : "未收集", {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        fontStyle: "bold",
        color: hasThisCard ? "#ffffff" : "#475569",
      }).setOrigin(0.5).setDepth(23);
      this.view.add(cName);

      const cNick = this.add.text(cx + cardGridW / 2, cy + 64, hasThisCard ? card.nickname : "---", {
        fontFamily: FONT_FAMILY,
        fontSize: "10.5px",
        color: hasThisCard ? "#ffd8a1" : "#334155",
      }).setOrigin(0.5).setDepth(23);
      this.view.add(cNick);
    });
  }

  // ==========================================
  // 5.3 拍画片/拍洋画蓄力对决小游戏
  // ==========================================
  private renderCardSlapModalContent(x: number, y: number, w: number, h: number): void {
    if (!this.activeCardSlapGame) this.activeCardSlapGame = new CardSlapMiniGame();
    const game = this.activeCardSlapGame;
    const st = game.state;

    const title = this.add.text(x + 18, y + 16, "🃏 大院红砖地 · 拍画片对决", {
      fontFamily: FONT_FAMILY,
      fontSize: "17px",
      fontStyle: "bold",
      color: "#ffd8a1",
    }).setDepth(22);
    this.view.add(title);

    // 比分看板
    const scoreBg = this.add.graphics();
    scoreBg.fillStyle(0x102b38, 0.98).fillRoundedRect(x + 14, y + 46, w - 28, 42, 8);
    scoreBg.lineStyle(1.5, 0xd4a359, 0.9).strokeRoundedRect(x + 14, y + 46, w - 28, 42, 8);
    scoreBg.setDepth(22);
    this.view.add(scoreBg);

    const scoreText = this.add.text(x + w / 2, y + 67, `我方: ${st.playerScore} 翻面 ⚡ 对手(${st.opponentName}): ${st.opponentScore} 翻面`, {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: "#ffffff",
    }).setOrigin(0.5).setDepth(23);
    this.view.add(scoreText);

    // 叙事动态与提示卡
    const infoBg = this.add.graphics();
    infoBg.fillStyle(0x0e2430, 0.98).fillRoundedRect(x + 14, y + 96, w - 28, 64, 8);
    infoBg.lineStyle(1.2, 0x3d606d, 0.8).strokeRoundedRect(x + 14, y + 96, w - 28, 64, 8);
    infoBg.setDepth(22);
    this.view.add(infoBg);

    const infoText = this.add.text(x + 24, y + 104, st.lastActionText, {
      fontFamily: FONT_FAMILY,
      fontSize: "12px",
      color: "#e2e8f0",
      lineSpacing: 4,
      wordWrap: { width: w - 48, useAdvancedWrap: true },
    }).setDepth(23);
    this.view.add(infoText);

    // 核心蓄力与操作区
    if (st.gameStatus !== "game_over") {
      const chargeY = y + 172;
      const barW = w - 48;
      const barH = 24;

      const chargeLabel = this.add.text(x + 24, chargeY, "🖐️ 掌风蓄力槽 (在黄色 70~90% 区间释放为最佳掌风)：", {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffd8a1",
      }).setDepth(22);
      this.view.add(chargeLabel);

      const barBg = this.add.graphics();
      barBg.fillStyle(0x1a2d36, 1).fillRoundedRect(x + 24, chargeY + 22, barW, barH, 6);
      // 标记黄色最佳区间
      barBg.fillStyle(0xca8a04, 0.5).fillRect(x + 24 + barW * 0.65, chargeY + 22, barW * 0.25, barH);
      // 当前蓄力指针
      const currentFillW = Math.max(4, barW * (st.powerValue / 100));
      barBg.fillStyle(st.powerValue >= 65 && st.powerValue <= 92 ? 0xfacc15 : 0x38bdf8, 1).fillRoundedRect(x + 24, chargeY + 22, currentFillW, barH, 6);
      barBg.lineStyle(1.5, 0xffd8a1, 1).strokeRoundedRect(x + 24, chargeY + 22, barW, barH, 6);
      barBg.setDepth(22);
      this.view.add(barBg);

      // 下掌拍击按钮 (按住与松开)
      const slapBtn = this.add.graphics();
      slapBtn.fillStyle(st.currentTurn === "player" ? 0xb55a3c : 0x334155, 1).fillRoundedRect(x + 24, chargeY + 60, barW, 46, 10);
      slapBtn.lineStyle(2, 0xffd8a1, 1).strokeRoundedRect(x + 24, chargeY + 60, barW, 46, 10);
      slapBtn.setDepth(22);
      this.view.add(slapBtn);

      const slapBtnT = this.add.text(x + w / 2, chargeY + 83, st.currentTurn === "player" ? "【 🖐️ 拍下重掌！ 】" : "【 对手拍击中... 】", {
        fontFamily: FONT_FAMILY,
        fontSize: "15px",
        fontStyle: "bold",
        color: "#ffffff",
      }).setOrigin(0.5).setDepth(23);
      this.view.add(slapBtnT);

      if (st.currentTurn === "player") {
        const hit = this.add.rectangle(x + w / 2, chargeY + 83, barW, 46, 0x000000, 0);
        hit.setInteractive({ useHandCursor: true }).setDepth(25);
        hit.on("pointerdown", () => {
          // 模拟一次随机力量下掌
          st.powerValue = Math.floor(60 + Math.random() * 35);
          game.releaseCharge();
          this.render();

          // 1秒后对手反击
          if (game.state.currentTurn === "opponent" && game.state.gameStatus !== "game_over") {
            setTimeout(() => {
              game.executeOpponentTurn();
              this.render();
            }, 800);
          }
        });
        this.view.add(hit);
      }
    } else {
      // 游戏结束结算
      const isWin = st.winner === "player";
      const resultBg = this.add.graphics();
      resultBg.fillStyle(isWin ? 0x1e3a2b : 0x3a1e1e, 0.98).fillRoundedRect(x + 24, y + 172, w - 48, 80, 10);
      resultBg.lineStyle(2, isWin ? 0x34d399 : 0xf87171, 1).strokeRoundedRect(x + 24, y + 172, w - 48, 80, 10);
      resultBg.setDepth(22);
      this.view.add(resultBg);

      const resultTitle = this.add.text(x + w / 2, y + 196, isWin ? "🏆 拍画片大获全胜！" : "💔 惜败！画片被赢走了", {
        fontFamily: FONT_FAMILY,
        fontSize: "16px",
        fontStyle: "bold",
        color: isWin ? "#6ee7b7" : "#fca5a5",
      }).setOrigin(0.5).setDepth(23);
      this.view.add(resultTitle);

      const resultGain = this.add.text(x + w / 2, y + 224, isWin ? "获得战利品：绝版孙悟空画片 · 快乐 +12 · 魅力 +4" : "虽败犹荣：积累了拍击技巧 · 经验 +1", {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffd8a1",
      }).setOrigin(0.5).setDepth(23);
      this.view.add(resultGain);

      // 退出结算按钮
      const exitBtn = this.add.graphics();
      exitBtn.fillStyle(0xb55a3c, 1).fillRoundedRect(x + 24, y + 268, w - 48, 44, 8);
      exitBtn.lineStyle(1.5, 0xffd8a1, 1).strokeRoundedRect(x + 24, y + 268, w - 48, 44, 8);
      exitBtn.setDepth(23);
      this.view.add(exitBtn);

      const exitT = this.add.text(x + w / 2, y + 290, "【 确 定 ▶ 】", {
        fontFamily: FONT_FAMILY,
        fontSize: "15px",
        fontStyle: "bold",
        color: "#ffffff",
      }).setOrigin(0.5).setDepth(24);
      this.view.add(exitT);

      const hit = this.add.rectangle(x + w / 2, y + 290, w - 48, 44, 0x000000, 0);
      hit.setInteractive({ useHandCursor: true }).setDepth(25);
      hit.on("pointerdown", () => {
        if (isWin) {
          this.accumulatedYearBonus.happiness += 12;
          this.accumulatedYearBonus.charm += 4;
          if (!this.completedQuestIds.has("quest_age6_card_master")) {
            this.completedQuestIds.add("quest_age6_card_master");
            this.activeMedalInfo = {
              title: "🏅 时代金星 · 大院孩子王勋章",
              desc: "红砖地上手掌翻飞，连战连捷让同伴心悦诚服，成为远近闻名的大院孩子王！",
              icon: "👑",
              bonus: "魅力 +10 · 快乐 +10 · 健康 +6 · 开启【大院领袖】声望",
            };
            this.accumulatedYearBonus.charm += 10;
            this.accumulatedYearBonus.happiness += 10;
            this.accumulatedYearBonus.health += 6;
            this.activeModal = "medal_award";
            this.activeCardSlapGame = null;
            this.render();
            return;
          }
        }
        this.activeModal = null;
        this.activeCardSlapGame = null;
        this.render();
      });
      this.view.add(hit);
    }
  }

  // ==========================================
  // 5.4 泥地打弹珠竞技小游戏
  // ==========================================
  private renderMarblesModalContent(x: number, y: number, w: number, h: number): void {
    if (!this.activeMarblesGame) this.activeMarblesGame = new MarblesMiniGame();
    const game = this.activeMarblesGame;
    const st = game.state;

    const title = this.add.text(x + 18, y + 16, "🔮 树荫泥土地 · 经典打弹珠竞技", {
      fontFamily: FONT_FAMILY,
      fontSize: "17px",
      fontStyle: "bold",
      color: "#ffd8a1",
    }).setDepth(22);
    this.view.add(title);

    // 弹珠数量状态
    const statusBg = this.add.graphics();
    statusBg.fillStyle(0x102b38, 0.98).fillRoundedRect(x + 14, y + 46, w - 28, 42, 8);
    statusBg.lineStyle(1.5, 0x38bdf8, 0.9).strokeRoundedRect(x + 14, y + 46, w - 28, 42, 8);
    statusBg.setDepth(22);
    this.view.add(statusBg);

    const statusText = this.add.text(x + w / 2, y + 67, `我方弹珠: 🟡 x ${st.playerMarblesLeft}   VS   对方弹珠: 🔵 x ${st.opponentMarblesLeft}`, {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: "#ffffff",
    }).setOrigin(0.5).setDepth(23);
    this.view.add(statusText);

    // 动态日志
    const logBg = this.add.graphics();
    logBg.fillStyle(0x0e2430, 0.98).fillRoundedRect(x + 14, y + 96, w - 28, 54, 8);
    logBg.lineStyle(1.2, 0x3d606d, 0.8).strokeRoundedRect(x + 14, y + 96, w - 28, 54, 8);
    logBg.setDepth(22);
    this.view.add(logBg);

    const logText = this.add.text(x + 24, y + 104, st.lastActionText, {
      fontFamily: FONT_FAMILY,
      fontSize: "12px",
      color: "#e2e8f0",
      lineSpacing: 4,
      wordWrap: { width: w - 48, useAdvancedWrap: true },
    }).setDepth(23);
    this.view.add(logText);

    if (st.gameStatus !== "game_over") {
      // 弹射操作按钮
      const shootY = y + 164;
      const shootBtn = this.add.graphics();
      shootBtn.fillStyle(0xb55a3c, 1).fillRoundedRect(x + 24, shootY, w - 48, 50, 10);
      shootBtn.lineStyle(2, 0xffd8a1, 1).strokeRoundedRect(x + 24, shootY, w - 48, 50, 10);
      shootBtn.setDepth(22);
      this.view.add(shootBtn);

      const shootT = this.add.text(x + w / 2, shootY + 25, "【 🎯 拉弓瞄准 · 极速发射！ 】", {
        fontFamily: FONT_FAMILY,
        fontSize: "15px",
        fontStyle: "bold",
        color: "#ffffff",
      }).setOrigin(0.5).setDepth(23);
      this.view.add(shootT);

      const hit = this.add.rectangle(x + w / 2, shootY + 25, w - 48, 50, 0x000000, 0);
      hit.setInteractive({ useHandCursor: true }).setDepth(25);
      hit.on("pointerdown", () => {
        game.startDrag(100, 100);
        game.updateDrag(150, 160); // 模拟拉力
        game.shoot();
        this.render();
      });
      this.view.add(hit);
    } else {
      const isWin = st.winner === "player";
      const winBtn = this.add.graphics();
      winBtn.fillStyle(0xb55a3c, 1).fillRoundedRect(x + 24, y + 268, w - 48, 44, 8);
      winBtn.lineStyle(1.5, 0xffd8a1, 1).strokeRoundedRect(x + 24, y + 268, w - 48, 44, 8);
      winBtn.setDepth(23);
      this.view.add(winBtn);

      const winT = this.add.text(x + w / 2, y + 290, "【 领取战利品 ▶ 】", {
        fontFamily: FONT_FAMILY,
        fontSize: "15px",
        fontStyle: "bold",
        color: "#ffffff",
      }).setOrigin(0.5).setDepth(24);
      this.view.add(winT);

      const hit = this.add.rectangle(x + w / 2, y + 290, w - 48, 44, 0x000000, 0);
      hit.setInteractive({ useHandCursor: true }).setDepth(25);
      hit.on("pointerdown", () => {
        if (isWin) {
          this.accumulatedYearBonus.happiness += 10;
          this.accumulatedYearBonus.health += 5;
          this.accumulatedYearBonus.cash += 1.5;
        }
        this.activeModal = null;
        this.activeMarblesGame = null;
        this.render();
      });
      this.view.add(hit);
    }
  }

  // ==========================================
  // 5.5 期末油印试卷答题小游戏
  // ==========================================
  private renderExamQuizModalContent(x: number, y: number, w: number, h: number): void {
    if (!this.activeExamQuizGame) this.activeExamQuizGame = new ExamQuizMiniGame();
    const game = this.activeExamQuizGame;
    const q = game.getCurrentQuestion();

    const title = this.add.text(x + 18, y + 16, "📝 小学期末模拟考 · 油印真题卷", {
      fontFamily: FONT_FAMILY,
      fontSize: "17px",
      fontStyle: "bold",
      color: "#ffd8a1",
    }).setDepth(22);
    this.view.add(title);

    if (!game.state.isFinished && q) {
      // 题目卡片
      const qBg = this.add.graphics();
      qBg.fillStyle(0x0e2430, 0.98).fillRoundedRect(x + 14, y + 46, w - 28, 86, 8);
      qBg.lineStyle(1.5, 0x38bdf8, 0.9).strokeRoundedRect(x + 14, y + 46, w - 28, 86, 8);
      qBg.setDepth(22);
      this.view.add(qBg);

      const qSubject = this.add.text(x + 24, y + 54, `【${q.subject}题 · 第 ${game.state.currentQuestionIndex + 1}/3 题】`, {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        fontStyle: "bold",
        color: "#8be5d1",
      }).setDepth(23);
      this.view.add(qSubject);

      const qText = this.add.text(x + 24, y + 74, q.question, {
        fontFamily: FONT_FAMILY,
        fontSize: "13px",
        fontStyle: "bold",
        lineSpacing: 4,
        wordWrap: { width: w - 48, useAdvancedWrap: true },
        color: "#ffffff",
      }).setDepth(23);
      this.view.add(qText);

      // 4 个选项按钮
      let optY = y + 140;
      q.options.forEach((opt, idx) => {
        const optG = this.add.graphics();
        optG.fillStyle(0x13303d, 0.98).fillRoundedRect(x + 14, optY, w - 28, 40, 8);
        optG.lineStyle(1.2, 0xd4a359, 0.8).strokeRoundedRect(x + 14, optY, w - 28, 40, 8);
        optG.setDepth(22);
        this.view.add(optG);

        const optT = this.add.text(x + 28, optY + 12, opt, {
          fontFamily: FONT_FAMILY,
          fontSize: "13px",
          fontStyle: "bold",
          color: "#ffffff",
        }).setDepth(23);
        this.view.add(optT);

        const hit = this.add.rectangle(x + w / 2, optY + 20, w - 28, 40, 0x000000, 0);
        hit.setInteractive({ useHandCursor: true }).setDepth(25);
        hit.on("pointerdown", () => {
          game.submitAnswer(idx);
          this.render();
        });
        this.view.add(hit);

        optY += 46;
      });
    } else {
      // 成绩单与奖状结算
      const score = game.state.totalScore;
      const isAce = score >= 90;

      const scoreBg = this.add.graphics();
      scoreBg.fillStyle(0x1e293b, 0.98).fillRoundedRect(x + 14, y + 54, w - 28, 180, 10);
      scoreBg.lineStyle(2, isAce ? 0xf59e0b : 0x38bdf8, 1).strokeRoundedRect(x + 14, y + 54, w - 28, 180, 10);
      scoreBg.setDepth(22);
      this.view.add(scoreBg);

      const scoreTitle = this.add.text(x + w / 2, y + 78, isAce ? "💯 荣获全班第一 · 满分三好学生！" : `📊 期末成绩：${score} 分`, {
        fontFamily: FONT_FAMILY,
        fontSize: "16px",
        fontStyle: "bold",
        color: isAce ? "#fbbf24" : "#93c5fd",
      }).setOrigin(0.5).setDepth(23);
      this.view.add(scoreTitle);

      const scoreDesc = this.add.text(x + w / 2, y + 114, isAce ? "班主任亲自将红绸大奖状颁发给你，全校通报表扬！\n智力 +15 · 快乐 +10 · 父母亲密度 +10" : "再接再厉！基础扎实，继续巩固！\n智力 +8 · 快乐 +4", {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        lineSpacing: 6,
        align: "center",
        color: "#e2e8f0",
      }).setOrigin(0.5).setDepth(23);
      this.view.add(scoreDesc);

      // 确认关闭按钮
      const okBtn = this.add.graphics();
      okBtn.fillStyle(0xb55a3c, 1).fillRoundedRect(x + 24, y + 268, w - 48, 44, 8);
      okBtn.lineStyle(1.5, 0xffd8a1, 1).strokeRoundedRect(x + 24, y + 268, w - 48, 44, 8);
      okBtn.setDepth(23);
      this.view.add(okBtn);

      const okT = this.add.text(x + w / 2, y + 290, "【 领奖入册 ▶ 】", {
        fontFamily: FONT_FAMILY,
        fontSize: "15px",
        fontStyle: "bold",
        color: "#ffffff",
      }).setOrigin(0.5).setDepth(24);
      this.view.add(okT);

      const hit = this.add.rectangle(x + w / 2, y + 290, w - 48, 44, 0x000000, 0);
      hit.setInteractive({ useHandCursor: true }).setDepth(25);
      hit.on("pointerdown", () => {
        if (isAce) {
          this.accumulatedYearBonus.intelligence += 15;
          this.accumulatedYearBonus.happiness += 10;
        } else {
          this.accumulatedYearBonus.intelligence += 8;
        }
        this.activeModal = null;
        this.activeExamQuizGame = null;
        this.render();
      });
      this.view.add(hit);
    }
  }

  // ==========================================
  // 5.6 全国统考中考与贴合现实志愿填报系统
  // ==========================================
  private renderZhongkaoModalContent(x: number, y: number, w: number, h: number): void {
    if (!this.activeZhongkao) this.activeZhongkao = new ZhongkaoManager();
    const zk = this.activeZhongkao;

    const title = this.add.text(x + 18, y + 16, "🎓 全国统一中考 · 志愿填报与录取", {
      fontFamily: FONT_FAMILY,
      fontSize: "17px",
      fontStyle: "bold",
      color: "#ffd8a1",
    }).setDepth(22);
    this.view.add(title);

    if (zk.phase === "exam") {
      const q = zk.questions[zk.currentQuestionIndex];
      const qBg = this.add.graphics();
      qBg.fillStyle(0x0e2430, 0.98).fillRoundedRect(x + 14, y + 46, w - 28, 86, 8);
      qBg.lineStyle(1.5, 0x38bdf8, 0.9).strokeRoundedRect(x + 14, y + 46, w - 28, 86, 8);
      qBg.setDepth(22);
      this.view.add(qBg);

      const qSubject = this.add.text(x + 24, y + 54, "【中考统考 · " + q.subject + "试卷 · 第 " + (zk.currentQuestionIndex + 1) + "/3 题】", {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        fontStyle: "bold",
        color: "#8be5d1",
      }).setDepth(23);
      this.view.add(qSubject);

      const qText = this.add.text(x + 24, y + 74, q.question, {
        fontFamily: FONT_FAMILY,
        fontSize: "13px",
        fontStyle: "bold",
        lineSpacing: 4,
        wordWrap: { width: w - 48, useAdvancedWrap: true },
        color: "#ffffff",
      }).setDepth(23);
      this.view.add(qText);

      let optY = y + 140;
      q.options.forEach((opt, idx) => {
        const optG = this.add.graphics();
        optG.fillStyle(0x13303d, 0.98).fillRoundedRect(x + 14, optY, w - 28, 40, 8);
        optG.lineStyle(1.2, 0xd4a359, 0.8).strokeRoundedRect(x + 14, optY, w - 28, 40, 8);
        optG.setDepth(22);
        this.view.add(optG);

        const optT = this.add.text(x + 28, optY + 12, opt, {
          fontFamily: FONT_FAMILY,
          fontSize: "13px",
          fontStyle: "bold",
          color: "#ffffff",
        }).setDepth(23);
        this.view.add(optT);

        const hit = this.add.rectangle(x + w / 2, optY + 20, w - 28, 40, 0x000000, 0);
        hit.setInteractive({ useHandCursor: true }).setDepth(25);
        hit.on("pointerdown", () => {
          zk.submitAnswer(idx);
          this.render();
        });
        this.view.add(hit);

        optY += 46;
      });
    } else if (zk.phase === "score_board") {
      const scoreBg = this.add.graphics();
      scoreBg.fillStyle(0x1e293b, 0.98).fillRoundedRect(x + 14, y + 54, w - 28, 160, 10);
      scoreBg.lineStyle(2, 0xf59e0b, 1).strokeRoundedRect(x + 14, y + 54, w - 28, 160, 10);
      scoreBg.setDepth(22);
      this.view.add(scoreBg);

      const scoreTitle = this.add.text(x + w / 2, y + 78, "🎉 中考统考放榜：" + zk.calculatedScore + " 分", {
        fontFamily: FONT_FAMILY,
        fontSize: "17px",
        fontStyle: "bold",
        color: "#fbbf24",
      }).setOrigin(0.5).setDepth(23);
      this.view.add(scoreTitle);

      const rankDesc = this.add.text(x + w / 2, y + 112, zk.calculatedScore >= 85 ? "全县排名前 5% · 具备全部学校志愿填报资格！\n可选择省重点高中冲名校，亦可报读炙手可热的包分配中专！" : "成绩优良 · 达到中专与普通高中录取分数线！", {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        lineSpacing: 6,
        align: "center",
        color: "#e2e8f0",
      }).setOrigin(0.5).setDepth(23);
      this.view.add(rankDesc);

      const goVolBtn = this.add.graphics();
      goVolBtn.fillStyle(0xb55a3c, 1).fillRoundedRect(x + 24, y + 230, w - 48, 48, 10);
      goVolBtn.lineStyle(2, 0xffd8a1, 1).strokeRoundedRect(x + 24, y + 230, w - 48, 48, 10);
      goVolBtn.setDepth(23);
      this.view.add(goVolBtn);

      const goVolT = this.add.text(x + w / 2, y + 254, "【 📝 开始填报中考志愿表 ▶ 】", {
        fontFamily: FONT_FAMILY,
        fontSize: "15px",
        fontStyle: "bold",
        color: "#ffffff",
      }).setOrigin(0.5).setDepth(24);
      this.view.add(goVolT);

      const hit = this.add.rectangle(x + w / 2, y + 254, w - 48, 48, 0x000000, 0);
      hit.setInteractive({ useHandCursor: true }).setDepth(25);
      hit.on("pointerdown", () => {
        zk.proceedToVolunteer();
        this.render();
      });
      this.view.add(hit);
    } else if (zk.phase === "volunteer_form") {
      const volTitle = this.add.text(x + 18, y + 44, "请根据家庭规划与未来志愿，慎重选择第一志愿：", {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        fontStyle: "bold",
        color: "#8be5d1",
      }).setDepth(22);
      this.view.add(volTitle);

      let schY = y + 68;
      SCHOOL_OPTIONS_DATABASE.forEach((sch) => {
        const canApply = zk.calculatedScore >= sch.minScore;
        const schG = this.add.graphics();
        schG.fillStyle(canApply ? 0x13303d : 0x1e293b, 0.98).fillRoundedRect(x + 14, schY, w - 28, 64, 8);
        schG.lineStyle(1.2, canApply ? 0xd4a359 : 0x475569, 0.9).strokeRoundedRect(x + 14, schY, w - 28, 64, 8);
        schG.setDepth(22);
        this.view.add(schG);

        const schName = this.add.text(x + 24, schY + 8, sch.name, {
          fontFamily: FONT_FAMILY,
          fontSize: "13px",
          fontStyle: "bold",
          color: canApply ? "#ffffff" : "#94a3b8",
        }).setDepth(23);
        this.view.add(schName);

        const schType = this.add.text(x + w - 24, schY + 8, "[" + sch.categoryName + "]", {
          fontFamily: FONT_FAMILY,
          fontSize: "12px",
          fontStyle: "bold",
          color: sch.category === "polytechnic_zhuan" ? "#34d399" : "#38bdf8",
        }).setOrigin(1, 0).setDepth(23);
        this.view.add(schType);

        const schDesc = this.add.text(x + 24, schY + 28, sch.description, {
          fontFamily: FONT_FAMILY,
          fontSize: "11px",
          color: "#cbd5e1",
          wordWrap: { width: w - 48, useAdvancedWrap: true },
        }).setDepth(23);
        this.view.add(schDesc);

        const applyBtn = this.add.graphics();
        applyBtn.fillStyle(canApply ? 0xb55a3c : 0x334155, 1).fillRoundedRect(x + w - 74, schY + 36, 54, 24, 4);
        applyBtn.setDepth(23);
        this.view.add(applyBtn);

        const applyT = this.add.text(x + w - 47, schY + 48, canApply ? "填报" : "不够分", {
          fontFamily: FONT_FAMILY,
          fontSize: "11px",
          fontStyle: "bold",
          color: canApply ? "#ffffff" : "#94a3b8",
        }).setOrigin(0.5).setDepth(24);
        this.view.add(applyT);

        if (canApply) {
          const hit = this.add.rectangle(x + (w - 28) / 2 + 14, schY + 32, w - 28, 64, 0x000000, 0);
          hit.setInteractive({ useHandCursor: true }).setDepth(25);
          hit.on("pointerdown", () => {
            this.selectedSchool = zk.submitVolunteer(sch.id);
            this.render();
          });
          this.view.add(hit);
        }

        schY += 72;
      });
    } else if (zk.phase === "admission_letter") {
      const sch = zk.selectedSchool || SCHOOL_OPTIONS_DATABASE[0];
      const letterBg = this.add.graphics();
      letterBg.fillStyle(0x7f1d1d, 0.98).fillRoundedRect(x + 14, y + 46, w - 28, 200, 10);
      letterBg.lineStyle(2.5, 0xfbbf24, 1).strokeRoundedRect(x + 14, y + 46, w - 28, 200, 10);
      letterBg.setDepth(22);
      this.view.add(letterBg);

      const letTitle = this.add.text(x + w / 2, y + 68, "📜 录 取 通 知 书", {
        fontFamily: FONT_FAMILY,
        fontSize: "18px",
        fontStyle: "bold",
        color: "#fef08a",
      }).setOrigin(0.5).setDepth(23);
      this.view.add(letTitle);

      const letBody = this.add.text(x + 28, y + 96, "祝贺【" + (this.snapshot.playerName || "李建国") + "】同学：\n\n经初中学业考试选拔与第一志愿录取，你已被我校正式录取为：\n【" + sch.name + "】新生！\n\n" + sch.familyImpact, {
        fontFamily: FONT_FAMILY,
        fontSize: "12.5px",
        lineSpacing: 6,
        color: "#ffffff",
        wordWrap: { width: w - 56, useAdvancedWrap: true },
      }).setDepth(23);
      this.view.add(letBody);

      const okBtn = this.add.graphics();
      okBtn.fillStyle(0xb55a3c, 1).fillRoundedRect(x + 24, y + 260, w - 48, 48, 10);
      okBtn.lineStyle(2, 0xffd8a1, 1).strokeRoundedRect(x + 24, y + 260, w - 48, 48, 10);
      okBtn.setDepth(23);
      this.view.add(okBtn);

      const okT = this.add.text(x + w / 2, y + 284, "【 喜报报到 · 开启新阶段 ▶ 】", {
        fontFamily: FONT_FAMILY,
        fontSize: "15px",
        fontStyle: "bold",
        color: "#ffffff",
      }).setOrigin(0.5).setDepth(24);
      this.view.add(okT);

      const hit = this.add.rectangle(x + w / 2, y + 284, w - 48, 48, 0x000000, 0);
      hit.setInteractive({ useHandCursor: true }).setDepth(25);
      hit.on("pointerdown", () => {
        this.accumulatedYearBonus.happiness += 15;
        this.accumulatedYearBonus.intelligence += 10;
        this.activeModal = null;
        this.activeZhongkao = null;
        this.render();
      });
      this.view.add(hit);
    }
  }

  // ==========================================
  // 5.7 职业电竞比赛与巅峰正赛系统
  // ==========================================
  private startEsportsMatchSession(): void {
    const stats = this.getEffectiveStats(this.snapshot);
    this.lolCareerMgr.syncYear(stats.calendarYear);
    const prep = this.lolCareerMgr.prepareNextMatch();

    this.activeEsportsSession = {
      stage: "bp",
      myTeam: {
        name: prep.myTeam.name,
        shortName: prep.myTeam.shortName,
        league: prep.myTeam.league,
        badge: prep.myTeam.badge,
        color: prep.myTeam.color,
        power: prep.myTeam.power,
        playerRole: prep.myTeam.playerRole,
      },
      opponentTeam: {
        name: prep.opponentTeam.name,
        shortName: prep.opponentTeam.shortName,
        league: prep.opponentTeam.league,
        badge: prep.opponentTeam.badge,
        color: prep.opponentTeam.color,
        power: prep.opponentTeam.power,
        acePlayer: prep.opponentTeam.acePlayer,
      },
      matchType: prep.matchType,
      liveStep: 1,
      liveLogs: [],
      result: {
        isWin: true,
        myScore: 2,
        oppScore: 0,
        kda: "9/1/14",
        damageShare: 35,
        isMVP: true,
        mvpTitle: "本场最有价值选手 MVP 🏅",
        bonusCash: 25000,
        clubStandingDelta: "常规赛胜场 +1，净胜分 +2，排名稳居前列",
      },
    };
  }

  private renderEsportsMatchModalContent(x: number, y: number, w: number, h: number): void {
    if (!this.activeEsportsSession) {
      this.startEsportsMatchSession();
    }
    const session = this.activeEsportsSession!;
    const metrics = this.lolCareerMgr.getDerivedMetrics();

    // ==========================================
    // 阶段 1: 像素风格战术 BP 棋盘博弈
    // ==========================================
    if (session.stage === "bp") {
      const bpBoard = new EsportsBpBoard({
        scene: this,
        x: x,
        y: y,
        width: w,
        height: h,
        mySide: "blue",
        myTeamName: session.myTeam.name,
        opponentTeamName: session.opponentTeam.name,
        playerRole: "mid",
        playerSignatureHero: "影流之主 (劫)",
        onConfirm: (bpResult: EsportsBpResult) => {
          session.tacticsBP = bpResult.playerTactics === "dive_teamfight"
            ? "aggressive_dive"
            : bpResult.playerTactics === "split_push"
            ? "split_push"
            : bpResult.playerTactics === "teamfight_wombo"
            ? "teamfight_wombo"
            : "aggressive_dive";

          session.stage = "live";
          session.liveStep = 1;
          this.render();
        },
      });
      bpBoard.setDepth(22);
      this.view.add(bpBoard);
    }

    // ==========================================
    // 阶段 2: 单局比赛像素实况演播切面与拼惩戒 QTE
    // ==========================================
    else if (session.stage === "live") {
      const matchView = new EsportsMatchView({
        scene: this,
        x: x,
        y: y,
        width: w,
        height: h,
        myTeamName: session.myTeam.shortName,
        opponentTeamName: session.opponentTeam.shortName,
        playerChampionTitle: "劫",
        bpAdvantageScore: 12,
        onTriggerSmiteQte: (onSmiteDone) => {
          // 呼出全屏像素龙坑拼惩戒小游戏
          const smiteQte = new EsportsQteSmite({
            scene: this,
            x: 0,
            y: 0,
            width: GAME_WIDTH,
            height: GAME_HEIGHT,
            targetMonsterName: "纳什男爵",
            playerApm: metrics.effectiveApm,
            playerReactionMs: metrics.effectiveReactionMs,
            hasInjuryPenalty: metrics.injuryPenaltyRating > 0,
            onComplete: (qteRes) => {
              onSmiteDone(qteRes.success);
            },
          });
          smiteQte.setDepth(150);
          this.view.add(smiteQte);
        },
        onMatchFinish: (summary: EsportsMatchSummary) => {
          session.result = {
            isWin: summary.isWin,
            myScore: summary.myScore,
            oppScore: summary.oppScore,
            kda: summary.kda,
            damageShare: summary.damageShare,
            isMVP: summary.isMvp,
            mvpTitle: summary.isMvp ? "本场最有价值选手 MVP 🏅" : "虽败犹荣",
            bonusCash: summary.isWin ? 25000 : 5000,
            clubStandingDelta: summary.isWin ? "常规赛胜场 +1，净胜分 +2，排名稳步攀升！" : "虽败犹荣，赛后全队进行了深入战术复盘。",
          };
          session.stage = "settlement";
          this.render();
        },
      });
      matchView.setDepth(22);
      this.view.add(matchView);
    }

    // ==========================================
    // 阶段 3: 赛后 MVP 荣誉勋章评定与伤害占比柱状图
    // ==========================================
    else if (session.stage === "settlement") {
      const res = session.result;
      const settlementModal = new EsportsSettlementModal({
        scene: this,
        x: x,
        y: y,
        width: w,
        height: h,
        data: {
          isWin: res.isWin,
          myTeamName: session.myTeam.name,
          opponentTeamName: session.opponentTeam.name,
          matchScore: [res.myScore, res.oppScore],
          kills: 11,
          deaths: 1,
          assists: 14,
          kda: res.kda,
          isMvp: res.isMVP,
          mvpRating: 9.8,
          mvpPlayerName: "你 (中单核心)",
          mvpHeroName: "影流之主",
          damageShare: res.damageShare,
          goldEarned: 18600,
          prizeMoney: res.bonusCash,
          clubPointsDelta: 2,
          fansGained: 18500,
          standingsNote: res.clubStandingDelta,
        },
        onConfirm: () => {
          const matchSum: EsportsMatchSummary = {
            isWin: res.isWin,
            myScore: res.myScore,
            oppScore: res.oppScore,
            kills: 11,
            deaths: 1,
            assists: 14,
            kda: res.kda,
            damageShare: res.damageShare,
            isMvp: res.isMVP,
            mvpRating: 9.8,
            goldLeadFinal: 8500,
            durationMinutes: 32,
          };
          const recRes = this.lolCareerMgr.recordMatchResult(matchSum);
          this.accumulatedYearBonus.cash += recRes.earningsDelta;
          this.isEsportsProPlayer = true;
          this.lastRankTrainingResult = recRes.narrative;

          this.activeModal = null;
          this.activeEsportsSession = null;
          this.render();
        },
      });
      settlementModal.setDepth(22);
      this.view.add(settlementModal);
    }
  }


  // ==========================================
  // 6.1 出生代际与省份城市选择弹窗
  // ==========================================
  private renderBirthConfigModalContent(x: number, y: number, w: number, h: number): void {
    const title = this.add.text(x + 18, y + 16, "🌏 出生代际与时代出生地设定", {
      fontFamily: FONT_FAMILY,
      fontSize: "17px",
      fontStyle: "bold",
      color: "#ffd8a1",
    }).setDepth(22);
    this.view.add(title);

    const decTitle = this.add.text(x + 18, y + 46, "1. 选择你的时代背景代际：", {
      fontFamily: FONT_FAMILY,
      fontSize: "12px",
      fontStyle: "bold",
      color: "#8be5d1",
    }).setDepth(22);
    this.view.add(decTitle);

    let decY = y + 68;
    DECADES_DATABASE.forEach((dec) => {
      const isSel = this.birthConfigSys.selectedDecade.decade === dec.decade;
      const decG = this.add.graphics();
      decG.fillStyle(isSel ? 0xb55a3c : 0x13303d, 0.98).fillRoundedRect(x + 14, decY, w - 28, 44, 6);
      decG.lineStyle(1.5, isSel ? 0xffd8a1 : 0x38bdf8, 0.9).strokeRoundedRect(x + 14, decY, w - 28, 44, 6);
      decG.setDepth(22);
      this.view.add(decG);

      const dName = this.add.text(x + 24, decY + 6, dec.label + " · " + dec.themeTag, {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        fontStyle: "bold",
        color: isSel ? "#ffffff" : "#ffd8a1",
      }).setDepth(23);
      this.view.add(dName);

      const dDesc = this.add.text(x + 24, decY + 24, dec.description, {
        fontFamily: FONT_FAMILY,
        fontSize: "10.5px",
        color: "#cbd5e1",
        wordWrap: { width: w - 48, useAdvancedWrap: true },
      }).setDepth(23);
      this.view.add(dDesc);

      const hit = this.add.rectangle(x + w / 2, decY + 22, w - 28, 44, 0x000000, 0);
      hit.setInteractive({ useHandCursor: true }).setDepth(25);
      hit.on("pointerdown", () => {
        this.birthConfigSys.setDecade(dec.decade);
        this.render();
      });
      this.view.add(hit);

      decY += 48;
    });

    const provTitle = this.add.text(x + 18, decY + 8, "2. 选择出生省份（当前: " + this.birthConfigSys.selectedProvince.name + " · " + this.birthConfigSys.selectedProvince.tierName + "）：", {
      fontFamily: FONT_FAMILY,
      fontSize: "12px",
      fontStyle: "bold",
      color: "#8be5d1",
    }).setDepth(22);
    this.view.add(provTitle);

    let pY = decY + 28;
    const pCols = 3;
    PROVINCE_DATABASE.slice(0, 9).forEach((p, idx) => {
      const col = idx % pCols;
      const row = Math.floor(idx / pCols);
      const pW = (w - 28 - (pCols - 1) * 6) / pCols;
      const px = x + 14 + col * (pW + 6);
      const py = pY + row * 32;

      const isP = this.birthConfigSys.selectedProvince.id === p.id;
      const pG = this.add.graphics();
      pG.fillStyle(isP ? 0x0369a1 : 0x13303d, 1).fillRoundedRect(px, py, pW, 26, 4);
      pG.lineStyle(1, isP ? 0xffd8a1 : 0x475569, 1).strokeRoundedRect(px, py, pW, 26, 4);
      pG.setDepth(22);
      this.view.add(pG);

      const pT = this.add.text(px + pW / 2, py + 13, p.name.split(" ")[0], {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        fontStyle: "bold",
        color: "#ffffff",
      }).setOrigin(0.5).setDepth(23);
      this.view.add(pT);

      const pHit = this.add.rectangle(px + pW / 2, py + 13, pW, 26, 0x000000, 0);
      pHit.setInteractive({ useHandCursor: true }).setDepth(25);
      pHit.on("pointerdown", () => {
        this.birthConfigSys.setProvince(p.id);
        this.render();
      });
      this.view.add(pHit);
    });

    const okBtn = this.add.graphics();
    okBtn.fillStyle(0xb55a3c, 1).fillRoundedRect(x + 24, y + h - 54, w - 48, 42, 8);
    okBtn.lineStyle(1.5, 0xffd8a1, 1).strokeRoundedRect(x + 24, y + h - 54, w - 48, 42, 8);
    okBtn.setDepth(23);
    this.view.add(okBtn);

    const okT = this.add.text(x + w / 2, y + h - 33, "【 确定时代与地域设定 ▶ 】", {
      fontFamily: FONT_FAMILY,
      fontSize: "14px",
      fontStyle: "bold",
      color: "#ffffff",
    }).setOrigin(0.5).setDepth(24);
    this.view.add(okT);

    const hit = this.add.rectangle(x + w / 2, y + h - 33, w - 48, 42, 0x000000, 0);
    hit.setInteractive({ useHandCursor: true }).setDepth(25);
    hit.on("pointerdown", () => {
      this.activeModal = null;
      this.render();
    });
    this.view.add(hit);
  }

  // ==========================================
  // 6.2 全国统一高考与文理分科大考系统 (GaokaoModal)
  // ==========================================
  private renderGaokaoModalContent(x: number, y: number, w: number, h: number): void {
    const stats = this.getEffectiveStats(this.snapshot);
    const modal = new GaokaoModal({
      scene: this,
      x: 0,
      y: 0,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      initialStage: this.gaokaoInitialStage,
      candidateName: this.snapshot.playerName || "建国",
      candidateAge: stats.age,
      year: stats.calendarYear,
      chosenTrack: this.playerChosenTrack,
      academicFoundation: {
        chinese: Math.min(100, Math.max(50, stats.intelligence + 10)),
        math: Math.min(100, Math.max(50, stats.intelligence + 5)),
        english: Math.min(100, Math.max(50, stats.intelligence)),
        physics: Math.min(100, Math.max(50, stats.intelligence + 15)),
        chemistry: Math.min(100, Math.max(50, stats.intelligence + 10)),
        biology: Math.min(100, Math.max(50, stats.intelligence + 5)),
        history: Math.min(100, Math.max(50, stats.intelligence + 10)),
        politics: Math.min(100, Math.max(50, stats.intelligence + 5)),
        geography: Math.min(100, Math.max(50, stats.intelligence + 8)),
        stability: 85,
      },
      onTrackSelected: (track) => {
        this.playerChosenTrack = track;
        this.spawnFloatingText(
          GAME_WIDTH / 2,
          200,
          track === "science" ? "🔬 已确认进入理科班 (物化生)！" : "📜 已确认进入文科班 (史地政)！",
          "#fbbf24"
        );
      },
      onComplete: (res: GaokaoCompletionResult) => {
        this.lastGaokaoResult = res;
        this.accumulatedYearBonus.happiness += res.statGains.happiness;
        this.accumulatedYearBonus.intelligence += res.statGains.intelligence;
        this.accumulatedYearBonus.charm += Math.round(res.statGains.reputation / 2);
        this.activeModal = null;
        this.render();
      },
      onClose: () => {
        this.activeModal = null;
        this.render();
      },
    });
    modal.setDepth(1000);
    this.view.add(modal);
  }

  // ==========================================
  // 6.3 浪漫婚恋与夫妻生活弹窗
  // ==========================================
  private renderRomanceDetailModalContent(x: number, y: number, w: number, h: number, s: GameRuntimeSnapshot): void {
    const p = this.romanceMarriageSys.partner;
    const currentYear = s.calendarYear || 1990;

    // 1. 顶部标题
    const title = this.add.text(x + 18, y + 14, "💍 浪漫婚恋与夫妻生活 · " + p.name, {
      fontFamily: FONT_FAMILY,
      fontSize: "16px",
      fontStyle: "bold",
      color: "#ffd8a1",
    }).setDepth(22);
    this.view.add(title);

    // 2. 子Tab切换条
    const tabs: Array<{ id: "interact" | "candidates" | "housing" | "conflict"; label: string }> = [
      { id: "interact", label: "💕 约会互动" },
      { id: "candidates", label: "👥 结识相亲" },
      { id: "housing", label: "🏡 房产置业" },
      { id: "conflict", label: "⚡ 夫妻化解" },
    ];

    const tabW = (w - 36) / tabs.length;
    tabs.forEach((tab, i) => {
      const tx = x + 18 + i * tabW;
      const isSel = this.romanceActiveTab === tab.id;
      const tBg = this.add.graphics();
      tBg.fillStyle(isSel ? 0xf43f5e : 0x13303d, 0.95).fillRoundedRect(tx + 2, y + 42, tabW - 4, 26, 6);
      tBg.lineStyle(1.2, isSel ? 0xffd8a1 : 0xd4a359, 0.8).strokeRoundedRect(tx + 2, y + 42, tabW - 4, 26, 6);
      tBg.setDepth(22);
      this.view.add(tBg);

      const tTxt = this.add.text(tx + tabW / 2, y + 55, tab.label, {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        fontStyle: isSel ? "bold" : "normal",
        color: isSel ? "#ffffff" : "#cbd5e1",
      }).setOrigin(0.5).setDepth(23);
      this.view.add(tTxt);

      const tHit = this.add.rectangle(tx + tabW / 2, y + 55, tabW - 4, 26, 0x000000, 0);
      tHit.setInteractive({ useHandCursor: true }).setDepth(24);
      tHit.on("pointerdown", () => {
        this.romanceActiveTab = tab.id;
        this.render();
      });
      this.view.add(tHit);
    });

    // 3. 子Tab内容渲染
    if (this.romanceActiveTab === "interact") {
      // 伴侣卡片
      const infoBg = this.add.graphics();
      infoBg.fillStyle(0x0e2430, 0.98).fillRoundedRect(x + 14, y + 74, w - 28, 80, 8);
      infoBg.lineStyle(1.5, 0xf43f5e, 0.9).strokeRoundedRect(x + 14, y + 74, w - 28, 80, 8);
      infoBg.setDepth(22);
      this.view.add(infoBg);

      const pStateDesc =
        p.relationState === "married"
          ? "💍 已婚伴侣"
          : p.relationState === "engaged"
          ? "💌 订婚"
          : p.relationState === "dating"
          ? "💖 热恋中"
          : "🌿 相识交往中";

      const pName = this.add.text(x + 24, y + 80, `${p.avatarIcon} ${p.name} (${pStateDesc}) · ${p.occupation}`, {
        fontFamily: FONT_FAMILY,
        fontSize: "12.5px",
        fontStyle: "bold",
        color: "#fb7185",
      }).setDepth(23);
      this.view.add(pName);

      const pDetail = this.add.text(x + 24, y + 100, `好感度: ${p.affection}/100   婚后满意度: ${p.maritalSatisfaction}/100   月薪: ¥${p.salaryMonthly}`, {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        color: "#ffd8a1",
      }).setDepth(23);
      this.view.add(pDetail);

      const pBio = this.add.text(x + 24, y + 120, `${p.personality}`, {
        fontFamily: FONT_FAMILY,
        fontSize: "10.5px",
        color: "#cbd5e1",
        wordWrap: { width: w - 48, useAdvancedWrap: true },
      }).setDepth(23);
      this.view.add(pBio);

      // 互动动作列表
      const acts: Array<{
        id: "chat" | "dinner" | "movie" | "date_park" | "gift" | "confess" | "propose" | "wedding" | "marital_care";
        label: string;
        cost: string;
      }> = [
        { id: "chat", label: "💬 漫步长谈", cost: "⚡ 5精力" },
        { id: "dinner", label: "🍽️ 烛光美餐", cost: "⚡ 10精力 · ¥80" },
        { id: "movie", label: "🎬 浪漫电影", cost: "⚡ 8精力 · ¥60" },
        { id: "date_park", label: "🎡 公园踏青", cost: "⚡ 12精力 · ¥50" },
        { id: "gift", label: "🎁 精选送礼 (红玫瑰/典藏集/键盘/望远镜)", cost: "按礼物标价" },
        { id: "confess", label: "💌 浪漫告白 (需好感≥55 确定恋爱)", cost: "⚡ 15精力" },
        { id: "propose", label: "💍 单膝求婚 (需热恋且好感≥85)", cost: "💎 钻戒 ¥5200" },
        { id: "wedding", label: "💒 盛大婚礼 (结为合法夫妻开启婚后)", cost: "庆典喜宴 ¥10000" },
        { id: "marital_care", label: "☕ 婚后日常温情关怀 (已婚专属)", cost: "⚡ 8精力 · ¥30" },
      ];

      let actY = y + 160;
      acts.forEach((act) => {
        const aG = this.add.graphics();
        aG.fillStyle(0x13303d, 0.98).fillRoundedRect(x + 14, actY, w - 28, 34, 6);
        aG.lineStyle(1.2, 0xd4a359, 0.8).strokeRoundedRect(x + 14, actY, w - 28, 34, 6);
        aG.setDepth(22);
        this.view.add(aG);

        const aT = this.add.text(x + 24, actY + 8, act.label, {
          fontFamily: FONT_FAMILY,
          fontSize: "11.5px",
          fontStyle: "bold",
          color: "#ffffff",
        }).setDepth(23);
        this.view.add(aT);

        const aCost = this.add.text(x + w - 24, actY + 9, act.cost, {
          fontFamily: FONT_FAMILY,
          fontSize: "10.5px",
          color: "#ffd8a1",
        }).setOrigin(1, 0).setDepth(23);
        this.view.add(aCost);

        const hit = this.add.rectangle(x + w / 2, actY + 17, w - 28, 34, 0x000000, 0);
        hit.setInteractive({ useHandCursor: true }).setDepth(25);
        hit.on("pointerdown", () => {
          const res = this.romanceMarriageSys.interact(act.id);
          this.accumulatedYearBonus.charm += 2;
          this.accumulatedYearBonus.happiness += res.satisfactionGain || 2;
          this.render();
        });
        this.view.add(hit);

        actY += 38;
      });
    } else if (this.romanceActiveTab === "candidates") {
      // 候选人池列表
      let cY = y + 74;
      this.romanceMarriageSys.candidatePool.forEach((cand) => {
        const isCurrent = cand.id === p.id;
        const cG = this.add.graphics();
        cG.fillStyle(isCurrent ? 0x2d1a38 : 0x0e2430, 0.98).fillRoundedRect(x + 14, cY, w - 28, 68, 8);
        cG.lineStyle(1.5, isCurrent ? 0xf43f5e : 0x475569, 0.9).strokeRoundedRect(x + 14, cY, w - 28, 68, 8);
        cG.setDepth(22);
        this.view.add(cG);

        const cHead = this.add.text(x + 22, cY + 8, `${cand.avatarIcon} ${cand.name} (${cand.age}岁) · ${cand.occupation}`, {
          fontFamily: FONT_FAMILY,
          fontSize: "12px",
          fontStyle: "bold",
          color: isCurrent ? "#fb7185" : "#ffffff",
        }).setDepth(23);
        this.view.add(cHead);

        const cSub = this.add.text(x + 22, cY + 28, `月薪: ¥${cand.salaryMonthly}  好感度: ${cand.affection}  颜值: ${cand.appearance}  智力: ${cand.intelligence}`, {
          fontFamily: FONT_FAMILY,
          fontSize: "10.5px",
          color: "#ffd8a1",
        }).setDepth(23);
        this.view.add(cSub);

        const cBio = this.add.text(x + 22, cY + 46, `${cand.personality}`, {
          fontFamily: FONT_FAMILY,
          fontSize: "10px",
          color: "#94a3b8",
          wordWrap: { width: w - 120, useAdvancedWrap: true },
        }).setDepth(23);
        this.view.add(cBio);

        const selBtn = this.add.graphics();
        selBtn.fillStyle(isCurrent ? 0x10b981 : 0xb55a3c, 1).fillRoundedRect(x + w - 95, cY + 18, 75, 32, 6);
        selBtn.lineStyle(1, 0xffd8a1, 0.8).strokeRoundedRect(x + w - 95, cY + 18, 75, 32, 6);
        selBtn.setDepth(23);
        this.view.add(selBtn);

        const selT = this.add.text(x + w - 57, cY + 34, isCurrent ? "当前伴侣" : "💖 结识交往", {
          fontFamily: FONT_FAMILY,
          fontSize: "10.5px",
          fontStyle: "bold",
          color: "#ffffff",
        }).setOrigin(0.5).setDepth(24);
        this.view.add(selT);

        const cHit = this.add.rectangle(x + w - 57, cY + 34, 75, 32, 0x000000, 0);
        cHit.setInteractive({ useHandCursor: true }).setDepth(25);
        cHit.on("pointerdown", () => {
          this.romanceMarriageSys.selectPartner(cand.id);
          this.render();
        });
        this.view.add(cHit);

        cY += 74;
      });
    } else if (this.romanceActiveTab === "housing") {
      // 房产置业与夫妻储蓄
      const poolBg = this.add.graphics();
      poolBg.fillStyle(0x0e2430, 0.98).fillRoundedRect(x + 14, y + 74, w - 28, 44, 8);
      poolBg.lineStyle(1.2, 0x10b981, 0.9).strokeRoundedRect(x + 14, y + 74, w - 28, 44, 8);
      poolBg.setDepth(22);
      this.view.add(poolBg);

      const poolT = this.add.text(x + 22, y + 84, `💰 夫妻共同储蓄池: ¥${this.romanceMarriageSys.familySavings}`, {
        fontFamily: FONT_FAMILY,
        fontSize: "12.5px",
        fontStyle: "bold",
        color: "#34d399",
      }).setDepth(23);
      this.view.add(poolT);

      const poolSub = this.add.text(x + 22, y + 102, `伴侣每月薪资将注入共同储蓄池，夫妻同心添砖加瓦！`, {
        fontFamily: FONT_FAMILY,
        fontSize: "10px",
        color: "#cbd5e1",
      }).setDepth(23);
      this.view.add(poolSub);

      let hY = y + 126;
      HOUSING_DATABASE.forEach((house) => {
        const isOwned = this.romanceMarriageSys.ownedHouses.some((h) => h.id === house.id);
        const hG = this.add.graphics();
        hG.fillStyle(isOwned ? 0x1e3a5f : 0x13303d, 0.98).fillRoundedRect(x + 14, hY, w - 28, 80, 8);
        hG.lineStyle(1.2, isOwned ? 0x38bdf8 : 0xd4a359, 0.8).strokeRoundedRect(x + 14, hY, w - 28, 80, 8);
        hG.setDepth(22);
        this.view.add(hG);

        const hName = this.add.text(x + 22, hY + 8, `🏡 ${house.name} · ¥${house.price}`, {
          fontFamily: FONT_FAMILY,
          fontSize: "12px",
          fontStyle: "bold",
          color: isOwned ? "#38bdf8" : "#ffd8a1",
        }).setDepth(23);
        this.view.add(hName);

        const hDesc = this.add.text(x + 22, hY + 28, `${house.desc} (满意度+${house.satisfactionBonus})`, {
          fontFamily: FONT_FAMILY,
          fontSize: "10px",
          color: "#ffffff",
          wordWrap: { width: w - 130, useAdvancedWrap: true },
        }).setDepth(23);
        this.view.add(hDesc);

        const btnBg = this.add.graphics();
        btnBg.fillStyle(isOwned ? 0x10b981 : 0xb55a3c, 1).fillRoundedRect(x + w - 105, hY + 24, 85, 32, 6);
        btnBg.lineStyle(1, 0xffd8a1, 0.8).strokeRoundedRect(x + w - 105, hY + 24, 85, 32, 6);
        btnBg.setDepth(23);
        this.view.add(btnBg);

        const btnT = this.add.text(x + w - 62, hY + 40, isOwned ? "✅ 已购置" : "🔑 夫妻出资购房", {
          fontFamily: FONT_FAMILY,
          fontSize: "10px",
          fontStyle: "bold",
          color: "#ffffff",
        }).setOrigin(0.5).setDepth(24);
        this.view.add(btnT);

        const hit = this.add.rectangle(x + w - 62, hY + 40, 85, 32, 0x000000, 0);
        hit.setInteractive({ useHandCursor: true }).setDepth(25);
        hit.on("pointerdown", () => {
          if (!isOwned) {
            const playerFunds = s.resources?.cashYuan || 20000;
            const res = this.romanceMarriageSys.buyHouse(house.id, playerFunds);
            this.render();
          }
        });
        this.view.add(hit);

        hY += 86;
      });
    } else if (this.romanceActiveTab === "conflict") {
      // 夫妻矛盾争吵与和解
      if (p.relationState !== "married") {
        const lockBg = this.add.graphics();
        lockBg.fillStyle(0x0e2430, 0.98).fillRoundedRect(x + 14, y + 74, w - 28, 120, 8);
        lockBg.setDepth(22);
        this.view.add(lockBg);

        const lockT = this.add.text(x + w / 2, y + 130, "🔒 尚未结婚\n\n步入婚姻殿堂后，将开启真实的柴米油盐琐事与夫妻感情化解考验！", {
          fontFamily: FONT_FAMILY,
          fontSize: "12px",
          color: "#94a3b8",
          align: "center",
          wordWrap: { width: w - 60, useAdvancedWrap: true },
        }).setOrigin(0.5).setDepth(23);
        this.view.add(lockT);
      } else {
        if (!this.activeMarriageConflict) {
          this.activeMarriageConflict = this.romanceMarriageSys.triggerRandomConflict();
        }

        const conf = this.activeMarriageConflict || MARRIAGE_CONFLICT_DATABASE[0];

        const confBg = this.add.graphics();
        confBg.fillStyle(0x0e2430, 0.98).fillRoundedRect(x + 14, y + 74, w - 28, 90, 8);
        confBg.lineStyle(1.5, 0xf59e0b, 0.9).strokeRoundedRect(x + 14, y + 74, w - 28, 90, 8);
        confBg.setDepth(22);
        this.view.add(confBg);

        const cTitle = this.add.text(x + 22, y + 82, conf.title, {
          fontFamily: FONT_FAMILY,
          fontSize: "12.5px",
          fontStyle: "bold",
          color: "#fbbf24",
        }).setDepth(23);
        this.view.add(cTitle);

        const cScene = this.add.text(x + 22, y + 104, conf.scenario, {
          fontFamily: FONT_FAMILY,
          fontSize: "10.5px",
          color: "#ffffff",
          wordWrap: { width: w - 48, useAdvancedWrap: true },
        }).setDepth(23);
        this.view.add(cScene);

        let chY = y + 172;
        conf.choices.forEach((choice) => {
          const chG = this.add.graphics();
          chG.fillStyle(0x13303d, 0.98).fillRoundedRect(x + 14, chY, w - 28, 48, 6);
          chG.lineStyle(1.2, 0xd4a359, 0.8).strokeRoundedRect(x + 14, chY, w - 28, 48, 6);
          chG.setDepth(22);
          this.view.add(chG);

          const chT = this.add.text(x + 24, chY + 8, choice.text, {
            fontFamily: FONT_FAMILY,
            fontSize: "11px",
            color: "#ffffff",
            wordWrap: { width: w - 48, useAdvancedWrap: true },
          }).setDepth(23);
          this.view.add(chT);

          const hit = this.add.rectangle(x + w / 2, chY + 24, w - 28, 48, 0x000000, 0);
          hit.setInteractive({ useHandCursor: true }).setDepth(25);
          hit.on("pointerdown", () => {
            const res = this.romanceMarriageSys.resolveConflict(conf.id, choice.id);
            this.accumulatedYearBonus.happiness += res.satisfactionDelta;
            this.activeMarriageConflict = null;
            this.render();
          });
          this.view.add(hit);

          chY += 54;
        });
      }
    }
  }

  // ==========================================
  // 6.4 生育养育与子女成长弹窗
  // ==========================================
  private renderFertilityModalContent(x: number, y: number, w: number, h: number, s: GameRuntimeSnapshot): void {
    const currentYear = s.calendarYear || 1990;
    const policy = this.fertilitySys.getPolicyForYear(currentYear);
    const partner = this.romanceMarriageSys.partner;
    const playerFunds = s.resources?.cashYuan || 20000;

    // 1. 顶部标题
    const title = this.add.text(x + 18, y + 14, "👶 生育养育与子女成长中心", {
      fontFamily: FONT_FAMILY,
      fontSize: "16px",
      fontStyle: "bold",
      color: "#ffd8a1",
    }).setDepth(22);
    this.view.add(title);

    // 2. 计划生育政策时代卡片
    const polBg = this.add.graphics();
    polBg.fillStyle(0x0e2430, 0.98).fillRoundedRect(x + 14, y + 42, w - 28, 54, 8);
    polBg.lineStyle(1.2, 0x38bdf8, 0.9).strokeRoundedRect(x + 14, y + 42, w - 28, 54, 8);
    polBg.setDepth(22);
    this.view.add(polBg);

    const polTitle = this.add.text(x + 22, y + 48, `📜 【${currentYear}年国策】${policy.name}`, {
      fontFamily: FONT_FAMILY,
      fontSize: "11.5px",
      fontStyle: "bold",
      color: "#38bdf8",
    }).setDepth(23);
    this.view.add(polTitle);

    const polDesc = this.add.text(x + 22, y + 68, `${policy.summary} (允许生育${policy.allowedChildren}孩)`, {
      fontFamily: FONT_FAMILY,
      fontSize: "10px",
      color: "#cbd5e1",
      wordWrap: { width: w - 48, useAdvancedWrap: true },
    }).setDepth(23);
    this.view.add(polDesc);

    // 3. 备孕与孕期专区
    const preg = this.fertilitySys.pregnancy;
    const pregBg = this.add.graphics();
    pregBg.fillStyle(0x13303d, 0.98).fillRoundedRect(x + 14, y + 102, w - 28, 92, 8);
    pregBg.lineStyle(1.2, 0xf43f5e, 0.8).strokeRoundedRect(x + 14, y + 102, w - 28, 92, 8);
    pregBg.setDepth(22);
    this.view.add(pregBg);

    if (!preg.isPregnant) {
      const pregTitle = this.add.text(x + 22, y + 110, `💕 伴侣当前状态: 【已婚备孕准备中】 · 伴侣: ${partner.name}`, {
        fontFamily: FONT_FAMILY,
        fontSize: "11.5px",
        fontStyle: "bold",
        color: "#fb7185",
      }).setDepth(23);
      this.view.add(pregTitle);

      const pregSub = this.add.text(x + 22, y + 130, `家庭已有子女: ${this.fertilitySys.children.length}人。调理好作息与身心，开启幸福家庭的生命延续。`, {
        fontFamily: FONT_FAMILY,
        fontSize: "10px",
        color: "#ffffff",
        wordWrap: { width: w - 48, useAdvancedWrap: true },
      }).setDepth(23);
      this.view.add(pregSub);

      const tryBtn = this.add.graphics();
      tryBtn.fillStyle(0xb55a3c, 1).fillRoundedRect(x + 22, y + 152, w - 44, 32, 6);
      tryBtn.lineStyle(1, 0xffd8a1, 0.8).strokeRoundedRect(x + 22, y + 152, w - 44, 32, 6);
      tryBtn.setDepth(23);
      this.view.add(tryBtn);

      const tryT = this.add.text(x + w / 2, y + 168, "🍼 夫妻温馨备孕 (⚡ 15精力)", {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        fontStyle: "bold",
        color: "#ffffff",
      }).setOrigin(0.5).setDepth(24);
      this.view.add(tryT);

      const tryHit = this.add.rectangle(x + w / 2, y + 168, w - 44, 32, 0x000000, 0);
      tryHit.setInteractive({ useHandCursor: true }).setDepth(25);
      tryHit.on("pointerdown", () => {
        this.fertilitySys.tryConceive(partner, currentYear);
        this.render();
      });
      this.view.add(tryHit);
    } else {
      const pregTitle = this.add.text(x + 22, y + 108, `🤰 孕周进度: 第${preg.pregnancyQuarter}/3季度  胎儿健康: ${preg.fetalHealth}  母亲身心: ${preg.motherCondition}`, {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        fontStyle: "bold",
        color: "#fb7185",
      }).setDepth(23);
      this.view.add(pregTitle);

      // 产检与安胎按钮
      const checkBtn = this.add.graphics();
      checkBtn.fillStyle(0x0284c7, 1).fillRoundedRect(x + 22, y + 130, (w - 52) / 2, 28, 6);
      checkBtn.setDepth(23);
      this.view.add(checkBtn);

      const checkT = this.add.text(x + 22 + (w - 52) / 4, y + 144, "🏥 医院产检 (¥300)", {
        fontFamily: FONT_FAMILY,
        fontSize: "10.5px",
        color: "#ffffff",
      }).setOrigin(0.5).setDepth(24);
      this.view.add(checkT);

      const checkHit = this.add.rectangle(x + 22 + (w - 52) / 4, y + 144, (w - 52) / 2, 28, 0x000000, 0);
      checkHit.setInteractive({ useHandCursor: true }).setDepth(25);
      checkHit.on("pointerdown", () => {
        this.fertilitySys.doPrenatalCheck(partner, playerFunds);
        this.render();
      });
      this.view.add(checkHit);

      const careBtn = this.add.graphics();
      careBtn.fillStyle(0x10b981, 1).fillRoundedRect(x + 30 + (w - 52) / 2, y + 130, (w - 52) / 2, 28, 6);
      careBtn.setDepth(23);
      this.view.add(careBtn);

      const careT = this.add.text(x + 30 + (w - 52) * 0.75, y + 144, "🥣 燕窝安胎 (¥200)", {
        fontFamily: FONT_FAMILY,
        fontSize: "10.5px",
        color: "#ffffff",
      }).setOrigin(0.5).setDepth(24);
      this.view.add(careT);

      const careHit = this.add.rectangle(x + 30 + (w - 52) * 0.75, y + 144, (w - 52) / 2, 28, 0x000000, 0);
      careHit.setInteractive({ useHandCursor: true }).setDepth(25);
      careHit.on("pointerdown", () => {
        this.fertilitySys.careForPregnancy(partner, playerFunds);
        this.render();
      });
      this.view.add(careHit);

      // 分娩按钮
      const birthBtn = this.add.graphics();
      birthBtn.fillStyle(0xd97706, 1).fillRoundedRect(x + 22, y + 162, w - 44, 26, 6);
      birthBtn.setDepth(23);
      this.view.add(birthBtn);

      const birthT = this.add.text(x + w / 2, y + 175, "🎉 产房迎接分娩 · 喜获千金/麟儿", {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        fontStyle: "bold",
        color: "#ffffff",
      }).setOrigin(0.5).setDepth(24);
      this.view.add(birthT);

      const birthHit = this.add.rectangle(x + w / 2, y + 175, w - 44, 26, 0x000000, 0);
      birthHit.setInteractive({ useHandCursor: true }).setDepth(25);
      birthHit.on("pointerdown", () => {
        this.fertilitySys.giveBirth(partner, currentYear, "natural", undefined, playerFunds, 60000);
        this.accumulatedYearBonus.happiness += 25;
        this.render();
      });
      this.view.add(birthHit);
    }

    // 4. 子女列表与培养管理
    const kids = this.fertilitySys.children;
    let kidY = y + 202;

    if (kids.length === 0) {
      const emptyBg = this.add.graphics();
      emptyBg.fillStyle(0x0e2430, 0.98).fillRoundedRect(x + 14, kidY, w - 28, 80, 8);
      emptyBg.setDepth(22);
      this.view.add(emptyBg);

      const emptyT = this.add.text(x + w / 2, kidY + 40, "👶 暂无子女\n\n夫妻可通过上方备孕与分娩迎接可爱的宝宝！", {
        fontFamily: FONT_FAMILY,
        fontSize: "11.5px",
        color: "#94a3b8",
        align: "center",
      }).setOrigin(0.5).setDepth(23);
      this.view.add(emptyT);
    } else {
      kids.forEach((child) => {
        const kG = this.add.graphics();
        kG.fillStyle(0x0e2430, 0.98).fillRoundedRect(x + 14, kidY, w - 28, 120, 8);
        kG.lineStyle(1.2, 0xd4a359, 0.8).strokeRoundedRect(x + 14, kidY, w - 28, 120, 8);
        kG.setDepth(22);
        this.view.add(kG);

        const icon = child.gender === "boy" ? "👦" : "👧";
        const kHead = this.add.text(x + 22, kidY + 8, `${icon} 【${child.name}】 (${child.age}岁 · ${child.stage}) · 天赋: ${child.talents[0]}`, {
          fontFamily: FONT_FAMILY,
          fontSize: "11.5px",
          fontStyle: "bold",
          color: "#ffd8a1",
        }).setDepth(23);
        this.view.add(kHead);

        const kStats = this.add.text(x + 22, kidY + 28, `健康: ${child.health}  快乐: ${child.happiness}  智力: ${child.intelligence}  艺术: ${child.artistry}  体能: ${child.athleticism}`, {
          fontFamily: FONT_FAMILY,
          fontSize: "10px",
          color: "#cbd5e1",
        }).setDepth(23);
        this.view.add(kStats);

        // 亲子互动4选1
        const childActs = [
          { id: "feed_play" as const, label: "🍼 早教喂养" },
          { id: "read_story" as const, label: "📖 讲绘本" },
          { id: "park_trip" as const, label: "🎡 游乐园" },
          { id: "heart_to_heart" as const, label: "💬 促膝谈心" },
        ];

        const cActW = (w - 56) / 4;
        childActs.forEach((ca, ci) => {
          const cax = x + 20 + ci * (cActW + 4);
          const caG = this.add.graphics();
          caG.fillStyle(0x1e3a5f, 1).fillRoundedRect(cax, kidY + 48, cActW, 26, 4);
          caG.setDepth(23);
          this.view.add(caG);

          const caT = this.add.text(cax + cActW / 2, kidY + 61, ca.label, {
            fontFamily: FONT_FAMILY,
            fontSize: "9.5px",
            color: "#ffffff",
          }).setOrigin(0.5).setDepth(24);
          this.view.add(caT);

          const caHit = this.add.rectangle(cax + cActW / 2, kidY + 61, cActW, 26, 0x000000, 0);
          caHit.setInteractive({ useHandCursor: true }).setDepth(25);
          caHit.on("pointerdown", () => {
            this.fertilitySys.interactWithChild(child.id, ca.id, playerFunds);
            this.accumulatedYearBonus.happiness += 2;
            this.render();
          });
          this.view.add(caHit);
        });

        // 兴趣班报名快捷按钮
        const courseBtn = this.add.graphics();
        courseBtn.fillStyle(0x065f46, 1).fillRoundedRect(x + 20, kidY + 80, w - 40, 28, 6);
        courseBtn.setDepth(23);
        this.view.add(courseBtn);

        const enrolledCount = child.enrolledCourses.length;
        const courseT = this.add.text(x + w / 2, kidY + 94, `🎨 兴趣班选课培养 (已报${enrolledCount}门: 奥数/钢琴/书画/游泳/编程/舞蹈)`, {
          fontFamily: FONT_FAMILY,
          fontSize: "10px",
          color: "#6ee7b7",
        }).setOrigin(0.5).setDepth(24);
        this.view.add(courseT);

        const courseHit = this.add.rectangle(x + w / 2, kidY + 94, w - 40, 28, 0x000000, 0);
        courseHit.setInteractive({ useHandCursor: true }).setDepth(25);
        courseHit.on("pointerdown", () => {
          // 轮流报名下一门兴趣课程
          const courses = INTEREST_COURSES_DATABASE;
          const next = courses.find((c) => !child.enrolledCourses.includes(c.id));
          if (next) {
            this.fertilitySys.enrollInterestCourse(child.id, next.id);
          } else {
            this.fertilitySys.dropInterestCourse(child.id, child.enrolledCourses[0]);
          }
          this.render();
        });
        this.view.add(courseHit);

        kidY += 126;
      });
    }
  }

  // ==========================================
  // 6.5 职场职级与升迁考核弹窗
  // ==========================================
  private renderCareerDetailModalContent(x: number, y: number, w: number, h: number, s: GameRuntimeSnapshot): void {
    const rank = this.careerPromotionSys.getCurrentRank();
    const nextRank = this.careerPromotionSys.getNextRank();
    const state = this.careerPromotionSys.state;
    const playerFunds = s.resources?.cashYuan || 20000;

    const title = this.add.text(x + 18, y + 14, "💼 职场职级与晋升考核中心", {
      fontFamily: FONT_FAMILY,
      fontSize: "16px",
      fontStyle: "bold",
      color: "#ffd8a1",
    }).setDepth(22);
    this.view.add(title);

    // 职级卡片
    const rBg = this.add.graphics();
    rBg.fillStyle(0x0e2430, 0.98).fillRoundedRect(x + 14, y + 42, w - 28, 86, 8);
    rBg.lineStyle(1.2, 0x38bdf8, 0.9).strokeRoundedRect(x + 14, y + 42, w - 28, 86, 8);
    rBg.setDepth(22);
    this.view.add(rBg);

    const rTitle = this.add.text(x + 22, y + 48, `${rank.icon} 当前职级: 【${rank.title}】 (Lv.${rank.level})`, {
      fontFamily: FONT_FAMILY,
      fontSize: "12.5px",
      fontStyle: "bold",
      color: "#38bdf8",
    }).setDepth(23);
    this.view.add(rTitle);

    const rSalary = this.add.text(x + 22, y + 70, `税前月薪: ¥${rank.baseMonthlySalary.toLocaleString()}   年终奖: ${rank.yearEndBonusMonths}个月   社会声望: +${rank.prestige}`, {
      fontFamily: FONT_FAMILY,
      fontSize: "10.5px",
      color: "#ffd8a1",
    }).setDepth(23);
    this.view.add(rSalary);

    const rDuty = this.add.text(x + 22, y + 90, `任职年限: ${state.yearsInCurrentRank}年   本年绩效考核: ${state.currentPerformanceScore}分   职场压力: ${state.workStress}/100`, {
      fontFamily: FONT_FAMILY,
      fontSize: "10px",
      color: "#cbd5e1",
    }).setDepth(23);
    this.view.add(rDuty);

    // 晋升考核按钮
    const evalBg = this.add.graphics();
    evalBg.fillStyle(nextRank ? 0xb55a3c : 0x475569, 1).fillRoundedRect(x + 14, y + 136, w - 28, 36, 6);
    evalBg.lineStyle(1.2, 0xffd8a1, 0.8).strokeRoundedRect(x + 14, y + 136, w - 28, 36, 6);
    evalBg.setDepth(22);
    this.view.add(evalBg);

    const evalT = this.add.text(x + w / 2, y + 154, nextRank ? `🚀 申请晋升评审: 目标【${nextRank.title}】` : `🌟 已达本行业最高终身职级巅峰`, {
      fontFamily: FONT_FAMILY,
      fontSize: "11.5px",
      fontStyle: "bold",
      color: "#ffffff",
    }).setOrigin(0.5).setDepth(23);
    this.view.add(evalT);

    if (nextRank) {
      const evalHit = this.add.rectangle(x + w / 2, y + 154, w - 28, 36, 0x000000, 0);
      evalHit.setInteractive({ useHandCursor: true }).setDepth(25);
      evalHit.on("pointerdown", () => {
        const stats = this.getEffectiveStats(s);
        const evalRes = this.careerPromotionSys.evaluatePromotion({
          intelligence: stats.intelligence,
          charm: stats.charm,
          health: stats.health,
          cashYuan: playerFunds,
        });
        if (evalRes.success) {
          this.accumulatedYearBonus.charm += 5;
          this.accumulatedYearBonus.happiness += 10;
        }
        this.render();
      });
      this.view.add(evalHit);
    }
  }

  // ==========================================
  // 6.6 A股证券股票开户与交易中心
  // ==========================================
  private renderStockMarketModalContent(x: number, y: number, w: number, h: number): void {
    const title = this.add.text(x + 18, y + 16, "📈 A股证券交易中心 · 时代风口投资", {
      fontFamily: FONT_FAMILY,
      fontSize: "16px",
      fontStyle: "bold",
      color: "#ffd8a1",
    }).setDepth(22);
    this.view.add(title);

    let secY = y + 54;
    this.financeStockSys.sectors.forEach((sec) => {
      const isUp = sec.quarterChangePercent >= 0;
      const sG = this.add.graphics();
      sG.fillStyle(0x0e2430, 0.98).fillRoundedRect(x + 14, secY, w - 28, 60, 8);
      sG.lineStyle(1.2, isUp ? 0xef4444 : 0x10b981, 0.9).strokeRoundedRect(x + 14, secY, w - 28, 60, 8);
      sG.setDepth(22);
      this.view.add(sG);

      const sName = this.add.text(x + 24, secY + 8, sec.name, {
        fontFamily: FONT_FAMILY,
        fontSize: "12.5px",
        fontStyle: "bold",
        color: "#ffffff",
      }).setDepth(23);
      this.view.add(sName);

      const sPrice = this.add.text(x + 24, secY + 30, "当前市价: ¥" + sec.currentPrice + "  持仓: " + sec.holdShares + "股", {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        color: "#cbd5e1",
      }).setDepth(23);
      this.view.add(sPrice);

      const sChange = this.add.text(x + w - 90, secY + 12, (isUp ? "+" : "") + sec.quarterChangePercent + "%", {
        fontFamily: FONT_FAMILY,
        fontSize: "14px",
        fontStyle: "bold",
        color: isUp ? "#ef4444" : "#10b981",
      }).setDepth(23);
      this.view.add(sChange);

      const buyBtn = this.add.graphics();
      buyBtn.fillStyle(0xb55a3c, 1).fillRoundedRect(x + w - 74, secY + 32, 54, 22, 4);
      buyBtn.setDepth(23);
      this.view.add(buyBtn);

      const buyT = this.add.text(x + w - 47, secY + 43, "买100股", {
        fontFamily: FONT_FAMILY,
        fontSize: "10.5px",
        fontStyle: "bold",
        color: "#ffffff",
      }).setOrigin(0.5).setDepth(24);
      this.view.add(buyT);

      const buyHit = this.add.rectangle(x + w - 47, secY + 43, 54, 22, 0x000000, 0);
      buyHit.setInteractive({ useHandCursor: true }).setDepth(25);
      buyHit.on("pointerdown", () => {
        const stats = this.getEffectiveStats(this.snapshot);
        const res = this.financeStockSys.buyShares(sec.id, 100, stats.cashYuan);
        if (res.success) {
          this.accumulatedYearBonus.cash -= res.totalCost;
        }
        this.render();
      });
      this.view.add(buyHit);

      secY += 66;
    });

    const refreshBtn = this.add.graphics();
    refreshBtn.fillStyle(0x0284c7, 1).fillRoundedRect(x + 24, secY + 10, w - 48, 40, 8);
    refreshBtn.setDepth(23);
    this.view.add(refreshBtn);

    const refT = this.add.text(x + w / 2, secY + 30, "【 刷新季度行情走势 ▶ 】", {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: "#ffffff",
    }).setOrigin(0.5).setDepth(24);
    this.view.add(refT);

    const hit = this.add.rectangle(x + w / 2, secY + 30, w - 48, 40, 0x000000, 0);
    hit.setInteractive({ useHandCursor: true }).setDepth(25);
    hit.on("pointerdown", () => {
      this.financeStockSys.quarterMarketTick();
      this.render();
    });
    this.view.add(hit);
  }

  // ==========================================
  // 6.5 银行存贷款与公积金抵扣
  // ==========================================
  private renderBankFinanceModalContent(x: number, y: number, w: number, h: number): void {
    const title = this.add.text(x + 18, y + 16, "🏦 银行金融 · 储蓄存款与公积金", {
      fontFamily: FONT_FAMILY,
      fontSize: "16px",
      fontStyle: "bold",
      color: "#ffd8a1",
    }).setDepth(22);
    this.view.add(title);

    const card = this.add.graphics();
    card.fillStyle(0x0e2430, 0.98).fillRoundedRect(x + 14, y + 54, w - 28, 140, 10);
    card.lineStyle(1.5, 0x34d399, 0.9).strokeRoundedRect(x + 14, y + 54, w - 28, 140, 10);
    card.setDepth(22);
    this.view.add(card);

    const t1 = this.add.text(x + 24, y + 68, "💰 活期储蓄存款: ¥" + this.financeStockSys.bankSavings + " 元 (年化利率 2.2%)", {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: "#fbbf24",
    }).setDepth(23);
    this.view.add(t1);

    const t2 = this.add.text(x + 24, y + 96, "🏠 住房公积金账户余额: ¥" + this.socialInsuranceSys.accumulatedHousingFund + " 元", {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: "#34d399",
    }).setDepth(23);
    this.view.add(t2);

    const t3 = this.add.text(x + 24, y + 124, "🛡️ 社保缴纳月数: " + this.socialInsuranceSys.accumulatedPensionMonths + " 个月 (享受终身医保与养老金)", {
      fontFamily: FONT_FAMILY,
      fontSize: "12px",
      color: "#cbd5e1",
    }).setDepth(23);
    this.view.add(t3);

    const okBtn = this.add.graphics();
    okBtn.fillStyle(0xb55a3c, 1).fillRoundedRect(x + 24, y + 220, w - 48, 44, 8);
    okBtn.setDepth(23);
    this.view.add(okBtn);

    const okT = this.add.text(x + w / 2, y + 242, "【 确定返回 】", {
      fontFamily: FONT_FAMILY,
      fontSize: "14px",
      fontStyle: "bold",
      color: "#ffffff",
    }).setOrigin(0.5).setDepth(24);
    this.view.add(okT);

    const hit = this.add.rectangle(x + w / 2, y + 242, w - 48, 44, 0x000000, 0);
    hit.setInteractive({ useHandCursor: true }).setDepth(25);
    hit.on("pointerdown", () => {
      this.activeModal = null;
      this.render();
    });
    this.view.add(hit);
  }

}
