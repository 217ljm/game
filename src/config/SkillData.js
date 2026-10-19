/**
 * ============================================================================
 * 技能树配置与技能系统核心数据 (SkillData.js)
 * ----------------------------------------------------------------------------
 * 定义技能属性、伤害倍率、冷却时间、弹道速度、判定范围、消耗与特效配置
 * ============================================================================
 */

/**
 * 技能唯一标识枚举
 */
export const SKILL_IDS = Object.freeze({
  SLASH: 'slash',                   // 基础斩击
  FIRE_WAVE: 'fire_wave',           // 炽焰散射
  DASH: 'dash',                     // 暴风冲刺
  FROST_SHIELD: 'frost_shield',     // 寒冰圣盾
  THUNDER_STRIKE: 'thunder_strike'  // 雷霆风暴
});

/**
 * 技能释放类型枚举
 */
export const SKILL_TYPES = Object.freeze({
  MELEE: 'melee',             // 近战挥击 / 范围斩
  PROJECTILE: 'projectile',   // 弹道投射物
  DASH: 'dash',               // 位移 / 冲刺
  BUFF: 'buff',               // 自身增益 / 护盾
  AOE: 'aoe'                  // 目标区域落点范围轰击
});

/**
 * 技能详细基础数据字典表
 */
export const SKILL_CONFIGS = Object.freeze({
  [SKILL_IDS.SLASH]: {
    id: SKILL_IDS.SLASH,
    name: '疾风斩击',
    description: '向鼠标指向挥出一道弧形剑气，对前方扇形区域敌人造成物理斩击与击退。',
    type: SKILL_TYPES.MELEE,
    iconKey: 'icon_skill_slash',
    effectKey: 'fx_slash_arc',
    soundKey: 'sfx_sword_slash',
    baseDamage: 35,               // 基础物理伤害
    damageMultiplier: 1.0,        // 攻击力倍率
    cooldown: 400,                // 冷却时间 (毫秒)
    costMp: 0,                    // 蓝量消耗 (普攻无消耗)
    range: 130,                   // 近战有效作用半径
    arcAngle: 120,                // 扇形判定角度 (度)
    knockbackForce: 280,          // 击退冲力 (px/s)
    pierceCount: Infinity,        // 近战扇形区域内全目标穿透
    projectileSpeed: 0,           // 非飞行投射物
    maxLevel: 5,                  // 最大技能等级
    growth: {
      damagePerLevel: 10,
      cooldownReductionPerLevel: 25,
      rangeBonusPerLevel: 10
    }
  },

  [SKILL_IDS.FIRE_WAVE]: {
    id: SKILL_IDS.FIRE_WAVE,
    name: '炽焰散射',
    description: '向前散射 3 枚穿透烈焰飞弹，引燃沿途路径上的敌人，造成持续燃烧与重击。',
    type: SKILL_TYPES.PROJECTILE,
    iconKey: 'icon_skill_fire_wave',
    effectKey: 'fx_fire_projectile',
    hitEffectKey: 'fx_fire_explosion',
    soundKey: 'sfx_fireball_cast',
    baseDamage: 60,
    damageMultiplier: 1.75,
    cooldown: 2500,
    costMp: 15,
    projectileCount: 3,           // 散射数量
    spreadAngle: 30,              // 散射总角度
    projectileSpeed: 680,         // 弹道飞行初速度 (px/s)
    range: 850,                   // 最大有效飞行射程
    lifetime: 1400,               // 飞行最长生命周期 (ms)
    hitboxRadius: 18,             // 碰撞半径
    pierceCount: 2,               // 最多穿透击中 2 个目标后自毁
    knockbackForce: 160,
    maxLevel: 5,
    growth: {
      damagePerLevel: 18,
      projectileCountBonusLevels: [3, 5], // 3级和5级时弹道数+1
      cooldownReductionPerLevel: 150
    }
  },

  [SKILL_IDS.DASH]: {
    id: SKILL_IDS.DASH,
    name: '暴风冲刺',
    description: '向移动方向瞬间爆发位移并获得极短无敌帧，冲刺期间在身后留下撕裂风刃。',
    type: SKILL_TYPES.DASH,
    iconKey: 'icon_skill_dash',
    effectKey: 'fx_dash_wind',
    soundKey: 'sfx_dash_whoosh',
    baseDamage: 25,
    damageMultiplier: 0.6,
    cooldown: 2000,
    costMp: 10,
    dashSpeed: 980,               // 冲刺爆发速度
    duration: 220,                // 冲刺位移维持时长 (ms)
    invulnerableDuration: 260,    // 获得完全无敌帧时间 (覆盖冲刺全程)
    hitboxRadius: 35,             // 碰触伤害判定宽度
    knockbackForce: 320,          // 将拦路敌人向两侧撞开
    pierceCount: Infinity,
    maxLevel: 5,
    growth: {
      cooldownReductionPerLevel: 200,
      damagePerLevel: 8,
      speedBonusPerLevel: 40
    }
  },

  [SKILL_IDS.FROST_SHIELD]: {
    id: SKILL_IDS.FROST_SHIELD,
    name: '寒冰圣盾',
    description: '凝聚极寒坚冰环绕自身，提供吸收伤害的冰晶护盾；护盾破碎或持续时间结束时爆发霜冻，冻结减速周围敌人。',
    type: SKILL_TYPES.BUFF,
    iconKey: 'icon_skill_frost_shield',
    effectKey: 'fx_frost_aura',
    hitEffectKey: 'fx_frost_nova',
    soundKey: 'sfx_shield_activate',
    baseShieldAmount: 90,         // 基础吸收伤害数值
    shieldDuration: 6000,         // 护盾维持上限 (ms)
    cooldown: 7500,
    costMp: 25,
    burstDamage: 45,              // 碎盾/爆盾反伤数值
    burstRadius: 220,             // 霜冻爆发波及半径
    slowFactor: 0.45,             // 减速幅度 (降低敌人 45% 移速)
    slowDuration: 2500,           // 减速持续时间 (ms)
    maxLevel: 5,
    growth: {
      shieldBonusPerLevel: 30,
      burstDamagePerLevel: 15,
      cooldownReductionPerLevel: 400
    }
  },

  [SKILL_IDS.THUNDER_STRIKE]: {
    id: SKILL_IDS.THUNDER_STRIKE,
    name: '雷霆风暴',
    description: '引导天际狂雷在目标落点轰击，造成极高范围毁灭伤害与范围麻痹打断效果。',
    type: SKILL_TYPES.AOE,
    iconKey: 'icon_skill_thunder',
    effectKey: 'fx_thunder_pillar',
    telegraphKey: 'fx_thunder_circle',
    soundKey: 'sfx_thunder_boom',
    baseDamage: 140,
    damageMultiplier: 3.2,
    cooldown: 5500,
    costMp: 35,
    castRange: 750,               // 施法最大施放距离 (以角色为中心)
    aoeRadius: 180,               // 雷落中心判定半宽
    delayTime: 300,               // 引导后到雷击落下的视觉延迟 (ms)
    knockbackForce: 420,          // 强力震退波
    stunDuration: 600,            // 眩晕硬直打断时长 (ms)
    maxLevel: 5,
    growth: {
      damagePerLevel: 45,
      aoeRadiusPerLevel: 15,
      cooldownReductionPerLevel: 300
    }
  }
});

/**
 * 根据技能 ID 和当前技能等级计算成长后的动态属性
 * @param {string} skillId 技能唯一 ID
 * @param {number} [level=1] 技能等级 (默认 1)
 * @returns {Object} 包含计算后伤害、CD与范围的完整技能属性对象
 */
export function calculateSkillStats(skillId, level = 1) {
  const baseConfig = SKILL_CONFIGS[skillId];
  if (!baseConfig) {
    throw new Error(`[SkillData] 未找到技能配置 ID: ${skillId}`);
  }

  const clampedLevel = Math.max(1, Math.min(level, baseConfig.maxLevel));
  const lvlOffset = clampedLevel - 1;
  const growth = baseConfig.growth || {};

  // 基础伤害计算
  const finalDamage = (baseConfig.baseDamage || 0) + (growth.damagePerLevel || 0) * lvlOffset;

  // 冷却时间计算 (保证最小冷却不低于 150ms)
  const finalCooldown = Math.max(
    150,
    baseConfig.cooldown - (growth.cooldownReductionPerLevel || 0) * lvlOffset
  );

  // 投射物数量计算
  let finalProjectileCount = baseConfig.projectileCount || 1;
  if (growth.projectileCountBonusLevels) {
    growth.projectileCountBonusLevels.forEach(milestoneLvl => {
      if (clampedLevel >= milestoneLvl) {
        finalProjectileCount += 1;
      }
    });
  }

  // 护盾与范围成长
  const finalShield = (baseConfig.baseShieldAmount || 0) + (growth.shieldBonusPerLevel || 0) * lvlOffset;
  const finalRadius = (baseConfig.aoeRadius || baseConfig.range || 0) + (growth.aoeRadiusPerLevel || growth.rangeBonusPerLevel || 0) * lvlOffset;

  return {
    ...baseConfig,
    level: clampedLevel,
    calculatedDamage: finalDamage,
    cooldown: finalCooldown,
    projectileCount: finalProjectileCount,
    baseShieldAmount: finalShield,
    effectiveRadius: finalRadius
  };
}

/**
 * 别名包装：确保 multiplier 映射至 damageMultiplier, speed 映射至 projectileSpeed
 */
const wrappedSkillConfig = {};
for (const key in SKILL_CONFIGS) {
  const item = { ...SKILL_CONFIGS[key] };
  item.multiplier = item.damageMultiplier;
  item.speed = item.projectileSpeed || 600;
  wrappedSkillConfig[key] = item;
}

export const SKILL_CONFIG = wrappedSkillConfig;

/**
 * 获取所有已定义的技能列表
 * @returns {Array<Object>}
 */
export function getAllSkills() {
  return Object.values(SKILL_CONFIGS);
}

/**
 * 获取指定技能基础配置
 * @param {string} skillId
 * @returns {Object|null}
 */
export function getSkillConfig(skillId) {
  return wrappedSkillConfig[skillId] || SKILL_CONFIGS[skillId] || null;
}

export default {
  SKILL_IDS,
  SKILL_TYPES,
  SKILL_CONFIGS,
  SKILL_CONFIG,
  calculateSkillStats,
  getAllSkills,
  getSkillConfig
};
