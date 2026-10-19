/**
 * ============================================================================
 * 游戏核心配置与全局物理参数 (GameConfig.js)
 * ----------------------------------------------------------------------------
 * 包含 1920x1080 标准画幅、FIT 缩放、Arcade 物理引擎配置及全系统通用常量
 * ============================================================================
 */

import Phaser from 'phaser';

/**
 * 核心分辨率与画布尺寸
 */
export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;

/**
 * 渲染深度分层枚举 (Layer Depths)
 * 严格管理场景内所有渲染对象的 z-index 顺序，避免层级穿插
 */
export const LAYER_DEPTH = Object.freeze({
  BACKGROUND: 0,         // 背景与地形底图
  DECORATION_LOW: 5,     // 低层地面装饰物（坑洼、落叶、地砖纹理）
  GROUND_DECALS: 10,     // 地面法阵、焦痕、静态印记
  TELEGRAPH: 20,         // 攻击预警红圈、地面引导线（位于角色下方，保证清晰可见）
  DROPS: 30,             // 掉落物（经验晶体、金币、宝箱）
  SHADOWS: 35,           // 实体投影（圆形渐变阴影）
  CHARACTERS: 40,        // 游戏实体（主角、小怪、精英怪、Boss）
  PROJECTILES: 50,       // 飞行投射物（剑气、火球、暗影弹）
  EFFECTS: 60,           // 攻击爆破特效、打击火花、升级光柱
  UI_WORLD: 70,          // 世界空间 UI（头顶血条、飘字伤害数值、名牌）
  UI_SCREEN: 100,        // 屏幕固定 HUD（玩家血蓝条、技能栏、小地图）
  MODAL: 200,            // 弹窗与结算界面（升级选卡、暂停面板）
  CURSOR: 999            // 自定义准星指针
});

/**
 * 物理碰撞分类掩码 (Collision Categories)
 * 用于物理检测与射线判定的逻辑隔离
 */
export const COLLISION_GROUPS = Object.freeze({
  PLAYER: 'player',
  ENEMY: 'enemy',
  PLAYER_PROJECTILE: 'player_projectile',
  ENEMY_PROJECTILE: 'enemy_projectile',
  OBSTACLES: 'obstacles',
  PICKUPS: 'pickups'
});

/**
 * 全局事件名称字典 (Game Events)
 */
export const GAME_EVENTS = Object.freeze({
  // 玩家事件
  PLAYER_DAMAGED: 'player:damaged',
  PLAYER_HEALED: 'player:healed',
  PLAYER_SHIELD_CHANGED: 'player:shield_changed',
  PLAYER_DIED: 'player:died',
  PLAYER_EXP_GAINED: 'player:exp_gained',
  PLAYER_LEVEL_UP: 'player:level_up',
  PLAYER_SKILL_CAST: 'player:skill_cast',

  // 敌人事件
  ENEMY_SPAWNED: 'enemy:spawned',
  ENEMY_DAMAGED: 'enemy:damaged',
  ENEMY_DIED: 'enemy:died',
  TELEGRAPH_START: 'enemy:telegraph_start',
  TELEGRAPH_END: 'enemy:telegraph_end',

  // 战斗与掉落事件
  PROJECTILE_HIT: 'combat:projectile_hit',
  DROP_SPAWNED: 'drop:spawned',
  DROP_COLLECTED: 'drop:collected'
});

/**
 * 视觉色彩常量表
 */
export const COLOR_PALETTE = Object.freeze({
  TELEGRAPH_FILL: 0xff1744,       // 预警圈内部填充红（鲜红）
  TELEGRAPH_BORDER: 0xff5252,     // 预警圈边缘警戒红
  TELEGRAPH_ALPHA: 0.25,          // 预警圈初始透明度
  HEALTH_BAR: 0x00e676,           // 血条亮绿
  HEALTH_BAR_BG: 0x263238,        // 血条底色暗灰
  SHIELD_BAR: 0x00b0ff,           // 护盾亮蓝
  EXP_BAR: 0xffd600,              // 经验金黄
  EXP_CRYSTAL: 0x00e5ff,          // 经验晶体荧光青
  GOLD_COIN: 0xffc107,            // 金币金橙
  DAMAGE_TEXT_PHYSICAL: '#ffffff',// 物理伤害白色
  DAMAGE_TEXT_FIRE: '#ff7043',    // 火焰伤害橙色
  DAMAGE_TEXT_CRIT: '#ffd700',    // 暴击伤害亮金
  DAMAGE_TEXT_PLAYER_HURT: '#ff1744' // 玩家受击红色
});

/**
 * 全局物理引擎参数 (Arcade Physics)
 */
export const PHYSICS_CONFIG = Object.freeze({
  default: 'arcade',
  arcade: {
    gravity: { x: 0, y: 0 },      // 俯视角 ARPG 顶视图：全场景无重力
    debug: false,                 // 默认关闭调试物理框，开发时可通过调试工具激活
    debugShowBody: true,
    debugShowVelocity: true,
    fps: 60,
    fixedStep: true,
    overlapBias: 4
  }
});

/**
 * 主角基础行动与物理常数
 */
export const PLAYER_PHYSICS = Object.freeze({
  MAX_SPEED: 340,                 // 最大奔跑速度 (px/s)
  ACCELERATION: 1800,             // 起步加速度
  DRAG: 1500,                     // 减速阻尼 (地面摩擦力)
  DASH_SPEED: 950,                // 冲刺爆发瞬间初速度
  DASH_DURATION: 220,             // 冲刺持续毫秒数
  DASH_COOLDOWN: 2000,            // 冲刺冷却毫秒数
  INVULNERABLE_DURATION: 300      // 受击短暂无敌保护时间 (ms)
});

/**
 * 创建 Phaser 游戏实例配置
 * @param {Array<Phaser.Scene|Function>} sceneList - 场景数组
 * @param {Object} [overrides={}] - 允许按需覆盖的部分参数
 * @returns {Phaser.Types.Core.GameConfig}
 */
export function createPhaserConfig(sceneList = [], overrides = {}) {
  return {
    type: Phaser.AUTO,
    parent: overrides.parent || 'game-container',
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    backgroundColor: '#0c0d14',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT
    },
    physics: PHYSICS_CONFIG,
    scene: sceneList,
    render: {
      pixelArt: false,
      antialias: true,
      roundPixels: true,
      powerPreference: 'high-performance'
    },
    audio: {
      noAudio: false
    },
    ...overrides
  };
}

export default {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  LAYER_DEPTH,
  COLLISION_GROUPS,
  GAME_EVENTS,
  COLOR_PALETTE,
  PHYSICS_CONFIG,
  PLAYER_PHYSICS,
  createPhaserConfig
};
