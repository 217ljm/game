import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '..');

console.log('=== [AssetGenerator 自检脚本] 启动 ===');

// 1. 检查 public/assets/manifest.json
const manifestPath = path.join(projectRoot, 'public', 'assets', 'manifest.json');
assert.ok(fs.existsSync(manifestPath), `manifest.json 必须存在于 ${manifestPath}`);

const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
const manifest = JSON.parse(manifestRaw);

assert.ok(manifest.categories, 'manifest.json 必须包含 categories 节点');
const expectedKeys = [
  'bg_dungeon_arena',
  'hero_warrior',
  'enemy_skeleton',
  'boss_dragon_knight',
  'icon_slash',
  'icon_fireball',
  'icon_shield',
  'icon_dash',
  'icon_thunder',
  'panel_frame',
  'card_frame',
  'hp_bar_bg',
  'hp_bar_fill',
  'vfx_spark',
  'vfx_slash_arc',
  'vfx_fire_particle',
];

const allManifestItems = {};
for (const [catName, cat] of Object.entries(manifest.categories)) {
  for (const [itemKey, item] of Object.entries(cat.items || {})) {
    allManifestItems[itemKey] = { ...item, category: catName };
  }
}

for (const key of expectedKeys) {
  assert.ok(allManifestItems[key], `manifest.json 中必须定义贴图键: ${key}`);
  assert.ok(allManifestItems[key].path, `贴图 ${key} 必须定义有效文件路径`);
  assert.ok(allManifestItems[key].width > 0, `贴图 ${key} 必须定义有效宽度`);
  assert.ok(allManifestItems[key].height > 0, `贴图 ${key} 必须定义有效高度`);
}
console.log(`✓ 1. manifest.json 校验通过，包含全部 ${expectedKeys.length} 个规范纹理项！`);

// 2. 动态导入 AssetGenerator
const { AssetGenerator, ASSET_KEYS } = await import('../src/systems/AssetGenerator.js');

assert.ok(AssetGenerator, 'AssetGenerator 类必须成功导出');
assert.ok(ASSET_KEYS, 'ASSET_KEYS 常量对象必须成功导出');

for (const key of expectedKeys) {
  const foundConst = Object.values(ASSET_KEYS).includes(key);
  assert.ok(foundConst, `ASSET_KEYS 必须包含贴图键: ${key}`);
  const generatorFn = AssetGenerator.GENERATORS[key];
  assert.equal(typeof generatorFn, 'function', `贴图 ${key} 必须在 GENERATORS 中注册对应的生成函数`);
}
console.log(`✓ 2. ASSET_KEYS 与 GENERATORS 映射字典校验通过！`);

// 3. 模拟执行所有生成器 (Node 环境降级测试)
for (const key of expectedKeys) {
  const canvas = AssetGenerator.createCanvasTexture(key);
  assert.ok(canvas, `执行 createCanvasTexture("${key}") 必须返回有效的 Canvas 抽象`);
}
console.log(`✓ 3. 全套 16 种纹理在运行时生成函数调用测试通过！`);

// 4. 模拟 Phaser.Scene 注入测试
const mockTextures = new Map();
const mockScene = {
  textures: {
    exists: (key) => mockTextures.has(key),
    addCanvas: (key, canvas) => {
      mockTextures.set(key, canvas);
      return canvas;
    },
  },
};

const result = AssetGenerator.generateAll(mockScene);
assert.equal(result.success, true, 'generateAll 执行必须返回 success: true');
assert.equal(result.count, expectedKeys.length, `必须一次性为场景注入 ${expectedKeys.length} 个贴图`);
assert.equal(mockTextures.size, expectedKeys.length, `模拟 TextureManager 必须包含 ${expectedKeys.length} 个纹理`);

// 再次调用 generateAll，验证跳过机制 (幂等性)
const secondResult = AssetGenerator.generateAll(mockScene);
assert.equal(secondResult.count, 0, '第二次调用应检测到已存在，生成计数应为 0');
assert.equal(secondResult.skippedKeys.length, expectedKeys.length, '第二次调用应跳过全部已有纹理');
console.log(`✓ 4. Phaser.Scene 纹理注册与幂等性跳过逻辑测试通过！`);

console.log('=== [AssetGenerator 自检脚本] 全部验证成功，绿灯通过！ ===');
