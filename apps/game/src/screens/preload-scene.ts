import Phaser from "phaser";
import { ASSET_MANIFEST, type AssetKey } from "../assets/asset-manifest";
import { createProceduralFallback, ensureManifestTextures, queueManifest } from "../assets/asset-loader";

/** Preload is intentionally a manifest adapter; it contains no life rules. */
export class PreloadScene extends Phaser.Scene {
  private readonly failedKeys = new Set<AssetKey>();

  constructor() { super("PreloadScene"); }

  preload(): void {
    queueManifest(this, this.failedKeys);
    this.load.once("complete", () => ensureManifestTextures(this, this.failedKeys));
  }

  create(): void {
    // A failed load can be reported after the complete callback in some Phaser
    // loaders; ensure every stable key is still usable before entering gameplay.
    ensureManifestTextures(this, this.failedKeys);
    for (const { key } of ASSET_MANIFEST) if (!this.textures.exists(key)) createProceduralFallback(this, key);
    this.scene.start("StartupScene");
  }
}
