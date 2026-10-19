/**
 * ============================================================================
 * 敌人实体基类 (Enemy.js)
 * ----------------------------------------------------------------------------
 * 继承 Phaser.Physics.Arcade.Sprite，实现：
 * 1. 自动索敌与智能追踪逻辑（近战贴身、远程风筝保持距离、Boss复合模式）；
 * 2. 攻击判定与攻击前摇提示（0.5s~0.8s 动态红色预警圈 Telegraph）；
 * 3. 受击物理击退抗性、受击阻力与受击闪白反馈；
 * 4. 死亡破碎特效与爆出经验晶体/金币掉落物。
 * ============================================================================
 */

import Phaser from 'phaser';
import { LAYER_DEPTH, GAME_EVENTS, COLOR_PALETTE } from '../config/GameConfig.js';
import { ENEMY_TYPES, ENEMY_AI_MODES, getEnemyConfig } from '../config/EnemyData.js';

/**
 * 敌人状态机枚举
 */
export const ENEMY_STATES = Object.freeze({
  SPAWN: 'SPAWN',           // 刷新出场
  CHASE: 'CHASE',           // 追击/走位游荡
  TELEGRAPH: 'TELEGRAPH',   // 攻击前摇预警蓄力 (绘制红圈)
  ATTACK: 'ATTACK',         // 攻击判定与伤害结算
  HURT: 'HURT',             // 受击硬直
  DEAD: 'DEAD'              // 死亡消散
});

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  /**
   * 构造敌人实例
   * @param {Phaser.Scene} scene - 所属场景
   * @param {number} x - 初始 X 坐标
   * @param {number} y - 初始 Y 坐标
   * @param {string} [enemyType=ENEMY_TYPES.SKELETON] - 敌人类型枚举
   * @param {string} [texture] - 可选纹理，未指定时采用配置中 spriteKey
   */
  constructor(scene, x, y, enemyType = ENEMY_TYPES.SKELETON, texture = null) {
    const config = getEnemyConfig(enemyType);
    const textureKey = texture || config.spriteKey || 'enemy_default';

    super(scene, x, y, textureKey);

    // 1. 注册入场景与物理世界
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // 2. 绑定核心配置参数
    this.config = config;
    this.enemyType = enemyType;
    this.setDepth(LAYER_DEPTH.CHARACTERS);
    this.setOrigin(0.5, 0.7);

    // 3. 物理形体与阻尼
    if (this.body) {
      this.body.setCollideWorldBounds(true);
      const w = config.hitboxWidth || 36;
      const h = config.hitboxHeight || 48;
      this.body.setSize(w, h);
      this.body.setOffset((this.width - w) / 2, this.height - h);
      this.body.setDrag(800, 800); // 击退时的速度阻尼
    }

    if (config.scale) {
      this.setScale(config.scale);
    }

    // 4. 生命与战斗数值
    this.maxHp = config.maxHp;
    this.hp = this.maxHp;
    this.defense = config.defense || 0;
    this.moveSpeed = config.moveSpeed;
    this.detectionRange = config.detectionRange;
    this.attackRange = config.attackRange;
    this.attackRadius = config.attackRadius;
    this.attackDamage = config.attackDamage;
    this.attackCooldown = config.attackCooldown;
    this.telegraphDuration = config.telegraphDuration || 600;
    this.knockbackResistance = config.knockbackResistance || 0;

    // 5. 状态与战斗控制
    this.currentState = ENEMY_STATES.CHASE;
    this.target = null;                // 追踪锁定的玩家引用
    this.lastAttackTime = 0;           // 上次攻击完成时间戳
    this.telegraphGraphics = null;     // 动态红色预警图形对象
    this.telegraphTimer = null;        // 前摇计时器
    this.flashWhiteTimer = null;       // 闪白定时器
    this.hurtTimer = null;             // 受击硬直定时器

    // 6. 头顶迷你血条容器
    this._createHealthBar();
  }

  /**
   * 设置敌人锁定的追踪目标 (通常为 Player)
   * @param {Phaser.GameObjects.GameObject} target
   */
  setTarget(target) {
    this.target = target;
  }

  /**
   * 初始化头顶迷你血条
   * @private
   */
  _createHealthBar() {
    this.hpBarGraphics = this.scene.add.graphics();
    this.hpBarGraphics.setDepth(LAYER_DEPTH.UI_WORLD);
    this._updateHealthBar();
  }

  /**
   * 刷新头顶血条渲染
   * @private
   */
  _updateHealthBar() {
    if (!this.hpBarGraphics || !this.active) return;
    this.hpBarGraphics.clear();

    if (this.currentState === ENEMY_STATES.DEAD || this.hp <= 0) return;

    const barWidth = 44 * (this.config.scale || 1);
    const barHeight = 5;
    const barX = this.x - barWidth / 2;
    const barY = this.y - (this.height * (this.config.scale || 1) * 0.85);

    // 底槽暗色
    this.hpBarGraphics.fillStyle(COLOR_PALETTE.HEALTH_BAR_BG, 0.85);
    this.hpBarGraphics.fillRect(barX, barY, barWidth, barHeight);

    // 当前生命绿色/黄色条
    const pct = Math.max(0, Math.min(1, this.hp / this.maxHp));
    const fillColor = pct > 0.35 ? COLOR_PALETTE.HEALTH_BAR : COLOR_PALETTE.TELEGRAPH_BORDER;
    this.hpBarGraphics.fillStyle(fillColor, 1);
    this.hpBarGraphics.fillRect(barX, barY, barWidth * pct, barHeight);
  }

  /**
   * 状态切换
   * @param {string} newState - 目标状态
   * @returns {boolean} 是否跃迁成功
   */
  changeState(newState) {
    if (this.currentState === ENEMY_STATES.DEAD) return false;
    if (this.currentState === newState) return true;

    // 清理前一状态
    if (this.currentState === ENEMY_STATES.TELEGRAPH && newState !== ENEMY_STATES.ATTACK) {
      this._clearTelegraph();
    }

    this.currentState = newState;

    switch (newState) {
      case ENEMY_STATES.CHASE:
        break;

      case ENEMY_STATES.TELEGRAPH:
        this._startTelegraph();
        break;

      case ENEMY_STATES.ATTACK:
        this._executeAttack();
        break;

      case ENEMY_STATES.HURT:
        break;

      case ENEMY_STATES.DEAD:
        this._handleDeath();
        break;

      default:
        break;
    }

    return true;
  }

  /**
   * 每帧更新循环
   * @param {number} time
   * @param {number} delta
   */
  update(time, delta) {
    if (this.currentState === ENEMY_STATES.DEAD) return;

    // 维持头顶血条随实体位移
    this._updateHealthBar();

    // 受击或前摇中暂停常规追踪走位
    if (this.currentState === ENEMY_STATES.HURT || this.currentState === ENEMY_STATES.TELEGRAPH) {
      return;
    }

    // 自动索敌追踪
    this._handleAI(time, delta);
  }

  /**
   * AI 寻路与索敌决策
   * @param {number} time
   * @param {number} delta
   * @private
   */
  _handleAI(time, delta) {
    if (!this.target || !this.target.active || (this.target.hp !== undefined && this.target.hp <= 0)) {
      if (this.body) this.body.setVelocity(0, 0);
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);

    // 超出视野脱战
    if (dist > this.detectionRange) {
      this.body.setVelocity(0, 0);
      return;
    }

    // 朝向调整
    if (this.target.x < this.x) {
      this.setFlipX(true);
    } else {
      this.setFlipX(false);
    }

    const canAttack = (time - this.lastAttackTime) >= this.attackCooldown;

    // 根据 AI 模式执行走位
    switch (this.config.aiMode) {
      case ENEMY_AI_MODES.RANGED_KITE: {
        const preferredDist = this.config.preferredDistance || 400;
        const fleeDist = this.config.fleeDistance || 220;

        if (dist < fleeDist) {
          // 距离过近：向反方向后撤
          const angle = Phaser.Math.Angle.Between(this.target.x, this.target.y, this.x, this.y);
          this.scene.physics.velocityFromRotation(angle, this.moveSpeed * 1.1, this.body.velocity);
        } else if (dist > preferredDist + 60) {
          // 距离过远：向前贴近
          const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
          this.scene.physics.velocityFromRotation(angle, this.moveSpeed, this.body.velocity);
        } else {
          // 保持在最佳攻击射程内微调
          this.body.setVelocity(0, 0);
        }

        // 满足攻击距离且冷却就绪，启动前摇预警
        if (dist <= this.attackRange && canAttack) {
          this.changeState(ENEMY_STATES.TELEGRAPH);
        }
        break;
      }

      case ENEMY_AI_MODES.MELEE_CHASE:
      case ENEMY_AI_MODES.BOSS_HYBRID:
      default: {
        if (dist <= this.attackRange && canAttack) {
          // 进入攻击范围且冷却就绪
          this.body.setVelocity(0, 0);
          this.changeState(ENEMY_STATES.TELEGRAPH);
        } else {
          // 持续向目标逼近
          const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
          this.scene.physics.velocityFromRotation(angle, this.moveSpeed, this.body.velocity);
        }
        break;
      }
    }
  }

  /**
   * 启动攻击前摇提示 (Telegraph)
   * 并在攻击触发前在目标落点绘制动态红色预警圈
   * @private
   */
  _startTelegraph() {
    this.body.setVelocity(0, 0); // 蓄力时停止移动

    // 锁定攻击目标中心坐标
    let targetX = this.x;
    let targetY = this.y;

    if (this.config.aiMode === ENEMY_AI_MODES.RANGED_KITE && this.target) {
      // 远程怪直接以目标玩家脚下为预警落点
      targetX = this.target.x;
      targetY = this.target.y;
    } else if (this.target) {
      // 近战怪在自身朝向与目标之间划定攻击判定圈
      const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
      targetX = this.x + Math.cos(angle) * (this.attackRadius * 0.45);
      targetY = this.y + Math.sin(angle) * (this.attackRadius * 0.45);
    }

    this.attackTargetPoint = { x: targetX, y: targetY };

    // 创建预警红圈 Graphics
    this._clearTelegraph();
    this.telegraphGraphics = this.scene.add.graphics();
    this.telegraphGraphics.setDepth(LAYER_DEPTH.TELEGRAPH);

    const radius = this.attackRadius;
    const duration = this.telegraphDuration; // 严格在 0.5s ~ 0.8s 之间
    const color = this.config.telegraphColor || COLOR_PALETTE.TELEGRAPH_FILL;

    // 动态填充动画：内部圆环在 duration 毫秒内从 0 扩散至满
    const progressTracker = { progress: 0 };
    this.telegraphTween = this.scene.tweens.add({
      targets: progressTracker,
      progress: 1.0,
      duration: duration,
      ease: 'Linear',
      onUpdate: () => {
        if (!this.telegraphGraphics) return;
        this.telegraphGraphics.clear();

        // 1. 外部静态警告红边框
        this.telegraphGraphics.lineStyle(2.5, COLOR_PALETTE.TELEGRAPH_BORDER, 0.85);
        this.telegraphGraphics.strokeCircle(targetX, targetY, radius);

        // 2. 底色微弱半透明红
        this.telegraphGraphics.fillStyle(color, 0.15);
        this.telegraphGraphics.fillCircle(targetX, targetY, radius);

        // 3. 动态扩张的实心进度警示红圈
        const curRadius = radius * progressTracker.progress;
        this.telegraphGraphics.fillStyle(color, 0.45);
        this.telegraphGraphics.fillCircle(targetX, targetY, curRadius);
      }
    });

    // 触发全局预警开始事件
    this.scene.events.emit(GAME_EVENTS.TELEGRAPH_START, {
      enemy: this,
      x: targetX,
      y: targetY,
      radius,
      duration
    });

    // 预警前摇计时结束，进入实质攻击
    this.telegraphTimer = this.scene.time.delayedCall(duration, () => {
      this._clearTelegraph();
      this.changeState(ENEMY_STATES.ATTACK);
    });
  }

  /**
   * 清除预警红圈
   * @private
   */
  _clearTelegraph() {
    if (this.telegraphTween) {
      this.telegraphTween.stop();
      this.telegraphTween = null;
    }
    if (this.telegraphTimer) {
      this.telegraphTimer.remove();
      this.telegraphTimer = null;
    }
    if (this.telegraphGraphics) {
      this.telegraphGraphics.destroy();
      this.telegraphGraphics = null;
    }
  }

  /**
   * 执行攻击伤害判定
   * @private
   */
  _executeAttack() {
    this.lastAttackTime = this.scene.time.now;

    const hitPoint = this.attackTargetPoint || { x: this.x, y: this.y };

    if (this.config.aiMode === ENEMY_AI_MODES.RANGED_KITE) {
      // 远程怪发射暗影法球投射物
      this.scene.events.emit(GAME_EVENTS.PROJECTILE_HIT, {
        isCast: true,
        source: 'enemy',
        enemy: this,
        startX: this.x,
        startY: this.y,
        targetX: hitPoint.x,
        targetY: hitPoint.y,
        damage: this.attackDamage,
        projectileConfig: this.config.projectileConfig
      });
    } else {
      // 近战怪范围圈判定：检查主角是否仍在攻击预警半径内
      if (this.target && this.target.active && this.target.hp > 0) {
        const hitDist = Phaser.Math.Distance.Between(hitPoint.x, hitPoint.y, this.target.x, this.target.y);
        if (hitDist <= this.attackRadius) {
          // 命中主角，造成伤害与击退
          if (typeof this.target.takeDamage === 'function') {
            this.target.takeDamage(this.attackDamage, { x: this.x, y: this.y }, 260);
          }
        }
      }

      // 地面重击波视觉效果 (简单冲击圆)
      this._spawnHitSlamFx(hitPoint.x, hitPoint.y, this.attackRadius);
    }

    // 攻击后摇短暂停顿 200ms 后恢复追击
    this.scene.time.delayedCall(200, () => {
      if (this.currentState === ENEMY_STATES.ATTACK) {
        this.changeState(ENEMY_STATES.CHASE);
      }
    });
  }

  /**
   * 生成砸地冲击波特效
   * @private
   */
  _spawnHitSlamFx(x, y, radius) {
    const slamGfx = this.scene.add.graphics();
    slamGfx.setDepth(LAYER_DEPTH.EFFECTS);
    slamGfx.lineStyle(3, 0xff5252, 1);
    slamGfx.strokeCircle(x, y, radius * 0.4);

    this.scene.tweens.add({
      targets: slamGfx,
      alpha: 0,
      scaleX: 1.8,
      scaleY: 1.8,
      duration: 250,
      ease: 'Quad.easeOut',
      onComplete: () => slamGfx.destroy()
    });
  }

  /**
   * 受击处理 (伤害结算、闪白、击退阻力)
   * @param {number} damage - 传入伤害
   * @param {Object} [sourcePos] - 伤害来源点 {x, y}
   * @param {number} [knockbackForce=200] - 击退冲击力
   */
  takeDamage(damage, sourcePos = null, knockbackForce = 200) {
    if (this.currentState === ENEMY_STATES.DEAD) return;

    // 防御抵扣
    const actualDamage = Math.max(1, Math.floor(damage - this.defense));
    this.hp -= actualDamage;

    // 1. 调用闪白接口反馈
    this.flashWhite(85);

    // 2. 物理击退阻力计算 (考虑击退抗性)
    if (sourcePos && this.body && this.knockbackResistance < 1) {
      const effectiveKnockback = knockbackForce * (1 - this.knockbackResistance);
      const angle = Phaser.Math.Angle.Between(sourcePos.x, sourcePos.y, this.x, this.y);
      this.body.setVelocity(
        Math.cos(angle) * effectiveKnockback,
        Math.sin(angle) * effectiveKnockback
      );
    }

    // 3. 发布敌人受击事件
    this.scene.events.emit(GAME_EVENTS.ENEMY_DAMAGED, {
      enemy: this,
      damage: actualDamage,
      currentHp: this.hp,
      maxHp: this.maxHp,
      x: this.x,
      y: this.y
    });

    // 4. 刷新血条
    this._updateHealthBar();

    // 5. 死亡检测
    if (this.hp <= 0) {
      this.die();
    }
  }

  /**
   * 主动触发敌人死亡
   */
  die() {
    if (this.currentState !== ENEMY_STATES.DEAD) {
      this.changeState(ENEMY_STATES.DEAD);
    }
  }

  /**
   * 实体受击全白闪烁 (Flash White)
   * @param {number} [duration=80] - 闪白毫秒数
   */
  flashWhite(duration = 80) {
    this.setTintFill(0xffffff); // Phaser 纯白填充滤镜

    if (this.flashWhiteTimer) this.flashWhiteTimer.remove();
    this.flashWhiteTimer = this.scene.time.delayedCall(duration, () => {
      this.clearTint();
    });
  }

  /**
   * 死亡处理 (破碎消散并爆出经验晶体与金币)
   * @private
   */
  _handleDeath() {
    this.body.setVelocity(0, 0);
    this.body.enable = false; // 禁用物理体
    this._clearTelegraph();

    if (this.hpBarGraphics) {
      this.hpBarGraphics.destroy();
      this.hpBarGraphics = null;
    }

    // 1. 爆出掉落物 (经验晶体与金币)
    this._spawnDrops();

    // 2. 触发死亡破碎与消散 Tween
    this.scene.tweens.add({
      targets: this,
      scaleX: this.scaleX * 1.3,
      scaleY: this.scaleY * 0.7,
      alpha: 0,
      duration: 350,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.scene.events.emit(GAME_EVENTS.ENEMY_DIED, {
          enemy: this,
          enemyType: this.enemyType,
          x: this.x,
          y: this.y,
          drops: this.config.drops
        });
        this.emit('enemy:died');
        this.destroy();
      }
    });
  }

  /**
   * 爆出经验晶体与金币掉落物
   * @private
   */
  _spawnDrops() {
    const drops = this.config.drops;
    if (!drops) return;

    // 向全局抛出掉落生成事件
    this.scene.events.emit(GAME_EVENTS.DROP_SPAWNED, {
      x: this.x,
      y: this.y,
      exp: drops.exp,
      gold: drops.gold,
      crystalType: drops.expCrystalType
    });
  }

  /**
   * 实例销毁清理
   */
  destroy(fromScene) {
    this._clearTelegraph();
    if (this.hpBarGraphics) {
      this.hpBarGraphics.destroy();
      this.hpBarGraphics = null;
    }
    if (this.flashWhiteTimer) {
      this.flashWhiteTimer.remove();
      this.flashWhiteTimer = null;
    }
    if (this.hurtTimer) {
      this.hurtTimer.remove();
      this.hurtTimer = null;
    }
    super.destroy(fromScene);
  }
}
