import Phaser from "phaser";
import { readPresentationPreferences } from "../runtime/v5-browser-save";

export const REDUCED_MOTION_REGISTRY_KEY = "reducedMotion";
export const MOTION_LEVEL_REGISTRY_KEY = "motionLevel";
export const SOUND_ENABLED_REGISTRY_KEY = "soundEnabled";
export const HAPTIC_ENABLED_REGISTRY_KEY = "hapticEnabled";

/** Boot only captures platform/display preferences before asset loading. */
export class BootScene extends Phaser.Scene {
  constructor() { super("BootScene"); }

  create(): void {
    const reducedMotion = typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;
    const stored = readPresentationPreferences(reducedMotion);
    const motionLevel = stored.motionMode;
    this.registry.set(REDUCED_MOTION_REGISTRY_KEY, reducedMotion);
    this.registry.set(MOTION_LEVEL_REGISTRY_KEY, motionLevel);
    this.registry.set(SOUND_ENABLED_REGISTRY_KEY, stored.soundEnabled !== false);
    this.registry.set(HAPTIC_ENABLED_REGISTRY_KEY, stored.hapticEnabled !== false);
    this.scene.start("PreloadScene");
  }
}
