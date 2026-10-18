import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../contracts";
import { MenuUtilityScene, type MenuSaveSummary } from "./menu-utility-scene";
import { MOTION_LEVEL_REGISTRY_KEY } from "./boot-scene";

export interface StartLifePayload {
  seed?: string;
  birthYear?: number;
  name?: string;
  gender?: "male" | "female";
  chosenItem?: string;
  interestBonus?: string;
  attributeBonus?: string;
}

export interface MainMenuActions {
  readonly continueAvailable: boolean;
  readonly saveSummary: MenuSaveSummary;
  readonly startNewGame: (config?: StartLifePayload) => Promise<void>;
  readonly continueGame: () => Promise<void>;
}

type MenuButton = {
  container: Phaser.GameObjects.Container;
  enabled: boolean;
  width: number;
  height: number;
};

type UtilityMode = "save" | "settings" | "about";

const COLORS = {
  black: 0x020507,
  ink: 0xf8f1e4,
  warm: 0xe1b86e,
  darkTeal: 0x102d31,
  muted: 0xb9b4aa,
  line: 0x6e817f,
};

/** Canvas-only title menu. Core creation and save recovery stay in main.ts. */
export class MainMenuScene extends Phaser.Scene {
  private readonly actions: MainMenuActions;
  private loading = false;
  private selectedAction: "new" | "continue" | null = null;
  private statusText!: Phaser.GameObjects.Text;
  private backgroundTween: Phaser.Tweens.Tween | null = null;
  private buttons: MenuButton[] = [];
  private utilityButtons: MenuButton[] = [];
  private confirmLayer: Phaser.GameObjects.Container | null = null;
  private utilityOpen = false;

  constructor(actions: MainMenuActions) {
    super("MainMenuScene");
    this.actions = actions;
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.loading = false;
    this.selectedAction = null;
    this.confirmLayer = null;
    this.utilityOpen = false;
    this.cameras.main.setBackgroundColor(COLORS.black);

    const background = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "scene.title");
    const coverScale = Math.max(GAME_WIDTH / background.width, GAME_HEIGHT / background.height);
    background.setScale(coverScale * 1.035);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.black, 0.16).setOrigin(0);
    this.add.rectangle(0, 0, GAME_WIDTH, 250, COLORS.black, 0.27).setOrigin(0);
    this.add.rectangle(0, 510, GAME_WIDTH, 334, COLORS.black, 0.57).setOrigin(0);
    this.add.rectangle(0, 620, GAME_WIDTH, 224, COLORS.black, 0.2).setOrigin(0);

    const year = this.add.text(GAME_WIDTH / 2, 104, "1978", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: "25px",
      color: "#e1b86e",
    }).setOrigin(0.5);
    year.setLetterSpacing(7);

    this.add.text(GAME_WIDTH / 2, 156, "一 生", {
      fontFamily: "STKaiti, KaiTi, 'Microsoft YaHei', sans-serif",
      fontSize: "50px",
      fontStyle: "bold",
      color: "#f8f1e4",
      stroke: "#132428",
      strokeThickness: 3,
      shadow: { offsetX: 0, offsetY: 3, color: "#000000", blur: 8, fill: true },
    }).setOrigin(0.5);

    this.add.rectangle(GAME_WIDTH / 2, 202, 78, 1, COLORS.warm, 0.78);
    this.add.text(GAME_WIDTH / 2, 225, "从这一年，活过一生", {
      fontFamily: "'Microsoft YaHei', 'PingFang SC', sans-serif",
      fontSize: "13px",
      color: "#eee4d2",
    }).setOrigin(0.5).setAlpha(0.9);

    const summary = this.actions.saveSummary;
    this.add.text(GAME_WIDTH / 2, 560, summary?.label ?? (this.actions.continueAvailable ? "发现一段人生记录" : "准备开始第一段人生"), {
      fontFamily: "'Microsoft YaHei', 'PingFang SC', sans-serif",
      fontSize: summary ? "16px" : "13px",
      fontStyle: summary ? "bold" : "normal",
      color: summary ? "#f6e7c9" : "#cbc5ba",
    }).setOrigin(0.5);
    this.statusText = this.add.text(GAME_WIDTH / 2, 591, summary?.detail ?? (this.actions.continueAvailable ? "读取后显示详细进度" : "暂无可继续的存档"), {
      fontFamily: "'Microsoft YaHei', 'PingFang SC', sans-serif",
      fontSize: "11px",
      color: this.actions.continueAvailable ? "#e1b86e" : "#aaa59c",
    }).setOrigin(0.5);

    if (this.actions.continueAvailable) {
      this.buttons = [
        this.createButton(640, "继续游戏", true, "primary", () => this.enter("continue")),
        this.createButton(706, "新游戏", true, "secondary", () => this.requestNewGame()),
      ];
    } else {
      this.buttons = [
        this.createButton(640, "新游戏", true, "primary", () => this.requestNewGame()),
        this.createButton(706, "继续游戏", false, "secondary", () => {}),
      ];
    }

    this.utilityButtons = [
      this.createUtilityButton(88, "存档", "save"),
      this.createUtilityButton(195, "设置", "settings"),
      this.createUtilityButton(302, "关于", "about"),
    ];

    // 顶部右上角常驻【🛠️ 快速测试直达】按钮
    const quickTestG = this.add.graphics();
    quickTestG.fillStyle(0xd97706, 0.95).fillRoundedRect(GAME_WIDTH - 120, 24, 106, 32, 8);
    quickTestG.lineStyle(1.5, 0xfbbf24, 1).strokeRoundedRect(GAME_WIDTH - 120, 24, 106, 32, 8);
    quickTestG.setDepth(10);

    const quickTestT = this.add.text(GAME_WIDTH - 67, 40, "🛠️ 快速测试", {
      fontFamily: "'Microsoft YaHei', sans-serif",
      fontSize: "13px",
      fontStyle: "bold",
      color: "#ffffff",
    }).setOrigin(0.5).setDepth(11);

    const quickTestHit = this.add.rectangle(GAME_WIDTH - 67, 40, 106, 32, 0x000000, 0);
    quickTestHit.setInteractive({ useHandCursor: true }).setDepth(12);
    quickTestHit.on("pointerdown", () => {
      if (this.loading) return;
      this.loading = true;
      this.statusText.setText("正在快速生成人生并进入测试台…").setColor("#f4e6cc");
      this.cameras.main.resetFX();
      void (async () => {
        try {
          await this.actions.startNewGame({
            seed: `life-quick-${Date.now()}`,
            birthYear: 1978,
            name: "李建国",
            gender: "male",
            chosenItem: "pending_zhuazhou",
            interestBonus: "",
            attributeBonus: "",
          });
          this.scene.start("GameFlowScene");
        } catch (err) {
          console.error("快速测试启动失败:", err);
          this.loading = false;
        }
      })();
    });

    this.add.text(GAME_WIDTH / 2, 824, "v0.1.0 · 独立开发中", {
      fontFamily: "'Microsoft YaHei', sans-serif",
      fontSize: "10px",
      color: "#aaa59c",
    }).setOrigin(0.5);

    const motion = this.registry.get(MOTION_LEVEL_REGISTRY_KEY) ?? "full";
    if (motion === "full") {
      this.backgroundTween = this.tweens.add({
        targets: background,
        scaleX: coverScale * 1.065,
        scaleY: coverScale * 1.065,
        y: GAME_HEIGHT / 2 - 5,
        duration: 12_000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      });
    }
    if (motion !== "off") this.cameras.main.fadeIn(motion === "reduced" ? 180 : 420, 2, 5, 7);
  }

  getUiDiagnostics(): Record<string, unknown> {
    return {
      protocol: "game-main-menu-v2",
      canvasOnly: true,
      backgroundTexture: "scene.title",
      continueAvailable: this.actions.continueAvailable,
      primaryAction: this.actions.continueAvailable ? "continue" : "new",
      saveSummary: this.actions.saveSummary,
      buttons: [
        { id: "new", label: "新游戏", enabled: !this.loading, y: this.actions.continueAvailable ? 706 : 640 },
        { id: "continue", label: "继续游戏", enabled: this.actions.continueAvailable && !this.loading, y: this.actions.continueAvailable ? 640 : 706 },
      ],
      utilities: ["save", "settings", "about"],
      confirmOpen: this.confirmLayer != null,
      utilityOpen: this.utilityOpen,
      loading: this.loading,
      selectedAction: this.selectedAction,
    };
  }

  private createButton(y: number, label: string, enabled: boolean, appearance: "primary" | "secondary", onActivate: () => void): MenuButton {
    const width = 292;
    const height = 56;
    const background = this.add.graphics();
    if (appearance === "primary") {
      background.fillStyle(COLORS.warm, enabled ? 0.96 : 0.22).fillRoundedRect(-width / 2, -height / 2, width, height, 14);
      background.lineStyle(1, 0xffe3ae, enabled ? 0.72 : 0.18).strokeRoundedRect(-width / 2, -height / 2, width, height, 14);
    } else {
      background.fillStyle(COLORS.darkTeal, enabled ? 0.78 : 0.4).fillRoundedRect(-width / 2, -height / 2, width, height, 14);
      background.lineStyle(1, enabled ? COLORS.ink : COLORS.muted, enabled ? 0.72 : 0.28).strokeRoundedRect(-width / 2, -height / 2, width, height, 14);
    }
    const labelText = this.add.text(0, 0, label, {
      fontFamily: "'Microsoft YaHei', 'PingFang SC', sans-serif",
      fontSize: "19px",
      fontStyle: "bold",
      color: appearance === "primary" ? "#172428" : (enabled ? "#f8f1e4" : "#8c8b86"),
    }).setOrigin(0.5);
    const container = this.add.container(GAME_WIDTH / 2, y, [background, labelText]);
    const button = { container, enabled, width, height };

    if (enabled) {
      const padX = 16;
      const padY = 24;
      background.setInteractive(new Phaser.Geom.Rectangle(-width / 2 - padX, -height / 2 - padY, width + padX * 2, height + padY * 2), Phaser.Geom.Rectangle.Contains);
      background.input!.cursor = "pointer";
      background.on(Phaser.Input.Events.POINTER_DOWN, () => {
        if (this.loading || this.confirmLayer || this.utilityOpen) return;
        this.tweens.add({
          targets: container,
          scaleX: 0.96,
          scaleY: 0.96,
          duration: 75,
          yoyo: true,
          ease: "Quad.easeOut",
        });
        onActivate();
      });
    }

    return button;
  }

  private createUtilityButton(x: number, label: string, mode: UtilityMode): MenuButton {
    const width = 84;
    const height = 38;
    const background = this.add.graphics()
      .fillStyle(COLORS.darkTeal, 0.68).fillRoundedRect(-width / 2, -height / 2, width, height, 11)
      .lineStyle(1, COLORS.line, 0.6).strokeRoundedRect(-width / 2, -height / 2, width, height, 11);
    const labelText = this.add.text(0, 0, label, {
      fontFamily: "'Microsoft YaHei', sans-serif",
      fontSize: "13px",
      color: "#e9e1d4",
    }).setOrigin(0.5);
    const container = this.add.container(x, 774, [background, labelText]);
    const button = { container, enabled: true, width, height };

    const pad = 10;
    background.setInteractive(new Phaser.Geom.Rectangle(-width / 2 - pad, -height / 2 - pad, width + pad * 2, height + pad * 2), Phaser.Geom.Rectangle.Contains);
    background.input!.cursor = "pointer";
    background.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (this.loading || this.confirmLayer || this.utilityOpen) return;
      this.tweens.add({
        targets: container,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 75,
        yoyo: true,
        ease: "Quad.easeOut",
      });
      this.openUtility(mode);
    });

    return button;
  }

  private bindButton(button: MenuButton, onActivate: () => void): void {
    // Retained for backward compatibility
  }

  private setMenuInteractive(enabled: boolean): void {
    for (const button of [...this.buttons, ...this.utilityButtons]) {
      const bg = button.container.first as Phaser.GameObjects.Graphics | undefined;
      if (bg?.input) {
        bg.input.enabled = enabled && button.enabled && !this.utilityOpen;
      }
    }
  }

  private openUtility(mode: UtilityMode): void {
    if (this.loading || this.confirmLayer || this.utilityOpen) return;
    this.utilityOpen = true;
    this.setMenuInteractive(false);
    if (this.scene.isActive("MenuUtilityScene")) {
      (this.scene.get("MenuUtilityScene") as MenuUtilityScene).open(mode, this.restoreMenuAfterUtility);
    } else {
      this.scene.launch("MenuUtilityScene", { mode, onClose: this.restoreMenuAfterUtility });
    }
    this.scene.bringToTop("MenuUtilityScene");
  }

  private restoreMenuAfterUtility = (): void => {
    this.utilityOpen = false;
    if (!this.loading && !this.confirmLayer && this.scene.isActive("MainMenuScene")) {
      this.setMenuInteractive(true);
    }
  };

  private requestNewGame(): void {
    if (!this.actions.continueAvailable) {
      void this.enter("new");
      return;
    }
    this.showNewGameConfirmation();
  }

  private showNewGameConfirmation(): void {
    if (this.confirmLayer || this.loading) return;
    this.setMenuInteractive(false);
    const blocker = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.black, 0.78).setOrigin(0);
    blocker.setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT), Phaser.Geom.Rectangle.Contains);
    const panel = this.add.graphics()
      .fillStyle(0x10242a, 0.99).fillRoundedRect(28, 268, 334, 250, 18)
      .lineStyle(1, COLORS.warm, 0.58).strokeRoundedRect(28, 268, 334, 250, 18);
    const title = this.add.text(GAME_WIDTH / 2, 318, "开始新的人生？", {
      fontFamily: "'Microsoft YaHei', sans-serif", fontSize: "22px", fontStyle: "bold", color: "#f8f1e4",
    }).setOrigin(0.5);
    const description = this.add.text(GAME_WIDTH / 2, 377, "当前人生仍可继续。开始后，新的选择进度将逐步替换当前试玩存档。", {
      fontFamily: "'Microsoft YaHei', sans-serif", fontSize: "13px", color: "#c8cbc4", align: "center", lineSpacing: 7,
    }).setOrigin(0.5).setWordWrapWidth(272, true);
    const cancel = this.modalButton(106, 468, 126, "取消", false, () => this.closeConfirmation());
    const confirm = this.modalButton(284, 468, 126, "开始", true, () => {
      this.confirmLayer?.destroy(true);
      this.confirmLayer = null;
      void this.enter("new");
    });
    this.confirmLayer = this.add.container(0, 0, [blocker, panel, title, description, cancel, confirm]).setDepth(100);
  }

  private modalButton(x: number, y: number, width: number, label: string, primary: boolean, onActivate: () => void): Phaser.GameObjects.Container {
    const height = 48;
    const background = this.add.graphics()
      .fillStyle(primary ? COLORS.warm : COLORS.darkTeal, 0.96).fillRoundedRect(-width / 2, -height / 2, width, height, 12)
      .lineStyle(1, primary ? 0xffe3ae : COLORS.line, 0.75).strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
    const labelText = this.add.text(0, 0, label, {
      fontFamily: "'Microsoft YaHei', sans-serif", fontSize: "15px", fontStyle: "bold", color: primary ? "#172428" : "#f8f1e4",
    }).setOrigin(0.5);
    const container = this.add.container(x, y, [background, labelText]);

    const pad = 8;
    background.setInteractive(new Phaser.Geom.Rectangle(-width / 2 - pad, -height / 2 - pad, width + pad * 2, height + pad * 2), Phaser.Geom.Rectangle.Contains);
    background.input!.cursor = "pointer";
    background.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.tweens.add({
        targets: container,
        scaleX: 0.96,
        scaleY: 0.96,
        duration: 75,
        yoyo: true,
        ease: "Quad.easeOut",
      });
      onActivate();
    });
    return container;
  }

  private closeConfirmation(): void {
    this.confirmLayer?.destroy(true);
    this.confirmLayer = null;
    if (!this.loading && !this.confirmLayer && !this.utilityOpen) {
      this.setMenuInteractive(true);
    }
  }

  private async enter(action: "new" | "continue"): Promise<void> {
    if (this.loading || (action === "continue" && !this.actions.continueAvailable)) return;
    this.loading = true;
    this.selectedAction = action;
    this.setMenuInteractive(false);
    this.statusText.setText(action === "new" ? "正在开启新的人生…" : "正在读取上一次人生…").setColor("#f4e6cc");

    try {
      if (action === "new") {
        this.cameras.main.resetFX();
        this.scene.start("BirthScene", {
          actions: {
            onComplete: async (config: StartLifePayload) => {
              await this.actions.startNewGame(config);
            },
            onCancel: () => {},
          },
        });
        return;
      }

      await this.actions.continueGame();

      this.cameras.main.resetFX();
      let transitioned = false;
      const doTransition = () => {
        if (!transitioned) {
          transitioned = true;
          this.scene.start("GameFlowScene");
        }
      };

      this.cameras.main.fadeOut(260, 2, 5, 7, (_camera: Phaser.Cameras.Scene2D.Camera, progress: number) => {
        if (progress === 1) doTransition();
      });
      this.time.delayedCall(300, doTransition);
    } catch (error) {
      this.loading = false;
      this.selectedAction = null;
      this.statusText.setText(error instanceof Error ? error.message : "暂时无法进入，请重试。").setColor("#ffd0c7");
      this.setMenuInteractive(true);
    }
  }

  private shutdown(): void {
    this.backgroundTween?.remove();
    this.backgroundTween = null;
    this.confirmLayer?.destroy(true);
    this.confirmLayer = null;
    this.utilityOpen = false;
    [...this.buttons, ...this.utilityButtons].forEach(({ container }) => container.removeAllListeners());
  }
}
