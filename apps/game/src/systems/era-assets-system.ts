/**
 * 时代资产与商业投资大系统 (Era Assets & Historical Investment System)
 * 
 * 涵盖中国改革开放四十余年（1978 ~ 2024）波澜壮阔的家庭财富变迁与商业投资图景：
 * 1. 【老物件珍藏阁 (Vintage Gallery)】：一生收集的时代老物件（玩具、服饰、美食、家电、历史纪念品），属性加成与天资汇总；
 * 2. 【时代房产置业 (Real Estate Across Decades)】：从80年代机床厂红砖筒子楼、90年代单位集资房/步梯房、千禧年电梯商品房/名校学区房，到一线核心顶奢瞰江大平层，支持按揭/全款、历史增值重估与租金收益；
 * 3. 【代步交通载具 (Transportation Evolution)】：从二八大杠自行车、嘉陵70/幸福250摩托、桑塔纳2000/捷达王、奥迪100/奔驰虎头奔，到保时捷911超跑与高端智能电车；
 * 4. 【时代银行与80年代保值储蓄 (Banking & Inflation-Proof Savings)】：活期、定期存折，真实硬核还原1988~1993年“保值储蓄贴补率”对抗高通胀的历史红利，房贷按揭月供与提前还贷；
 * 5. 【1992股票认购证与A股证券风云 (Historical Stock Market)】：1992年上海股票认购证百倍暴富传奇、“老八股”狂飙、1996长虹绩优牛、1999科技牛、2007 6124世纪大牛市、2015杠杆牛、2020核心资产牛，包含完整交易佣金、印花税与季度分红。
 */

// ============================================================================
// 一、类型与数据契约定义 (Types & Contracts)
// ============================================================================

/** 老物件类别 */
export type VintageCategory = "toy" | "clothing" | "food" | "appliance" | "commemoration";

/** 老物件条目 */
export interface VintageAssetItem {
  id: string;
  name: string;
  icon: string;
  category: VintageCategory;
  yearAcquired: number;
  description: string;
  bonusText: string;
  statBonus?: {
    health?: number;
    intelligence?: number;
    charm?: number;
    happiness?: number;
    wealthMindset?: number; // 财商心智
    prestige?: number;      // 社会声望
    specialTalent?: string; // 特殊天资解锁
  };
}

/** 老物件对人物属性与天资的总加成统计 */
export interface VintageTotalBonus {
  health: number;
  intelligence: number;
  charm: number;
  happiness: number;
  wealthMindset: number;
  prestige: number;
  specialTalents: string[];
}

/** 房产历史年代区间 */
export type EraHousingPeriod = "welfare_era" | "commercial_early" | "golden_decade" | "core_luxury";

/** 房产装修档次 */
export type HouseDecorationLevel = "none" | "simple" | "refined" | "luxury";

/** 时代房产静态配置 */
export interface HousingPropertyConfig {
  id: string;
  name: string;
  period: EraHousingPeriod;
  minYear: number;
  maxYear: number;
  buildingAreaSqm: number;     // 建筑面积 (㎡)
  basePriceYuan: number;       // 初始年代基准全款售价 (元)
  baseQuarterlyRentYuan: number; // 初始季度租金收益 (元/季)
  baseSatisfactionBonus: number; // 基础家庭满意度提升
  schoolDistrictBonus?: number;  // 学区房教育天资加成 (%)
  description: string;
  features: string[];
}

/** 玩家持有的房产实例 */
export interface PlayerOwnedHouse {
  instanceId: string;
  configId: string;
  name: string;
  purchaseYear: number;
  purchaseQuarter: number;
  purchasePriceYuan: number;       // 当年购入总价 (元)
  currentMarketValueYuan: number;  // 随年代升值后的当前市场估值 (元)
  decorationLevel: HouseDecorationLevel;
  decorationCostPaidYuan: number;  // 累计支付装修成本 (元)
  isRentedOut: boolean;            // 是否已出租
  currentQuarterlyRentYuan: number; // 当前季度净租金入账 (元)
  mortgageAccount: EraMortgageAccount | null; // 房贷账户 (若有)
}

/** 房贷按揭账户 */
export interface EraMortgageAccount {
  totalLoanPrincipalYuan: number; // 贷款初始总本金
  remainingPrincipalYuan: number; // 剩余未还本金
  annualInterestRatePercent: number; // 房贷年化利率 (%)
  totalTenureYears: number; // 贷款年限
  remainingMonths: number;  // 剩余期数 (月)
  monthlyInstallmentYuan: number; // 每月等额本息月供 (元)
  accumulatedInterestPaidYuan: number; // 累计已付利息 (元)
}

/** 交通工具类别 */
export type VehicleCategory = "non_motor" | "motorcycle" | "family_car" | "executive_car" | "luxury_sports";

/** 时代交通载具静态配置 */
export interface EraVehicleConfig {
  id: string;
  name: string;
  icon: string;
  category: VehicleCategory;
  minEraYear: number;
  retailPriceYuan: number;         // 零售售价 (元)
  quarterlyMaintenanceCostYuan: number; // 季度养护费用 (油费/保险/保养)
  energySavePerQuarter: number;    // 每季节省的行动精力 (点)
  prestigeBonus: number;           // 社交声望加成
  charmBonus: number;              // 魅力形象加成
  description: string;
}

/** 玩家拥有的代步载具 */
export interface PlayerOwnedVehicle {
  vehicleId: string;
  purchaseYear: number;
  purchasePriceYuan: number;
  isCurrentActive: boolean; // 是否为当前主力出行载具
}

/** 银行定期存期 */
export type EraDepositTerm = 1 | 3 | 5;

/** 银行定期存单 */
export interface EraTimeDeposit {
  id: string;
  principalYuan: number;          // 存入本金 (元)
  startYear: number;              // 起存年份
  startQuarter: number;           // 起存季度 (1~4)
  termYears: EraDepositTerm;      // 存期 (1年/3年/5年)
  baseAnnualRatePercent: number;  // 央行基准年化利率 (%)
  inflationSubsidyRatePercent: number; // 80年代保值储蓄贴补率 (%)
  totalAnnualYieldPercent: number;     // 综合年化约定收益率 (%)
  isMatured: boolean;             // 是否到期
}

/** 1992 上海股票认购证投资包 */
export interface SubscriptionCertPackage {
  id: string;
  purchaseYear: number;
  purchaseQuarter: number;
  batchCount: number;         // 购买本数 (每本30元，100张一套3000元)
  totalCostYuan: number;      // 支付总成本 (元)
  drawnWinningCount: number;  // 摇号中签股数/签数
  realizedProfitYuan: number; // 上市抛售后已变现纯利润
  isSettled: boolean;         // 是否已全部中签兑现
}

/** A 股股票/老八股板块行情条目 */
export interface StockSectorItem {
  id: string;
  code: string;
  name: string;
  categoryName: string;
  currentPrice: number;              // 当前股价 (元)
  quarterChangePercent: number;      // 本季度涨跌幅 (%)
  holdShares: number;                // 玩家持股数量 (股)
  averageCostPrice: number;          // 持股成本均价 (元/股)
  dividendYieldAnnualPercent: number;// 年化分红股息率 (%)
  volatilityRate: number;            // 波动弹性系数
  description: string;
  isOldEightShare?: boolean;         // 是否为90年代初“老八股”
}

/** 历史股票重大行情大事件 */
export interface HistoricalStockEraEvent {
  year: number;
  title: string;
  icon: string;
  narrative: string;
  impact: {
    marketWidePercent?: number;
    techPercent?: number;
    consumptionPercent?: number;
    newEnergyPercent?: number;
    financeBankPercent?: number;
    oldEightSharePercent?: number;
  };
}

/** 季度财务统一结算对账单 */
export interface QuarterlyFinancialReport {
  year: number;
  quarter: number;
  // 现金流入
  currentSavingsInterestYuan: number; // 活期利息
  maturedDepositPayoutYuan: number;   // 到期定期兑付本息
  rentalIncomeYuan: number;           // 房产净租金
  stockDividendIncomeYuan: number;    // 股票分红派息
  certLotteryPayoutYuan: number;      // 认购证摇号套现
  totalCashInflowYuan: number;        // 总现金流入
  // 现金流出
  mortgagePaymentYuan: number;        // 房贷月供支出
  vehicleMaintenanceCostYuan: number; // 养车油费维保支出
  totalCashOutflowYuan: number;       // 总现金流出
  netCashFlowYuan: number;            // 净现金流变动 (流入 - 流出)
  // 资产总览
  totalLiquidCashYuan: number;        // 期末流动私房钱
  totalBankSavingsYuan: number;       // 活期+定期存款总额
  totalRealEstateMarketValueYuan: number; // 房产当前总市场估值
  totalVehicleResidualValueYuan: number;  // 车辆当前折旧净值
  totalStockPortfolioMarketValueYuan: number; // 股票持仓总市值
  totalMortgageDebtRemainingYuan: number;     // 未还房贷总负债
  totalNetAssetsWorthYuan: number;    // 个人家庭净资产总额
  narrativeSummary: string;           // 季度理财白话总结
}


// ============================================================================
// 二、真实历史经济数据库 (Historical Calibration Databases)
// ============================================================================

/**
 * 时代老物件全景数据库 (涵盖玩具、服饰、美食、家电、历史纪念品)
 */
export const ERA_VINTAGE_CATALOG: Record<string, VintageAssetItem> = {
  // --- 玩具类 (toy) ---
  iron_frog: {
    id: "iron_frog",
    name: "绿色铁皮发条小青蛙",
    icon: "🐸",
    category: "toy",
    yearAcquired: 1978,
    description: "上紧发条后在水泥地上笃笃跳跃的经典绿皮小青蛙，80年代几乎人手一只的国民玩具启蒙。",
    bonusText: "快乐 +6 · 敏捷 +4 · 童年纯真",
    statBonus: { happiness: 6, charm: 4 },
  },
  rolling_hoop: {
    id: "rolling_hoop",
    name: "自制铁丝钩与老滚铁环",
    icon: "🛞",
    category: "toy",
    yearAcquired: 1979,
    description: "用粗铁丝弯成U形钩推动生铁圈，在青砖胡同与老厂小巷里飞奔追风，锻炼平衡感与体魄。",
    bonusText: "健康 +8 · 敏捷 +6 · 户外活力",
    statBonus: { health: 8, happiness: 4 },
  },
  glass_marbles: {
    id: "glass_marbles",
    name: "彩色花芯琉璃玻璃弹珠袋",
    icon: "🔮",
    category: "toy",
    yearAcquired: 1980,
    description: "装在小布袋里晶莹剔透的彩芯弹珠，放学后在大院泥土地上蹲着打弹坑赢下的战利品。",
    bonusText: "智力 +6 · 社交 +6 · 精准专注",
    statBonus: { intelligence: 6, happiness: 4 },
  },
  rubiks_cube: {
    id: "rubiks_cube",
    name: "匈牙利三阶益智经典魔方",
    icon: "🎲",
    category: "toy",
    yearAcquired: 1985,
    description: "80年代中叶风靡全国的数学智力玩具，手指翻飞复原六面，培养三维空间几何逻辑。",
    bonusText: "智力 +10 · 专注 +8 · 空间逻辑启蒙",
    statBonus: { intelligence: 10, wealthMindset: 4, specialTalent: "空间算法逻辑" },
  },
  famicom_cartridge: {
    id: "famicom_cartridge",
    name: "红白机经典小霸王黄色双卡带",
    icon: "🕹️",
    category: "toy",
    yearAcquired: 1987,
    description: "经典的“上上下下左左右右BA”，魂斗罗、超级玛丽、坦克大战，与伙伴并肩通关的黄金年代。",
    bonusText: "快乐 +12 · 魅力 +6 · 游戏审美先驱",
    statBonus: { happiness: 12, charm: 6, specialTalent: "电竞反应嗅觉" },
  },
  brick_game: {
    id: "brick_game",
    name: "俄罗斯方块黑白液晶掌上游戏机",
    icon: "📟",
    category: "toy",
    yearAcquired: 1989,
    description: "塑料外壳带99合1的黑白点阵掌机，伴着清脆急促的喀秋莎电子音，上课偷偷玩的心跳回忆。",
    bonusText: "智力 +8 · 敏捷 +8 · 反应定力",
    statBonus: { intelligence: 8, happiness: 6 },
  },
  tamiya_mini4wd: {
    id: "tamiya_mini4wd",
    name: "田宫冲锋战神改装四驱车",
    icon: "🏎️",
    category: "toy",
    yearAcquired: 1994,
    description: "手工缠绕铜线金超霸马达、打孔镂空底盘与海绵胎，在学校操场双轨跑道上一骑绝尘的冠军座驾。",
    bonusText: "智力 +10 · 动手能力 +10 · 工程思维",
    statBonus: { intelligence: 10, prestige: 6, specialTalent: "精密动手改装" },
  },
  tamagotchi: {
    id: "tamagotchi",
    name: "万代原装拓麻歌子电子宠物蛋",
    icon: "🥚",
    category: "toy",
    yearAcquired: 1996,
    description: "钥匙扣上的黑白像素小生命，每天定时喂食、铲屎、治病，体验最初的责任感与生命温情。",
    bonusText: "魅力 +8 · 亲情 +8 · 爱心培养",
    statBonus: { charm: 8, happiness: 6 },
  },

  // --- 服饰类 (clothing) ---
  warrior_shoes: {
    id: "warrior_shoes",
    name: "经典回力红白硫化帆布球鞋",
    icon: "👟",
    category: "clothing",
    yearAcquired: 1978,
    description: "白帆布鞋身配两道红杠硫化橡胶底，耐磨防滑，80年代体育健儿与大院少年的标配帅气战靴。",
    bonusText: "健康 +8 · 魅力 +6 · 朴实英气",
    statBonus: { health: 8, charm: 6 },
  },
  green_military_cap: {
    id: "green_military_cap",
    name: "国防绿六五式军帽配红五星",
    icon: "⭐",
    category: "clothing",
    yearAcquired: 1979,
    description: "洗得微微泛白的国防绿军帽，帽檐正中钉着鲜艳的红色烤漆铝质五角星，承载着那一辈人的革命热情与朴素崇高。",
    bonusText: "威望 +10 · 精神意志 +8 · 时代纯正风范",
    statBonus: { prestige: 10, health: 6 },
  },
  sea_soul_shirt: {
    id: "sea_soul_shirt",
    name: "经典蓝白条纹水手海魂衫",
    icon: "👕",
    category: "clothing",
    yearAcquired: 1981,
    description: "纯棉针织蓝白相间的宽条纹海魂衫，水手风情十足，走在80年代街头最洋气时髦的青春装扮。",
    bonusText: "魅力 +10 · 快乐 +6 · 潮流风尚",
    statBonus: { charm: 10, happiness: 6 },
  },
  treadmill_pants: {
    id: "treadmill_pants",
    name: "90年代初经典高弹踩脚健美裤",
    icon: "👖",
    category: "clothing",
    yearAcquired: 1992,
    description: "紧身修腿、脚跟踩着一条绊带的黑健美裤，大街小巷女性人手一条，见证改革开放初期时尚审美的全面苏醒。",
    bonusText: "魅力 +12 · 时代审美 +8",
    statBonus: { charm: 12, prestige: 4 },
  },

  // --- 美食零食类 (food) ---
  white_rabbit_candy: {
    id: "white_rabbit_candy",
    name: "冠生园大白兔奶糖经典铁盒",
    icon: "🍬",
    category: "food",
    yearAcquired: 1979,
    description: "含在嘴里慢慢融化的浓郁奶香，外面包裹着一层薄如蝉翼的半透明糯米纸，过年过节最奢侈甜美的滋味。",
    bonusText: "快乐 +8 · 亲情 +6 · 幸福甜蜜",
    statBonus: { happiness: 8, charm: 4 },
  },
  my_likes_chocolate: {
    id: "my_likes_chocolate",
    name: "梁丰麦丽素红白塑封包装",
    icon: "🍫",
    category: "food",
    yearAcquired: 1982,
    description: "影视剧里武林大侠“仙丹解药”的原型，香浓牛奶巧克力外衣裹着香脆麦芽夹心，一口一个停不下来。",
    bonusText: "快乐 +8 · 活力 +6",
    statBonus: { happiness: 8, health: 4 },
  },
  arctic_ocean_soda: {
    id: "arctic_ocean_soda",
    name: "北冰洋玻璃瓶装橘子果汁汽水",
    icon: "🍊",
    category: "food",
    yearAcquired: 1984,
    description: "皇冠铁盖一启嗤地冒出白汽，冰镇橘香夹着微呛的碳酸气泡在喉咙爆炸，胡同夏日最畅快的清凉。",
    bonusText: "快乐 +10 · 暑气消散",
    statBonus: { happiness: 10, health: 4 },
  },
  jianlibao_drink: {
    id: "jianlibao_drink",
    name: "1990北京亚运会指定健力宝易拉罐",
    icon: "🥫",
    category: "food",
    yearAcquired: 1990,
    description: "“东方魔水”橙蜜味运动饮料，金黄易拉罐上印着亚运火炬，伴随中国健儿横扫奖牌榜的自豪味道。",
    bonusText: "健康 +10 · 快乐 +8 · 时代力量",
    statBonus: { health: 10, happiness: 8, prestige: 5 },
  },
  shuihu_cards_album: {
    id: "shuihu_cards_album",
    name: "统一小浣熊水浒108将闪卡典藏册",
    icon: "🃏",
    category: "food",
    yearAcquired: 1997,
    description: "吃干脆面集齐的一百单八将金银闪卡全集，大院孩子眼中至高无上的社交硬通货与收藏荣耀。",
    bonusText: "社交 +15 · 财商意识 +10 · 顶级典藏",
    statBonus: { charm: 12, wealthMindset: 10, specialTalent: "珍藏品鉴赏力" },
  },

  // --- 家电数码类 (appliance) ---
  red_lantern_radio: {
    id: "red_lantern_radio",
    name: "红灯牌711六灯电子管交流收音机",
    icon: "📻",
    category: "appliance",
    yearAcquired: 1978,
    description: "古雅木质外壳与发着微弱暖黄光的电子管真空管，旋钮转动沙沙声中收听《新闻和报纸摘要》与刘兰芳评书。",
    bonusText: "智力 +10 · 时事远见 +8 · 时代之声",
    statBonus: { intelligence: 10, wealthMindset: 6 },
  },
  peony_bw_tv: {
    id: "peony_bw_tv",
    name: "北京牡丹牌9寸黑白晶体管电视机",
    icon: "📺",
    category: "appliance",
    yearAcquired: 1980,
    description: "带有旋转高频头的9寸小黑白电视，顶上拉起两根长铝合金天线，夏夜满院街坊围坐看《霍元甲》万人空巷。",
    bonusText: "声望 +12 · 快乐 +10 · 大院核心社交资产",
    statBonus: { prestige: 12, happiness: 10 },
  },
  yanwu_boombox: {
    id: "yanwu_boombox",
    name: "燕舞牌双卡立体声四喇叭收录机",
    icon: "🪗",
    category: "appliance",
    yearAcquired: 1985,
    description: "“燕舞、燕舞，一曲歌来一片情！”双卡翻录磁带，四喇叭超重低音，扛在肩头跳霹雳舞就是整条街最靓的仔。",
    bonusText: "魅力 +15 · 快乐 +12 · 文艺潮流弄潮儿",
    statBonus: { charm: 15, happiness: 12, prestige: 8 },
  },
  aiwa_walkman: {
    id: "aiwa_walkman",
    name: "爱华AIWA超薄立体声磁带随身听",
    icon: "🎧",
    category: "appliance",
    yearAcquired: 1992,
    description: "配海绵立体声小耳塞与自动翻带功能，一面放李雷韩梅梅英语九百句，一面悄悄藏着港台四大天王正版翻录带。",
    bonusText: "智力 +12 · 快乐 +10 · 外语语感飞跃",
    statBonus: { intelligence: 12, happiness: 10 },
  },
  motorola_beeper: {
    id: "motorola_beeper",
    name: "摩托罗拉汉字显示数字寻呼机(BP机)",
    icon: "📟",
    category: "appliance",
    yearAcquired: 1994,
    description: "“呼我必复，随时联络”，别在牛皮腰带上的摩托罗拉汉显寻呼机，世纪之交商界精英与时尚潮人的社交通行证。",
    bonusText: "社交 +16 · 商业先机 +12 · 开启【即时人脉网络】",
    statBonus: { prestige: 14, wealthMindset: 12, specialTalent: "商业即时通讯" },
  },
  dageda_brick_phone: {
    id: "dageda_brick_phone",
    name: "摩托罗拉9900大砖头“大哥大”手提电话",
    icon: "📞",
    category: "appliance",
    yearAcquired: 1995,
    description: "沉甸甸的黑色长天线移动电话，售价两万加选号入网费上万，手握大哥大夹着真皮公文包，90年代暴发大亨的终极身份图腾。",
    bonusText: "声望 +30 · 商业威慑力 +25 · 时代大老板排面",
    statBonus: { prestige: 30, wealthMindset: 20 },
  },
  nokia_5110: {
    id: "nokia_5110",
    name: "第一代诺基亚5110经典按键手机",
    icon: "📱",
    category: "appliance",
    yearAcquired: 2000,
    description: "绿底单色液晶屏、砸核桃不坏的坚固机身与贪吃蛇游戏，见证千禧年从寻呼机时代全面跨入移动通讯时代的里程碑。",
    bonusText: "敏捷 +10 · 魅力 +10 · 跨世纪通讯先驱",
    statBonus: { charm: 10, intelligence: 8 },
  },

  // --- 历史纪念与荣誉类 (commemoration) ---
  red_scarf_medal: {
    id: "red_scarf_medal",
    name: "少先队鲜艳红领巾与两道杠中队长臂章",
    icon: "🧣",
    category: "commemoration",
    yearAcquired: 1985,
    description: "少先队大队会上全校见证戴上的红领巾与红白两道杠塑料夹，集体荣誉感与童年纯真的金色勋章。",
    bonusText: "智力 +8 · 魅力 +8 · 少先队中队长威望",
    statBonus: { intelligence: 8, charm: 8, prestige: 8 },
  },
  panpan_enamel_plate: {
    id: "panpan_enamel_plate",
    name: "1990北京亚运会熊猫盼盼彩绘纪念盘",
    icon: "🐼",
    category: "commemoration",
    yearAcquired: 1990,
    description: "第十一届北京亚运会特许纪念品，手持金牌的熊猫盼盼憨态可掬，凝聚举国上下改革奋进的民族自豪。",
    bonusText: "魅力 +10 · 快乐 +8 · 亚运时代自豪感",
    statBonus: { charm: 10, happiness: 8, prestige: 6 },
  },
  stock_cert_1992: {
    id: "stock_cert_1992",
    name: "1992年上海证券交易所股票认购证存根",
    icon: "📜",
    category: "commemoration",
    yearAcquired: 1992,
    description: "30元一张的泛黄纸质认购证存根，中国资本市场发轫初期的创富奇迹，见证平民阶层第一波股市财富神话。",
    bonusText: "财商心智 +25 · 财富嗅觉 +20 · 资本历史见证者",
    statBonus: { wealthMindset: 25, prestige: 15, specialTalent: "资本市场前瞻" },
  },
  hongkong_return_cover: {
    id: "hongkong_return_cover",
    name: "1997香港回归紫荆花纪念首日封与镀金章",
    icon: "✉️",
    category: "commemoration",
    yearAcquired: 1997,
    description: "1997年7月1日零点游子归家，国家邮政局发行的特种纪念封，贴紫荆花邮票盖当日戳，永铭百年雪耻。",
    bonusText: "智力 +12 · 魅力 +10 · 爱国情怀与时代见证",
    statBonus: { intelligence: 12, charm: 10, prestige: 10 },
  },
  millennium_capsule: {
    id: "millennium_capsule",
    name: "2000千禧年愿望封存不锈钢时间胶囊",
    icon: "⏳",
    category: "commemoration",
    yearAcquired: 1999,
    description: "在1999年12月31日跨年夜写给21世纪自己的一封信与封存信物，立志在新世纪乘风破浪的青春誓言。",
    bonusText: "意志 +18 · 远见 +12 · 跨世纪宏大格局",
    statBonus: { intelligence: 14, happiness: 10, specialTalent: "跨世纪战略定力" },
  },
  shenzhou5_cover: {
    id: "shenzhou5_cover",
    name: "2003神舟五号载人飞天首日封与纪念邮折",
    icon: "🚀",
    category: "commemoration",
    yearAcquired: 2003,
    description: "航天英雄杨利伟代表中华民族首度巡天苍穹，盖有酒泉卫星发射中心特种纪念邮戳，千年飞天圆梦。",
    bonusText: "智力 +15 · 民族自豪 +15 · 探索精神",
    statBonus: { intelligence: 15, prestige: 12 },
  },
  olympic_fuwa_box: {
    id: "olympic_fuwa_box",
    name: "2008北京奥运会福娃纪念摆件套盒",
    icon: "🏮",
    category: "commemoration",
    yearAcquired: 2008,
    description: "贝贝、晶晶、欢欢、迎迎、妮妮五福娃陶瓷纪念品与鸟巢开幕式纪念券，无与伦比的民族盛典永恒回忆。",
    bonusText: "魅力 +16 · 健康 +10 · 盛世华彩荣耀",
    statBonus: { charm: 16, health: 10, prestige: 14 },
  },
};


/**
 * 时代房产置业数据库 (1978 ~ 2024 四个历史阶段八款经典房产)
 */
export const ERA_HOUSING_DATABASE: HousingPropertyConfig[] = [
  // --- 阶段一：1978~1989 福利分房与筒子楼时代 ---
  {
    id: "house_factory_yard",
    name: "机床厂家属院红砖平房大院",
    period: "welfare_era",
    minYear: 1978,
    maxYear: 1992,
    buildingAreaSqm: 38,
    basePriceYuan: 1200, // 80年代买断产权仅需千元，平时单位福利分房近乎免租
    baseQuarterlyRentYuan: 18,
    baseSatisfactionBonus: 10,
    description: "充满时代烟火气的国企职工大院，邻里街坊彼此熟悉亲如一家，院里有公用压水井与老榆树。",
    features: ["邻里熟络守望相助", "国企职工福利分房", "公用水龙头压水井", "免月供零负债"],
  },
  {
    id: "house_brick_dorm",
    name: "两室一厅国企红砖筒子楼",
    period: "welfare_era",
    minYear: 1980,
    maxYear: 1995,
    buildingAreaSqm: 55,
    basePriceYuan: 3800,
    baseQuarterlyRentYuan: 45,
    baseSatisfactionBonus: 18,
    description: "长长走廊两边排布的红砖宿舍楼，走廊里弥漫着家家户户炒菜的油烟香与蜂窝煤炉的温暖烟火气。",
    features: ["双南向宽敞明房", "水泥抹面水磨石地面", "走廊公共水房与厨房", "家庭稳定安居"],
  },

  // --- 阶段二：1990~1997 第一代集资房与步梯房萌芽时代 ---
  {
    id: "house_fundraising_unit",
    name: "第一代单位集资职工新村住宅",
    period: "commercial_early",
    minYear: 1990,
    maxYear: 2002,
    buildingAreaSqm: 72,
    basePriceYuan: 18000, // 90年代初集资房一两万元即可买下独立产权
    baseQuarterlyRentYuan: 220,
    baseSatisfactionBonus: 28,
    description: "90年代初具有划时代意义的独门独户住宅，拥有独立卫生间与马赛克外墙贴面，小家庭私密港湾。",
    features: ["独立厨房与卫生间", "独门独户防盗铁门", "马赛克彩色瓷砖外墙", "第一代私有产权明晰"],
  },
  {
    id: "house_downtown_walkup",
    name: "市中心两室一厅多层步梯商品房",
    period: "commercial_early",
    minYear: 1992,
    maxYear: 2006,
    buildingAreaSqm: 88,
    basePriceYuan: 68000,
    baseQuarterlyRentYuan: 680,
    baseSatisfactionBonus: 38,
    description: "毗邻繁华市中心百货大楼与农贸市场，南北通透双阳台，90年代中叶城市小康家庭最向往的商品住宅。",
    features: ["南北通透双向阳台", "紧邻市百货大楼商圈", "实木拼花红漆地板", "保值抗通胀先锋"],
  },

  // --- 阶段三：1998~2008 房改商品房与黄金十年腾飞时代 ---
  {
    id: "house_modern_elevator",
    name: "现代高层电梯景观花园商品房",
    period: "golden_decade",
    minYear: 1998,
    maxYear: 2018,
    buildingAreaSqm: 118,
    basePriceYuan: 280000,
    baseQuarterlyRentYuan: 3600,
    baseSatisfactionBonus: 55,
    description: "1998年房改春风吹拂下的现代化商品住宅，配有双电梯、地下车库、中心喷泉绿化与品牌安保物业。",
    features: ["双电梯直达地下车库", "人车分流中庭水景花园", "24小时保安电子门禁", "空间开阔明亮"],
  },
  {
    id: "house_school_district",
    name: "重点省实验小学旁名校学区房",
    period: "golden_decade",
    minYear: 2000,
    maxYear: 2024,
    buildingAreaSqm: 68,
    basePriceYuan: 680000,
    baseQuarterlyRentYuan: 8500,
    baseSatisfactionBonus: 50,
    schoolDistrictBonus: 25, // 子女学业与高考天资 +25%
    description: "划片直升省重点实验小学与顶级初中的黄金学区房，面积虽紧凑但地段硬核至极，为下一代铺就青云路！",
    features: ["直升省重点公办名校", "子女教育天资增益+25%", "单价坚挺租金极高", "二手市场硬通货"],
  },
  {
    id: "house_riverside_villa",
    name: "滨江低密高档私家花园洋房",
    period: "golden_decade",
    minYear: 2002,
    maxYear: 2024,
    buildingAreaSqm: 230,
    basePriceYuan: 1880000,
    baseQuarterlyRentYuan: 22000,
    baseSatisfactionBonus: 75,
    description: "依山傍水的低容积率电梯洋房，带有超大私家入户花园草坪与观景露台，尊享高品质静谧惬意生活。",
    features: ["私家入户花园草坪", "南向270度大景观露台", "低密舒适私密尊贵", "上流社会圈层交流"],
  },

  // --- 阶段四：2008~2024 一线核心顶奢与大平层时代 ---
  {
    id: "house_super_luxury_manor",
    name: "陆家嘴滨江/深圳湾一号顶奢云端私邸",
    period: "core_luxury",
    minYear: 2008,
    maxYear: 2024,
    buildingAreaSqm: 480,
    basePriceYuan: 36000000, // 3600万顶级豪宅
    baseQuarterlyRentYuan: 260000,
    baseSatisfactionBonus: 100,
    description: "一线核心城市云端天际大平层，270度俯瞰黄浦江璀璨陆家嘴天际线，顶级英式管家礼宾，家族财富跨代传承。",
    features: ["全玻璃幕墙天际瞰江", "私人电梯厅与专属管家", "楼顶停机坪与无边泳池", "跨越阶层的家族传承基业"],
  },
];

/**
 * 历史房产周期增值系数曲线表 (相对 1980 年基准倍数)
 * 真实反映中国房改以来“万元买房、如今千万”的历史红利过程
 */
export const REAL_ESTATE_ERA_PRICE_INDEX: Record<number, number> = {
  1978: 0.9, 1980: 1.0, 1985: 1.3, 1988: 1.8, 1990: 2.2, 1992: 3.0, 1995: 4.2,
  1998: 5.5, 2000: 7.0, 2003: 9.5, 2005: 14.0, 2007: 20.0, 2008: 19.0, 2010: 26.0,
  2013: 35.0, 2015: 42.0, 2018: 58.0, 2020: 65.0, 2021: 68.0, 2023: 62.0, 2024: 60.0,
};

/**
 * 时代交通工具数据库 (10款跨越时代风貌的出行载具)
 */
export const ERA_VEHICLES_DATABASE: EraVehicleConfig[] = [
  {
    id: "walk_bus",
    name: "双腿步行与公交大巴",
    icon: "🚶",
    category: "non_motor",
    minEraYear: 1970,
    retailPriceYuan: 0,
    quarterlyMaintenanceCostYuan: 0,
    energySavePerQuarter: 0,
    prestigeBonus: 0,
    charmBonus: 0,
    description: "绿色环保的步行与城市铰接大巴，路途需耗费较多时间与体力。",
  },
  {
    id: "bicycle_fenghuang_28",
    name: "永久 / 凤凰牌二八大杠加重自行车",
    icon: "🚲",
    category: "non_motor",
    minEraYear: 1978,
    retailPriceYuan: 168,
    quarterlyMaintenanceCostYuan: 5,
    energySavePerQuarter: 6,
    prestigeBonus: 6,
    charmBonus: 5,
    description: "80年代驰骋大街小巷的‘老三件’之一，前大梁载娃、后衣架驮货，车铃清脆叮咚作响。",
  },
  {
    id: "bicycle_mountain_speed",
    name: "铝合金多级变速山地自行车",
    icon: "🚵",
    category: "non_motor",
    minEraYear: 1991,
    retailPriceYuan: 460,
    quarterlyMaintenanceCostYuan: 15,
    energySavePerQuarter: 10,
    prestigeBonus: 12,
    charmBonus: 10,
    description: "90年代初中高中生最酷炫的骑行利器，禧玛诺变速齿轮，骑上它就是校园风云人物。",
  },
  {
    id: "motorcycle_jialing_70",
    name: "嘉陵JH70 / 建设雅马哈红轻骑摩托",
    icon: "🛵",
    category: "motorcycle",
    minEraYear: 1985,
    retailPriceYuan: 2850,
    quarterlyMaintenanceCostYuan: 80,
    energySavePerQuarter: 14,
    prestigeBonus: 20,
    charmBonus: 18,
    description: "轻便省油四冲程发动机，走街串巷穿梭自如，80年代末万元户家庭最体面的机动座驾。",
  },
  {
    id: "motorcycle_xingfu_250",
    name: "幸福250经典红色重型巡航摩托",
    icon: "🏍️",
    category: "motorcycle",
    minEraYear: 1982,
    retailPriceYuan: 4600,
    quarterlyMaintenanceCostYuan: 130,
    energySavePerQuarter: 17,
    prestigeBonus: 28,
    charmBonus: 25,
    description: "单缸二冲程发动机爆发出震耳欲聋的轰鸣声，高大威猛，街头回头率百分之百的硬汉图腾。",
  },
  {
    id: "car_santana_2000",
    name: "上海大众桑塔纳2000 / 捷达王",
    icon: "🚗",
    category: "family_car",
    minEraYear: 1995,
    retailPriceYuan: 138000,
    quarterlyMaintenanceCostYuan: 1200,
    energySavePerQuarter: 23,
    prestigeBonus: 45,
    charmBonus: 35,
    description: "“拥有桑塔纳，走遍天下都不怕！”90年代中后期民营企业老板与高管出行的黄金标配轿车。",
  },
  {
    id: "car_audi_100",
    name: "一汽奥迪100 / 奥迪A6行政公务座驾",
    icon: "🚙",
    category: "executive_car",
    minEraYear: 1998,
    retailPriceYuan: 338000,
    quarterlyMaintenanceCostYuan: 2600,
    energySavePerQuarter: 27,
    prestigeBonus: 72,
    charmBonus: 50,
    description: "庄重深沉的纯黑车漆，商务政务场合自带威严气场，极度体面的行政尊崇象征。",
  },
  {
    id: "car_mercedes_s320",
    name: "奔驰S320 W140“虎头奔”千禧旗舰",
    icon: "🚘",
    category: "executive_car",
    minEraYear: 1995,
    retailPriceYuan: 980000,
    quarterlyMaintenanceCostYuan: 5800,
    energySavePerQuarter: 30,
    prestigeBonus: 90,
    charmBonus: 65,
    description: "霸气厚重的盾形镀铬中网与双层防弹隔音玻璃，90年代至千禧初国内财富阶层的无冕之王。",
  },
  {
    id: "car_smart_ev",
    name: "高端智能豪华新能源纯电轿跑",
    icon: "⚡",
    category: "family_car",
    minEraYear: 2018,
    retailPriceYuan: 268000,
    quarterlyMaintenanceCostYuan: 850,
    energySavePerQuarter: 28,
    prestigeBonus: 60,
    charmBonus: 55,
    description: "搭载高阶智能辅助驾驶、极简智慧座舱与零百加速3秒级的超低能耗现代绿色出行体验。",
  },
  {
    id: "car_porsche_911",
    name: "保时捷911 Carrera 纯正德系超跑",
    icon: "🏎️",
    category: "luxury_sports",
    minEraYear: 2008,
    retailPriceYuan: 1680000,
    quarterlyMaintenanceCostYuan: 12500,
    energySavePerQuarter: 32,
    prestigeBonus: 100,
    charmBonus: 95,
    description: "经典蛙眼大灯与后置水平对置六缸双涡轮增压发动机，速度与机械美学的终极巅峰享受！",
  },
];

/**
 * 历史银行利率与保值储蓄贴补率年代速查表
 * 真实还原 1988~1993 物价闯关与高通胀时期，央行推出的“保值储蓄”高达 10%~13% 的贴补红利！
 */
export const ERA_BANK_RATE_DECADE_TABLE: Record<string, { baseRate: Record<EraDepositTerm, number>; subsidyRate: Record<EraDepositTerm, number> }> = {
  // 1978~1987 改革开放初期稳健利率
  "1978_1987": {
    baseRate: { 1: 5.4, 3: 6.8, 5: 8.2 },
    subsidyRate: { 1: 0.0, 3: 0.0, 5: 0.0 },
  },
  // 1988~1993 保值储蓄黄金历史期 (央行发放抗通胀贴补率，年化收益破 20%！)
  "1988_1993": {
    baseRate: { 1: 10.08, 3: 12.24, 5: 14.40 },
    subsidyRate: { 1: 0.0, 3: 9.15, 5: 12.80 }, // 3年期补贴9.15%，5年期补贴12.8%！
  },
  // 1994~1999 软着陆与降息周期
  "1994_1999": {
    baseRate: { 1: 7.47, 3: 8.28, 5: 9.00 },
    subsidyRate: { 1: 0.0, 3: 0.0, 5: 0.0 },
  },
  // 2000~2010 加入世贸与经济腾飞期
  "2000_2010": {
    baseRate: { 1: 3.25, 3: 4.50, 5: 5.00 },
    subsidyRate: { 1: 0.0, 3: 0.0, 5: 0.0 },
  },
  // 2011~2024 现代低利率与高质量发展期
  "2011_2024": {
    baseRate: { 1: 2.00, 3: 2.75, 5: 3.15 },
    subsidyRate: { 1: 0.0, 3: 0.0, 5: 0.0 },
  },
};

/**
 * 历史证券市场重大行情大事件
 */
export const HISTORICAL_STOCK_ERA_EVENTS: Record<number, HistoricalStockEraEvent> = {
  1992: {
    year: 1992,
    title: "1992 上海股票认购证狂潮与老八股飞天神话",
    icon: "📜",
    narrative: "上交所发行股票认购证，白条认购证在黑市被炒上天，中签新股上市直接暴涨十倍以上！掀起全民涌向大上海的淘金神话！",
    impact: {
      marketWidePercent: 120,
      oldEightSharePercent: 280,
      techPercent: 150,
      consumptionPercent: 90,
      financeBankPercent: 60,
    },
  },
  1996: {
    year: 1996,
    title: "1996~1997 绩优蓝筹大牛市：四川长虹与深发展双雄并起",
    icon: "📺",
    narrative: "彩电大王四川长虹与深发展领跑全国，价值投资与绩优蓝筹理念首次深入人心，股指半年翻番！",
    impact: {
      marketWidePercent: 65,
      consumptionPercent: 85,
      techPercent: 55,
      financeBankPercent: 70,
    },
  },
  1999: {
    year: 1999,
    title: "1999 跨世纪‘5·19’网络科技股井喷大行情",
    icon: "🌐",
    narrative: "《关于恢复和发展股票市场的八条意见》点燃全国，互联网科技概念股天天涨停，一个月大盘暴涨近70%！",
    impact: {
      marketWidePercent: 45,
      techPercent: 110,
      consumptionPercent: 30,
      financeBankPercent: 25,
    },
  },
  2007: {
    year: 2007,
    title: "2007 冲上云霄 6124 历史之巅世纪大牛市",
    icon: "🚀",
    narrative: "股权分置改革大圆满，中国经济GDP两位数狂飙！全民大开户，大蓝筹大金融全面爆发，创下6124点历史最高丰碑！",
    impact: {
      marketWidePercent: 95,
      financeBankPercent: 120,
      consumptionPercent: 80,
      techPercent: 60,
      newEnergyPercent: 75,
    },
  },
  2015: {
    year: 2015,
    title: "2015 互联网+与 5178 点杠杆大狂牛",
    icon: "⚡",
    narrative: "“大众创业、万众创新”与一带一路共振，场外配资催生惊心动魄的杠杆疯牛，创业板科技直冲九霄！",
    impact: {
      marketWidePercent: 35,
      techPercent: 105,
      newEnergyPercent: 60,
      consumptionPercent: 20,
      financeBankPercent: -15,
    },
  },
  2020: {
    year: 2020,
    title: "2020 核心资产白马与新能源锂电赛道抱团大牛市",
    icon: "💎",
    narrative: "全球流动性充沛，公募基金抱团‘茅指数’与‘宁组合’，光伏、储能与新能源汽车走出波澜壮阔的独立黄金主升浪！",
    impact: {
      marketWidePercent: 20,
      newEnergyPercent: 110,
      consumptionPercent: 65,
      techPercent: 45,
      financeBankPercent: 10,
    },
  },
};

/**
 * 证券板块股票库（包含90年代“老八股”与现代四大支柱板块）
 */
export const ERA_STOCKS_DATABASE: StockSectorItem[] = [
  // --- 90年代经典“老八股”代表 ---
  {
    id: "stock_yanzhong",
    code: "600601",
    name: "延中实业 (老八股·三无概念)",
    categoryName: "老八股 / 股权并购",
    currentPrice: 38.5,
    quarterChangePercent: 8.5,
    holdShares: 0,
    averageCostPrice: 0,
    dividendYieldAnnualPercent: 1.0,
    volatilityRate: 2.2,
    description: "新中国股市全流通‘三无概念股’第一股，无国家股与法人股羁绊，极易引爆资本举牌大战！",
    isOldEightShare: true,
  },
  {
    id: "stock_vacuum",
    code: "600602",
    name: "真空电子 (老八股·龙头大哥)",
    categoryName: "老八股 / 彩电显像管",
    currentPrice: 92.0,
    quarterChangePercent: 12.0,
    holdShares: 0,
    averageCostPrice: 0,
    dividendYieldAnnualPercent: 2.5,
    volatilityRate: 1.9,
    description: "上交所老八股真正的定海神针，90年代初单股股价曾一度狂飙至两千余元的天王级蓝筹！",
    isOldEightShare: true,
  },
  // --- 现代全周期四大核心板块 ---
  {
    id: "tech",
    code: "688001",
    name: "科技芯片与人工智能板块",
    categoryName: "硬科技 / 算力半导体",
    currentPrice: 28.5,
    quarterChangePercent: 4.2,
    holdShares: 0,
    averageCostPrice: 0,
    dividendYieldAnnualPercent: 0.8,
    volatilityRate: 1.8,
    description: "先进制程芯片、大模型算力与基础工业软件，国家战略科技先锋，弹性极大、进攻性极强。",
  },
  {
    id: "consumption",
    code: "600519",
    name: "大消费与国酒食品板块",
    categoryName: "核心消费 / 高ROE",
    currentPrice: 62.0,
    quarterChangePercent: 2.1,
    holdShares: 0,
    averageCostPrice: 0,
    dividendYieldAnnualPercent: 3.2,
    volatilityRate: 0.9,
    description: "高端白酒、国潮调味品与大众连锁餐饮，充沛充裕现金流，穿越通胀周期的稳定基石。",
  },
  {
    id: "new_energy",
    code: "300750",
    name: "新能源与先进制造板块",
    categoryName: "动力电池 / 光伏绿电",
    currentPrice: 35.8,
    quarterChangePercent: -1.5,
    holdShares: 0,
    averageCostPrice: 0,
    dividendYieldAnnualPercent: 1.2,
    volatilityRate: 1.5,
    description: "锂电池、光伏储能与智能电动装备，全球能源革命排头兵，景气高涨期爆发力极强。",
  },
  {
    id: "finance_bank",
    code: "601398",
    name: "银行高股息与红利资产板块",
    categoryName: "中特估 / 稳健高分红",
    currentPrice: 12.8,
    quarterChangePercent: 1.2,
    holdShares: 0,
    averageCostPrice: 0,
    dividendYieldAnnualPercent: 5.8,
    volatilityRate: 0.5,
    description: "国有大型商业银行与特大型公用事业，超高现金分红与低波动，熊市避风港与复利利器。",
  },
];


// ============================================================================
// 三、子系统模块实现 (Subsystem Modules)
// ============================================================================

/**
 * 1. 老物件珍藏阁管理器 (VintageGalleryManager)
 */
export class VintageGalleryManager {
  public unlockedAssetIds: Set<string> = new Set();

  /** 登记收集老物件 */
  public unlockAsset(assetId: string): { success: boolean; asset?: VintageAssetItem; msg: string } {
    const asset = ERA_VINTAGE_CATALOG[assetId];
    if (!asset) {
      return { success: false, msg: `未知老物件 ID: ${assetId}` };
    }
    if (this.unlockedAssetIds.has(assetId)) {
      return { success: false, asset, msg: `【${asset.name}】已在珍藏阁中。` };
    }
    this.unlockedAssetIds.add(assetId);
    return {
      success: true,
      asset,
      msg: `✨ 恭喜收入珍藏阁：【${asset.name}】！${asset.bonusText}`,
    };
  }

  /** 获取所有已解锁老物件列表 */
  public getUnlockedAssets(): VintageAssetItem[] {
    const list: VintageAssetItem[] = [];
    this.unlockedAssetIds.forEach((id) => {
      const item = ERA_VINTAGE_CATALOG[id];
      if (item) list.push(item);
    });
    return list.sort((a, b) => a.yearAcquired - b.yearAcquired);
  }

  /** 按类别筛选已收集老物件 */
  public getAssetsByCategory(cat: VintageCategory): VintageAssetItem[] {
    return this.getUnlockedAssets().filter((a) => a.category === cat);
  }

  /** 计算所有已收集老物件对角色属性与天资的总加成 */
  public calculateTotalBonus(): VintageTotalBonus {
    const total: VintageTotalBonus = {
      health: 0,
      intelligence: 0,
      charm: 0,
      happiness: 0,
      wealthMindset: 0,
      prestige: 0,
      specialTalents: [],
    };

    this.unlockedAssetIds.forEach((id) => {
      const asset = ERA_VINTAGE_CATALOG[id];
      if (!asset || !asset.statBonus) return;
      if (asset.statBonus.health) total.health += asset.statBonus.health;
      if (asset.statBonus.intelligence) total.intelligence += asset.statBonus.intelligence;
      if (asset.statBonus.charm) total.charm += asset.statBonus.charm;
      if (asset.statBonus.happiness) total.happiness += asset.statBonus.happiness;
      if (asset.statBonus.wealthMindset) total.wealthMindset += asset.statBonus.wealthMindset;
      if (asset.statBonus.prestige) total.prestige += asset.statBonus.prestige;
      if (asset.statBonus.specialTalent) {
        if (!total.specialTalents.includes(asset.statBonus.specialTalent)) {
          total.specialTalents.push(asset.statBonus.specialTalent);
        }
      }
    });

    return total;
  }

  /** 获取收集率进度概览 */
  public getProgressOverview(): {
    totalCatalogCount: number;
    collectedCount: number;
    completionPercent: number;
    byCategory: Record<VintageCategory, { total: number; collected: number }>;
  } {
    const all = Object.values(ERA_VINTAGE_CATALOG);
    const byCategory: Record<VintageCategory, { total: number; collected: number }> = {
      toy: { total: 0, collected: 0 },
      clothing: { total: 0, collected: 0 },
      food: { total: 0, collected: 0 },
      appliance: { total: 0, collected: 0 },
      commemoration: { total: 0, collected: 0 },
    };

    all.forEach((item) => {
      byCategory[item.category].total += 1;
      if (this.unlockedAssetIds.has(item.id)) {
        byCategory[item.category].collected += 1;
      }
    });

    const collectedCount = this.unlockedAssetIds.size;
    const totalCatalogCount = all.length;
    const completionPercent = totalCatalogCount > 0 ? Math.round((collectedCount / totalCatalogCount) * 100) : 0;

    return { totalCatalogCount, collectedCount, completionPercent, byCategory };
  }
}


/**
 * 2. 时代房产置业管理器 (EraRealEstateManager)
 */
export class EraRealEstateManager {
  public ownedHouses: PlayerOwnedHouse[] = [];

  /** 获取当前年份开放购买的时代房产列表与实时市价 */
  public getAvailableHousesForYear(currentYear: number): Array<{
    config: HousingPropertyConfig;
    calculatedMarketPriceYuan: number;
    isAffordable: (cash: number) => boolean;
  }> {
    const multiplier = this.getPriceMultiplier(currentYear);
    return ERA_HOUSING_DATABASE.filter(
      (h) => currentYear >= h.minYear && currentYear <= h.maxYear
    ).map((config) => {
      // 随着年份房产市场价格动态重估
      const calculatedMarketPriceYuan = Math.round(config.basePriceYuan * multiplier);
      return {
        config,
        calculatedMarketPriceYuan,
        isAffordable: (cash: number) => cash >= calculatedMarketPriceYuan,
      };
    });
  }

  /** 计算当前年份相对于基准年的增值倍数 */
  public getPriceMultiplier(year: number): number {
    const keys = Object.keys(REAL_ESTATE_ERA_PRICE_INDEX).map(Number).sort((a, b) => a - b);
    if (year <= keys[0]) return REAL_ESTATE_ERA_PRICE_INDEX[keys[0]];
    if (year >= keys[keys.length - 1]) return REAL_ESTATE_ERA_PRICE_INDEX[keys[keys.length - 1]];

    // 寻找最近区间进行线性插值
    for (let i = 0; i < keys.length - 1; i++) {
      const y1 = keys[i];
      const y2 = keys[i + 1];
      if (year >= y1 && year <= y2) {
        const p1 = REAL_ESTATE_ERA_PRICE_INDEX[y1];
        const p2 = REAL_ESTATE_ERA_PRICE_INDEX[y2];
        const progress = (year - y1) / (y2 - y1);
        return p1 + progress * (p2 - p1);
      }
    }
    return 1.0;
  }

  /**
   * 全款购买房产
   */
  public buyHouseFull(
    configId: string,
    currentYear: number,
    currentQuarter: number,
    playerCash: number
  ): { success: boolean; costPaid: number; house?: PlayerOwnedHouse; msg: string } {
    const config = ERA_HOUSING_DATABASE.find((h) => h.id === configId);
    if (!config) return { success: false, costPaid: 0, msg: "未找到该房产信息！" };

    if (currentYear < config.minYear || currentYear > config.maxYear) {
      return { success: false, costPaid: 0, msg: `当前年份 (${currentYear}年) 无法购买该时代限定房产！` };
    }

    const priceMultiplier = this.getPriceMultiplier(currentYear);
    const actualPrice = Math.round(config.basePriceYuan * priceMultiplier);

    if (playerCash < actualPrice) {
      return {
        success: false,
        costPaid: 0,
        msg: `资金不足！全款购买【${config.name}】需要 ¥${actualPrice.toLocaleString()} 元，您仅有 ¥${playerCash.toLocaleString()} 元。`,
      };
    }

    const house: PlayerOwnedHouse = {
      instanceId: `house_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      configId: config.id,
      name: config.name,
      purchaseYear: currentYear,
      purchaseQuarter: currentQuarter,
      purchasePriceYuan: actualPrice,
      currentMarketValueYuan: actualPrice,
      decorationLevel: "none",
      decorationCostPaidYuan: 0,
      isRentedOut: false,
      currentQuarterlyRentYuan: Math.round(config.baseQuarterlyRentYuan * priceMultiplier),
      mortgageAccount: null,
    };

    this.ownedHouses.push(house);
    return {
      success: true,
      costPaid: actualPrice,
      house,
      msg: `🏡 恭喜全款置办【${config.name}】！总价 ¥${actualPrice.toLocaleString()} 元，房本在手，全家安居乐业！`,
    };
  }

  /**
   * 按揭贷款购买房产 (首付比例 20%~50%，剩余银行等额本息贷款)
   */
  public buyHouseMortgage(
    configId: string,
    currentYear: number,
    currentQuarter: number,
    downPaymentPercent: number, // 如 30 代表 30%
    loanTenureYears: number,    // 如 20 或 30 年
    playerCash: number
  ): { success: boolean; downPaymentPaid: number; house?: PlayerOwnedHouse; msg: string } {
    const config = ERA_HOUSING_DATABASE.find((h) => h.id === configId);
    if (!config) return { success: false, downPaymentPaid: 0, msg: "未找到该房产信息！" };

    if (currentYear < 1998) {
      return { success: false, downPaymentPaid: 0, msg: "1998 年房改前尚未普及现代商业银行个人住房按揭贷款政策，请选择全款购房。" };
    }

    const priceMultiplier = this.getPriceMultiplier(currentYear);
    const totalPrice = Math.round(config.basePriceYuan * priceMultiplier);
    const downPayment = Math.round((totalPrice * Math.max(20, Math.min(downPaymentPercent, 70))) / 100);
    const loanPrincipal = totalPrice - downPayment;

    if (playerCash < downPayment) {
      return {
        success: false,
        downPaymentPaid: 0,
        msg: `首付款不足！需要支付首付 ¥${downPayment.toLocaleString()} 元，您仅有 ¥${playerCash.toLocaleString()} 元。`,
      };
    }

    // 等额本息房贷计算 (假定基准按揭年化 4.5%)
    const annualRate = 4.5;
    const totalMonths = loanTenureYears * 12;
    const monthlyRate = annualRate / 100 / 12;
    const factor = Math.pow(1 + monthlyRate, totalMonths);
    const monthlyInstallment = Math.round((loanPrincipal * (monthlyRate * factor)) / (factor - 1));

    const mortgage: EraMortgageAccount = {
      totalLoanPrincipalYuan: loanPrincipal,
      remainingPrincipalYuan: loanPrincipal,
      annualInterestRatePercent: annualRate,
      totalTenureYears: loanTenureYears,
      remainingMonths: totalMonths,
      monthlyInstallmentYuan: monthlyInstallment,
      accumulatedInterestPaidYuan: 0,
    };

    const house: PlayerOwnedHouse = {
      instanceId: `house_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      configId: config.id,
      name: config.name,
      purchaseYear: currentYear,
      purchaseQuarter: currentQuarter,
      purchasePriceYuan: totalPrice,
      currentMarketValueYuan: totalPrice,
      decorationLevel: "none",
      decorationCostPaidYuan: 0,
      isRentedOut: false,
      currentQuarterlyRentYuan: Math.round(config.baseQuarterlyRentYuan * priceMultiplier),
      mortgageAccount: mortgage,
    };

    this.ownedHouses.push(house);
    return {
      success: true,
      downPaymentPaid: downPayment,
      house,
      msg: `🏠 恭喜成功办理银行按揭购房！房产总价 ¥${totalPrice.toLocaleString()} 元，支付首付 ¥${downPayment.toLocaleString()} 元，向银行贷款 ¥${loanPrincipal.toLocaleString()} 元 (期限${loanTenureYears}年，每月应还月供 ¥${monthlyInstallment.toLocaleString()} 元)！`,
    };
  }

  /**
   * 房产装修升级
   */
  public decorateHouse(
    instanceId: string,
    targetLevel: HouseDecorationLevel,
    playerCash: number
  ): { success: boolean; cost: number; msg: string } {
    const house = this.ownedHouses.find((h) => h.instanceId === instanceId);
    if (!house) return { success: false, cost: 0, msg: "未找到该名下房产！" };

    const costMap: Record<HouseDecorationLevel, number> = {
      none: 0,
      simple: 25000,
      refined: 80000,
      luxury: 250000,
    };

    const cost = costMap[targetLevel] || 0;
    if (playerCash < cost) {
      return { success: false, cost, msg: `装修资金不足！${targetLevel} 需要 ¥${cost.toLocaleString()} 元。` };
    }

    house.decorationLevel = targetLevel;
    house.decorationCostPaidYuan += cost;
    // 精装后租金收益提升 20% ~ 50%
    const rentBonusRate = targetLevel === "luxury" ? 1.5 : targetLevel === "refined" ? 1.3 : targetLevel === "simple" ? 1.15 : 1.0;
    house.currentQuarterlyRentYuan = Math.round(house.currentQuarterlyRentYuan * rentBonusRate);

    return {
      success: true,
      cost,
      msg: `🔨 装修完工！【${house.name}】已升级为【${targetLevel}】档次，租金上涨至每季度 ¥${house.currentQuarterlyRentYuan.toLocaleString()} 元！`,
    };
  }

  /**
   * 切换房产出租状态 (自住或出租)
   */
  public toggleHouseRental(instanceId: string): { success: boolean; isRented: boolean; msg: string } {
    const house = this.ownedHouses.find((h) => h.instanceId === instanceId);
    if (!house) return { success: false, isRented: false, msg: "未找到该房产！" };
    house.isRentedOut = !house.isRentedOut;
    return {
      success: true,
      isRented: house.isRentedOut,
      msg: house.isRentedOut
        ? `🔑 【${house.name}】已挂牌出租，每季度可产生稳定租金收益 ¥${house.currentQuarterlyRentYuan.toLocaleString()} 元！`
        : `🛋️ 【${house.name}】已收回自住，提升家庭日常生活品质与幸福感！`,
    };
  }

  /**
   * 随年代推进重估名下房产市场总值与租金
   */
  public revalueHousesForYear(currentYear: number): void {
    const multiplier = this.getPriceMultiplier(currentYear);
    this.ownedHouses.forEach((house) => {
      const config = ERA_HOUSING_DATABASE.find((c) => c.id === house.configId);
      if (config) {
        // 重估市场增值
        house.currentMarketValueYuan = Math.round(config.basePriceYuan * multiplier);
        // 重估租金
        const decBonus = house.decorationLevel === "luxury" ? 1.5 : house.decorationLevel === "refined" ? 1.3 : house.decorationLevel === "simple" ? 1.15 : 1.0;
        house.currentQuarterlyRentYuan = Math.round(config.baseQuarterlyRentYuan * multiplier * decBonus);
      }
    });
  }

  /**
   * 季度房贷自动扣除与租金结算
   */
  public settleQuarterlyHousingCashflow(): { totalRentIncome: number; totalMortgagePayment: number } {
    let totalRentIncome = 0;
    let totalMortgagePayment = 0;

    this.ownedHouses.forEach((house) => {
      // 租金收益进账
      if (house.isRentedOut) {
        totalRentIncome += house.currentQuarterlyRentYuan;
      }
      // 房贷月供支出 (每季度 3 个月)
      if (house.mortgageAccount && house.mortgageAccount.remainingPrincipalYuan > 0) {
        const quarterlyPayment = house.mortgageAccount.monthlyInstallmentYuan * 3;
        totalMortgagePayment += quarterlyPayment;
        house.mortgageAccount.remainingMonths = Math.max(0, house.mortgageAccount.remainingMonths - 3);
        // 本金递减近似
        const monthlyRate = house.mortgageAccount.annualInterestRatePercent / 100 / 12;
        const interestQuarter = house.mortgageAccount.remainingPrincipalYuan * monthlyRate * 3;
        const principalRepaidQuarter = Math.max(0, quarterlyPayment - interestQuarter);
        house.mortgageAccount.remainingPrincipalYuan = Math.max(0, Math.round(house.mortgageAccount.remainingPrincipalYuan - principalRepaidQuarter));
        house.mortgageAccount.accumulatedInterestPaidYuan += Math.round(interestQuarter);

        if (house.mortgageAccount.remainingPrincipalYuan <= 0 || house.mortgageAccount.remainingMonths <= 0) {
          house.mortgageAccount = null; // 贷款结清
        }
      }
    });

    return { totalRentIncome, totalMortgagePayment };
  }

  /** 获取名下房产总市场估值与未结清贷款总额 */
  public getHousingAssetsSummary(): {
    totalPropertiesCount: number;
    totalMarketValueYuan: number;
    totalRemainingMortgageDebtYuan: number;
    netHousingEquityYuan: number;
    quarterlyNetRentCashflowYuan: number;
  } {
    let totalMarketValueYuan = 0;
    let totalRemainingMortgageDebtYuan = 0;
    let quarterlyNetRentCashflowYuan = 0;

    this.ownedHouses.forEach((house) => {
      totalMarketValueYuan += house.currentMarketValueYuan;
      if (house.mortgageAccount) {
        totalRemainingMortgageDebtYuan += house.mortgageAccount.remainingPrincipalYuan;
      }
      if (house.isRentedOut) {
        quarterlyNetRentCashflowYuan += house.currentQuarterlyRentYuan;
      }
    });

    return {
      totalPropertiesCount: this.ownedHouses.length,
      totalMarketValueYuan,
      totalRemainingMortgageDebtYuan,
      netHousingEquityYuan: totalMarketValueYuan - totalRemainingMortgageDebtYuan,
      quarterlyNetRentCashflowYuan,
    };
  }
}


/**
 * 3. 时代交通代步管理器 (EraTransportManager)
 */
export class EraTransportManager {
  public ownedVehicles: PlayerOwnedVehicle[] = [
    { vehicleId: "walk_bus", purchaseYear: 1970, purchasePriceYuan: 0, isCurrentActive: true },
  ];

  /** 获取当前年代开放购买的代步载具列表 */
  public getAvailableVehicles(currentYear: number): EraVehicleConfig[] {
    return ERA_VEHICLES_DATABASE.filter((v) => currentYear >= v.minEraYear);
  }

  /** 购买载具并设置为当前代步工具 */
  public buyVehicle(
    vehicleId: string,
    currentYear: number,
    playerCash: number
  ): { success: boolean; cost: number; msg: string } {
    const config = ERA_VEHICLES_DATABASE.find((v) => v.id === vehicleId);
    if (!config) return { success: false, cost: 0, msg: "未找到该载具！" };

    if (currentYear < config.minEraYear) {
      return { success: false, cost: 0, msg: `该载具需到 ${config.minEraYear} 年才正式量产上市！` };
    }

    if (playerCash < config.retailPriceYuan) {
      return {
        success: false,
        cost: config.retailPriceYuan,
        msg: `私房钱不足！购买【${config.name}】需要 ¥${config.retailPriceYuan.toLocaleString()} 元。`,
      };
    }

    // 设置之前的所有载具为非主力
    this.ownedVehicles.forEach((v) => (v.isCurrentActive = false));
    this.ownedVehicles.push({
      vehicleId: config.id,
      purchaseYear: currentYear,
      purchasePriceYuan: config.retailPriceYuan,
      isCurrentActive: true,
    });

    return {
      success: true,
      cost: config.retailPriceYuan,
      msg: `🚗 恭喜全款购入【${config.name}】！每季节省 ${config.energySavePerQuarter} 点精力，声望 +${config.prestigeBonus}！`,
    };
  }

  /** 获取当前主力代步载具配置 */
  public getCurrentActiveVehicle(): EraVehicleConfig {
    const active = this.ownedVehicles.find((v) => v.isCurrentActive);
    if (!active) return ERA_VEHICLES_DATABASE[0];
    return ERA_VEHICLES_DATABASE.find((v) => v.id === active.vehicleId) || ERA_VEHICLES_DATABASE[0];
  }

  /** 切换主力载具 */
  public setActiveVehicle(vehicleId: string): boolean {
    const exists = this.ownedVehicles.find((v) => v.vehicleId === vehicleId);
    if (!exists) return false;
    this.ownedVehicles.forEach((v) => (v.isCurrentActive = v.vehicleId === vehicleId));
    return true;
  }

  /** 季度结算载具维保成本与精力节省 */
  public settleQuarterlyTransport(): { maintenanceCostYuan: number; energySaved: number } {
    const active = this.getCurrentActiveVehicle();
    return {
      maintenanceCostYuan: active.quarterlyMaintenanceCostYuan,
      energySaved: active.energySavePerQuarter,
    };
  }
}


/**
 * 4. 时代银行与保值储蓄管理器 (EraBankingManager)
 */
export class EraBankingManager {
  public bankCurrentSavingsYuan: number = 0; // 活期存款余额
  public timeDeposits: EraTimeDeposit[] = []; // 定期存单列表

  /**
   * 获取当前年份匹配的历史存款利率与保值储蓄补贴率
   */
  public getInterestRatesForYear(year: number): {
    periodKey: string;
    baseRates: Record<EraDepositTerm, number>;
    subsidyRates: Record<EraDepositTerm, number>;
  } {
    let periodKey = "2011_2024";
    if (year <= 1987) periodKey = "1978_1987";
    else if (year <= 1993) periodKey = "1988_1993";
    else if (year <= 1999) periodKey = "1994_1999";
    else if (year <= 2010) periodKey = "2000_2010";

    const cfg = ERA_BANK_RATE_DECADE_TABLE[periodKey] || ERA_BANK_RATE_DECADE_TABLE["2011_2024"];
    return { periodKey, baseRates: cfg.baseRate, subsidyRates: cfg.subsidyRate };
  }

  /** 存入活期储蓄 */
  public depositCurrent(amount: number): { success: boolean; msg: string } {
    if (amount <= 0) return { success: false, msg: "存款金额必须大于 0！" };
    this.bankCurrentSavingsYuan += amount;
    return {
      success: true,
      msg: `💰 成功存入银行活期 ¥${amount.toLocaleString()} 元，活期结余 ¥${this.bankCurrentSavingsYuan.toLocaleString()} 元。`,
    };
  }

  /** 支取活期储蓄 */
  public withdrawCurrent(amount: number): { success: boolean; actualWithdraw: number; msg: string } {
    if (amount <= 0) return { success: false, actualWithdraw: 0, msg: "支取金额必须大于 0！" };
    if (this.bankCurrentSavingsYuan < amount) {
      return { success: false, actualWithdraw: 0, msg: `活期存款余额不足！当前仅结余 ¥${this.bankCurrentSavingsYuan.toLocaleString()} 元。` };
    }
    this.bankCurrentSavingsYuan -= amount;
    return {
      success: true,
      actualWithdraw: amount,
      msg: `🏧 成功支取活期存款 ¥${amount.toLocaleString()} 元，剩余活期 ¥${this.bankCurrentSavingsYuan.toLocaleString()} 元。`,
    };
  }

  /**
   * 办理定期存单 (硬核还原80年代高息保值储蓄贴补率)
   */
  public openTimeDeposit(
    principal: number,
    termYears: EraDepositTerm,
    currentYear: number,
    currentQuarter: number
  ): { success: boolean; deposit?: EraTimeDeposit; msg: string } {
    if (principal < 500) {
      return { success: false, msg: "定期存单起存门槛为 ¥500 元！" };
    }

    const { baseRates, subsidyRates, periodKey } = this.getInterestRatesForYear(currentYear);
    const baseRate = baseRates[termYears] || 3.0;
    const subsidy = subsidyRates[termYears] || 0.0;
    const totalYield = Math.round((baseRate + subsidy) * 100) / 100;

    const isInflationProof = periodKey === "1988_1993" && subsidy > 0;

    const deposit: EraTimeDeposit = {
      id: `dep_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      principalYuan: principal,
      startYear: currentYear,
      startQuarter: currentQuarter,
      termYears,
      baseAnnualRatePercent: baseRate,
      inflationSubsidyRatePercent: subsidy,
      totalAnnualYieldPercent: totalYield,
      isMatured: false,
    };

    this.timeDeposits.push(deposit);

    const subsidyNarrative = isInflationProof
      ? `💥 享受80年代物价闯关【保值储蓄贴补率 +${subsidy}%】！综合年化约定利率惊人达到 ${totalYield}%！锁定对抗高通胀时代的财富红利！`
      : `年化基准收益率 ${totalYield}%！`;

    return {
      success: true,
      deposit,
      msg: `🏦 成功办理中国人民银行【${termYears}年期定期存单】本金 ¥${principal.toLocaleString()} 元！${subsidyNarrative}`,
    };
  }

  /**
   * 季度结息与到期定期兑付
   */
  public settleQuarterlyDeposits(
    currentYear: number,
    currentQuarter: number
  ): { currentInterestEarned: number; maturedPrincipal: number; maturedInterest: number; maturedCount: number } {
    // 活期季度结息 (年化 0.8% 左右)
    const currentInterestEarned = Math.round(this.bankCurrentSavingsYuan * (0.008 / 4) * 100) / 100;
    this.bankCurrentSavingsYuan += currentInterestEarned;

    let maturedPrincipal = 0;
    let maturedInterest = 0;
    let maturedCount = 0;

    this.timeDeposits.forEach((dep) => {
      if (!dep.isMatured) {
        const passedYears = currentYear - dep.startYear + (currentQuarter - dep.startQuarter) / 4;
        if (passedYears >= dep.termYears) {
          dep.isMatured = true;
          const interest = Math.round(dep.principalYuan * (dep.totalAnnualYieldPercent / 100) * dep.termYears);
          maturedPrincipal += dep.principalYuan;
          maturedInterest += interest;
          maturedCount += 1;
        }
      }
    });

    // 清除已兑付存单并划转活期
    this.timeDeposits = this.timeDeposits.filter((d) => !d.isMatured);
    const totalPayout = maturedPrincipal + maturedInterest;
    this.bankCurrentSavingsYuan += totalPayout;

    return {
      currentInterestEarned,
      maturedPrincipal,
      maturedInterest,
      maturedCount,
    };
  }

  /** 获取银行存款总资产 */
  public getBankTotalSavings(): { currentSavings: number; timeDepositsTotal: number; grandTotal: number } {
    const timeDepositsTotal = this.timeDeposits.reduce((sum, d) => sum + d.principalYuan, 0);
    return {
      currentSavings: this.bankCurrentSavingsYuan,
      timeDepositsTotal,
      grandTotal: this.bankCurrentSavingsYuan + timeDepositsTotal,
    };
  }
}


/**
 * 5. 1992股票认购证与 A 股证券投资管理器 (EraStockMarketManager)
 */
export class EraStockMarketManager {
  public isStockAccountOpened: boolean = false;
  public totalRealizedProfitYuan: number = 0;

  // 1992 年股票认购证专用持仓包
  public subscriptionCertPackage: SubscriptionCertPackage | null = null;

  // 板块行情列表（老八股 + 现代四大核心板块）
  public sectors: StockSectorItem[] = JSON.parse(JSON.stringify(ERA_STOCKS_DATABASE));

  /** 开立 A 股股东账户 */
  public openStockAccount(): { success: boolean; msg: string } {
    this.isStockAccountOpened = true;
    return {
      success: true,
      msg: "📈 恭喜开通中国证券登记结算公司 A 股股东账户！正式跨入资本市场！",
    };
  }

  /**
   * 1992 上海股票认购证购买 (每本30元，整套100张3000元)
   */
  public buySubscriptionCerts(
    batchCount: number, // 购买本数 (如 10 本 = 300元，100本 = 3000元)
    currentYear: number,
    currentQuarter: number,
    playerCash: number
  ): { success: boolean; cost: number; msg: string } {
    if (currentYear !== 1992 || currentQuarter > 2) {
      return { success: false, cost: 0, msg: "股票认购证仅在 1992 年上半年（第1~2季度）限期发售！时代窗口已过！" };
    }

    if (batchCount <= 0) return { success: false, cost: 0, msg: "购买本数必须大于 0！" };

    const unitPrice = 30; // 真实历史价格：30元一本
    const totalCost = batchCount * unitPrice;

    if (playerCash < totalCost) {
      return {
        success: false,
        cost: totalCost,
        msg: `私房钱不足！认购 ${batchCount} 本股票认购证需要 ¥${totalCost.toLocaleString()} 元。`,
      };
    }

    if (!this.subscriptionCertPackage) {
      this.subscriptionCertPackage = {
        id: "cert_1992_shanghai",
        purchaseYear: 1992,
        purchaseQuarter: currentQuarter,
        batchCount,
        totalCostYuan: totalCost,
        drawnWinningCount: 0,
        realizedProfitYuan: 0,
        isSettled: false,
      };
    } else {
      this.subscriptionCertPackage.batchCount += batchCount;
      this.subscriptionCertPackage.totalCostYuan += totalCost;
    }

    return {
      success: true,
      cost: totalCost,
      msg: `📜 成功出资 ¥${totalCost.toLocaleString()} 元购入 ${batchCount} 本【1992上海股票认购证】！手握开启中国证券史暴富神话的黄金钥匙！静待下半年摇号开奖！`,
    };
  }

  /**
   * 1992 股票认购证摇号上市结算 (在 1992 年第3~4季度暴赚数十倍到百倍兑现！)
   */
  public settleSubscriptionCertLottery(currentYear: number, currentQuarter: number): {
    hasDrawn: boolean;
    profitEarnedYuan: number;
    narrative: string;
  } {
    if (!this.subscriptionCertPackage || this.subscriptionCertPackage.isSettled) {
      return { hasDrawn: false, profitEarnedYuan: 0, narrative: "" };
    }

    if (currentYear === 1992 && currentQuarter >= 3) {
      // 真实历史：1992年发售仅207万本，中签率奇高，白条认购证在黑市被炒上万元，上市直接暴赚数十倍！
      const batchCount = this.subscriptionCertPackage.batchCount;
      // 每本平均暴赚 800 ~ 1500 元（约为 30~50 倍收益）
      const profitPerCert = Math.floor(800 + Math.random() * 700);
      const totalProfit = batchCount * profitPerCert;

      this.subscriptionCertPackage.drawnWinningCount = Math.round(batchCount * 0.95);
      this.subscriptionCertPackage.realizedProfitYuan = totalProfit;
      this.subscriptionCertPackage.isSettled = true;
      this.totalRealizedProfitYuan += totalProfit;

      const narrative = `🎉【1992认购证创富神话开奖！】您持有的 ${batchCount} 本认购证全部中签！新股上市首日无涨跌幅限制全线暴涨十倍以上！您果断高位套现，狂赚净利润 +¥${totalProfit.toLocaleString()} 元！瞬间跨入百万富豪行列！`;

      return {
        hasDrawn: true,
        profitEarnedYuan: totalProfit,
        narrative,
      };
    }

    return { hasDrawn: false, profitEarnedYuan: 0, narrative: "" };
  }

  /**
   * 推进季度股市行情波动与时代大事件冲击
   */
  public advanceQuarterMarket(currentYear: number): {
    triggeredEvent?: HistoricalStockEraEvent;
    totalDividendPayoutYuan: number;
  } {
    const triggeredEvent = HISTORICAL_STOCK_ERA_EVENTS[currentYear];
    let totalDividendPayoutYuan = 0;

    this.sectors.forEach((sec) => {
      // 基准自然波动 (-8% ~ +10%)
      let change = (Math.random() * 18 - 8) * sec.volatilityRate;

      // 叠加时代重大历史行情大事件冲击
      if (triggeredEvent) {
        if (triggeredEvent.impact.marketWidePercent) {
          change += triggeredEvent.impact.marketWidePercent / 4;
        }
        if (sec.isOldEightShare && triggeredEvent.impact.oldEightSharePercent) {
          change += triggeredEvent.impact.oldEightSharePercent / 4;
        }
        if (sec.id === "tech" && triggeredEvent.impact.techPercent) {
          change += triggeredEvent.impact.techPercent / 4;
        }
        if (sec.id === "consumption" && triggeredEvent.impact.consumptionPercent) {
          change += triggeredEvent.impact.consumptionPercent / 4;
        }
        if (sec.id === "new_energy" && triggeredEvent.impact.newEnergyPercent) {
          change += triggeredEvent.impact.newEnergyPercent / 4;
        }
        if (sec.id === "finance_bank" && triggeredEvent.impact.financeBankPercent) {
          change += triggeredEvent.impact.financeBankPercent / 4;
        }
      }

      // 涨跌幅与价格更新 (跌破 1 元触发重组保护)
      sec.quarterChangePercent = Math.round(change * 10) / 10;
      sec.currentPrice = Math.max(1.0, Math.round(sec.currentPrice * (1 + change / 100) * 100) / 100);

      // 持仓季度分红派息 (年化股息率 / 4)
      if (sec.holdShares > 0 && sec.dividendYieldAnnualPercent > 0) {
        const divQuarter = Math.round(sec.holdShares * sec.currentPrice * (sec.dividendYieldAnnualPercent / 100 / 4) * 100) / 100;
        totalDividendPayoutYuan += divQuarter;
      }
    });

    return {
      triggeredEvent,
      totalDividendPayoutYuan: Math.round(totalDividendPayoutYuan),
    };
  }

  /** 买入股票 (整手 100 股) */
  public buyShares(
    sectorId: string,
    shares: number,
    playerCash: number
  ): { success: boolean; totalCost: number; commissionFee: number; msg: string } {
    if (!this.isStockAccountOpened) {
      return { success: false, totalCost: 0, commissionFee: 0, msg: "您尚未开立 A 股股东账户！" };
    }
    if (shares <= 0 || shares % 100 !== 0) {
      return { success: false, totalCost: 0, commissionFee: 0, msg: "股票买入必须为 100 股（1手）的整数倍！" };
    }

    const sec = this.sectors.find((s) => s.id === sectorId);
    if (!sec) return { success: false, totalCost: 0, commissionFee: 0, msg: "板块不存在！" };

    const rawCost = sec.currentPrice * shares;
    const commissionFee = Math.max(5, Math.round(rawCost * 0.00025 * 100) / 100);
    const totalCost = Math.round((rawCost + commissionFee) * 100) / 100;

    if (playerCash < totalCost) {
      return {
        success: false,
        totalCost,
        commissionFee,
        msg: `可用私房钱不足！买入需要 ¥${totalCost.toLocaleString()} 元（含券商佣金 ¥${commissionFee} 元）。`,
      };
    }

    const prevVal = sec.holdShares * sec.averageCostPrice;
    sec.holdShares += shares;
    sec.averageCostPrice = Math.round(((prevVal + totalCost) / sec.holdShares) * 100) / 100;

    return {
      success: true,
      totalCost,
      commissionFee,
      msg: `🎯 成功挂单买入【${sec.name}】${shares} 股！成本均价 ¥${sec.averageCostPrice} 元，佣金 ¥${commissionFee} 元。`,
    };
  }

  /** 卖出股票 */
  public sellShares(
    sectorId: string,
    shares: number
  ): {
    success: boolean;
    netCashGained: number;
    profitOrLoss: number;
    stampDuty: number;
    commission: number;
    msg: string;
  } {
    const sec = this.sectors.find((s) => s.id === sectorId);
    if (!sec || sec.holdShares < shares || shares <= 0) {
      return { success: false, netCashGained: 0, profitOrLoss: 0, stampDuty: 0, commission: 0, msg: "持股数量不足！" };
    }

    const rawAmount = sec.currentPrice * shares;
    const stampDuty = Math.round(rawAmount * 0.001 * 100) / 100; // 印花税千1
    const commission = Math.max(5, Math.round(rawAmount * 0.00025 * 100) / 100); // 佣金万2.5
    const netCashGained = Math.round((rawAmount - stampDuty - commission) * 100) / 100;

    const costBasis = sec.averageCostPrice * shares;
    const profitOrLoss = Math.round((netCashGained - costBasis) * 100) / 100;

    sec.holdShares -= shares;
    if (sec.holdShares === 0) sec.averageCostPrice = 0;
    this.totalRealizedProfitYuan += profitOrLoss;

    return {
      success: true,
      netCashGained,
      profitOrLoss,
      stampDuty,
      commission,
      msg: `💸 成功卖出【${sec.name}】${shares} 股！到账 ¥${netCashGained.toLocaleString()} 元，本次交易${profitOrLoss >= 0 ? "盈利 +" : "亏损 "}¥${profitOrLoss.toLocaleString()} 元！`,
    };
  }

  /** 获取股票持仓市值与盈亏总结 */
  public getPortfolioSummary(): {
    totalMarketValue: number;
    totalCost: number;
    unrealizedPnL: number;
    pnlPercent: number;
  } {
    let totalMarketValue = 0;
    let totalCost = 0;

    this.sectors.forEach((sec) => {
      if (sec.holdShares > 0) {
        totalMarketValue += sec.holdShares * sec.currentPrice;
        totalCost += sec.holdShares * sec.averageCostPrice;
      }
    });

    const unrealizedPnL = Math.round((totalMarketValue - totalCost) * 100) / 100;
    const pnlPercent = totalCost > 0 ? Math.round((unrealizedPnL / totalCost) * 10000) / 100 : 0;

    return {
      totalMarketValue: Math.round(totalMarketValue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      unrealizedPnL,
      pnlPercent,
    };
  }
}


// ============================================================================
// 四、时代资产与投资理财总门面大系统 (EraAssetsSystem)
// ============================================================================

export class EraAssetsSystem {
  // 五大核心子系统
  public vintageGallery: VintageGalleryManager = new VintageGalleryManager();
  public realEstate: EraRealEstateManager = new EraRealEstateManager();
  public transport: EraTransportManager = new EraTransportManager();
  public banking: EraBankingManager = new EraBankingManager();
  public stockMarket: EraStockMarketManager = new EraStockMarketManager();

  // 历史财务报表归档
  public quarterlyFinancialReports: QuarterlyFinancialReport[] = [];

  // --------------------------------------------------------------------------
  // 向下兼容现有 FinanceStockSystem 关键属性与接口
  // --------------------------------------------------------------------------
  get isStockAccountOpened(): boolean {
    return this.stockMarket.isStockAccountOpened;
  }
  set isStockAccountOpened(val: boolean) {
    this.stockMarket.isStockAccountOpened = val;
  }

  get bankCurrentSavings(): number {
    return this.banking.bankCurrentSavingsYuan;
  }
  set bankCurrentSavings(val: number) {
    this.banking.bankCurrentSavingsYuan = val;
  }

  get bankSavings(): number {
    return this.banking.bankCurrentSavingsYuan;
  }
  set bankSavings(val: number) {
    this.banking.bankCurrentSavingsYuan = val;
  }

  get sectors(): StockSectorItem[] {
    return this.stockMarket.sectors;
  }

  get totalRealizedProfitYuan(): number {
    return this.stockMarket.totalRealizedProfitYuan;
  }

  public depositCurrentSavings(amount: number): { success: boolean; msg: string } {
    return this.banking.depositCurrent(amount);
  }

  public withdrawCurrentSavings(amount: number): { success: boolean; actualWithdraw: number; msg: string } {
    return this.banking.withdrawCurrent(amount);
  }

  public openTimeDeposit(principal: number, termYears: 1 | 3 | 5, currentYear: number, currentQuarter: number) {
    return this.banking.openTimeDeposit(principal, termYears, currentYear, currentQuarter);
  }

  public openAccount() {
    return this.stockMarket.openStockAccount();
  }

  public buyShares(sectorId: string, shares: number, playerCash: number) {
    return this.stockMarket.buyShares(sectorId, shares, playerCash);
  }

  public sellShares(sectorId: string, shares: number) {
    return this.stockMarket.sellShares(sectorId, shares);
  }

  public getPortfolioSummary() {
    return this.stockMarket.getPortfolioSummary();
  }

  // --------------------------------------------------------------------------
  // 核心大系统：季度全周期推进与综合财务报表生成
  // --------------------------------------------------------------------------

  /**
   * 推进一个季度：结算存款利息、房产租金、房贷月供、车辆维保、股市行情、认购证摇号
   * @param currentYear 当前自然年份 (如 1992)
   * @param currentQuarter 当前季度 (1~4)
   * @param playerLiquidCash 玩家当前身上的流动私房钱 (元)
   * @returns 季度财务结算报告，包含详细现金流变动与净资产总览
   */
  public advanceQuarterlyCycle(
    currentYear: number,
    currentQuarter: number,
    playerLiquidCash: number
  ): QuarterlyFinancialReport {
    // 1. 随年份自动更新房产估值与租金基准
    this.realEstate.revalueHousesForYear(currentYear);

    // 2. 银行系统结算：活期结息与定期到期兑付
    const bankSettle = this.banking.settleQuarterlyDeposits(currentYear, currentQuarter);

    // 3. 房产现金流：租金进账与房贷月供扣除
    const houseCashflow = this.realEstate.settleQuarterlyHousingCashflow();

    // 4. 代步载具维保扣费
    const transportSettle = this.transport.settleQuarterlyTransport();

    // 5. A 股市场季度行情演进与分红
    const stockAdvance = this.stockMarket.advanceQuarterMarket(currentYear);

    // 6. 1992 认购证摇号上市暴富兑现判定
    const certSettle = this.stockMarket.settleSubscriptionCertLottery(currentYear, currentQuarter);

    // 计算现金流入总和
    const totalCashInflow =
      bankSettle.currentInterestEarned +
      bankSettle.maturedPrincipal +
      bankSettle.maturedInterest +
      houseCashflow.totalRentIncome +
      stockAdvance.totalDividendPayoutYuan +
      certSettle.profitEarnedYuan;

    // 计算现金流出总和
    const totalCashOutflow = houseCashflow.totalMortgagePayment + transportSettle.maintenanceCostYuan;

    // 净现金流
    const netCashFlow = totalCashInflow - totalCashOutflow;

    // 综合资产统计
    const netWorth = this.calculateTotalNetAssets(currentYear, playerLiquidCash + netCashFlow);

    // 白话叙事生成
    const narratives: string[] = [];
    if (houseCashflow.totalRentIncome > 0) {
      narratives.push(`名下房产出租进账租金 ¥${houseCashflow.totalRentIncome.toLocaleString()} 元`);
    }
    if (bankSettle.maturedCount > 0) {
      narratives.push(`${bankSettle.maturedCount}笔定期存单到期收回本息 ¥${(bankSettle.maturedPrincipal + bankSettle.maturedInterest).toLocaleString()} 元`);
    }
    if (certSettle.hasDrawn) {
      narratives.push(certSettle.narrative);
    }
    if (stockAdvance.triggeredEvent) {
      narratives.push(`【时代行情】${stockAdvance.triggeredEvent.title}`);
    }
    if (houseCashflow.totalMortgagePayment > 0) {
      narratives.push(`按揭房贷扣除本季月供 ¥${houseCashflow.totalMortgagePayment.toLocaleString()} 元`);
    }

    const narrativeSummary = narratives.length > 0 ? narratives.join("；") : "本季度各项资产财务平稳运行，各项开支与利息正常划转。";

    const report: QuarterlyFinancialReport = {
      year: currentYear,
      quarter: currentQuarter,
      currentSavingsInterestYuan: bankSettle.currentInterestEarned,
      maturedDepositPayoutYuan: bankSettle.maturedPrincipal + bankSettle.maturedInterest,
      rentalIncomeYuan: houseCashflow.totalRentIncome,
      stockDividendIncomeYuan: stockAdvance.totalDividendPayoutYuan,
      certLotteryPayoutYuan: certSettle.profitEarnedYuan,
      totalCashInflowYuan: totalCashInflow,
      mortgagePaymentYuan: houseCashflow.totalMortgagePayment,
      vehicleMaintenanceCostYuan: transportSettle.maintenanceCostYuan,
      totalCashOutflowYuan: totalCashOutflow,
      netCashFlowYuan: netCashFlow,
      totalLiquidCashYuan: Math.max(0, playerLiquidCash + netCashFlow),
      totalBankSavingsYuan: netWorth.totalBankSavingsYuan,
      totalRealEstateMarketValueYuan: netWorth.totalRealEstateMarketValueYuan,
      totalVehicleResidualValueYuan: netWorth.totalVehicleResidualValueYuan,
      totalStockPortfolioMarketValueYuan: netWorth.totalStockPortfolioMarketValueYuan,
      totalMortgageDebtRemainingYuan: netWorth.totalMortgageDebtRemainingYuan,
      totalNetAssetsWorthYuan: netWorth.totalNetAssetsWorthYuan,
      narrativeSummary,
    };

    this.quarterlyFinancialReports.unshift(report);
    // 只保留最近 20 季度的财务对账单
    if (this.quarterlyFinancialReports.length > 20) {
      this.quarterlyFinancialReports.pop();
    }

    return report;
  }

  /**
   * 精确计算玩家当前综合家庭总净资产 (Net Worth)
   */
  public calculateTotalNetAssets(
    currentYear: number,
    currentCash: number
  ): {
    totalLiquidCashYuan: number;
    totalBankSavingsYuan: number;
    totalRealEstateMarketValueYuan: number;
    totalVehicleResidualValueYuan: number;
    totalStockPortfolioMarketValueYuan: number;
    totalMortgageDebtRemainingYuan: number;
    totalNetAssetsWorthYuan: number;
    // 兼容别名
    totalNetWorthYuan: number;
    bankSavingsTotal: number;
    housingMarketValueTotal: number;
    stockMarketValueTotal: number;
  } {
    // 1. 银行存款 (活期 + 定期)
    const bank = this.banking.getBankTotalSavings();

    // 2. 房产估值与负债
    const housing = this.realEstate.getHousingAssetsSummary();

    // 3. 股票市值
    const stock = this.stockMarket.getPortfolioSummary();

    // 4. 车辆残值 (购置价按年折旧 10%，保底 20%)
    let vehicleVal = 0;
    this.transport.ownedVehicles.forEach((v) => {
      const cfg = ERA_VEHICLES_DATABASE.find((c) => c.id === v.vehicleId);
      if (cfg && cfg.retailPriceYuan > 0) {
        const passedYears = Math.max(0, currentYear - v.purchaseYear);
        const residualRate = Math.max(0.2, 1.0 - passedYears * 0.1);
        vehicleVal += Math.round(cfg.retailPriceYuan * residualRate);
      }
    });

    const totalLiquidCashYuan = Math.max(0, currentCash);
    const totalBankSavingsYuan = bank.grandTotal;
    const totalRealEstateMarketValueYuan = housing.totalMarketValueYuan;
    const totalVehicleResidualValueYuan = vehicleVal;
    const totalStockPortfolioMarketValueYuan = stock.totalMarketValue;
    const totalMortgageDebtRemainingYuan = housing.totalRemainingMortgageDebtYuan;

    const totalNetAssetsWorthYuan =
      totalLiquidCashYuan +
      totalBankSavingsYuan +
      totalRealEstateMarketValueYuan +
      totalVehicleResidualValueYuan +
      totalStockPortfolioMarketValueYuan -
      totalMortgageDebtRemainingYuan;

    return {
      totalLiquidCashYuan,
      totalBankSavingsYuan,
      totalRealEstateMarketValueYuan,
      totalVehicleResidualValueYuan,
      totalStockPortfolioMarketValueYuan,
      totalMortgageDebtRemainingYuan,
      totalNetAssetsWorthYuan,
      totalNetWorthYuan: totalNetAssetsWorthYuan,
      bankSavingsTotal: totalBankSavingsYuan,
      housingMarketValueTotal: totalRealEstateMarketValueYuan,
      stockMarketValueTotal: totalStockPortfolioMarketValueYuan,
    };
  }
}
