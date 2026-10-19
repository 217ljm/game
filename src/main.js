/**
 * @file main.js
 * @description 游戏引擎主入口文件：
 * 严格遵照《游戏项目全面重构与后续开发规范文档 (v2.0)》标准，
 * 初始化 1920×1080 PC 全屏自适应画布容器、Arcade 物理环境与五大 Scene 状态机
 */

import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT, createPhaserConfig } from './config/GameConfig.js';
import BootScene from './scenes/BootScene.js';
import PreloadScene from './scenes/PreloadScene.js';
import MainMenuScene from './scenes/MainMenuScene.js';
import BattleScene from './scenes/BattleScene.js';
import HUDScene from './scenes/HUDScene.js';

// 场景生命周期状态机序列
const sceneList = [BootScene, PreloadScene, MainMenuScene, BattleScene, HUDScene];

// 组装标准引擎配置
const config = createPhaserConfig(sceneList, {
  parent: 'game-container',
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  backgroundColor: '#0a0c10',
});

// 实例化 Phaser 游戏核心
const game = new Phaser.Game(config);

// 挂载至全局对象，便于调试与自动化巡检
if (typeof window !== 'undefined') {
  window.__GAME_INSTANCE__ = game;

  // 全局 F 键全屏切换监听
  window.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') {
      if (!game.scale.isFullscreen) {
        game.scale.startFullscreen();
      } else {
        game.scale.stopFullscreen();
      }
    }
  });
}

// Vite 模块热替换支持 (HMR)
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.destroy(true);
  });
}

export default game;
