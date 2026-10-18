export interface VehicleOption {
  id: string;
  name: string;
  icon: string;
  costYuan: number;
  energySavePerQuarter: number; // 每季节省精力点数
  minEraYear: number;
  desc: string;
}

export const VEHICLES_DATABASE: VehicleOption[] = [
  { id: "walk", name: "双腿步行与公共汽车", icon: "🚶", costYuan: 0, energySavePerQuarter: 0, minEraYear: 1970, desc: "绿色出行，但耗费较多路途体力与时间。" },
  { id: "bicycle", name: "永久牌大二八加重自行车", icon: "🚲", costYuan: 160, energySavePerQuarter: 5, minEraYear: 1970, desc: "80年代三大件之一，骑上飞驰在大街小巷！" },
  { id: "motorcycle", name: "嘉陵70 / 幸福250摩托车", icon: "🏍️", costYuan: 2800, energySavePerQuarter: 12, minEraYear: 1985, desc: "轰鸣作响，90年代街头最拉风的代步利器！" },
  { id: "sedan", name: "大众桑塔纳 / 家用轿车", icon: "🚗", costYuan: 85000, energySavePerQuarter: 20, minEraYear: 1995, desc: "拥有私家车，风雨无阻，显著节省通勤时间！" },
  { id: "ev_car", name: "高端智能新能源汽车", icon: "🚙", costYuan: 220000, energySavePerQuarter: 25, minEraYear: 2018, desc: "智能辅助驾驶与极致静谧体验，新时代高品质出行！" },
];
