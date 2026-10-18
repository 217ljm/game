import Phaser from "phaser";
import { GAME_WIDTH, type GameRuntimePort, type GameRuntimeSnapshot } from "../contracts";
import { p2Button, p2Chip, p2Compact, p2Cover, p2Frame, p2TextBlock, p2TopMeta } from "../ui/p2-screen-primitives";
import { panel, text } from "../ui/game-text";

/** Age transition presentation. It previews the next life state without owning it. */
export class AgeEntryScene extends Phaser.Scene {
  private readonly port: GameRuntimePort;
  private snapshot!: GameRuntimeSnapshot;
  private unsubscribe: (() => void) | null = null;
  private view!: Phaser.GameObjects.Group;

  constructor(port: GameRuntimePort) {
    super("AgeEntryScene");
    this.port = port;
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.view = this.add.group();
    this.unsubscribe = this.port.subscribe((snapshot) => {
      this.snapshot = snapshot;
      if (snapshot.screen === "age-entry") this.render();
    });
    this.snapshot = this.port.getSnapshot();
    this.render();
  }

  shutdown(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  getUiDiagnostics(): Record<string, unknown> {
    const entry = this.snapshot?.ageEntry;
    return {
      protocol: "game-p2-age-entry-v1",
      screen: this.snapshot?.screen ?? null,
      key: entry?.key ?? null,
      fromAge: entry?.from.age ?? null,
      toAge: entry?.to.age ?? null,
      actionCount: entry?.actionIds.length ?? 0,
      moduleCount: entry?.unlockedModuleIds.length ?? 0,
    };
  }

  private render(): void {
    const entry = this.snapshot?.ageEntry;
    if (!entry) return;
    this.view.clear(true, true);
    this.view.add(p2Frame(this, `${entry.to.age}岁，新的阶段`, "年龄已经改变 · 先看看接下来会遇见什么", 0x6f91bd));
    this.view.add(p2TopMeta(this, this.snapshot));
    const image = p2Cover(this, "player.childNeutral", 0, 94, GAME_WIDTH, 236, 0.94);
    if (image) this.view.add(image);
    this.view.add(this.add.rectangle(GAME_WIDTH / 2, 210, GAME_WIDTH, 236, 0x102029, 0.46));
    this.view.add(text(this, 16, 122, `${entry.from.calendarYear} · ${entry.from.age}岁  →  ${entry.to.calendarYear} · ${entry.to.age}岁`, 13, 0xffd8a1, true));
    this.view.add(text(this, 16, 168, `${entry.to.age}岁的人生入口`, 25, 0xfff5e9, true));
    this.view.add(p2TextBlock(this, 16, 206, 350, "新的身份、人物和行动会接住刚刚发生的一年。", 12, 0xb7c4c2));
    this.renderPreview(entry);
    this.view.add(p2Button(this, 14, 764, 362, 58, `进入${entry.to.age}岁生活`, () => this.port.dispatch({ type: "age-entry.continue" })));
  }

  private renderPreview(entry: NonNullable<GameRuntimeSnapshot["ageEntry"]>): void {
    this.view.add(panel(this, 14, 364, 362, 292, 0x172a31, 14));
    this.view.add(text(this, 30, 390, "新的生活内容", 12, 0xffd8a1, true));
    const modules = entry.unlockedModules.slice(0, 5);
    modules.forEach((module, index) => this.view.add(p2Chip(this, 28 + (index % 2) * 176, 418 + Math.floor(index / 2) * 35, p2Compact(module.label, 20), 0x2b4248)));
    this.view.add(text(this, 30, 516, `行动池  ${entry.actionIds.length} 项`, 11, 0x6fc4b4, true));
    this.view.add(p2TextBlock(this, 30, 548, 320, entry.actions.slice(0, 5).map((action) => p2Compact(action.label, 22)).join("  ·  ") || "新的行动正在准备", 11, 0xfff5e9));
    this.view.add(text(this, 30, 606, `持续人物  ${entry.persistentPeople.length} 人`, 11, 0xa991c8, true));
    this.view.add(p2TextBlock(this, 30, 632, 320, entry.people.slice(0, 3).map((person) => p2Compact(person.label, 22)).join("  ·  ") || "熟悉的人仍然在身边", 10, 0xb7c4c2));
  }
}
