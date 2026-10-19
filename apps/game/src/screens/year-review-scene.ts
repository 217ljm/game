import Phaser from "phaser";
import { type GameRuntimePort, type GameRuntimeSnapshot } from "../contracts";
import { p2Button, p2Chip, p2Compact, p2Cover, p2Frame, p2FormatPercent, p2TextBlock, p2TopMeta } from "../ui/p2-screen-primitives";
import { panel, text } from "../ui/game-text";

import { VerticalStack } from "../ui/vertical-stack";

/** Annual review gate: facts are Core-owned; the screen only presents and confirms. */
export class YearReviewScene extends Phaser.Scene {
  private readonly port: GameRuntimePort;
  private snapshot!: GameRuntimeSnapshot;
  private unsubscribe: (() => void) | null = null;
  private view!: Phaser.GameObjects.Group;

  constructor(port: GameRuntimePort) {
    super("YearReviewScene");
    this.port = port;
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.view = this.add.group();
    this.unsubscribe = this.port.subscribe((snapshot) => {
      this.snapshot = snapshot;
      if (snapshot.screen === "year-review") this.render();
    });
    this.snapshot = this.port.getSnapshot();
    this.render();
  }

  shutdown(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  getUiDiagnostics(): Record<string, unknown> {
    const review = this.snapshot?.yearReview;
    return {
      protocol: "game-p2-year-review-v1",
      screen: this.snapshot?.screen ?? null,
      eventId: review?.eventId ?? null,
      quarterCount: review?.quarterSummary.length ?? 0,
      highlightCount: Math.min(5, review?.highlights.length ?? 0),
      nextAge: review?.nextAge ?? null,
    };
  }

  private render(): void {
    const review = this.snapshot?.yearReview;
    if (!review) return;
    this.view.clear(true, true);
    this.view.add(p2Frame(this, "年度回望", `${review.calendarYear} · ${review.completedAge}岁这一年已经完成`, 0xa991c8));
    this.view.add(p2TopMeta(this, this.snapshot));
    const timeline = p2Cover(this, "scene.timeline", 0, 92, 390, 124, 0.28);
    if (timeline) this.view.add(timeline);
    this.view.add(this.add.rectangle(195, 154, 390, 124, 0x172a31, 0.5));
    this.view.add(text(this, 16, 108, `这一年，${review.completedAge}岁`, 22, 0xfff5e9, true));
    this.view.add(p2TextBlock(this, 16, 150, 356, p2Compact(review.prompt, 72), 11, 0xb7c4c2));
    this.renderQuarterTrack(review);
    this.renderHighlights(review.highlights);
    this.view.add(panel(this, 14, 660, 362, 70, 0x2b4248, 14));
    this.view.add(text(this, 30, 681, `下一站：${review.nextAge}岁`, 15, 0xffd8a1, true));
    this.view.add(text(this, 30, 707, "确认后，新的身份和行动池才会打开。", 10, 0xfff5e9));
    this.view.add(p2Button(this, 14, 764, 362, 58, "确认这一年，进入下一岁", () => this.port.dispatch({ type: "year.confirm", eventId: review.eventId })));
  }

  private renderQuarterTrack(review: NonNullable<GameRuntimeSnapshot["yearReview"]>): void {
    review.quarterSummary.slice(0, 4).forEach((quarter, index) => {
      const x = 14 + index * 91;
      this.view.add(panel(this, x, 242, 82, 118, 0x20343a, 10));
      this.view.add(p2Chip(this, x + 8, 254, `Q${quarter.quarter}`, 0x2b5551));
      this.view.add(text(this, x + 8, 296, p2FormatPercent(quarter.executionRate), 15, 0x6fc4b4, true));
      this.view.add(text(this, x + 8, 332, `${quarter.activityIds.length} 项行动`, 9, 0xfff5e9, true));
    });
  }

  private renderHighlights(highlights: string[]): void {
    this.view.add(text(this, 16, 382, "这一年最重要的变化", 13, 0xffd8a1, true));
    const visible = highlights.slice(0, 5);
    const stack = new VerticalStack(38, 408, 10);
    visible.forEach((highlight) => {
      const currentY = stack.getY();
      this.view.add(text(this, 22, currentY + 7, "·", 15, 0xa991c8, true));
      const block = p2TextBlock(this, 38, currentY, 330, p2Compact(highlight, 44), 11, 0xfff5e9);
      this.view.add(block);
      stack.add(block);
    });
    if (!visible.length) this.view.add(text(this, 22, 412, "这一年留下了安静但真实的积累。", 11, 0xb7c4c2));
  }
}
