/**
 * ============================================================================
 * 敌人数据与行为配置 (EnemyData.js)
 * ----------------------------------------------------------------------------
 * 定义普通怪（骷髅战士）、远程怪（暗影法师）、Boss（暗黑龙骑士）的属性、
 * 移动速度、攻击判定半径、攻击前摇时间 (Telegraph 0.5s~0.8s)、掉落物与 AI 模式
 * ============================================================================
 */

/**
 * 敌人类型枚举
 */
export const ENEMY_TYPES = Object.freeze({
  SKELETON: 'skeleton',           // 普通近战怪：骷髅战士
  MAGE: 'shadow_mage',            // 远程施法怪：暗影法师
  BOSS_DRAGON: 'boss_dragon'      // 首领级 Boss：暗黑龙骑士
});

/**
 * 敌人 AI 行为状态枚举
 */
export const ENEMY_AI_MODES = Object.freeze({
  MELEE_CHASE: 'melee_chase',       // 贴身近战追击
  RANGED_KITE: 'ranged_kite',       // 远程风筝游走 (保持安全距离放风筝)
  BOSS_HYBRID: 'boss_hybrid'        // Boss 复合行动模式 (近战重劈 + 远程突进 + 大招蓄力)
});

/**
 * 各类型怪物详细属性与行为数据字典
 */
export const ENEMY_CONFIGS = Object.freeze({
  // --------------------------------------------------------------------------
  // 1. 普通近战怪：骷髅战士 (Skeleton Warrior)
  // --------------------------------------------------------------------------
  [ENEMY_TYPES.SKELETON]: {
    id: ENEMY_TYPES.SKELETON,
    name: '骷髅先锋战士',
    category: 'minion',
    aiMode: ENEMY_AI_MODES.MELEE_CHASE,
    spriteKey: 'enemy_skeleton',
    hitboxWidth: 36,
    hitboxHeight: 48,
    scale: 1.0,

    // 生命与基础属性
    maxHp: 130,
    defense: 5,
    moveSpeed: 175,                 // 移动速度 (px/s)
    acceleration: 900,
    knockbackResistance: 0.15,      // 击退抗性 (0 为完全不抗击退，1 为霸体)

    // 索敌与感知
    detectionRange: 650,            // 视野警戒索敌半径
    loseTargetRange: 900,           // 丢失目标脱战半径

    // 攻击与预警 (Telegraph)
    attackRange: 75,                // 进入攻击判定的贴身距离
    attackRadius: 85,               // 攻击造成的伤害圆/扇形半径
    attackDamage: 22,               // 挥砍物理伤害
    attackCooldown: 1400,           // 攻击间隔 (ms)
    telegraphDuration: 600,         // 攻击前摇红圈预警时长 (0.6s，严格在 0.5s~0.8s 规范内)
    telegraphShape: 'circle',       // 预警区域形状：圆形
    telegraphColor: 0xff1744,       // 警戒红
    telegraphAlpha: 0.35,

    // 掉落物配置
    drops: {
      exp: 18,                      // 掉落经验值
      gold: 12,                     // 掉落金币
      expCrystalType: 'small',      // 经验晶体规格
      dropProbability: 1.0          // 必定掉落
    }
  },

  // --------------------------------------------------------------------------
  // 2. 远程施法怪：暗影法师 (Shadow Mage)
  // --------------------------------------------------------------------------
  [ENEMY_TYPES.MAGE]: {
    id: ENEMY_TYPES.MAGE,
    name: '深渊暗影法师',
    category: 'elite',
    aiMode: ENEMY_AI_MODES.RANGED_KITE,
    spriteKey: 'enemy_shadow_mage',
    hitboxWidth: 32,
    hitboxHeight: 46,
    scale: 1.0,

    // 生命与基础属性
    maxHp: 95,
    defense: 2,
    moveSpeed: 130,                 // 移速偏慢
    acceleration: 650,
    knockbackResistance: 0.1,       // 容易被近身打断

    // 索敌与保持距离
    detectionRange: 800,
    preferredDistance: 420,         // 期望保持的最佳施法距离
    fleeDistance: 200,              // 当玩家过近时触发后撤脱离
    loseTargetRange: 1050,

    // 攻击与弹道预警 (Telegraph)
    attackRange: 500,               // 施法最大有效距离
    attackRadius: 65,               // 暗影法球落地爆破范围
    attackDamage: 28,               // 魔法暗影伤害
    attackCooldown: 2600,           // 施法攻击间隔 (ms)
    telegraphDuration: 700,         // 攻击前摇法阵预警时长 (0.7s)
    telegraphShape: 'targeted_circle', // 预警形状：瞄准玩家落点的引导圈
    telegraphColor: 0xaa00ff,       // 邪能深紫色预警
    telegraphAlpha: 0.4,

    // 投射物属性
    projectileConfig: {
      key: 'projectile_shadow_bolt',
      speed: 420,
      radius: 16,
      lifetime: 2000,
      pierceCount: 1,
      knockbackForce: 120
    },

    // 掉落物配置
    drops: {
      exp: 35,
      gold: 25,
      expCrystalType: 'medium',
      dropProbability: 1.0
    }
  },

  // --------------------------------------------------------------------------
  // 3. 首领 Boss：暗黑龙骑士 (Dark Dragon Knight)
  // --------------------------------------------------------------------------
  [ENEMY_TYPES.BOSS_DRAGON]: {
    id: ENEMY_TYPES.BOSS_DRAGON,
    name: '湮灭之刃·暗黑龙骑士',
    category: 'boss',
    aiMode: ENEMY_AI_MODES.BOSS_HYBRID,
    spriteKey: 'enemy_boss_dragon',
    hitboxWidth: 80,
    hitboxHeight: 110,
    scale: 1.8,                     // Boss 巨型体型

    // 巨额血量与高抗性
    maxHp: 3600,
    defense: 22,
    moveSpeed: 145,
    acceleration: 1100,
    knockbackResistance: 0.92,      // 极强霸体，几乎免疫一般位移击退

    // 全图范围警戒
    detectionRange: 1800,
    loseTargetRange: 9999,

    // 普攻：重劈破地斩
    attackRange: 160,
    attackRadius: 180,              // 巨剑横扫判定大范围
    attackDamage: 65,
    attackCooldown: 2000,
    telegraphDuration: 650,         // 普攻大剑蓄力预警 (0.65s)
    telegraphShape: 'circle',
    telegraphColor: 0xd50000,

    // 技能：灭世龙炎冲撞 / 震地龙吼 (阶段技能)
    specialSkill: {
      name: '灭世龙炎重踏',
      triggerHpPercent: 0.5,        // 血量低于 50% 进入二阶段狂暴
      cooldown: 7000,
      telegraphDuration: 800,       // 全屏特大招预警红圈 (0.8s)
      radius: 280,
      damage: 110,
      stunPlayer: 700
    },

    // 掉落物配置 (Boss 级巨量掉落)
    drops: {
      exp: 600,
      gold: 450,
      expCrystalType: 'large_cluster', // 爆出大批经验晶体
      dropProbability: 1.0
    }
  }
});

/**
 * 根据怪物类型标识获取对应配置
 * @param {string} enemyType 怪物类型
 * @returns {Object} 怪物配置对象
 */
export function getEnemyConfig(enemyType) {
  // 支持常见别名归一化
  let key = enemyType;
  if (key === 'mage') key = ENEMY_TYPES.MAGE;
  if (key === 'dragon_knight' || key === 'boss') key = ENEMY_TYPES.BOSS_DRAGON;

  const config = ENEMY_CONFIGS[key] || ENEMY_CONFIGS[enemyType];
  if (!config) {
    console.warn(`[EnemyData] 未知怪物类型: ${enemyType}，自动回退到骷髅战士`);
    return ENEMY_CONFIGS[ENEMY_TYPES.SKELETON];
  }
  return config;
}

/**
 * 获取所有可用敌人类型配置
 * @returns {Array<Object>}
 */
export function getAllEnemyConfigs() {
  return Object.values(ENEMY_CONFIGS);
}

export default {
  ENEMY_TYPES,
  ENEMY_AI_MODES,
  ENEMY_CONFIGS,
  getEnemyConfig,
  getAllEnemyConfigs
};
