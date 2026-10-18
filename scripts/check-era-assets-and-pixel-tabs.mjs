/**
 * 时代资产大系统、老物件珍藏展柜与复古像素 UI Kit 自动化回归校验脚本
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(".");
const pixelHelpersPath = path.resolve(root, "apps/game/src/ui-kit/pixel-ui-helpers.ts");
const lolEventsPath = path.resolve(root, "apps/game/src/esports/lol-narrative-events.ts");
const eraAssetsPath = path.resolve(root, "apps/game/src/systems/era-assets-system.ts");
const lifeScenePath = path.resolve(root, "apps/game/src/screens/life-scene.ts");

console.log("================================================================");
console.log("【时代资产大系统、老物件展柜与像素 UI Kit 自动化回归校验】");
console.log("================================================================");

// ----------------------------------------------------
// 1. 静态源码存在性与核心接口规范
// ----------------------------------------------------
console.log("[测试 1: 静态源码存在性与组件工厂导出规范]");
{
  assert.ok(fs.existsSync(pixelHelpersPath), `pixel-ui-helpers 文件必须存在: ${pixelHelpersPath}`);
  assert.ok(fs.existsSync(lolEventsPath), `lol-narrative-events 文件必须存在: ${lolEventsPath}`);
  assert.ok(fs.existsSync(eraAssetsPath), `era-assets-system 文件必须存在: ${eraAssetsPath}`);
  assert.ok(fs.existsSync(lifeScenePath), `life-scene 文件必须存在: ${lifeScenePath}`);

  const pixelSource = fs.readFileSync(pixelHelpersPath, "utf8");
  assert.ok(pixelSource.includes("export function createPixelRelationCard"), "必须导出 createPixelRelationCard");
  assert.ok(pixelSource.includes("export function createPixelLocationCard"), "必须导出 createPixelLocationCard");
  assert.ok(pixelSource.includes("export function createPixelVintageItemSlot"), "必须导出 createPixelVintageItemSlot");
  assert.ok(pixelSource.includes("play8BitTabSound"), "必须提供 8-bit Tab 音效");
  assert.ok(pixelSource.includes("play8BitChimeSound"), "必须提供 8-bit 老物件泛音");

  const lolEventsSource = fs.readFileSync(lolEventsPath, "utf8");
  assert.ok(lolEventsSource.includes("lol_2011_netbar_debut"), "必须包含 2011 国服公测网吧首战大事件");
  assert.ok(lolEventsSource.includes("lol_2012_ob_king_family"), "必须包含 2012 电信一区登顶与家庭抉择事件");
  assert.ok(lolEventsSource.includes("lol_2013_lpl_youth_invite"), "必须包含 2013 首届 LPL 试训邀请事件");
  assert.ok(lolEventsSource.includes("lol_2011_cbt_card"), "必须包含 2011 封测纪念卡老物件");

  const eraAssetsSource = fs.readFileSync(eraAssetsPath, "utf8");
  assert.ok(eraAssetsSource.includes("export class EraAssetsSystem"), "必须导出 EraAssetsSystem 大系统");
  assert.ok(eraAssetsSource.includes("calculateTotalNetAssets"), "必须提供 calculateTotalNetAssets 家族净资产计算方法");
  assert.ok(eraAssetsSource.includes("advanceQuarterlyCycle"), "必须提供 advanceQuarterlyCycle 季度财务周期推进方法");

  const lifeSceneSource = fs.readFileSync(lifeScenePath, "utf8");
  assert.ok(lifeSceneSource.includes("createPixelRelationCard(this"), "LifeScene 关系 Tab 必须使用 createPixelRelationCard");
  assert.ok(lifeSceneSource.includes("createPixelLocationCard(this"), "LifeScene 活动 Tab 必须使用 createPixelLocationCard");
  assert.ok(lifeSceneSource.includes("createPixelVintageItemSlot(this"), "LifeScene 资产 Tab 必须使用 createPixelVintageItemSlot");
  assert.ok(lifeSceneSource.includes("this.eraAssetsSys.advanceQuarterlyCycle"), "LifeScene 跨年必须调用时代资产推进");

  console.log("✅ 测试 1 通过: 静态源码存在性与组件工厂契约校验无误！");
}

// ----------------------------------------------------
// 2. 时代资产系统 (EraAssetsSystem) 逻辑闭环动态测试
// ----------------------------------------------------
console.log("[测试 2: 时代资产系统全生命周期房产、存款、股市与净资产推演]");
{
  const eraUrl = pathToFileURL(eraAssetsPath).href;
  const { EraAssetsSystem, ERA_HOUSING_DATABASE, ERA_VEHICLES_DATABASE } = await import(eraUrl);

  const sys = new EraAssetsSystem();

  // 1. 初始状态：纯流动现金 100 元
  const initialNet = sys.calculateTotalNetAssets(1980, 100);
  assert.equal(initialNet.totalLiquidCashYuan, 100, "流动私房钱应为 100 元");
  assert.equal(initialNet.totalBankSavingsYuan, 0, "初始银行存款应为 0");
  assert.equal(initialNet.totalRealEstateMarketValueYuan, 0, "初始名下房产应为 0");
  assert.equal(initialNet.totalNetWorthYuan, 100, "初始总净资产应为 100 元");

  // 2. 办理 1989 年保值储蓄定期存单（享受高通胀保值贴补率）
  sys.bankCurrentSavings = 1000;
  const depRes = sys.openTimeDeposit(1000, 3, 1989, 1);
  assert.ok(depRes.success, "存单办理应成功");
  assert.ok(depRes.deposit.totalAnnualYieldPercent >= 20, "1989年3年期保值储蓄综合年化应达 20% 以上");

  // 3. 购买 1984 年机床厂红砖筒子楼公房并随年代重估
  const houseConfig = ERA_HOUSING_DATABASE[0];
  const buyHouse = sys.realEstate.purchaseHouse(houseConfig.id, 1984, 1, 3500);
  assert.ok(buyHouse.success, "购买筒子楼房产应成功");
  assert.equal(sys.realEstate.ownedHouses.length, 1, "名下应拥有一套房产");

  // 模拟房产升值至 2000 年
  sys.realEstate.revalueHousesForYear(2000);
  const houseSummary = sys.realEstate.getHousingAssetsSummary();
  assert.ok(houseSummary.totalMarketValueYuan > 3500, "2000年房产市值应显著高于当年购置价");

  // 4. 代步载具：购置二八大杠自行车并计算折旧
  const bikeConfig = ERA_VEHICLES_DATABASE[0];
  const buyBike = sys.transport.acquireVehicle(bikeConfig.id, 1980);
  assert.ok(buyBike.success, "购置二八大杠应成功");

  // 5. 季度全周期结算演进
  const quarterlyReport = sys.advanceQuarterlyCycle(1992, 1, 500);
  assert.equal(quarterlyReport.year, 1992, "财报年份应为 1992");
  assert.ok(quarterlyReport.netWorthAfterCycle.totalNetWorthYuan > 0, "总净资产应大于 0");
  assert.ok(quarterlyReport.narrativeSummary.length > 0, "必须生成白话财务通俗摘要");

  console.log("✅ 测试 2 通过: 时代资产系统房产升值、保值储蓄与总净资产核算 100% 确定性闭环！");
}

console.log("================================================================");
console.log("🎉 【全项回归验证 100% 绿灯通过，无任何异常！】");
console.log("================================================================");
