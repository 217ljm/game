/**
 * ============================================================================
 * 玩家实体类 (Player.js)
 * ----------------------------------------------------------------------------
 * 继承 Phaser.Physics.Arcade.Sprite，实现：
 * 1. 键盘 WASD / 方向键八向自由移动，带平滑加速度与减速；
 * 2. 鼠标方向实时朝向翻转 (flipX)；
 * 3. 待机呼吸 Tween (scale 弹性形变微动)；
 * 4. 严密的状态机 (IDLE, RUN, ATTACK, DASH, HURT, DEAD)；
 * 5. 普通攻击、技能释放与冲刺位移机制；
 * 6. 生命值、护盾值、经验值、蓝量与冷却管理。
 * ============================================================================
 */

import Phaser from 'phaser';
import { LAYER_DEPTH, GAME_EVENTS, PLAYER_PHYSICS } from '../config/GameConfig.js';
import { SKILL_IDS, SKILL_CONFIGS, calculateSkillStats } from '../config/SkillData.js';

/**
 * 玩家状态机枚举
 */
export const PLAYER_STATES = Object.freeze({
  IDLE: 'IDLE',       // 待机静止 (呼吸微动)
  RUN: 'RUN',         // 奔跑移动 (八向位移)
  ATTACK: 'ATTACK',   // 普通攻击硬直
  DASH: 'DASH',       // 暴风冲刺 (高移速、无敌帧、残影)
  HURT: 'HURT',       // 受击震退硬直
  DEAD: 'DEAD'        // 阵亡倒地
});

export default class Player extends Phaser.Physics.Arcade.Sprite {
  /**
   * 构造玩家对象
   * @param {Phaser.Scene} scene - 所属场景
   * @param {number} x - 初始 X 坐标
   * @param {number} y - 初始 Y 坐标
   * @param {string} [texture='hero_warrior'] - 材质键名
   */
  constructor(scene, x, y, texture = 'hero_warrior') {
    // 自动兼容 hero_warrior 与 player
    const validTexture = scene.textures.exists(texture) ? texture : (scene.textures.exists('hero_warrior') ? 'hero_warrior' : texture);
    super(scene, x, y, validTexture);

    // 1. 将自身注册入场景与物理世界
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // 2. 渲染层级与基础视觉设定
    this.setDepth(LAYER_DEPTH.CHARACTERS);
    this.setOrigin(0.5, 0.7); // 脚底作为重心原点

    // 3. 物理碰撞箱设定 (包围盒贴合角色脚底与腰身)
    if (this.body) {
      this.body.setCollideWorldBounds(true);
      this.body.setSize(32, 42);
      this.body.setOffset(16, 22);
      this.body.setDrag(PLAYER_PHYSICS.DRAG, PLAYER_PHYSICS.DRAG);
      this.body.setMaxVelocity(PLAYER_PHYSICS.MAX_SPEED, PLAYER_PHYSICS.MAX_SPEED);
    }

    // 4. 角色核心成长与数值属性
    this.level = 1;
    this.maxHp = 200;
    this.hp = this.maxHp;
    this.maxShield = 100;
    this.shield = 0;
    this.maxMp = 100;
    this.mp = this.maxMp;
    this.mpRegenRate = 6;             // 每秒自动恢复 6 点 MP
    this.exp = 0;
    this.maxExp = 100;                // 升至 2 级所需初始经验
    this.attackPower = 30;            // 基础物理攻击力

    // 5. 战斗与状态标志
    this.currentState = PLAYER_STATES.IDLE;
    this.isInvulnerable = false;       // 无敌状态开关 (冲刺或受击保护中)
    this.skillCooldowns = new Map();  // 技能冷却时间戳记录表 { skillId => timestamp }
    this.dashTimer = null;
    this.idleTween = null;
    this.hurtTimer = null;

    // 6. 注册按键输入监听
    this._initInput();

    // 7. 初始化待机呼吸 Tween
    this._initIdleTween();
  }

  /**
   * 初始化键盘输入
   * @private
   */
  _initInput() {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) return;

    // 绑定 WASD 与 方向键
    this.keys = keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      UP: Phaser.Input.Keyboard.KeyCodes.UP,
      DOWN: Phaser.Input.Keyboard.KeyCodes.DOWN,
      LEFT: Phaser.Input.Keyboard.KeyCodes.LEFT,
      RIGHT: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      SHIFT: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      Q: Phaser.Input.Keyboard.KeyCodes.Q,
      E: Phaser.Input.Keyboard.KeyCodes.E,
      R: Phaser.Input.Keyboard.KeyCodes.R
    });
  }

  /**
   * 初始化待机弹性呼吸 Tween
   * @private
   */
  _initIdleTween() {
    this.idleTween = this.scene.tweens.add({
      targets: this,
      scaleY: 1.04,
      scaleX: 0.98,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  /**
   * 恢复基础缩放比例
   * @private
   */
  _resetScale() {
    if (this.idleTween && this.idleTween.isPlaying()) {
      this.idleTween.pause();
    }
    this.setScale(1.0, 1.0);
  }

  /**
   * 状态机状态切换守卫
   * @param {string} newState - 目标状态
   * @param {Object} [data={}] - 伴随参数
   * @returns {boolean} 是否跃迁成功
   */
  changeState(newState, data = {}) {
    if (this.currentState === PLAYER_STATES.DEAD) {
      return false; // 死亡后不可转出任何状态
    }

    if (this.currentState === newState) {
      return true;
    }

    // DASH 期间不可被 RUN / ATTACK / IDLE 打断，除非进入 DEAD
    if (this.currentState === PLAYER_STATES.DASH && newState !== PLAYER_STATES.DEAD) {
      return false;
    }

    // 退出前一状态时的清理
    switch (this.currentState) {
      case PLAYER_STATES.IDLE:
        if (this.idleTween) this.idleTween.pause();
        break;
      case PLAYER_STATES.DASH:
        this.isInvulnerable = false;
        break;
      case PLAYER_STATES.HURT:
        this.clearTint();
        break;
      default:
        break;
    }

    // 进入新状态的逻辑
    this.currentState = newState;

    switch (newState) {
      case PLAYER_STATES.IDLE:
        this._resetScale();
        if (this.idleTween) this.idleTween.resume();
        break;

      case PLAYER_STATES.RUN:
        this._resetScale();
        break;

      case PLAYER_STATES.ATTACK:
        this._resetScale();
        break;

      case PLAYER_STATES.DASH:
        this._resetScale();
        this.isInvulnerable = true;
        this._executeDash(data.direction);
        break;

      case PLAYER_STATES.HURT:
        this._resetScale();
        this.setTint(0xff5252);
        // 受击硬直 180ms 后切回待机
        if (this.hurtTimer) this.hurtTimer.remove();
        this.hurtTimer = this.scene.time.delayedCall(180, () => {
          if (this.currentState === PLAYER_STATES.HURT) {
            this.clearTint();
            this.changeState(PLAYER_STATES.IDLE);
          }
        });
        break;

      case PLAYER_STATES.DEAD:
        this._resetScale();
        this._handleDeath();
        break;

      default:
        break;
    }

    return true;
  }

  /**
   * 每帧核心更新逻辑
   * @param {number} time - 全局游戏运行时间 (ms)
   * @param {number} delta - 距离上一帧的时间间隔 (ms)
   */
  update(time, delta) {
    if (this.currentState === PLAYER_STATES.DEAD) return;

    // 1. 处理被动 MP 自然恢复
    this._regenerateMp(delta);

    // 2. 面朝鼠标十字准星方向实时翻转 (flipX)
    this._updateFacingDirection();

    // 3. 处理八向移动输入与物理加速度
    this._handleMovementInput();
  }

  /**
   * 根据鼠标在世界坐标系中的相对位置翻转精灵
   * @private
   */
  _updateFacingDirection() {
    const pointer = this.scene.input.activePointer;
    if (!pointer) return;

    // 获取鼠标指针在世界地图中的绝对坐标
    const worldX = pointer.worldX;
    if (worldX < this.x - 4) {
      this.setFlipX(true);  // 面朝左
    } else if (worldX > this.x + 4) {
      this.setFlipX(false); // 面朝右
    }
  }

  /**
   * 八向平滑移动与加速度控制
   * @private
   */
  _handleMovementInput() {
    // 冲刺、攻击硬直或受击硬直中禁止普通移动控制
    if (
      this.currentState === PLAYER_STATES.DASH ||
      this.currentState === PLAYER_STATES.ATTACK ||
      this.currentState === PLAYER_STATES.HURT
    ) {
      return;
    }

    if (!this.keys) return;

    let moveX = 0;
    let moveY = 0;

    if (this.keys.A.isDown || this.keys.LEFT.isDown) moveX -= 1;
    if (this.keys.D.isDown || this.keys.RIGHT.isDown) moveX += 1;
    if (this.keys.W.isDown || this.keys.UP.isDown) moveY -= 1;
    if (this.keys.S.isDown || this.keys.DOWN.isDown) moveY += 1;

    // 存在方向输入时归一化向量，防止对角线加速移动
    if (moveX !== 0 || moveY !== 0) {
      const dirVec = new Phaser.Math.Vector2(moveX, moveY).normalize();
      const targetSpeed = PLAYER_PHYSICS.MAX_SPEED;

      // 施加平滑加速度
      this.body.setAcceleration(
        dirVec.x * PLAYER_PHYSICS.ACCELERATION,
        dirVec.y * PLAYER_PHYSICS.ACCELERATION
      );

      // 确保进入 RUN 状态
      this.changeState(PLAYER_STATES.RUN);
    } else {
      // 无输入时切断加速度，依赖 Arcade 的 Drag 自然减速归零
      this.body.setAcceleration(0, 0);

      // 当速度接近静止时转入 IDLE
      if (this.body.velocity.length() < 15) {
        this.body.setVelocity(0, 0);
        this.changeState(PLAYER_STATES.IDLE);
      }
    }
  }

  /**
   * 执行冲刺位移与残影拖尾
   * @param {Phaser.Math.Vector2} [direction] - 指定冲刺向量
   * @private
   */
  _executeDash(direction) {
    let dashVec = direction;

    // 如果未传入指定方向，优先取当前移动输入方向，若无输入则朝向鼠标指针
    if (!dashVec || dashVec.lengthSq() === 0) {
      let moveX = 0;
      let moveY = 0;
      if (this.keys.A.isDown || this.keys.LEFT.isDown) moveX -= 1;
      if (this.keys.D.isDown || this.keys.RIGHT.isDown) moveX += 1;
      if (this.keys.W.isDown || this.keys.UP.isDown) moveY -= 1;
      if (this.keys.S.isDown || this.keys.DOWN.isDown) moveY += 1;

      if (moveX !== 0 || moveY !== 0) {
        dashVec = new Phaser.Math.Vector2(moveX, moveY).normalize();
      } else {
        const pointer = this.scene.input.activePointer;
        dashVec = new Phaser.Math.Vector2(pointer.worldX - this.x, pointer.worldY - this.y).normalize();
      }
    }

    const dashSpeed = PLAYER_PHYSICS.DASH_SPEED;
    this.body.setVelocity(dashVec.x * dashSpeed, dashVec.y * dashSpeed);
    this.body.setAcceleration(0, 0);

    // 冲刺残影定时生成器
    const ghostTimer = this.scene.time.addEvent({
      delay: 45,
      repeat: 4,
      callback: () => this._spawnDashGhost()
    });

    // 冲刺持续时间结束回调
    if (this.dashTimer) this.dashTimer.remove();
    this.dashTimer = this.scene.time.delayedCall(PLAYER_PHYSICS.DASH_DURATION, () => {
      ghostTimer.remove();
      this.isInvulnerable = false;
      this.changeState(PLAYER_STATES.IDLE);
    });
  }

  /**
   * 生成单帧半透明渐隐残影
   * @private
   */
  _spawnDashGhost() {
    if (!this.active || !this.visible) return;
    const ghost = this.scene.add.sprite(this.x, this.y, this.texture.key, this.frame.name);
    ghost.setDepth(LAYER_DEPTH.CHARACTERS - 1);
    ghost.setOrigin(this.originX, this.originY);
    ghost.setScale(this.scaleX, this.scaleY);
    ghost.setFlipX(this.flipX);
    ghost.setAlpha(0.55);
    ghost.setTint(0x00e5ff); // 科技荧光青残影

    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      scaleX: ghost.scaleX * 1.1,
      duration: 250,
      ease: 'Quad.easeOut',
      onComplete: () => ghost.destroy()
    });
  }

  /**
   * 触发基础普通攻击 (Slash)
   * @returns {boolean} 是否成功挥击
   */
  attack() {
    if (this.currentState === PLAYER_STATES.DEAD || this.currentState === PLAYER_STATES.DASH) {
      return false;
    }

    const now = this.scene.time.now;
    const cd = SKILL_CONFIGS[SKILL_IDS.SLASH].cooldown;
    const lastCast = this.skillCooldowns.get(SKILL_IDS.SLASH) || 0;

    if (now - lastCast < cd) {
      return false; // 冷却中
    }

    this.skillCooldowns.set(SKILL_IDS.SLASH, now);
    this.changeState(PLAYER_STATES.ATTACK);

    // 获取指向坐标
    const pointer = this.scene.input.activePointer;
    const targetAngle = Phaser.Math.Angle.Between(this.x, this.y, pointer.worldX, pointer.worldY);

    // 发布攻击事件供场景或投射物管理器接收
    this.scene.events.emit(GAME_EVENTS.PLAYER_SKILL_CAST, {
      skillId: SKILL_IDS.SLASH,
      source: this,
      targetX: pointer.worldX,
      targetY: pointer.worldY,
      angle: targetAngle,
      damage: this.attackPower * SKILL_CONFIGS[SKILL_IDS.SLASH].damageMultiplier
    });

    // 挥剑视觉短暂停留 160ms
    this.scene.time.delayedCall(160, () => {
      if (this.currentState === PLAYER_STATES.ATTACK) {
        this.changeState(PLAYER_STATES.IDLE);
      }
    });

    return true;
  }

  /**
   * 释放配置技能
   * @param {string} skillId - 技能 ID
   * @param {Object} [targetPoint] - 目标世界坐标 {x, y}
   * @returns {boolean} 是否释放成功
   */
  castSkill(skillId, targetPoint = null) {
    if (this.currentState === PLAYER_STATES.DEAD) return false;

    const skillConfig = SKILL_CONFIGS[skillId];
    if (!skillConfig) return false;

    const now = this.scene.time.now;
    const stats = calculateSkillStats(skillId, this.level);
    const lastCast = this.skillCooldowns.get(skillId) || 0;

    // 1. 冷却检测
    if (now - lastCast < stats.cooldown) {
      return false;
    }

    // 2. 蓝量检测
    if (this.mp < stats.costMp) {
      return false;
    }

    // 扣减蓝量与记录冷却
    this.mp -= stats.costMp;
    this.skillCooldowns.set(skillId, now);

    // 获取目标点
    const pointer = this.scene.input.activePointer;
    const tx = targetPoint ? targetPoint.x : pointer.worldX;
    const ty = targetPoint ? targetPoint.y : pointer.worldY;

    // 根据技能类型处理
    switch (skillId) {
      case SKILL_IDS.DASH: {
        const dir = new Phaser.Math.Vector2(tx - this.x, ty - this.y).normalize();
        this.changeState(PLAYER_STATES.DASH, { direction: dir });
        break;
      }

      case SKILL_IDS.FROST_SHIELD: {
        this.gainShield(stats.baseShieldAmount);
        break;
      }

      default:
        break;
    }

    // 发布技能释放全局事件
    this.scene.events.emit(GAME_EVENTS.PLAYER_SKILL_CAST, {
      skillId,
      source: this,
      targetX: tx,
      targetY: ty,
      stats
    });

    return true;
  }

  /**
   * 承受伤害判定 (含护盾抵扣、受击击退与无敌帧)
   * @param {number} rawDamage - 原始传入伤害
   * @param {Phaser.Math.Vector2|Object} [sourcePos] - 伤害来源世界坐标
   * @param {number} [knockbackForce=200] - 击退冲力
   * @returns {number} 最终扣除的有效伤害
   */
  takeDamage(rawDamage, sourcePos = null, knockbackForce = 200) {
    if (this.currentState === PLAYER_STATES.DEAD || this.isInvulnerable) {
      return 0; // 无敌或已死亡，完全免伤
    }

    let actualDamage = rawDamage;

    // 1. 优先扣减护盾
    if (this.shield > 0) {
      if (this.shield >= actualDamage) {
        this.shield -= actualDamage;
        actualDamage = 0;
      } else {
        actualDamage -= this.shield;
        this.shield = 0;
      }
      this.scene.events.emit(GAME_EVENTS.PLAYER_SHIELD_CHANGED, {
        shield: this.shield,
        maxShield: this.maxShield
      });
    }

    // 2. 剩余伤害扣除真实生命值
    if (actualDamage > 0) {
      this.hp = Math.max(0, this.hp - actualDamage);
      this.scene.events.emit(GAME_EVENTS.PLAYER_DAMAGED, {
        damage: actualDamage,
        currentHp: this.hp,
        maxHp: this.maxHp
      });

      // 3. 击退物理阻力
      if (sourcePos && this.body) {
        const knockVec = new Phaser.Math.Vector2(this.x - sourcePos.x, this.y - sourcePos.y).normalize();
        this.body.setVelocity(knockVec.x * knockbackForce, knockVec.y * knockbackForce);
      }

      // 4. 判断是否致死
      if (this.hp <= 0) {
        this.changeState(PLAYER_STATES.DEAD);
        return actualDamage;
      }

      // 5. 触发受击硬直与短暂无敌保护
      this.changeState(PLAYER_STATES.HURT);
      this._triggerInvulnerability(PLAYER_PHYSICS.INVULNERABLE_DURATION);
    }

    return actualDamage;
  }

  /**
   * 触发受击短暂无敌闪烁
   * @param {number} durationMs - 无敌时长
   * @private
   */
  _triggerInvulnerability(durationMs) {
    this.isInvulnerable = true;
    const blinkTween = this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 80,
      yoyo: true,
      repeat: Math.floor(durationMs / 160)
    });

    this.scene.time.delayedCall(durationMs, () => {
      this.isInvulnerable = false;
      this.setAlpha(1.0);
      if (blinkTween) blinkTween.stop();
    });
  }

  /**
   * 获得护盾
   * @param {number} amount
   */
  gainShield(amount) {
    this.shield = Math.min(this.maxShield, this.shield + amount);
    this.scene.events.emit(GAME_EVENTS.PLAYER_SHIELD_CHANGED, {
      shield: this.shield,
      maxShield: this.maxShield
    });
  }

  /**
   * 生命值治疗
   * @param {number} amount
   */
  heal(amount) {
    if (this.currentState === PLAYER_STATES.DEAD) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.scene.events.emit(GAME_EVENTS.PLAYER_HEALED, {
      amount,
      currentHp: this.hp,
      maxHp: this.maxHp
    });
  }

  /**
   * 获得经验值与升级检测
   * @param {number} amount - 获得经验
   */
  gainExp(amount) {
    if (this.currentState === PLAYER_STATES.DEAD) return;

    this.exp += amount;
    this.scene.events.emit(GAME_EVENTS.PLAYER_EXP_GAINED, {
      amount,
      exp: this.exp,
      maxExp: this.maxExp
    });

    // 升级逻辑
    while (this.exp >= this.maxExp) {
      this.exp -= this.maxExp;
      this.level += 1;
      this.maxExp = Math.floor(this.maxExp * 1.35); // 经验曲线

      // 升级属性提升与满状态回复
      this.maxHp += 25;
      this.hp = this.maxHp;
      this.maxMp += 15;
      this.mp = this.maxMp;
      this.attackPower += 5;

      this.scene.events.emit(GAME_EVENTS.PLAYER_LEVEL_UP, {
        level: this.level,
        maxHp: this.maxHp,
        attackPower: this.attackPower
      });
    }
  }

  /**
   * 自然蓝量恢复
   * @param {number} delta
   * @private
   */
  _regenerateMp(delta) {
    if (this.mp < this.maxMp) {
      this.mp = Math.min(this.maxMp, this.mp + (this.mpRegenRate * delta) / 1000);
    }
  }

  /**
   * 玩家死亡处理
   * @private
   */
  _handleDeath() {
    this.body.setVelocity(0, 0);
    this.body.setAcceleration(0, 0);
    this.body.enable = false; // 禁用物理体

    // 死亡消散缓动
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0.4,
      scaleY: 0.4,
      angle: 90,
      duration: 900,
      ease: 'Power2',
      onComplete: () => {
        this.scene.events.emit(GAME_EVENTS.PLAYER_DIED);
      }
    });
  }

  /**
   * 销毁清理
   */
  destroy(fromScene) {
    if (this.idleTween) {
      this.idleTween.stop();
      this.idleTween = null;
    }
    if (this.dashTimer) {
      this.dashTimer.remove();
      this.dashTimer = null;
    }
    if (this.hurtTimer) {
      this.hurtTimer.remove();
      this.hurtTimer = null;
    }
    super.destroy(fromScene);
  }
}
