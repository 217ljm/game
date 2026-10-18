import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("=== 开始检查 UI Kit 复古像素组件库与全年龄角色动态展台 ===");

// 1. 检查文件是否存在
const filesToCheck = [
  "apps/game/src/ui-kit/pixel-palette.ts",
  "apps/game/src/ui-kit/pixel-panel.ts",
  "apps/game/src/ui-kit/pixel-button.ts",
  "apps/game/src/ui-kit/floating-text.ts",
  "apps/game/src/ui-kit/index.ts",
  "apps/game/src/views/character-avatar-stage.ts",
  "apps/game/src/views/index.ts",
];

for (const relPath of filesToCheck) {
  const fullPath = path.resolve(relPath);
  assert.ok(fs.existsSync(fullPath), `文件不存在: ${relPath}`);
  const content = fs.readFileSync(fullPath, "utf-8");
  assert.ok(content.length > 50, `文件内容过短: ${relPath}`);
  console.log(`  [√] 存在且有效: ${relPath} (${content.length} bytes)`);
}

// 2. 检查 pixel-panel.ts 内容要素
const panelCode = fs.readFileSync("apps/game/src/ui-kit/pixel-panel.ts", "utf-8");
assert.ok(panelCode.includes("PixelPanel"), "缺少 PixelPanel 类");
assert.ok(panelCode.includes("createPixelPanel"), "缺少 createPixelPanel 工厂函数");
assert.ok(panelCode.includes("drawCornerOrnaments"), "缺少金边角花绘制逻辑");
assert.ok(panelCode.includes("woodDarkColor"), "缺少木纹边框逻辑");

// 3. 检查 pixel-button.ts 内容要素
const btnCode = fs.readFileSync("apps/game/src/ui-kit/pixel-button.ts", "utf-8");
assert.ok(btnCode.includes("PixelButton"), "缺少 PixelButton 类");
assert.ok(btnCode.includes("createPixelButton"), "缺少 createPixelButton 工厂函数");
assert.ok(btnCode.includes("POINTER_DOWN"), "缺少按下交互绑定");
assert.ok(btnCode.includes("setY(2)"), "缺少 2px 物理下沉");

// 4. 检查 floating-text.ts 内容要素
const floatCode = fs.readFileSync("apps/game/src/ui-kit/floating-text.ts", "utf-8");
assert.ok(floatCode.includes("spawnFloatingText"), "缺少 spawnFloatingText 函数");
assert.ok(floatCode.includes("spawnFloatingGain"), "缺少 spawnFloatingGain 函数");
assert.ok(floatCode.includes("spawnFloatingLoss"), "缺少 spawnFloatingLoss 函数");
assert.ok(floatCode.includes("spawnFloatingBatch"), "缺少批量飘字函数");

// 5. 检查 character-avatar-stage.ts 内容要素
const avatarCode = fs.readFileSync("apps/game/src/views/character-avatar-stage.ts", "utf-8");
assert.ok(avatarCode.includes("CharacterAvatarStage"), "缺少 CharacterAvatarStage 类");
assert.ok(avatarCode.includes("drawInfantStage"), "缺少 0~3岁 虎头鞋婴儿立绘");
assert.ok(avatarCode.includes("drawToddlerStage"), "缺少 4~6岁 海魂衫幼童立绘");
assert.ok(avatarCode.includes("drawPrimaryStage"), "缺少 7~12岁 红领巾少先队员立绘");
assert.ok(avatarCode.includes("drawAdolescentStage"), "缺少 13~18岁 运动校服中学生立绘");
assert.ok(avatarCode.includes("drawYouthStage"), "缺少 18~24岁 电竞战袍立绘");
assert.ok(avatarCode.includes("drawAdultStage"), "缺少 25~50岁 商务西装立绘");
assert.ok(avatarCode.includes("drawElderStage"), "缺少 50岁以上 中老年太极晨练服立绘");
assert.ok(avatarCode.includes("startBreathingAnimation"), "缺少待机轻微呼吸微动动效");
assert.ok(avatarCode.includes("triggerBlink"), "缺少眨眼系统");
assert.ok(avatarCode.includes("full_score"), "缺少考满分状态");
assert.ok(avatarCode.includes("champion"), "缺少夺冠状态");
assert.ok(avatarCode.includes("sick"), "缺少生病状态");

console.log("=== 检查全部通过！UI Kit 组件库与全年龄角色动态展台结构完备、符合规范！ ===");
