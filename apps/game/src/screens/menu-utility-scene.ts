import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../contracts";

export type MenuMotionMode = "full" | "reduced" | "off";

export interface MenuSettings {
  motionMode: MenuMotionMode;
  soundEnabled: boolean;
  hapticEnabled: boolean;
}

export type MenuSaveSummary = { label: string; detail: string } | null;

export interface MenuUtilityActions {
  getSettings(): MenuSettings;
  updateSettings(next: MenuSettings): void;
  getSaveSummary(): MenuSaveSummary;
}

type UtilityMode = "save" | "settings" | "about";
type UtilityLaunchData = { mode?: UtilityMode; onClose?: () => void };

const COLORS = {
  backdrop: 0x061014,
  panel: 0x10242a,
  panelRaised: 0x173239,
  ink: 0xf8f1e4,
  muted: 0xb8c0bb,
  warm: 0xe1b86e,
  teal: 0x78c2b0,
  line: 0x385259,
  danger: 0xe18d7c,
};

/** Canvas-only utility pages used by the formal main menu. */
export class MenuUtilityScene extends Phaser.Scene {
  private readonly actions: MenuUtilityActions;
  private mode: UtilityMode = "save";
  private settings!: MenuSettings;
  private view!: Phaser.GameObjects.Group;
  private closeButton?: Phaser.GameObjects.Container;
  private introTween?: Phaser.Tweens.Tween;
  private opened = false;
  private onClose: (() => void) | null = null;
  private notifyCloseOnShutdown = false;

  constructor(actions: MenuUtilityActions) {
    super("MenuUtilityScene");
    this.actions = actions;
  }

  init(data?: UtilityLaunchData): void {
    this.mode = data?.mode ?? "save";
    this.settings = { ...this.actions.getSettings() };
    this.onClose = data?.onClose ?? null;
    this.notifyCloseOnShutdown = false;
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.view = this.add.group();
    this.opened = true;
    this.input.enabled = true;
    this.cameras.main.setBackgroundColor(COLORS.backdrop);
    this.render();
    if (this.settings.motionMode !== "off") {
      this.cameras.main.fadeIn(this.settings.motionMode === "reduced" ? 120 : 240, 6, 16, 20);
      if (this.settings.motionMode === "full") {
        this.introTween = this.tweens.add({
          targets: this.view.getChildren(),
          alpha: { from: 0.78, to: 1 },
          duration: 360,
          ease: "Sine.Out",
        });
      }
    }
  }

  getUiDiagnostics(): Record<string, unknown> {
    return {
      protocol: "game-menu-utility-v1",
      mode: this.mode,
      settings: { ...this.settings },
      saveAvailable: Boolean(this.actions.getSaveSummary()),
      opened: this.opened,
    };
  }

  isOpen(): boolean {
    return this.opened;
  }

  open(mode: UtilityMode, onClose?: () => void): void {
    this.mode = mode;
    this.settings = { ...this.actions.getSettings() };
    this.onClose = onClose ?? this.onClose;
    this.opened = true;
    this.input.enabled = true;
    this.scene.setVisible(true);
    this.render();
  }

  private render(): void {
    this.view.clear(true, true);
    this.closeButton = undefined;
    const blocker = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.backdrop, 0.96).setOrigin(0).setDepth(-10);
    blocker.setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT), Phaser.Geom.Rectangle.Contains);
    this.view.add(blocker);
    this.view.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x020507, 0.23).setOrigin(0).setDepth(-9));
    this.renderHeader();
    if (this.mode === "save") this.renderSave();
    if (this.mode === "settings") this.renderSettings();
    if (this.mode === "about") this.renderAbout();
    this.renderBottomBack();
  }

  private renderHeader(): void {
    const title = this.mode === "save" ? "存档" : this.mode === "settings" ? "设置" : "关于";
    this.view.add(this.add.text(24, 54, title, {
      fontFamily: "'Microsoft YaHei', 'PingFang SC', sans-serif",
      fontSize: "28px",
      fontStyle: "bold",
      color: "#f8f1e4",
    }).setOrigin(0, 0.5));
    this.view.add(this.add.text(24, 86, this.mode === "save" ? "查看这段人生留下的痕迹" : this.mode === "settings" ? "调整你的游玩方式" : "关于这段正在发生的人生", {
      fontFamily: "'Microsoft YaHei', 'PingFang SC', sans-serif",
      fontSize: "12px",
      color: "#b8c0bb",
    }).setOrigin(0, 0.5));
    this.view.add(this.add.rectangle(24, 112, GAME_WIDTH - 48, 1, COLORS.line, 0.72).setOrigin(0));
    this.closeButton = this.makeButton(347, 48, 38, 36, "×", () => this.close(), "secondary");
  }

  private renderSave(): void {
    const summary = this.actions.getSaveSummary();
    if (!summary) {
      this.addCard(24, 160, 342, 154);
      this.view.add(this.add.text(GAME_WIDTH / 2, 215, "还没有人生记录", {
        fontFamily: "'Microsoft YaHei', sans-serif", fontSize: "20px", color: "#f8f1e4", fontStyle: "bold",
      }).setOrigin(0.5));
      this.view.add(this.add.text(GAME_WIDTH / 2, 257, "开始一段新的人生后，记录会在这里出现。", {
        fontFamily: "'Microsoft YaHei', sans-serif", fontSize: "12px", color: "#b8c0bb",
      }).setOrigin(0.5));
      return;
    }
    this.addCard(24, 160, 342, 184);
    this.view.add(this.add.text(46, 198, summary.label, {
      fontFamily: "'Microsoft YaHei', sans-serif", fontSize: "21px", color: "#f8f1e4", fontStyle: "bold",
    }).setOrigin(0, 0.5));
    this.view.add(this.add.text(46, 238, summary.detail, {
      fontFamily: "'Microsoft YaHei', sans-serif", fontSize: "13px", color: "#e1b86e",
    }).setOrigin(0, 0.5).setWordWrapWidth(292));
    this.view.add(this.add.text(46, 296, "这是当前唯一的本地人生记录。", {
      fontFamily: "'Microsoft YaHei', sans-serif", fontSize: "11px", color: "#b8c0bb",
    }).setOrigin(0, 0.5));
  }

  private renderSettings(): void {
    this.addCard(24, 150, 342, 330);
    this.view.add(this.add.text(46, 184, "动态效果", {
      fontFamily: "'Microsoft YaHei', sans-serif", fontSize: "16px", color: "#f8f1e4", fontStyle: "bold",
    }).setOrigin(0, 0.5));
    this.view.add(this.add.text(46, 208, "选择界面转场和反馈的强度", {
      fontFamily: "'Microsoft YaHei', sans-serif", fontSize: "11px", color: "#b8c0bb",
    }).setOrigin(0, 0.5));
    const modes: Array<{ id: MenuMotionMode; label: string }> = [
      { id: "full", label: "完整" }, { id: "reduced", label: "减少" }, { id: "off", label: "关闭" },
    ];
    modes.forEach((mode, index) => {
      this.makeToggle(46 + index * 99, 252, 86, 42, mode.label, this.settings.motionMode === mode.id, () => {
        this.settings = { ...this.settings, motionMode: mode.id };
        this.actions.updateSettings({ ...this.settings });
        this.render();
      });
    });
    this.makeToggle(46, 330, 292, 46, "声音", this.settings.soundEnabled, () => {
      this.settings = { ...this.settings, soundEnabled: !this.settings.soundEnabled };
      this.actions.updateSettings({ ...this.settings });
      this.render();
    });
    this.makeToggle(46, 398, 292, 46, "震动反馈", this.settings.hapticEnabled, () => {
      this.settings = { ...this.settings, hapticEnabled: !this.settings.hapticEnabled };
      this.actions.updateSettings({ ...this.settings });
      this.render();
    });
  }

  private renderAbout(): void {
    this.addCard(24, 160, 342, 286);
    this.view.add(this.add.text(GAME_WIDTH / 2, 207, "《1978—一生》", {
      fontFamily: "STKaiti, KaiTi, 'Microsoft YaHei', sans-serif", fontSize: "29px", color: "#f8f1e4", fontStyle: "bold",
    }).setOrigin(0.5));
    this.view.add(this.add.rectangle(GAME_WIDTH / 2, 245, 82, 1, COLORS.warm, 0.75));
    this.addAboutLine("独立开发中", 282, COLORS.teal);
    this.addAboutLine("版本 v0.1.0", 317, COLORS.ink);
    this.addAboutLine("当前素材：开发期 runtime-input", 352, COLORS.muted);
    this.view.add(this.add.text(GAME_WIDTH / 2, 407, "一款关于选择、时间和关系的季度人生模拟游戏。", {
      fontFamily: "'Microsoft YaHei', sans-serif", fontSize: "11px", color: "#b8c0bb", align: "center",
    }).setOrigin(0.5).setWordWrapWidth(292));
  }

  private addAboutLine(value: string, y: number, color: number): void {
    this.view.add(this.add.text(GAME_WIDTH / 2, y, value, {
      fontFamily: "'Microsoft YaHei', sans-serif", fontSize: "13px", color: `#${color.toString(16).padStart(6, "0")}`,
    }).setOrigin(0.5));
  }

  private renderBottomBack(): void {
    this.makeButton(GAME_WIDTH / 2, 774, 292, 52, "返回主菜单", () => this.close(), "secondary");
  }

  private addCard(x: number, y: number, width: number, height: number): void {
    this.view.add(this.add.graphics().fillStyle(COLORS.panel, 0.98).fillRoundedRect(x, y, width, height, 16).lineStyle(1, COLORS.line, 0.82).strokeRoundedRect(x, y, width, height, 16));
  }

  private makeToggle(x: number, y: number, width: number, height: number, label: string, active: boolean, onActivate: () => void): Phaser.GameObjects.Container {
    const bg = this.add.graphics().fillStyle(active ? COLORS.teal : COLORS.panelRaised, 0.96).fillRoundedRect(-width / 2, -height / 2, width, height, 10).lineStyle(1, active ? COLORS.teal : COLORS.line, 0.9).strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
    const labelText = this.add.text(active && width > 100 ? -12 : 0, 0, label, { fontFamily: "'Microsoft YaHei', sans-serif", fontSize: "13px", color: active ? "#071517" : "#f8f1e4", fontStyle: "bold" }).setOrigin(0.5);
    const children: Phaser.GameObjects.GameObject[] = [bg, labelText];
    if (width > 100) {
      children.push(this.add.text(width / 2 - 31, 0, active ? "开" : "关", { fontFamily: "'Microsoft YaHei', sans-serif", fontSize: "11px", color: active ? "#071517" : "#b8c0bb" }).setOrigin(0.5));
    }
    const container = this.add.container(x + width / 2, y + height / 2, children);
    container.setSize(width, height);
    const pad = 8;
    container.setInteractive(new Phaser.Geom.Rectangle(-width / 2 - pad, -height / 2 - pad, width + pad * 2, height + pad * 2), Phaser.Geom.Rectangle.Contains);
    container.input!.cursor = "pointer";
    this.bindActivation(container, onActivate);
    this.view.add(container);
    return container;
  }

  private makeButton(x: number, y: number, width: number, height: number, label: string, onActivate: () => void, appearance: "primary" | "secondary"): Phaser.GameObjects.Container {
    const bg = this.add.graphics().fillStyle(appearance === "primary" ? COLORS.warm : COLORS.panelRaised, appearance === "primary" ? 0.95 : 0.96).fillRoundedRect(-width / 2, -height / 2, width, height, 12).lineStyle(1, appearance === "primary" ? COLORS.warm : COLORS.line, 0.9).strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
    const labelText = this.add.text(0, 0, label, { fontFamily: "'Microsoft YaHei', sans-serif", fontSize: width < 60 ? "24px" : "15px", color: appearance === "primary" ? "#152327" : "#f8f1e4", fontStyle: "bold" }).setOrigin(0.5);
    const container = this.add.container(x, y, [bg, labelText]);
    container.setSize(width, height);
    const pad = 10;
    container.setInteractive(new Phaser.Geom.Rectangle(-width / 2 - pad, -height / 2 - pad, width + pad * 2, height + pad * 2), Phaser.Geom.Rectangle.Contains);
    container.input!.cursor = "pointer";
    this.bindActivation(container, onActivate);
    this.view.add(container);
    return container;
  }

  private bindActivation(container: Phaser.GameObjects.Container, onActivate: () => void): void {
    let isDown = false;
    container.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (!this.opened) return;
      isDown = true;
      container.setScale(0.96);
    });
    container.on(Phaser.Input.Events.POINTER_OUT, () => {
      isDown = false;
      container.setScale(1);
    });
    container.on("pointercancel", () => {
      isDown = false;
      container.setScale(1);
    });
    container.on(Phaser.Input.Events.POINTER_UP, () => {
      if (isDown) {
        isDown = false;
        container.setScale(1);
        if (this.opened) onActivate();
      }
    });
  }

  private close(): void {
    if (!this.opened) return;
    this.opened = false;
    this.notifyCloseOnShutdown = true;
    this.input.enabled = false;
    this.scene.setVisible(false);
    this.scene.stop();
  }

  private shutdown(): void {
    this.introTween?.remove();
    this.introTween = undefined;
    this.closeButton?.removeAllListeners();
    const onClose = this.notifyCloseOnShutdown ? this.onClose : null;
    this.notifyCloseOnShutdown = false;
    this.onClose = null;
    onClose?.();
  }
}
