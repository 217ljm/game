import Phaser from "phaser";
import type { PresentationCue } from "../contracts";
import { classifyPresentationCue, presentationCueDuration, type MotionLevel } from "./presentation-cue";

type DisplayTarget = Phaser.GameObjects.GameObject & {
  alpha?: number;
  scaleX?: number;
  scaleY?: number;
  x?: number;
  y?: number;
};

export interface PresentationBindings {
  /** The player portrait or character group. */
  player?: DisplayTarget;
  /** Resource chips keyed by the stable resource id (time, energy, cash...). */
  resourceChips?: Record<string, DisplayTarget | undefined>;
  /** Full-screen layer used for event/quarter/year transitions. */
  transitionLayer?: DisplayTarget;
  /** Optional screen-specific emphasis target. */
  eventTarget?: DisplayTarget;
  /** Feedback is deliberately optional: absent audio/haptics are valid. */
  playSound?: (cue: PresentationCue) => void;
  vibrate?: (cue: PresentationCue) => void;
}

export interface GamePresentationDirectorOptions {
  motion?: MotionLevel;
  /** Defaults to false. This is presentation preference, not game state. */
  muted?: boolean;
  /** Haptics are independent from sound mute. */
  haptics?: boolean;
}

/**
 * Cue-only Phaser presentation adapter. It owns transient tweens and timers,
 * but never owns or mutates a runtime snapshot. A Scene can safely dispose it
 * during shutdown and recreate it when the scene is entered again.
 */
export class GamePresentationDirector {
  private readonly scene: Phaser.Scene;
  private motion: MotionLevel;
  private muted: boolean;
  private haptics: boolean;
  private queue: Array<{ cues: PresentationCue[]; bindings: PresentationBindings; resolve: () => void }> = [];
  private running = false;
  private disposed = false;
  private readonly tweens = new Set<Phaser.Tweens.Tween>();
  private readonly timers = new Set<Phaser.Time.TimerEvent>();
  private readonly pendingResolves = new Set<() => void>();

  constructor(scene: Phaser.Scene, options: GamePresentationDirectorOptions = {}) {
    this.scene = scene;
    this.motion = options.motion ?? "full";
    this.muted = options.muted ?? false;
    this.haptics = options.haptics ?? true;
  }

  setMotion(level: MotionLevel): void { this.motion = level; }
  setMuted(muted: boolean): void { this.muted = muted; }
  setHaptics(enabled: boolean): void { this.haptics = enabled; }
  getMotion(): MotionLevel { return this.motion; }

  /** Enqueues cues in the supplied order; resolving promises is optional for callers. */
  play(cues: readonly PresentationCue[], bindings: PresentationBindings = {}): Promise<void> {
    if (this.disposed || cues.length === 0) return Promise.resolve();
    return new Promise((resolve) => {
      this.queue.push({ cues: [...cues], bindings, resolve });
      void this.drain();
    });
  }

  destroy(): void {
    this.disposed = true;
    for (const tween of this.tweens) tween.stop();
    for (const timer of this.timers) timer.remove(false);
    this.tweens.clear();
    this.timers.clear();
    for (const item of this.queue) item.resolve();
    this.queue = [];
    for (const resolve of this.pendingResolves) resolve();
    this.pendingResolves.clear();
  }

  private async drain(): Promise<void> {
    if (this.running || this.disposed) return;
    this.running = true;
    try {
      while (!this.disposed) {
        const item = this.queue.shift();
        if (!item) break;
        for (const cue of item.cues) {
          if (this.disposed) break;
          await this.playOne(cue, item.bindings);
        }
        item.resolve();
      }
    } finally {
      this.running = false;
    }
  }

  private playOne(cue: PresentationCue, bindings: PresentationBindings): Promise<void> {
    const duration = presentationCueDuration(cue.type, this.motion);
    this.emitFeedback(cue, bindings);
    if (duration === 0 || this.motion === "off") {
      this.applyImmediate(cue, bindings);
      return Promise.resolve();
    }
    const bucket = classifyPresentationCue(cue);
    const resourceId = cue.type === "resource.delta"
      ? String((cue.payload.deltas as Array<{ id?: string }> | undefined)?.[0]?.id ?? "")
      : "";
    const target = cue.type === "event.interrupt" ? (bindings.eventTarget ?? bindings.transitionLayer)
      : bucket === "person" ? bindings.player
      : bucket === "transition" || bucket === "screen" ? bindings.transitionLayer
      : bucket === "action" ? bindings.player
      : bucket === "resource" ? bindings.resourceChips?.[resourceId]
      : undefined;
    if (!target) return this.wait(duration);
    const baseScaleX = target.scaleX ?? 1;
    const baseScaleY = target.scaleY ?? 1;
    const isTransition = bucket === "transition" || bucket === "screen";
    const props: Record<string, number> = isTransition
      ? { alpha: 1 } : { scaleX: baseScaleX * 1.045, scaleY: baseScaleY * 1.045 };
    if (isTransition) target.alpha = 0;
    return new Promise((resolve) => {
      const finish = () => {
        this.pendingResolves.delete(finish);
        this.tweens.delete(tween);
        if (isTransition) target.alpha = 0;
        resolve();
      };
      this.pendingResolves.add(finish);
      const tween = this.scene.tweens.add({ targets: target, ...props, duration, ease: "Quad.out", yoyo: true, onComplete: finish });
      this.tweens.add(tween);
    });
  }

  private applyImmediate(cue: PresentationCue, bindings: PresentationBindings): void {
    if (cue.type === "screen.enter" || cue.type === "quarter.complete" || cue.type === "year.advance") {
      if (bindings.transitionLayer) bindings.transitionLayer.alpha = 0;
    }
  }

  private wait(duration: number): Promise<void> {
    return new Promise((resolve) => {
      const finish = () => { this.pendingResolves.delete(finish); this.timers.delete(timer); resolve(); };
      this.pendingResolves.add(finish);
      const timer = this.scene.time.delayedCall(duration, finish);
      this.timers.add(timer);
    });
  }

  private emitFeedback(cue: PresentationCue, bindings: PresentationBindings): void {
    if (!this.muted) {
      try { bindings.playSound?.(cue); } catch { /* optional sound must never break play */ }
    }
    if (this.haptics) {
      try { bindings.vibrate?.(cue); } catch { /* haptics are best effort */ }
    }
  }
}
