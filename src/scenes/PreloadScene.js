/**
 * @file PreloadScene.js
 * @description 预加载场景：负责资产清单读取、动态光栅化程序化贴图兜底生成、暗金粒子进度条展示与转场
 */

import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config/GameConfig.js';
import { AssetGenerator } from '../systems/AssetGenerator.js';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    // 渲染高质感全屏加载界面
    this.createLoadingUI();

    // 尝试读取资产总清单
    this.load.json('asset_manifest', 'assets/manifest.json');

    // 绑定加载进度回调
    this.load.on('progress', (value) => {
      this.updateProgress(value);
    });

    this.load.on('complete', () => {
      this.onLoadComplete();
    });
  }

  create() {
    // 核心兜底机制：通过 AssetGenerator 生成全套专业游戏材质（绝不出现白块）
    this.generateFallbackAssets();

    // 通知外部 DOM 容器移除网页级 Loading
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('phaser-ready'));
    }

    // 短暂展示加载完毕光晕，平滑淡出转场至主菜单
    this.tweens.add({
      targets: [this.loadingContainer],
      alpha: 0,
      duration: 350,
      ease: 'Power2',
      onComplete: () => {
        this.scene.start('MainMenuScene');
      },
    });
  }

  /**
   * 绘制高质感暗金全屏加载条
   */
  createLoadingUI() {
    this.loadingContainer = this.add.container(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

    // 暗黑渐变背景遮罩
    const bgMask = this.add.rectangle(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0x0a0c10);
    this.loadingContainer.add(bgMask);

    // 游戏标题 LOGO 文本
    const titleText = this.add.text(0, -90, '末 日 遗 迹 ： 起 源', {
      fontFamily: '"Impact", "Microsoft YaHei", sans-serif',
      fontSize: '44px',
      color: '#e5e9f0',
      letterSpacing: 6,
      stroke: '#2e3440',
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.loadingContainer.add(titleText);

    // 副标题
    const subTitle = this.add.text(0, -40, 'ORIGIN OF RUINS · PC FULLSCREEN 1920×1080', {
      fontFamily: '"Helvetica Neue", Arial, sans-serif',
      fontSize: '16px',
      color: '#d08770',
      letterSpacing: 3,
    }).setOrigin(0.5);
    this.loadingContainer.add(subTitle);

    // 进度条背景底框 (外框金属发光槽)
    const barWidth = 600;
    const barHeight = 20;

    const barBox = this.add.graphics();
    barBox.lineStyle(3, 0xd08770, 0.9);
    barBox.strokeRoundedRect(-barWidth / 2, 20, barWidth, barHeight, 6);
    barBox.fillStyle(0x1a1e28, 0.85);
    barBox.fillRoundedRect(-barWidth / 2, 20, barWidth, barHeight, 6);
    this.loadingContainer.add(barBox);

    // 动态进度条填充图形
    this.progressBar = this.add.graphics();
    this.loadingContainer.add(this.progressBar);

    // 进度百分比文本
    this.progressText = this.add.text(0, 65, '加载资产管线 0%', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '18px',
      color: '#eceff4',
      letterSpacing: 1,
    }).setOrigin(0.5);
    this.loadingContainer.add(this.progressText);

    // 提示小字
    const tipText = this.add.text(0, 110, '提示：游戏支持 1920×1080 宽屏等比缩放，按键盘 [F] 键随时开启一键全屏沉浸体验', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '14px',
      color: '#70788c',
    }).setOrigin(0.5);
    this.loadingContainer.add(tipText);
  }

  /**
   * 刷新进度条
   */
  updateProgress(value) {
    const barWidth = 594;
    const barHeight = 14;
    const currentWidth = barWidth * value;

    this.progressBar.clear();
    // 渐变金红色彩填充
    this.progressBar.fillGradientStyle(0xd08770, 0xebcb8b, 0xbf616a, 0xd08770, 1);
    this.progressBar.fillRoundedRect(-barWidth / 2 + 3, 23, currentWidth, barHeight, 4);

    const percent = Math.floor(value * 100);
    this.progressText.setText(`正在光栅化游戏纹理与音效... ${percent}%`);
  }

  /**
   * 资产加载完毕
   */
  onLoadComplete() {
    this.updateProgress(1.0);
    this.progressText.setText('渲染引擎就绪，正在踏入世界...');
  }

  /**
   * 生成生产级程序化贴图，确保画面质感
   */
  generateFallbackAssets() {
    try {
      AssetGenerator.generateAll(this);
    } catch (err) {
      console.warn('程序化贴图生成预警：', err);
    }
  }
}

export default PreloadScene;
