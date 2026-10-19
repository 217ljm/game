/**
 * @file VFXManager.js
 * @description 游戏感(Game Juice)与打击感视觉特效管理器：
 * 负责实现规范文档中强制要求的：受击闪白、打击顿帧、屏幕震动、动态战斗跳字、爆裂粒子与地面预警圈
 */

export class VFXManager {
  /**
   * 初始化特效管理器
   * @param {Phaser.Scene} scene 绑定的场景对象
   */
  constructor(scene) {
    this.scene = scene;
    this.textPool = [];
    this.isFrozen = false;
  }

  /**
   * 1. 受击闪白 (Hit Flash)
   * 瞬间将精灵设置为纯白，60ms 后恢复原色
   * @param {Phaser.GameObjects.Sprite} target 受击精灵
   * @param {number} duration 闪白持续毫秒数，默认 60ms
   */
  triggerHitFlash(target, duration = 60) {
    if (!target || !target.setTintFill) return;

    target.setTintFill(0xffffff);
    this.scene.time.delayedCall(duration, () => {
      if (target && target.active) {
        target.clearTint();
      }
    });
  }

  /**
   * 2. 打击顿帧 (Hit Stop / Hit Pause)
   * 暂停场景物理更新微小时长，营造肉体受击沉重阻滞感
   * @param {number} duration 冻结毫秒数，默认 40ms
   */
  triggerHitStop(duration = 40) {
    if (this.isFrozen) return;
    this.isFrozen = true;

    // 暂停物理引擎微小时长
    if (this.scene.physics && this.scene.physics.world) {
      this.scene.physics.world.pause();
    }

    this.scene.time.delayedCall(duration, () => {
      if (this.scene.physics && this.scene.physics.world) {
        this.scene.physics.world.resume();
      }
      this.isFrozen = false;
    });
  }

  /**
   * 3. 屏幕震动 (Screen Shake)
   * 强化攻击命中力量感
   * @param {boolean} isCrit 是否为暴击 (暴击触发大幅重震)
   */
  triggerScreenShake(isCrit = false) {
    const camera = this.scene.cameras.main;
    if (!camera) return;

    if (isCrit) {
      // 暴击强震：持续 90ms，震幅 0.012
      camera.shake(90, 0.012);
    } else {
      // 普通轻震：持续 50ms，震幅 0.004
      camera.shake(50, 0.004);
    }
  }

  /**
   * 4. 动态战斗飘字 (Floating Combat Text)
   * 普通伤害上浮淡出，暴击伤害金黄大号字带 1.5 倍弹簧弹出动画
   * @param {number} x 世界坐标 X
   * @param {number} y 世界坐标 Y
   * @param {number} amount 伤害数值
   * @param {boolean} isCrit 是否为暴击
   * @param {string} type 'damage' | 'heal' | 'shield' | 'miss'
   */
  spawnFloatingText(x, y, amount, isCrit = false, type = "damage") {
    // 随机微小横向偏移，避免文字完全重叠
    const offsetX = x + (Math.random() - 0.5) * 36;
    const offsetY = y - 24;

    let content = `${amount}`;
    let style = {
      fontFamily: '"Impact", "Microsoft YaHei", sans-serif',
      fontSize: "26px",
      color: "#ffffff",
      stroke: "#0a0c10",
      strokeThickness: 5,
      align: "center",
      shadow: { offsetX: 2, offsetY: 2, color: "#000", blur: 4, fill: true },
    };

    if (type === "heal") {
      content = `+${amount}`;
      style.color = "#a3be8c";
      style.fontSize = "28px";
    } else if (isCrit) {
      content = `CRIT! ${amount}`;
      style.color = "#ebcb8b"; // 明黄金色
      style.fontSize = "38px";
      style.strokeThickness = 7;
    } else {
      style.color = "#eceff4";
      style.fontSize = "28px";
    }

    const textObj = this.scene.add.text(offsetX, offsetY, content, style);
    textObj.setOrigin(0.5, 0.5);
    textObj.setDepth(1000);

    if (isCrit) {
      // 暴击弹簧放大动画：从 0.4x 弹到 1.45x，再微缩回 1.2x，最后上浮淡出
      textObj.setScale(0.4);
      this.scene.tweens.add({
        targets: textObj,
        scale: 1.45,
        y: offsetY - 36,
        duration: 160,
        ease: "Back.easeOut",
        onComplete: () => {
          this.scene.tweens.add({
            targets: textObj,
            scale: 1.1,
            y: offsetY - 70,
            alpha: 0,
            duration: 380,
            ease: "Quad.easeIn",
            onComplete: () => textObj.destroy(),
          });
        },
      });
    } else {
      // 普通伤害：轻快上浮与平滑淡出
      this.scene.tweens.add({
        targets: textObj,
        y: offsetY - 50,
        alpha: 0,
        duration: 550,
        ease: "Quad.easeOut",
        onComplete: () => textObj.destroy(),
      });
    }
  }

  /**
   * 5. 命中爆裂火花粒子 (Hit Sparks)
   * @param {number} x 命中位置 X
   * @param {number} y 命中位置 Y
   * @param {number} color 粒子色调 (0xffdd44, 0xff5533 等)
   */
  spawnHitSparks(x, y, color = 0xffcc44) {
    const particleCount = 10;
    for (let i = 0; i < particleCount; i++) {
      const spark = this.scene.add.circle(x, y, 3 + Math.random() * 2, color);
      spark.setDepth(999);

      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 180;
      const targetX = x + Math.cos(angle) * (speed * 0.25);
      const targetY = y + Math.sin(angle) * (speed * 0.25);

      this.scene.tweens.add({
        targets: spark,
        x: targetX,
        y: targetY,
        scale: 0.1,
        alpha: 0,
        duration: 220 + Math.random() * 120,
        ease: "Cubic.easeOut",
        onComplete: () => spark.destroy(),
      });
    }
  }

  /**
   * 6. 地面攻击预警指示器 (Telegraph Indicator)
   * 在敌人或 Boss 攻击前，在地面绘制带渐进填充动画的红圈
   * @param {number} x 圆心 X
   * @param {number} y 圆心 Y
   * @param {number} radius 预警半径
   * @param {number} duration 预警时长毫秒
   * @param {Function} onComplete 预警完毕回调（执行伤害判定）
   */
  spawnTelegraphCircle(x, y, radius, duration, onComplete) {
    const graphics = this.scene.add.graphics();
    graphics.setDepth(10); // 在地面之上、实体之下

    const startTime = this.scene.time.now;
    let timerEvent;

    const updateTelegraph = () => {
      const elapsed = this.scene.time.now - startTime;
      const progress = Math.min(1, elapsed / duration);

      graphics.clear();
      // 外圈红线
      graphics.lineStyle(3, 0xff3344, 0.85);
      graphics.strokeCircle(x, y, radius);

      // 内圈动态向外扩散填充
      graphics.fillStyle(0xff2233, 0.28 + progress * 0.25);
      graphics.fillCircle(x, y, radius * progress);

      if (progress >= 1) {
        if (timerEvent) timerEvent.remove();
        graphics.destroy();
        if (onComplete) onComplete();
      }
    };

    timerEvent = this.scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: updateTelegraph,
    });

    return {
      cancel: () => {
        if (timerEvent) timerEvent.remove();
        graphics.destroy();
      },
    };
  }
}
