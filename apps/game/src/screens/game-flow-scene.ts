import Phaser from "phaser";
import { type GameRuntimePort, type GameRuntimeSnapshot, type RuntimeScreen } from "../contracts";

const SCENE_FOR_SCREEN: Record<RuntimeScreen, string> = {
  life: "LifeScene",
  event: "EventScene",
  "quarter-execution": "QuarterExecutionScene",
  "quarter-result": "QuarterResultScene",
  "year-review": "YearReviewScene",
  "age-entry": "AgeEntryScene",
  records: "RecordsScene",
};

/** Owns only screen lifecycle. It never renders or mutates Core facts. */
export class GameFlowScene extends Phaser.Scene {
  private readonly port: GameRuntimePort;
  private unsubscribe: (() => void) | null = null;
  private snapshot!: GameRuntimeSnapshot;
  private activeScene: string | null = null;

  constructor(port: GameRuntimePort) {
    super("GameFlowScene");
    this.port = port;
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.unsubscribe = this.port.subscribe((snapshot) => {
      this.snapshot = snapshot;
      this.sync(snapshot.screen);
    });
    this.snapshot = this.port.getSnapshot();
    this.sync(this.snapshot.screen);
  }

  shutdown(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.activeScene = null;
  }

  getUiDiagnostics(): Record<string, unknown> {
    return {
      protocol: "game-p2-flow-v1",
      activeScreen: this.snapshot?.screen ?? null,
      activeScene: this.activeScene,
      lifecycleOwnedBy: "GameFlowScene",
    };
  }

  private sync(screen: RuntimeScreen): void {
    const target = SCENE_FOR_SCREEN[screen] ?? "LifeScene";
    if (this.activeScene === target) return;
    if (this.activeScene && this.scene.manager.isActive(this.activeScene)) this.scene.manager.stop(this.activeScene);
    this.activeScene = target;
    if (!this.scene.manager.isActive(target)) this.scene.launch(target);
    this.scene.manager.bringToTop(target);
  }
}

export { SCENE_FOR_SCREEN };
