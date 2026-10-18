import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../contracts";
import { MOTION_LEVEL_REGISTRY_KEY } from "./boot-scene";

type MotionLevel = "full" | "reduced" | "off";
type StartupPhase = "black" | "reveal" | "hold" | "exit" | "complete";

const COLORS = {
  black: 0x020507,
  ink: 0xf4eee2,
  warm: 0xd6aa61,
  glow: 0x8fc9c5,
};

/**
 * Presentation-only studio intro. The emblem is intentionally procedural and
 * replaceable: the final brand logo will be frozen in a separate art task.
 */
export class StartupScene extends Phaser.Scene {
  private phase: StartupPhase = "black";
  private motion: MotionLevel = "full";
  private emblem!: Phaser.GameObjects.Container;
  private halo!: Phaser.GameObjects.Arc;
  private wordmark!: Phaser.GameObjects.Text;
  private skipAvailable = false;
  private transitionStarted = false;

  constructor() {
    super("StartupScene");
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.cameras.main.setBackgroundColor(COLORS.black);
    this.motion = this.readMotionLevel();

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.black).setOrigin(0);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x071013, 0.3);

    this.halo = this.add.circle(0, 0, 76, COLORS.glow, 0.08).setBlendMode(Phaser.BlendModes.ADD);
    const mark = this.createPlaceholderMark();
    this.wordmark = this.add.text(0, 98, "1978 · 一生", {
      fontFamily: "'Microsoft YaHei', 'PingFang SC', Arial, sans-serif",
      fontSize: "27px",
      fontStyle: "bold",
      color: "#f4eee2",
    }).setOrigin(0.5).setAlpha(0);
    const divider = this.add.rectangle(0, 73, 74, 1, COLORS.warm, 0.7).setAlpha(0);

    this.emblem = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT * 0.43, [this.halo, mark, divider, this.wordmark]);
    this.emblem.setAlpha(0).setScale(this.motion === "full" ? 0.92 : 1);

    this.input.once(Phaser.Input.Events.POINTER_UP, () => {
      if (this.skipAvailable) this.beginExit(true);
    });

    this.playTimeline();
  }

  getUiDiagnostics(): Record<string, unknown> {
    return {
      protocol: "game-startup-scene-v1",
      phase: this.phase,
      motion: this.motion,
      emblemAlpha: this.emblem?.alpha ?? 0,
      emblemScale: this.emblem?.scaleX ?? 1,
      wordmarkAlpha: this.wordmark?.alpha ?? 0,
      skipAvailable: this.skipAvailable,
      writesCoreOrSave: false,
      placeholderEmblem: true,
    };
  }

  private createPlaceholderMark(): Phaser.GameObjects.Container {
    const outer = this.add.graphics();
    outer.lineStyle(3, COLORS.ink, 0.92);
    outer.beginPath();
    outer.arc(0, 0, 46, Phaser.Math.DegToRad(-68), Phaser.Math.DegToRad(215), false);
    outer.strokePath();

    outer.lineStyle(2, COLORS.warm, 0.9);
    outer.beginPath();
    outer.arc(0, 0, 34, Phaser.Math.DegToRad(112), Phaser.Math.DegToRad(370), false);
    outer.strokePath();

    const timeline = this.add.graphics();
    timeline.lineStyle(3, COLORS.ink, 0.95);
    timeline.lineBetween(-13, -30, -13, 31);
    timeline.lineBetween(-13, 0, 19, -22);
    timeline.lineBetween(19, -22, 19, 24);
    timeline.fillStyle(COLORS.warm, 1).fillCircle(19, 24, 4);

    return this.add.container(0, 0, [outer, timeline]);
  }

  private playTimeline(): void {
    if (this.motion === "off") {
      this.phase = "hold";
      this.emblem.setAlpha(1).setScale(1);
      this.wordmark.setAlpha(1);
      this.skipAvailable = true;
      this.time.delayedCall(420, () => this.complete());
      return;
    }

    const reduced = this.motion === "reduced";
    const revealDelay = reduced ? 70 : 260;
    const revealDuration = reduced ? 240 : 980;
    const holdDuration = reduced ? 520 : 1_300;

    this.time.delayedCall(revealDelay, () => {
      this.phase = "reveal";
      this.tweens.add({
        targets: this.emblem,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: revealDuration,
        ease: reduced ? "Linear" : "Sine.Out",
      });
      this.tweens.add({
        targets: this.wordmark,
        alpha: 1,
        duration: reduced ? revealDuration : 520,
        delay: reduced ? 0 : 260,
        ease: "Sine.Out",
      });
      if (!reduced) {
        this.tweens.add({
          targets: this.halo,
          alpha: { from: 0.02, to: 0.18 },
          scale: { from: 0.82, to: 1.16 },
          duration: revealDuration + 180,
          ease: "Sine.Out",
        });
      }

      this.time.delayedCall(revealDuration, () => {
        this.phase = "hold";
        this.skipAvailable = true;
        this.time.delayedCall(holdDuration, () => this.beginExit(false));
      });
    });
  }

  private beginExit(skipped: boolean): void {
    if (this.transitionStarted) return;
    this.transitionStarted = true;
    this.phase = "exit";
    this.skipAvailable = false;
    this.tweens.killTweensOf([this.emblem, this.wordmark, this.halo]);

    const duration = skipped ? 220 : (this.motion === "reduced" ? 200 : 560);
    this.tweens.add({
      targets: this.emblem,
      alpha: 0,
      scaleX: this.motion === "full" ? 1.025 : 1,
      scaleY: this.motion === "full" ? 1.025 : 1,
      duration,
      ease: "Sine.In",
      onComplete: () => this.complete(),
    });
  }

  private complete(): void {
    if (this.phase === "complete") return;
    this.phase = "complete";
    this.scene.start("MainMenuScene");
  }

  private readMotionLevel(): MotionLevel {
    const value = this.registry.get(MOTION_LEVEL_REGISTRY_KEY);
    return value === "reduced" || value === "off" ? value : "full";
  }

  private shutdown(): void {
    this.input.removeAllListeners();
    this.time.removeAllEvents();
    this.tweens.killAll();
  }
}
