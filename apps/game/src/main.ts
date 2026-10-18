import "./game-shell.css";
import Phaser from "phaser";

// 全局高清超采样补丁：拦截 TextStyle，确保全游戏所有 Text 对象均以原生高分屏精度（最少 2x）光栅化
const targetResolution = typeof window !== "undefined" ? Math.max(window.devicePixelRatio || 2, 2) : 2;
if (typeof Phaser !== "undefined" && Phaser.GameObjects && Phaser.GameObjects.TextStyle) {
  const styleProto = Phaser.GameObjects.TextStyle.prototype as unknown as { updateText: (this: Phaser.GameObjects.TextStyle, ...args: unknown[]) => unknown; resolution: number };
  const originalUpdateText = styleProto.updateText;
  styleProto.updateText = function (this: Phaser.GameObjects.TextStyle, ...args: unknown[]) {
    if (!this.resolution || this.resolution < targetResolution) {
      this.resolution = targetResolution;
    }
    return originalUpdateText.apply(this, args);
  };
}

import { createGameRuntime } from "./runtime/create-game-runtime";
import { createGatewayRuntimePort } from "./runtime/create-gateway-runtime-port";
import { DeferredGameRuntimePort } from "./runtime/deferred-game-runtime-port";
import {
  readDevelopmentSessionCandidate,
  readPresentationCheckpoint,
  readPresentationPreferences,
  readV5SessionCandidates,
  summarizeSessionForMenu,
  writeDevelopmentSession,
  writePresentationCheckpoint,
  writePresentationPreferences,
  writeV5Session,
} from "./runtime/v5-browser-save";
import type { GameRuntimePort, RuntimeCommand } from "./contracts";
import { SCENE_FOR_SCREEN } from "./screens/game-flow-scene";
import { HAPTIC_ENABLED_REGISTRY_KEY, MOTION_LEVEL_REGISTRY_KEY, SOUND_ENABLED_REGISTRY_KEY } from "./screens/boot-scene";
import type { StartLifePayload } from "./screens/main-menu-scene";

const parent = document.querySelector<HTMLElement>("#game-root");
if (!parent) {
  throw new Error("正式游戏入口缺少 #game-root。");
}

const savedSessions = readV5SessionCandidates();
const presentationCheckpoint = readPresentationCheckpoint();
const developmentSession = import.meta.env.DEV ? readDevelopmentSessionCandidate() : null;
const sessionCandidates = [
  ...savedSessions.map((session) => ({ session, write: writeV5Session })),
  ...(developmentSession == null ? [] : [{ session: developmentSession, write: writeDevelopmentSession }]),
];
const saveSummary = sessionCandidates.map(({ session }) => summarizeSessionForMenu(session)).find((summary) => summary != null) ?? null;
let menuSettings = readPresentationPreferences(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
const port = new DeferredGameRuntimePort();

let game: ReturnType<typeof createGameRuntime>;
game = createGameRuntime({
  parent,
  port,
  menu: {
    continueAvailable: sessionCandidates.length > 0,
    saveSummary,
    startNewGame: async (config?: StartLifePayload) => {
      const development = import.meta.env.DEV;
      port.attach(await createGatewayRuntimePort({
        fixture: config ? undefined : (development ? "age6-q1" : undefined),
        lifeConfig: config ? {
          seed: config.seed,
          birthYear: config.birthYear,
          name: config.name,
          gender: config.gender,
          chosenItem: config.chosenItem,
          interestBonus: config.interestBonus,
          attributeBonus: config.attributeBonus,
        } : undefined,
        presentationCheckpoint,
        onSessionChange: development ? writeDevelopmentSession : writeV5Session,
        onPresentationCheckpointChange: writePresentationCheckpoint,
      }));
    },
    continueGame: async () => {
      for (const candidate of sessionCandidates) {
        try {
          port.attach(await createGatewayRuntimePort({
            session: candidate.session,
            presentationCheckpoint,
            onSessionChange: candidate.write,
            onPresentationCheckpointChange: writePresentationCheckpoint,
          }));
          return;
        } catch {
          // Try the next recoverable candidate without overwriting stored bytes.
        }
      }
      throw new Error("存档无法恢复，请选择新游戏。");
    },
  },
  utilities: {
    getSettings: () => ({ ...menuSettings }),
    updateSettings: (next) => {
      menuSettings = { ...next };
      writePresentationPreferences(menuSettings);
      game.registry.set(MOTION_LEVEL_REGISTRY_KEY, menuSettings.motionMode);
      game.registry.set(SOUND_ENABLED_REGISTRY_KEY, menuSettings.soundEnabled);
      game.registry.set(HAPTIC_ENABLED_REGISTRY_KEY, menuSettings.hapticEnabled);
    },
    getSaveSummary: () => saveSummary,
  },
});

Object.defineProperty(window, "__PEOPLE_LIFE_GAME__", {
  configurable: true,
  value: {
    getGame: () => game,
    getSnapshot: () => port.getSnapshot(),
    dispatch: (command: RuntimeCommand) => port.dispatch(command),
    getUiDiagnostics: () => {
      if (game.scene.isActive("StartupScene")) {
        const startup = game.scene.getScene("StartupScene") as { getUiDiagnostics?: () => Record<string, unknown> } | null;
        return startup?.getUiDiagnostics?.() ?? null;
      }
      if (game.scene.isActive("BirthScene")) {
        const birth = game.scene.getScene("BirthScene") as { getUiDiagnostics?: () => Record<string, unknown> } | null;
        return birth?.getUiDiagnostics?.() ?? null;
      }
      if (game.scene.isActive("MenuUtilityScene")) {
        const utility = game.scene.getScene("MenuUtilityScene") as { isOpen?: () => boolean; getUiDiagnostics?: () => Record<string, unknown> } | null;
        if (utility?.isOpen?.() === false) {
          const menu = game.scene.getScene("MainMenuScene") as { getUiDiagnostics?: () => Record<string, unknown> } | null;
          return menu?.getUiDiagnostics?.() ?? null;
        }
        return utility?.getUiDiagnostics?.() ?? null;
      }
      if (game.scene.isActive("MainMenuScene")) {
        const menu = game.scene.getScene("MainMenuScene") as { getUiDiagnostics?: () => Record<string, unknown> } | null;
        return menu?.getUiDiagnostics?.() ?? null;
      }
      if (!port.isAttached()) return { protocol: "game-shell-transition-v1" };
      const sceneKey = SCENE_FOR_SCREEN[port.getSnapshot().screen];
      const scene = game.scene.getScene(sceneKey) as { getUiDiagnostics?: () => Record<string, unknown> } | null;
      return scene?.getUiDiagnostics?.() ?? null;
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    port.destroy();
    game.destroy(true);
  });
}
