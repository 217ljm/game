import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, type GameRuntimePort } from "../contracts";
import { BootScene } from "../screens/boot-scene";
import { BirthScene } from "../screens/birth-scene";
import { AgeEntryScene } from "../screens/age-entry-scene";
import { EventScene } from "../screens/event-scene";
import { GameFlowScene } from "../screens/game-flow-scene";
import { LifeScene } from "../screens/life-scene";
import { MainMenuScene, type MainMenuActions } from "../screens/main-menu-scene";
import { MenuUtilityScene, type MenuUtilityActions } from "../screens/menu-utility-scene";
import { PreloadScene } from "../screens/preload-scene";
import { QuarterExecutionScene } from "../screens/quarter-execution-scene";
import { QuarterResultScene } from "../screens/quarter-result-scene";
import { RecordsScene } from "../screens/records-scene";
import { StartupScene } from "../screens/startup-scene";
import { YearReviewScene } from "../screens/year-review-scene";

export function createGameRuntime({
  parent,
  port,
  menu,
  utilities,
}: {
  parent: HTMLElement;
  port: GameRuntimePort;
  menu: MainMenuActions;
  utilities: MenuUtilityActions;
}): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#f7efe3",
    resolution: typeof window !== "undefined" ? Math.max(window.devicePixelRatio || 1, 2) : 2,
    render: { antialias: true, pixelArt: false, roundPixels: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, autoDensity: true },
    scene: [
      new BootScene(),
      new PreloadScene(),
      new StartupScene(),
      new MainMenuScene(menu),
      new MenuUtilityScene(utilities),
      new BirthScene(),
      new GameFlowScene(port),
      new LifeScene(port),
      new EventScene(port),
      new QuarterExecutionScene(port),
      new QuarterResultScene(port),
      new YearReviewScene(port),
      new AgeEntryScene(port),
      new RecordsScene(port),
    ],
    banner: false,
  });
}
