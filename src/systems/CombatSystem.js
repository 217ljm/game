/**
 * @file CombatSystem.js
 * @description 核心战斗数值结算与逻辑系统：伤害公式、暴击判定、抗性减免、受击物理冲量与掉落物计算
 */

export class CombatSystem {
  /**
   * 计算单次攻击伤害与判定
   * @param {Object} attacker 攻击方实体 (包含 atk, critRate, critDmg 等)
   * @param {Object} defender 防守方实体 (包含 def, hp, maxHp, shield 等)
   * @param {Object} skillConfig 技能机制配置 (包含 multiplier, element, knockbackForce 等)
   * @returns {Object} 战斗结果对象
   */
  static calculateDamage(attacker, defender, skillConfig = {}) {
    const multiplier = skillConfig.multiplier || 1.0;
    const baseAtk = attacker.atk || 20;
    const targetDef = defender.def || 0;

    // 伤害浮动系数 0.95 ~ 1.05
    const variance = 0.95 + Math.random() * 0.1;
    let rawDamage = baseAtk * multiplier * variance;

    // 暴击判定
    const critRate = attacker.critRate || 0.15;
    const critMultiplier = attacker.critDmg || 2.0;
    const isCrit = Math.random() < critRate;

    if (isCrit) {
      rawDamage *= critMultiplier;
    }

    // 防御减免公式：减免百分比 = def / (def + 120)
    const defReduction = targetDef / (targetDef + 120);
    const finalDamage = Math.max(1, Math.round(rawDamage * (1 - defReduction)));

    // 护盾与生命值扣除
    let remainingDamage = finalDamage;
    let absorbedByShield = 0;

    if (defender.shield && defender.shield > 0) {
      if (defender.shield >= remainingDamage) {
        defender.shield -= remainingDamage;
        absorbedByShield = remainingDamage;
        remainingDamage = 0;
      } else {
        absorbedByShield = defender.shield;
        remainingDamage -= defender.shield;
        defender.shield = 0;
      }
    }

    // 扣除实际生命值
    defender.hp = Math.max(0, defender.hp - remainingDamage);
    const isDead = defender.hp <= 0;

    // 击退方向与冲量
    const knockbackForce = skillConfig.knockbackForce !== undefined ? skillConfig.knockbackForce : 260;
    let knockbackVector = { x: 0, y: 0 };
    if (attacker && defender && (attacker.x !== defender.x || attacker.y !== defender.y)) {
      const angle = Phaser.Math.Angle.Between(attacker.x, attacker.y, defender.x, defender.y);
      knockbackVector = {
        x: Math.cos(angle) * knockbackForce,
        y: Math.sin(angle) * knockbackForce,
      };
    }

    return {
      damage: finalDamage,
      isCrit,
      isDead,
      absorbedByShield,
      knockbackVector,
      element: skillConfig.element || "physical",
    };
  }

  /**
   * 计算击杀掉落经验与金币
   * @param {Object} enemy 死亡的怪物实体
   * @returns {Object} 掉落结果
   */
  static calculateLoot(enemy) {
    const baseExp = enemy.expYield || 15;
    const baseGold = enemy.goldYield || 8;
    return {
      exp: Math.round(baseExp * (0.9 + Math.random() * 0.2)),
      gold: Math.round(baseGold * (0.8 + Math.random() * 0.4)),
    };
  }
}
