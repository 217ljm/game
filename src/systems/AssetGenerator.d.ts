import type Phaser from 'phaser';

export declare const ASSET_KEYS: {
  readonly BG_DUNGEON_ARENA: 'bg_dungeon_arena';
  readonly HERO_WARRIOR: 'hero_warrior';
  readonly ENEMY_SKELETON: 'enemy_skeleton';
  readonly BOSS_DRAGON_KNIGHT: 'boss_dragon_knight';
  readonly ICON_SLASH: 'icon_slash';
  readonly ICON_FIREBALL: 'icon_fireball';
  readonly ICON_SHIELD: 'icon_shield';
  readonly ICON_DASH: 'icon_dash';
  readonly ICON_THUNDER: 'icon_thunder';
  readonly PANEL_FRAME: 'panel_frame';
  readonly CARD_FRAME: 'card_frame';
  readonly HP_BAR_BG: 'hp_bar_bg';
  readonly HP_BAR_FILL: 'hp_bar_fill';
  readonly VFX_SPARK: 'vfx_spark';
  readonly VFX_SLASH_ARC: 'vfx_slash_arc';
  readonly VFX_FIRE_PARTICLE: 'vfx_fire_particle';
};

export interface AssetGeneratorResult {
  success: boolean;
  count: number;
  generatedKeys: string[];
  skippedKeys: string[];
}

export declare class AssetGenerator {
  static get KEYS(): typeof ASSET_KEYS;
  static GENERATORS: Record<string, () => HTMLCanvasElement | any>;

  static generateAll(scene: Phaser.Scene): AssetGeneratorResult;
  static ensureTexture(scene: Phaser.Scene, key: string): boolean;
  static createCanvasTexture(key: string): HTMLCanvasElement | null;

  static generateDungeonArenaBg(): HTMLCanvasElement;
  static generateHeroWarrior(): HTMLCanvasElement;
  static generateEnemySkeleton(): HTMLCanvasElement;
  static generateBossDragonKnight(): HTMLCanvasElement;

  static generateIconSlash(): HTMLCanvasElement;
  static generateIconFireball(): HTMLCanvasElement;
  static generateIconShield(): HTMLCanvasElement;
  static generateIconDash(): HTMLCanvasElement;
  static generateIconThunder(): HTMLCanvasElement;

  static generatePanelFrame(): HTMLCanvasElement;
  static generateCardFrame(): HTMLCanvasElement;
  static generateHpBarBg(): HTMLCanvasElement;
  static generateHpBarFill(): HTMLCanvasElement;

  static generateVfxSpark(): HTMLCanvasElement;
  static generateVfxSlashArc(): HTMLCanvasElement;
  static generateVfxFireParticle(): HTMLCanvasElement;
}

export default AssetGenerator;
