/**
 * 《游戏项目全面重构与后续开发规范文档 (v2.0)》
 * 资产与程序化美术管线核心组件：AssetGenerator
 *
 * 功能定位：
 * 生产级程序化纹理生成器。当 Phaser 引擎处于 Preload/Boot 阶段时，
 * 若外部预制图片资源尚未就绪或请求失败，利用 HTML5 Canvas 2D API
 * 在运行时纯数学动态光栅化生成高精度、工业级专业游戏材质，并统一注册到
 * Phaser 的 TextureManager 中，确保游戏绝不出现白块或黑紫格子！
 *
 * 支持贴图类型：
 * 1. backgrounds:
 *    - bg_dungeon_arena (1920x1080 暗黑地牢石板竞技场，带深色石砖纹路、微光符文阵、火把暖光晕染和边缘暗角)
 * 2. characters:
 *    - hero_warrior (512x512 透明通道战士主角，银灰铠甲、手持发光剑刃、动态战斗姿势)
 * 3. enemies:
 *    - enemy_skeleton (512x512 透明通道骷髅战士，红眼、骨质身躯、持锈刀)
 *    - boss_dragon_knight (512x512 透明通道暗黑龙骑士 Boss，黑色龙角、重装大剑、暗红魔焰光环)
 * 4. icons:
 *    - icon_slash (128x128 斩击技能图标)
 *    - icon_fireball (128x128 烈火技能图标)
 *    - icon_shield (128x128 护盾技能图标)
 *    - icon_dash (128x128 疾冲技能图标)
 *    - icon_thunder (128x128 落雷技能图标)
 * 5. ui:
 *    - panel_frame (256x256 九宫格暗金边框黑晶底板)
 *    - card_frame (280x400 3选1强化卡牌底框)
 *    - hp_bar_bg (360x36 深黑血条凹槽)
 *    - hp_bar_fill (360x36 红到橙高光渐变血条填充)
 * 6. vfx:
 *    - vfx_spark (64x64 高亮受击火花)
 *    - vfx_slash_arc (256x128 弧形发光刀光)
 *    - vfx_fire_particle (64x64 火焰余烬)
 */

/**
 * 材质键名常量清单
 */
export const ASSET_KEYS = Object.freeze({
  // 背景大图
  BG_DUNGEON_ARENA: 'bg_dungeon_arena',

  // 角色与敌人
  HERO_WARRIOR: 'hero_warrior',
  ENEMY_SKELETON: 'enemy_skeleton',
  BOSS_DRAGON_KNIGHT: 'boss_dragon_knight',

  // 技能图标
  ICON_SLASH: 'icon_slash',
  ICON_FIREBALL: 'icon_fireball',
  ICON_SHIELD: 'icon_shield',
  ICON_DASH: 'icon_dash',
  ICON_THUNDER: 'icon_thunder',

  // 界面组件
  PANEL_FRAME: 'panel_frame',
  CARD_FRAME: 'card_frame',
  HP_BAR_BG: 'hp_bar_bg',
  HP_BAR_FILL: 'hp_bar_fill',

  // 特效粒子
  VFX_SPARK: 'vfx_spark',
  VFX_SLASH_ARC: 'vfx_slash_arc',
  VFX_FIRE_PARTICLE: 'vfx_fire_particle',
});

/**
 * 安全创建离屏 Canvas
 * 具备 Node.js / SSR 与浏览器全环境兼容兜底
 *
 * @param {number} width 宽度
 * @param {number} height 高度
 * @returns {HTMLCanvasElement|object} Canvas 实例或模拟对象
 */
function createSafeCanvas(width, height) {
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(width));
    canvas.height = Math.max(1, Math.floor(height));
    return canvas;
  }

  // Node.js 或测试环境静默降级，确保引入时不抛出 ReferenceError
  return {
    width,
    height,
    getContext: () => ({
      fillRect: () => {},
      clearRect: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      stroke: () => {},
      fill: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
    }),
    toDataURL: () => 'data:image/png;base64,',
  };
}

/**
 * 辅助绘制：圆角矩形
 */
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * 辅助绘制：金属高质感描边
 */
function strokeMetallicBorder(ctx, x, y, width, height, radius, outerColor, innerColor, lineWidth = 2) {
  ctx.save();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = outerColor;
  drawRoundedRect(ctx, x, y, width, height, radius);
  ctx.stroke();

  ctx.lineWidth = Math.max(1, lineWidth - 1);
  ctx.strokeStyle = innerColor;
  drawRoundedRect(ctx, x + 1, y + 1, width - 2, height - 2, Math.max(0, radius - 1));
  ctx.stroke();
  ctx.restore();
}

/**
 * 辅助绘制：辉光效果开启
 */
function setGlow(ctx, color, blur = 15) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

/**
 * 辅助绘制：清除辉光效果
 */
function clearGlow(ctx) {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

/**
 * 程序化纹理生成核心类
 */
export class AssetGenerator {
  /**
   * 暴露所有纹理常量
   */
  static get KEYS() {
    return ASSET_KEYS;
  }

  /**
   * 确保 Phaser 场景具备全部必需纹理。
   * 如果外部图片已成功加载，则自动保留；若尚未就绪，则运行时无缝动态补齐！
   *
   * @param {Phaser.Scene} scene Phaser 场景实例
   * @returns {{ success: boolean, count: number, generatedKeys: string[], skippedKeys: string[] }} 执行统计
   */
  static generateAll(scene) {
    if (!scene || !scene.textures) {
      console.warn('[AssetGenerator] 未传入合法的 Phaser.Scene 实例，跳过自动注册');
      return { success: false, count: 0, generatedKeys: [], skippedKeys: [] };
    }

    const generatedKeys = [];
    const skippedKeys = [];

    for (const key of Object.values(ASSET_KEYS)) {
      if (scene.textures.exists(key)) {
        skippedKeys.push(key);
      } else {
        const canvas = this.createCanvasTexture(key);
        if (canvas) {
          scene.textures.addCanvas(key, canvas);
          generatedKeys.push(key);
        }
      }
    }

    // 为玩家提供 player 别名双向支持
    if (!scene.textures.exists('player')) {
      const heroCanvas = this.createCanvasTexture(ASSET_KEYS.HERO_WARRIOR);
      if (heroCanvas) {
        scene.textures.addCanvas('player', heroCanvas);
      }
    }

    console.info(
      `[AssetGenerator] 贴图兜底管线已就绪：生成 ${generatedKeys.length} 个程序化贴图，保留 ${skippedKeys.length} 个现有贴图。`
    );

    return {
      success: true,
      count: generatedKeys.length,
      generatedKeys,
      skippedKeys,
    };
  }

  /**
   * 确保单一指定纹理已注入 Phaser 场景
   *
   * @param {Phaser.Scene} scene Phaser 场景实例
   * @param {string} key 材质键名
   * @returns {boolean} 是否可用
   */
  static ensureTexture(scene, key) {
    if (!scene || !scene.textures) return false;
    if (scene.textures.exists(key)) return true;

    const canvas = this.createCanvasTexture(key);
    if (canvas) {
      scene.textures.addCanvas(key, canvas);
      return true;
    }
    return false;
  }

  /**
   * 独立创建单一纹理的 HTMLCanvasElement
   *
   * @param {string} key 材质键名
   * @returns {HTMLCanvasElement|null} 渲染完成的 Canvas 实例
   */
  static createCanvasTexture(key) {
    const generator = this.GENERATORS[key];
    if (typeof generator !== 'function') {
      console.warn(`[AssetGenerator] 未找到纹理键名 "${key}" 对应的生成器`);
      return null;
    }
    return generator.call(this);
  }

  // =========================================================================
  // 1. 背景材质生成器：暗黑地牢石板竞技场 (1920x1080)
  // =========================================================================
  static generateDungeonArenaBg() {
    const width = 1920;
    const height = 1080;
    const canvas = createSafeCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // A. 基础暗黑深渊渐变底色
    const baseGradient = ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, width * 0.7);
    baseGradient.addColorStop(0, '#151c27'); // 中心深青灰石板光感
    baseGradient.addColorStop(0.45, '#0e131c'); // 中层暗青石色
    baseGradient.addColorStop(0.8, '#080b11'); // 边缘近深黑
    baseGradient.addColorStop(1, '#030406'); // 视口极边幽暗
    ctx.fillStyle = baseGradient;
    ctx.fillRect(0, 0, width, height);

    // B. 地牢石板错位网格排布 (Brick Grid)
    const brickW = 120;
    const brickH = 60;
    ctx.save();
    for (let y = 0; y < height; y += brickH) {
      const row = Math.floor(y / brickH);
      const offsetX = (row % 2 === 0) ? 0 : brickW / 2;
      for (let x = -brickW; x < width + brickW; x += brickW) {
        const brickX = x + offsetX;
        // 伪随机明暗噪波计算，保持确定性
        const seed = Math.sin(row * 13.5 + (brickX / brickW) * 7.1) * 10000;
        const randVal = seed - Math.floor(seed);
        const luma = 14 + Math.floor(randVal * 9); // 亮度 14~23
        const blueTint = 22 + Math.floor(randVal * 6);

        // 砖块底色
        ctx.fillStyle = `rgb(${luma}, ${luma + 2}, ${blueTint})`;
        ctx.fillRect(brickX + 2, y + 2, brickW - 4, brickH - 4);

        // 砖块顶部和左侧微弱受光倒角高光
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.03 + randVal * 0.04})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(brickX + 2, y + brickH - 2);
        ctx.lineTo(brickX + 2, y + 2);
        ctx.lineTo(brickX + brickW - 2, y + 2);
        ctx.stroke();

        // 砖缝凹槽深黑阴影
        ctx.strokeStyle = 'rgba(2, 4, 8, 0.85)';
        ctx.lineWidth = 2;
        ctx.strokeRect(brickX, y, brickW, brickH);

        // 偶发性石板自然磨损与龟裂纹理
        if (randVal > 0.65) {
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          const startX = brickX + 20 + randVal * 60;
          const startY = y + 10 + randVal * 30;
          ctx.moveTo(startX, startY);
          ctx.lineTo(startX + 18, startY + 12);
          ctx.lineTo(startX + 28, startY + 28);
          ctx.stroke();
        }
      }
    }
    ctx.restore();

    // C. 竞技场中央微光符文魔法阵 (Magic Rune Circle)
    ctx.save();
    const centerX = width / 2;
    const centerY = height / 2;

    // 1. 最外圈符文环带与刻度
    setGlow(ctx, '#00f0ff', 24);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.75)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 380, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 396, 0, Math.PI * 2);
    ctx.stroke();

    // 外圈环带刻度与符文节点
    const tickCount = 36;
    for (let i = 0; i < tickCount; i++) {
      const angle = (i * Math.PI * 2) / tickCount;
      const isMajor = i % 4 === 0;
      const rInner = isMajor ? 368 : 374;
      const rOuter = 388;
      ctx.strokeStyle = isMajor ? '#00f0ff' : 'rgba(0, 240, 255, 0.55)';
      ctx.lineWidth = isMajor ? 2.5 : 1.2;
      ctx.beginPath();
      ctx.moveTo(centerX + Math.cos(angle) * rInner, centerY + Math.sin(angle) * rInner);
      ctx.lineTo(centerX + Math.cos(angle) * rOuter, centerY + Math.sin(angle) * rOuter);
      ctx.stroke();

      if (isMajor) {
        // 大节点上绘制微型发光符文方块
        ctx.fillStyle = '#bbf7ff';
        ctx.fillRect(
          centerX + Math.cos(angle) * 380 - 3,
          centerY + Math.sin(angle) * 380 - 3,
          6,
          6
        );
      }
    }

    // 2. 双重八角星芒阵线 (Octagram Star)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
    ctx.lineWidth = 2;
    for (let star = 0; star < 2; star++) {
      const offsetAngle = (star * Math.PI) / 4;
      ctx.beginPath();
      for (let i = 0; i <= 4; i++) {
        const a = offsetAngle + (i * Math.PI) / 2;
        const px = centerX + Math.cos(a) * 320;
        const py = centerY + Math.sin(a) * 320;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // 3. 中层同心符文同心圆与四象限指针
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 210, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, 150, 0, Math.PI * 2);
    ctx.stroke();

    // 四向圣堂符文十字
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX - 180, centerY);
    ctx.lineTo(centerX + 180, centerY);
    ctx.moveTo(centerX, centerY - 180);
    ctx.lineTo(centerX, centerY + 180);
    ctx.stroke();

    // 核心微光能量核心
    clearGlow(ctx);
    const coreGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 120);
    coreGrad.addColorStop(0, 'rgba(0, 240, 255, 0.35)');
    coreGrad.addColorStop(0.5, 'rgba(0, 180, 240, 0.12)');
    coreGrad.addColorStop(1, 'rgba(0, 100, 200, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // D. 边缘火把暖光晕染 (Torch Fire Light Sources)
    const torches = [
      { x: 180, y: 180, r: 360 },
      { x: width - 180, y: 180, r: 360 },
      { x: 120, y: height / 2, r: 400 },
      { x: width - 120, y: height / 2, r: 400 },
      { x: 260, y: height - 160, r: 380 },
      { x: width - 260, y: height - 160, r: 380 },
    ];

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const torch of torches) {
      // 1. 暖橙光晕漫反射
      const torchGrad = ctx.createRadialGradient(torch.x, torch.y, 10, torch.x, torch.y, torch.r);
      torchGrad.addColorStop(0, 'rgba(255, 230, 130, 0.65)');
      torchGrad.addColorStop(0.2, 'rgba(255, 140, 20, 0.35)');
      torchGrad.addColorStop(0.5, 'rgba(230, 70, 0, 0.15)');
      torchGrad.addColorStop(1, 'rgba(180, 40, 0, 0)');
      ctx.fillStyle = torchGrad;
      ctx.beginPath();
      ctx.arc(torch.x, torch.y, torch.r, 0, Math.PI * 2);
      ctx.fill();

      // 2. 金属火盆支架与跳动烈火核心
      clearGlow(ctx);
      ctx.globalCompositeOperation = 'source-over';
      // 支架底座
      ctx.fillStyle = '#1e1c19';
      ctx.fillRect(torch.x - 14, torch.y + 4, 28, 12);
      ctx.fillStyle = '#3a342b';
      ctx.fillRect(torch.x - 18, torch.y - 2, 36, 6);

      // 火焰核心
      setGlow(ctx, '#ffaa00', 16);
      ctx.fillStyle = '#fff4cc';
      ctx.beginPath();
      ctx.moveTo(torch.x, torch.y - 28);
      ctx.quadraticCurveTo(torch.x + 14, torch.y - 12, torch.x + 8, torch.y - 2);
      ctx.lineTo(torch.x - 8, torch.y - 2);
      ctx.quadraticCurveTo(torch.x - 14, torch.y - 12, torch.x, torch.y - 28);
      ctx.fill();
      clearGlow(ctx);
      ctx.globalCompositeOperation = 'screen';
    }
    ctx.restore();

    // E. 全屏重度暗角压制 (Heavy Dark Dungeon Vignette)
    ctx.save();
    const vignette = ctx.createRadialGradient(width / 2, height / 2, width * 0.28, width / 2, height / 2, width * 0.68);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.65, 'rgba(2, 4, 8, 0.45)');
    vignette.addColorStop(1, 'rgba(1, 2, 4, 0.88)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    return canvas;
  }

  // =========================================================================
  // 2. 角色材质：战士主角 hero_warrior (512x512, 透明通道)
  // =========================================================================
  static generateHeroWarrior() {
    const size = 512;
    const canvas = createSafeCanvas(size, size);
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.save();
    // A. 红色飘逸战袍披风 (流线后拂)
    const capeGrad = ctx.createLinearGradient(160, 200, 80, 440);
    capeGrad.addColorStop(0, '#e11d48');
    capeGrad.addColorStop(0.5, '#be123c');
    capeGrad.addColorStop(1, '#881337');
    ctx.fillStyle = capeGrad;
    ctx.beginPath();
    ctx.moveTo(220, 200);
    ctx.bezierCurveTo(150, 220, 90, 310, 80, 450);
    ctx.bezierCurveTo(120, 440, 160, 420, 210, 440);
    ctx.bezierCurveTo(190, 350, 230, 280, 270, 230);
    ctx.closePath();
    ctx.fill();
    // 披风金线描边
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // B. 双腿重装板甲护胫与铁靴
    // 左腿 (后侧)
    const legGradDark = ctx.createLinearGradient(180, 340, 230, 470);
    legGradDark.addColorStop(0, '#475569');
    legGradDark.addColorStop(1, '#1e293b');
    ctx.fillStyle = legGradDark;
    ctx.beginPath();
    ctx.moveTo(200, 340);
    ctx.lineTo(230, 340);
    ctx.lineTo(215, 470);
    ctx.lineTo(175, 470);
    ctx.closePath();
    ctx.fill();

    // 右腿 (前侧前弓步)
    const legGradBright = ctx.createLinearGradient(250, 340, 320, 480);
    legGradBright.addColorStop(0, '#94a3b8');
    legGradBright.addColorStop(0.5, '#64748b');
    legGradBright.addColorStop(1, '#334155');
    ctx.fillStyle = legGradBright;
    ctx.beginPath();
    ctx.moveTo(250, 340);
    ctx.lineTo(300, 340);
    ctx.lineTo(325, 480);
    ctx.lineTo(265, 480);
    ctx.closePath();
    ctx.fill();
    // 铁靴膝盖黄金护膝装甲
    ctx.fillStyle = '#eab308';
    ctx.fillRect(265, 380, 35, 24);

    // C. 躯干：银灰胸甲与皮甲战裙
    // 皮革战裙
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.moveTo(195, 310);
    ctx.lineTo(315, 310);
    ctx.lineTo(325, 360);
    ctx.lineTo(185, 360);
    ctx.closePath();
    ctx.fill();

    // 银灰色弧形立体胸甲
    const chestGrad = ctx.createLinearGradient(190, 190, 320, 320);
    chestGrad.addColorStop(0, '#f1f5f9'); // 高光白银
    chestGrad.addColorStop(0.3, '#cbd5e1');
    chestGrad.addColorStop(0.7, '#64748b');
    chestGrad.addColorStop(1, '#334155');
    ctx.fillStyle = chestGrad;
    ctx.beginPath();
    ctx.moveTo(210, 200);
    ctx.lineTo(300, 200);
    ctx.lineTo(315, 315);
    ctx.lineTo(195, 315);
    ctx.closePath();
    ctx.fill();

    // 胸甲中央金色圣堂飞翼纹章
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(230, 240);
    ctx.lineTo(255, 270);
    ctx.lineTo(280, 240);
    ctx.stroke();

    // D. 威武肩甲 (巨型金属护肩)
    // 左肩甲
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(195, 210, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 右肩甲 (向观众侧，大体量)
    const rightShoulderGrad = ctx.createRadialGradient(315, 205, 5, 315, 205, 48);
    rightShoulderGrad.addColorStop(0, '#ffffff');
    rightShoulderGrad.addColorStop(0.4, '#94a3b8');
    rightShoulderGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = rightShoulderGrad;
    ctx.beginPath();
    ctx.arc(315, 210, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.stroke();

    // E. 圣殿十字骑士头盔
    const helmGrad = ctx.createLinearGradient(225, 120, 285, 200);
    helmGrad.addColorStop(0, '#e2e8f0');
    helmGrad.addColorStop(0.5, '#94a3b8');
    helmGrad.addColorStop(1, '#475569');
    ctx.fillStyle = helmGrad;
    ctx.beginPath();
    ctx.moveTo(230, 150);
    ctx.quadraticCurveTo(255, 115, 280, 150);
    ctx.lineTo(288, 200);
    ctx.lineTo(222, 200);
    ctx.closePath();
    ctx.fill();

    // 头盔 T 字目镜视口 (深邃幽蓝微光)
    setGlow(ctx, '#38bdf8', 12);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(238, 160, 34, 7);
    ctx.fillRect(252, 160, 7, 24);
    clearGlow(ctx);

    // 头盔顶翎羽 (高扬的天空蓝羽饰)
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(255, 120);
    ctx.bezierCurveTo(240, 80, 200, 85, 175, 110);
    ctx.bezierCurveTo(210, 100, 240, 105, 255, 120);
    ctx.fill();

    // F. 右手手持发光剑刃 (符文阔剑)
    ctx.save();
    // 剑刃倾斜姿态
    ctx.translate(330, 220);
    ctx.rotate(0.42);

    // 剑柄与黄金十字护手
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-6, 30, 12, 40); // 剑柄握把
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-30, 22, 60, 12); // 十字护手
    ctx.beginPath();
    ctx.arc(0, 72, 8, 0, Math.PI * 2); // 柄头配重球
    ctx.fill();

    // 剑身圣光辉光
    setGlow(ctx, '#38bdf8', 35);

    // 剑刃主体 (银蓝发光阔剑)
    const bladeGrad = ctx.createLinearGradient(-14, 0, 14, 0);
    bladeGrad.addColorStop(0, '#e0f2fe');
    bladeGrad.addColorStop(0.5, '#ffffff'); // 极亮中心脊线
    bladeGrad.addColorStop(1, '#7dd3fc');
    ctx.fillStyle = bladeGrad;
    ctx.beginPath();
    ctx.moveTo(-14, 22);
    ctx.lineTo(-12, -220);
    ctx.lineTo(0, -260); // 锐利剑尖
    ctx.lineTo(12, -220);
    ctx.lineTo(14, 22);
    ctx.closePath();
    ctx.fill();

    // 剑脊发光符文槽
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 15);
    ctx.lineTo(0, -180);
    ctx.stroke();

    clearGlow(ctx);
    ctx.restore();

    ctx.restore();
    return canvas;
  }

  // =========================================================================
  // 3. 敌人材质：骷髅战士 enemy_skeleton (512x512, 透明通道)
  // =========================================================================
  static generateEnemySkeleton() {
    const size = 512;
    const canvas = createSafeCanvas(size, size);
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.save();
    const boneColor = '#e2dcce'; // 象牙古骨灰白
    const shadowBone = '#8a8275'; // 骨骼深暗阴影

    // A. 破旧破烂暗紫战袍裹尸布 (褴褛下摆)
    ctx.fillStyle = '#2e1065';
    ctx.beginPath();
    ctx.moveTo(210, 260);
    ctx.lineTo(310, 260);
    ctx.lineTo(330, 420);
    ctx.lineTo(290, 390);
    ctx.lineTo(260, 430);
    ctx.lineTo(220, 380);
    ctx.lineTo(185, 410);
    ctx.closePath();
    ctx.fill();

    // B. 双腿腿骨与踝骨关节
    ctx.fillStyle = boneColor;
    // 左腿骨
    ctx.fillRect(215, 340, 14, 120);
    ctx.beginPath();
    ctx.arc(222, 400, 12, 0, Math.PI * 2); // 膝关节
    ctx.fill();
    // 右腿骨
    ctx.fillRect(285, 340, 14, 120);
    ctx.beginPath();
    ctx.arc(292, 400, 12, 0, Math.PI * 2);
    ctx.fill();

    // C. 脊柱与肋骨架 (Ribcage)
    // 脊椎骨柱
    ctx.fillStyle = shadowBone;
    ctx.fillRect(250, 180, 14, 140);

    // 5 对弯曲肋骨
    ctx.strokeStyle = boneColor;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const ribY = 205 + i * 22;
      const span = 42 - i * 3;
      ctx.beginPath();
      ctx.moveTo(257, ribY);
      ctx.quadraticCurveTo(257 - span * 1.2, ribY + 4, 257 - span, ribY + 16);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(257, ribY);
      ctx.quadraticCurveTo(257 + span * 1.2, ribY + 4, 257 + span, ribY + 16);
      ctx.stroke();
    }

    // D. 骨质双臂与锁骨
    // 锁骨
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(200, 195);
    ctx.lineTo(314, 195);
    ctx.stroke();

    // 左臂残骨
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(200, 195);
    ctx.lineTo(165, 270);
    ctx.lineTo(150, 340);
    ctx.stroke();

    // 右臂握刀前伸
    ctx.beginPath();
    ctx.moveTo(314, 195);
    ctx.lineTo(360, 250);
    ctx.lineTo(385, 290);
    ctx.stroke();

    // E. 骷髅头骨 (狰狞颌骨与骨裂)
    ctx.fillStyle = boneColor;
    ctx.beginPath();
    // 颅骨球体
    ctx.arc(256, 135, 46, 0, Math.PI * 2);
    ctx.fill();

    // 下颌骨与牙列
    ctx.beginPath();
    ctx.moveTo(235, 155);
    ctx.lineTo(238, 185);
    ctx.lineTo(274, 185);
    ctx.lineTo(277, 155);
    ctx.closePath();
    ctx.fill();

    // 牙齿缝隙线条
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 2;
    for (let t = 242; t <= 270; t += 7) {
      ctx.beginPath();
      ctx.moveTo(t, 172);
      ctx.lineTo(t, 184);
      ctx.stroke();
    }

    // 鼻腔倒三角孔
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.moveTo(256, 142);
    ctx.lineTo(251, 154);
    ctx.lineTo(261, 154);
    ctx.closePath();
    ctx.fill();

    // 凹陷深黑眼窝
    ctx.beginPath();
    ctx.arc(242, 132, 14, 0, Math.PI * 2);
    ctx.arc(270, 132, 14, 0, Math.PI * 2);
    ctx.fill();

    // F. 猩红魔眼 (灵魂血火)
    setGlow(ctx, '#ef4444', 20);
    ctx.fillStyle = '#ff0033';
    ctx.beginPath();
    ctx.arc(242, 132, 6, 0, Math.PI * 2);
    ctx.arc(270, 132, 6, 0, Math.PI * 2);
    ctx.fill();

    // 瞳孔白炽亮点
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(242, 132, 2.5, 0, Math.PI * 2);
    ctx.arc(270, 132, 2.5, 0, Math.PI * 2);
    ctx.fill();
    clearGlow(ctx);

    // G. 手持残破生锈大砍刀 (Rust Cleaver)
    ctx.save();
    ctx.translate(385, 290);
    ctx.rotate(-0.35);

    // 骨指手抓
    ctx.fillStyle = boneColor;
    for (let f = -12; f <= 12; f += 8) {
      ctx.fillRect(f - 3, -6, 6, 14);
    }

    // 生锈刀刃
    const rustGrad = ctx.createLinearGradient(0, 0, 40, -180);
    rustGrad.addColorStop(0, '#78350f'); // 铁锈暗褐色
    rustGrad.addColorStop(0.5, '#b45309');
    rustGrad.addColorStop(0.8, '#71717a'); // 残存金属锋刃
    rustGrad.addColorStop(1, '#a1a1aa');
    ctx.fillStyle = rustGrad;

    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.lineTo(-8, -190);
    ctx.lineTo(36, -170); // 宽砍刀刀头
    // 刀刃 3 处缺口 (锯齿磨损)
    ctx.lineTo(24, -130);
    ctx.lineTo(30, -115);
    ctx.lineTo(22, -80);
    ctx.lineTo(28, -65);
    ctx.lineTo(18, 0);
    ctx.closePath();
    ctx.fill();

    // 刀锋微弱冷光
    ctx.strokeStyle = '#e4e4e7';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
    ctx.restore();

    return canvas;
  }

  // =========================================================================
  // 4. Boss 材质：暗黑龙骑士 boss_dragon_knight (512x512, 透明通道)
  // =========================================================================
  static generateBossDragonKnight() {
    const size = 512;
    const canvas = createSafeCanvas(size, size);
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.save();
    // A. 升腾的暗红魔焰光环 (Demonic Fire Aura)
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    setGlow(ctx, '#dc2626', 35);
    const auraGrad = ctx.createRadialGradient(256, 260, 60, 256, 260, 230);
    auraGrad.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
    auraGrad.addColorStop(0.5, 'rgba(185, 28, 28, 0.25)');
    auraGrad.addColorStop(1, 'rgba(127, 29, 29, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(256, 260, 230, 0, Math.PI * 2);
    ctx.fill();
    clearGlow(ctx);
    ctx.restore();

    // B. 背后嶙峋的暗黑骨质龙翼轮廓 (Dragon Wings)
    const wingGrad = ctx.createLinearGradient(100, 100, 400, 300);
    wingGrad.addColorStop(0, '#1c1917');
    wingGrad.addColorStop(1, '#0c0a09');
    ctx.fillStyle = wingGrad;

    // 左龙翼
    ctx.beginPath();
    ctx.moveTo(220, 180);
    ctx.lineTo(80, 80); // 翼尖主骨
    ctx.lineTo(120, 150);
    ctx.lineTo(50, 180);
    ctx.lineTo(110, 230);
    ctx.lineTo(60, 280);
    ctx.lineTo(200, 260);
    ctx.closePath();
    ctx.fill();

    // 右龙翼
    ctx.beginPath();
    ctx.moveTo(292, 180);
    ctx.lineTo(432, 80);
    ctx.lineTo(392, 150);
    ctx.lineTo(462, 180);
    ctx.lineTo(402, 230);
    ctx.lineTo(452, 280);
    ctx.lineTo(312, 260);
    ctx.closePath();
    ctx.fill();

    // C. 重装黑曜石龙鳞战甲
    // 战靴与重型腿甲
    const armorDarkGrad = ctx.createLinearGradient(200, 320, 310, 480);
    armorDarkGrad.addColorStop(0, '#27272a');
    armorDarkGrad.addColorStop(1, '#09090b');
    ctx.fillStyle = armorDarkGrad;

    ctx.fillRect(190, 340, 50, 135);
    ctx.fillRect(272, 340, 50, 135);

    // 膝盖龙爪护膝
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(195, 385, 40, 20);
    ctx.fillRect(277, 385, 40, 20);

    // 胸甲主体 (厚重黑金龙鳞)
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.moveTo(180, 180);
    ctx.lineTo(332, 180);
    ctx.lineTo(312, 330);
    ctx.lineTo(200, 330);
    ctx.closePath();
    ctx.fill();

    // 胸甲中央脉动的“龙晶”魔核
    setGlow(ctx, '#ef4444', 24);
    ctx.fillStyle = '#ff1133';
    ctx.beginPath();
    ctx.arc(256, 240, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b'; // 暗金魔纹镶圈
    ctx.lineWidth = 3;
    ctx.stroke();
    clearGlow(ctx);

    // D. 巨型龙首肩甲 (带突刺尖角)
    // 左肩甲
    ctx.fillStyle = '#27272a';
    ctx.beginPath();
    ctx.arc(160, 190, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 右肩甲
    ctx.beginPath();
    ctx.arc(352, 190, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // E. 龙盔与黑色曲折巨角 (Black Dragon Horns)
    // 弯曲黑色巨角
    ctx.fillStyle = '#09090b';
    // 左角
    ctx.beginPath();
    ctx.moveTo(220, 120);
    ctx.bezierCurveTo(170, 70, 120, 40, 90, 60);
    ctx.bezierCurveTo(120, 80, 170, 120, 215, 145);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 右角
    ctx.beginPath();
    ctx.moveTo(292, 120);
    ctx.bezierCurveTo(342, 70, 392, 40, 422, 60);
    ctx.bezierCurveTo(392, 80, 342, 120, 297, 145);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 龙骑士黑曜石战盔
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.moveTo(220, 120);
    ctx.lineTo(292, 120);
    ctx.lineTo(285, 185);
    ctx.lineTo(256, 205); // 锐利下颚尖刺
    ctx.lineTo(227, 185);
    ctx.closePath();
    ctx.fill();

    // 战盔面甲横向熔岩红眼缝
    setGlow(ctx, '#ef4444', 18);
    ctx.fillStyle = '#ff2244';
    ctx.beginPath();
    ctx.moveTo(234, 150);
    ctx.lineTo(252, 155);
    ctx.lineTo(238, 160);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(278, 150);
    ctx.lineTo(260, 155);
    ctx.lineTo(274, 160);
    ctx.closePath();
    ctx.fill();
    clearGlow(ctx);

    // F. 手持暗黑龙王重装大剑 (双手持握立于身前)
    const swordX = 256;
    const swordTopY = 70;
    const swordBottomY = 490;

    // 剑刃暗红魔光
    setGlow(ctx, '#b91c1c', 28);

    // 剑身 (巨型分叉龙纹大剑)
    const bladeGrad = ctx.createLinearGradient(swordX - 25, 0, swordX + 25, 0);
    bladeGrad.addColorStop(0, '#09090b');
    bladeGrad.addColorStop(0.5, '#450a0a'); // 熔岩暗红
    bladeGrad.addColorStop(1, '#09090b');
    ctx.fillStyle = bladeGrad;

    ctx.beginPath();
    ctx.moveTo(swordX - 24, swordBottomY - 140);
    ctx.lineTo(swordX - 20, swordTopY + 30);
    ctx.lineTo(swordX, swordTopY); // 锋利剑尖
    ctx.lineTo(swordX + 20, swordTopY + 30);
    ctx.lineTo(swordX + 24, swordBottomY - 140);
    ctx.closePath();
    ctx.fill();

    // 剑身中心深红熔岩能量线
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(swordX, swordTopY + 20);
    ctx.lineTo(swordX, swordBottomY - 150);
    ctx.stroke();

    clearGlow(ctx);

    // 龙爪剑格与黑铁剑柄
    ctx.fillStyle = '#78350f';
    ctx.fillRect(swordX - 50, swordBottomY - 145, 100, 16);
    ctx.fillStyle = '#27272a';
    ctx.fillRect(swordX - 8, swordBottomY - 130, 16, 50);

    ctx.restore();
    return canvas;
  }

  // =========================================================================
  // 5. 技能图标：128x128 金属质感边框与高对比发光符号
  // =========================================================================

  /**
   * 绘制统一的技能图标底板与暗金外框
   */
  static _drawIconBase(ctx, bgCenterColor, bgEdgeColor) {
    const size = 128;
    // 1. 深邃晶体底板
    const bgGrad = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, 60);
    bgGrad.addColorStop(0, bgCenterColor);
    bgGrad.addColorStop(1, bgEdgeColor);
    ctx.fillStyle = bgGrad;
    drawRoundedRect(ctx, 4, 4, 120, 120, 18);
    ctx.fill();

    // 2. 双重立体暗金边框
    strokeMetallicBorder(ctx, 4, 4, 120, 120, 18, '#ca8a04', '#422006', 4);

    // 3. 四角防滑金属铆钉
    const rivets = [
      { x: 14, y: 14 },
      { x: 114, y: 14 },
      { x: 14, y: 114 },
      { x: 114, y: 114 },
    ];
    ctx.fillStyle = '#fef08a';
    for (const r of rivets) {
      ctx.beginPath();
      ctx.arc(r.x, r.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 5.1 斩击 icon_slash
  static generateIconSlash() {
    const size = 128;
    const canvas = createSafeCanvas(size, size);
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    this._drawIconBase(ctx, '#0f172a', '#020617');

    ctx.save();
    setGlow(ctx, '#38bdf8', 22);

    // 双道凌厉月牙飞斩刀痕
    // 主斩弧
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(24, 104);
    ctx.quadraticCurveTo(60, 60, 104, 24);
    ctx.stroke();

    // 外层湛蓝锋芒
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 14;
    ctx.globalAlpha = 0.5;
    ctx.stroke();

    // 交叉副斩刃
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(40, 36);
    ctx.quadraticCurveTo(68, 64, 98, 92);
    ctx.stroke();

    // 斩裂火星飞溅
    ctx.fillStyle = '#ffffff';
    const sparks = [
      { x: 62, y: 48 },
      { x: 74, y: 58 },
      { x: 86, y: 42 },
    ];
    for (const s of sparks) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    clearGlow(ctx);
    ctx.restore();
    return canvas;
  }

  // 5.2 烈火 icon_fireball
  static generateIconFireball() {
    const size = 128;
    const canvas = createSafeCanvas(size, size);
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    this._drawIconBase(ctx, '#450a0a', '#180303');

    ctx.save();
    setGlow(ctx, '#f97316', 24);

    // 旋转烈焰火球外圈
    const fireGrad = ctx.createRadialGradient(64, 68, 5, 64, 68, 48);
    fireGrad.addColorStop(0, '#ffffff'); // 极高温核心
    fireGrad.addColorStop(0.25, '#fef08a'); // 明黄
    fireGrad.addColorStop(0.65, '#ea580c'); // 炽橙
    fireGrad.addColorStop(1, 'rgba(185, 28, 28, 0)');
    ctx.fillStyle = fireGrad;

    // 绘制螺旋火舌造型
    ctx.beginPath();
    ctx.moveTo(64, 18); // 顶端尖锐火苗
    ctx.bezierCurveTo(88, 38, 98, 62, 94, 84);
    ctx.bezierCurveTo(90, 102, 74, 112, 58, 108);
    ctx.bezierCurveTo(34, 102, 28, 76, 42, 54);
    ctx.bezierCurveTo(48, 44, 58, 32, 64, 18);
    ctx.closePath();
    ctx.fill();

    // 核心亮斑
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(62, 70, 10, 0, Math.PI * 2);
    ctx.fill();

    clearGlow(ctx);
    ctx.restore();
    return canvas;
  }

  // 5.3 护盾 icon_shield
  static generateIconShield() {
    const size = 128;
    const canvas = createSafeCanvas(size, size);
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    this._drawIconBase(ctx, '#082f49', '#031422');

    ctx.save();
    setGlow(ctx, '#38bdf8', 22);

    // 圣堂立体盾牌外廓
    const shieldGrad = ctx.createLinearGradient(30, 24, 98, 104);
    shieldGrad.addColorStop(0, '#38bdf8');
    shieldGrad.addColorStop(0.5, '#0284c7');
    shieldGrad.addColorStop(1, '#0c4a6e');
    ctx.fillStyle = shieldGrad;

    ctx.beginPath();
    ctx.moveTo(34, 30);
    ctx.lineTo(94, 30);
    ctx.lineTo(94, 68);
    ctx.bezierCurveTo(94, 92, 64, 108, 64, 108);
    ctx.bezierCurveTo(64, 108, 34, 92, 34, 68);
    ctx.closePath();
    ctx.fill();

    // 盾面黄金神圣十字
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(64, 38);
    ctx.lineTo(64, 92);
    ctx.moveTo(44, 54);
    ctx.lineTo(84, 54);
    ctx.stroke();

    // 盾面外沿金色金属包边
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.stroke();

    clearGlow(ctx);
    ctx.restore();
    return canvas;
  }

  // 5.4 疾冲 icon_dash
  static generateIconDash() {
    const size = 128;
    const canvas = createSafeCanvas(size, size);
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    this._drawIconBase(ctx, '#064e3b', '#021e17');

    ctx.save();
    setGlow(ctx, '#34d399', 22);

    // 三道前冲极速折线残影 (极速突破)
    const lines = [
      { yOffset: -22, alpha: 0.4, w: 4 },
      { yOffset: 0, alpha: 1.0, w: 7 },
      { yOffset: 22, alpha: 0.6, w: 5 },
    ];

    for (const l of lines) {
      ctx.globalAlpha = l.alpha;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = l.w;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(26, 64 + l.yOffset);
      ctx.lineTo(62, 64 + l.yOffset);
      ctx.lineTo(94, 46 + l.yOffset);
      ctx.lineTo(102, 64 + l.yOffset);
      ctx.stroke();
    }

    // 音障破空粒子
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#6ee7b7';
    ctx.beginPath();
    ctx.arc(106, 64, 4, 0, Math.PI * 2);
    ctx.arc(114, 58, 3, 0, Math.PI * 2);
    ctx.fill();

    clearGlow(ctx);
    ctx.restore();
    return canvas;
  }

  // 5.5 落雷 icon_thunder
  static generateIconThunder() {
    const size = 128;
    const canvas = createSafeCanvas(size, size);
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    this._drawIconBase(ctx, '#2e1065', '#100326');

    ctx.save();
    setGlow(ctx, '#c084fc', 25);

    // 粗壮曲折的破空闪电雷霆
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(74, 16);
    ctx.lineTo(44, 58);
    ctx.lineTo(66, 58);
    ctx.lineTo(36, 112); // 雷霆之矛尖端
    ctx.lineTo(92, 50);
    ctx.lineTo(68, 50);
    ctx.lineTo(88, 16);
    ctx.closePath();
    ctx.fill();

    // 闪电外圈电弧紫光轮廓
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 分支细雷弧
    ctx.strokeStyle = '#f0abfc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(66, 58);
    ctx.lineTo(96, 72);
    ctx.lineTo(84, 94);
    ctx.stroke();

    clearGlow(ctx);
    ctx.restore();
    return canvas;
  }

  // =========================================================================
  // 6. UI 材质：九宫格底框、强化卡牌、血条底槽与填充
  // =========================================================================

  // 6.1 九宫格暗金边框黑晶底板 panel_frame (256x256)
  static generatePanelFrame() {
    const size = 256;
    const canvas = createSafeCanvas(size, size);
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.save();
    // A. 黑晶半透明底色 (适合 9-slice 无缝拉伸)
    ctx.fillStyle = 'rgba(12, 16, 24, 0.94)';
    drawRoundedRect(ctx, 10, 10, size - 20, size - 20, 16);
    ctx.fill();

    // B. 暗金边框线条
    strokeMetallicBorder(ctx, 10, 10, size - 20, size - 20, 16, '#eab308', '#713f12', 3);

    // C. 四角华丽复古角花 (L-Shaped Filigree Corners)
    const cornerOffsets = [
      { x: 12, y: 12, flipX: 1, flipY: 1 },
      { x: size - 12, y: 12, flipX: -1, flipY: 1 },
      { x: 12, y: size - 12, flipX: 1, flipY: -1 },
      { x: size - 12, y: size - 12, flipX: -1, flipY: -1 },
    ];

    ctx.fillStyle = '#fef08a';
    for (const c of cornerOffsets) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(c.flipX, c.flipY);

      // 角标金属块
      ctx.fillRect(0, 0, 24, 4);
      ctx.fillRect(0, 0, 4, 24);
      ctx.beginPath();
      ctx.arc(6, 6, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    ctx.restore();
    return canvas;
  }

  // 6.2 3选1强化卡牌底框 card_frame (280x400)
  static generateCardFrame() {
    const w = 280;
    const h = 400;
    const canvas = createSafeCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.save();
    // A. 卡牌主体背景 (深蓝墨玄晶渐变)
    const cardGrad = ctx.createLinearGradient(0, 0, w, h);
    cardGrad.addColorStop(0, '#1e293b');
    cardGrad.addColorStop(0.5, '#0f172a');
    cardGrad.addColorStop(1, '#020617');
    ctx.fillStyle = cardGrad;
    drawRoundedRect(ctx, 8, 8, w - 16, h - 16, 20);
    ctx.fill();

    // B. 金色多重卡边与拱门描线
    strokeMetallicBorder(ctx, 8, 8, w - 16, h - 16, 20, '#fbbf24', '#78350f', 4);

    // C. 上部插图展示框 (Illustrator Window)
    ctx.fillStyle = 'rgba(2, 6, 23, 0.8)';
    drawRoundedRect(ctx, 28, 48, w - 56, 150, 12);
    ctx.fill();
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2;
    ctx.stroke();

    // D. 中部标题缎带背板
    const ribbonGrad = ctx.createLinearGradient(20, 210, w - 20, 210);
    ribbonGrad.addColorStop(0, '#78350f');
    ribbonGrad.addColorStop(0.5, '#b45309');
    ribbonGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = ribbonGrad;
    ctx.fillRect(24, 208, w - 48, 32);
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(24, 208, w - 48, 32);

    // E. 顶部皇冠宝石槽
    setGlow(ctx, '#38bdf8', 16);
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(w / 2, 28, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.stroke();
    clearGlow(ctx);

    // F. 下部描述区域卡槽分割线
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(34, 260);
    ctx.lineTo(w - 34, 260);
    ctx.moveTo(34, 370);
    ctx.lineTo(w - 34, 370);
    ctx.stroke();

    ctx.restore();
    return canvas;
  }

  // 6.3 生命槽底槽 hp_bar_bg (360x36)
  static generateHpBarBg() {
    const w = 360;
    const h = 36;
    const canvas = createSafeCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.save();
    // 坚固深黑金属外壳
    ctx.fillStyle = '#18181b';
    drawRoundedRect(ctx, 2, 2, w - 4, h - 4, 8);
    ctx.fill();

    // 内部深陷阴影凹槽
    const innerShadowGrad = ctx.createLinearGradient(0, 4, 0, h - 4);
    innerShadowGrad.addColorStop(0, '#09090b');
    innerShadowGrad.addColorStop(0.4, '#18181b');
    innerShadowGrad.addColorStop(1, '#27272a');
    ctx.fillStyle = innerShadowGrad;
    drawRoundedRect(ctx, 6, 6, w - 12, h - 12, 6);
    ctx.fill();

    // 外边缘重金属边框与卡扣
    ctx.strokeStyle = '#52525b';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, 2, 2, w - 4, h - 4, 8);
    ctx.stroke();

    ctx.restore();
    return canvas;
  }

  // 6.4 生命槽填充条 hp_bar_fill (360x36)
  static generateHpBarFill() {
    const w = 360;
    const h = 36;
    const canvas = createSafeCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.save();
    // A. 基础红橙高光渐变
    const barGrad = ctx.createLinearGradient(0, 0, w, 0);
    barGrad.addColorStop(0, '#b91c1c'); // 深红
    barGrad.addColorStop(0.65, '#ef4444'); // 绯红
    barGrad.addColorStop(1, '#f97316'); // 炽橙热浪
    ctx.fillStyle = barGrad;
    drawRoundedRect(ctx, 2, 2, w - 4, h - 4, 6);
    ctx.fill();

    // B. 上半段晶莹玻璃高光带
    const glassGrad = ctx.createLinearGradient(0, 2, 0, h / 2);
    glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
    glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
    ctx.fillStyle = glassGrad;
    ctx.beginPath();
    ctx.moveTo(4, 4);
    ctx.lineTo(w - 4, 4);
    ctx.lineTo(w - 4, h / 2 - 2);
    ctx.lineTo(4, h / 2 - 2);
    ctx.closePath();
    ctx.fill();

    // C. 底部暗红立体阴影
    ctx.fillStyle = 'rgba(69, 10, 10, 0.55)';
    ctx.fillRect(4, h - 8, w - 8, 4);

    ctx.restore();
    return canvas;
  }

  // =========================================================================
  // 7. 特效粒子材质：高亮火花、弧形刀光、火焰余烬
  // =========================================================================

  // 7.1 高亮受击火花 vfx_spark (64x64)
  static generateVfxSpark() {
    const size = 64;
    const canvas = createSafeCanvas(size, size);
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.save();
    const cx = size / 2;
    const cy = size / 2;

    setGlow(ctx, '#fef08a', 15);

    // 8 向星芒十字光芒
    ctx.fillStyle = '#ffffff';

    // 纵横长射线
    ctx.beginPath();
    ctx.moveTo(cx, cy - 28);
    ctx.quadraticCurveTo(cx, cy, cx + 28, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy + 28);
    ctx.quadraticCurveTo(cx, cy, cx - 28, cy);
    ctx.closePath();
    ctx.fill();

    // 斜向短射线
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy - 16);
    ctx.quadraticCurveTo(cx, cy, cx + 16, cy - 16);
    ctx.quadraticCurveTo(cx, cy, cx + 16, cy + 16);
    ctx.quadraticCurveTo(cx, cy, cx - 16, cy + 16);
    ctx.closePath();
    ctx.fill();

    // 核心亮斑
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    clearGlow(ctx);
    ctx.restore();
    return canvas;
  }

  // 7.2 弧形发光刀光 vfx_slash_arc (256x128)
  static generateVfxSlashArc() {
    const w = 256;
    const h = 128;
    const canvas = createSafeCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.save();
    setGlow(ctx, '#38bdf8', 20);

    // 半月弧形渐变：头部饱满极亮，尾部渐隐尖锐
    const arcGrad = ctx.createLinearGradient(20, h - 20, w - 20, 20);
    arcGrad.addColorStop(0, 'rgba(2, 132, 199, 0)'); // 尾部透明
    arcGrad.addColorStop(0.4, 'rgba(56, 189, 248, 0.7)');
    arcGrad.addColorStop(0.85, '#ffffff'); // 头部核心纯白
    arcGrad.addColorStop(1, '#e0f2fe');

    ctx.fillStyle = arcGrad;
    ctx.beginPath();
    // 外圆弧
    ctx.moveTo(20, h - 20);
    ctx.quadraticCurveTo(w * 0.45, 10, w - 20, 20);
    // 头部圆角
    ctx.quadraticCurveTo(w - 10, 30, w - 24, 46);
    // 内圆弧
    ctx.quadraticCurveTo(w * 0.5, 45, 20, h - 20);
    ctx.closePath();
    ctx.fill();

    clearGlow(ctx);
    ctx.restore();
    return canvas;
  }

  // 7.3 火焰余烬粒子 vfx_fire_particle (64x64)
  static generateVfxFireParticle() {
    const size = 64;
    const canvas = createSafeCanvas(size, size);
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.save();
    const cx = size / 2;
    const cy = size / 2;

    const fireParticleGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
    fireParticleGrad.addColorStop(0, '#ffffff'); // 极白高温内核
    fireParticleGrad.addColorStop(0.25, '#fef08a'); // 金黄
    fireParticleGrad.addColorStop(0.55, '#f97316'); // 烈橙
    fireParticleGrad.addColorStop(0.85, '#dc2626'); // 绯红
    fireParticleGrad.addColorStop(1, 'rgba(153, 27, 27, 0)'); // 边缘羽化透明

    ctx.fillStyle = fireParticleGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    return canvas;
  }
}

/**
 * 纹理生成器映射字典
 */
AssetGenerator.GENERATORS = Object.freeze({
  [ASSET_KEYS.BG_DUNGEON_ARENA]: AssetGenerator.generateDungeonArenaBg,
  [ASSET_KEYS.HERO_WARRIOR]: AssetGenerator.generateHeroWarrior,
  [ASSET_KEYS.ENEMY_SKELETON]: AssetGenerator.generateEnemySkeleton,
  [ASSET_KEYS.BOSS_DRAGON_KNIGHT]: AssetGenerator.generateBossDragonKnight,
  [ASSET_KEYS.ICON_SLASH]: AssetGenerator.generateIconSlash,
  [ASSET_KEYS.ICON_FIREBALL]: AssetGenerator.generateIconFireball,
  [ASSET_KEYS.ICON_SHIELD]: AssetGenerator.generateIconShield,
  [ASSET_KEYS.ICON_DASH]: AssetGenerator.generateIconDash,
  [ASSET_KEYS.ICON_THUNDER]: AssetGenerator.generateIconThunder,
  [ASSET_KEYS.PANEL_FRAME]: AssetGenerator.generatePanelFrame,
  [ASSET_KEYS.CARD_FRAME]: AssetGenerator.generateCardFrame,
  [ASSET_KEYS.HP_BAR_BG]: AssetGenerator.generateHpBarBg,
  [ASSET_KEYS.HP_BAR_FILL]: AssetGenerator.generateHpBarFill,
  [ASSET_KEYS.VFX_SPARK]: AssetGenerator.generateVfxSpark,
  [ASSET_KEYS.VFX_SLASH_ARC]: AssetGenerator.generateVfxSlashArc,
  [ASSET_KEYS.VFX_FIRE_PARTICLE]: AssetGenerator.generateVfxFireParticle,
});

export default AssetGenerator;
