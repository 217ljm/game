import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, type GameRuntimePort, type GameRuntimeSnapshot, type RuntimeEventOption } from "../contracts";
import { palette } from "../ui/game-palette";
import { p2Button, p2Compact, p2Cover, p2Frame, p2TextBlock, p2TopMeta } from "../ui/p2-screen-primitives";
import { bindInteractiveFeedback, panel, text } from "../ui/game-text";

/** Random/critical event choice screen. All facts and options come from Core. */
export class EventScene extends Phaser.Scene {
  private readonly port: GameRuntimePort;
  private snapshot!: GameRuntimeSnapshot;
  private unsubscribe: (() => void) | null = null;
  private view!: Phaser.GameObjects.Group;

  constructor(port: GameRuntimePort) {
    super("EventScene");
    this.port = port;
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.view = this.add.group();
    this.unsubscribe = this.port.subscribe((snapshot) => {
      this.snapshot = snapshot;
      if (snapshot.screen === "event") this.render();
    });
    this.snapshot = this.port.getSnapshot();
    this.render();
  }

  shutdown(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  getUiDiagnostics(): Record<string, unknown> {
    const event = this.snapshot?.event;
    return {
      protocol: "game-p2-event-v1",
      screen: this.snapshot?.screen ?? null,
      eventId: event?.eventId ?? null,
      optionCount: event?.options.length ?? 0,
      affectedActionIds: event?.affectedActionIds ?? [],
    };
  }

  private render(): void {
    if (!this.snapshot?.event) return;
    this.view.clear(true, true);
    const event = this.snapshot.event;
    this.view.add(p2Frame(this, "生活事件", "事情打断了原来的安排 · 先看清再决定", 0xf0c66d));
    this.view.add(p2TopMeta(this, this.snapshot));
    const image = p2Cover(this, "scene.relations", 0, 92, GAME_WIDTH, 218, 0.9);
    if (image) this.view.add(image);
    this.view.add(this.add.rectangle(GAME_WIDTH / 2, 200, GAME_WIDTH, 218, 0x102029, 0.56));
    this.view.add(text(this, 16, 112, `${event.calendarYear} · ${event.age}岁 · Q${event.quarter} · 第${event.monthInQuarter}个月`, 11, 0xffd8a1, true));
    this.view.add(text(this, 16, 148, event.title, 24, 0xfff5e9, true));
    this.view.add(p2TextBlock(this, 16, 190, 350, p2Compact(event.prompt, 92), 13, 0xfff5e9));
    const affected = event.affectedActions.length ? event.affectedActions.map((action) => p2Compact(action.label, 14)).join("、") : "当前安排";
    this.view.add(text(this, 16, 300, `正在影响：${affected}`, 10, 0xf18a76, true).setWordWrapWidth(356, true));
    this.view.add(text(this, 16, 340, "你准备怎么回应？", 12, 0xffd8a1, true));
    this.renderOptions(event.options);
  }

  private renderOptions(options: RuntimeEventOption[]): void {
    const visible = options.slice(0, 3);
    const cardHeight = visible.length === 3 ? 130 : 148;
    const width = 362;
    visible.forEach((option, index) => {
      const y = 362 + index * (cardHeight + 10);
      const cardBg = this.add.graphics()
        .fillStyle(0x20343a, 1).fillRoundedRect(-width / 2, -cardHeight / 2, width, cardHeight, 14)
        .lineStyle(1, palette.line, 0.75).strokeRoundedRect(-width / 2, -cardHeight / 2, width, cardHeight, 14);

      const title = text(this, -width / 2 + 16, -cardHeight / 2 + 22, option.label, 15, 0xfff5e9, true).setWordWrapWidth(314, true);
      const desc = p2TextBlock(this, -width / 2 + 16, -cardHeight / 2 + 48, 314, p2Compact(option.description, 70), 11, 0xb7c4c2);
      const children: Phaser.GameObjects.GameObject[] = [cardBg, title, desc];

      if (option.effectSummary) {
        children.push(text(this, -width / 2 + 16, cardHeight / 2 - 20, p2Compact(option.effectSummary, 48), 10, 0x6fc4b4, true));
      }

      const cardContainer = this.add.container(14 + width / 2, y + cardHeight / 2, children);
      cardContainer.setSize(width, cardHeight);
      const pad = 6;
      cardContainer.setInteractive(new Phaser.Geom.Rectangle(-width / 2 - pad, -cardHeight / 2 - pad, width + pad * 2, cardHeight + pad * 2), Phaser.Geom.Rectangle.Contains);
      cardContainer.input!.cursor = "pointer";

      bindInteractiveFeedback(cardContainer, {
        pressScale: 0.96,
        onClick: () => {
          this.port.dispatch({ type: "event.choose", eventId: this.snapshot.event?.eventId ?? "", optionId: option.id });
        },
      });

      this.view.add(cardContainer);
    });
    if (!visible.length) this.view.add(p2Button(this, 14, 650, 362, 56, "暂时没有可选回应", () => {}, false));
  }
}
