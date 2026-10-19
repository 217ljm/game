/**
 * ============================================================================
 * 投射物与弹道实体类 (Projectile.js)
 * ----------------------------------------------------------------------------
 * 继承 Phaser.Physics.Arcade.Sprite，实现：
 * 1. 玩家与敌方投射物通用逻辑（剑气斩击波、炽焰法球、暗影弹等）；
 * 2. 角度朝向、弹道飞行与速度向量自适应；
 * 3. 穿透判定 (Pierce Count)、防单目标重复命中过滤机制；
 * 4. 生命周期 TTL 超时自销毁与越界回收；
 * 5. 命中爆破视觉特效与物理重叠事件。
 * ============================================================================
 */

import Phaser from 'phaser';
import { LAYER_DEPTH, GAME_EVENTS } from '../config/GameConfig.js';

/**
 * 投射物预设类型枚举
 */
export const PROJECTILE_TYPES = Object.freeze({
  SLASH_WAVE: 'slash_wave',       // 剑气弧形斩击波 (高穿透、近中程)
  FIRE_WAVE: 'fire_wave',         // 炽焰法球 (中距离、中度穿透、爆裂火花)
  SHADOW_BOLT: 'shadow_bolt',     // 暗影弹 (敌方法师发射、直线狙击)
  THUNDER_STRIKE: 'thunder_strike'// 雷落冲击判定波
});

export default class Projectile extends Phaser.Physics.Arcade.Sprite {
  /**
   * 构造投射物
   * @param {Phaser.Scene} scene - 所属场景
   * @param {number} x - 起始世界 X
   * @param {number} y - 起始世界 Y
   * @param {string} [texture='projectile_default'] - 纹理材质键
   * @param {Object} [options={}] - 配置参数
   */
  constructor(scene, x, y, texture = 'projectile_default', options = {}) {
    super(scene, x, y, texture);

    // 1. 注册入场景与物理世界
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // 2. 提取参数配置
    this.source = options.source || 'player';               // 发射源：'player' 或 'enemy'
    this.type = options.type || PROJECTILE_TYPES.SLASH_WAVE;
    this.damage = options.damage || 30;
    this.speed = options.speed || 500;
    this.knockbackForce = options.knockbackForce || 200;
    this.maxPierces = options.pierceCount !== undefined ? options.pierceCount : 1;
    this.remainingPierces = this.maxPierces;
    this.lifetime = options.lifetime || 1800;               // 默认 1.8 秒 TTL 自销毁
    this.hitboxRadius = options.hitboxRadius || 16;
    this.onHitCallback = options.onHitCallback || null;

    // 3. 渲染层级与原点
    this.setDepth(LAYER_DEPTH.PROJECTILES);
    this.setOrigin(0.5, 0.5);

    // 4. 物理形体设置
    if (this.body) {
      this.body.setAllowGravity(false);
      this.body.setCircle(this.hitboxRadius);
      this.body.setOffset(
        (this.width - this.hitboxRadius * 2) / 2,
        (this.height - this.hitboxRadius * 2) / 2
      );
    }

    // 5. 穿透与防重复判定集合 (记录已击中的实体，防止同一实体多帧重复受伤)
    this.hitEntities = new Set();
    this.isDestroying = false;

    // 6. 飞行方向计算与初速度赋予
    this._initTrajectory(options);

    // 7. 生命周期自销毁倒计时
    this.lifeTimer = this.scene.time.delayedCall(this.lifetime, () => {
      this.destroyCleanly();
    });
  }

  /**
   * 计算弹道速度与旋转角
   * @param {Object} options
   * @private
   */
  _initTrajectory(options) {
    let radAngle = 0;

    if (options.angle !== undefined) {
      radAngle = options.angle;
    } else if (options.targetX !== undefined && options.targetY !== undefined) {
      radAngle = Phaser.Math.Angle.Between(this.x, this.y, options.targetX, options.targetY);
    }

    this.setRotation(radAngle);

    // 赋予速度向量
    if (this.body) {
      this.body.setVelocity(
        Math.cos(radAngle) * this.speed,
        Math.sin(radAngle) * this.speed
      );
    }
  }

  /**
   * 命中目标实体判定处理 (碰撞重叠时被场景或物理组调用)
   * @param {Phaser.GameObjects.GameObject} target - 被命中的实体
   * @returns {boolean} 是否产生有效击中
   */
  onHit(target) {
    if (this.isDestroying || !this.active) return false;
    if (!target || !target.active) return false;

    // 检查目标是否具有唯一引用或 ID，避免单帧多重穿透判定
    if (this.hitEntities.has(target)) {
      return false; // 已被本弹道命中过
    }

    this.hitEntities.add(target);

    // 1. 造成伤害与击退
    if (typeof target.takeDamage === 'function') {
      target.takeDamage(this.damage, { x: this.x, y: this.y }, this.knockbackForce);
    }

    // 2. 触发可能绑定的自定义命中回调
    if (this.onHitCallback) {
      this.onHitCallback(this, target);
    }

    // 3. 发布全局投射物命中事件
    this.scene.events.emit(GAME_EVENTS.PROJECTILE_HIT, {
      projectile: this,
      target,
      damage: this.damage,
      x: this.x,
      y: this.y,
      source: this.source
    });

    // 4. 生成命中爆破粒子/火花
    this._spawnHitSpark(this.x, this.y);

    // 5. 扣减穿透次数
    this.remainingPierces -= 1;
    if (this.remainingPierces <= 0) {
      this.destroyCleanly();
    }

    return true;
  }

  /**
   * 生成命中火花/爆破视觉
   * @param {number} x
   * @param {number} y
   * @private
   */
  _spawnHitSpark(x, y) {
    const spark = this.scene.add.graphics();
    spark.setDepth(LAYER_DEPTH.EFFECTS);

    let sparkColor = 0xffeb3b; // 默认亮黄色火花
    if (this.type === PROJECTILE_TYPES.FIRE_WAVE) {
      sparkColor = 0xff5722;   // 火焰橙红
    } else if (this.type === PROJECTILE_TYPES.SHADOW_BOLT) {
      sparkColor = 0xaa00ff;   // 暗影紫色
    } else if (this.type === PROJECTILE_TYPES.SLASH_WAVE) {
      sparkColor = 0x80d8ff;   // 剑气冰蓝
    }

    spark.fillStyle(sparkColor, 0.9);
    spark.fillCircle(x, y, 10);

    this.scene.tweens.add({
      targets: spark,
      alpha: 0,
      scaleX: 2.2,
      scaleY: 2.2,
      duration: 160,
      ease: 'Quad.easeOut',
      onComplete: () => spark.destroy()
    });
  }

  /**
   * 彻底安全销毁与清理
   */
  destroyCleanly() {
    if (this.isDestroying) return;
    this.isDestroying = true;

    if (this.body) {
      this.body.setVelocity(0, 0);
      this.body.enable = false;
    }

    if (this.lifeTimer) {
      this.lifeTimer.remove();
      this.lifeTimer = null;
    }

    this.hitEntities.clear();
    this.destroy();
  }

  // ==========================================================================
  // 便捷静态工厂方法 (Static Factory Methods)
  // ==========================================================================

  /**
   * 创建剑气斩击波 (Slash Wave)
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {number} angleRad - 发射弧度
   * @param {number} damage
   * @param {number} [knockback=280]
   * @returns {Projectile}
   */
  static createSlashWave(scene, x, y, angleRad, damage, knockback = 280) {
    return new Projectile(scene, x, y, 'fx_slash_arc', {
      source: 'player',
      type: PROJECTILE_TYPES.SLASH_WAVE,
      angle: angleRad,
      speed: 600,
      damage,
      knockbackForce: knockback,
      pierceCount: 4,               // 剑气可穿透 4 个单位
      lifetime: 500,                // 近中程波形，半秒消散
      hitboxRadius: 28
    });
  }

  /**
   * 创建炽焰散射火球 (Fire Wave)
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {number} angleRad
   * @param {number} damage
   * @param {number} [speed=680]
   * @param {number} [pierceCount=2]
   * @returns {Projectile}
   */
  static createFireWave(scene, x, y, angleRad, damage, speed = 680, pierceCount = 2) {
    return new Projectile(scene, x, y, 'fx_fire_projectile', {
      source: 'player',
      type: PROJECTILE_TYPES.FIRE_WAVE,
      angle: angleRad,
      speed,
      damage,
      knockbackForce: 180,
      pierceCount,
      lifetime: 1400,
      hitboxRadius: 18
    });
  }

  /**
   * 创建敌方暗影法球 (Shadow Bolt)
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {number} targetX
   * @param {number} targetY
   * @param {number} damage
   * @param {number} [speed=420]
   * @returns {Projectile}
   */
  static createShadowBolt(scene, x, y, targetX, targetY, damage, speed = 420) {
    return new Projectile(scene, x, y, 'projectile_shadow_bolt', {
      source: 'enemy',
      type: PROJECTILE_TYPES.SHADOW_BOLT,
      targetX,
      targetY,
      speed,
      damage,
      knockbackForce: 150,
      pierceCount: 1, // 命中玩家即销毁
      lifetime: 2000,
      hitboxRadius: 16
    });
  }

  /**
   * 每帧边界检查 (防越界)
   */
  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    // 超出世界边界过大范围时主动销毁
    if (
      this.x < -200 || this.x > 3000 ||
      this.y < -200 || this.y > 3000
    ) {
      this.destroyCleanly();
    }
  }
}
