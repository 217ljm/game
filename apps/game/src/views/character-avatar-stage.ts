import Phaser from "phaser";
import { pixelPalette, toColorString } from "../ui-kit/pixel-palette";
import { DEFAULT_FONT_FAMILY, GAME_RESOLUTION } from "../ui/game-text";

export type CharacterMood =
  | "calm"          // 沉稳温和
  | "happy"         // 愉悦微笑
  | "worried"       // 担忧焦虑
  | "tired"         // 疲惫劳累
  | "sick"          // 生病虚弱 (面色青灰苍白+退热贴)
  | "fever"         // 发烧涨红 (脸颊潮红+虚汗)
  | "full_score"    // 考满分 (双手高举100分卷+星芒瞳孔)
  | "champion";     // 夺冠 (双手高举金杯+头顶金色雨)

export type AgeStageId =
  | "infant"        // 0~3岁 虎头鞋襁褓
  | "toddler"       // 4~6岁 海魂衫小挎包
  | "primary"       // 7~12岁 红领巾少先队员
  | "adolescent"    // 13~18岁 蓝白运动校服
  | "youth"         // 18~24岁 战队刺绣战袍
  | "adult"         // 25~50岁 商务西装/教练夹克
  | "elder";        // 50岁以上 中式开衫毛衣老花镜

export interface CharacterAvatarStageOptions {
  x: number;
  y: number;
  age?: number;
  mood?: CharacterMood;
  showPedestal?: boolean;
  showTag?: boolean;
  scale?: number;
  depth?: number;
}

export interface AgeStageMeta {
  stageId: AgeStageId;
  label: string;
  minAge: number;
  maxAge: number;
  description: string;
}

export const AGE_STAGES: AgeStageMeta[] = [
  { stageId: "infant", label: "虎头鞋襁褓婴儿", minAge: 0, maxAge: 3, description: "红肚兜配喜庆虎头鞋与锦缎襁褓，圆嘟嘟惹人喜爱" },
  { stageId: "toddler", label: "海魂衫红星小挎包", minAge: 4, maxAge: 6, description: "蓝白条纹海魂衫，斜挎军绿小书包，手摇彩色风车" },
  { stageId: "primary", label: "红领巾少先队员", minAge: 7, maxAge: 12, description: "鲜艳红领巾与三道杠大队长袖标，回力白球鞋，书声琅琅" },
  { stageId: "adolescent", label: "蓝白运动校服高中生", minAge: 13, maxAge: 17, description: "经典蓝白拼色运动校服，手捧数理化压轴题，青春奋发" },
  { stageId: "youth", label: "战队金线刺绣战袍", minAge: 18, maxAge: 24, description: "炫酷刺绣队服战袍，RGB流光电竞耳机，热血逐梦赛场" },
  { stageId: "adult", label: "商务西装/教练夹克", minAge: 25, maxAge: 50, description: "笔挺干练双排扣西装或沉稳教练立领夹克，中流砥柱" },
  { stageId: "elder", label: "开衫毛衣老花镜长者", minAge: 51, maxAge: 120, description: "中式开衫毛衣配金丝老花镜，老式保温杯，岁月从容" },
];

export function getStageByAge(age: number): AgeStageMeta {
  const cleanAge = Math.max(0, Math.round(age));
  for (const s of AGE_STAGES) {
    if (cleanAge >= s.minAge && cleanAge <= s.maxAge) {
      return s;
    }
  }
  return AGE_STAGES[AGE_STAGES.length - 1];
}

/**
 * 【0~80岁全年龄角色像素动态立绘状态机】
 * 包含：
 * 1. 0~80 岁 7 大人生阶段时代服饰与道具（襁褓虎头鞋、海魂衫小挎包、红领巾三道杠、蓝白校服、刺绣战袍、商务西装/教练夹克、开衫老花镜）
 * 2. 待机轻微呼吸起伏微动、偶发自然眨眼系统
 * 3. 生病苍白/潮红发烧/开心/忧虑/疲倦等完整表情状态机
 * 4. 夺冠双手托举金色大奖杯、考满分举卷，头顶持续喷射灿烂金色雨粒子
 */
export class CharacterAvatarStage extends Phaser.GameObjects.Container {
  private currentAge: number;
  private currentMood: CharacterMood;
  private showPedestal: boolean;
  private showTag: boolean;
  private baseScale: number;

  // 内部容器节点
  private pedestalContainer: Phaser.GameObjects.Container;
  private pedestalGraphics: Phaser.GameObjects.Graphics;
  private characterBodyContainer: Phaser.GameObjects.Container;
  private characterGraphics: Phaser.GameObjects.Graphics;
  private faceGraphics: Phaser.GameObjects.Graphics;
  private overlayGraphics: Phaser.GameObjects.Graphics;
  private characterImage?: Phaser.GameObjects.Image;
  private tagContainer: Phaser.GameObjects.Container;
  private tagText: Phaser.GameObjects.Text;

  // 动画与生命周期句柄
  private breatheTween?: Phaser.Tweens.Tween;
  private blinkTimer?: Phaser.Time.TimerEvent;
  private isBlinking = false;
  private celebrationEmitterTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, options: CharacterAvatarStageOptions) {
    super(scene, options.x, options.y);

    this.currentAge = options.age ?? 6;
    this.currentMood = options.mood ?? "calm";
    this.showPedestal = options.showPedestal ?? true;
    this.showTag = options.showTag ?? true;
    this.baseScale = options.scale ?? 1.0;

    if (options.depth !== undefined) {
      this.setDepth(options.depth);
    }

    // 1. 底座地台容器 (固定在展台底部)
    this.pedestalContainer = scene.add.container(0, 48);
    this.pedestalGraphics = scene.add.graphics();
    this.pedestalContainer.add(this.pedestalGraphics);
    this.add(this.pedestalContainer);

    // 2. 角色立绘主体容器 (承载呼吸微幅浮动动画)
    this.characterBodyContainer = scene.add.container(0, 16);
    this.add(this.characterBodyContainer);

    this.characterGraphics = scene.add.graphics();
    this.characterBodyContainer.add(this.characterGraphics);

    this.faceGraphics = scene.add.graphics();
    this.characterBodyContainer.add(this.faceGraphics);

    this.overlayGraphics = scene.add.graphics();
    this.characterBodyContainer.add(this.overlayGraphics);

    // 3. 底部信息标牌容器
    this.tagContainer = scene.add.container(0, 72);
    this.add(this.tagContainer);

    this.tagText = scene.add.text(0, 0, "", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "11px",
      fontStyle: "bold",
      color: toColorString(pixelPalette.parchmentLight),
      stroke: "#261910",
      strokeThickness: 2,
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5, 0.5);
    this.tagContainer.add(this.tagText);

    this.setScale(this.baseScale);

    // 初始渲染与动画启动
    this.renderPedestal();
    this.renderCharacter();
    this.renderTag();
    this.startBreathingAnimation();
    this.setupBlinkTimer();

    scene.add.existing(this);
  }

  // ==========================================
  //  展台地台绘制 (Pedestal)
  // ==========================================
  private renderPedestal(): void {
    this.pedestalGraphics.clear();
    if (!this.showPedestal) return;

    const g = this.pedestalGraphics;
    const rx = 52;
    const ry = 14;

    // 1. 底层深木色大椭圆底盘阴影
    g.fillStyle(0x19120c, 0.7);
    g.fillEllipse(0, 12, rx + 10, ry + 4);

    // 2. 阶梯外木框
    g.fillStyle(pixelPalette.woodFrameDark, 1);
    g.fillEllipse(0, 8, rx + 4, ry + 2);

    // 3. 琥珀金边立体高光环
    g.fillStyle(pixelPalette.goldAccent, 1);
    g.fillEllipse(0, 4, rx + 2, ry + 1);

    // 4. 地台台面 (羊皮纸暖灰木纹表面)
    g.fillStyle(0x3e2c1e, 1);
    g.fillEllipse(0, 0, rx, ry);

    // 5. 台面中央聚光暖光斑
    g.fillStyle(pixelPalette.parchmentLight, 0.15);
    g.fillEllipse(0, -1, rx - 12, ry - 4);
  }

  // ==========================================
  //  全年龄角色绘制路由器
  // ==========================================
  public renderCharacter(): void {
    this.characterGraphics.clear();
    this.faceGraphics.clear();
    this.overlayGraphics.clear();

    if (this.characterImage) {
      this.characterImage.destroy();
      this.characterImage = undefined;
    }

    const stage = getStageByAge(this.currentAge);

    // 优先挂载 1984 时代高清写实立绘图片 (真实手持练习本的少年代入感)
    if (this.scene.textures.exists("player.childNeutral")) {
      this.characterImage = this.scene.add.image(0, -22, "player.childNeutral");
      const targetHeight = 152;
      const scale = targetHeight / (this.characterImage.height || targetHeight);
      this.characterImage.setScale(scale);
      this.characterBodyContainer.add(this.characterImage);
      return;
    }

    switch (stage.stageId) {
      case "infant":
        this.drawInfantStage();
        break;
      case "toddler":
        this.drawToddlerStage();
        break;
      case "primary":
        this.drawPrimaryStage();
        break;
      case "adolescent":
        this.drawAdolescentStage();
        break;
      case "youth":
        this.drawYouthStage();
        break;
      case "adult":
        this.drawAdultStage();
        break;
      case "elder":
      default:
        this.drawElderStage();
        break;
    }

    this.drawFacialFeatures();
    this.drawMoodOverlays();
  }

  // ==========================================
  //  阶段 1: 0~3岁 虎头鞋襁褓婴儿
  // ==========================================
  private drawInfantStage(): void {
    const g = this.characterGraphics;
    const skin = this.getSkinTone();
    const isChampion = this.currentMood === "champion";

    // 1. 身体投影
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(0, 20, 26, 8);

    // 2. 锦缎吉祥红黄包被 (襁褓底托)
    g.fillStyle(0xc62828, 1);
    g.fillRect(-17, 2, 34, 18);
    // 襁褓金丝滚边
    g.fillStyle(pixelPalette.goldHighlight, 1);
    g.fillRect(-17, 2, 34, 2);
    g.fillRect(-17, 18, 34, 2);

    // 3. 胖嘟嘟双腿与大红虎头鞋
    g.fillStyle(skin, 1);
    g.fillRect(-12, 10, 8, 8);
    g.fillRect(4, 10, 8, 8);

    // 虎头鞋 (左鞋)
    g.fillStyle(0xd32f2f, 1); // 鲜红鞋帮
    g.fillRect(-15, 15, 12, 6);
    g.fillStyle(0xfbc02d, 1); // 明黄虎额
    g.fillRect(-16, 14, 6, 4);
    g.fillStyle(0x211c18, 1); // 虎眼黑点与胡须
    g.fillRect(-15, 15, 2, 2);
    g.fillStyle(0xffffff, 1); // 白色毛茸小耳
    g.fillRect(-16, 12, 3, 2);

    // 虎头鞋 (右鞋)
    g.fillStyle(0xd32f2f, 1);
    g.fillRect(3, 15, 12, 6);
    g.fillStyle(0xfbc02d, 1);
    g.fillRect(10, 14, 6, 4);
    g.fillStyle(0x211c18, 1);
    g.fillRect(13, 15, 2, 2);
    g.fillStyle(0xffffff, 1);
    g.fillRect(13, 12, 3, 2);

    // 4. 经典红金喜庆肚兜 (躯干)
    g.fillStyle(0xd32f2f, 1);
    g.fillRect(-14, -6, 28, 18);
    // 肚兜金边
    g.fillStyle(pixelPalette.goldHighlight, 1);
    g.fillRect(-14, -6, 28, 2);
    g.fillRect(-14, 10, 28, 2);
    // 肚兜中央福字金菱形
    g.fillRect(-4, -1, 8, 8);

    // 5. 双臂姿态 (夺冠时双手高举，平时在身侧)
    g.fillStyle(skin, 1);
    if (isChampion) {
      g.fillRect(-18, -20, 6, 16);
      g.fillRect(12, -20, 6, 16);
    } else {
      g.fillRect(-19, -4, 6, 12);
      g.fillRect(13, -4, 6, 12);
    }

    // 6. 婴儿大头 (圆滚滚)
    g.fillStyle(skin, 1);
    g.fillRect(-15, -34, 30, 28);

    // 胎发 (可爱小寿桃揪)
    g.fillStyle(0x211c18, 1);
    g.fillRect(-3, -39, 6, 6);

    // 道具：身侧红黄拨浪鼓
    if (!isChampion) {
      g.fillStyle(0x8d6e63, 1); // 鼓柄
      g.fillRect(19, 0, 3, 16);
      g.fillStyle(0xd32f2f, 1); // 鼓面
      g.fillRect(16, -6, 9, 8);
      g.fillStyle(0xfbc02d, 1); // 鼓心
      g.fillRect(19, -4, 3, 4);
    }
  }

  // ==========================================
  //  阶段 2: 4~6岁 海魂衫小挎包幼童
  // ==========================================
  private drawToddlerStage(): void {
    const g = this.characterGraphics;
    const skin = this.getSkinTone();
    const isChampion = this.currentMood === "champion";

    // 投影
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(0, 26, 30, 8);

    // 双脚球鞋与白短袜
    g.fillStyle(0xffffff, 1); // 白短袜
    g.fillRect(-10, 16, 6, 5);
    g.fillRect(4, 16, 6, 5);
    g.fillStyle(0x1565c0, 1); // 蓝球鞋
    g.fillRect(-12, 21, 9, 6);
    g.fillRect(3, 21, 9, 6);

    // 藏青色短裤
    g.fillStyle(0x1a237e, 1);
    g.fillRect(-11, 8, 22, 10);
    g.fillStyle(skin, 1); // 露出的膝盖小腿
    g.fillRect(-9, 13, 5, 4);
    g.fillRect(4, 13, 5, 4);

    // 蓝白条纹海魂衫 (经典标志性横条纹)
    const stripes = [
      0xffffff, 0x1976d2, 0xffffff, 0x1976d2, 0xffffff, 0x1976d2
    ];
    stripes.forEach((color, i) => {
      g.fillStyle(color, 1);
      g.fillRect(-13, -8 + i * 3, 26, 3);
    });

    // 军绿帆布斜挎小背包 (带一颗小红星)
    g.fillStyle(0x2e7d32, 1); // 挎包带
    g.fillRect(-13, -8, 3, 18);
    g.fillStyle(0x388e3c, 1); // 包体
    g.fillRect(-15, 2, 8, 9);
    g.fillStyle(0xd32f2f, 1); // 小红星
    g.fillRect(-12, 5, 2, 2);

    // 双臂姿态
    g.fillStyle(0x1976d2, 1);
    if (isChampion) {
      g.fillRect(-17, -22, 5, 14);
      g.fillRect(12, -22, 5, 14);
      g.fillStyle(skin, 1);
      g.fillRect(-17, -26, 5, 5);
      g.fillRect(12, -26, 5, 5);
    } else {
      g.fillRect(-17, -7, 5, 6);
      g.fillRect(12, -7, 5, 6);
      g.fillStyle(skin, 1);
      g.fillRect(-17, -1, 5, 11);
      g.fillRect(12, -1, 5, 11);
    }

    // 头部与发型 (齐刘海童趣短发)
    g.fillStyle(skin, 1);
    g.fillRect(-13, -33, 26, 25);
    // 乌黑童发
    g.fillStyle(0x211c18, 1);
    g.fillRect(-15, -37, 30, 9);
    g.fillRect(-15, -29, 4, 10);
    g.fillRect(11, -29, 4, 10);
    // 额前齐刘海锯齿
    g.fillRect(-13, -29, 26, 4);

    // 道具：右手拿着彩色小风车 (若非夺冠举杯状态)
    if (!isChampion) {
      g.fillStyle(0x8d6e63, 1); // 风车木杆
      g.fillRect(18, -18, 2, 24);
      // 四色风车叶片 (红蓝黄绿)
      g.fillStyle(0xd32f2f, 1);
      g.fillRect(15, -24, 4, 4);
      g.fillStyle(0x1976d2, 1);
      g.fillRect(20, -24, 4, 4);
      g.fillStyle(0xfbc02d, 1);
      g.fillRect(15, -19, 4, 4);
      g.fillStyle(0x388e3c, 1);
      g.fillRect(20, -19, 4, 4);
    }
  }

  // ==========================================
  //  阶段 3: 7~12岁 红领巾少先队员
  // ==========================================
  private drawPrimaryStage(): void {
    const g = this.characterGraphics;
    const skin = this.getSkinTone();
    const isChampion = this.currentMood === "champion";
    const isFullScore = this.currentMood === "full_score";

    // 投影
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(0, 30, 32, 8);

    // 双星/回力红白运动鞋
    g.fillStyle(0xffffff, 1);
    g.fillRect(-11, 25, 9, 6);
    g.fillRect(2, 25, 9, 6);
    g.fillStyle(0xd32f2f, 1); // 侧面红色经典折线
    g.fillRect(-9, 26, 5, 2);
    g.fillRect(4, 26, 5, 2);

    // 深蓝学生校裤
    g.fillStyle(0x283593, 1);
    g.fillRect(-11, 8, 9, 18);
    g.fillRect(2, 8, 9, 18);

    // 白色校服衬衫
    g.fillStyle(0xf5f5f5, 1);
    g.fillRect(-13, -12, 26, 21);

    // 背后露出的墨绿色双肩小书包轮廓
    g.fillStyle(0x2e7d32, 1);
    g.fillRect(-16, -9, 4, 18);
    g.fillRect(12, -9, 4, 18);

    // 左臂上的“三道杠”大队长红白袖章
    g.fillStyle(0xffffff, 1); // 白袖标底
    g.fillRect(-17, -6, 5, 7);
    g.fillStyle(0xd32f2f, 1); // 三道红杠
    g.fillRect(-16, -5, 3, 1);
    g.fillRect(-16, -3, 3, 1);
    g.fillRect(-16, -1, 3, 1);

    // 核心灵魂标志：飘扬的红领巾！
    g.fillStyle(0xd32f2f, 1);
    // 领圈
    g.fillRect(-7, -12, 14, 3);
    // 红领巾大三角结
    g.fillRect(-4, -9, 8, 5);
    g.fillRect(-3, -4, 6, 6);
    g.fillRect(-2, 2, 4, 6);
    g.fillRect(-1, 8, 2, 3);

    // 手部与手臂姿势
    g.fillStyle(skin, 1);
    if (isChampion || isFullScore) {
      // 考满分/夺冠时双手高举
      g.fillRect(-16, -26, 5, 16);
      g.fillRect(12, -26, 5, 16);
    } else {
      g.fillRect(-16, 2, 4, 8);
      g.fillRect(12, 2, 4, 8);
    }

    // 头部与端正学生发型
    g.fillStyle(skin, 1);
    g.fillRect(-12, -37, 24, 25);
    // 阳光黑色学生发
    g.fillStyle(0x211c18, 1);
    g.fillRect(-14, -41, 28, 9);
    g.fillRect(-14, -33, 3, 11);
    g.fillRect(11, -33, 3, 11);
    g.fillRect(-12, -34, 24, 3);
  }

  // ==========================================
  //  阶段 4: 13~18岁 蓝白运动校服高中生
  // ==========================================
  private drawAdolescentStage(): void {
    const g = this.characterGraphics;
    const skin = this.getSkinTone();
    const isChampion = this.currentMood === "champion";
    const isFullScore = this.currentMood === "full_score";

    // 投影
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(0, 34, 34, 8);

    // 白球鞋
    g.fillStyle(0xffffff, 1);
    g.fillRect(-12, 30, 10, 6);
    g.fillRect(2, 30, 10, 6);
    g.fillStyle(0x757575, 1);
    g.fillRect(-12, 34, 10, 2);
    g.fillRect(2, 34, 10, 2);

    // 宽大蓝色运动校服长裤 (带双白道条纹)
    g.fillStyle(0x1565c0, 1);
    g.fillRect(-12, 9, 10, 22);
    g.fillRect(2, 9, 10, 22);
    // 侧边白色反光条
    g.fillStyle(0xffffff, 1);
    g.fillRect(-12, 9, 2, 22);
    g.fillRect(10, 9, 2, 22);

    // 宽大蓝白拼色拉链运动校服上衣 (上白下蓝/白V字)
    g.fillStyle(0x1565c0, 1);
    g.fillRect(-15, -16, 30, 26);
    // 胸前大白V拼色
    g.fillStyle(0xffffff, 1);
    g.fillRect(-15, -16, 30, 8);
    g.fillRect(-8, -8, 16, 6);
    // 拉链金属银条
    g.fillStyle(0xb0bec5, 1);
    g.fillRect(-1, -16, 2, 26);

    // 单肩斜挎背包带
    g.fillStyle(0x37474f, 1);
    g.fillRect(-14, -14, 4, 24);

    // 手臂与手部
    g.fillStyle(0x1565c0, 1);
    if (isChampion || isFullScore) {
      g.fillRect(-18, -30, 5, 18);
      g.fillRect(13, -30, 5, 18);
      g.fillStyle(skin, 1);
      g.fillRect(-18, -34, 5, 5);
      g.fillRect(13, -34, 5, 5);
    } else {
      g.fillRect(-18, -14, 5, 18);
      g.fillRect(13, -14, 5, 18);
      g.fillStyle(skin, 1);
      g.fillRect(-18, 4, 5, 7);
      g.fillRect(13, 4, 5, 7);

      // 手中捧着的数理化课本
      g.fillStyle(0xe53935, 1); // 红色封面书本
      g.fillRect(14, 2, 9, 11);
      g.fillStyle(0xffffff, 1); // 白色书芯
      g.fillRect(16, 4, 6, 7);
    }

    // 少年挺拔头部与蓬松碎发
    g.fillStyle(skin, 1);
    g.fillRect(-11, -41, 22, 25);
    g.fillStyle(0x211c18, 1);
    g.fillRect(-13, -46, 26, 11);
    g.fillRect(-13, -37, 3, 12);
    g.fillRect(10, -37, 3, 12);
    // 几缕少年刘海
    g.fillRect(-9, -36, 4, 4);
    g.fillRect(-3, -36, 5, 5);
    g.fillRect(4, -36, 4, 3);
  }

  // ==========================================
  //  阶段 5: 18~24岁 战队刺绣战袍青年
  // ==========================================
  private drawYouthStage(): void {
    const g = this.characterGraphics;
    const skin = this.getSkinTone();
    const isChampion = this.currentMood === "champion";

    // 投影
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(0, 36, 36, 8);

    // 潮牌高帮战靴 (黑红气垫潮鞋)
    g.fillStyle(0x212121, 1);
    g.fillRect(-13, 31, 11, 7);
    g.fillRect(2, 31, 11, 7);
    g.fillStyle(0xe53935, 1); // 红色气垫亮线
    g.fillRect(-13, 35, 11, 2);
    g.fillRect(2, 35, 11, 2);

    // 深灰工装裤 (多口袋潮流风)
    g.fillStyle(0x37474f, 1);
    g.fillRect(-12, 10, 10, 22);
    g.fillRect(2, 10, 10, 22);
    // 裤袋与织带
    g.fillStyle(0x263238, 1);
    g.fillRect(-14, 16, 3, 6);
    g.fillRect(11, 16, 3, 6);

    // 酷炫黑金刺绣电竞战袍队服 (夹克战袍)
    g.fillStyle(0x1a1a1a, 1); // 战袍主色曜石黑
    g.fillRect(-16, -16, 32, 27);
    // 战队刺绣金色飞龙图腾与电竞青流线装饰
    g.fillStyle(pixelPalette.pixelCyan, 1);
    g.fillRect(-14, -14, 4, 20);
    g.fillRect(10, -14, 4, 20);

    // 金线刺绣图腾徽章 (胸前与衣襟)
    g.fillStyle(pixelPalette.goldHighlight, 1);
    g.fillRect(-5, -11, 10, 9);
    g.fillStyle(0xe53935, 1); // 徽章中央战队龙纹红印
    g.fillRect(-3, -9, 6, 5);

    // 战袍袖子与手臂
    g.fillStyle(0x1a1a1a, 1);
    if (isChampion) {
      g.fillRect(-19, -32, 5, 20);
      g.fillRect(14, -32, 5, 20);
      g.fillStyle(skin, 1);
      g.fillRect(-19, -36, 5, 5);
      g.fillRect(14, -36, 5, 5);
    } else {
      g.fillRect(-19, -14, 5, 19);
      g.fillRect(14, -14, 5, 19);
      g.fillStyle(skin, 1);
      g.fillRect(-19, 5, 5, 6);
      g.fillRect(14, 5, 5, 6);
    }

    // 头部
    g.fillStyle(skin, 1);
    g.fillRect(-11, -41, 22, 25);
    // 前卫电竞发型 (微卷/侧分)
    g.fillStyle(0x261910, 1);
    g.fillRect(-13, -46, 26, 11);
    g.fillRect(-13, -37, 3, 10);
    g.fillRect(10, -37, 3, 10);
    g.fillRect(-9, -36, 18, 4);

    // 核心装备：RGB发光电竞耳机 (Gaming Headset)
    // 头梁连接带
    g.fillStyle(0x212121, 1);
    g.fillRect(-14, -48, 28, 4);
    // 左右大耳罩
    g.fillStyle(0x212121, 1);
    g.fillRect(-16, -42, 5, 12);
    g.fillRect(11, -42, 5, 12);
    // 耳罩外圈流光霓虹青色发光光环
    g.fillStyle(pixelPalette.pixelCyan, 1);
    g.fillRect(-16, -39, 2, 6);
    g.fillRect(14, -39, 2, 6);
    // 麦克风麦管
    g.fillStyle(0x757575, 1);
    g.fillRect(12, -32, 6, 2);
    g.fillStyle(0xe53935, 1); // 麦克风指示红灯
    g.fillRect(17, -33, 2, 2);
  }

  // ==========================================
  //  阶段 6: 25~50岁 商务西装 / 教练夹克
  // ==========================================
  private drawAdultStage(): void {
    const g = this.characterGraphics;
    const skin = this.getSkinTone();
    const isChampion = this.currentMood === "champion";

    // 投影
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(0, 36, 36, 8);

    // 黑色光泽商务皮鞋
    g.fillStyle(0x211c18, 1);
    g.fillRect(-13, 31, 11, 7);
    g.fillRect(2, 31, 11, 7);
    // 鞋头高光点
    g.fillStyle(0x5a5147, 1);
    g.fillRect(-12, 32, 4, 2);
    g.fillRect(3, 32, 4, 2);

    // 笔挺深炭灰西装长裤
    g.fillStyle(0x263238, 1);
    g.fillRect(-12, 10, 10, 22);
    g.fillRect(2, 10, 10, 22);
    // 裤中缝折线
    g.fillStyle(0x37474f, 1);
    g.fillRect(-8, 10, 1, 22);
    g.fillRect(6, 10, 1, 22);

    // 深藏青高级商务双排扣西装外套
    g.fillStyle(0x1a237e, 1);
    g.fillRect(-16, -17, 32, 28);
    // 白色整洁衬衫领口
    g.fillStyle(0xffffff, 1);
    g.fillRect(-5, -17, 10, 8);
    // 红色斜纹商务领带
    g.fillStyle(0xc62828, 1);
    g.fillRect(-2, -15, 4, 16);
    // 双排金色西装纽扣
    g.fillStyle(pixelPalette.goldHighlight, 1);
    g.fillRect(-6, -6, 2, 2);
    g.fillRect(4, -6, 2, 2);
    g.fillRect(-6, -1, 2, 2);
    g.fillRect(4, -1, 2, 2);

    // 西装手臂与袖口
    g.fillStyle(0x1a237e, 1);
    if (isChampion) {
      g.fillRect(-19, -32, 5, 20);
      g.fillRect(14, -32, 5, 20);
      g.fillStyle(0xffffff, 1);
      g.fillRect(-19, -34, 5, 2);
      g.fillRect(14, -34, 5, 2);
      g.fillStyle(skin, 1);
      g.fillRect(-19, -37, 5, 4);
      g.fillRect(14, -37, 5, 4);
    } else {
      g.fillRect(-19, -15, 5, 20);
      g.fillRect(14, -15, 5, 20);
      // 白色衬衫袖口露边
      g.fillStyle(0xffffff, 1);
      g.fillRect(-19, 5, 5, 2);
      g.fillRect(14, 5, 5, 2);
      g.fillStyle(skin, 1);
      g.fillRect(-19, 7, 5, 5);
      g.fillRect(14, 7, 5, 5);

      // 道具：右手提着黑色真皮商务公文包
      g.fillStyle(0x212121, 1);
      g.fillRect(16, 9, 10, 14);
      // 金属锁扣
      g.fillStyle(pixelPalette.goldAccent, 1);
      g.fillRect(20, 14, 2, 3);
    }

    // 干练职场精英头部与三七分油头
    g.fillStyle(skin, 1);
    g.fillRect(-11, -41, 22, 24);
    // 沉稳黑发三七分
    g.fillStyle(0x1b1b1b, 1);
    g.fillRect(-13, -46, 26, 10);
    g.fillRect(-13, -38, 3, 11);
    g.fillRect(10, -38, 3, 11);
    g.fillRect(-10, -38, 20, 3);
  }

  // ==========================================
  //  阶段 7: 50岁以上 中式开衫毛衣老花镜长者
  // ==========================================
  private drawElderStage(): void {
    const g = this.characterGraphics;
    const skin = this.getSkinTone(true);
    const isChampion = this.currentMood === "champion";

    // 投影
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(0, 36, 36, 8);

    // 黑色老头布鞋 (千层底)
    g.fillStyle(0x211c18, 1);
    g.fillRect(-13, 31, 11, 7);
    g.fillRect(2, 31, 11, 7);
    g.fillStyle(0xffffff, 1); // 白布底边
    g.fillRect(-13, 36, 11, 2);
    g.fillRect(2, 36, 11, 2);

    // 宽松深灰棉麻长裤
    g.fillStyle(0x424242, 1);
    g.fillRect(-13, 11, 11, 21);
    g.fillRect(2, 11, 11, 21);

    // 传统中式针织开衫毛衣 (典雅温润暖灰/棕驼色)
    g.fillStyle(0xbcaaa4, 1);
    g.fillRect(-16, -16, 32, 28);
    // 中式对襟与黑色盘扣
    g.fillStyle(0x4e342e, 1);
    g.fillRect(-1, -16, 2, 28);
    for (let i = 0; i < 4; i++) {
      g.fillRect(-4, -12 + i * 7, 8, 2);
    }

    // 宽袍毛衣袖子与手臂
    g.fillStyle(0xbcaaa4, 1);
    if (isChampion) {
      g.fillRect(-20, -32, 6, 20);
      g.fillRect(14, -32, 6, 20);
      g.fillStyle(skin, 1);
      g.fillRect(-20, -36, 6, 5);
      g.fillRect(14, -36, 6, 5);
    } else {
      g.fillRect(-20, -14, 6, 20);
      g.fillRect(14, -14, 6, 20);
      g.fillStyle(skin, 1);
      g.fillRect(-20, 6, 6, 5);
      g.fillRect(14, 6, 6, 5);

      // 道具：手持不锈钢老式银色保温杯
      g.fillStyle(0xb0bec5, 1); // 银色杯身
      g.fillRect(16, 4, 7, 13);
      g.fillStyle(0xd32f2f, 1); // 红色杯盖
      g.fillRect(16, 1, 7, 3);
    }

    // 慈祥中老年长者头部
    g.fillStyle(skin, 1);
    g.fillRect(-12, -41, 24, 25);

    // 银白斑白头发与鬓角
    g.fillStyle(0xbdbdbd, 1);
    g.fillRect(-14, -46, 28, 10);
    g.fillRect(-14, -38, 4, 12);
    g.fillRect(10, -38, 4, 12);
    // 银白发丝点缀
    g.fillStyle(0xffffff, 1);
    g.fillRect(-10, -45, 20, 3);
    g.fillRect(-12, -35, 2, 6);
    g.fillRect(10, -35, 2, 6);

    // 精巧鼻梁老花镜 (金丝边框与镜片高光)
    g.fillStyle(pixelPalette.goldHighlight, 1);
    // 镜梁
    g.fillRect(-2, -28, 4, 1);
    // 左右镜框
    g.strokeRect(-8, -30, 6, 5);
    g.strokeRect(2, -30, 6, 5);
    // 镜片反光白点
    g.fillStyle(0xffffff, 0.7);
    g.fillRect(-6, -29, 2, 2);
    g.fillRect(4, -29, 2, 2);

    // 眼角慈祥笑纹与法令纹
    g.fillStyle(0x8d775f, 0.7);
    g.fillRect(-8, -24, 2, 3);
    g.fillRect(6, -24, 2, 3);
    g.fillRect(-4, -19, 8, 1);
  }

  // ==========================================
  //  五官与表情绘制 (Facial Expressions)
  // ==========================================
  private drawFacialFeatures(): void {
    const f = this.faceGraphics;
    const mood = this.currentMood;
    const isSick = mood === "sick";
    const isFever = mood === "fever";

    const eyeY = -28;
    const leftEyeX = -6;
    const rightEyeX = 4;

    if (this.isBlinking) {
      // 眨眼闭合横线
      f.fillStyle(0x211c18, 1);
      f.fillRect(leftEyeX, eyeY + 1, 3, 1);
      f.fillRect(rightEyeX, eyeY + 1, 3, 1);
    } else {
      switch (mood) {
        case "happy":
        case "champion":
          // 弯月笑眼
          f.fillStyle(0x211c18, 1);
          f.fillRect(leftEyeX - 1, eyeY, 4, 1);
          f.fillRect(leftEyeX, eyeY - 1, 2, 1);
          f.fillRect(rightEyeX, eyeY, 4, 1);
          f.fillRect(rightEyeX + 1, eyeY - 1, 2, 1);
          // 少女/童趣红润腮红
          f.fillStyle(0xff8a80, 0.85);
          f.fillRect(leftEyeX - 3, eyeY + 3, 3, 2);
          f.fillRect(rightEyeX + 3, eyeY + 3, 3, 2);
          break;

        case "full_score":
          // 闪闪发光的十字星瞳
          f.fillStyle(pixelPalette.goldHighlight, 1);
          f.fillRect(leftEyeX, eyeY - 1, 3, 3);
          f.fillRect(leftEyeX + 1, eyeY - 2, 1, 5);
          f.fillRect(rightEyeX, eyeY - 1, 3, 3);
          f.fillRect(rightEyeX + 1, eyeY - 2, 1, 5);
          // 兴奋腮红
          f.fillStyle(0xff8a80, 0.9);
          f.fillRect(leftEyeX - 3, eyeY + 3, 3, 2);
          f.fillRect(rightEyeX + 3, eyeY + 3, 3, 2);
          break;

        case "worried":
          // 担忧八字眉与圆眼
          f.fillStyle(0x211c18, 1);
          f.fillRect(leftEyeX - 1, eyeY - 3, 4, 1);
          f.fillRect(leftEyeX + 1, eyeY - 2, 2, 1);
          f.fillRect(rightEyeX, eyeY - 2, 2, 1);
          f.fillRect(rightEyeX + 1, eyeY - 3, 4, 1);
          f.fillRect(leftEyeX, eyeY, 2, 3);
          f.fillRect(rightEyeX + 1, eyeY, 2, 3);
          break;

        case "tired":
        case "sick":
        case "fever":
          // 虚弱半睁眼 + 下眼眶发暗
          f.fillStyle(0x211c18, 1);
          f.fillRect(leftEyeX, eyeY + 1, 3, 2);
          f.fillRect(rightEyeX, eyeY + 1, 3, 2);
          // 眼眶青暗阴影
          f.fillStyle(isSick ? 0x546e7a : 0x757575, 0.7);
          f.fillRect(leftEyeX - 1, eyeY + 3, 4, 1);
          f.fillRect(rightEyeX, eyeY + 3, 4, 1);

          // 发烧双颊涨红
          if (isFever) {
            f.fillStyle(0xef5350, 0.85);
            f.fillRect(leftEyeX - 3, eyeY + 3, 4, 3);
            f.fillRect(rightEyeX + 2, eyeY + 3, 4, 3);
          }
          break;

        case "calm":
        default:
          // 端正大眼与温和眼神
          f.fillStyle(0x211c18, 1);
          f.fillRect(leftEyeX, eyeY - 1, 3, 3);
          f.fillRect(rightEyeX, eyeY - 1, 3, 3);
          // 眼中白色反光高光点
          f.fillStyle(0xffffff, 1);
          f.fillRect(leftEyeX, eyeY - 1, 1, 1);
          f.fillRect(rightEyeX, eyeY - 1, 1, 1);
          break;
      }
    }

    // 嘴巴绘制
    const mouthY = -21;
    switch (mood) {
      case "happy":
      case "full_score":
      case "champion":
        // 开怀笑嘴
        f.fillStyle(0xd32f2f, 1);
        f.fillRect(-2, mouthY, 4, 2);
        f.fillRect(-1, mouthY + 2, 2, 1);
        break;

      case "worried":
      case "tired":
      case "sick":
      case "fever":
        // 难过/无力撇嘴
        f.fillStyle(0x5a5147, 1);
        f.fillRect(-2, mouthY + 1, 4, 1);
        f.fillRect(-3, mouthY + 2, 1, 1);
        f.fillRect(2, mouthY + 2, 1, 1);
        break;

      case "calm":
      default:
        // 微笑淡定嘴
        f.fillStyle(0x5a5147, 1);
        f.fillRect(-2, mouthY, 4, 1);
        break;
    }
  }

  // ==========================================
  //  状态特效与情绪氛围层 (Mood Overlays)
  // ==========================================
  private drawMoodOverlays(): void {
    const o = this.overlayGraphics;
    const mood = this.currentMood;

    if (mood === "sick" || mood === "fever") {
      // 1. 生病/发烧：额头退热贴 / 冰袋
      o.fillStyle(0x4fc3f7, 0.9); // 冰蓝退热贴
      o.fillRect(-7, -35, 14, 4);
      o.fillStyle(0xffffff, 0.8); // 冰晶亮斑
      o.fillRect(-5, -34, 4, 2);

      // 脸颊虚弱汗珠
      o.fillStyle(0x0288d1, 1);
      o.fillRect(9, -27, 2, 3);
      o.fillRect(10, -26, 1, 3);
    } else if (mood === "worried") {
      // 担忧：脸颊大汗滴滑落
      o.fillStyle(0x29b6f6, 1);
      o.fillRect(9, -29, 2, 4);
      o.fillRect(10, -28, 1, 4);
      o.fillRect(-12, -26, 2, 3);
    } else if (mood === "full_score") {
      // 考满分：双手高举 100 分红色试卷
      const sy = -56;
      // 试卷白底
      o.fillStyle(0xffffff, 1);
      o.fillRect(-10, sy, 20, 15);
      o.lineStyle(1, 0xbdbdbd, 1);
      o.strokeRect(-10, sy, 20, 15);
      // 鲜红 "100" 墨水
      o.fillStyle(0xd32f2f, 1);
      // 1
      o.fillRect(-7, sy + 3, 2, 9);
      // 0
      o.strokeRect(-3, sy + 3, 4, 9);
      // 0
      o.strokeRect(3, sy + 3, 4, 9);

      // 试卷顶端考卷红花
      o.fillRect(-1, sy - 2, 2, 2);

      // 兴奋的金星微闪
      this.triggerGoldStars();
    } else if (mood === "champion") {
      // 夺冠：双手托举璀璨金色大奖杯！
      const ty = -62;
      // 奖杯金色双耳杯身
      o.fillStyle(pixelPalette.goldHighlight, 1);
      o.fillRect(-9, ty, 18, 10);
      o.fillRect(-6, ty + 10, 12, 4);
      o.fillRect(-3, ty + 14, 6, 3);
      o.fillRect(-7, ty + 17, 14, 3); // 底座
      // 左右杯耳
      o.fillRect(-12, ty + 2, 3, 7);
      o.fillRect(9, ty + 2, 3, 7);
      // 奖杯金色反光与红宝石
      o.fillStyle(0xffffff, 1);
      o.fillRect(-6, ty + 2, 3, 5);
      o.fillStyle(0xd32f2f, 1);
      o.fillRect(-2, ty + 4, 4, 4);

      // 持续喷射金色雨 (Gold Rain Confetti) 粒子动效！
      this.triggerGoldRainCelebration();
    }
  }

  /**
   * 考满分金色星光微闪
   */
  private triggerGoldStars(): void {
    if (this.celebrationEmitterTimer) return;

    this.celebrationEmitterTimer = this.scene.time.addEvent({
      delay: 260,
      loop: true,
      callback: () => {
        if (!this.scene || this.currentMood !== "full_score") {
          if (this.celebrationEmitterTimer) {
            this.celebrationEmitterTimer.destroy();
            this.celebrationEmitterTimer = undefined;
          }
          return;
        }

        const px = Phaser.Math.Between(-24, 24);
        const py = Phaser.Math.Between(-65, -45);
        const star = this.scene.add.graphics();
        star.fillStyle(pixelPalette.goldHighlight, 1);
        star.fillRect(0, 0, 3, 3);
        this.characterBodyContainer.add(star);
        star.setPosition(px, py);

        this.scene.tweens.add({
          targets: star,
          scaleX: 1.5,
          scaleY: 1.5,
          alpha: 0,
          y: py - 12,
          duration: 500,
          onComplete: () => star.destroy(),
        });
      },
    });
  }

  /**
   * 夺冠双手举杯头顶喷射金色雨 (Gold Rain) 粒子动效
   */
  private triggerGoldRainCelebration(): void {
    if (this.celebrationEmitterTimer) return;

    const goldColors = [
      pixelPalette.goldHighlight,
      pixelPalette.goldAccent,
      pixelPalette.goldGlint,
      0xffffff,
      0xffb300,
    ];

    this.celebrationEmitterTimer = this.scene.time.addEvent({
      delay: 150, // 快速喷射，营造盛大金雨氛围
      loop: true,
      callback: () => {
        if (!this.scene || this.currentMood !== "champion") {
          if (this.celebrationEmitterTimer) {
            this.celebrationEmitterTimer.destroy();
            this.celebrationEmitterTimer = undefined;
          }
          return;
        }

        // 每次喷射 2~3 颗金箔纸屑
        const count = Phaser.Math.Between(2, 3);
        for (let i = 0; i < count; i++) {
          const startX = Phaser.Math.Between(-36, 36);
          const startY = Phaser.Math.Between(-75, -55);
          const color = Phaser.Utils.Array.GetRandom(goldColors);

          const goldFoil = this.scene.add.graphics();
          goldFoil.fillStyle(color, 1);
          // 像素金条/金纸片 3x2 或 2x3
          const isWide = Math.random() > 0.5;
          goldFoil.fillRect(0, 0, isWide ? 4 : 2, isWide ? 2 : 4);
          this.characterBodyContainer.add(goldFoil);
          goldFoil.setPosition(startX, startY);

          // 飘扬洒落下落曲线动效
          this.scene.tweens.add({
            targets: goldFoil,
            y: startY + Phaser.Math.Between(60, 95),
            x: startX + Phaser.Math.Between(-20, 20),
            angle: Phaser.Math.Between(0, 360),
            alpha: 0,
            duration: Phaser.Math.Between(900, 1400),
            ease: Phaser.Math.Easing.Sine.In,
            onComplete: () => {
              goldFoil.destroy();
            },
          });
        }
      },
    });
  }

  // ==========================================
  //  肤色获取 (支持生病苍白与中老年温润色)
  // ==========================================
  private getSkinTone(isElder = false): number {
    if (this.currentMood === "sick") {
      // 生病面色青灰苍白
      return 0xccd7d4;
    }
    if (this.currentMood === "fever") {
      // 发烧面部潮红
      return 0xffc4b2;
    }
    if (isElder) {
      // 老年温润黄褐色
      return 0xf4dec5;
    }
    // 经典健康白润肤色
    return 0xffdfbe;
  }

  // ==========================================
  //  年龄与阶段标牌 (Tag)
  // ==========================================
  private renderTag(): void {
    if (!this.showTag) {
      this.tagContainer.setVisible(false);
      return;
    }

    this.tagContainer.setVisible(true);
    const stage = getStageByAge(this.currentAge);
    this.tagText.setText(`${stage.label.split(" ")[0]} · ${this.currentAge}岁`);
  }

  // ==========================================
  //  待机呼吸微动动画与眨眼系统
  // ==========================================
  private startBreathingAnimation(): void {
    if (this.breatheTween) {
      this.breatheTween.stop();
      this.breatheTween.remove();
    }

    // 细致入微的呼吸起伏：周期 2000ms，上下平移 1.5px，微缩放
    this.breatheTween = this.scene.tweens.add({
      targets: this.characterBodyContainer,
      y: 14.5,
      scaleY: 1.015,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: Phaser.Math.Easing.Sine.InOut,
    });
  }

  private setupBlinkTimer(): void {
    if (this.blinkTimer) {
      this.blinkTimer.destroy();
    }

    // 每 2.8 ~ 4.5 秒随机眨眼一次
    const nextBlinkDelay = Phaser.Math.Between(2800, 4500);
    this.blinkTimer = this.scene.time.delayedCall(nextBlinkDelay, () => {
      this.triggerBlink();
      this.setupBlinkTimer();
    });
  }

  public triggerBlink(): void {
    if (this.isBlinking) return;
    this.isBlinking = true;
    this.faceGraphics.clear();
    this.drawFacialFeatures();

    // 闭眼 120ms 后睁开
    this.scene.time.delayedCall(120, () => {
      this.isBlinking = false;
      this.faceGraphics.clear();
      this.drawFacialFeatures();
    });
  }

  // ==========================================
  //  外部交互与状态设置 API
  // ==========================================

  /**
   * 设置年龄（自动切换人生阶段、服饰与道具）
   */
  public setAge(age: number): this {
    if (this.currentAge === age) return this;
    this.currentAge = Math.max(0, Math.round(age));
    this.renderCharacter();
    this.renderTag();
    return this;
  }

  /**
   * 设置心情/状态表情
   */
  public setMood(mood: CharacterMood): this {
    if (this.currentMood === mood) return this;
    this.currentMood = mood;
    if (mood !== "champion" && mood !== "full_score" && this.celebrationEmitterTimer) {
      this.celebrationEmitterTimer.destroy();
      this.celebrationEmitterTimer = undefined;
    }
    this.renderCharacter();
    return this;
  }

  /**
   * 播放即时动作反馈
   */
  public playReaction(reaction: "celebrate" | "sick" | "strain" | "cheer"): void {
    switch (reaction) {
      case "celebrate":
      case "cheer":
        this.setMood("happy");
        // 向上欢呼小跳跃
        this.scene.tweens.add({
          targets: this.characterBodyContainer,
          y: 8,
          duration: 160,
          yoyo: true,
          repeat: 2,
          ease: Phaser.Math.Easing.Back.Out,
        });
        break;

      case "sick":
        this.setMood("sick");
        // 身体下沉无力
        this.scene.tweens.add({
          targets: this.characterBodyContainer,
          y: 19,
          duration: 300,
          ease: Phaser.Math.Easing.Cubic.Out,
        });
        break;

      case "strain":
        this.setMood("worried");
        // 身体左右微颤
        this.scene.tweens.add({
          targets: this.characterBodyContainer,
          x: { value: 3, duration: 60, yoyo: true, repeat: 3 },
        });
        break;
    }
  }

  public getAge(): number {
    return this.currentAge;
  }

  public getMood(): CharacterMood {
    return this.currentMood;
  }

  public override destroy(fromScene?: boolean): void {
    if (this.breatheTween) {
      this.breatheTween.stop();
      this.breatheTween.remove();
      this.breatheTween = undefined;
    }
    if (this.blinkTimer) {
      this.blinkTimer.destroy();
      this.blinkTimer = undefined;
    }
    if (this.celebrationEmitterTimer) {
      this.celebrationEmitterTimer.destroy();
      this.celebrationEmitterTimer = undefined;
    }
    super.destroy(fromScene);
  }
}

/**
 * 便捷工厂函数：创建全年龄角色动态展台
 */
export function createCharacterAvatarStage(
  scene: Phaser.Scene,
  options: CharacterAvatarStageOptions
): CharacterAvatarStage {
  return new CharacterAvatarStage(scene, options);
}
