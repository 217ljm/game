export interface LifeQuest {
  id: string;
  minAge: number;
  maxAge: number;
  badge: string;
  title: string;
  targetDesc: string;
  rewardTitle: string;
  rewardDesc: string;
  bonus: {
    intelligence?: number;
    charm?: number;
    happiness?: number;
    health?: number;
    cash?: number;
  };
}

export const LIFE_QUESTS_CATALOG: LifeQuest[] = [
  {
    id: "quest_age6_king_of_yard",
    minAge: 0,
    maxAge: 6,
    badge: "👑",
    title: "大院孩子王",
    targetDesc: "在拍画片或大院游戏中战胜伙伴，确立大院领袖声望",
    rewardTitle: "🏅 时代金星 · 大院孩子王勋章",
    rewardDesc: "全大院孩子唯你马首是瞻，不仅声名远扬，更极大磨砺了自信体魄！",
    bonus: { charm: 10, happiness: 10, health: 6 },
  },
  {
    id: "quest_age6_early_literacy",
    minAge: 0,
    maxAge: 6,
    badge: "📖",
    title: "幼小识字启蒙",
    targetDesc: "完成自主认字启蒙与拼音练习，为小学求学筑牢根基",
    rewardTitle: "🌟 时代金星 · 学前小神童勋章",
    rewardDesc: "书卷墨香启迪心智，父母深感荣耀，小学未入学便已锋芒毕露！",
    bonus: { intelligence: 12, charm: 6, happiness: 6 },
  },
  {
    id: "quest_age8_three_goods",
    minAge: 7,
    maxAge: 12,
    badge: "🎖️",
    title: "校级三好学生标兵",
    targetDesc: "品学兼优德智体美劳全面发展，戴上两道杠中队长臂章",
    rewardTitle: "🏆 时代金星 · 三好学生标兵勋章",
    rewardDesc: "红领巾飘荡在胸前，全校广播通报表彰，全家以此为傲！",
    bonus: { intelligence: 15, charm: 12, happiness: 10 },
  },
  {
    id: "quest_age12_shuihu_master",
    minAge: 7,
    maxAge: 14,
    badge: "🎴",
    title: "水浒百将集卡霸主",
    targetDesc: "集齐一套完整水浒天罡地煞卡片，称霸全校集卡圈",
    rewardTitle: "🌟 时代金星 · 水浒集卡大宗师勋章",
    rewardDesc: "集卡册翻开的一刻金光夺目，整个少年时代的狂热与传说永铸心底！",
    bonus: { charm: 14, happiness: 15, intelligence: 8 },
  },
];
