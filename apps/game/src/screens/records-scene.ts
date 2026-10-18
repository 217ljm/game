import Phaser from "phaser";
import {
  GAME_WIDTH,
  type GameRuntimePort,
  type GameRuntimeSnapshot,
  type RuntimeMonthTick,
  type RuntimeRecordsQuarter,
} from "../contracts";
import { palette } from "../ui/game-palette";
import { bindInteractiveFeedback, panel, text } from "../ui/game-text";
import { p2Button, p2Chip, p2Compact, p2Frame, p2FormatPercent, p2TextBlock } from "../ui/p2-screen-primitives";

/**
 * Compact in-game record viewer. It is intentionally a single screen instead
 * of a DOM document or a scrollable archive page.
 */
export class RecordsScene extends Phaser.Scene {
  private readonly port: GameRuntimePort;
  private snapshot!: GameRuntimeSnapshot;
  private unsubscribe: (() => void) | null = null;
  private view!: Phaser.GameObjects.Group;
  private selectedQuarter: 1 | 2 | 3 | 4 = 1;
  private hasSelectedQuarter = false;

  constructor(port: GameRuntimePort) {
    super("RecordsScene");
    this.port = port;
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.view = this.add.group();
    this.unsubscribe = this.port.subscribe((snapshot) => {
      this.snapshot = snapshot;
      if (snapshot.screen === "records") this.render();
    });
    this.snapshot = this.port.getSnapshot();
    this.selectLatestQuarterIfNeeded();
    this.render();
  }

  shutdown(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  getUiDiagnostics(): Record<string, unknown> {
    const records = this.snapshot?.records;
    const quarter = records?.quarters.find((entry) => entry.quarter === this.selectedQuarter) ?? records?.quarters.at(-1);
    return {
      protocol: "game-p2-records-v1",
      screen: this.snapshot?.screen ?? null,
      quarterCount: records?.quarters.length ?? 0,
      selectedQuarter: quarter?.quarter ?? null,
      monthCount: quarter?.months.length ?? 0,
      peopleCount: records?.people.length ?? 0,
      interestCount: records?.interests.length ?? 0,
    };
  }

  private render(): void {
    if (!this.snapshot?.records) return;
    this.selectLatestQuarterIfNeeded();
    this.view.clear(true, true);
    const records = this.snapshot.records;
    const quarter = records.quarters.find((entry) => entry.quarter === this.selectedQuarter) ?? records.quarters.at(-1) ?? null;
    this.view.add(p2Frame(this, "人生记录", `${records.calendarYear} · ${records.age}岁 · 这一年的生活留痕`, 0x6f91bd));
    this.renderCloseButton();
    this.renderQuarterTabs(records.quarters);
    if (!quarter) {
      this.view.add(text(this, 24, 250, "还没有完成的季度记录。", 14, 0xb7c4c2));
      return;
    }
    this.renderQuarter(quarter);
    this.renderPeopleAndInterests(records);
  }

  private selectLatestQuarterIfNeeded(): void {
    if (this.hasSelectedQuarter) return;
    const latest = this.snapshot?.records?.quarters.at(-1)?.quarter;
    if (latest) this.selectedQuarter = latest;
    this.hasSelectedQuarter = true;
  }

  private renderCloseButton(): void {
    this.view.add(p2Button(this, 334, 16, 42, 32, "×", () => this.port.dispatch({ type: "utility.close" })));
  }

  private renderQuarterTabs(quarters: RuntimeRecordsQuarter[]): void {
    const byQuarter = new Map(quarters.map((quarter) => [quarter.quarter, quarter]));
    for (let quarter = 1; quarter <= 4; quarter += 1) {
      const entry = byQuarter.get(quarter as 1 | 2 | 3 | 4);
      const x = 14 + (quarter - 1) * 91;
      const active = this.selectedQuarter === quarter;
      const tabBg = this.add.graphics()
        .fillStyle(active ? 0x28514d : 0x20343a, 1).fillRoundedRect(-41, -18, 82, 36, 10)
        .lineStyle(1, active ? 0x6fc4b4 : palette.line, 0.7).strokeRoundedRect(-41, -18, 82, 36, 10);
      const label = text(this, 0, 0, `Q${quarter}${entry ? "" : "·"}`, 12, active ? 0xffd8a1 : 0x8fa7a5, true).setOrigin(0.5);

      const tabContainer = this.add.container(x + 41, 118, [tabBg, label]);
      tabContainer.setSize(82, 36);
      if (entry) {
        const pad = 6;
        tabContainer.setInteractive(new Phaser.Geom.Rectangle(-41 - pad, -18 - pad, 82 + pad * 2, 36 + pad * 2), Phaser.Geom.Rectangle.Contains);
        tabContainer.input!.cursor = "pointer";
        bindInteractiveFeedback(tabContainer, {
          pressScale: 0.95,
          onClick: () => {
            this.selectedQuarter = quarter as 1 | 2 | 3 | 4;
            this.render();
          },
        });
      }
      this.view.add(tabContainer);
    }
  }

  private renderQuarter(quarter: RuntimeRecordsQuarter): void {
    this.view.add(text(this, 16, 158, quarter.label, 18, 0xfff5e9, true));
    this.view.add(text(this, 374, 158, `执行 ${p2FormatPercent(quarter.executionRate)}`, 12, 0x6fc4b4, true).setOrigin(1, 0.5));
    this.view.add(text(this, 16, 181, p2Compact(quarter.operationLabel, 46), 10, 0xb7c4c2));
    this.renderMonths(quarter.months);
    this.renderActivities(quarter.activities);
    this.renderQuarterFacts(quarter);
  }

  private renderMonths(months: RuntimeMonthTick[]): void {
    months.slice(0, 3).forEach((month, index) => {
      const x = 14 + index * 121;
      const interrupted = Boolean(month.interruption);
      this.view.add(panel(this, x, 210, 112, 154, interrupted ? 0x523b3a : 0x20343a, 12));
      this.view.add(p2Chip(this, x + 8, 220, `第${month.monthInQuarter}个月`, interrupted ? 0x7d4a43 : 0x2b5551));
      this.view.add(text(this, x + 9, 263, `${month.calendarMonth}月`, 14, 0xffd8a1, true));
      this.view.add(text(this, x + 9, 286, `精力 ${month.energyRemaining}`, 10, month.energyRemaining < 0 ? 0xf18a76 : 0xf2c66d));
      const actionLabels = month.actions.slice(0, 2).map((action) => p2Compact(action.label, 12)).join("、") || "生活照常";
      this.view.add(p2TextBlock(this, x + 9, 312, 94, actionLabels, 9, 0xfff5e9));
      if (interrupted) this.view.add(text(this, x + 9, 350, "有事件打断", 8, 0xf18a76, true));
    });
  }

  private renderActivities(activities: Array<{ id: string; label: string }>): void {
    this.view.add(text(this, 16, 390, "本季度行动", 11, 0xffd8a1, true));
    activities.slice(0, 4).forEach((activity, index) => {
      this.view.add(p2Chip(this, 14 + (index % 2) * 181, 406 + Math.floor(index / 2) * 28, p2Compact(activity.label, 22), 0x2b4248));
    });
  }

  private renderQuarterFacts(quarter: RuntimeRecordsQuarter): void {
    const resource = quarter.resources;
    this.view.add(panel(this, 14, 474, 362, 82, 0x172a31, 12));
    this.view.add(text(this, 28, 492, "资源与因果", 10, 0x6fc4b4, true));
    this.view.add(text(this, 28, 516, `时间 ${resource.executedTimeSlots}/${resource.plannedTimeSlots} · 精力 ${resource.energySpent} → ${resource.energyRemaining}`, 10, 0xfff5e9));
    const factLine = `事件 ${quarter.eventCount} · 兴趣 ${quarter.interestCount} · 关系 ${quarter.relationshipCount} · 成长 ${quarter.growthCount}`;
    this.view.add(text(this, 28, 538, factLine, 9, 0xb7c4c2));
    if (quarter.interruptionReason) this.view.add(text(this, 16, 576, `打断：${p2Compact(quarter.interruptionReason, 48)}`, 10, 0xf18a76, true));
  }

  private renderPeopleAndInterests(records: GameRuntimeSnapshot["records"]): void {
    const people = records.people.slice(0, 3).map((person) => p2Compact(person.label, 12)).join("、") || "暂无持续人物";
    const interests = records.interests.slice(0, 3).map((interest) => p2Compact(interest.label, 12)).join("、") || "兴趣还在萌芽";
    this.view.add(text(this, 16, 614, `人物  ${people}`, 10, 0xa991c8, true).setWordWrapWidth(356, true));
    this.view.add(text(this, 16, 646, `兴趣  ${interests}`, 10, 0xf0c66d, true).setWordWrapWidth(356, true));
    this.view.add(text(this, 16, 692, "点击 Q1—Q4 查看每个季度的三个月过程。", 9, 0x8fa7a5));
  }
}
