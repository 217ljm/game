/**
 * @file HUDScene.js
 * @description 顶层常驻悬浮 UI 场景：
 * 包含四周锚点定位、玩家血条/缓冲白条/护盾/经验、底部技能快捷槽与扇形CD遮罩、
 * 关底Boss专属血条、3选1肉鸽战术强化卡牌弹窗、胜利/失败结算
 */

import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT, LAYER_DEPTH, GAME_EVENTS } from '../config/GameConfig.js';
import { SKILL_CONFIG } from '../config/SkillData.js';

export class HUDScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HUDScene' });
  }

  create() {
    // 监听窗口尺寸变化，保持顶层锚点准确
    this.scale.on('resize', this.handleResize, this);

    // 1. 左上角玩家状态栏 (头像/血条/缓冲白条/护盾/经验)
    this.createPlayerStatusBar();

    // 2. 底部技能快捷栏 (左键普攻/Q/E/R)
    this.createSkillHotbar();

    // 3. 右上角全屏与状态辅助栏
    this.createTopRightControls();

    // 4. 关底 Boss 专属顶部血条 (默认隐藏)
    this.createBossHealthBar();

    // 5. 波次提示横幅
    this.createWaveBanner();

    // 6. 注册战斗事件监听
    this.bindBattleEvents();
  }

  /**
   * 1. 左上角玩家状态面板
   */
  createPlayerStatusBar() {
    this.playerStatusContainer = this.add.container(40, 36);

    // 角色头像框外底
    const avatarBg = this.add.graphics();
    avatarBg.fillStyle(0x0f172a, 0.95);
    avatarBg.lineStyle(3, 0xd08770, 1);
    avatarBg.strokeRoundedRect(0, 0, 72, 72, 8);
    avatarBg.fillRoundedRect(0, 0, 72, 72, 8);
    this.playerStatusContainer.add(avatarBg);

    // 头像小图标 (hero_warrior 精灵缩略)
    const avatarSprite = this.add.image(36, 36, 'hero_warrior').setDisplaySize(58, 58);
    this.playerStatusContainer.add(avatarSprite);

    // 等级标签徽章
    this.levelBadge = this.add.text(36, 78, 'Lv.1', {
      fontFamily: '"Impact", "Microsoft YaHei", sans-serif',
      fontSize: '15px',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.playerStatusContainer.add(this.levelBadge);

    // 玩家名称与称号
    const nameText = this.add.text(88, 4, '先锋战士 (Pioneer)', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '16px',
      color: '#f8fafc',
      fontStyle: 'bold',
      stroke: '#0f172a',
      strokeThickness: 2,
    });
    this.playerStatusContainer.add(nameText);

    // 生命值条背景槽 (长 280, 高 18)
    this.hpBarWidth = 280;
    this.hpBarHeight = 18;

    const hpBg = this.add.graphics();
    hpBg.fillStyle(0x1a202c, 0.95);
    hpBg.lineStyle(2, 0x475569, 0.9);
    hpBg.strokeRoundedRect(88, 28, this.hpBarWidth, this.hpBarHeight, 4);
    hpBg.fillRoundedRect(88, 28, this.hpBarWidth, this.hpBarHeight, 4);
    this.playerStatusContainer.add(hpBg);

    // 受击延迟缓冲白条 (Ghost Health Bar)
    this.hpGhostGraphics = this.add.graphics();
    this.playerStatusContainer.add(this.hpGhostGraphics);

    // 主生命值填充条 (绿色/红色渐变)
    this.hpFillGraphics = this.add.graphics();
    this.playerStatusContainer.add(this.hpFillGraphics);

    // 护盾覆盖条
    this.shieldGraphics = this.add.graphics();
    this.playerStatusContainer.add(this.shieldGraphics);

    // 生命值数值文本
    this.hpText = this.add.text(88 + this.hpBarWidth / 2, 28 + this.hpBarHeight / 2, '500 / 500', {
      fontFamily: '"Impact", sans-serif',
      fontSize: '13px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.playerStatusContainer.add(this.hpText);

    // 经验条 (长 280, 高 6)
    const expBg = this.add.graphics();
    expBg.fillStyle(0x0f172a, 0.85);
    expBg.fillRoundedRect(88, 52, this.hpBarWidth, 6, 2);
    this.playerStatusContainer.add(expBg);

    this.expFillGraphics = this.add.graphics();
    this.playerStatusContainer.add(this.expFillGraphics);

    // 初始绘制血条
    this.currentHp = 500;
    this.maxHp = 500;
    this.currentGhostHp = 500;
    this.currentShield = 0;
    this.currentExp = 0;
    this.nextLevelExp = 100;
    this.renderHealthBar();
    this.renderExpBar();
  }

  /**
   * 刷新生命值条与缓冲白条
   */
  renderHealthBar() {
    const hpRatio = Math.max(0, Math.min(1, this.currentHp / this.maxHp));
    const currentW = Math.round(this.hpBarWidth * hpRatio);

    // 绘制主血条
    this.hpFillGraphics.clear();
    if (currentW > 0) {
      if (hpRatio > 0.45) {
        this.hpFillGraphics.fillGradientStyle(0x22c55e, 0x16a34a, 0x15803d, 0x16a34a, 1);
      } else {
        this.hpFillGraphics.fillGradientStyle(0xef4444, 0xdc2626, 0xb91c1c, 0xdc2626, 1);
      }
      this.hpFillGraphics.fillRoundedRect(88, 28, currentW, this.hpBarHeight, 4);
    }

    // 绘制护盾条 (浅蓝半透叠加)
    this.shieldGraphics.clear();
    if (this.currentShield > 0) {
      const shieldRatio = Math.min(1, this.currentShield / this.maxHp);
      const shieldW = Math.round(this.hpBarWidth * shieldRatio);
      this.shieldGraphics.fillStyle(0x38bdf8, 0.65);
      this.shieldGraphics.fillRoundedRect(88, 28, shieldW, this.hpBarHeight, 4);
    }

    // 更新文本
    const shieldStr = this.currentShield > 0 ? ` (+${this.currentShield})` : '';
    this.hpText.setText(`${Math.round(this.currentHp)} / ${this.maxHp}${shieldStr}`);

    // 平滑缓降白条
    this.tweens.add({
      targets: this,
      currentGhostHp: this.currentHp,
      duration: 450,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        const ghostRatio = Math.max(0, Math.min(1, this.currentGhostHp / this.maxHp));
        const ghostW = Math.round(this.hpBarWidth * ghostRatio);
        this.hpGhostGraphics.clear();
        if (ghostW > currentW) {
          this.hpGhostGraphics.fillStyle(0xf1f5f9, 0.75);
          this.hpGhostGraphics.fillRoundedRect(88 + currentW, 28, ghostW - currentW, this.hpBarHeight, 4);
        }
      },
    });
  }

  /**
   * 刷新经验条
   */
  renderExpBar() {
    const ratio = Math.max(0, Math.min(1, this.currentExp / this.nextLevelExp));
    const expW = Math.round(this.hpBarWidth * ratio);
    this.expFillGraphics.clear();
    if (expW > 0) {
      this.expFillGraphics.fillStyle(0xfacc15, 0.95);
      this.expFillGraphics.fillRoundedRect(88, 52, expW, 6, 2);
    }
  }

  /**
   * 2. 底部技能快捷栏 (居中)
   */
  createSkillHotbar() {
    this.hotbarContainer = this.add.container(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 65);

    // 技能槽清单配置
    this.skillSlots = [
      { id: 'slash', key: 'icon_slash', hotkey: '左键', label: '疾风斩击', cd: 400 },
      { id: 'fire_wave', key: 'icon_fireball', hotkey: 'Q', label: '炽焰散射', cd: 2400 },
      { id: 'dash', key: 'icon_dash', hotkey: 'E', label: '暴风冲刺', cd: 2000 },
      { id: 'thunder_strike', key: 'icon_thunder', hotkey: 'R', label: '天顶雷霆', cd: 5000 },
    ];

    const slotSize = 64;
    const gap = 24;
    const totalW = this.skillSlots.length * slotSize + (this.skillSlots.length - 1) * gap;
    const startX = -totalW / 2 + slotSize / 2;

    this.slotViews = {};

    this.skillSlots.forEach((slot, idx) => {
      const posX = startX + idx * (slotSize + gap);
      const slotContainer = this.add.container(posX, 0);

      // 外框背景
      const border = this.add.graphics();
      border.fillStyle(0x0f172a, 0.9);
      border.lineStyle(2, 0xd08770, 0.9);
      border.strokeRoundedRect(-slotSize / 2, -slotSize / 2, slotSize, slotSize, 8);
      border.fillRoundedRect(-slotSize / 2, -slotSize / 2, slotSize, slotSize, 8);
      slotContainer.add(border);

      // 技能图标
      const icon = this.add.image(0, 0, slot.key).setDisplaySize(slotSize - 8, slotSize - 8);
      slotContainer.add(icon);

      // 扇形冷却遮罩
      const cdMask = this.add.graphics();
      slotContainer.add(cdMask);

      // 倒计时剩余秒数文本
      const cdText = this.add.text(0, 0, '', {
        fontFamily: '"Impact", sans-serif',
        fontSize: '22px',
        color: '#f8fafc',
        stroke: '#000',
        strokeThickness: 4,
      }).setOrigin(0.5);
      cdText.setVisible(false);
      slotContainer.add(cdText);

      // 键位角标
      const hotkeyBadge = this.add.text(-slotSize / 2 + 6, -slotSize / 2 + 4, slot.hotkey, {
        fontFamily: '"Impact", sans-serif',
        fontSize: '13px',
        color: '#facc15',
        stroke: '#0f172a',
        strokeThickness: 3,
      });
      slotContainer.add(hotkeyBadge);

      this.hotbarContainer.add(slotContainer);

      this.slotViews[slot.id] = {
        container: slotContainer,
        cdMask,
        cdText,
        slotSize,
        cdTimer: 0,
        maxCd: slot.cd,
      };
    });
  }

  /**
   * 触发技能冷却动画
   */
  triggerSkillCooldown(skillId, duration) {
    const view = this.slotViews[skillId];
    if (!view) return;

    view.maxCd = duration;
    view.cdTimer = duration;
    view.cdText.setVisible(true);
  }

  /**
   * 3. 右上角全屏与状态辅助栏
   */
  createTopRightControls() {
    this.topRightContainer = this.add.container(CANVAS_WIDTH - 200, 36);

    // 全屏按钮底框
    const btnBox = this.add.graphics();
    btnBox.fillStyle(0x0f172a, 0.85);
    btnBox.lineStyle(2, 0xd08770, 0.9);
    btnBox.strokeRoundedRect(0, 0, 160, 42, 6);
    btnBox.fillRoundedRect(0, 0, 160, 42, 6);
    this.topRightContainer.add(btnBox);

    const btnText = this.add.text(80, 21, '全屏模式 [ F ]', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '15px',
      color: '#f8fafc',
      letterSpacing: 1,
    }).setOrigin(0.5);
    this.topRightContainer.add(btnText);

    this.topRightContainer.setSize(160, 42);
    this.topRightContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, 160, 42), Phaser.Geom.Rectangle.Contains);

    this.topRightContainer.on('pointerdown', () => {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
      } else {
        this.scale.startFullscreen();
      }
    });

    this.topRightContainer.on('pointerover', () => {
      btnText.setColor('#ffd700');
    });

    this.topRightContainer.on('pointerout', () => {
      btnText.setColor('#f8fafc');
    });
  }

  /**
   * 4. 关底 Boss 专属宏伟血条 (默认隐藏)
   */
  createBossHealthBar() {
    this.bossBarContainer = this.add.container(CANVAS_WIDTH / 2, 70);
    this.bossBarContainer.setVisible(false);

    const barW = 680;
    const barH = 22;

    // 凹槽底框
    const bg = this.add.graphics();
    bg.fillStyle(0x18181b, 0.95);
    bg.lineStyle(3, 0xef4444, 1);
    bg.strokeRoundedRect(-barW / 2, 0, barW, barH, 6);
    bg.fillRoundedRect(-barW / 2, 0, barW, barH, 6);
    this.bossBarContainer.add(bg);

    // 填充条
    this.bossHpFill = this.add.graphics();
    this.bossBarContainer.add(this.bossHpFill);

    // Boss 名字与称号
    this.bossNameText = this.add.text(0, -22, '⚔️ 深渊首领 · 暗黑龙骑士 (Dragon Knight) ⚔️', {
      fontFamily: '"Impact", "Microsoft YaHei", sans-serif',
      fontSize: '20px',
      color: '#fca5a5',
      stroke: '#000',
      strokeThickness: 3,
      letterSpacing: 2,
    }).setOrigin(0.5);
    this.bossBarContainer.add(this.bossNameText);

    this.bossBarW = barW;
    this.bossBarH = barH;
  }

  /**
   * 刷新 Boss 血条
   */
  updateBossHealth(current, max) {
    if (!this.bossBarContainer.visible) {
      this.bossBarContainer.setVisible(true);
      this.bossBarContainer.setAlpha(0);
      this.tweens.add({ targets: this.bossBarContainer, alpha: 1, duration: 300 });
    }

    const ratio = Math.max(0, Math.min(1, current / max));
    const fillW = Math.round(this.bossBarW * ratio);

    this.bossHpFill.clear();
    if (fillW > 0) {
      this.bossHpFill.fillGradientStyle(0xef4444, 0xb91c1c, 0x7f1d1d, 0xb91c1c, 1);
      this.bossHpFill.fillRoundedRect(-this.bossBarW / 2, 0, fillW, this.bossBarH, 6);
    }
  }

  /**
   * 5. 波次横幅
   */
  createWaveBanner() {
    this.waveBadge = this.add.text(CANVAS_WIDTH / 2, 30, '第 1 波次 · 骷髅围攻', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '18px',
      color: '#e2e8f0',
      stroke: '#0f172a',
      strokeThickness: 3,
      letterSpacing: 2,
    }).setOrigin(0.5);
  }

  /**
   * 更新波次文本
   */
  setWaveText(text) {
    this.waveBadge.setText(text);
    this.tweens.add({
      targets: this.waveBadge,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 180,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  /**
   * 6. 3 选 1 肉鸽战术强化卡牌界面 (Level Up Modal)
   */
  showLevelUpCards(options, onSelectCallback) {
    const modal = this.add.container(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    modal.setDepth(LAYER_DEPTH.MODAL);

    // 全屏半透阻挡背景
    const blocker = this.add.rectangle(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0x000000, 0.82);
    blocker.setInteractive();
    modal.add(blocker);

    // 标题文本
    const title = this.add.text(0, -260, '★ 战 术 强 化 觉 醒 ★', {
      fontFamily: '"Impact", "Microsoft YaHei", sans-serif',
      fontSize: '48px',
      color: '#facc15',
      letterSpacing: 6,
      stroke: '#0f172a',
      strokeThickness: 6,
    }).setOrigin(0.5);
    modal.add(title);

    const sub = this.add.text(0, -200, '选择一项战术流派专长，彻底重构你的战斗形态与弹道机制', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '18px',
      color: '#94a3b8',
    }).setOrigin(0.5);
    modal.add(sub);

    // 渲染 3 张卡牌
    const cardW = 300;
    const cardH = 430;
    const spacing = 50;
    const totalW = 3 * cardW + 2 * spacing;
    const startX = -totalW / 2 + cardW / 2;

    options.forEach((opt, idx) => {
      const cardX = startX + idx * (cardW + spacing);
      const cardContainer = this.add.container(cardX, 30);

      // 卡牌底框背景
      const cardBg = this.add.graphics();
      const drawCardBg = (hover = false) => {
        cardBg.clear();
        if (hover) {
          cardBg.lineStyle(3, 0xfacc15, 1);
          cardBg.fillStyle(0x1e293b, 0.98);
        } else {
          cardBg.lineStyle(2, 0xd08770, 0.85);
          cardBg.fillStyle(0x0f172a, 0.92);
        }
        cardBg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
        cardBg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
      };
      drawCardBg(false);
      cardContainer.add(cardBg);

      // 卡牌图标 (128x128 缩放至 96x96)
      const icon = this.add.image(0, -110, opt.iconKey || 'icon_slash').setDisplaySize(96, 96);
      cardContainer.add(icon);

      // 技能流派标签
      const tagText = this.add.text(0, -35, opt.tag || '【流派强化】', {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '14px',
        color: '#38bdf8',
        stroke: '#000',
        strokeThickness: 2,
      }).setOrigin(0.5);
      cardContainer.add(tagText);

      // 卡牌主标题
      const nameText = this.add.text(0, -6, opt.title, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '22px',
        color: '#f8fafc',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 3,
      }).setOrigin(0.5);
      cardContainer.add(nameText);

      // 词条描述文本
      const descText = this.add.text(0, 80, opt.desc, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '15px',
        color: '#cbd5e1',
        align: 'center',
        wordWrap: { width: cardW - 40 },
        lineSpacing: 6,
      }).setOrigin(0.5);
      cardContainer.add(descText);

      // 底部选择按钮提示
      const selectBtn = this.add.text(0, cardH / 2 - 38, '点 击 激 活', {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '16px',
        color: '#ffd700',
        stroke: '#000',
        strokeThickness: 3,
      }).setOrigin(0.5);
      cardContainer.add(selectBtn);

      // 交互检测
      cardContainer.setSize(cardW, cardH);
      cardContainer.setInteractive({ useHandCursor: true });

      cardContainer.on('pointerover', () => {
        drawCardBg(true);
        this.tweens.add({
          targets: cardContainer,
          scaleX: 1.06,
          scaleY: 1.06,
          duration: 120,
          ease: 'Quad.easeOut',
        });
      });

      cardContainer.on('pointerout', () => {
        drawCardBg(false);
        this.tweens.add({
          targets: cardContainer,
          scaleX: 1.0,
          scaleY: 1.0,
          duration: 120,
          ease: 'Quad.easeOut',
        });
      });

      cardContainer.on('pointerdown', () => {
        // 选择完成
        this.tweens.add({
          targets: cardContainer,
          scaleX: 0.95,
          scaleY: 0.95,
          duration: 80,
          yoyo: true,
          onComplete: () => {
            modal.destroy();
            if (onSelectCallback) onSelectCallback(opt);
          },
        });
      });

      modal.add(cardContainer);
    });

    // 弹窗弹出动画
    modal.setScale(0.85);
    modal.setAlpha(0);
    this.tweens.add({
      targets: modal,
      scale: 1,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  /**
   * 7. 结算面板 (胜利 / 失败)
   */
  showResultModal(isVictory, stats, onRestart) {
    const modal = this.add.container(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    modal.setDepth(LAYER_DEPTH.MODAL);

    const blocker = this.add.rectangle(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0x000000, 0.88);
    blocker.setInteractive();
    modal.add(blocker);

    const boxW = 580;
    const boxH = 460;
    const box = this.add.graphics();
    const borderColor = isVictory ? 0xfacc15 : 0xef4444;
    box.lineStyle(3, borderColor, 1);
    box.fillStyle(0x0f172a, 0.95);
    box.strokeRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, 12);
    box.fillRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, 12);
    modal.add(box);

    const titleText = isVictory ? '🏆 深 渊 大 捷 · 凯 旋 🏆' : '💀 意 志 湮 灭 · 败 亡 💀';
    const titleColor = isVictory ? '#facc15' : '#ef4444';
    const mainTitle = this.add.text(0, -boxH / 2 + 50, titleText, {
      fontFamily: '"Impact", "Microsoft YaHei", sans-serif',
      fontSize: '38px',
      color: titleColor,
      letterSpacing: 4,
    }).setOrigin(0.5);
    modal.add(mainTitle);

    // 数据展示
    const statLines = [
      `消灭敌方单位：${stats.kills || 0}`,
      `造成总伤害量：${stats.totalDamage || 0}`,
      `获取战利品金币：${stats.gold || 0}`,
      `探索达成波次：${stats.wave || 1} / 4`,
    ];

    statLines.forEach((text, i) => {
      const item = this.add.text(0, -70 + i * 40, text, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '18px',
        color: '#e2e8f0',
        letterSpacing: 1,
      }).setOrigin(0.5);
      modal.add(item);
    });

    // 重新开始按钮
    const btnW = 260;
    const btnH = 50;
    const restartBtn = this.add.container(0, boxH / 2 - 55);

    const btnBg = this.add.graphics();
    btnBg.lineStyle(2, borderColor, 1);
    btnBg.fillStyle(0x1e293b, 1);
    btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
    btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
    restartBtn.add(btnBg);

    const btnLabel = this.add.text(0, 0, '再 次 挑 战', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    restartBtn.add(btnLabel);

    restartBtn.setSize(btnW, btnH);
    restartBtn.setInteractive({ useHandCursor: true });
    restartBtn.on('pointerdown', () => {
      modal.destroy();
      if (onRestart) onRestart();
    });

    modal.add(restartBtn);
  }

  /**
   * 注册战斗全局事件监听
   */
  bindBattleEvents() {
    const battleScene = this.scene.get('BattleScene');
    if (!battleScene) return;

    // 监听玩家受击/治愈
    battleScene.events.on('player:health_change', (data) => {
      this.currentHp = data.hp;
      this.maxHp = data.maxHp;
      this.currentShield = data.shield || 0;
      this.renderHealthBar();
    });

    // 监听经验与等级
    battleScene.events.on('player:exp_change', (data) => {
      this.currentExp = data.exp;
      this.nextLevelExp = data.nextLevelExp;
      this.levelBadge.setText(`Lv.${data.level}`);
      this.renderExpBar();
    });

    // 监听技能释放与CD触发
    battleScene.events.on('player:skill_cooldown', (data) => {
      this.triggerSkillCooldown(data.skillId, data.cooldown);
    });

    // 监听 Boss 血量
    battleScene.events.on('boss:health_change', (data) => {
      this.updateBossHealth(data.hp, data.maxHp);
    });

    // 监听波次变化
    battleScene.events.on('wave:change', (data) => {
      this.setWaveText(data.title);
    });
  }

  update(time, delta) {
    // 刷新各技能槽冷却扇形遮罩与剩余秒数
    for (const id in this.slotViews) {
      const view = this.slotViews[id];
      if (view.cdTimer > 0) {
        view.cdTimer -= delta;
        if (view.cdTimer <= 0) {
          view.cdTimer = 0;
          view.cdMask.clear();
          view.cdText.setVisible(false);
        } else {
          const ratio = view.cdTimer / view.maxCd;
          view.cdMask.clear();
          view.cdMask.fillStyle(0x000000, 0.65);
          // 绘制扇形冷却阴影
          view.cdMask.beginPath();
          view.cdMask.moveTo(0, 0);
          view.cdMask.arc(0, 0, view.slotSize / 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio, false);
          view.cdMask.closePath();
          view.cdMask.fillPath();

          // 倒计时秒数
          view.cdText.setText((view.cdTimer / 1000).toFixed(1));
        }
      }
    }
  }

  handleResize() {
    this.hotbarContainer.setPosition(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 65);
    this.topRightContainer.setPosition(CANVAS_WIDTH - 200, 36);
  }
}

export default HUDScene;
