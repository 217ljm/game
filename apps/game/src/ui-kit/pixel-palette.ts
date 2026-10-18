/**
 * 复古像素调色盘 (Retro Pixel Palette)
 * 经典红白机/复古模拟器专属色阶：强调暖调、低饱和度、高对比度与像素质感
 * 精选六大核心时代色系：胡桃木棕、青铜绿、帝王金、羊皮纸白、绯红、天青
 */

// 1. 胡桃木棕色系 (Walnut Brown) - 边框、实木展台与像素外棱
export const WALNUT_PALETTE = {
  deep: 0x231810,        // 极深胡桃木 (底座暗影与阴影槽)
  dark: 0x4a3425,        // 深胡桃木外边框 (主木框色)
  medium: 0x61442f,      // 中度胡桃木纹
  light: 0x7c593f,       // 浅胡桃木高光棱 (立体高光边)
  highlight: 0x936b4c,   // 顶级原木反光
} as const;

// 2. 青铜/翠绿色系 (Bronze / Jade Green) - 健康、成长、经验与积极状态
export const BRONZE_GREEN_PALETTE = {
  dark: 0x1b5e20,        // 墨绿暗部
  bronze: 0x2e5c38,      // 典雅青铜古绿
  jade: 0x388e3c,        // 像素翡翠绿 (主健康绿)
  bright: 0x4caf50,      // 亮绿光芒
  highlight: 0x81c784,   // 绿色高光
} as const;

// 3. 帝王金/黄铜色系 (Imperial Gold / Brass) - 角花、奖杯、高光与尊贵品质
export const IMPERIAL_GOLD_PALETTE = {
  shadow: 0x4f3702,      // 沉金深阴影
  brass: 0xb5891a,       // 仿古黄铜暗金
  accent: 0xd4a017,      // 像素复古琥珀金 (核心主金色)
  imperial: 0xdaa520,    // 帝王纯金
  highlight: 0xf5cf45,   // 像素高光金 (闪耀金)
  glint: 0xfff59d,       // 璀璨星芒白金
} as const;

// 4. 羊皮纸白色系 (Parchment White / Ivory) - 纸面、信息面板与复古底衬
export const PARCHMENT_PALETTE = {
  light: 0xfbf6ea,       // 暖象牙复古浅底 (主纸面)
  warm: 0xf5eedb,        // 柔和米黄羊皮纸
  dark: 0xede0c8,        // 复古泛黄牛皮纸底
  shadow: 0xdbc4a5,      // 纸面折痕微影
  border: 0x8d775f,      // 复古卡片内衬线
} as const;

// 5. 绯红色系 (Crimson / Vermilion) - 警告、危机、扣减、疲劳与红领巾
export const CRIMSON_PALETTE = {
  shadow: 0x5b0606,      // 极深血红底座
  deep: 0x9a1515,        // 深绯红暗部
  crimson: 0xd32f2f,     // 像素正绯红 (主警告/扣除)
  scarlet: 0xe53935,     // 鲜亮朱红 (红领巾/五星)
  highlight: 0xef5350,   // 绯红受光亮棱
} as const;

// 6. 天青/电竞青色系 (Azure / Sky Blue / Cyan) - 智力、专注、学业与电竞未来
export const AZURE_CYAN_PALETTE = {
  deep: 0x004d40,        // 极深海青
  cyanDark: 0x00838f,    // 像素电竞青 (主电竞/反应)
  azure: 0x00acc1,       // 鲜明天青
  skyBlue: 0x1976d2,     // 像素湛蓝 (主学业/智力)
  highlight: 0x4dd0e1,   // 霓虹青高光
} as const;

/**
 * 像素核心调色板汇总对象 (全系统完全向后兼容)
 */
export const pixelPalette = {
  // --- 1. 底色与纸面 (羊皮纸白) ---
  parchmentLight: PARCHMENT_PALETTE.light,    // 0xfbf6ea 暖象牙复古浅底
  parchmentDark: PARCHMENT_PALETTE.dark,      // 0xede0c8 复古泛黄牛皮纸底
  parchmentWarm: PARCHMENT_PALETTE.warm,      // 0xf5eedb 柔和米黄羊皮纸

  // --- 2. 边框与展台 (胡桃木棕) ---
  woodFrameDark: WALNUT_PALETTE.dark,         // 0x4a3425 深胡桃木外边框
  woodFrameLight: WALNUT_PALETTE.light,       // 0x7c593f 浅胡桃木高光棱
  walnutDeep: WALNUT_PALETTE.deep,            // 0x231810 极深胡桃木
  walnutMedium: WALNUT_PALETTE.medium,        // 0x61442f 中度胡桃木纹
  walnutHighlight: WALNUT_PALETTE.highlight,  // 0x936b4c 原木反光棱

  // --- 3. 贵金属与角花 (帝王金 / 黄铜) ---
  goldAccent: IMPERIAL_GOLD_PALETTE.accent,         // 0xd4a017 像素复古琥珀金
  goldHighlight: IMPERIAL_GOLD_PALETTE.highlight,   // 0xf5cf45 像素高光金
  imperialGold: IMPERIAL_GOLD_PALETTE.imperial,     // 0xdaa520 帝王纯金
  brassGold: IMPERIAL_GOLD_PALETTE.brass,           // 0xb5891a 仿古黄铜
  goldShadow: IMPERIAL_GOLD_PALETTE.shadow,         // 0x4f3702 沉金深阴影
  goldGlint: IMPERIAL_GOLD_PALETTE.glint,           // 0xfff59d 璀璨星芒白金

  // --- 4. 状态与属性标志色 ---
  pixelGreen: BRONZE_GREEN_PALETTE.jade,            // 0x388e3c 像素翠绿 (健康/成长/加成)
  bronzeGreen: BRONZE_GREEN_PALETTE.bronze,         // 0x2e5c38 青铜古绿
  greenHighlight: BRONZE_GREEN_PALETTE.highlight,   // 0x81c784 绿色高光
  pixelRed: CRIMSON_PALETTE.crimson,                // 0xd32f2f 像素绯红 (危机/扣减/疲劳)
  crimsonScarlet: CRIMSON_PALETTE.scarlet,          // 0xe53935 鲜亮朱红
  pixelBlue: AZURE_CYAN_PALETTE.skyBlue,            // 0x1976d2 像素湛蓝 (智力/专注/学业)
  pixelPurple: 0x7b1fa2,                            // 0x7b1fa2 像素紫罗兰 (魅力/声望/艺术)
  pixelCyan: AZURE_CYAN_PALETTE.cyanDark,           // 0x00838f 像素电竞青 (电竞/微操/反应)
  azureSky: AZURE_CYAN_PALETTE.azure,               // 0x00acc1 鲜明天青

  // --- 5. 界面文字与阴影 ---
  charcoalInk: 0x211c18,       // 纯正像素深炭黑 (主标题与正文)
  bodyMuted: 0x5a5147,         // 次级说明深灰褐色
  cardBorder: PARCHMENT_PALETTE.border, // 0x8d775f 复古卡片内衬线
  innerShadow: 0x000000,       // 像素深凹槽阴影
} as const;

/**
 * 将数值颜色转换为 hex CSS 字符串 (如 0xd4a017 -> "#d4a017")
 */
export function toColorString(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

/**
 * 根据数值比例 (0~1) 计算健康条过渡色阶
 */
export function getHealthColor(ratio: number): number {
  const clamped = Math.max(0, Math.min(1, ratio));
  if (clamped > 0.6) return pixelPalette.pixelGreen;
  if (clamped > 0.25) return pixelPalette.goldAccent;
  return pixelPalette.pixelRed;
}
