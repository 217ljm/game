/**
 * 资产与程序化贴图生成器 (apps/game 运行时适配桥接)
 * 重新导出主工程系统的 AssetGenerator 与 ASSET_KEYS
 */
export { AssetGenerator, ASSET_KEYS, default } from '../../../src/systems/AssetGenerator.js';
export type { AssetGeneratorResult } from '../../../src/systems/AssetGenerator.d.ts';
