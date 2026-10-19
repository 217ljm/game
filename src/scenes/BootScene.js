/**
 * @file BootScene.js
 * @description 启动场景：负责全局分辨率与视口校验、DPI设置、全屏按键监听绑定，并平滑转场至 PreloadScene
 */

import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config/GameConfig.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // 基础启动配置
  }

  create() {
    // 1. 确保画布等比铺满 PC 全屏 (1920x1080 FIT 模式)
    this.scale.setGameSize(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.scale.refresh();

    // 2. 绑定全局一键全屏快捷键 (F 键)
    this.input.keyboard.on('keydown-F', () => {
      this.toggleFullscreen();
    });

    // 3. 禁用浏览器右键上下文菜单，确保右键冲刺/施法操作顺畅
    this.input.mouse.disableContextMenu();

    // 4. 立即平滑转场至资源预加载场景
    this.scene.start('PreloadScene');
  }

  /**
   * 切换沉浸式全屏
   */
  toggleFullscreen() {
    if (this.scale.isFullscreen) {
      this.scale.stopFullscreen();
    } else {
      this.scale.startFullscreen();
    }
  }
}

export default BootScene;
