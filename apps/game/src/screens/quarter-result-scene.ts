import Phaser from "phaser";
import { type GameRuntimePort, type GameRuntimeSnapshot } from "../contracts";
import { p2Button, p2Chip, p2Compact, p2Cover, p2Frame, p2FormatPercent, p2TextBlock, p2TopMeta } from "../ui/p2-screen-primitives";
import { panel, text } from "../ui/game-text";

/** Compact quarter result. It shows facts already settled by Core. */
export class QuarterResultScene extends Phaser.Scene {
  private readonly port: GameRuntimePort;
  private snapshot!: GameRuntimeSnapshot;
  private unsubscribe: (() => void) | null = null;
  private view!: Phaser.GameObjects.Group;

  constructor(port: GameRuntimePort) {
    super("QuarterResultScene");
    this.port = port;
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.view = this.add.group();
    this.unsubscribe = this.port.subscribe((snapshot) => {
      this.snapshot = snapshot;
      if (snapshot.screen === "quarter-result") this.render();
    });
    this.snapshot = this.port.getSnapshot();
    this.render();
  }

  shutdown(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  getUiDiagnostics(): Record<string, unknown> {
    const result = this.snapshot?.quarterResult;
    return {
      protocol: "game-p2-quarter-result-v1",
      screen: this.snapshot?.screen ?? null,
      key: result?.key ?? null,
      executionRate: result?.executionRate ?? null,
      eventCount: result?.randomEventResults.length ?? 0,
      interestCount: Object.keys(result?.interestChanges ?? {}).length,
      growthCount: Object.keys(result?.growthChanges ?? {}).length,
    };
  }

  private render(): void {
    const result = this.snapshot?.quarterResult;
    if (!result) return;
    this.view.clear(true, true);
    this.view.add(p2Frame(this, "季度结果", `${result.calendarYear} · ${result.age}岁 · Q${result.quarter}`, 0xf0c66d));
    this.view.add(p2TopMeta(this, {
      ...this.snapshot,
      calendarYear: result.calendarYear,
      age: result.age,
      quarter: result.quarter,
    }));
    const timeline = p2Cover(this, "scene.timeline", 0, 92, 390, 132, 0.32);
    if (timeline) this.view.add(timeline);
    this.view.add(this.add.rectangle(195, 158, 390, 132, 0x172a31, 0.46));
    this.view.add(text(this, 16, 112, result.operationLabel, 20, 0xfff5e9, true));
    this.view.add(text(this, 16, 148, `三个月执行率 ${p2FormatPercent(result.executionRate)}`, 14, 0x6fc4b4, true));
    this.renderResourceSummary(result);
    this.renderFacts(result);
    this.renderActivityTrack(result.activities);
    this.view.add(p2Button(this, 14, 764, 362, 58, "继续生活", () => this.port.dispatch({ type: "quarter.result.continue" })));
  }

  private renderResourceSummary(result: NonNullable<GameRuntimeSnapshot["quarterResult"]>): void {
    const data = [
      ["时间", `${result.executedTimeSlots}/${result.plannedTimeSlots}`, 0x6fc4b4],
      ["精力", `${result.energySpent} → ${result.energyRemaining}`, 0xf2c66d],
      ["事件", `${result.randomEventResults.length} 件`, 0xf18a76],
      ["成长", `${Object.keys(result.growthChanges).length + Object.keys(result.characterGrowth).length} 项`, 0xa991c8],
    ] as const;
    data.forEach(([label, value, color], index) => {
      const x = 14 + (index % 2) * 181;
      const y = 188 + Math.floor(index / 2) * 68;
      this.view.add(panel(this, x, y, 176, 56, 0x20343a, 12));
      this.view.add(text(this, x + 14, y + 17, label, 10, color, true));
      this.view.add(text(this, x + 14, y + 38, value, 14, 0xfff5e9, true));
    });
  }

  private renderFacts(result: NonNullable<GameRuntimeSnapshot["quarterResult"]>): void {
    const facts = [
      result.planInterruption ? `计划被打断：${p2Compact(String(result.planInterruption.reason ?? "临时变化"), 28)}` : null,
      Object.keys(result.interestChanges).length ? `兴趣留下 ${Object.keys(result.interestChanges).length} 条新线索` : null,
      Object.keys(result.relationshipChanges).length ? `关系互动 ${result.relationshipChanges.length} 次` : null,
      result.randomEventResults.length ? `事件结果已写入本季度记录` : null,
    ].filter((entry): entry is string => Boolean(entry));
    this.view.add(text(this, 16, 332, "这一季留下了什么", 12, 0xffd8a1, true));
    this.view.add(p2TextBlock(this, 16, 360, 356, facts.slice(0, 4).join("\n" ) || "日常没有被打断，节奏稳稳向前。", 12, 0xfff5e9));
  }

  private renderActivityTrack(activities: Array<{ id: string; label: string }>): void {
    this.view.add(text(this, 16, 472, "已执行行动", 12, 0xffd8a1, true));
    activities.slice(0, 4).forEach((activity, index) => this.view.add(p2Chip(this, 14 + (index % 2) * 181, 496 + Math.floor(index / 2) * 36, p2Compact(activity.label, 22), 0x2b4248)));
    this.view.add(text(this, 16, 584, "这些变化会继续影响人物、兴趣和下一季度的选择。", 10, 0x8fa7a5));
  }
}
