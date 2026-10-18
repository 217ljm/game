/**
 * 电竞职业生涯全阶段大事件与老物件资产注册表
 * Esports Career Narrative & Vintage Assets Catalog
 * 
 * 覆盖阶段：
 * 1. 【高分路人期】(15~16岁)：峡谷之巅登顶、家庭谈话与一年之约
 * 2. 【青训试训期】(16~17岁)：俱乐部基地Solo一线明星、青训90%淘汰率魔鬼加练
 * 3. 【次级发展联赛 LDL/进化者】(17~18岁)：大巴车颠簸赶场、逆风决胜局抢大龙翻盘与一队调令
 * 4. 【顶级职业联赛 LPL/VCT CN】(18~22岁)：首次登上万人主舞台手抖、BO5战歌起生死局、网络舆论抗压调整
 * 5. 【全球总决赛巅峰】(20~24岁)：异国征战倒时差、决战世界之巅天神下凡五杀绝杀、漫天金色的雨与捧起召唤师杯
 * 6. 【老将转型期】(24~30岁)：手伤理疗抉择、退役告别演说、转型金牌教练/百万主播/自创俱乐部
 */

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
  category: "milestone" | "general" | "emergent" | "accident" | "historical";
  minAge: number;
  maxAge: number;
  weight?: number;
  title: string;
  icon: string;
  narrative: string;
  options: EventOption[];
}

// =========================================================================
// 1. 电竞生涯专属老物件资产库 (Vintage Assets Catalog)
// =========================================================================
export const ESPORTS_VINTAGE_ASSETS: Record<string, VintageAsset> = {
  // 阶段 1：高分路人期
  vintage_esports_canyon_rank1_screenshot: {
    id: "vintage_esports_canyon_rank1_screenshot",
    name: "《峡谷之巅登顶第一截图与泛黄网吧会员卡》",
    icon: "💻",
    category: "commemoration",
    yearAcquired: 2012,
    description: "网吧通宵三天三夜打出的登顶历史定格！网吧老板亲自加免单网费并赠送定制VIP金卡，右下角弹出一封红标官方星探私信。",
    bonusText: "智力 +12 · 微操天资 +15 · 开启【电竞传奇】天资",
  },
  vintage_esports_family_pact_letter: {
    id: "vintage_esports_family_pact_letter",
    name: "《红木茶几上的“一年之约”亲笔协议书》",
    icon: "📜",
    category: "commemoration",
    yearAcquired: 2012,
    description: "客厅暖黄台灯下与父母彻夜长谈立下的生死契约：“若一年打不上职业一队，自愿回校复读”。纸面残留着母亲欣慰而担心的泪痕。",
    bonusText: "亲情 +15 · 心理抗压 +10 · 坚韧意志 +15",
  },

  // 阶段 2：青训试训期
  vintage_esports_youth_admission_letter: {
    id: "vintage_esports_youth_admission_letter",
    name: "《俱乐部青训营录取确认函与专属门禁卡》",
    icon: "🪪",
    category: "commemoration",
    yearAcquired: 2013,
    description: "在数百位高分天才少年试训赛中脱颖而出的红色聘书，附带一张印有俱乐部暗纹的电子门禁卡，踏入电竞豪门基地的大门。",
    bonusText: "魅力 +12 · 智力 +8 · 赛训纪律 +10",
  },
  vintage_esports_worn_mechanical_keyboard: {
    id: "vintage_esports_worn_mechanical_keyboard",
    name: "《空格键磨光的青轴机械键盘与肌内效贴布》",
    icon: "⌨️",
    category: "appliance",
    yearAcquired: 2013,
    description: "青训淘汰率90%残酷高压下日均加练16小时的贴身武器，QWER键帽漆面已磨损，腕部贴着缓解酸胀的医用肌内效胶布。",
    bonusText: "手速微操 +20 · 坚毅意志 +15 · 竞技专注",
  },

  // 阶段 3：次级发展联赛 LDL/进化者
  vintage_esports_subleague_pass_badge: {
    id: "vintage_esports_subleague_pass_badge",
    name: "《LDL次级联赛选手挂牌证与皱巴巴的大巴车票》",
    icon: "🚌",
    category: "commemoration",
    yearAcquired: 2014,
    description: "颠簸于城际长途大巴、穿梭于中小型场馆的艰苦岁月见证。选手证边缘磨白，背面贴着全队在路边摊吃牛肉泡面的合影大头贴。",
    bonusText: "团队协作 +15 · 抗压适应 +12 · 磨砺初心",
  },
  vintage_esports_first_team_promotion_contract: {
    id: "vintage_esports_first_team_promotion_contract",
    name: "《俱乐部一队升阶聘用合同与官方调令》",
    icon: "📑",
    category: "commemoration",
    yearAcquired: 2015,
    description: "次级联赛决胜局落后一万经济极限抢大龙四杀翻盘后，一队功勋教头深夜亲自赶往更衣室双手递上的升阶调令与正式选手合同！",
    bonusText: "身价暴涨 · 魅力 +20 · 晋升一队主力",
  },

  // 阶段 4：顶级职业联赛 LPL/VCT CN
  vintage_esports_lpl_custom_jersey: {
    id: "vintage_esports_lpl_custom_jersey",
    name: "《印有专属ID的顶级联赛初登场定制刺绣战袍》",
    icon: "🎽",
    category: "clothing",
    yearAcquired: 2016,
    description: "首次登上万人体育馆顶级职业联赛主舞台所穿的队服，背部金线刺绣着你伴随一生的选手ID，领口带有联盟官方芯片防伪标签。",
    bonusText: "魅力 +25 · 名气声望 +30 · 职业巨星气场",
  },
  vintage_esports_silver_dragon_medal: {
    id: "vintage_esports_silver_dragon_medal",
    name: "《顶级联赛银龙杯春季赛总冠军纯银纪念奖章》",
    icon: "🥈",
    category: "commemoration",
    yearAcquired: 2017,
    description: "BO5生死局打满第五局《战歌起》逆境封神后斩获的联赛最高荣誉！正面铸有游龙戏珠立体浮雕，背面刻有“春季赛总冠军”铭文。",
    bonusText: "名气声望 +40 · 奖金丰厚 · 联赛霸主图腾",
  },
  vintage_esports_noise_cancelling_headset: {
    id: "vintage_esports_noise_cancelling_headset",
    name: "《贴满粉丝鼓励便签纸的比赛专用隔音耳机》",
    icon: "🎧",
    category: "appliance",
    yearAcquired: 2017,
    description: "联赛主舞台隔绝万名观众呐喊的专业航空级隔音耳机，外壳上贴着在网络舆论低谷期粉丝亲手手写的暖心便签：“无论顺境逆境，我们一直都在”。",
    bonusText: "心态大心脏 +25 · 粉丝亲和 +20 · 舆论抗体",
  },

  // 阶段 5：全球总决赛巅峰
  vintage_esports_worlds_flight_and_ticket: {
    id: "vintage_esports_worlds_flight_and_ticket",
    name: "《出征世界赛红眼航班登机牌与全球总决赛内场门票》",
    icon: "🎫",
    category: "commemoration",
    yearAcquired: 2018,
    description: "跨国征战全球总决赛的珍贵头等舱票根与内场VIP通行工作证，上面盖着世界电竞联合会金印，见证了漂洋过海为国争光的壮丽征途。",
    bonusText: "国际声望 +35 · 战术大局观 +18 · 历史见证",
  },
  vintage_esports_world_champion_fmvp_trophy: {
    id: "vintage_esports_world_champion_fmvp_trophy",
    name: "《全球总决赛FMVP金光奖杯与纯金冠军戒指》",
    icon: "💍",
    category: "commemoration",
    yearAcquired: 2018,
    description: "世界之巅决胜局天神下凡极限五杀封神获得的至高王冠！重达3.5公斤的镀金FMVP奖杯与镶嵌真钻的专属冠军戒指，镌刻着属于你的传奇纪元！",
    bonusText: "世界之巅 · 魅力 +50 · 快乐 +30 · 载入世界名人堂",
  },
  vintage_esports_golden_rain_confetti: {
    id: "vintage_esports_golden_rain_confetti",
    name: "《总决赛现场落下的冠军金色雨亮片与选手通行卡》",
    icon: "✨",
    category: "commemoration",
    yearAcquired: 2018,
    description: "捧起奖杯那一刻漫天飞扬落入怀中的金色铝箔亮片，被小心封存在特制水晶塑封袋中。只要看到它，耳畔就会再次响起数万人同呼冠军的狂欢浪潮。",
    bonusText: "快乐 +40 · 一生无悔 · 传世终极记忆",
  },

  // 阶段 6：老将转型期
  vintage_esports_medical_wrist_guard: {
    id: "vintage_esports_medical_wrist_guard",
    name: "《知名运动医学专家特制的远红外理疗护腕》",
    icon: "🧤",
    category: "clothing",
    yearAcquired: 2021,
    description: "长期超高强度APM操作导致腱鞘炎与神经水肿后，国家级康复医学导师量身定制的医用加压护腕，见证了老将与岁月伤痛抗争的铁血风骨。",
    bonusText: "健康恢复 +20 · 意志如铁 +20 · 老将风范",
  },
  vintage_esports_retired_framed_jersey: {
    id: "vintage_esports_retired_framed_jersey",
    name: "《实木玻璃相框装裱的退役签名战袍纪念框》",
    icon: "🖼️",
    category: "commemoration",
    yearAcquired: 2022,
    description: "退役谢幕仪式上俱乐部永久退役的战衣，相框底部黄铜铭牌上铭刻着你的总击杀数、胜场率与所有世界冠军荣誉，受万人瞻仰。",
    bonusText: "传奇功勋 · 永久声望 +50 · 行业宗师地位",
  },
  vintage_esports_club_founder_crystal_plaque: {
    id: "vintage_esports_club_founder_crystal_plaque",
    name: "《电子竞技俱乐部创始人水晶纪念牌匾与教鞭》",
    icon: "🏆",
    category: "commemoration",
    yearAcquired: 2023,
    description: "转型金牌主教练与俱乐部创始人后由官方联盟颁发的终身荣誉水晶牌匾，象征着从台前热血战神升华为主宰赛场的电竞教父与商界领袖！",
    bonusText: "商业资本 +60 · 威望绝伦 · 电竞帝国奠基人",
  },
};

// =========================================================================
// 2. 电竞生涯各阶段大事件与高光抉择库 (Esports Life Events Catalog)
// =========================================================================
export const ESPORTS_LIFE_EVENTS: LifeEventDefinition[] = [
  // =========================================================================
  // 【阶段一：高分路人期】(15~16岁)
  // =========================================================================
  {
    id: "esports_canyon_rank1_scout",
    category: "milestone",
    minAge: 15,
    maxAge: 16,
    weight: 10,
    title: "🎮 峡谷之巅登顶与星探私信",
    icon: "💻",
    narrative: "凌晨四点的黑网吧里，随着敌方水晶枢纽轰然碎裂，你的屏幕上亮起灿烂的金光——【恭喜位列峡谷之巅排行榜第 1 名】！整间网吧的夜猫子围观惊呼，电脑右下角悄然闪动着一封带有认证V标的职业俱乐部星探私信……",
    options: [
      {
        label: "果断回复添加微信，发送实战第一视角录像",
        hint: "逐梦职业 · 抓住时代风口",
        resultDesc: "你毫不犹豫回复了私信，发送了自己近期的神级集锦。星探秒回：“天赋极其罕见！俱乐部愿报销往返机票，请速来上海试训！”",
        effect: {
          intelligence: 6,
          charm: 8,
          happiness: 12,
          unlockAssetId: "vintage_esports_canyon_rank1_screenshot",
        },
      },
      {
        label: "保持戒备核实资质，在直播间当众连麦确认",
        hint: "沉稳机警 · 树立路人王名号",
        resultDesc: "你查验了俱乐部的官方对公认证与星探工作证，在个人高分直播间当众连麦确认无误。不仅规避了骗局，更瞬间涨粉三万，引爆全网电竞贴吧热议！",
        effect: {
          intelligence: 10,
          charm: 10,
          cash: 3000,
          unlockAssetId: "vintage_esports_canyon_rank1_screenshot",
        },
      },
      {
        label: "将登顶截图永久保存，把精力聚焦在学业与生活",
        hint: "理性克制 · 兼顾人生多线",
        resultDesc: "你礼貌婉拒了立即试训的邀请，将登顶截图打印塑封压在书桌玻璃下，作为青春最炽热的纪念，决定先完成当季学业再做打算。",
        effect: {
          intelligence: 8,
          happiness: 6,
          unlockAssetId: "vintage_esports_canyon_rank1_screenshot",
        },
      },
    ],
  },
  {
    id: "esports_family_pact_talk",
    category: "general",
    minAge: 15,
    maxAge: 16,
    weight: 9,
    title: "👨‍👩‍👦 “打游戏能当饭吃？”的深夜家庭长谈",
    icon: "📜",
    narrative: "当你把俱乐部试训邀请函摆在客厅茶几上时，原本安静的家陷入了沉寂。父亲眉头紧锁、烟灰缸里落满了烟蒂：“我和你妈辛辛苦苦供你读书，你去打游戏能当饭吃？以后吃青春饭老了怎么办？”母亲眼眶泛红握着你的手……",
    options: [
      {
        label: "立下“一年之约”亲笔协议：不成功自愿回校复读！",
        hint: "破釜沉舟 · 用骨气打动家人",
        resultDesc: "你在红木茶几前研墨挥毫，亲笔写下军令状：“给我一年时间！若打不进职业一队拿正规薪资，我毫无怨言回校备战高考！”父母看着你眼中的炽烈目光，长叹一声郑重签字支持！",
        effect: {
          charm: 8,
          happiness: 8,
          affinityTarget: "father",
          affinityDelta: 15,
          unlockAssetId: "vintage_esports_family_pact_letter",
        },
      },
      {
        label: "条分缕析出示正规合同、国家体育总局批文与五险一金",
        hint: "理性沟通 · 以时代事实解惑",
        resultDesc: "你耐心地向父母展示国家体育总局将电竞列为正式体育项目的红头文件，并拿出俱乐部包食宿、专业体能康复与正规劳动合同法条款。父母终于放下心中偏见，由衷为你感到自豪！",
        effect: {
          intelligence: 12,
          happiness: 10,
          affinityTarget: "mother",
          affinityDelta: 18,
          unlockAssetId: "vintage_esports_family_pact_letter",
        },
      },
    ],
  },

  // =========================================================================
  // 【阶段二：青训试训期】(16~17岁)
  // =========================================================================
  {
    id: "esports_youth_first_solo",
    category: "milestone",
    minAge: 16,
    maxAge: 17,
    weight: 10,
    title: "⚡ 踏入基地与一线首发主力 Solo 对决",
    icon: "🪪",
    narrative: "第一次踏入豪华的俱乐部独栋别墅基地，墙上挂满了历届冠军奖杯与明星巨幅海报。主教练双手抱胸走到你面前：“想留下来？进训练室，跟我们一队现役全明星中单/射手打一场 BO3 Solo，只看对线基本功！”全基地数十名青训生与助教迅速围了上来……",
    options: [
      {
        label: "亮出压箱底招牌刺客，极限闪现换血完成对线单杀！",
        hint: "锋芒毕露 · 技惊四座",
        resultDesc: "在第三局决胜盲选中，你果断选出招牌绝活！凭借0.1秒的极限手速预判闪现躲过首发选手的致命技能，反手打出光速连招拿下单杀！全场起立惊呼，主教练当场拍板：“录取！给一队二号种子待遇！”",
        effect: {
          charm: 15,
          happiness: 15,
          cash: 5000,
          unlockAssetId: "vintage_esports_youth_admission_letter",
        },
      },
      {
        label: "祭出沉稳兵线控制，以教科书式微操控线磨死对手",
        hint: "大局运筹 · 尽显大将之风",
        resultDesc: "你没有盲目拼操作，而是展现出极其罕见的兵线理解。卡死回推线、严密计算经验与补刀差，一点点蚕食对手血量。老将首发由衷称赞：“这小子的基本功和纪律性太恐怖了，比很多老职业还要老道！”",
        effect: {
          intelligence: 15,
          charm: 10,
          unlockAssetId: "vintage_esports_youth_admission_letter",
        },
      },
      {
        label: "赛后主动向明星前辈躬身请教细节，并整理万字复盘笔记",
        hint: "虚怀若谷 · 薪火相传",
        resultDesc: "你以谦逊姿态与首发选手打满三局，赛后主动带着笔记本向其虚心请教对线换血细节。不仅赢得全队教练组极高评价，更获得了明星选手的亲自指导与青睐！",
        effect: {
          intelligence: 12,
          charm: 12,
          happiness: 10,
          unlockAssetId: "vintage_esports_youth_admission_letter",
        },
      },
    ],
  },
  {
    id: "esports_youth_pressure_grind",
    category: "general",
    minAge: 16,
    maxAge: 17,
    weight: 8,
    title: "⏳ 青训90%淘汰率的残酷高压与通宵加练",
    icon: "⌨️",
    narrative: "青训基地的残酷远超想象，每周公布的KDA与胜率考核榜单末位直接解约劝退，淘汰率高达惊人的90%！身边的室友一个接一个拉着行李箱哭着离开。凌晨两点，基地大厅大部分电脑已经熄灭，你的手腕隐隐发酸，但距离本月升降级考核只剩下三天……",
    options: [
      {
        label: "开启魔鬼加练模式：日均训练16小时、手搓两百盘！",
        hint: "钢铁意志 · 卷王之王",
        resultDesc: "你手腕缠上医用肌内效胶布，狂饮冰美式通宵达旦地训练！凭借超越常人的执着与数千盘高强度肌肉记忆，你在月底考核中斩获青训营断层第一，获得直接提拔名额！",
        effect: {
          health: -6,
          intelligence: 8,
          charm: 10,
          happiness: 8,
          unlockAssetId: "vintage_esports_worn_mechanical_keyboard",
        },
      },
      {
        label: "科学赛训结合：每打三局花一小时逐帧精读对手录像",
        hint: "智勇双全 · 提高赛训转化率",
        resultDesc: "你拒绝盲目机械刷局数，而是建立个人专属战术笔记本，逐帧记录次级联赛对手插眼习惯与对线心理。教练组在考核复盘会上公开表扬：“这是最懂用脑子打比赛的天才！”",
        effect: {
          intelligence: 16,
          charm: 8,
          happiness: 10,
          unlockAssetId: "vintage_esports_worn_mechanical_keyboard",
        },
      },
    ],
  },

  // =========================================================================
  // 【阶段三：次级发展联赛 LDL/进化者】(17~18岁)
  // =========================================================================
  {
    id: "esports_subleague_bus_travel",
    category: "general",
    minAge: 17,
    maxAge: 18,
    weight: 8,
    title: "🚌 大巴车颠簸赶场与次级联赛市井记忆",
    icon: "🚌",
    narrative: "升入二队征战次级发展联赛（LDL/进化者杯），没有豪华专车与头等舱，全队每周挤在颠簸的长途客运大巴上辗转各个三四线城市的小场馆。路途颠簸八小时，大家靠着座椅打盹，到了县城快捷酒店已经是深夜，大家围在茶几边分食热腾腾的泡面与卤蛋……",
    options: [
      {
        label: "在颠簸车厢里用暖手宝焐热双手，紧抓时间闭目调养状态",
        hint: "职业素养 · 克服恶劣环境",
        resultDesc: "你没有抱怨旅途劳顿，而是严守作息，用便携暖手宝保持神经末梢温度。到了赛场你精神饱满、反应敏捷，在简陋的舞台上砍下完美战绩零封对手！",
        effect: {
          health: 5,
          intelligence: 6,
          charm: 8,
          unlockAssetId: "vintage_esports_subleague_pass_badge",
        },
      },
      {
        label: "深夜与队友围坐吃泡面分卤蛋，畅想未来登上大舞台的豪情",
        hint: "兄弟同心 · 铸就草根团魂",
        resultDesc: "大伙吸溜着红烧牛肉面，指着手机上顶级联赛的万人场馆发誓：“总有一天，我们要一起杀进LPL，在满场金色的雨下举杯！”深厚的草根团魂让你们在赛场上配合如同一人！",
        effect: {
          charm: 12,
          happiness: 15,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 20,
          unlockAssetId: "vintage_esports_subleague_pass_badge",
        },
      },
    ],
  },
  {
    id: "esports_subleague_stealing_baron_turnaround",
    category: "milestone",
    minAge: 17,
    maxAge: 18,
    weight: 10,
    title: "🐲 决胜局落后万金盲视野抢大龙逆风翻盘！",
    icon: "📑",
    narrative: "LDL春季赛总决赛决胜局，队伍陷入绝境：三路外塔全破，经济落后整整一万二，敌方正全员围殴大龙纳什男爵！一旦大龙被拿，基地必破无疑。全场解说都在叹息“翻盘已无可能”，而你悄悄卡住视野盲区，手指已悬停在惩戒与闪现键上……",
    options: [
      {
        label: "盲视野闪现进龙坑极限拼惩，接大招瞬间秒杀龙坑四人！",
        hint: "绝境孤勇 · 天神降临",
        resultDesc: "大龙血量跳到890的刹那，你孤身闪现突入坑底！惩戒精准斩获纳什男爵！借着大龙Buff和爆发伤害，你在龙坑砍下四杀绝境翻盘！赛后一队主教练亲自冲入休息室紧紧握住你的手：“收拾行囊，明天正式升入一队！”",
        effect: {
          charm: 25,
          happiness: 25,
          cash: 20000,
          unlockAssetId: "vintage_esports_first_team_promotion_contract",
        },
      },
      {
        label: "灵性指挥四一分推换基地，声东击西偷爆水晶！",
        hint: "鬼才指挥 · 智取敌寇",
        resultDesc: "你敏锐捕捉到对手全员扑向大龙的破绽，果断下令大部队拖延阻拦，自己单人携带传送偷入敌方高地！在全场观众不可思议的惊呼中，你先一步拆碎敌方水晶枢纽！一队赛训总监起立鼓掌：“顶级的大局战术官，立即升入一队首发！”",
        effect: {
          intelligence: 20,
          charm: 20,
          cash: 18000,
          unlockAssetId: "vintage_esports_first_team_promotion_contract",
        },
      },
    ],
  },

  // =========================================================================
  // 【阶段四：顶级职业联赛 LPL/VCT CN】(18~22岁)
  // =========================================================================
  {
    id: "esports_lpl_debut_stage_fright",
    category: "milestone",
    minAge: 18,
    maxAge: 20,
    weight: 10,
    title: "🏟️ 首次登上顶级联赛主舞台万人欢呼手抖",
    icon: "🎽",
    narrative: "顶级职业联赛春季揭幕战！这是你第一次走出昏暗的二队小场馆，踏入容纳上万人的顶级电竞体育馆。强烈的聚光灯打在脸上，环形大屏投映着你的特写，山呼海啸般的呐喊声震得耳膜发颤。坐在电竞椅上调试鼠标时，你惊讶地发现自己的右手竟在微微发抖……",
    options: [
      {
        label: "双手紧握保温杯深吸一口气，戴紧降噪耳机自我催眠平复心跳",
        hint: "大心脏调适 · 顶住顶级舞台气场",
        resultDesc: "你喝下一口温热的菊花茶，戴上专业隔音耳机把外界杂音降到最低，在心底默念：“这就是我做梦都想站上的舞台！”进入游戏后你的双手彻底化作冷静的仪器，首秀即斩获超神MVP，全场高呼你的专属ID！",
        effect: {
          charm: 20,
          happiness: 18,
          cash: 15000,
          unlockAssetId: "vintage_esports_lpl_custom_jersey",
        },
      },
      {
        label: "主动与队友说俏皮话热场，用激进对攻打法彻底宣泄紧张",
        hint: "反客为主 · 释放狂野进攻本能",
        resultDesc: "“兄弟们，今天万人馆是来见证我们起飞的！”你的一句玩笑逗笑全队。比赛一开始，你打法极其凶悍，2级果断闪现开团打破僵局，以雷霆万钧之势带领全队横扫强敌！",
        effect: {
          charm: 22,
          happiness: 20,
          cash: 20000,
          unlockAssetId: "vintage_esports_lpl_custom_jersey",
        },
      },
    ],
  },
  {
    id: "esports_lpl_battle_hymn_bo5",
    category: "milestone",
    minAge: 19,
    maxAge: 21,
    weight: 10,
    title: "⚔️ BO5生死局打满第五局《战歌起》！",
    icon: "🥈",
    narrative: "联赛春季赛总决赛！鏖战近五个小时，双方战至 2:2 平！全场灯光骤然变为炽烈火红，激昂雄浑的官方 Silver Scrapes《战歌》在整座场馆轰然奏响！成千上万名观众起立鼓掌挥舞荧光棒！这是职业选手一生难遇的宿命之决，赢者捧起银龙杯，输者饮恨退场……",
    options: [
      {
        label: "主动向教练申请锁下版本冷门但信仰满级的本命单核英雄！",
        hint: "信仰之选 · 敢于担当历史责任",
        resultDesc: "“教练，第五局交给我，给我拿本命英雄，输了我一力承担！”伴随着观众狂热的呐喊，你秒锁信仰！决胜局你如入无人之境，砍下全场最高输出率，带领队伍捧起象征联赛最高荣耀的银龙杯！",
        effect: {
          charm: 30,
          happiness: 25,
          cash: 80000,
          unlockAssetId: "vintage_esports_silver_dragon_medal",
        },
      },
      {
        label: "在BP阶段主动拥抱安抚心态濒临失衡的新人队友，稳住全队军心",
        hint: "团队领袖 · 凝聚至高团魂",
        resultDesc: "你起身拍了拍身边射手和打野的肩膀：“别怕失误，还有我顶在前面，放开打！”你的从容让全队重焕生机。第五局全队打出教科书般完美团战，以绝对战术执行力问鼎冠军！",
        effect: {
          intelligence: 20,
          charm: 28,
          cash: 80000,
          unlockAssetId: "vintage_esports_silver_dragon_medal",
        },
      },
    ],
  },
  {
    id: "esports_public_opinion_crisis",
    category: "general",
    minAge: 19,
    maxAge: 22,
    weight: 8,
    title: "🌪️ 面对网络舆论风暴与恶评抗压调整",
    icon: "🎧",
    narrative: "在一次关键常规赛对决中，因一次走位失误导致队伍被翻盘。赛后各大社交媒体、贴吧与战队官博瞬间沦陷，几万条尖酸刻薄的嘲讽与人身攻击如潮水般涌入私信，“退役吧”、“演员”等字眼触目惊心。年轻的领队担心你心态崩溃，特意守在训练室门口……",
    options: [
      {
        label: "彻底卸载社交软件关闭私信，闭关基地一天苦练18把用战绩说话！",
        hint: "专注纯粹 · 成绩是最好的回击",
        resultDesc: "你没有发表一句辩解，果断清空手机社交软件，通宵达旦钻研那场失误的每一帧录像。在随后的焦点大战中，你连续斩获两局对位MVP带队全胜，曾经的质疑者纷纷改口尊称“战神归来”！",
        effect: {
          intelligence: 10,
          charm: 15,
          happiness: 10,
          unlockAssetId: "vintage_esports_noise_cancelling_headset",
        },
      },
      {
        label: "在俱乐部心理导师开导下坦然面对，开直播坦率承认失误复盘",
        hint: "成熟豁达 · 赢得天下人心",
        resultDesc: "你没有逃避，而是在俱乐部批准下开启直播，坦率面对镜头拆解自己的失误：“打得不好就是不好，挨打要立正，但我绝不会放弃。”这种坦荡大气的格局征服了全网路人，甚至黑粉都被圈粉成铁粉！",
        effect: {
          intelligence: 12,
          charm: 22,
          happiness: 12,
          cash: 15000,
          unlockAssetId: "vintage_esports_noise_cancelling_headset",
        },
      },
    ],
  },

  // =========================================================================
  // 【阶段五：全球总决赛巅峰】(20~24岁)
  // =========================================================================
  {
    id: "esports_worlds_jet_lag_expedition",
    category: "general",
    minAge: 20,
    maxAge: 23,
    weight: 8,
    title: "✈️ 异国征战世界赛：克服时差与水土不服",
    icon: "🎫",
    narrative: "作为赛区一号种子跨洋出征全球总决赛！长达十四小时的跨国长途飞行让你浑身酸软，异国当地寒风凛冽、与国内存在整整七个小时的时差，酒店西餐也让多名队友胃部不适、面容憔悴。而小组赛首战就在两天之后，对手是统治世界的卫冕冠军宿敌……",
    options: [
      {
        label: "严格执行队医作息与光照法，带头顶着延迟在欧服打出超高排位",
        hint: "极度自律 · 身体力行树立标杆",
        resultDesc: "你逼迫自己按时起床晒太阳调整褪黑素分泌，拉着全队在训练室顶着延迟打当地高分服。仅用一天你就摸清了世界赛版本的隐秘套路，带领全队以最佳生理状态迎战！",
        effect: {
          health: 8,
          intelligence: 12,
          charm: 15,
          unlockAssetId: "vintage_esports_worlds_flight_and_ticket",
        },
      },
      {
        label: "在当地华人超市采购食材，亲手为队友煮一锅热腾腾的老干妈面",
        hint: "温情凝聚 · 暖胃更暖心",
        resultDesc: "你跑了五公里找到唐人街超市，买来挂面、老干妈和热高汤，在酒店小厨房为吃不惯沙拉的队友煮出一锅热腾腾的家乡面。全队吃得满头大汗，精神抖擞，赛前凝聚力达到史无前例的巅峰！",
        effect: {
          charm: 18,
          happiness: 20,
          affinityTarget: "mother",
          affinityDelta: 10,
          unlockAssetId: "vintage_esports_worlds_flight_and_ticket",
        },
      },
    ],
  },
  {
    id: "esports_worlds_pentakill_legend",
    category: "milestone",
    minAge: 20,
    maxAge: 24,
    weight: 10,
    title: "👑 决战世界之巅！天神下凡五杀绝杀！",
    icon: "💍",
    narrative: "全球总决赛总决赛（S赛）决胜局最后三分钟！双方在远古巨龙前爆发决定世界冠军归属的终极团战！敌方凭借恐怖的控制链瞬间秒杀我方前排两人，敌方五人全员满状态长驱直入！解说席几近失声绝望，全球数亿观众屏息凝神，只见你的英雄宛如孤胆战神逆光而立……",
    options: [
      {
        label: "水银秒解控制！闪现切入敌方腹地打出神级爆发连招【五杀绝杀】！",
        hint: "载入史册 · 登峰造极境",
        resultDesc: "“他还在输出！他还在输出！Penta Kill！五杀！！！”伴随着全球各国官方解说歇斯底里的嘶吼，你用神乎其神的微操孤身剿灭敌方五人！一人团灭敌军！世界冠军属于我们！全世界为你疯狂！",
        effect: {
          charm: 50,
          happiness: 40,
          cash: 500000,
          unlockAssetId: "vintage_esports_world_champion_fmvp_trophy",
        },
      },
      {
        label: "极限风筝拉扯完成一打五牵制，护送己方兵线偷平敌方基地！",
        hint: "战术绝杀 · 智慧与胆魄双绝",
        resultDesc: "你凭借鬼魅般的走位在敌方五人包夹中反复拉扯整整40秒，将对手死死锁在野区！就在对手回过神来时，中路超级兵已在推倒他们的门牙塔！基地爆炸！你以最富戏剧性的传奇智谋夺冠！",
        effect: {
          intelligence: 35,
          charm: 45,
          cash: 450000,
          unlockAssetId: "vintage_esports_world_champion_fmvp_trophy",
        },
      },
    ],
  },
  {
    id: "esports_golden_rain_glory",
    category: "milestone",
    minAge: 20,
    maxAge: 24,
    weight: 10,
    title: "✨ 满场金色的雨落下与捧起世界总冠军奖杯",
    icon: "✨",
    narrative: "当胜利的字样在屏幕正中央定格，四万人的足球场瞬间陷入沸腾的熔炉！满天漫地金色的彩带与亮片如雨般飘落，覆盖了整个舞台！重达几十公斤的纯银召唤师奖杯在中央熠熠生辉，国际奥委会与电竞联盟主席亲自上前为你佩戴金牌，全场齐声高呼你的名字！",
    options: [
      {
        label: "身披鲜艳的五星红旗跃上奖杯底座，高高举起召唤师杯仰天长啸！",
        hint: "荣耀加冕 · 中国电竞之巅",
        resultDesc: "你将国旗披在身后，双手青筋暴起将象征世界至高王冠的奖杯高高举过头顶！无数聚光灯将你镀上一层金光，这一瞬成为全人类电竞史上最璀璨的名场面，永载史册！",
        effect: {
          charm: 50,
          happiness: 50,
          cash: 1000000,
          unlockAssetId: "vintage_esports_golden_rain_confetti",
        },
      },
      {
        label: "在舞台中央弯腰拾起一片金色雨碎片，将最中央的位置让给替补老将",
        hint: "谦逊温良 · 英雄惜英雄",
        resultDesc: "你默默捡起一片沾着金粉的纸片收进贴身口袋，微笑着把奖杯最显眼的位置让给了一直默默付出的老队长与替补弟弟。全网盛赞你的冠军格局，各大国际媒体争相报道这一温情时刻！",
        effect: {
          intelligence: 20,
          charm: 48,
          happiness: 45,
          cash: 900000,
          unlockAssetId: "vintage_esports_golden_rain_confetti",
        },
      },
    ],
  },

  // =========================================================================
  // 【阶段六：老将转型期】(24~30岁)
  // =========================================================================
  {
    id: "esports_injury_therapy_choice",
    category: "accident",
    minAge: 24,
    maxAge: 28,
    weight: 9,
    title: "🩺 手伤理疗抉择：封闭硬撑还是转型保重健康？",
    icon: "🧤",
    narrative: "常年每天14小时极限APM手速操作，终究招致了职业病的残酷反噬。在季后赛前夕的常规训练中，右手腕突然传来刺骨钻心的剧痛，握住鼠标的右手不受控制地痉挛颤抖。积水潭医院专家拿着核磁共振片神色凝重：“严重腱鞘囊肿与神经压迫，打封闭还能撑几个月，但可能留下终身隐患……”",
    options: [
      {
        label: "接受深层针灸理疗与科学康复，调整坐姿与外设，转型团队大脑",
        hint: "科学续航 · 延长职业生命",
        resultDesc: "你听从医嘱拒绝透支身体，接受温热针灸与康复水疗，换上定制的人体工学护腕。你开始精减操作频次、强化团队战术指挥，以老道的大局观继续成为战队的定海神针！",
        effect: {
          health: 15,
          intelligence: 18,
          charm: 12,
          unlockAssetId: "vintage_esports_medical_wrist_guard",
        },
      },
      {
        label: "打最后一针封闭针带伤出征，给主场粉丝呈现最无悔的谢幕之战！",
        hint: "铁血死战 · 燃烧最后余晖",
        resultDesc: "“这是我最后一年，死也要死在赛场上！”你咬牙让队医注射了封闭针，忍痛戴上护腕重返主舞台！在全场观众噙泪的欢呼中，你燃烧全部本能打满最后一战，谱写了最壮烈的英雄挽歌！",
        effect: {
          health: -15,
          charm: 35,
          happiness: 20,
          cash: 50000,
          unlockAssetId: "vintage_esports_medical_wrist_guard",
        },
      },
    ],
  },
  {
    id: "esports_retirement_farewell_ceremony",
    category: "milestone",
    minAge: 25,
    maxAge: 29,
    weight: 10,
    title: "🎤 聚光灯下的退役演说与战袍永久封存",
    icon: "🖼️",
    narrative: "主场体育馆为全场熄灭灯光，大屏幕上开始放映你从高分路人、青训少年、到举起世界冠军奖杯的长达十分钟生涯纪录片。在万名粉丝挥舞的莹莹灯海中，你身穿战队定制正装走上舞台中央，麦克风前静候着你的告别谢幕……",
    options: [
      {
        label: "发表深情退役演说，感谢父母、教练、队友与每一位并肩的粉丝",
        hint: "体面告别 · 感谢青春盛宴",
        resultDesc: "“谢谢大家陪我走过这十年。少年永不老，梦想永不熄。”你的眼眶泛红，台下万千粉丝齐声痛哭高呼你的名字。俱乐部董事长亲自将装裱好的战袍交到你手中，永久退役你的战袍号码！",
        effect: {
          charm: 35,
          happiness: 30,
          affinityTarget: "father",
          affinityDelta: 20,
          unlockAssetId: "vintage_esports_retired_framed_jersey",
        },
      },
      {
        label: "将签名战袍亲手披在青训营最具潜力的新人肩上，薪火相传",
        hint: "薪火永续 · 传承电竞火种",
        resultDesc: "你微笑着脱下战袍，亲手披在战队最年轻的青训天才少年身上：“这件战袍的未来交给你了，去超越我吧！”全场掌声雷动，这一幕被赞誉为中国电竞最具情怀的薪火相传！",
        effect: {
          intelligence: 20,
          charm: 40,
          happiness: 35,
          unlockAssetId: "vintage_esports_retired_framed_jersey",
        },
      },
    ],
  },
  {
    id: "esports_post_career_transition",
    category: "milestone",
    minAge: 26,
    maxAge: 30,
    weight: 10,
    title: "🏢 退役后的人生新篇章：转型多元赛道",
    icon: "🏆",
    narrative: "脱下战袍并不意味着终点，而是广阔新天地的启航。电竞黄金时代的大门向你全面敞开，各大投资机构、头部直播平台与母队俱乐部纷纷向你抛出千万级橄榄枝，等待你做出人生第二次重大抉择……",
    options: [
      {
        label: "执掌教鞭出任俱乐部金牌主教练，率领新一代弟子再冲世界冠军！",
        hint: "一代宗师 · 幕后运筹帷幄",
        resultDesc: "你坐镇后方执掌BP教鞭，凭借深厚的冠军底蕴与临场变阵，带队第一年便斩获联赛冠军！从神级选手蜕变为战术宗师，享誉整个世界赛区！",
        effect: {
          intelligence: 25,
          charm: 25,
          cash: 300000,
          unlockAssetId: "vintage_esports_club_founder_crystal_plaque",
        },
      },
      {
        label: "签约头部平台开启百万人气直播间，以幽默整活与神级解说成为顶流！",
        hint: "顶流网红 · 商业价值拉满",
        resultDesc: "你开启个人直播间，凭着扎实无匹的退役战神技术和幽默风趣的赛事连麦解说，每晚在线热度破千万！接下数个国际奢侈品牌代言，年入千万元！",
        effect: {
          charm: 40,
          happiness: 30,
          cash: 800000,
          unlockAssetId: "vintage_esports_club_founder_crystal_plaque",
        },
      },
      {
        label: "拉来风投资本创办属于自己的电竞俱乐部，打造百年豪门帝国！",
        hint: "商业巨头 · 建立电竞帝国",
        resultDesc: "你成立以自己命名的俱乐部战队基地，招兵买马自建青训体系。几年内战队打入顶级职业联赛并获估值数亿融资，你荣获电竞联盟功勋创始人水晶牌匾！",
        effect: {
          intelligence: 30,
          charm: 45,
          cash: 1500000,
          unlockAssetId: "vintage_esports_club_founder_crystal_plaque",
        },
      },
    ],
  },
];
