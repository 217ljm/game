/**
 * 浪漫婚恋与夫妻生活系统 (Romance & Marriage System)
 * 包含：
 * 1. 丰富多元的异性伴侣候选人池（温柔教师、外企白领、科研学霸、电竞同好、青梅竹马、非遗匠人等）；
 * 2. 从初识、约会（约饭、看电影、公园踏青、精选送礼）、浪漫告白、订婚求婚到盛大婚礼的完整互动链路；
 * 3. 婚后生活满意度、夫妻共同财产、购置房产与精装、以及夫妻矛盾与吵架和解事件库。
 */

export type PartnerGender = "female" | "male";
export type RomanceRelationState = "stranger" | "acquaintance" | "crush" | "dating" | "engaged" | "married" | "divorced";

/** 伴侣性格标签 */
export type PersonalityTag =
  | "gentle_teacher"       // 温柔知性 · 教师
  | "foreign_biz"          // 干练独立 · 外企精英
  | "science_phd"          // 严谨求真 · 科研学霸
  | "esports_anime"        // 元气活泼 · 电竞二次元
  | "childhood_sweetheart" // 温婉贴心 · 青梅竹马
  | "art_craftsman";       // 典雅沉静 · 非遗匠人

/** 约会与送礼物品定义 */
export interface GiftItem {
  id: string;
  name: string;
  icon: string;
  price: number;
  affectionBonus: number;
  description: string;
  favoriteTags: PersonalityTag[];
}

/** 送礼礼品库 */
export const GIFT_DATABASE: GiftItem[] = [
  {
    id: "flower_rose",
    name: "99朵浓情红玫瑰",
    icon: "🌹",
    price: 99,
    affectionBonus: 8,
    description: "娇艳欲滴的鲜花，浪漫与爱意的经典表达。",
    favoriteTags: ["gentle_teacher", "foreign_biz", "childhood_sweetheart"],
  },
  {
    id: "classic_novel",
    name: "精装精美文学典藏集",
    icon: "📚",
    price: 120,
    affectionBonus: 12,
    description: "装帧典雅的世界文学巨著，散发着淡淡墨香。",
    favoriteTags: ["gentle_teacher", "science_phd", "art_craftsman"],
  },
  {
    id: "mechanical_keyboard",
    name: "客制化机械键盘与手办",
    icon: "🎮",
    price: 399,
    affectionBonus: 15,
    description: "手感清脆的电竞利器与正版限定二次元手办。",
    favoriteTags: ["esports_anime"],
  },
  {
    id: "astronomy_telescope",
    name: "高倍率便携天文望远镜",
    icon: "🔭",
    price: 680,
    affectionBonus: 18,
    description: "能够清晰观测月球环形山与土星光环的精密光学仪器。",
    favoriteTags: ["science_phd"],
  },
  {
    id: "silk_scarf",
    name: "手工刺绣真丝围巾",
    icon: "🧣",
    price: 260,
    affectionBonus: 14,
    description: "细腻柔顺的真丝面料，传统苏绣手工缝制花鸟图案。",
    favoriteTags: ["art_craftsman", "gentle_teacher", "childhood_sweetheart"],
  },
  {
    id: "luxury_perfume",
    name: "法式沙龙定制香水",
    icon: "✨",
    price: 520,
    affectionBonus: 16,
    description: "木质花香调的高级调香，优雅干练的气质象征。",
    favoriteTags: ["foreign_biz"],
  },
  {
    id: "diamond_ring",
    name: "一生一世铂金钻戒",
    icon: "💍",
    price: 5200,
    affectionBonus: 30,
    description: "永恒承诺的订婚求婚信物，闪耀着真爱誓言的璀璨光芒。",
    favoriteTags: ["gentle_teacher", "foreign_biz", "science_phd", "esports_anime", "childhood_sweetheart", "art_craftsman"],
  },
];

/** 伴侣NPC数据定义 */
export interface PartnerNPC {
  id: string;
  name: string;
  gender: PartnerGender;
  age: number;
  appearance: number;          // 颜值魅力 (0~100)
  intelligence: number;        // 智力素养 (0~100)
  personality: string;         // 性格简介
  personalityTag: PersonalityTag;
  occupation: string;          // 职业身份
  salaryMonthly: number;       // 月收入 (元)
  affection: number;           // 好感度 (0~100)
  maritalSatisfaction: number; // 婚后满意度 (0~100)
  relationState: RomanceRelationState;
  avatarIcon: string;
  bio: string;                 // 背景故事
  familyBackground: string;    // 家庭背景
}

/** 候选人池预设数据库 */
export const CANDIDATE_PARTNERS_DATABASE: PartnerNPC[] = [
  {
    id: "partner_lin",
    name: "林晓月",
    gender: "female",
    age: 23,
    appearance: 88,
    intelligence: 85,
    personality: "温柔善解人意 · 喜爱阅读经典与听古典音乐",
    personalityTag: "gentle_teacher",
    occupation: "重点中学英语教师",
    salaryMonthly: 4500,
    affection: 35,
    maritalSatisfaction: 80,
    relationState: "acquaintance",
    avatarIcon: "👩‍🏫",
    bio: "师范名校毕业，气质温婉知性，说话轻声细语，对待学生和生活充满耐心与爱意。",
    familyBackground: "书香门第，父母皆为退休高校教授，家庭氛围和睦开明。",
  },
  {
    id: "partner_zhao",
    name: "赵雨薇",
    gender: "female",
    age: 24,
    appearance: 92,
    intelligence: 90,
    personality: "独立干练开朗 · 爱好网球与手冲咖啡",
    personalityTag: "foreign_biz",
    occupation: "500强外企市场总监",
    salaryMonthly: 12000,
    affection: 25,
    maritalSatisfaction: 75,
    relationState: "stranger",
    avatarIcon: "👩‍💼",
    bio: "名校海归硕士，在职场雷厉风行、果断干练，私底下热爱运动与探索世界各地的美食咖啡。",
    familyBackground: "商业世家，父母经商办厂，从小培养了开阔的国际视野与商业思维。",
  },
  {
    id: "partner_shen",
    name: "沈清河",
    gender: "female",
    age: 24,
    appearance: 86,
    intelligence: 96,
    personality: "严谨睿智深情 · 痴迷天文观测与数理逻辑",
    personalityTag: "science_phd",
    occupation: "国家重点生物研究所科研博士",
    salaryMonthly: 6500,
    affection: 20,
    maritalSatisfaction: 82,
    relationState: "stranger",
    avatarIcon: "👩‍🔬",
    bio: "保送名校直博生，对待科学研究极其专注。看似高冷，内心对认定的人专一执着。",
    familyBackground: "知识分子家庭，父亲为中科院研究员，母亲为三甲医院主任医师。",
  },
  {
    id: "partner_su",
    name: "苏萌萌",
    gender: "female",
    age: 22,
    appearance: 90,
    intelligence: 80,
    personality: "元气满满鬼马精灵 · 资深游戏玩家与插画师",
    personalityTag: "esports_anime",
    occupation: "电竞战队解说 / 知名二次元画师",
    salaryMonthly: 8000,
    affection: 30,
    maritalSatisfaction: 78,
    relationState: "stranger",
    avatarIcon: "🎮",
    bio: "充满活力与创意的元气少女，各大游戏展常客，总能给身边的人带来无尽的欢声笑语。",
    familyBackground: "自由开明的工薪家庭，父母全力支持其追求热爱的新兴电竞与插画事业。",
  },
  {
    id: "partner_wen",
    name: "温小柔",
    gender: "female",
    age: 23,
    appearance: 87,
    intelligence: 82,
    personality: "青梅竹马两小无猜 · 擅长烘焙烹饪与生活收纳",
    personalityTag: "childhood_sweetheart",
    occupation: "社区妇幼保健院儿科护士",
    salaryMonthly: 4200,
    affection: 45,
    maritalSatisfaction: 88,
    relationState: "crush",
    avatarIcon: "👧",
    bio: "住在隔壁筒子楼从小一起长大的邻家女孩，记得你所有的喜好与童年糗事，满眼都是你。",
    familyBackground: "老厂职工家庭，两家父母相识数十年，知根知底、亲如一家。",
  },
  {
    id: "partner_gu",
    name: "顾海澜",
    gender: "female",
    age: 24,
    appearance: 93,
    intelligence: 88,
    personality: "典雅温润秀外慧中 · 精通茶艺与传统苏绣非遗",
    personalityTag: "art_craftsman",
    occupation: "非遗苏绣工作坊首席刺绣师",
    salaryMonthly: 5800,
    affection: 22,
    maritalSatisfaction: 85,
    relationState: "stranger",
    avatarIcon: "👘",
    bio: "江南水乡走出的非遗传人，指尖生花，一针一线皆是东方神韵，气质清冷典雅宛若画中人。",
    familyBackground: "工艺世家，世代传承刺绣手艺，家风儒雅淳厚。",
  },
];

/** 房产配置定义 */
export interface HouseProperty {
  id: string;
  name: string;
  type: "small_apartment" | "welfare_unit" | "commercial_house" | "school_district" | "garden_villa";
  price: number;
  decorationLevel: "none" | "simple" | "refined" | "luxury";
  decorationCost: number;
  satisfactionBonus: number;
  desc: string;
}

/** 购房置业房产库 */
export const HOUSING_DATABASE: HouseProperty[] = [
  {
    id: "house_welfare",
    name: "老式单位筒子楼/福利房",
    type: "welfare_unit",
    price: 35000,
    decorationLevel: "none",
    decorationCost: 5000,
    satisfactionBonus: 10,
    desc: "充满时代烟火气的公房，两室一厅，邻里熟悉亲切，温馨踏实。",
  },
  {
    id: "house_commercial",
    name: "城市中心两居室商品房",
    type: "commercial_house",
    price: 180000,
    decorationLevel: "simple",
    decorationCost: 30000,
    satisfactionBonus: 25,
    desc: "采光充足的现代商品住宅，电梯入户，交通生活便利，小家庭的舒适港湾。",
  },
  {
    id: "house_school",
    name: "重点名校旁三居室学区房",
    type: "school_district",
    price: 450000,
    decorationLevel: "refined",
    decorationCost: 80000,
    satisfactionBonus: 40,
    desc: "对口省市重点中小学，优质教育资源环绕，保值增值且利于子女成长！",
  },
  {
    id: "house_villa",
    name: "湖畔独栋私家花园洋房",
    type: "garden_villa",
    price: 1200000,
    decorationLevel: "luxury",
    decorationCost: 200000,
    satisfactionBonus: 60,
    desc: "依山傍水的豪华庄园洋房，私家露台与绿茵花园，尊享高品质顶奢生活。",
  },
];

/** 夫妻矛盾与争吵和好事件定义 */
export interface MarriageConflictEvent {
  id: string;
  title: string;
  scenario: string;
  reason: string;
  choices: Array<{
    id: string;
    text: string;
    satisfactionDelta: number;
    affectionDelta: number;
    costYuan: number;
    energyCost: number;
    resultText: string;
  }>;
}

/** 婚后夫妻矛盾事件库 */
export const MARRIAGE_CONFLICT_DATABASE: MarriageConflictEvent[] = [
  {
    id: "conflict_housework",
    title: "🧹 家务分工与疲劳归家的小摩擦",
    scenario: "连续加班后你回到家，看到水槽里堆着的碗筷和没扫的客厅，双方都感到身心俱疲，气氛有些紧绷。",
    reason: "工作压力累积与家务琐事分工未及时沟通",
    choices: [
      {
        id: "active_empathy",
        text: "主动泡一杯热茶，握住对方的手温和沟通，一起分工收拾",
        satisfactionDelta: 8,
        affectionDelta: 5,
        costYuan: 0,
        energyCost: 10,
        resultText: "你倒了热茶安慰对方，两人一边听着音乐一边洗碗擦桌，生活琐事反而成了温馨的情感粘合剂！",
      },
      {
        id: "order_cleaning",
        text: "出钱雇佣保洁阿姨大扫除，并带伴侣去吃宵夜散心",
        satisfactionDelta: 12,
        affectionDelta: 8,
        costYuan: 200,
        energyCost: 5,
        resultText: "专业保洁将屋子收拾得一尘不染，夜市热气腾腾的宵夜让两人相视一笑，烦恼烟消云散！",
      },
      {
        id: "cold_war",
        text: "各自生闷气回房关门睡觉，不予理睬",
        satisfactionDelta: -15,
        affectionDelta: -10,
        costYuan: 0,
        energyCost: 0,
        resultText: "冷战让屋里的空气降到了冰点，无声的隔阂在彼此心头蒙上了一层阴影。",
      },
    ],
  },
  {
    id: "conflict_consumption",
    title: "💰 大件消费观念与储蓄分歧",
    scenario: "伴侣想添置一件高品质的高端家电/奢侈纪念品，而你更倾向于把钱存入家庭应急储蓄池，双方意见不一。",
    reason: "生活品质追求与风险储蓄理念的差异",
    choices: [
      {
        id: "compromise_plan",
        text: "制定家庭月度预算与专项心愿基金，分期实现愿望",
        satisfactionDelta: 10,
        affectionDelta: 6,
        costYuan: 0,
        energyCost: 5,
        resultText: "理性的规划既照顾了生活品质，又保障了家庭财务安全，伴侣非常赞同你的成熟稳重！",
      },
      {
        id: "full_support",
        text: "欣然出资全款购买，作为犒劳伴侣辛勤付出的惊喜礼物",
        satisfactionDelta: 15,
        affectionDelta: 12,
        costYuan: 1500,
        energyCost: 5,
        resultText: "伴侣收到心仪已久的物件惊喜万分，感动地紧紧拥抱你，婚姻生活甜蜜度拉满！",
      },
      {
        id: "blame_waste",
        text: "严厉指责对方虚荣浪费、不懂持家",
        satisfactionDelta: -20,
        affectionDelta: -15,
        costYuan: 0,
        energyCost: 0,
        resultText: "伤人的话语如利刃刺痛了对方的自尊，伴侣默默流泪，家庭气氛降至冰点。",
      },
    ],
  },
  {
    id: "conflict_relatives",
    title: "🧧 亲友走访与人情往来琐事",
    scenario: "逢年过节双方亲友走动与礼品包红包的人情安排上，对于开销和时间分配产生了一点分歧。",
    reason: "两家传统习惯与社交礼仪考量不同",
    choices: [
      {
        id: "respect_both",
        text: "一视同仁精心备礼，两边父母分别贴心陪伴",
        satisfactionDelta: 12,
        affectionDelta: 8,
        costYuan: 600,
        energyCost: 15,
        resultText: "两边长辈都赞不绝口，夸赞你们夫妻同心、孝顺周全，家庭其乐融融！",
      },
      {
        id: "intimate_date",
        text: "礼数周全送达后，预留两天夫妻专属双人周边游",
        satisfactionDelta: 14,
        affectionDelta: 10,
        costYuan: 800,
        energyCost: 10,
        resultText: "不仅孝敬了长辈，还享受了浪漫的二人世界，夫妻感情愈发深厚缠绵！",
      },
    ],
  },
];

/**
 * 浪漫婚恋与婚姻家庭核心管理系统
 */
export class RomanceMarriageSystem {
  /** 当前选定或交往的伴侣 */
  public partner: PartnerNPC;

  /** 候选人伴侣池 */
  public candidatePool: PartnerNPC[] = [];

  /** 拥有房产列表 */
  public ownedHouses: HouseProperty[] = [];

  /** 家庭共同储蓄池 (元) */
  public familySavings: number = 20000;

  /** 婚礼类型记录 */
  public weddingStyle: "simple" | "grand" | "luxury" | null = null;

  constructor() {
    // 深拷贝候选人数据库
    this.candidatePool = JSON.parse(JSON.stringify(CANDIDATE_PARTNERS_DATABASE));
    // 默认初始伴侣为第一位（林晓月）
    this.partner = this.candidatePool[0];
  }

  /**
   * 切换或选择心仪的结识对象
   */
  public selectPartner(partnerId: string): boolean {
    const target = this.candidatePool.find((p) => p.id === partnerId);
    if (target) {
      this.partner = target;
      return true;
    }
    return false;
  }

  /**
   * 与伴侣进行核心互动
   */
  public interact(
    action:
      | "chat"
      | "dinner"
      | "movie"
      | "date_park"
      | "gift"
      | "confess"
      | "propose"
      | "wedding"
      | "marital_care",
    giftId?: string,
    weddingStyle?: "simple" | "grand" | "luxury",
  ): {
    success: boolean;
    affectionGain: number;
    satisfactionGain: number;
    costYuan: number;
    energyCost: number;
    msg: string;
  } {
    const p = this.partner;

    // 1. 聊天交流
    if (action === "chat") {
      const gain = 6;
      p.affection = Math.min(100, p.affection + gain);
      if (p.relationState === "stranger") p.relationState = "acquaintance";
      return {
        success: true,
        affectionGain: gain,
        satisfactionGain: 2,
        costYuan: 0,
        energyCost: 5,
        msg: `你与${p.name}在林荫大道漫步长谈，畅聊兴趣与人生理想，相见恨晚，彼此好感度+${gain}！`,
      };
    }

    // 2. 烛光美餐
    if (action === "dinner") {
      const gain = 12;
      p.affection = Math.min(100, p.affection + gain);
      return {
        success: true,
        affectionGain: gain,
        satisfactionGain: 4,
        costYuan: 80,
        energyCost: 10,
        msg: `与${p.name}共进精致晚餐，欢声笑语，浪漫的气氛让彼此的心靠得更近，好感度+${gain}！`,
      };
    }

    // 3. 电影约会
    if (action === "movie") {
      const gain = 10;
      p.affection = Math.min(100, p.affection + gain);
      return {
        success: true,
        affectionGain: gain,
        satisfactionGain: 3,
        costYuan: 60,
        energyCost: 8,
        msg: `在电影院一同观看经典佳作，黑暗中手心不经意的触碰让心跳加速，好感度+${gain}！`,
      };
    }

    // 4. 公园踏青游乐
    if (action === "date_park") {
      const gain = 14;
      p.affection = Math.min(100, p.affection + gain);
      return {
        success: true,
        affectionGain: gain,
        satisfactionGain: 5,
        costYuan: 50,
        energyCost: 12,
        msg: `在阳光明媚的公园划船踏青、品尝棉花糖，留下了无比甜蜜的合影与欢笑，好感度+${gain}！`,
      };
    }

    // 5. 精选送礼
    if (action === "gift") {
      const gift = GIFT_DATABASE.find((g) => g.id === giftId) || GIFT_DATABASE[0];
      const isFavorite = gift.favoriteTags.includes(p.personalityTag);
      const gain = isFavorite ? Math.round(gift.affectionBonus * 1.5) : gift.affectionBonus;

      p.affection = Math.min(100, p.affection + gain);
      const favText = isFavorite ? `对方眼中闪烁着惊喜与喜悦的光芒，这是TA最心仪的礼物！` : `对方微笑着道谢，感受到了你的真诚心意。`;
      return {
        success: true,
        affectionGain: gain,
        satisfactionGain: 6,
        costYuan: gift.price,
        energyCost: 5,
        msg: `你向${p.name}赠送了【${gift.name}】。${favText} 好感度+${gain}！`,
      };
    }

    // 6. 浪漫告白
    if (action === "confess") {
      if (p.relationState === "dating" || p.relationState === "engaged" || p.relationState === "married") {
        return {
          success: true,
          affectionGain: 5,
          satisfactionGain: 5,
          costYuan: 0,
          energyCost: 5,
          msg: `深情款款的情话让${p.name}娇羞一笑，紧紧依偎在你怀中。`,
        };
      }
      if (p.affection >= 55) {
        p.relationState = "dating";
        const gain = 18;
        p.affection = Math.min(100, p.affection + gain);
        return {
          success: true,
          affectionGain: gain,
          satisfactionGain: 15,
          costYuan: 100,
          energyCost: 15,
          msg: `告白大成功！${p.name}红着脸眼含泪光答应做你的恋人，正式确定恋爱关系，好感度+${gain}！`,
        };
      }
      p.affection = Math.max(0, p.affection - 8);
      return {
        success: false,
        affectionGain: -8,
        satisfactionGain: 0,
        costYuan: 50,
        energyCost: 10,
        msg: `当前好感度尚显生疏（需≥55），${p.name}有些慌乱与尴尬，委婉表示希望先从好朋友做起。`,
      };
    }

    // 7. 订婚求婚
    if (action === "propose") {
      if (p.relationState === "married") {
        return { success: false, affectionGain: 0, satisfactionGain: 0, costYuan: 0, energyCost: 0, msg: "你们已经是受法律与亲友祝福的恩爱夫妻啦！" };
      }
      if (p.relationState !== "dating") {
        return { success: false, affectionGain: 0, satisfactionGain: 0, costYuan: 0, energyCost: 0, msg: "尚未确立恋爱关系，无法直接求婚。" };
      }
      if (p.affection >= 85) {
        p.relationState = "engaged";
        const gain = 15;
        p.affection = Math.min(100, p.affection + gain);
        return {
          success: true,
          affectionGain: gain,
          satisfactionGain: 20,
          costYuan: 5200,
          energyCost: 20,
          msg: `单膝跪地，奉上璀璨钻戒与誓言！${p.name}感动落泪欣然应允：“我愿意！”，双方正式订婚！`,
        };
      }
      return {
        success: false,
        affectionGain: -5,
        satisfactionGain: 0,
        costYuan: 0,
        energyCost: 10,
        msg: `好感度需达到85以上（当前${p.affection}），对方觉得步入婚姻还需要更多感情沉淀与磨合。`,
      };
    }

    // 8. 举办盛大婚礼
    if (action === "wedding") {
      if (p.relationState !== "engaged") {
        return { success: false, affectionGain: 0, satisfactionGain: 0, costYuan: 0, energyCost: 0, msg: "请先完成浪漫订婚求婚，再筹办婚礼盛典。" };
      }
      const style = weddingStyle || "grand";
      this.weddingStyle = style;
      p.relationState = "married";
      p.affection = 100;
      p.maritalSatisfaction = 95;

      let cost = 10000;
      let styleText = "在双方亲朋好友的见证下，举办了温馨热闹的传统喜宴！";
      if (style === "luxury") {
        cost = 50000;
        styleText = "在顶级五星级国宾大酒店包场举办世纪婚礼，鲜花铺地、高朋满座，全城瞩目！";
      } else if (style === "simple") {
        cost = 3000;
        styleText = "领证登记并发放喜糖，与挚友知己简朴聚餐，携手开启相伴一生的新篇章！";
      }

      return {
        success: true,
        affectionGain: 10,
        satisfactionGain: 30,
        costYuan: cost,
        energyCost: 25,
        msg: `🎉 喜结连理！${styleText} 你与${p.name}正式结为合法夫妻，白头偕老！`,
      };
    }

    // 9. 婚后夫妻日常关怀
    if (action === "marital_care") {
      if (p.relationState !== "married") {
        return { success: false, affectionGain: 0, satisfactionGain: 0, costYuan: 0, energyCost: 0, msg: "只有已婚伴侣才能进行婚后日常关怀。" };
      }
      p.maritalSatisfaction = Math.min(100, p.maritalSatisfaction + 8);
      p.affection = Math.min(100, p.affection + 5);
      return {
        success: true,
        affectionGain: 5,
        satisfactionGain: 8,
        costYuan: 30,
        energyCost: 8,
        msg: `为${p.name}准备爱心便当与按摩捏肩，夫妻耳鬓厮磨、温情脉脉，婚姻生活满意度提升至${p.maritalSatisfaction}！`,
      };
    }

    return { success: true, affectionGain: 5, satisfactionGain: 2, costYuan: 0, energyCost: 5, msg: "互动愉快！" };
  }

  /**
   * 夫妻共同购买房产
   */
  public buyHouse(houseId: string, playerFunds: number): { success: boolean; msg: string; remainingFunds: number } {
    const targetHouse = HOUSING_DATABASE.find((h) => h.id === houseId);
    if (!targetHouse) {
      return { success: false, msg: "未找到该房产信息。", remainingFunds: playerFunds };
    }

    // 计算总可用资金（玩家个人 + 家庭储蓄）
    const totalAvailable = playerFunds + this.familySavings;
    if (totalAvailable < targetHouse.price) {
      return {
        success: false,
        msg: `资金不足！购买【${targetHouse.name}】需要 ¥${targetHouse.price}，当前个人与家庭储蓄总计 ¥${totalAvailable}。`,
        remainingFunds: playerFunds,
      };
    }

    // 优先扣除家庭储蓄
    let needed = targetHouse.price;
    if (this.familySavings >= needed) {
      this.familySavings -= needed;
      needed = 0;
    } else {
      needed -= this.familySavings;
      this.familySavings = 0;
    }

    const remainingPlayerFunds = playerFunds - needed;
    this.ownedHouses.push(JSON.parse(JSON.stringify(targetHouse)));

    if (this.partner.relationState === "married") {
      this.partner.maritalSatisfaction = Math.min(100, this.partner.maritalSatisfaction + targetHouse.satisfactionBonus);
    }

    return {
      success: true,
      msg: `恭喜置业！成功购置【${targetHouse.name}】，居住品质飞跃，婚姻家庭满意度大幅提升！`,
      remainingFunds: remainingPlayerFunds,
    };
  }

  /**
   * 为房产进行升级装修
   */
  public decorateHouse(
    houseId: string,
    targetLevel: "simple" | "refined" | "luxury",
    playerFunds: number,
  ): { success: boolean; msg: string; remainingFunds: number } {
    const house = this.ownedHouses.find((h) => h.id === houseId);
    if (!house) {
      return { success: false, msg: "您名下暂无该房产。", remainingFunds: playerFunds };
    }

    const costMap = { simple: 20000, refined: 60000, luxury: 150000 };
    const bonusMap = { simple: 10, refined: 20, luxury: 35 };
    const cost = costMap[targetLevel];

    if (playerFunds < cost) {
      return { success: false, msg: `资金不足！${targetLevel}级装修需要 ¥${cost}。`, remainingFunds: playerFunds };
    }

    house.decorationLevel = targetLevel;
    house.decorationCost += cost;
    house.satisfactionBonus += bonusMap[targetLevel];

    if (this.partner.relationState === "married") {
      this.partner.maritalSatisfaction = Math.min(100, this.partner.maritalSatisfaction + bonusMap[targetLevel]);
    }

    return {
      success: true,
      msg: `装修竣工！【${house.name}】已完成高标准【${targetLevel}】装修，焕然一新，幸福感满满！`,
      remainingFunds: playerFunds - cost,
    };
  }

  /**
   * 触发夫妻矛盾争吵与化解事件
   */
  public triggerRandomConflict(): MarriageConflictEvent | null {
    if (this.partner.relationState !== "married") return null;
    const index = Math.floor(Math.random() * MARRIAGE_CONFLICT_DATABASE.length);
    return MARRIAGE_CONFLICT_DATABASE[index];
  }

  /**
   * 解决夫妻争吵事件选择
   */
  public resolveConflict(
    conflictId: string,
    choiceId: string,
  ): { success: boolean; resultText: string; satisfactionDelta: number; affectionDelta: number; costYuan: number; energyCost: number } {
    const conflict = MARRIAGE_CONFLICT_DATABASE.find((c) => c.id === conflictId);
    if (!conflict) {
      return { success: false, resultText: "未找到该事件", satisfactionDelta: 0, affectionDelta: 0, costYuan: 0, energyCost: 0 };
    }
    const choice = conflict.choices.find((ch) => ch.id === choiceId) || conflict.choices[0];

    this.partner.maritalSatisfaction = Math.max(0, Math.min(100, this.partner.maritalSatisfaction + choice.satisfactionDelta));
    this.partner.affection = Math.max(0, Math.min(100, this.partner.affection + choice.affectionDelta));

    return {
      success: true,
      resultText: choice.resultText,
      satisfactionDelta: choice.satisfactionDelta,
      affectionDelta: choice.affectionDelta,
      costYuan: choice.costYuan,
      energyCost: choice.energyCost,
    };
  }

  /**
   * 季度/年度财务与工资结算
   */
  public tickQuarterFinancials(): { partnerIncome: number; familySavingsTotal: number } {
    if (this.partner.relationState === "married") {
      // 伴侣季度收入（3个月工资的60%注入家庭储蓄，40%用于日常开销）
      const quarterIncome = Math.round(this.partner.salaryMonthly * 3 * 0.6);
      this.familySavings += quarterIncome;
      return { partnerIncome: quarterIncome, familySavingsTotal: this.familySavings };
    }
    return { partnerIncome: 0, familySavingsTotal: this.familySavings };
  }
}
