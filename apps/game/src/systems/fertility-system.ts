/**
 * 生育养育与子女成长系统 (Fertility & Child Rearing System)
 * 包含：
 * 1. 贴合中国计划生育政策历史变迁（1979~2015独生子女政策、2016~2020全面二孩、2021及以后三孩政策与育儿补贴）；
 * 2. 备孕、孕期安胎与产检、分娩生产与天赋遗传；
 * 3. 完整的子女成长阶段（婴儿、幼儿、学龄前、小学、初中、高中、大学、成年）；
 * 4. 亲子互动（喂养早教、讲故事、游乐园踏青、促膝谈心）、兴趣班特长培养与成长手记。
 */

import type { PartnerNPC } from "./romance-marriage-system";

/** 计划生育政策历史时代 */
export type BirthPolicyEra = "strict_one_child" | "two_child_policy" | "three_child_policy";

/** 政策信息定义 */
export interface BirthPolicyInfo {
  era: BirthPolicyEra;
  yearRange: [number, number];
  name: string;
  allowedChildren: number;
  fineMultiplier: number; // 超生社会抚养费基数倍数
  subsidyPerChildQuarter: number; // 每季度育儿补贴 (2021后)
  summary: string;
  policyDetails: string;
}

/** 中国人口与计划生育历史政策数据库 */
export const BIRTH_POLICY_DATABASE: BirthPolicyInfo[] = [
  {
    era: "strict_one_child",
    yearRange: [1979, 2015],
    name: "独生子女政策（提倡一对夫妇生育一个孩子）",
    allowedChildren: 1,
    fineMultiplier: 3.5,
    subsidyPerChildQuarter: 0,
    summary: "国家提倡一对夫妇只生育一个孩子。超生需缴纳社会抚养费，体制内或面临纪律处分。",
    policyDetails: "为控制人口过快增长，1979年起全面推行计划生育国策，独生子女家庭享有荣誉证书与专项光荣费。",
  },
  {
    era: "two_child_policy",
    yearRange: [2016, 2020],
    name: "全面二孩政策（提倡一对夫妻生育两个子女）",
    allowedChildren: 2,
    fineMultiplier: 2.0,
    subsidyPerChildQuarter: 200,
    summary: "国家全面放开二孩生育，促进人口均衡发展，积极应对老龄化浪潮。",
    policyDetails: "2016年1月1日起施行新修订的《人口与计划生育法》，准许生育二孩，鼓励适龄优生优育。",
  },
  {
    era: "three_child_policy",
    yearRange: [2021, 2099],
    name: "三孩生育政策与配套支持措施",
    allowedChildren: 3,
    fineMultiplier: 1.0,
    subsidyPerChildQuarter: 800,
    summary: "实施三孩生育政策及配套支持措施，发放育儿补贴金并延长陪产假与育儿假。",
    policyDetails: "2021年5月31日中央政治局会议审议通过，推动实现适度生育水平，建立健全生育友好型社会支持体系。",
  },
];

/** 孕期状态数据 */
export interface PregnancyState {
  isPregnant: boolean;
  pregnancyQuarter: number; // 孕周进度 (1~3个季度，即9~10个月)
  fetalHealth: number;      // 胎儿健康度 (0~100)
  motherCondition: number;  // 母亲身心状态 (0~100)
  prenatalCheckCount: number; // 已做产检次数
}

/** 子女成长阶段 */
export type ChildStage =
  | "infant"       // 婴儿期 (0~1岁)
  | "toddler"      // 幼儿期 (1~3岁)
  | "preschool"    // 学龄前期 (3~6岁)
  | "primary"      // 小学阶段 (7~12岁)
  | "junior_high"  // 初中阶段 (13~15岁)
  | "senior_high"  // 高中阶段 (16~18岁)
  | "university"   // 大学阶段 (19~22岁)
  | "adult";       // 步入社会 (23岁+)

/** 兴趣班与特长培养课程 */
export interface ChildInterestCourse {
  id: string;
  name: string;
  category: "academics" | "arts" | "sports" | "technology";
  costPerQuarter: number;
  intelligenceBonus: number;
  artistryBonus: number;
  athleticismBonus: number;
  happinessBonus: number;
  desc: string;
}

/** 兴趣班数据库 */
export const INTEREST_COURSES_DATABASE: ChildInterestCourse[] = [
  {
    id: "olympiad_math",
    name: "少儿奥数与逻辑思维培优班",
    category: "academics",
    costPerQuarter: 800,
    intelligenceBonus: 8,
    artistryBonus: 0,
    athleticismBonus: 0,
    happinessBonus: 2,
    desc: "启发数理几何灵感，培养严密逻辑推导与奥赛解题素养。",
  },
  {
    id: "piano_violin",
    name: "少儿钢琴与西洋弦乐班",
    category: "arts",
    costPerQuarter: 1200,
    intelligenceBonus: 3,
    artistryBonus: 10,
    athleticismBonus: 0,
    happinessBonus: 4,
    desc: "黑白琴键与悠扬琴声，熏陶高雅艺术品位与音律感知力。",
  },
  {
    id: "chinese_painting_calligraphy",
    name: "国风书画与传统书法班",
    category: "arts",
    costPerQuarter: 600,
    intelligenceBonus: 2,
    artistryBonus: 8,
    athleticismBonus: 0,
    happinessBonus: 5,
    desc: "墨香四溢，在宣纸上领略传统笔墨风骨与静心修养。",
  },
  {
    id: "swimming_fitness",
    name: "青少年游泳与少儿体适能班",
    category: "sports",
    costPerQuarter: 750,
    intelligenceBonus: 1,
    artistryBonus: 0,
    athleticismBonus: 10,
    happinessBonus: 6,
    desc: "强身健体，增强心肺耐力与协调爆发力，铸就阳光体魄。",
  },
  {
    id: "coding_robotics",
    name: "少儿图形化编程与创客机器人",
    category: "technology",
    costPerQuarter: 1000,
    intelligenceBonus: 7,
    artistryBonus: 2,
    athleticismBonus: 0,
    happinessBonus: 5,
    desc: "动手搭建传感器与智能硬件，点燃未来极客创造力！",
  },
  {
    id: "ballet_dance",
    name: "少儿古典芭蕾与形体舞蹈班",
    category: "arts",
    costPerQuarter: 900,
    intelligenceBonus: 1,
    artistryBonus: 9,
    athleticismBonus: 5,
    happinessBonus: 4,
    desc: "纠正体态身姿，在轻盈跃动中绽放自信优雅的气质。",
  },
];

/** 子女档案数据结构 */
export interface ChildNPC {
  id: string;
  name: string;
  gender: "boy" | "girl";
  birthYear: number;
  age: number;
  health: number;             // 健康指数 (0~100)
  happiness: number;          // 快乐幸福指数 (0~100)
  intelligence: number;       // 智力素养 (0~100)
  artistry: number;           // 艺术才华 (0~100)
  athleticism: number;        // 运动体能 (0~100)
  intimacy: number;           // 与父母亲密度 (0~100)
  stage: ChildStage;
  talents: string[];          // 天赋潜质标签
  enrolledCourses: string[];  // 报名的兴趣特长班ID列表
  diaryNotes: string[];       // 成长里程碑手记
}

/**
 * 生育养育与子女成长管理系统
 */
export class FertilitySystem {
  /** 孕期状态 */
  public pregnancy: PregnancyState = {
    isPregnant: false,
    pregnancyQuarter: 0,
    fetalHealth: 100,
    motherCondition: 100,
    prenatalCheckCount: 0,
  };

  /** 子女列表 */
  public children: ChildNPC[] = [];

  /** 累计缴纳的社会抚养费 (超生罚金) */
  public paidSocialFinesTotal: number = 0;

  /**
   * 获取指定年份对应的国家计生政策
   */
  public getPolicyForYear(year: number): BirthPolicyInfo {
    const policy = BIRTH_POLICY_DATABASE.find(
      (p) => year >= p.yearRange[0] && year <= p.yearRange[1],
    );
    return policy || BIRTH_POLICY_DATABASE[BIRTH_POLICY_DATABASE.length - 1];
  }

  /**
   * 检查生育是否合规及预计社会抚养费
   */
  public checkPolicyCompliance(
    currentYear: number,
    annualFamilyIncome: number,
  ): { isCompliant: boolean; policy: BirthPolicyInfo; fineYuan: number } {
    const policy = this.getPolicyForYear(currentYear);
    const existingCount = this.children.length;
    const isCompliant = existingCount < policy.allowedChildren;

    let fineYuan = 0;
    if (!isCompliant) {
      // 超生罚款（社会抚养费）通常为家庭年收入的一定倍数
      fineYuan = Math.round(Math.max(10000, annualFamilyIncome * policy.fineMultiplier));
    }

    return { isCompliant, policy, fineYuan };
  }

  /**
   * 夫妻尝试备孕与受孕
   */
  public tryConceive(
    partner: PartnerNPC,
    currentYear: number,
  ): { success: boolean; msg: string; energyCost: number } {
    if (partner.relationState !== "married") {
      return { success: false, msg: "只有已婚夫妻才能进行温馨备孕哦。", energyCost: 0 };
    }
    if (this.pregnancy.isPregnant) {
      return { success: false, msg: "伴侣当前已经怀有身孕，请悉心照料！", energyCost: 0 };
    }

    // 备孕成功率受好感度和伴侣满意度影响
    const baseChance = 0.55 + (partner.affection / 100) * 0.25 + (partner.maritalSatisfaction / 100) * 0.15;
    const isSuccess = Math.random() < Math.min(0.95, baseChance);

    if (isSuccess) {
      this.pregnancy = {
        isPregnant: true,
        pregnancyQuarter: 1,
        fetalHealth: 90 + Math.floor(Math.random() * 10),
        motherCondition: 90 + Math.floor(Math.random() * 10),
        prenatalCheckCount: 0,
      };

      const policy = this.getPolicyForYear(currentYear);
      const isExtra = this.children.length >= policy.allowedChildren;
      const extraWarning = isExtra ? ` (提示：当前处于【${policy.name}】时期，此胎为超生计划外生育)` : "";

      return {
        success: true,
        msg: `🎉 喜报！验孕棒显示鲜明的两条杠，${partner.name}成功怀孕啦！小生命正在悄然孕育中！${extraWarning}`,
        energyCost: 15,
      };
    }

    return {
      success: false,
      msg: `本次备孕未成功受孕。医生建议放松心情、规律作息，下个季度继续加油！`,
      energyCost: 10,
    };
  }

  /**
   * 孕期定期产检
   */
  public doPrenatalCheck(
    partner: PartnerNPC,
    playerFunds: number,
  ): { success: boolean; msg: string; costYuan: number; energyCost: number } {
    if (!this.pregnancy.isPregnant) {
      return { success: false, msg: "当前并未处于怀孕周期中。", costYuan: 0, energyCost: 0 };
    }
    const cost = 300;
    if (playerFunds < cost) {
      return { success: false, msg: "资金不足以支付三甲妇幼医院产检挂号及B超化验费用 (¥300)。", costYuan: 0, energyCost: 0 };
    }

    this.pregnancy.prenatalCheckCount += 1;
    this.pregnancy.fetalHealth = Math.min(100, this.pregnancy.fetalHealth + 5);
    this.pregnancy.motherCondition = Math.min(100, this.pregnancy.motherCondition + 5);
    partner.maritalSatisfaction = Math.min(100, partner.maritalSatisfaction + 4);

    return {
      success: true,
      msg: `陪同${partner.name}前往妇幼保健院完成第${this.pregnancy.prenatalCheckCount}次产检。胎心监护与四维彩超一切指标正常，胎儿发育十分健康！`,
      costYuan: cost,
      energyCost: 12,
    };
  }

  /**
   * 孕期悉心照料与安胎补品
   */
  public careForPregnancy(
    partner: PartnerNPC,
    playerFunds: number,
  ): { success: boolean; msg: string; costYuan: number; energyCost: number } {
    if (!this.pregnancy.isPregnant) {
      return { success: false, msg: "当前并未处于怀孕周期中。", costYuan: 0, energyCost: 0 };
    }
    const cost = 200;
    if (playerFunds < cost) {
      return { success: false, msg: "资金不足以购买优质孕期营养补品 (¥200)。", costYuan: 0, energyCost: 0 };
    }

    this.pregnancy.motherCondition = Math.min(100, this.pregnancy.motherCondition + 8);
    this.pregnancy.fetalHealth = Math.min(100, this.pregnancy.fetalHealth + 6);
    partner.maritalSatisfaction = Math.min(100, partner.maritalSatisfaction + 6);

    return {
      success: true,
      msg: `亲手为${partner.name}炖煮了营养丰富的花胶燕窝汤并耐心按摩小腿，准妈妈感到无比幸福与安心！`,
      costYuan: cost,
      energyCost: 10,
    };
  }

  /**
   * 孕期季度推移与分娩触发判定
   */
  public tickPregnancyQuarter(): { readyToDeliver: boolean; msg: string } {
    if (!this.pregnancy.isPregnant) {
      return { readyToDeliver: false, msg: "" };
    }

    this.pregnancy.pregnancyQuarter += 1;

    if (this.pregnancy.pregnancyQuarter >= 3) {
      return {
        readyToDeliver: true,
        msg: "伴侣孕周已足9~10个月，羊水破裂出现规律宫缩，火速送往妇产科产房准备分娩！",
      };
    }

    return {
      readyToDeliver: false,
      msg: `孕期进入第${this.pregnancy.pregnancyQuarter * 3}个月，准妈妈腹部隆起，能够清晰感受到有力的胎动！`,
    };
  }

  /**
   * 产房分娩迎接入生与新生儿属性生成
   */
  public giveBirth(
    partner: PartnerNPC,
    currentYear: number,
    deliveryMode: "natural" | "c_section" = "natural",
    customName?: string,
    playerFunds: number = 50000,
    annualFamilyIncome: number = 60000,
  ): {
    success: boolean;
    child: ChildNPC;
    finePaid: number;
    msg: string;
    remainingFunds: number;
  } {
    const isBoy = Math.random() >= 0.5;
    const gender = isBoy ? ("boy" as const) : ("girl" as const);

    const defaultBoys = ["子轩", "浩然", "梓晨", "宇辰", "嘉豪", "俊熙", "博文", "奕鸣"];
    const defaultGirls = ["若曦", "雨桐", "欣怡", "梓涵", "语嫣", "思涵", "梦瑶", "心怡"];
    const chosenName =
      customName && customName.trim().length > 0
        ? customName.trim()
        : isBoy
        ? defaultBoys[Math.floor(Math.random() * defaultBoys.length)]
        : defaultGirls[Math.floor(Math.random() * defaultGirls.length)];

    // 综合父母属性进行遗传计算
    const baseIntel = Math.round(partner.intelligence * 0.5 + 40 + Math.random() * 15);
    const baseHealth = Math.round(this.pregnancy.fetalHealth * 0.8 + Math.random() * 15);
    const baseArt = Math.round(30 + Math.random() * 40);
    const baseAthletics = Math.round(30 + Math.random() * 40);

    // 随机发掘特长潜质
    const allTalentPool = [
      "过目不忘 · 强记博闻",
      "音律敏锐 · 绝对音感",
      "逻辑清晰 · 数理奇才",
      "身手矫健 · 运动天赋",
      "灵心巧手 · 丹青绘艺",
      "情商极高 · 善解人意",
      "动手能力 · 极客思维",
    ];
    const pickedTalent = allTalentPool[Math.floor(Math.random() * allTalentPool.length)];

    const newChild: ChildNPC = {
      id: `child_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: chosenName,
      gender,
      birthYear: currentYear,
      age: 0,
      health: Math.min(100, baseHealth),
      happiness: 95,
      intelligence: Math.min(100, baseIntel),
      artistry: Math.min(100, baseArt),
      athleticism: Math.min(100, baseAthletics),
      intimacy: 90,
      stage: "infant",
      talents: [pickedTalent],
      enrolledCourses: [],
      diaryNotes: [`${currentYear}年：诞生于世，母子平安，哇哇啼哭响彻产房！特长天赋潜质：【${pickedTalent}】。`],
    };

    // 计生政策与罚款结算
    const compliance = this.checkPolicyCompliance(currentYear, annualFamilyIncome);
    let finePaid = 0;
    let funds = playerFunds;
    if (!compliance.isCompliant) {
      finePaid = compliance.fineYuan;
      this.paidSocialFinesTotal += finePaid;
      funds = Math.max(0, funds - finePaid);
      newChild.diaryNotes.push(`出生时因超出【${compliance.policy.name}】指标，家庭如实缴纳社会抚养费 ¥${finePaid}。`);
    }

    this.children.push(newChild);

    // 重置孕期状态
    this.pregnancy = {
      isPregnant: false,
      pregnancyQuarter: 0,
      fetalHealth: 100,
      motherCondition: 100,
      prenatalCheckCount: 0,
    };

    partner.maritalSatisfaction = Math.min(100, partner.maritalSatisfaction + 15);

    const deliveryDesc = deliveryMode === "c_section" ? "剖宫产手术顺利" : "顺产十分顺利";
    const policyMsg = compliance.isCompliant
      ? "符合国家计划生育政策，喜迎掌上明珠！"
      : `属于计划外生育，依法缴纳社会抚养费 ¥${finePaid}。`;

    return {
      success: true,
      child: newChild,
      finePaid,
      remainingFunds: funds,
      msg: `🍼 恭喜！${deliveryDesc}，新生${gender === "boy" ? "男宝" : "女宝"}【${chosenName}】平安降生！${policyMsg}`,
    };
  }

  /**
   * 亲子互动（喂养早教、讲绘本、游乐园、促膝长谈）
   */
  public interactWithChild(
    childId: string,
    action: "feed_play" | "read_story" | "park_trip" | "heart_to_heart",
    playerFunds: number,
  ): {
    success: boolean;
    msg: string;
    costYuan: number;
    energyCost: number;
    intimacyGain: number;
    happinessGain: number;
  } {
    const child = this.children.find((c) => c.id === childId);
    if (!child) {
      return { success: false, msg: "未找到该子女信息。", costYuan: 0, energyCost: 0, intimacyGain: 0, happinessGain: 0 };
    }

    if (action === "feed_play") {
      child.intimacy = Math.min(100, child.intimacy + 6);
      child.happiness = Math.min(100, child.happiness + 5);
      child.health = Math.min(100, child.health + 3);
      return {
        success: true,
        msg: `细心调配营养辅食并陪伴【${child.name}】拼积木做早教，宝宝笑得合不拢嘴！`,
        costYuan: 20,
        energyCost: 6,
        intimacyGain: 6,
        happinessGain: 5,
      };
    }

    if (action === "read_story") {
      child.intimacy = Math.min(100, child.intimacy + 8);
      child.intelligence = Math.min(100, child.intelligence + 4);
      child.artistry = Math.min(100, child.artistry + 3);
      return {
        success: true,
        msg: `倚在床头生动地为【${child.name}】朗读经典童话与神话科普绘本，孩子的眼睛里闪烁着求知的光芒！`,
        costYuan: 0,
        energyCost: 8,
        intimacyGain: 8,
        happinessGain: 4,
      };
    }

    if (action === "park_trip") {
      if (playerFunds < 100) {
        return { success: false, msg: "资金不足以支付游乐园门票与零食玩具费用 (¥100)。", costYuan: 0, energyCost: 0, intimacyGain: 0, happinessGain: 0 };
      }
      child.intimacy = Math.min(100, child.intimacy + 12);
      child.happiness = Math.min(100, child.happiness + 15);
      child.athleticism = Math.min(100, child.athleticism + 5);
      return {
        success: true,
        msg: `全家一同前往主题游乐园坐旋转木马、吃冰淇淋，【${child.name}】欢呼雀跃，留下了珍贵的童年合影！`,
        costYuan: 100,
        energyCost: 15,
        intimacyGain: 12,
        happinessGain: 15,
      };
    }

    if (action === "heart_to_heart") {
      child.intimacy = Math.min(100, child.intimacy + 10);
      child.happiness = Math.min(100, child.happiness + 8);
      return {
        success: true,
        msg: `与【${child.name}】像朋友一样促膝长谈，倾听孩子成长中的小秘密与烦恼并予以肯定鼓励，亲子信任倍增！`,
        costYuan: 0,
        energyCost: 8,
        intimacyGain: 10,
        happinessGain: 8,
      };
    }

    return { success: true, msg: "互动完成！", costYuan: 0, energyCost: 5, intimacyGain: 3, happinessGain: 3 };
  }

  /**
   * 报名兴趣特长班
   */
  public enrollInterestCourse(
    childId: string,
    courseId: string,
  ): { success: boolean; msg: string } {
    const child = this.children.find((c) => c.id === childId);
    if (!child) return { success: false, msg: "未找到该子女信息。" };

    const course = INTEREST_COURSES_DATABASE.find((c) => c.id === courseId);
    if (!course) return { success: false, msg: "未找到该兴趣班课程。" };

    if (child.enrolledCourses.includes(courseId)) {
      return { success: false, msg: `【${child.name}】已经在学习【${course.name}】了。` };
    }

    child.enrolledCourses.push(courseId);
    child.diaryNotes.push(`报名加入了【${course.name}】，开启了充实而专注的特长进阶之路！`);

    return {
      success: true,
      msg: `成功为【${child.name}】报名【${course.name}】！每季度学费支出 ¥${course.costPerQuarter}。`,
    };
  }

  /**
   * 退出或停报兴趣特长班
   */
  public dropInterestCourse(childId: string, courseId: string): { success: boolean; msg: string } {
    const child = this.children.find((c) => c.id === childId);
    if (!child) return { success: false, msg: "未找到该子女信息。" };

    const idx = child.enrolledCourses.indexOf(courseId);
    if (idx === -1) return { success: false, msg: "该子女并未报名此课程。" };

    child.enrolledCourses.splice(idx, 1);
    return { success: true, msg: `已为【${child.name}】办理停课退班手续。` };
  }

  /**
   * 季度/年度推进子女成长、学费扣减与阶段进化
   */
  public tickChildrenGrowth(
    currentYear: number,
    familyFunds: number,
  ): {
    totalTuitionPaid: number;
    subsidiesReceived: number;
    growthLogs: string[];
    remainingFunds: number;
  } {
    let totalTuition = 0;
    let totalSubsidy = 0;
    const growthLogs: string[] = [];

    const policy = this.getPolicyForYear(currentYear);

    for (const child of this.children) {
      // 1. 育儿补贴发放 (2016全面二孩/2021三孩配套支持)
      if (policy.subsidyPerChildQuarter > 0 && child.age <= 3) {
        totalSubsidy += policy.subsidyPerChildQuarter;
      }

      // 2. 兴趣班学费扣除与属性增长
      for (const cId of child.enrolledCourses) {
        const course = INTEREST_COURSES_DATABASE.find((c) => c.id === cId);
        if (course) {
          totalTuition += course.costPerQuarter;
          child.intelligence = Math.min(100, child.intelligence + course.intelligenceBonus);
          child.artistry = Math.min(100, child.artistry + course.artistryBonus);
          child.athleticism = Math.min(100, child.athleticism + course.athleticismBonus);
          child.happiness = Math.min(100, child.happiness + course.happinessBonus);
        }
      }

      // 3. 年龄与阶段更新 (按年份推移)
      const calculatedAge = currentYear - child.birthYear;
      if (calculatedAge !== child.age) {
        child.age = calculatedAge;
        const oldStage = child.stage;

        if (child.age === 0) child.stage = "infant";
        else if (child.age <= 3) child.stage = "toddler";
        else if (child.age <= 6) child.stage = "preschool";
        else if (child.age <= 12) child.stage = "primary";
        else if (child.age <= 15) child.stage = "junior_high";
        else if (child.age <= 18) child.stage = "senior_high";
        else if (child.age <= 22) child.stage = "university";
        else child.stage = "adult";

        if (oldStage !== child.stage) {
          const stageNames: Record<ChildStage, string> = {
            infant: "婴儿期",
            toddler: "幼儿期",
            preschool: "学龄前期(幼儿园)",
            primary: "小学阶段",
            junior_high: "初中阶段",
            senior_high: "高中阶段",
            university: "大学阶段",
            adult: "步入社会成年",
          };
          const note = `${currentYear}年(${child.age}岁)：迈入人生新阶段——【${stageNames[child.stage]}】！`;
          child.diaryNotes.push(note);
          growthLogs.push(`【${child.name}】年满${child.age}岁，顺利步入【${stageNames[child.stage]}】！`);
        }
      }
    }

    const netFundDelta = totalSubsidy - totalTuition;
    const finalFunds = Math.max(0, familyFunds + netFundDelta);

    return {
      totalTuitionPaid: totalTuition,
      subsidiesReceived: totalSubsidy,
      growthLogs,
      remainingFunds: finalFunds,
    };
  }
}
