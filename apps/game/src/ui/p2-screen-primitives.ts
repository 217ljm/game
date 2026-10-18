import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../contracts";
import { palette } from "./game-palette";
import { bindInteractiveFeedback, panel, text } from "./game-text";

export function p2Frame(scene: Phaser.Scene, title: string, subtitle: string, accent = palette.coral): Phaser.GameObjects.Container {
  return scene.add.container(0, 0, [
    scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, palette.ink),
    scene.add.rectangle(GAME_WIDTH / 2, 42, GAME_WIDTH, 84, 0x17232a),
    text(scene, 16, 25, title, 18, 0xfff5e9, true),
    text(scene, 16, 58, subtitle, 11, 0xb7c4c2),
    scene.add.rectangle(16, 88, 92, 3, accent).setOrigin(0, 0.5),
  ]);
}

export function p2TopMeta(scene: Phaser.Scene, snapshot: { calendarYear: number; age: number; quarter: number; identityLabel: string }): Phaser.GameObjects.Container {
  const year = scene.add.text(374, 25, `${snapshot.calendarYear} · ${snapshot.age}岁 · Q${snapshot.quarter}`, {
    fontFamily: "Arial, 'Microsoft YaHei', sans-serif",
    fontSize: "11px",
    color: "#b7c4c2",
  }).setOrigin(1, 0.5);
  const identity = scene.add.text(374, 58, snapshot.identityLabel.replace(`${snapshot.age}岁 · `, ""), {
    fontFamily: "Arial, 'Microsoft YaHei', sans-serif",
    fontSize: "10px",
    color: "#8fa7a5",
  }).setOrigin(1, 0.5);
  return scene.add.container(0, 0, [year, identity]);
}

export function p2Button(scene: Phaser.Scene, x: number, y: number, width: number, height: number, label: string, onPress: () => void, enabled = true): Phaser.GameObjects.Container {
  const fill = enabled ? palette.coral : 0x495458;
  const container = scene.add.container(x + width / 2, y + height / 2);

  const buttonBg = scene.add.graphics()
    .fillStyle(fill, 1)
    .fillRoundedRect(-width / 2, -height / 2, width, height, 12)
    .lineStyle(1.5, enabled ? 0xffd8a1 : palette.line, 0.9)
    .strokeRoundedRect(-width / 2, -height / 2, width, height, 12);

  const caption = text(scene, 0, 0, label, 15, enabled ? 0xffffff : 0xaebbb5, true).setOrigin(0.5);

  container.add([buttonBg, caption]);

  if (enabled) {
    buttonBg.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains
    );
    buttonBg.input!.cursor = "pointer";
    bindInteractiveFeedback(buttonBg, {
      pressScale: 0.96,
      onPress,
      onClick: onPress,
    });
  }

  return container;
}

export function p2Chip(scene: Phaser.Scene, x: number, y: number, label: string, color = 0x2b4248): Phaser.GameObjects.Container {
  const width = Math.max(46, label.length * 9 + 18);
  const background = panel(scene, x, y, width, 24, color, 8).setAlpha(0.96);
  const caption = text(scene, x + width / 2, y + 12, label, 10, 0xfff5e9, true).setOrigin(0.5);
  return scene.add.container(0, 0, [background, caption]);
}

export function p2TextBlock(scene: Phaser.Scene, x: number, y: number, width: number, value: string, size = 13, color = 0xfff5e9): Phaser.GameObjects.Text {
  return text(scene, x, y, value, size, color).setWordWrapWidth(width, true).setLineSpacing(4);
}

export function p2Cover(scene: Phaser.Scene, key: string, x: number, y: number, width: number, height: number, alpha = 1): Phaser.GameObjects.Image | null {
  if (!scene.textures.exists(key)) return null;
  const image = scene.add.image(x + width / 2, y + height / 2, key).setOrigin(0.5).setAlpha(alpha);
  const source = scene.textures.get(key).getSourceImage() as { width: number; height: number };
  const targetRatio = width / height;
  const sourceRatio = source.width / source.height;
  if (sourceRatio > targetRatio) {
    const cropWidth = source.height * targetRatio;
    image.setCrop((source.width - cropWidth) / 2, 0, cropWidth, source.height);
    image.setScale(width / cropWidth, height / source.height);
  } else {
    const cropHeight = source.width / targetRatio;
    image.setCrop(0, (source.height - cropHeight) / 2, source.width, cropHeight);
    image.setScale(width / source.width, height / cropHeight);
  }
  return image;
}

export function p2FormatPercent(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

export function p2Compact(value: string, max = 22): string {
  const chars = Array.from(value ?? "");
  return chars.length <= max ? value : `${chars.slice(0, max).join("")}…`;
}
