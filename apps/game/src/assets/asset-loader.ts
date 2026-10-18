import Phaser from "phaser";
import { ASSET_MANIFEST, type AssetKey } from "./asset-manifest";

export const ASSET_FAILURES_REGISTRY_KEY = "assetLoadFailures";

/** Queue the manifest and install a deterministic, non-blocking failure path. */
export function queueManifest(scene: Phaser.Scene, failedKeys: Set<AssetKey>): void {
  scene.load.on("loaderror", (file: { key?: string }) => {
    const key = file.key;
    if (key && ASSET_MANIFEST.some((entry) => entry.key === key)) failedKeys.add(key as AssetKey);
  });
  for (const asset of ASSET_MANIFEST) scene.load.image(asset.key, asset.src);
}

export function createProceduralFallback(scene: Phaser.Scene, key: AssetKey): void {
  if (scene.textures.exists(key)) return;
  const graphics = scene.add.graphics({ x: 0, y: 0 }).setVisible(false);
  const hue = Array.from(key).reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) % 0xffffff, 0);
  graphics.fillStyle(hue || 0x315c61, 1);
  graphics.fillRoundedRect(0, 0, 96, 96, 14);
  graphics.lineStyle(3, 0xf7efe3, 0.65);
  graphics.strokeRoundedRect(4, 4, 88, 88, 11);
  graphics.generateTexture(key, 96, 96);
  graphics.destroy();
}

export function ensureManifestTextures(scene: Phaser.Scene, failedKeys: Set<AssetKey>): void {
  for (const { key } of ASSET_MANIFEST) {
    if (failedKeys.has(key) || !scene.textures.exists(key)) createProceduralFallback(scene, key);
  }
  scene.registry.set(ASSET_FAILURES_REGISTRY_KEY, [...failedKeys]);
}
