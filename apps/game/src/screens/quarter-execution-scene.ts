import Phaser from "phaser";
import { GAME_WIDTH, type GameRuntimePort, type GameRuntimeSnapshot, type RuntimeMonthTick } from "../contracts";
import { REDUCED_MOTION_REGISTRY_KEY } from "./boot-scene";
import { p2Button, p2Chip, p2Compact, p2Frame, p2FormatPercent, p2TextBlock, p2TopMeta } from "../ui/p2-screen-primitives";
import { panel, text } from "../ui/game-text";

/** Read-only three-month execution playback from Core's settled quarter record. */
export class QuarterExecutionScene extends Phaser.Scene {
  private readonly port: GameRuntimePort;
  private snapshot!: GameRuntimeSnapshot;
  private unsubscribe: (() => void) | null = null;
  private view!: Phaser.GameObjects.Group;
  private revealTimer: Phaser.Time.TimerEvent | null = null;
  private renderedKey: string | null = null;
  private visibleMonthCount = 0;

  constructor(port: GameRuntimePort) {
    super("QuarterExecutionScene");
    this.port = port;
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.view = this.add.group();
    this.unsubscribe = this.port.subscribe((snapshot) => {
      this.snapshot = snapshot;
      if (snapshot.screen === "quarter-execution") this.render();
    });
    this.snapshot = this.port.getSnapshot();
    this.render();
  }

  shutdown(): void {
    this.clearRevealTimer();
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  getUiDiagnostics(): Record<string, unknown> {
    const execution = this.snapshot?.quarterExecution;
    return {
      protocol: "game-p2-quarter-execution-v1",
      screen: this.snapshot?.screen ?? null,
      key: execution?.key ?? null,
      monthCount: execution?.months.length ?? 0,
      hasInterruption: Boolean(execution?.months.some((month) => month.interruption)),
      autoSkipScheduled: Boolean(this.revealTimer),
      visibleMonthCount: this.visibleMonthCount,
    };
  }

  private render(): void {
    const execution = this.snapshot?.quarterExecution;
    if (!execution) return;
    this.view.clear(true, true);
    this.view.add(p2Frame(this, "季度执行", `${execution.quarterLabel} · 三个月正在发生`, 0x6fc4b4));
    this.view.add(p2TopMeta(this, {
      ...this.snapshot,
      calendarYear: execution.calendarYear,
      age: execution.age,
      quarter: execution.quarter,
    }));
    this.view.add(p2TextBlock(this, 16, 112, 358, execution.operationLabel, 18, 0xfff5e9).setFontStyle("bold"));
    this.view.add(text(this, 16, 164, "已安排的生活，会在时间里留下结果。", 11, 0xb7c4c2));
    const isNewExecution = this.renderedKey !== execution.key;
    if (isNewExecution) {
      this.clearRevealTimer();
      this.renderedKey = execution.key;
      this.visibleMonthCount = this.registry.get(REDUCED_MOTION_REGISTRY_KEY) ? execution.months.length : 1;
    }
    this.renderTrack(execution.months.slice(0, this.visibleMonthCount));
    this.renderActions(execution.activities);
    this.view.add(p2Button(this, 14, 764, 362, 58, "跳过演出，查看季度结果", () => this.skip(), true));
    this.scheduleReveal(execution);
  }

  private renderTrack(months: RuntimeMonthTick[]): void {
    const visible = months.slice(0, 3);
    visible.forEach((month, index) => {
      const x = 14 + index * 121;
      const active = month.status === "active";
      const interrupted = Boolean(month.interruption) || month.status === "interrupted";
      const fill = interrupted ? 0x523b3a : active ? 0x28514d : 0x20343a;
      const card = panel(this, x, 198, 112, 230, fill, 14);
      this.view.add(card);
      this.view.add(p2Chip(this, x + 10, 210, `第${month.monthInQuarter}个月`, interrupted ? 0x7d4a43 : 0x2b5551));
      this.view.add(text(this, x + 10, 248, month.calendarMonth > 0 ? `${month.calendarMonth}月` : "这一月", 15, 0xffd8a1, true));
      this.view.add(text(this, x + 10, 282, `${p2FormatPercent(month.actions.reduce((sum, action) => sum + action.executedShare, 0) / Math.max(1, month.actions.length))} 完成`, 11, 0xfff5e9, true));
      this.view.add(text(this, x + 10, 310, `精力 ${month.energyRemaining}`, 10, month.energyRemaining < 0 ? 0xf18a76 : 0xf2c66d));
      this.view.add(p2TextBlock(this, x + 10, 344, 92, p2Compact(month.narrative, 42), 10, 0xb7c4c2));
      if (month.interruption) this.view.add(text(this, x + 10, 405, "有事情插入", 9, 0xf18a76, true));
    });
    this.view.add(text(this, 16, 452, "三个月的节奏", 12, 0xffd8a1, true));
  }

  private renderActions(activities: Array<{ id: string; label: string }>): void {
    const actions = activities.slice(0, 4);
    const row = actions.length ? actions.map((activity) => p2Compact(activity.label, 15)).join("  ·  ") : "保留了自由时间";
    this.view.add(panel(this, 14, 474, 362, 104, 0x172a31, 12));
    this.view.add(text(this, 28, 493, "本季行动轨道", 11, 0x6fc4b4, true));
    this.view.add(p2TextBlock(this, 28, 528, 326, row, 12, 0xfff5e9));
    this.view.add(text(this, 28, 562, "行动事实由 Core 结算；这里播放它们如何经过三个月。", 9, 0x8fa7a5));
  }

  private scheduleReveal(execution: NonNullable<GameRuntimeSnapshot["quarterExecution"]>): void {
    if (this.revealTimer) return;
    const reduced = Boolean(this.registry.get(REDUCED_MOTION_REGISTRY_KEY));
    if (this.visibleMonthCount < execution.months.length) {
      this.revealTimer = this.time.delayedCall(reduced ? 400 : 400, () => {
        this.revealTimer = null;
        this.visibleMonthCount = Math.min(execution.months.length, this.visibleMonthCount + 1);
        this.render();
      });
      return;
    }
    this.revealTimer = this.time.delayedCall(reduced ? 400 : 650, () => {
      this.revealTimer = null;
      this.skip();
    });
  }

  private skip(): void {
    this.clearRevealTimer();
    this.port.dispatch({ type: "quarter.execution.skip" });
  }

  private clearRevealTimer(): void {
    this.revealTimer?.remove(false);
    this.revealTimer = null;
  }
}
