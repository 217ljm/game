const ASSETS = {
  base: "/public/assets/life-stage/primary-1984-base.webp",
  player: "/public/assets/life-stage/player-1984.webp",
  study: "/public/assets/life-stage/action-study.webp",
  play: "/public/assets/life-stage/action-play.webp",
  family: "/public/assets/life-stage/action-family.webp",
  growth: "/public/assets/game-shell/growth-room.webp",
  relations: "/public/assets/game-shell/relations-courtyard.webp",
  journey: "/public/assets/game-shell/timeline-road.webp",
  memory: "/public/assets/game-shell/memory-room.webp",
  characterAtlas: "/public/assets/life-stage/character-age-atlas-v1.webp",
};

const SCENE_FOCUS = {
  base: { x: 0.54, y: 0.48 },
  study: { x: 0.43, y: 0.5 },
  play: { x: 0.5, y: 0.54 },
  family: { x: 0.48, y: 0.5 },
  growth: { x: 0.5, y: 0.48 },
  relations: { x: 0.5, y: 0.52 },
  journey: { x: 0.52, y: 0.5 },
  memory: { x: 0.54, y: 0.49 },
};

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`无法载入人生场景素材：${url}`));
    image.src = url;
  });
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function easeOutCubic(value) {
  return 1 - (1 - value) ** 3;
}

function drawCover(context, image, width, height, focus, scale = 1, alpha = 1) {
  if (!image?.naturalWidth || !image?.naturalHeight || width <= 0 || height <= 0) return;
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const frameRatio = width / height;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;
  if (imageRatio > frameRatio) sourceWidth = image.naturalHeight * frameRatio;
  else sourceHeight = image.naturalWidth / frameRatio;
  sourceWidth /= scale;
  sourceHeight /= scale;
  const maxX = image.naturalWidth - sourceWidth;
  const maxY = image.naturalHeight - sourceHeight;
  const sourceX = clamp(focus.x) * maxX;
  const sourceY = clamp(focus.y) * maxY;
  context.save();
  context.globalAlpha = alpha;
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
  context.restore();
}

export class LifeStageRenderer {
  constructor(canvas, { motionMode = null } = {}) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d", { alpha: false, desynchronized: true });
    this.images = new Map();
    this.loadingImages = new Map();
    this.currentScene = "base";
    this.previousScene = null;
    this.transitionStartedAt = 0;
    this.transitionDuration = 520;
    this.commitStartedAt = 0;
    this.commitDuration = 680;
    this.active = false;
    this.frame = 0;
    this.startedAt = performance.now();
    this.systemReducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.motionMode = motionMode ?? (this.systemReducedMotion ? "reduced" : "full");
    this.reducedMotion = this.motionMode !== "full";
    this.motionDisabled = this.motionMode === "off";
    this.visualContext = null;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.visibilityObserver = new IntersectionObserver((entries) => {
      this.active = entries.some((entry) => entry.isIntersecting) && !canvas.hidden;
      if (this.active) this.requestFrame();
    }, { rootMargin: "120px" });
    this.visibilityObserver.observe(canvas);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && this.active) this.requestFrame();
    });
  }

  async preload() {
    const initialKeys = ["base", "characterAtlas"];
    const entries = await Promise.all(initialKeys.map(async (key) => [key, await this.ensureAsset(key)]));
    for (const [key, image] of entries) this.images.set(key, image);
    this.resize();
    this.draw(performance.now());
  }

  async ensureAsset(key) {
    if (this.images.has(key)) return this.images.get(key);
    if (!ASSETS[key]) return null;
    if (!this.loadingImages.has(key)) {
      this.loadingImages.set(key, loadImage(ASSETS[key]).then((image) => {
        this.images.set(key, image);
        this.loadingImages.delete(key);
        this.draw(performance.now());
        return image;
      }));
    }
    return this.loadingImages.get(key);
  }

  show() {
    this.canvas.hidden = false;
    this.active = true;
    this.resize();
    this.requestFrame();
  }

  setMotionMode(mode) {
    this.motionMode = ["full", "reduced", "off"].includes(mode) ? mode : "full";
    this.reducedMotion = this.motionMode !== "full";
    this.motionDisabled = this.motionMode === "off";
    if (this.motionDisabled && this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.draw(performance.now());
    if (!this.motionDisabled && this.active) this.requestFrame();
  }

  setVisualContext(visualContext) {
    this.visualContext = visualContext ?? null;
    this.draw(performance.now());
  }

  hide() {
    this.active = false;
    this.canvas.hidden = true;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  setScene(scene) {
    const nextScene = ASSETS[scene] ? scene : "base";
    void this.ensureAsset(nextScene);
    if (nextScene === this.currentScene) return;
    this.previousScene = this.currentScene;
    this.currentScene = nextScene;
    this.transitionStartedAt = performance.now();
    this.requestFrame();
  }

  playCommit() {
    this.commitStartedAt = performance.now();
    this.requestFrame();
    const duration = this.motionDisabled ? 0 : (this.reducedMotion ? Math.round(this.commitDuration * 0.6) : this.commitDuration);
    return new Promise((resolve) => setTimeout(resolve, duration));
  }

  resize() {
    const width = Math.round(this.canvas.clientWidth);
    const height = Math.round(this.canvas.clientHeight);
    if (!width || !height) return;
    const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    const outputWidth = Math.round(width * pixelRatio);
    const outputHeight = Math.round(height * pixelRatio);
    if (this.canvas.width === outputWidth && this.canvas.height === outputHeight) return;
    this.canvas.width = outputWidth;
    this.canvas.height = outputHeight;
    this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  requestFrame() {
    if (!this.active || this.frame) return;
    this.frame = requestAnimationFrame((time) => {
      this.frame = 0;
      this.draw(time);
      if (this.active && !this.motionDisabled) this.requestFrame();
    });
  }

  draw(time) {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (!width || !height || this.images.size === 0) return;
    const elapsed = time - this.startedAt;
    const transition = this.reducedMotion || !this.previousScene
      ? 1
      : clamp((time - this.transitionStartedAt) / this.transitionDuration);
    const easedTransition = easeOutCubic(transition);
    const committing = this.commitStartedAt > 0;
    const commit = committing ? clamp((time - this.commitStartedAt) / this.commitDuration) : 0;
    const driftX = this.reducedMotion ? 0 : Math.sin(elapsed / 6200) * 0.012;
    const driftY = this.reducedMotion ? 0 : Math.cos(elapsed / 7400) * 0.008;
    const sceneZoom = 1.04 + (this.reducedMotion ? 0 : Math.sin(elapsed / 8400) * 0.006) + commit * 0.035;
    const currentFocus = SCENE_FOCUS[this.currentScene] ?? SCENE_FOCUS.base;
    const animatedFocus = { x: clamp(currentFocus.x + driftX), y: clamp(currentFocus.y + driftY) };

    this.context.clearRect(0, 0, width, height);
    if (this.previousScene && transition < 1) {
      drawCover(
        this.context,
        this.images.get(this.previousScene),
        width,
        height,
        SCENE_FOCUS[this.previousScene] ?? SCENE_FOCUS.base,
        sceneZoom,
        1,
      );
    }
    const currentImage = this.images.get(this.currentScene) ?? this.images.get("base");
    drawCover(
      this.context,
      currentImage,
      width,
      height,
      animatedFocus,
      sceneZoom,
      easedTransition,
    );

    const atlas = this.images.get("characterAtlas");
    const cell = this.visualContext?.cell;
    if (atlas && cell) {
      const sourceWidth = atlas.naturalWidth / 4;
      const sourceHeight = atlas.naturalHeight / 2;
      const portraitHeight = height * (this.visualContext.ageBand?.id === "child" ? 0.62 : 0.68);
      const portraitWidth = portraitHeight * (sourceWidth / sourceHeight);
      const breathing = this.reducedMotion ? 0 : Math.sin(elapsed / 880) * 0.004;
      const x = width * 0.045;
      const y = height * 0.17 - portraitHeight * breathing;
      const radius = Math.max(14, portraitWidth * 0.12);
      this.context.save();
      this.context.globalAlpha = easedTransition;
      this.context.beginPath();
      this.context.roundRect(x, y, portraitWidth, portraitHeight, radius);
      this.context.clip();
      this.context.drawImage(
        atlas,
        cell.column * sourceWidth,
        cell.row * sourceHeight,
        sourceWidth,
        sourceHeight,
        x,
        y,
        portraitWidth,
        portraitHeight,
      );
      this.context.restore();
      this.context.save();
      this.context.strokeStyle = "rgba(255,255,255,.58)";
      this.context.lineWidth = 1;
      this.context.beginPath();
      this.context.roundRect(x, y, portraitWidth, portraitHeight, radius);
      this.context.stroke();
      this.context.restore();
    }

    if (transition >= 1) this.previousScene = null;
    if (committing && commit >= 1) this.commitStartedAt = 0;
  }
}

export const lifeStageAssetUrls = Object.freeze({ ...ASSETS });
