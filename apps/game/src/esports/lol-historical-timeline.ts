/**
 * 《1978—一生》英雄联盟历年真实历史编年史与赛季生态 (2011~2024)
 * 严格对齐中国英雄联盟电竞真实历史轨迹与赛制演进。
 */

import type { LolEraId, LolSeasonYear, TournamentTier } from "./esports-contracts.ts";

export interface HistoricalTeamInfo {
  teamId: string;
  shortName: string;
  fullName: string;
  foundedYear: number;
  isActiveNow: boolean;
  legacyTitle: string;
  signatureChampions: string[];
  signaturePlayers: string[];
}

export interface HistoricalSeasonChronicle {
  year: LolSeasonYear;
  eraId: LolEraId;
  eraName: string;
  historicalMilestone: string;
  description: string;
  
  // 赛制与生态特征
  hasLpl: boolean;                    // 是否已正式成立 LPL 联赛 (2013起)
  hasSecondaryLeague: boolean;        // 是否有次级联赛 (LSPL 2014~2017 / LDL 2018起)
  secondaryLeagueName?: string;
  hasRelegation: boolean;             // 是否有残酷升降级制度 (2014~2017存在，2018联盟化废除)
  regularSeasonFormat: "group_cross_robin" | "single_round_robin" | "double_round_robin" | "pre_league_cup";
  playoffFormat: "king_of_the_hill" | "double_elimination" | "pre_bracket";
  worldsFormat: "group_stage_round_robin" | "swiss_system" | "circuit_points_early";
  
  // 历史冠军与传奇荣誉
  lplSpringChampion?: string;
  lplSummerChampion?: string;
  msiChampion?: string;
  worldsChampion: string;
  worldsRunnerUp: string;
  lplBestWorldsPlacement: string;
  
  // 历史知名战队与焦点选手
  prominentTeams: string[];
  legendaryPlayers: string[];
  
  // 经典名场面与名台词
  epicMoments: {
    title: string;
    description: string;
    quote?: string;
  }[];
  
  // 当年电竞选手平均生存与收入生态概览
  careerEcology: {
    monthlySalaryRange: string;
    averageSoloRankRequirement: string;
    streamingPlatformEra: string;
    socialAcceptance: string;
  };
}

export const LOL_HISTORICAL_CHRONICLES: Record<LolSeasonYear, HistoricalSeasonChronicle> = {
  2011: {
    year: 2011,
    eraId: "era_2011_inception",
    eraName: "混沌初开·国服公测与草莽初生",
    historicalMilestone: "2011年9月22日《英雄联盟》国服正式公测开启，WCG与城市英雄争霸赛拉开序幕",
    description: "中国电竞进入MOBA新纪元。没有正规基地、地下室连吃泡面训练、网吧包宿打天梯，老一代选手以热血浇铸梦想。",
    hasLpl: false,
    hasSecondaryLeague: false,
    hasRelegation: false,
    regularSeasonFormat: "pre_league_cup",
    playoffFormat: "pre_bracket",
    worldsFormat: "circuit_points_early",
    worldsChampion: "Fnatic (FNC)",
    worldsRunnerUp: "Against All Authority (aAA)",
    lplBestWorldsPlacement: "未参加 (S1为欧美邀请赛，国服尚未正式公测)",
    prominentTeams: ["Team WE", "CCM战队 (iG前身)", "EHOME", "CLC"],
    legendaryPlayers: ["若风 (Misaya)", "微笑 (Weixiao)", "草莓 (Caomei)", "笑笑 (XiaoXiao)", "姿态 (Zz1tai)", "卢本伟 (White55)"],
    epicMoments: [
      {
        title: "国服正式公测开启",
        description: "2011年9月22日，腾讯宣布英雄联盟国服公测，艾欧尼亚、祖安等各大区服务器爆满。",
        quote: "英雄，为你而战！",
      },
      {
        title: "TGA 与 WCG 中国区选拔",
        description: "CCM战队与WE战队在简陋的舞台上展开激战，开启了中国第一代LOL职业少年的电竞征程。",
      },
    ],
    careerEcology: {
      monthlySalaryRange: "1,500元 ~ 3,000元 (常有拖欠，包食宿与泡面)",
      averageSoloRankRequirement: "艾欧尼亚电信一区前50名",
      streamingPlatformEra: "YY语音直播初现雏形，主要靠比赛微薄奖金",
      socialAcceptance: "社会舆论普遍视作'网瘾少年不务正业'",
    },
  },

  2012: {
    year: 2012,
    eraId: "era_2012_we_ig",
    eraName: "红色传奇·IPL5世界冠军与国家德比",
    historicalMilestone: "WE夺得中国首个LOL世界冠军 (IPL5拉斯维加斯捧杯)，WE与iG国家德比开启",
    description: "WE战队缔造48连胜神话，微笑下路打服全世界。S2世界赛受拔网线争议重赛八强惜败，随后在IPL5横扫Fnatic夺得首座世界冠军奖杯！",
    hasLpl: false,
    hasSecondaryLeague: false,
    hasRelegation: false,
    regularSeasonFormat: "pre_league_cup",
    playoffFormat: "pre_bracket",
    worldsFormat: "circuit_points_early",
    worldsChampion: "Taipei Assassins (TPA 暗杀星)",
    worldsRunnerUp: "Azubu Frost",
    lplBestWorldsPlacement: "世界赛八强 (WE & iG)",
    prominentTeams: ["Team WE", "Invictus Gaming (iG)", "Royal 皇族", "OMG"],
    legendaryPlayers: ["微笑 (Weixiao)", "若风 (Misaya)", "卷毛 (Fzzf)", "诺言/厂长 (Clearlove)", "草莓 (Caomei)", "PDD", "姿态", "小孩游神 (Kid)"],
    epicMoments: [
      {
        title: "IPL5 拉斯维加斯登顶世界之巅",
        description: "WE在IPL5总决赛中 3:1 击败欧洲霸主Fnatic，捧起中国英雄联盟历史第一座世界级大赛冠军奖杯！",
        quote: "恭喜WE！中国电竞迎来了属于自己的世界冠军！",
      },
      {
        title: "S2拔网线长盘大战与微笑成神",
        description: "微笑男枪E脸暴击三杀残局封神，开创了ADC位置能'物理Carry整盘比赛'的纪元。",
      },
    ],
    careerEcology: {
      monthlySalaryRange: "3,000元 ~ 6,000元",
      averageSoloRankRequirement: "国服电一高分路人王、美服韩服高分段",
      streamingPlatformEra: "YY与QT语音，淘宝卖肉松饼成为退役转职雏形",
      socialAcceptance: "逐渐引起主流媒体注意，央视开始有零星专题报道",
    },
  },

  2013: {
    year: 2013,
    eraId: "era_2013_lpl_birth",
    eraName: "联赛启航·太仓首届LPL与黑暗势力",
    historicalMilestone: "首届LPL春季赛成立；OMG黑暗势力横扫全场；皇族Uzi五杀薇恩进军S3斩获世界亚军",
    description: "2013年春季，LPL在江苏太仓演播厅正式打响！黑衣黑裤的OMG开启无解速推流夺得首届LPL春冠；S3世界赛皇族一路杀进斯台普斯中心，开启狂小狗Uzi传奇！",
    hasLpl: true,
    hasSecondaryLeague: false,
    hasRelegation: false,
    regularSeasonFormat: "double_round_robin",
    playoffFormat: "king_of_the_hill",
    worldsFormat: "group_stage_round_robin",
    lplSpringChampion: "OMG 黑暗势力",
    lplSummerChampion: "Positive Energy (PE)",
    worldsChampion: "SK Telecom T1 (SKT T1)",
    worldsRunnerUp: "Royal Club (皇族)",
    lplBestWorldsPlacement: "S3 全球总决赛亚军 (皇族)",
    prominentTeams: ["OMG", "Royal Club (皇族)", "Team WE", "Invictus Gaming", "Positive Energy (PE)"],
    legendaryPlayers: ["Gogoing (大哥)", "Cool (无状态)", "Lovelin (灵药)", "San (伞皇)", "Uzi (简自豪)", "Tabe", "White55 (五五开)", "Lucky"],
    epicMoments: [
      {
        title: "LPL联赛太仓正式开幕",
        description: "2013年3月16日，首届英雄联盟职业联赛 (LPL) 春季赛在江苏太仓打响，中国电竞正规化里程碑。",
      },
      {
        title: "S3淘汰赛 Uzi 薇恩一战封神",
        description: "皇族对阵OMG，16岁的Uzi操刀暗夜猎手薇恩单枪匹马切入后排完成击杀逆转比赛，震惊全球解说！",
        quote: "He is still alive! Uzi is cleaning them all up!",
      },
    ],
    careerEcology: {
      monthlySalaryRange: "5,000元 ~ 12,000元",
      averageSoloRankRequirement: "最强王者 (Challenger) 500点以上",
      streamingPlatformEra: "YY直播分拆为虎牙直播，斗鱼TV前身AcFun生化危机直播间崛起",
      socialAcceptance: "高校开黑风靡全中国，网吧九成屏幕皆是召唤师峡谷",
    },
  },

  2014: {
    year: 2014,
    eraId: "era_2014_korean_lspl",
    eraName: "次级诞生·LSPL建立与大韩援时代",
    historicalMilestone: "创办LSPL次级联赛确立升降级；韩援引进浪潮开启(三星双雄来华)；皇族二度夺得S4亚军",
    description: "LSPL联赛创立，升降级制度让赛事充满血腥与奇迹。InSec与Zero加盟皇族开创韩援先河，S4皇族二度杀进总决赛；EDG建队包揽春夏双冠；OMG在S4零封韩国Najin白盾大快人心！",
    hasLpl: true,
    hasSecondaryLeague: true,
    secondaryLeagueName: "LSPL 甲级职业联赛",
    hasRelegation: true,
    regularSeasonFormat: "double_round_robin",
    playoffFormat: "king_of_the_hill",
    worldsFormat: "group_stage_round_robin",
    lplSpringChampion: "EDward Gaming (EDG)",
    lplSummerChampion: "EDward Gaming (EDG)",
    worldsChampion: "Samsung White (SSW)",
    worldsRunnerUp: "Star Horn Royal Club (SH皇族)",
    lplBestWorldsPlacement: "S4 全球总决赛亚军 (SH皇族)",
    prominentTeams: ["EDward Gaming (EDG)", "SH皇族", "OMG", "King战队 (LSPL冠军)", "Snake战队"],
    legendaryPlayers: ["Clearlove (厂长)", "Namei", "Koro1", "InSec", "Zero", "Uzi", "Gogoing", "Flandre (圣枪哥)"],
    epicMoments: [
      {
        title: "OMG 3:0 零封白盾抗韩奇迹",
        description: "S4全球总决赛八强战，OMG面对韩国Najin White Shield以 3:0 干净利落横扫对手，粉碎恐韩心理！",
        quote: "基地50血翻盘！3:0零封白盾！我们做到了！",
      },
      {
        title: "InSec 回旋踢改变盲僧玩法",
        description: "皇族韩援打野InSec将摸眼摸队友W回旋踢展示在世界舞台，改写了全球电竞对盲僧英雄的认知。",
      },
    ],
    careerEcology: {
      monthlySalaryRange: "15,000元 ~ 40,000元 (顶级明星年薪破百万，资本大规模进驻)",
      averageSoloRankRequirement: "韩服最强王者 300点以上成为强队试训门槛",
      streamingPlatformEra: "斗鱼TV、战旗TV、虎牙直播百团大战，天价签字费初露端倪",
      socialAcceptance: "电竞俱乐部正规基地化，分析师与领队配置健全",
    },
  },

  2015: {
    year: 2015,
    eraId: "era_2015_edg_msi",
    eraName: "破晓荣光·首届MSI斩冠与盛极而衰",
    historicalMilestone: "拳头设立首届MSI季中冠军赛，EDG在塔拉哈西 3:2 战胜SKT夺得冠军；S5遭遇八强滑铁卢",
    description: "大韩援时代巅峰，Pawn与Deft加入EDG。塔拉哈西总决赛决胜局，厂长锁定招牌痛苦之拥寡妇破解Faker不败妖姬，为LPL夺得首座拳头官方世界冠军！然而S5版本剧变，LPL队伍遭遇沉重打击。",
    hasLpl: true,
    hasSecondaryLeague: true,
    secondaryLeagueName: "LSPL 甲级职业联赛",
    hasRelegation: true,
    regularSeasonFormat: "double_round_robin",
    playoffFormat: "king_of_the_hill",
    worldsFormat: "group_stage_round_robin",
    lplSpringChampion: "EDward Gaming (EDG)",
    lplSummerChampion: "LGD Gaming (LGD)",
    msiChampion: "EDward Gaming (EDG - LPL)",
    worldsChampion: "SK Telecom T1 (SKT T1)",
    worldsRunnerUp: "KOO Tigers",
    lplBestWorldsPlacement: "S5 全球总决赛八强 (EDG)",
    prominentTeams: ["EDG", "LGD Gaming", "Invictus Gaming", "QG Reapers (LSPL黑马)", "Snake"],
    legendaryPlayers: ["Clearlove", "Pawn (佛祖)", "Deft (羊驼)", "Meiko", "GODV (韦神)", "Imp", "Rookie", "Doinb"],
    epicMoments: [
      {
        title: "2015 首届 MSI 塔拉哈西之夜破除不败神话",
        description: "EDG决胜局选出莫甘娜中单配合厂长寡妇，硬生生击破Faker诡术妖姬12场全胜金身，3:2斩获MSI总冠军！",
        quote: "证明了自己！我们是冠军！EDG打破了韩国队伍的垄断！",
      },
      {
        title: "韦神反向一箭与S5折戟反思",
        description: "LGD与iG小组赛出局，促使整个LPL赛区从盲目自大中彻底警醒，重整战术纪律与团队管理。",
      },
    ],
    careerEcology: {
      monthlySalaryRange: "30,000元 ~ 100,000元 (顶级韩援与明星年薪达300w~800w)",
      averageSoloRankRequirement: "韩服大师及以上",
      streamingPlatformEra: "熊猫TV携王思聪入局，直播热钱滚滚涌入电竞",
      socialAcceptance: "电竞成为当代年轻人最主流的泛娱乐生活方式之一",
    },
  },

  2016: {
    year: 2016,
    eraId: "era_2016_group_cross",
    eraName: "异组风云·升降级生死战与统治力重建",
    historicalMilestone: "LPL改制为AB异组双循环；升降级赛残酷至极；EDG夏季赛打出16连胜全胜夺冠",
    description: "LPL引入12支战队分为AB两组，赛制激烈复杂。升降级保级赛成为无数队伍的噩梦。RNG与EDG平分春夏冠军，S6遭遇ROX与SKT的巅峰阻击。",
    hasLpl: true,
    hasSecondaryLeague: true,
    secondaryLeagueName: "LSPL 甲级职业联赛",
    hasRelegation: true,
    regularSeasonFormat: "group_cross_robin",
    playoffFormat: "king_of_the_hill",
    worldsFormat: "group_stage_round_robin",
    lplSpringChampion: "Royal Never Give Up (RNG)",
    lplSummerChampion: "EDward Gaming (EDG)",
    msiChampion: "SK Telecom T1",
    worldsChampion: "SK Telecom T1",
    worldsRunnerUp: "Samsung Galaxy (SSG)",
    lplBestWorldsPlacement: "S6 全球总决赛八强 (EDG & RNG)",
    prominentTeams: ["RNG", "EDG", "WE (2.0重组)", "IMAY (三级跳奇迹)", "Snake"],
    legendaryPlayers: ["Mata", "Looper", "Mlxg (香锅)", "Xiaohu (小虎)", "Uzi", "Clearlove", "Scout", "SofM"],
    epicMoments: [
      {
        title: "IM 战队完成网吧队到S赛三级跳奇迹",
        description: "从城市争霸赛、LSPL次级联赛一路杀到LPL并斩获S6世界赛门票，演绎电竞黑马童话。",
      },
      {
        title: "EDG 夏季赛 16 连胜不败夺冠",
        description: "阿布执教下的EDG展现极高战术素养，整个常规赛一局大场未失，创下LPL常规赛全胜纪录。",
      },
    ],
    careerEcology: {
      monthlySalaryRange: "50,000元 ~ 150,000元",
      averageSoloRankRequirement: "韩服宗师300点以上",
      streamingPlatformEra: "直播平台进入洗牌期，专业经纪约与公会开始兴起",
      socialAcceptance: "教育部将'电子竞技运动与管理'增补为高校专业",
    },
  },

  2017: {
    year: 2017,
    eraId: "era_2017_bird_nest",
    eraName: "鸟巢长叹·洲际赛同心与四强意难平",
    historicalMilestone: "LPL四大战队团结夺得首届亚洲洲际赛冠军；S7在中国本土举办，RNG与WE止步四强无缘鸟巢",
    description: "高雄洲际赛LPL四大战队放下前嫌，共享战术分析夺冠；S7在中国武汉、广州、上海、北京点燃全民电竞狂潮，RNG与SKT打满BO5遗憾败北，鸟巢决赛终成韩国内战之痛。",
    hasLpl: true,
    hasSecondaryLeague: true,
    secondaryLeagueName: "LSPL 甲级职业联赛 (最后一届)",
    hasRelegation: true,
    regularSeasonFormat: "group_cross_robin",
    playoffFormat: "king_of_the_hill",
    worldsFormat: "group_stage_round_robin",
    lplSpringChampion: "Team WE (WE 2.0)",
    lplSummerChampion: "EDward Gaming (EDG)",
    msiChampion: "SK Telecom T1",
    worldsChampion: "Samsung Galaxy (SSG)",
    worldsRunnerUp: "SK Telecom T1",
    lplBestWorldsPlacement: "S7 全球总决赛四强 (RNG & WE)",
    prominentTeams: ["RNG", "WE", "EDG", "iG (完全体蓄力)", "OMG (司马老贼大嘴湮灭)"],
    legendaryPlayers: ["Uzi", "Mlxg", "Ming", "Mystic (大舅子)", "Xiye (兮夜)", "957 (腿哥)", "Rookie", "TheShy (初登场)", "Smlz"],
    epicMoments: [
      {
        title: "2017 亚洲洲际赛'我们是冠军'",
        description: "WE击败SKT、EDG力克SSG、RNG决胜收尾，LPL教练组与选手紧紧相拥，缔造赛区同心神话。",
        quote: "兄弟们，把冠军奖杯带回LPL！",
      },
      {
        title: "S7半决赛 RNG vs SKT 鏖战五局",
        description: "Faker五把加里奥支援全场，Uzi率队鏖战至决胜局惜败，全场观众呼喊'RNG'久久不愿离去。",
      },
    ],
    careerEcology: {
      monthlySalaryRange: "80,000元 ~ 250,000元",
      averageSoloRankRequirement: "韩服最强王者 500点以上",
      streamingPlatformEra: "斗鱼虎牙双寡头格局形成，电竞选手商业价值全面井喷",
      socialAcceptance: "S7鸟巢门票一票难求，传统体育品牌与汽车大厂争相赞助",
    },
  },

  2018: {
    year: 2018,
    eraId: "era_2018_franchise_ig",
    eraName: "登峰造极·联盟化落地与仁川金色的雨",
    historicalMilestone: "LPL正式推行联盟化取消升降级；设立LDL发展联赛；iG在仁川 3:0 夺得中国首座S赛总冠军！",
    description: "历史性拐点！LPL告别升降级，推行主客场特许经营制；RNG包揽春冠、MSI冠军、夏冠，雅加达亚运会中国电竞夺金；11月3日仁川文鹤竞技场，iG以 3:0 斩落FNC，万众狂欢！",
    hasLpl: true,
    hasSecondaryLeague: true,
    secondaryLeagueName: "LDL 英雄联盟发展联赛",
    hasRelegation: false,
    regularSeasonFormat: "group_cross_robin",
    playoffFormat: "king_of_the_hill",
    worldsFormat: "group_stage_round_robin",
    lplSpringChampion: "Royal Never Give Up (RNG)",
    lplSummerChampion: "Royal Never Give Up (RNG)",
    msiChampion: "Royal Never Give Up (RNG - LPL)",
    worldsChampion: "Invictus Gaming (iG - LPL首冠)",
    worldsRunnerUp: "Fnatic (FNC)",
    lplBestWorldsPlacement: "S8 全球总决赛世界总冠军 (iG)",
    prominentTeams: ["Invictus Gaming (iG)", "Royal Never Give Up (RNG)", "EDG", "JD Gaming", "Rogue Warriors (侠盗勇士)"],
    legendaryPlayers: ["TheShy", "Rookie", "JackeyLove", "Ning (FMVP)", "Baolan", "Uzi", "Xiaohu", "Ming", "Karsa", "Doinb"],
    epicMoments: [
      {
        title: "2018 仁川之夜 iG 夺冠登峰造极",
        description: "2018年11月3日，iG 3:0 横扫Fnatic夺得LPL历史第一座全球总决赛召唤师杯！满天飞舞金色的雨！",
        quote: "翻过这座山，他们就会听到你的故事！恭喜 iG！",
      },
      {
        title: "TheShy 剑魔天神下凡一砍四",
        description: "G2小龙坑前，TheShy操刀暗裔剑魔只身一人大招进场QE瞬斩四人，打出电竞史最霸道视觉冲击！",
        quote: "天不生 TheShy，LPL万古如长夜！",
      },
    ],
    careerEcology: {
      monthlySalaryRange: "100,000元 ~ 500,000元 (顶级明星顶薪年薪破千万级)",
      averageSoloRankRequirement: "韩服宗师600点+，职业青训选秀营体系启动",
      streamingPlatformEra: "B站、快手、抖音全面参与电竞版权争夺",
      socialAcceptance: "全网宿舍高校狂欢呐喊，央视与人民日报盛赞青年拼搏精神",
    },
  },

  2019: {
    year: 2019,
    eraId: "era_2019_fpx_phoenix",
    eraName: "凤凰涅槃·FPX巴黎捧杯与两连冠霸业",
    historicalMilestone: "常规赛单大组双循环确立；FPX在巴黎雅高酒店 3:0 横扫欧洲霸主G2，LPL卫冕世界冠军！",
    description: "常规赛取消东西部分区，实行16队大组单循环。FPX战术大局观与四包二打法引领版本，巴黎总决赛 3:0 零封MSI冠军G2，斩获中国第二座召唤师杯！",
    hasLpl: true,
    hasSecondaryLeague: true,
    secondaryLeagueName: "LDL 英雄联盟发展联赛",
    hasRelegation: false,
    regularSeasonFormat: "single_round_robin",
    playoffFormat: "king_of_the_hill",
    worldsFormat: "group_stage_round_robin",
    lplSpringChampion: "Invictus Gaming (iG)",
    lplSummerChampion: "FunPlus Phoenix (FPX)",
    msiChampion: "G2 Esports",
    worldsChampion: "FunPlus Phoenix (FPX - LPL卫冕)",
    worldsRunnerUp: "G2 Esports",
    lplBestWorldsPlacement: "S9 全球总决赛世界总冠军 (FPX)",
    prominentTeams: ["FunPlus Phoenix (FPX)", "iG", "RNG", "Top Esports (TES)", "Bilibili Gaming (BLG)"],
    legendaryPlayers: ["Doinb (硬币哥)", "Tian (高天亮 FMVP)", "Crisp (刘青松)", "Lwx (大聪明)", "GimGoon (贡子哥)", "Knight (左手)"],
    epicMoments: [
      {
        title: "FPX 巴黎雅高酒店 3:0 横扫捧杯",
        description: "Tian盲僧回旋踢神出鬼没连斩MVP，Lwx总决赛零阵亡记录，凤凰展翅浴火重生！",
        quote: "凤凰飞上巴黎的天空！我们是两届世界冠军 LPL！",
      },
      {
        title: "Doinb 泰坦中单战术革命",
        description: "推线游走四包二，Doinb用独特的坦克游走中单颠覆全球对中路传统刺客法师的刻板偏见。",
      },
    ],
    careerEcology: {
      monthlySalaryRange: "120,000元 ~ 800,000元",
      averageSoloRankRequirement: "韩服最强王者 700点以上",
      streamingPlatformEra: "B站以8亿元天价买下S赛三年独家直播版权",
      socialAcceptance: "电竞进入全面工业化运营与主流体育殿堂",
    },
  },

  2020: {
    year: 2020,
    eraId: "era_2020_shanghai_dwg",
    eraName: "重聚上海·线上复赛与黑马苏宁亚军",
    historicalMilestone: "疫情中首创线上赛复工；TES斩获MSC中韩季中杯；S10在上海全程封闭举办，SN黑马斩获亚军",
    description: "受全球疫情影响，LPL迅速转型线上赛保障复工。S10世界赛空降上海，SN战队从三号种子一路斩杀JDG与TES挺进决赛，Bin五杀剑姬载入史册；最终DWG重夺韩国赛区王座。",
    hasLpl: true,
    hasSecondaryLeague: true,
    secondaryLeagueName: "LDL 英雄联盟发展联赛",
    hasRelegation: false,
    regularSeasonFormat: "single_round_robin",
    playoffFormat: "king_of_the_hill",
    worldsFormat: "group_stage_round_robin",
    lplSpringChampion: "JD Gaming (JDG)",
    lplSummerChampion: "Top Esports (TES)",
    msiChampion: "停办 (由MSC季中杯取代，TES夺冠)",
    worldsChampion: "DAMWON Gaming (DWG)",
    worldsRunnerUp: "Suning (SN 苏宁)",
    lplBestWorldsPlacement: "S10 全球总决赛亚军 (SN)",
    prominentTeams: ["Top Esports (TES)", "JD Gaming (JDG)", "Suning (SN)", "LGD Gaming (老将重组)", "iG"],
    legendaryPlayers: ["Knight", "JackeyLove", "Kanavi", "Bin (陈泽彬)", "SofM (首富)", "Huanfeng", "Angel", "ShowMaker", "Canyon"],
    epicMoments: [
      {
        title: "Bin 剑姬总决赛斩获五杀",
        description: "S10总决赛第二局，Bin操刀无双剑姬行云流水一秒四破，斩获全球总决赛历史上决赛首个五杀！",
        quote: "Penta Kill！世界总决赛决赛历史上的第一个五杀！Bin！",
      },
      {
        title: "TES 让二追三逆转 FNC 奇迹",
        description: "S10八强战陷入0:2绝境，TES顶住巨大压力连扳三局，创造世界赛正赛史上首个让二追三神迹！",
      },
    ],
    careerEcology: {
      monthlySalaryRange: "150,000元 ~ 1,000,000元",
      averageSoloRankRequirement: "韩服宗师以上，严格防作弊与假赛监管全面升级",
      streamingPlatformEra: "线上二路解说席与明星主播跨界流量爆发",
      socialAcceptance: "各省市电竞文旅与电竞城市地标政策强力扶持",
    },
  },

  2021: {
    year: 2021,
    eraId: "era_2021_edg_reignite",
    eraName: "银龙重铸·四强双败赛制与冰岛不破不立",
    historicalMilestone: "LPL季后赛四强首次引入双败争银龙杯赛制；EDG在冰岛雷克雅未克 3:2 力克DK夺得世界总冠军！",
    description: "赛制大变革！LPL春夏季后赛引入四强双败制，大幅提升含金量与容错率。11月6日冰岛雷克雅未克，EDG历经三个连续五局打满，3:2战胜卫冕冠军DK，捧起不破不立的第三座召唤师杯！",
    hasLpl: true,
    hasSecondaryLeague: true,
    secondaryLeagueName: "LDL 英雄联盟发展联赛",
    hasRelegation: false,
    regularSeasonFormat: "single_round_robin",
    playoffFormat: "double_elimination",
    worldsFormat: "group_stage_round_robin",
    lplSpringChampion: "Royal Never Give Up (RNG)",
    lplSummerChampion: "EDward Gaming (EDG)",
    msiChampion: "Royal Never Give Up (RNG - LPL)",
    worldsChampion: "EDward Gaming (EDG - LPL第三冠)",
    worldsRunnerUp: "DWG KIA (DK)",
    lplBestWorldsPlacement: "S11 全球总决赛世界总冠军 (EDG)",
    prominentTeams: ["EDward Gaming (EDG)", "Royal Never Give Up (RNG)", "FunPlus Phoenix (FPX)", "LNG Esports", "WE"],
    legendaryPlayers: ["Scout (FMVP)", "Jiejie (赵礼杰)", "Viper", "Meiko (大满贯)", "Flandre", "Wei", "GALA (五杀卡莎)", "ShowMaker"],
    epicMoments: [
      {
        title: "2021 冰岛之夜银龙重铸骑士归来",
        description: "2021年11月6日凌晨，EDG决胜局击碎DK水晶，战胜全部四支韩国强队夺冠，全国各大高校与街头沸腾！",
        quote: "银龙重铸之日，骑士归来之时！恭喜 EDG！不破不立！",
      },
      {
        title: "Meiko 加冕 LPL 首位超级大满贯",
        description: "作为建队元老，Meiko囊括春冠、夏冠、MSI、亚运会金牌、S赛总冠军，成就中国LOL唯一大满贯传奇！",
      },
    ],
    careerEcology: {
      monthlySalaryRange: "150,000元 ~ 1,200,000元 (顶级选手税前年薪逼近2000w顶薪工资帽上限)",
      averageSoloRankRequirement: "韩服宗师700点/王者段位",
      streamingPlatformEra: "联盟化薪资帽制度 (Salary Cap) 启动试点草案",
      socialAcceptance: "全网霸榜数十条微博热搜，电竞成为青年集体情绪狂欢",
    },
  },

  2022: {
    year: 2022,
    eraId: "era_2022_drx_miracle",
    eraName: "坚韧星火·RNG季中三冠与DRX最后一舞",
    historicalMilestone: "RNG线上参战夺得MSI三冠王；JDG与TES双雄争霸；S12北美总决赛Deft与DRX完成最后一舞童话",
    description: "RNG在釜山MSI克服网络延迟 3:2 击败T1创造MSI三冠王历史；JDG夏决夺冠；S12在北美，十年老将Deft率领DRX从入围赛一路爆冷击败EDG、GEN并夺冠，重塑百折不屈的电竞精神。",
    hasLpl: true,
    hasSecondaryLeague: true,
    secondaryLeagueName: "LDL 英雄联盟发展联赛",
    hasRelegation: false,
    regularSeasonFormat: "single_round_robin",
    playoffFormat: "double_elimination",
    worldsFormat: "group_stage_round_robin",
    lplSpringChampion: "Royal Never Give Up (RNG)",
    lplSummerChampion: "JD Gaming (JDG)",
    msiChampion: "Royal Never Give Up (RNG - 历史首个MSI三冠王)",
    worldsChampion: "DRX (LCK四号种子黑马奇迹)",
    worldsRunnerUp: "T1",
    lplBestWorldsPlacement: "S12 全球总决赛四强 (JDG)",
    prominentTeams: ["JD Gaming (JDG)", "Top Esports (TES)", "EDward Gaming", "RNG", "LNG Esports"],
    legendaryPlayers: ["369 (999摇骰子成熟)", "Kanavi", "Yagao (膏膏)", "Hope", "Missing", "Tian", "Knight", "Deft (十年老将夺冠)"],
    epicMoments: [
      {
        title: "RNG 釜山夺冠加冕 MSI 三冠王",
        description: "克服重重争议与35ms延迟，RNG在决胜局摧毁T1基地，夺得队史也是赛区第三座MSI奖杯！",
        quote: "山顶的微风永远吹拂着顽强的金黄色战袍！",
      },
      {
        title: "369 战神酒桶绝地反击",
        description: "被质疑摇不到9的369在夏季季后赛连续打出名场面，攻守一体统治上路，斩获常规赛一阵。",
      },
    ],
    careerEcology: {
      monthlySalaryRange: "120,000元 ~ 1,000,000元 (俱乐部推行科学理性薪资与健康体检)",
      averageSoloRankRequirement: "韩服宗师以上，严格反赌反假赛全赛季背景审查",
      streamingPlatformEra: "退役选手复盘与二路大乱斗成为主流娱乐形态",
      socialAcceptance: "电竞国家集训队常态化，杭州亚运会正选项目备战",
    },
  },

  2023: {
    year: 2023,
    eraId: "era_2023_swiss_format",
    eraName: "瑞士风暴·世界赛新赛制变革与T1四冠",
    historicalMilestone: "世界赛正式废除小组赛，全面引入瑞士轮 (3胜晋级/3败淘汰)；JDG包揽春夏冠与MSI冲击大满贯",
    description: "赛制史上最大革命！拳头正式在S13推行16队瑞士轮赛制，淘汰与晋级生死战全部采用BO3，悬念与对抗性拉满！JDG银河战舰横扫春夏与MSI，但在半决赛遭遇Faker率领的T1阻击，T1最终首尔捧起第四冠。",
    hasLpl: true,
    hasSecondaryLeague: true,
    secondaryLeagueName: "LDL 英雄联盟发展联赛",
    hasRelegation: false,
    regularSeasonFormat: "single_round_robin",
    playoffFormat: "double_elimination",
    worldsFormat: "swiss_system",
    lplSpringChampion: "JD Gaming (JDG)",
    lplSummerChampion: "JD Gaming (JDG)",
    msiChampion: "JD Gaming (JDG - LPL包揽冠亚)",
    worldsChampion: "T1 (Faker 第四冠)",
    worldsRunnerUp: "Weibo Gaming (WBG 苏州微博)",
    lplBestWorldsPlacement: "S13 全球总决赛亚军 (WBG)",
    prominentTeams: ["JD Gaming (JDG)", "Bilibili Gaming (BLG)", "Weibo Gaming (WBG)", "LNG Esports"],
    legendaryPlayers: ["Ruler", "Knight", "Kanavi", "Missing", "369", "Bin", "Xun", "Yagao", "Elk", "ON", "TheShy (S13进决赛)", "Faker"],
    epicMoments: [
      {
        title: "瑞士轮赛制首秀高能对决",
        description: "16支豪强在3胜晋级3败出局的瑞士轮规则下每轮重新抽签，KT经历五轮地狱签表，WBG两度濒死晋级八强！",
        quote: "瑞士轮让每一场比赛都是真正的悬崖边生死决斗！",
      },
      {
        title: "WBG 与 TheShy 半决赛重返巅峰",
        description: "面对宿敌BLG，TheShy操刀兰博与奎桑提大发神威，率领WBG以3:2爆冷挺进高尺巨蛋世界赛总决赛！",
      },
    ],
    careerEcology: {
      monthlySalaryRange: "100,000元 ~ 800,000元",
      averageSoloRankRequirement: "韩服王者/超级服高胜率前列",
      streamingPlatformEra: "二路解说团（德云色、Doinb庄园、大主播大乱斗）热度超越官方主直播间",
      socialAcceptance: "杭州第19届亚运会电子竞技英雄联盟项目正式打响，中国队斩获铜牌",
    },
  },

  2024: {
    year: 2024,
    eraId: "era_2024_fearless_draft",
    eraName: "全局革新·无畏征召与新生力量崛起",
    historicalMilestone: "LPL引入登峰组与涅槃组及全局BP (Fearless Draft) 试验；BLG全华班春季赛夺冠崛起",
    description: "针对观众英雄审美疲劳，联赛启动全局BP赛制改革；BLG全华班统治春季赛并在MSI打入决赛；TES等年轻一代持续冲击世界最高舞台。",
    hasLpl: true,
    hasSecondaryLeague: true,
    secondaryLeagueName: "LDL 英雄联盟发展联赛",
    hasRelegation: false,
    regularSeasonFormat: "single_round_robin",
    playoffFormat: "double_elimination",
    worldsFormat: "swiss_system",
    lplSpringChampion: "Bilibili Gaming (BLG)",
    lplSummerChampion: "Bilibili Gaming (BLG)",
    msiChampion: "Gen.G (韩国)",
    worldsChampion: "T1 (Faker 第五冠)",
    worldsRunnerUp: "Bilibili Gaming (BLG)",
    lplBestWorldsPlacement: "S14 全球总决赛亚军 (BLG全华班打满五局)",
    prominentTeams: ["Bilibili Gaming (BLG)", "Top Esports (TES)", "JD Gaming", "Weibo Gaming", "LNG Esports"],
    legendaryPlayers: ["Bin", "Xun / Wei", "Knight", "Elk", "ON", "Tian", "JackeyLove", "Creme", "GALA", "Scout"],
    epicMoments: [
      {
        title: "BLG 全华班鏖战世界之巅",
        description: "时隔十一年，全华班BLG再度杀入S赛总决赛与T1鏖战至决胜局，重现巅峰对抗艺术。",
        quote: "年轻一代的利刃已经出鞘，我们的故事永远未完待续！",
      },
      {
        title: "全局BP (Fearless) 解锁百花齐放英雄池",
        description: "次级联赛与杯赛率先试点用过的英雄不能再选，对选手英雄池深度提出史上最高严酷考验！",
      },
    ],
    careerEcology: {
      monthlySalaryRange: "80,000元 ~ 700,000元 (更注重队伍薪资平衡与青训自给自足)",
      averageSoloRankRequirement: "国服峡谷之巅+韩服宗师双重考核",
      streamingPlatformEra: "短视频平台与高能击杀集锦占据碎片化传播主流",
      socialAcceptance: "成熟体育竞技产业形态，运动生理康复师与心理辅导成标配",
    },
  },
};

/**
 * 历史知名俱乐部数据库 (对齐真实历史)
 */
export const HISTORICAL_TEAMS_DATABASE: HistoricalTeamInfo[] = [
  {
    teamId: "we",
    shortName: "WE",
    fullName: "Team WE (西安曲江)",
    foundedYear: 2011,
    isActiveNow: true,
    legacyTitle: "IPL5 世界冠军、首代国家德比、60亿辉煌",
    signatureChampions: ["卡牌大师", "法外狂徒", "酒桶", "蒸汽机器人"],
    signaturePlayers: ["若风", "微笑", "草莓", "卷毛", "Clearlove", "957", "Xiye", "Mystic"],
  },
  {
    teamId: "ig",
    shortName: "iG",
    fullName: "Invictus Gaming",
    foundedYear: 2011,
    isActiveNow: true,
    legacyTitle: "S8 全球总冠军、翻山之战、金色的雨",
    signatureChampions: ["暗裔剑魔", "诡术妖姬", "卡莎", "青钢影", "盲僧"],
    signaturePlayers: ["PDD", "姿态", "笑笑", "Rookie", "TheShy", "JackeyLove", "Ning", "Baolan"],
  },
  {
    teamId: "omg",
    shortName: "OMG",
    fullName: "Oh My God (黑暗势力)",
    foundedYear: 2012,
    isActiveNow: true,
    legacyTitle: "首届 LPL 春季赛冠军、50血绝地逆转、3:0零封白盾",
    signatureChampions: ["荒漠屠夫", "暗黑元首", "盲僧", "深渊巨口"],
    signaturePlayers: ["Gogoing", "Cool", "Lovelin", "San", "Smlz", "Creme", "Aki"],
  },
  {
    teamId: "rng",
    shortName: "RNG",
    fullName: "Royal Never Give Up (皇族)",
    foundedYear: 2012,
    isActiveNow: true,
    legacyTitle: "S3/S4世界亚军、三届MSI冠军(2018/2021/2022)、金黄皇族王朝",
    signatureChampions: ["暗夜猎手", "虚空之女", "狂暴之心", "盲僧", "机械公敌"],
    signaturePlayers: ["Uzi", "InSec", "Zero", "Mlxg", "Xiaohu", "Ming", "Letme", "GALA", "Wei"],
  },
  {
    teamId: "edg",
    shortName: "EDG",
    fullName: "EDward Gaming (广州EDG)",
    foundedYear: 2013,
    isActiveNow: true,
    legacyTitle: "六冠王霸主、首届MSI冠军(2015)、S11全球总冠军(不破不立)",
    signatureChampions: ["痛苦之拥", "诡术妖姬", "探险家", "盲僧", "佐伊", "男枪"],
    signaturePlayers: ["Clearlove", "Pawn", "Deft", "Meiko", "Koro1", "Scout", "Viper", "Jiejie", "Flandre"],
  },
  {
    teamId: "fpx",
    shortName: "FPX",
    fullName: "FunPlus Phoenix",
    foundedYear: 2017,
    isActiveNow: true,
    legacyTitle: "S9 全球总冠军、凤凰浴火涅槃巴黎",
    signatureChampions: ["深海泰坦", "盲僧", "正义巨像", "圣枪游侠", "海洋之灾"],
    signaturePlayers: ["Doinb", "Tian", "Lwx", "Crisp", "GimGoon"],
  },
  {
    teamId: "tes",
    shortName: "TES",
    fullName: "Top Esports",
    foundedYear: 2017,
    isActiveNow: true,
    legacyTitle: "2020夏冠、MSC季中杯冠军、全华班顶尖战力",
    signatureChampions: ["辛德拉", "德莱文", "虚空之女", "盲僧", "阿卡丽"],
    signaturePlayers: ["Knight", "JackeyLove", "Karsa", "369", "Tian", "Meiko", "Creme"],
  },
  {
    teamId: "jdg",
    shortName: "JDG",
    fullName: "JD Gaming (北京京东)",
    foundedYear: 2017,
    isActiveNow: true,
    legacyTitle: "LPL四冠王、2023 MSI冠军、金元银河战舰",
    signatureChampions: ["酒桶", "北地之怒", "狐狸", "残月之肃", "机械先驱"],
    signaturePlayers: ["Kanavi", "Yagao", "Knight", "Ruler", "Missing", "369", "Flandre"],
  },
  {
    teamId: "blg",
    shortName: "BLG",
    fullName: "Bilibili Gaming",
    foundedYear: 2017,
    isActiveNow: true,
    legacyTitle: "2024 LPL春夏双冠、S14世界亚军、新时代的信念",
    signatureChampions: ["武器大师", "千珏", "岩雀", "惩戒之箭", "洛", "兰博"],
    signaturePlayers: ["Bin", "Xun", "Wei", "Knight", "Elk", "ON", "Yagao"],
  },
  {
    teamId: "wbg",
    shortName: "WBG",
    fullName: "Weibo Gaming (苏州微博 / 前身SN)",
    foundedYear: 2021,
    isActiveNow: true,
    legacyTitle: "S10世界亚军(SN时期)、S13世界亚军(奇迹黑马闯入高尺巨蛋)",
    signatureChampions: ["无双剑姬", "迷失之牙", "机械公敌", "残月之肃"],
    signaturePlayers: ["TheShy", "Bin", "SofM", "Angel", "Huanfeng", "Xiaohu", "Light", "Crisp"],
  },
];

/**
 * 获取指定历史年份的赛季配置与背景信息
 */
export function getHistoricalSeason(year: number): HistoricalSeasonChronicle {
  const targetYear = Math.max(2011, Math.min(2024, year)) as LolSeasonYear;
  return LOL_HISTORICAL_CHRONICLES[targetYear];
}

/**
 * 判断指定年份的赛制规则
 */
export function getSeasonRules(year: number) {
  const chronicle = getHistoricalSeason(year);
  return {
    year: chronicle.year,
    hasLpl: chronicle.hasLpl,
    hasSecondaryLeague: chronicle.hasSecondaryLeague,
    secondaryLeagueName: chronicle.secondaryLeagueName,
    hasRelegation: chronicle.hasRelegation,
    regularSeasonFormat: chronicle.regularSeasonFormat,
    playoffFormat: chronicle.playoffFormat,
    worldsFormat: chronicle.worldsFormat,
  };
}
