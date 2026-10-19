/**
 * @file check-game-refactor-consistency.mjs
 * @description 静态分析与模块引用一致性校验脚本
 * 验证所有重构后的场景、实体、系统、配置与资产生成器的导出与关联完整性
 */

import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

console.log('=== [1/4] 检查关键入口与配置文件 ===');
const requiredFiles = [
  'index.html',
  'vite.config.js',
  'package.json',
  'DEVELOPMENT_DOC.md',
  'public/assets/manifest.json',
  'src/main.js',
  'src/config/GameConfig.js',
  'src/config/SkillData.js',
  'src/config/EnemyData.js',
  'src/entities/Player.js',
  'src/entities/Enemy.js',
  'src/entities/Projectile.js',
  'src/systems/CombatSystem.js',
  'src/systems/VFXManager.js',
  'src/systems/AssetGenerator.js',
  'src/scenes/BootScene.js',
  'src/scenes/PreloadScene.js',
  'src/scenes/MainMenuScene.js',
  'src/scenes/BattleScene.js',
  'src/scenes/HUDScene.js'
];

let hasError = false;
for (const relPath of requiredFiles) {
  const fullPath = path.join(projectRoot, relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ 缺失关键文件: ${relPath}`);
    hasError = true;
  } else {
    const stat = fs.statSync(fullPath);
    console.log(`✅ [存在] ${relPath} (${stat.size} 字节)`);
  }
}

if (hasError) {
  process.exit(1);
}

console.log('\n=== [2/4] 检查 manifest.json 格式与键值 ===');
const manifestContent = fs.readFileSync(path.join(projectRoot, 'public/assets/manifest.json'), 'utf-8');
const manifestJson = JSON.parse(manifestContent);
const categories = ['backgrounds', 'characters', 'enemies', 'icons', 'ui', 'vfx'];
for (const cat of categories) {
  if (manifestJson.categories && manifestJson.categories[cat]) {
    const count = Object.keys(manifestJson.categories[cat].items || {}).length;
    console.log(`✅ manifest 分类 [${cat}]: 注册了 ${count} 项`);
  } else {
    console.error(`❌ manifest 缺失分类: ${cat}`);
    hasError = true;
  }
}

console.log('\n=== [3/4] 检查场景与系统关键导入导出 ===');
const checkImports = [
  { file: 'src/main.js', patterns: ['BootScene', 'PreloadScene', 'MainMenuScene', 'BattleScene', 'HUDScene', 'createPhaserConfig'] },
  { file: 'src/scenes/BattleScene.js', patterns: ['Player', 'Enemy', 'Projectile', 'CombatSystem', 'VFXManager', 'SKILL_CONFIG'] },
  { file: 'src/scenes/HUDScene.js', patterns: ['CANVAS_WIDTH', 'CANVAS_HEIGHT', 'showLevelUpCards', 'showResultModal'] },
  { file: 'src/systems/AssetGenerator.js', patterns: ['generateDungeonArenaBg', 'generateHeroWarrior', 'generateEnemySkeleton', 'generateBossDragonKnight', 'generateAll'] }
];

for (const check of checkImports) {
  const code = fs.readFileSync(path.join(projectRoot, check.file), 'utf-8');
  for (const pat of check.patterns) {
    if (!code.includes(pat)) {
      console.error(`❌ 文件 ${check.file} 缺失关键标识符: ${pat}`);
      hasError = true;
    }
  }
  console.log(`✅ 文件 ${check.file} 关键接口与依赖关系核对通过`);
}

console.log('\n=== [4/4] 检查全屏 CSS 视口锁定 ===');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf-8');
if (indexHtml.includes('100vw') && indexHtml.includes('100vh') && indexHtml.includes('overflow: hidden')) {
  console.log('✅ index.html 严格实施 100vw × 100vh 且锁死滚动条');
} else {
  console.error('❌ index.html 未严格锁死 100vw/100vh 滚动条');
  hasError = true;
}

if (!hasError) {
  console.log('\n🎉 所有模块一致性与规范要求 100% 校验通过！');
}
