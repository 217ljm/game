export interface DecadeConfig {
  decade: "70s" | "80s" | "90s" | "00s";
  label: string;
  yearRange: [number, number];
  themeTag: string;
  description: string;
}

export const DECADES_DATABASE: DecadeConfig[] = [
  {
    decade: "70s",
    label: "70后 (1970~1979)",
    yearRange: [1970, 1979],
    themeTag: "改革春风 · 恢复高考 · 艰苦奋斗",
    description: "出生于改革开放春雷响起的年代，见证粮票肉票向市场经济的伟大跨越！",
  },
  {
    decade: "80s",
    label: "80后 (1980~1989)",
    yearRange: [1980, 1989],
    themeTag: "独生子女 · 下海经商 · 千禧跨越",
    description: "伴随着红白机、小浣熊卡与时代飞速发展成长，承担承前启后的时代重任！",
  },
  {
    decade: "90s",
    label: "90后 (1990~1999)",
    yearRange: [1990, 1999],
    themeTag: "互联网浪潮 · 高校扩招 · 电竞崛起",
    description: "生于互联网与PC爆发前夕，见证中国加入世贸与电竞登上世界舞台！",
  },
  {
    decade: "00s",
    label: "00后 (2000~2009)",
    yearRange: [2000, 2009],
    themeTag: "移动互联 · 新高考 · LPL鼎盛时代",
    description: "生于新世纪移动互联时代，视野开阔、个性飞扬，拥抱多元时代浪潮！",
  },
];

export interface ProvinceCityInfo {
  id: string;
  name: string;
  tier: string;
  tierName: string;
  examDifficulty: number;
  baseEconomy: number;
  desc: string;
}

export const PROVINCE_DATABASE: ProvinceCityInfo[] = [
  { id: "beijing", name: "北京", tier: "tier_1", tierName: "一线直辖市", examDifficulty: 0.85, baseEconomy: 1.5, desc: "全国政治文化中心，名校云集，竞争激烈但本地录取率高" },
  { id: "shanghai", name: "上海", tier: "tier_1", tierName: "一线直辖市", examDifficulty: 0.85, baseEconomy: 1.6, desc: "国际经济金融中心，海派文化，商业与金融机会极其丰富" },
  { id: "guangdong", name: "广东 (广州/深圳)", tier: "tier_1", tierName: "沿海经济大省", examDifficulty: 1.0, baseEconomy: 1.4, desc: "改革开放前沿阵地，务实创新，商贸与互联网产业发达" },
  { id: "jiangsu", name: "江苏 (南京/苏州)", tier: "tier_2", tierName: "江南文脉强省", examDifficulty: 1.2, baseEconomy: 1.3, desc: "崇文重教，苏南实体经济繁荣，高考难度号称全国前列" },
  { id: "zhejiang", name: "浙江 (杭州/宁波)", tier: "tier_2", tierName: "民营经济强省", examDifficulty: 1.15, baseEconomy: 1.35, desc: "电商之都与民营之乡，敢为人先，商业氛围极其浓厚" },
  { id: "shandong", name: "山东 (济南/青岛)", tier: "tier_2", tierName: "齐鲁高考大省", examDifficulty: 1.3, baseEconomy: 1.0, desc: "孔孟之乡，体制文化与重工业底蕴深厚，考学极其内卷" },
  { id: "henan", name: "河南 (郑州/洛阳)", tier: "tier_3", tierName: "中原人口大省", examDifficulty: 1.4, baseEconomy: 0.85, desc: "百万考生过独木桥，中原腹地，勤劳坚韧走遍天下" },
  { id: "sichuan", name: "四川 (成都/绵阳)", tier: "tier_2", tierName: "天府之国", examDifficulty: 1.05, baseEconomy: 1.05, desc: "巴适悠闲与电子信息产业并进，美食与文创极具特色" },
  { id: "hubei", name: "湖北 (武汉)", tier: "tier_2", tierName: "九省通衢科教强省", examDifficulty: 1.15, baseEconomy: 1.05, desc: "百所高校云集，光谷科技蓬勃，教育底蕴扎实" },
  { id: "shaanxi", name: "陕西 (西安)", tier: "tier_3", tierName: "西北科教枢纽", examDifficulty: 1.1, baseEconomy: 0.95, desc: "十三朝古都，军工与高校实力雄厚，文化底蕴深远" },
];

export class BirthConfigManager {
  public selectedDecade: DecadeConfig = DECADES_DATABASE[1];
  public selectedProvince: ProvinceCityInfo = PROVINCE_DATABASE[0];
  public chosenBirthYear: number = 1982;

  setDecade(decadeKey: "70s" | "80s" | "90s" | "00s"): void {
    const found = DECADES_DATABASE.find((d) => d.decade === decadeKey);
    if (found) {
      this.selectedDecade = found;
      const [minY, maxY] = found.yearRange;
      this.chosenBirthYear = Math.floor(minY + Math.random() * (maxY - minY + 1));
    }
  }

  setProvince(provinceId: string): void {
    const found = PROVINCE_DATABASE.find((p) => p.id === provinceId);
    if (found) this.selectedProvince = found;
  }
}
