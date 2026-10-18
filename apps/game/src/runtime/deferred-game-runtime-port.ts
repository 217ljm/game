import type { GameRuntimePort, GameRuntimeSnapshot, PresentationCue, RuntimeCommand } from "../contracts";

/**
 * Application-owned latch between the menu and deterministic runtime. It lets
 * Phaser render startup/menu scenes before a new or resumed Core exists.
 */
export class DeferredGameRuntimePort implements GameRuntimePort {
  private active: GameRuntimePort | null = null;
  private activeUnsubscribe: (() => void) | null = null;
  private readonly listeners = new Set<(snapshot: GameRuntimeSnapshot, cues: PresentationCue[]) => void>();

  attach(port: GameRuntimePort): void {
    if (this.active) {
      this.activeUnsubscribe?.();
      this.activeUnsubscribe = null;
      this.active = null;
    }
    this.active = port;
    this.activeUnsubscribe = port.subscribe((snapshot, cues) => {
      for (const listener of this.listeners) listener(snapshot, cues);
    });
  }

  isAttached(): boolean {
    return this.active != null;
  }

  getSnapshot(): GameRuntimeSnapshot {
    if (!this.active) throw new Error("尚未从主菜单进入人生。");
    return this.active.getSnapshot();
  }

  dispatch(command: RuntimeCommand): void {
    if (!this.active) return;
    this.active.dispatch(command);
  }

  subscribe(listener: (snapshot: GameRuntimeSnapshot, cues: PresentationCue[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  destroy(): void {
    this.activeUnsubscribe?.();
    this.activeUnsubscribe = null;
    this.listeners.clear();
    this.active = null;
  }
}
