/**
 * 运行时美术素材键清单（AssetKey）
 * 遵循展示层契约（Presentation Contract），场景与核心逻辑只能引用键名，严禁直接硬编码文件路径。
 *
 * 视觉画风规范：1978 年代写实油画质感、时代生活气息与纪实温情。
 */
export type AssetKey =
  // 角色与人物立绘 (Character & Portraits)
  | "player.childNeutral"
  | "character.ageAtlas"
  | "character.primaryTeacher"
  // 行动卡视觉纹理 (Action Card Visuals)
  | "action.study"
  | "action.play"
  | "action.family"
  // 场景与环境全景背景 (Scene & Environment Backdrops)
  | "scene.title"
  | "scene.growth"
  | "scene.relations"
  | "scene.timeline"
  | "scene.memory";

/** 素材资产元数据定义 */
export interface ImageAssetDefinition {
  readonly type: "image";
  readonly key: AssetKey;
  readonly src: string;
  /** 视觉用途与年代感描述 */
  readonly description?: string;
  /** 素材分类 */
  readonly category?: "character" | "action" | "scene";
  /** 现有文件为冻结前的运行时输入资产 */
  readonly status: "runtime-input";
  readonly fallback: "procedural";
}

/**
 * 游戏核心美术资产清单 (Asset Manifest)
 * 映射 1978 历史年代感素材，确保写实画风的父母怀抱婴儿、年代场景及角色立绘正常加载与访问。
 */
export const ASSET_MANIFEST = [
  // 角色立绘
  {
    type: "image",
    key: "player.childNeutral",
    src: new URL("../../../../public/assets/life-stage/player-1984.webp", import.meta.url).href,
    category: "character",
    description: "1984 年代写实儿童中性立绘，用于成长阶段入口与主生活界面主角形象",
    status: "runtime-input",
    fallback: "procedural",
  },
  {
    type: "image",
    key: "character.ageAtlas",
    src: new URL("../../../../public/assets/life-stage/character-age-atlas-v1.webp", import.meta.url).href,
    category: "character",
    description: "角色多时期成长图集 Atlas，支持不同年龄段的形象切换与演进",
    status: "runtime-input",
    fallback: "procedural",
  },
  {
    type: "image",
    key: "character.primaryTeacher",
    src: new URL("../../../../public/assets/life-stage/primary-1984-base.webp", import.meta.url).href,
    category: "character",
    description: "1984 年代小学老师/长辈写实人物立绘，用于师生关系与学校互动",
    status: "runtime-input",
    fallback: "procedural",
  },

  // 行动卡纹理
  {
    type: "image",
    key: "action.study",
    src: new URL("../../../../public/assets/life-stage/action-study.webp", import.meta.url).href,
    category: "action",
    description: "专注书本与学习写实插画，用于季度学习与智力成长行动卡",
    status: "runtime-input",
    fallback: "procedural",
  },
  {
    type: "image",
    key: "action.play",
    src: new URL("../../../../public/assets/life-stage/action-play.webp", import.meta.url).href,
    category: "action",
    description: "户外玩耍与伙伴嬉戏写实插画，用于童年娱乐与体能行动卡",
    status: "runtime-input",
    fallback: "procedural",
  },
  {
    type: "image",
    key: "action.family",
    src: new URL("../../../../public/assets/life-stage/action-family.webp", import.meta.url).href,
    category: "action",
    description: "1978 年代写实油画质感父母怀抱啼哭婴儿/家庭温情插画，用于出生睁眼/父母对白全屏背景及家庭行动卡",
    status: "runtime-input",
    fallback: "procedural",
  },

  // 场景与环境背景
  {
    type: "image",
    key: "scene.title",
    src: new URL("../../../../public/assets/game-shell/title-1978.webp", import.meta.url).href,
    category: "scene",
    description: "1978 时代主题主界面大图（晨光与时代街景），承载主菜单与时代序章全屏背景",
    status: "runtime-input",
    fallback: "procedural",
  },
  {
    type: "image",
    key: "scene.growth",
    src: new URL("../../../../public/assets/game-shell/growth-room.webp", import.meta.url).href,
    category: "scene",
    description: "1978 年代温馨居室/木窗暖阳场景，用于创角起名阶段与成长学习生活模块背景",
    status: "runtime-input",
    fallback: "procedural",
  },
  {
    type: "image",
    key: "scene.relations",
    src: new URL("../../../../public/assets/game-shell/relations-courtyard.webp", import.meta.url).href,
    category: "scene",
    description: "1978 年代红砖大院/邻里生活场景，用于突发事件与人际关系模块背景",
    status: "runtime-input",
    fallback: "procedural",
  },
  {
    type: "image",
    key: "scene.timeline",
    src: new URL("../../../../public/assets/game-shell/timeline-road.webp", import.meta.url).href,
    category: "scene",
    description: "时代沧桑漫漫人生路写实场景，用于季度总结、年度回顾与人生历程时间线背景",
    status: "runtime-input",
    fallback: "procedural",
  },
  {
    type: "image",
    key: "scene.memory",
    src: new URL("../../../../public/assets/game-shell/memory-room.webp", import.meta.url).href,
    category: "scene",
    description: "1978 年代怀旧红木桌与老物件居室场景，用于周岁抓周礼全屏背景与兴趣模块背景",
    status: "runtime-input",
    fallback: "procedural",
  },
] as const satisfies readonly ImageAssetDefinition[];

export const ASSET_KEYS = ASSET_MANIFEST.map(({ key }) => key) as readonly AssetKey[];

/**
 * 根据 AssetKey 获取对应素材的完整定义
 */
export function getAssetDefinition(key: AssetKey): ImageAssetDefinition {
  const asset = ASSET_MANIFEST.find((entry) => entry.key === key);
  if (!asset) throw new Error(`未知素材 key: ${key}`);
  return asset;
}
