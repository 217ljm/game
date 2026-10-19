/**
 * @file MainMenuScene.js
 * @description 主菜单场景：全屏动态背景、视差粒子、金色发光大标题与高质感沉浸式菜单系统
 */

import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config/GameConfig.js';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create() {
    // 1. 全屏背景底图 (1920x1080)
    const bg = this.add.image(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'bg_dungeon_arena');
    bg.setDisplaySize(CANVAS_WIDTH, CANVAS_HEIGHT);
    bg.setTint(0x8892aa); // 主菜单下调为冷暗色调，突出 UI 元素

    // 2. 动态环境余烬粒子 (Embers)
    this.createAtmosphericParticles();

    // 3. 游戏主标题 LOGO
    this.createTitleLogo();

    // 4. 沉浸式主菜单按钮组
    this.createMenuItems();

    // 5. 底部版本号与全屏操作提示
    this.createFooterInfo();

    // 6. 场景进入淡入动效
    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  /**
   * 动态环境余烬与魔法光尘微粒
   */
  createAtmosphericParticles() {
    for (let i = 0; i < 35; i++) {
      const x = Math.random() * CANVAS_WIDTH;
      const y = Math.random() * CANVAS_HEIGHT;
      const radius = 1.5 + Math.random() * 2.5;
      const color = Math.random() > 0.4 ? 0xd08770 : 0xebcb8b;

      const particle = this.add.circle(x, y, radius, color, 0.5 + Math.random() * 0.4);

      // 上浮与微摆动动画
      this.tweens.add({
        targets: particle,
        y: y - 180 - Math.random() * 200,
        x: x + (Math.random() - 0.5) * 80,
        alpha: 0,
        duration: 3500 + Math.random() * 3000,
        repeat: -1,
        delay: Math.random() * 2000,
      });
    }
  }

  /**
   * 游戏主标题 LOGO
   */
  createTitleLogo() {
    const titleContainer = this.add.container(CANVAS_WIDTH / 2, 280);

    // 标题主文本
    const titleMain = this.add.text(0, -20, '末 日 遗 迹 ： 起 源', {
      fontFamily: '"Impact", "Microsoft YaHei", sans-serif',
      fontSize: '68px',
      color: '#f8fafc',
      letterSpacing: 10,
      stroke: '#0f172a',
      strokeThickness: 8,
      shadow: { offsetX: 0, offsetY: 8, color: '#000000', blur: 16, fill: true },
    }).setOrigin(0.5);

    // 英文子标题
    const titleSub = this.add.text(0, 52, '— ORIGIN OF RUINS : TACTICAL ACTION —', {
      fontFamily: '"Helvetica Neue", Arial, sans-serif',
      fontSize: '22px',
      color: '#e2b340',
      letterSpacing: 6,
      stroke: '#0f172a',
      strokeThickness: 3,
    }).setOrigin(0.5);

    titleContainer.add([titleMain, titleSub]);

    // 标题正弦微浮动 Tween
    this.tweens.add({
      targets: titleContainer,
      y: 290,
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * 沉浸式主菜单按钮组
   */
  createMenuItems() {
    const startY = 560;
    const spacing = 86;

    // 按钮 1：踏入深渊 (开始战斗)
    this.createMenuButton(CANVAS_WIDTH / 2, startY, '踏 入 深 渊  [ 启 动 战 斗 ]', () => {
      this.startGame();
    }, true);

    // 按钮 2：操作与按键指南
    this.createMenuButton(CANVAS_WIDTH / 2, startY + spacing, '按 键 操 作 与 战 术 指 南', () => {
      this.showControlsModal();
    });

    // 按钮 3：一键全屏切换
    this.createMenuButton(CANVAS_WIDTH / 2, startY + spacing * 2, '切 换 PC 全 屏 视 口  [ 快捷键 F ]', () => {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
      } else {
        this.scale.startFullscreen();
      }
    });
  }

  /**
   * 创建具有工业级 Game Feel 的菜单按钮
   */
  createMenuButton(x, y, text, callback, isPrimary = false) {
    const btnWidth = 440;
    const btnHeight = 62;

    const container = this.add.container(x, y);

    // 按钮底板背景 (发光外框 + 暗黑内底)
    const bgGraphics = this.add.graphics();
    const borderColor = isPrimary ? 0xe2b340 : 0x475569;
    const fillColor = isPrimary ? 0x1e2433 : 0x0f172a;

    const drawButton = (hovered = false) => {
      bgGraphics.clear();
      if (hovered) {
        bgGraphics.lineStyle(3, 0xf6d860, 1);
        bgGraphics.fillStyle(0x2d3748, 0.95);
        bgGraphics.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 8);
        bgGraphics.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 8);
      } else {
        bgGraphics.lineStyle(2, borderColor, 0.85);
        bgGraphics.fillStyle(fillColor, 0.88);
        bgGraphics.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 8);
        bgGraphics.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 8);
      }
    };
    drawButton(false);
    container.add(bgGraphics);

    // 按钮文本
    const label = this.add.text(0, 0, text, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '20px',
      color: isPrimary ? '#fef08a' : '#cbd5e1',
      stroke: '#000',
      strokeThickness: 2,
      letterSpacing: 2,
    }).setOrigin(0.5);
    container.add(label);

    // 启用交互区域
    container.setSize(btnWidth, btnHeight);
    container.setInteractive({ useHandCursor: true });

    // 悬停 Game Feel：1.06x 弹性缩放 + 边框高亮
    container.on('pointerover', () => {
      drawButton(true);
      label.setColor('#ffffff');
      this.tweens.add({
        targets: container,
        scaleX: 1.06,
        scaleY: 1.06,
        duration: 120,
        ease: 'Quad.easeOut',
      });
    });

    container.on('pointerout', () => {
      drawButton(false);
      label.setColor(isPrimary ? '#fef08a' : '#cbd5e1');
      this.tweens.add({
        targets: container,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 120,
        ease: 'Quad.easeOut',
      });
    });

    // 点击下压与回弹反馈
    container.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scaleX: 0.96,
        scaleY: 0.96,
        duration: 80,
        yoyo: true,
        onComplete: () => {
          callback();
        },
      });
    });

    return container;
  }

  /**
   * 启动游戏主场景并挂载 HUD
   */
  startGame() {
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // 停止主菜单场景
      this.scene.stop('MainMenuScene');
      // 启动核心战斗场景
      this.scene.start('BattleScene');
      // 并行启动顶层常驻 HUD 场景
      this.scene.launch('HUDScene');
    });
  }

  /**
   * 弹出按键指南弹窗
   */
  showControlsModal() {
    const modalContainer = this.add.container(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    modalContainer.setDepth(999);

    // 半透明背景阻挡层
    const blocker = this.add.rectangle(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0x000000, 0.75);
    blocker.setInteractive();
    modalContainer.add(blocker);

    // 弹窗底板
    const boxWidth = 720;
    const boxHeight = 520;
    const box = this.add.graphics();
    box.lineStyle(3, 0xd08770, 0.95);
    box.fillStyle(0x0f172a, 0.95);
    box.strokeRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 12);
    box.fillRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 12);
    modalContainer.add(box);

    // 标题
    const modalTitle = this.add.text(0, -boxHeight / 2 + 50, '按 键 操 作 与 战 术 准 则', {
      fontFamily: '"Impact", "Microsoft YaHei", sans-serif',
      fontSize: '32px',
      color: '#f8fafc',
      letterSpacing: 4,
    }).setOrigin(0.5);
    modalContainer.add(modalTitle);

    // 键位图文清单
    const instructions = [
      '【W / A / S / D】 角色八向空间移动与走位躲避',
      '【鼠标指针】 实时控制角色瞄准与面部朝向',
      '【鼠标左键】 挥斩普攻（疾风斩击，击退并穿透近战怪）',
      '【按键 Q】 炽焰散射（3 向烈焰飞弹，高爆发远程穿透）',
      '【按键 E】 暴风冲刺（瞬间无敌帧位移，撕裂身前空间）',
      '【按键 R】 天顶雷霆（大范围 AOE 狂雷轰击与强力打断）',
      '【按键 F】 一键切换 PC 全屏高清沉浸体验',
      '【地面红圈预警】 敌人与 Boss 蓄力判定区，请在 0.6 秒内迅速走位躲开！',
    ];

    instructions.forEach((line, index) => {
      const itemText = this.add.text(-boxWidth / 2 + 60, -boxHeight / 2 + 115 + index * 36, line, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '17px',
        color: index === 7 ? '#f87171' : '#e2e8f0',
        letterSpacing: 1,
      });
      modalContainer.add(itemText);
    });

    // 关闭按钮
    const closeBtn = this.createMenuButton(0, boxHeight / 2 - 50, '知 晓 准 则 ， 关 闭 窗 口', () => {
      modalContainer.destroy();
    }, true);
    modalContainer.add(closeBtn);

    // 弹出动画
    modalContainer.setScale(0.8);
    modalContainer.setAlpha(0);
    this.tweens.add({
      targets: modalContainer,
      scale: 1,
      alpha: 1,
      duration: 180,
      ease: 'Back.easeOut',
    });
  }

  /**
   * 底部说明信息
   */
  createFooterInfo() {
    this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 38, '引擎标准：Phaser 3 · 60 FPS 物理驱动 · 1920×1080 FIT 架构 · 严禁网页化', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '14px',
      color: '#64748b',
      letterSpacing: 2,
    }).setOrigin(0.5);
  }
}

export default MainMenuScene;
