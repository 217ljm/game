export interface SupplyItem {
  id: string;
  name: string;
  icon: string;
  priceYuan: number;
  category: "snack" | "toy" | "stationery" | "daily";
  description: string;
  effect: {
    happiness?: number;
    health?: number;
    intelligence?: number;
    charm?: number;
  };
  narrative: string;
}

export const SUPPLY_COOP_CATALOG: SupplyItem[] = [
  {
    id: "white_rabbit_candy",
    name: "大白兔奶糖 (半两)",
    icon: "🍬",
    priceYuan: 0.15,
    category: "snack",
    description: "经典上海冠生园出品，薄薄米纸融化，浓醇奶香甜透心窝",
    effect: { happiness: 8, health: 1 },
    narrative: "你剥开一颗大白兔丢进嘴里，浓郁奶香弥漫口腔，整个人幸福感爆棚！",
  },
  {
    id: "hawthorn_fruit_bar",
    name: "九制无花果丝",
    icon: "🍡",
    priceYuan: 0.05,
    category: "snack",
    description: "一分钱两包的小塑料袋，酸酸甜甜带白霜，吃完手指都要吮三遍",
    effect: { happiness: 5 },
    narrative: "一根根细长酸甜的无花果丝细嚼慢咽，舌尖生津，是童年放学路上最惬意的零嘴！",
  },
  {
    id: "red_fruit_ice_pop",
    name: "老式红果棒冰",
    icon: "🧊",
    priceYuan: 0.03,
    category: "snack",
    description: "从保温木箱棉被里抽出的冰凉雪糕，酸甜解暑，夏日救星",
    effect: { happiness: 4, health: 2 },
    narrative: "冰凉清脆的红果冰碴在舌尖化开，盛夏的炎热烦躁瞬间一扫而空！",
  },
  {
    id: "tin_jumping_frog",
    name: "经典铁皮发条跳蛙",
    icon: "🐸",
    priceYuan: 0.45,
    category: "toy",
    description: "绿底黑花铁皮青蛙，拧紧发条放在水泥地上能欢快跳跃数十下",
    effect: { happiness: 10, charm: 6 },
    narrative: "拧上两圈发条放在书桌上，小青蛙咔嗒咔嗒欢快蹦跳，引得邻居小孩争相围观！",
  },
  {
    id: "plastic_starting_gun",
    name: "八连发红色塑料发令枪",
    icon: "🔫",
    priceYuan: 0.65,
    category: "toy",
    description: "装上红色塑料圆盘火药帽，扣动扳机发出清脆‘啪’声与淡淡火药香",
    effect: { charm: 8, happiness: 10 },
    narrative: "别在腰间神气活现，一扣扳机啪啪脆响，你成了大院里威风凛凛的警长队长！",
  },
  {
    id: "hero_fountain_pen",
    name: "英雄616高级钨金钢笔",
    icon: "✒️",
    priceYuan: 1.20,
    category: "stationery",
    description: "经典暗尖深绿杆钢笔，吸墨顺滑，练字写作业的得力文具",
    effect: { intelligence: 8, charm: 6 },
    narrative: "吸满纯蓝墨水在作文本上一笔一划书写，字迹工整娟秀，深得语文老师大红勾赞扬！",
  },
];
