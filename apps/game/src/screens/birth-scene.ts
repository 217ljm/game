import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../contracts";
import { p2Button } from "../ui/p2-screen-primitives";
import { bindInteractiveFeedback, DEFAULT_FONT_FAMILY } from "../ui/game-text";

/**
 * 统一标准高清中文字体栈
 */
const FONT_FAMILY = DEFAULT_FONT_FAMILY;

export interface BirthChoice {
  id: string;
  title: string;
  subtitle: string;
  gainDescription: string;
  tradeoff: string;
  direction: string;
  interestBonus: string;
  attributeBonus: string;
}

export const BIRTH_CHOICES: BirthChoice[] = [
  {
    id: "abacus_and_coupons",
    title: "算盘与粮票",
    subtitle: "自幼对数字与筹划敏感",
    gainDescription: "开启【商业与数理】启蒙倾向，适应与心算天资 +1",
    tradeoff: "需要多留心家庭账本与生活琐务",
    direction: "财富与物质积累",
    interestBonus: "interest_math_puzzle",
    attributeBonus: "adaptability",
  },
  {
    id: "storybook_and_pen",
    title: "小人书与钢笔",
    subtitle: "沉迷翻阅图画与文字符号",
    gainDescription: "开启【文学与表达】启蒙倾向，智力与专注天资 +1",
    tradeoff: "户外打闹较少，体能积累稍慢",
    direction: "表达与创造",
    interestBonus: "interest_reading",
    attributeBonus: "intellect",
  },
  {
    id: "dragonfly_and_clay",
    title: "竹蜻蜓与泥人",
    subtitle: "动手摆弄器物与户外玩耍",
    gainDescription: "开启【工巧与体魄】启蒙倾向，体能与交往天资 +1",
    tradeoff: "常在外面跑闹，容易弄脏衣裳",
    direction: "健康与身体力量",
    interestBonus: "interest_nature_collecting",
    attributeBonus: "physical",
  },
];

// 1978 年代经典男女姓名库与寄语
const CLASSIC_MALE_NAMES = [
  { name: "李建国", meaning: "建设家园，胸怀壮志，铭记时代起点" },
  { name: "王晓华", meaning: "破晓韶华，明理通达，如晨光初升" },
  { name: "陈春生", meaning: "春潮涌动，破土而生，充满生机与韧劲" },
  { name: "张志强", meaning: "意志刚毅，奋发图强，不畏生活艰辛" },
  { name: "刘国庆", meaning: "举国同庆，满怀赤诚，承载父母期望" },
  { name: "赵海涛", meaning: "时代浪潮，奔涌向前，开拓属于自己的一片天" },
  { name: "孙明辉", meaning: "明朗光辉，求知若渴，踏实稳健" },
  { name: "周卫东", meaning: "保卫家园，朝气蓬勃，勇担责任" },
];

const CLASSIC_FEMALE_NAMES = [
  { name: "李秀兰", meaning: "秀外慧中，兰质蕙心，勤劳持家" },
  { name: "王雪梅", meaning: "傲雪凌霜，坚韧纯洁，有坚韧不拔之志" },
  { name: "陈文静", meaning: "文雅安适，知书达礼，内心沉静通透" },
  { name: "张晓霞", meaning: "朝霞初展，明媚温暖，带来无尽欢笑" },
  { name: "刘丽娟", meaning: "秀丽娟秀，聪颖灵巧，待人真诚热情" },
  { name: "赵红梅", meaning: "冬去春来，红梅绽放，象征美好未来" },
  { name: "孙春燕", meaning: "春燕衔泥，勤勉劳作，飞向更广阔的天地" },
  { name: "周雅琴", meaning: "性情温和，多才多艺，深受家人关爱" },
];

export type BirthStage = "EYES_OPENING" | "PARENTS_TALK" | "NAMING";

export interface DialogueBeat {
  speaker: string;
  avatarIcon: string;
  color: number;
  textColorHex: string;
  borderColor: number;
  mood: string;
  quote: string;
}

const PARENTS_DIALOGUES: DialogueBeat[] = [
  {
    speaker: "襁褓中的你",
    avatarIcon: "👶",
    color: 0xff9e9e,
    textColorHex: "#ff9e9e",
    borderColor: 0xff9e9e,
    mood: "被年轻父母温柔捧在怀中，啼哭响彻产房",
    quote: "“哇——！哇——！哇——！”（嘹亮清脆的啼哭声响彻了整间产房）",
  },
  {
    speaker: "母亲",
    avatarIcon: "👩",
    color: 0xffe2b2,
    textColorHex: "#ffe2b2",
    borderColor: 0xffe2b2,
    mood: "满眼泪光，把你紧紧贴在心口轻拍安抚",
    quote: "“哦哦~ 乖宝不哭，妈妈在呢……瞧这小嗓门多嘹亮，哭得多有劲儿啊！”",
  },
  {
    speaker: "父亲",
    avatarIcon: "👨",
    color: 0x76cbb7,
    textColorHex: "#76cbb7",
    borderColor: 0x76cbb7,
    mood: "眼眶泛红，大手轻轻托着襁褓，激动得不知所措",
    quote: "“母子平安！咱老李家的大胖娃！哭声这么响，长大准是个顶天立地的好汉子！”",
  },
  {
    speaker: "母亲",
    avatarIcon: "👩",
    color: 0xffe2b2,
    textColorHex: "#ffe2b2",
    borderColor: 0xffe2b2,
    mood: "含泪微笑，看着渐渐安静、睁开清澈双眼的你",
    quote: "“他爹，趁着喜气，赶紧给咱娃起个响亮好记的名吧，寄托咱家一辈子的期盼。”",
  },
];

export interface BirthSceneActions {
  onComplete: (config: {
    seed: string;
    birthYear: number;
    name: string;
    gender: "male" | "female";
    chosenItem: string;
    interestBonus: string;
    attributeBonus: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export class BirthScene extends Phaser.Scene {
  private actions?: BirthSceneActions;
  private currentStage: BirthStage = "EYES_OPENING";
  private dialogueIndex: number = 0;
  private selectedGender: "male" | "female" = "male";
  private playerName: string = "李建国";
  private playerMeaning: string = "建设家园，胸怀壮志，铭记时代起点";
  private view!: Phaser.GameObjects.Group;
  private submitting: boolean = false;
  private eyesOpened: boolean = false;

  constructor(actions?: BirthSceneActions) {
    super("BirthScene");
    if (actions) this.actions = actions;
  }

  init(data?: { actions?: BirthSceneActions }): void {
    if (data?.actions) this.actions = data.actions;
    this.currentStage = "EYES_OPENING";
    this.dialogueIndex = 0;
    this.selectedGender = "male";
    this.playerName = "李建国";
    this.playerMeaning = "建设家园，胸怀壮志，铭记时代起点";
    this.submitting = false;
    this.eyesOpened = false;
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.view = this.add.group();
    this.render();
  }

  shutdown(): void {
    this.submitting = false;
    this.cleanupInputModal();
  }

  getUiDiagnostics(): Record<string, unknown> {
    return {
      protocol: "game-birth-v1",
      birthYear: 1978,
      stage: this.currentStage === "PARENTS_TALK" ? "EYES_OPENING" : this.currentStage,
      dialogueIndex: this.dialogueIndex,
      eyesOpened: this.eyesOpened,
      playerName: this.playerName,
      gender: this.selectedGender,
      submitting: this.submitting,
    };
  }

  private render(): void {
    this.view.clear(true, true);
    this.cleanupInputModal();

    switch (this.currentStage) {
      case "EYES_OPENING":
        this.renderEyesOpeningStage();
        break;
      case "PARENTS_TALK":
        this.renderParentsTalkStage();
        break;
      case "NAMING":
        this.renderNamingStage();
        break;
    }
  }

  // ==========================================
  // 辅助：全屏铺满背景图片 + 电影级暗角滤镜
  // ==========================================
  private renderFullscreenBackground(assetKey: string, alpha: number = 1.0): Phaser.GameObjects.Image | null {
    if (!this.textures.exists(assetKey)) return null;
    const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, assetKey);
    const scaleX = GAME_WIDTH / bg.width;
    const scaleY = GAME_HEIGHT / bg.height;
    const scale = Math.max(scaleX, scaleY);
    bg.setScale(scale);
    bg.setAlpha(alpha);
    this.view.add(bg);

    // 叠加顶部与底部电影级暗角遮罩，烘托年代感与层次
    const overlay = this.add.graphics();
    overlay.fillStyle(0x040a0d, 0.45).fillRect(0, 0, GAME_WIDTH, 140);
    overlay.fillStyle(0x040a0d, 0.72).fillRect(0, GAME_HEIGHT - 340, GAME_WIDTH, 340);
    this.view.add(overlay);

    return bg;
  }

  // ==========================================
  // 阶段 1：一进游戏展现第一视角真实睁眼动画（1978 时代晨曦晨光）
  // ==========================================
  private renderEyesOpeningStage(): void {
    // 全屏铺满 1978 年时代晨曦朝阳背景（绝不使用错乱的小孩吃饭图）
    this.renderFullscreenBackground("scene.title", 1.0);

    // 顶部时代徽章
    const topBadge = this.add.graphics();
    topBadge.fillStyle(0x081317, 0.88).fillRoundedRect(16, 24, 240, 36, 8);
    topBadge.lineStyle(1.5, 0xd4a359, 0.9).strokeRoundedRect(16, 24, 240, 36, 8);
    this.view.add(topBadge);

    const topBadgeText = this.add.text(28, 33, "1978 · 新生命的第一次睁眼", {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: "#ffe3ae",
    });
    this.view.add(topBadgeText);

    // 右上角常驻【⚡ 快速跳过】按钮
    this.renderQuickSkipButton();

    // 如果眼皮尚未拉开，创建全屏上下眼睑遮罩并执行真实眨眼缓动
    if (!this.eyesOpened) {
      const animContainer = this.add.container(0, 0);
      this.view.add(animContainer);

      // 上眼睑（黑色，带弧形边缘）
      const topLid = this.add.graphics();
      topLid.fillStyle(0x020507, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT / 2);
      topLid.fillStyle(0x020507, 1).fillEllipse(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH + 40, 60);

      // 下眼睑（黑色，带弧形边缘）
      const bottomLid = this.add.graphics();
      bottomLid.fillStyle(0x020507, 1).fillRect(0, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT / 2);
      bottomLid.fillStyle(0x020507, 1).fillEllipse(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH + 40, 60);

      // 暖黄色初光模糊失焦层
      const glowOverlay = this.add.graphics();
      glowOverlay.fillStyle(0xfff5db, 0.85).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // 视线初开时的文字旁白引导
      const centerHint = this.add.text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 - 20,
        "“哇——！”\n伴随着一声清脆啼哭\n你来到了这个充满希望的时代\n\n【 晨光初现，视线渐渐聚焦…… 】",
        {
          fontFamily: FONT_FAMILY,
          fontSize: "17px",
          lineSpacing: 12,
          color: "#fff8ed",
          fontStyle: "bold",
          align: "center",
        },
      ).setOrigin(0.5);

      animContainer.add([topLid, bottomLid, glowOverlay, centerHint]);

      // 自动执行睁眼动画
      this.tweens.add({
        targets: centerHint,
        alpha: 0,
        duration: 600,
        delay: 800,
      });

      this.tweens.add({
        targets: topLid,
        y: -GAME_HEIGHT / 2 - 30,
        duration: 1600,
        ease: "Power2.easeInOut",
        delay: 900,
      });

      this.tweens.add({
        targets: bottomLid,
        y: GAME_HEIGHT / 2 + 30,
        duration: 1600,
        ease: "Power2.easeInOut",
        delay: 900,
      });

      this.tweens.add({
        targets: glowOverlay,
        alpha: 0,
        duration: 1400,
        ease: "Sine.easeOut",
        delay: 1100,
        onComplete: () => {
          this.eyesOpened = true;
          animContainer.destroy();
          // 睁眼完成，平滑进入父母对白
          this.currentStage = "PARENTS_TALK";
          this.dialogueIndex = 0;
          this.render();
        },
      });

      // 支持点击快速跳过睁眼动画直接看清
      const clickShield = this.add.zone(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT);
      clickShield.setInteractive();
      clickShield.once("pointerdown", () => {
        this.eyesOpened = true;
        animContainer.destroy();
        this.currentStage = "PARENTS_TALK";
        this.dialogueIndex = 0;
        this.render();
      });
      this.view.add(clickShield);
    } else {
      this.currentStage = "PARENTS_TALK";
      this.render();
    }
  }

  // ==========================================
  // 阶段 2：标准 AVG 游戏人物对话框（全屏时代晨曦背景 + 规范黑金对话框）
  // ==========================================
  private renderParentsTalkStage(): void {
    // 全屏铺满 1978 时代晨曦大图（历史感与希望）
    this.renderFullscreenBackground("scene.title", 0.95);

    // 顶部时代提示
    const topBadge = this.add.graphics();
    topBadge.fillStyle(0x081317, 0.9).fillRoundedRect(16, 24, 240, 36, 8);
    topBadge.lineStyle(1.5, 0x76cbb7, 0.9).strokeRoundedRect(16, 24, 240, 36, 8);
    this.view.add(topBadge);

    const topBadgeText = this.add.text(28, 33, "1978 · 时代晨曦 · 产房之声", {
      fontFamily: FONT_FAMILY,
      fontSize: "14px",
      fontStyle: "bold",
      color: "#ffe3ae",
    });
    this.view.add(topBadgeText);

    // 当前对白数据
    const beat = PARENTS_DIALOGUES[this.dialogueIndex] ?? PARENTS_DIALOGUES[0];

    // 全屏标准 AVG 人物对话框底板 (X: 16, Y: 510, W: 358, H: 236)
    const boxX = 16;
    const boxY = 510;
    const boxW = 358;
    const boxH = 236;

    const boxG = this.add.graphics();
    boxG.fillStyle(0x061116, 0.96).fillRoundedRect(boxX, boxY, boxW, boxH, 14);
    boxG.lineStyle(2, 0xd4a359, 0.95).strokeRoundedRect(boxX, boxY, boxW, boxH, 14);
    this.view.add(boxG);

    // 1. 姓名徽标（底板与大字标签，置顶清晰渲染）
    const tagX = 30;
    const tagY = 526;
    const tagH = 32;

    const nameTag = this.add.graphics();
    nameTag.fillStyle(0x132a33, 1).fillRoundedRect(tagX, tagY, 136, tagH, 6);
    nameTag.lineStyle(1.5, beat.borderColor, 1).strokeRoundedRect(tagX, tagY, 136, tagH, 6);
    this.view.add(nameTag);

    const nameText = this.add.text(tagX + 12, tagY + 16, `${beat.avatarIcon} ${beat.speaker}`, {
      fontFamily: FONT_FAMILY,
      fontSize: "15px",
      fontStyle: "bold",
      color: beat.textColorHex,
    }).setOrigin(0, 0.5).setDepth(10);
    this.view.add(nameText);

    // 2. 角色神态动作说明（置于姓名下方，字号 13px，浅青灰）
    const moodText = this.add.text(30, 568, `（${beat.mood}）`, {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      color: "#8eb5b0",
      wordWrap: { width: 300, useAdvancedWrap: true },
    }).setDepth(10);
    this.view.add(moodText);

    // 3. 台词正文（18px 纯白加粗大字，行高 10px，开启高级中文折行）
    const quoteText = this.add.text(30, 604, beat.quote, {
      fontFamily: FONT_FAMILY,
      fontSize: "18px",
      lineSpacing: 10,
      wordWrap: { width: 300, useAdvancedWrap: true },
      color: "#ffffff",
      fontStyle: "bold",
    }).setDepth(10);
    this.view.add(quoteText);

    // 4. 底部信息条：Y: 708
    // 4. 底部信息条：Y: 708
    const progressText = this.add.text(30, 708, `【第 ${this.dialogueIndex + 1} / ${PARENTS_DIALOGUES.length} 幕】`, {
      fontFamily: FONT_FAMILY,
      fontSize: "12px",
      color: "#8a9c9b",
    }).setDepth(10);
    this.view.add(progressText);

    // 右上角常驻【⚡ 快速跳过】按钮
    this.renderQuickSkipButton();

    const isLastBeat = this.dialogueIndex >= PARENTS_DIALOGUES.length - 1;
    if (isLastBeat) {
      const nextBtnG = this.add.graphics();
      nextBtnG.fillStyle(0xb55a3c, 0.98).fillRoundedRect(184, 690, 160, 42, 10);
      nextBtnG.lineStyle(2, 0xffd8a1, 1).strokeRoundedRect(184, 690, 160, 42, 10);
      nextBtnG.setDepth(15);
      this.view.add(nextBtnG);

      const nextBtnText = this.add.text(264, 711, "【 商量起名 ▶ 】", {
        fontFamily: FONT_FAMILY,
        fontSize: "14px",
        fontStyle: "bold",
        color: "#ffffff",
        padding: { x: 2, y: 2 },
      }).setOrigin(0.5).setDepth(16);
      this.view.add(nextBtnText);

      const nextZone = this.add.rectangle(264, 711, 160, 42, 0x000000, 0);
      nextZone.setInteractive({ useHandCursor: true }).setDepth(25);
      nextZone.on("pointerdown", () => {
        this.currentStage = "NAMING";
        this.render();
      });
      this.view.add(nextZone);
    } else {
      const continueHint = this.add.text(344, 708, "点击屏幕继续 ▶", {
        fontFamily: FONT_FAMILY,
        fontSize: "13px",
        color: "#ffd8a1",
        fontStyle: "bold",
      }).setOrigin(1, 0).setDepth(10);
      this.view.add(continueHint);

      // 闪烁动画
      this.tweens.add({
        targets: continueHint,
        alpha: 0.3,
        yoyo: true,
        repeat: -1,
        duration: 600,
      });

      // 全屏轻触任意位置均可平滑步进对话（仅在非最后一幕生效）
      const clickZone = this.add.zone(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT);
      clickZone.setInteractive();
      clickZone.input!.cursor = "pointer";
      clickZone.on("pointerdown", () => {
        if (this.dialogueIndex < PARENTS_DIALOGUES.length - 1) {
          this.dialogueIndex++;
          this.render();
        }
      });
      clickZone.setDepth(2);
      this.view.add(clickZone);
    }

    // 底部返回按钮：Y: 768
    this.renderCancelButton(768);
  }

  // ==========================================
  // 阶段 3：父母商量起名（全景背景 + 气泡对白 + 复古金边 32px 大字名牌 + 居中单选）
  // ==========================================
  private renderNamingStage(): void {
    // 全屏铺满温馨房间背景
    this.renderFullscreenBackground("scene.growth", 0.95);

    // 顶部标题栏
    const topBar = this.add.graphics();
    topBar.fillStyle(0x081317, 0.9).fillRoundedRect(16, 24, 230, 40, 8);
    topBar.lineStyle(1.5, 0xd4a359, 0.9).strokeRoundedRect(16, 24, 230, 40, 8);
    this.view.add(topBar);

    const titleText = this.add.text(28, 33, "1978 · 父母商议起名", {
      fontFamily: FONT_FAMILY,
      fontSize: "14px",
      fontStyle: "bold",
      color: "#ffe3ae",
    });
    this.view.add(titleText);

    // 右上角常驻【⚡ 快速跳过】按钮
    this.renderQuickSkipButton();

    // 顶部父母对白气泡 (X: 16, Y: 72, W: 358, H: 76)
    const dialogY = 72;
    const dialogBg = this.add.graphics();
    dialogBg.fillStyle(0x0c1c22, 0.95).fillRoundedRect(16, dialogY, 358, 76, 12);
    dialogBg.lineStyle(1, 0x26424b, 1).strokeRoundedRect(16, dialogY, 358, 76, 12);
    this.view.add(dialogBg);

    const fatherTalk = this.add.text(28, dialogY + 12, "👨 父亲：“叫啥好呢？是按时代心愿还是咱家盼头？”", {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      color: "#76cbb7",
    });
    const motherTalk = this.add.text(28, dialogY + 42, "👩 母亲：“起个响亮好记、平平安安的名字就顶好！”", {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      color: "#ffe2b2",
    });
    this.view.add(fatherTalk);
    this.view.add(motherTalk);

    // 年代户籍起名信笺底板 (X: 16, Y: 168, W: 358, H: 494)
    const cardY = 168;
    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x081419, 0.95).fillRoundedRect(16, cardY, 358, 494, 14);
    cardBg.lineStyle(1.5, 0xd4a359, 0.9).strokeRoundedRect(16, cardY, 358, 494, 14);
    this.view.add(cardBg);

    // 1. 性别切换单选（整齐对称，字号 14px）
    const genderLabel = this.add.text(28, cardY + 18, "【 选择性别 】", {
      fontFamily: FONT_FAMILY,
      fontSize: "14px",
      fontStyle: "bold",
      color: "#ffd8a1",
    });
    this.view.add(genderLabel);

    const maleBtn = this.renderGenderOption(130, cardY + 12, "👦 男孩", this.selectedGender === "male", () => {
      this.selectedGender = "male";
      this.randomizeNameFromPool();
      this.render();
    });
    const femaleBtn = this.renderGenderOption(244, cardY + 12, "👧 女孩", this.selectedGender === "female", () => {
      this.selectedGender = "female";
      this.randomizeNameFromPool();
      this.render();
    });
    this.view.add(maleBtn);
    this.view.add(femaleBtn);

    // 2. 当前姓名展示牌（中央金边复古大字红木名牌，姓名 32px 大字）
    const namePlateY = cardY + 60;
    const namePlate = this.add.graphics();
    namePlate.fillStyle(0x081418, 0.98).fillRoundedRect(28, namePlateY, 334, 88, 10);
    namePlate.lineStyle(2, 0xd4a359, 1).strokeRoundedRect(28, namePlateY, 334, 88, 10);
    this.view.add(namePlate);

    const prefixText = this.add.text(42, namePlateY + 16, "定名：", {
      fontFamily: FONT_FAMILY,
      fontSize: "14px",
      color: "#8fa3a2",
    });
    this.view.add(prefixText);

    const nameText = this.add.text(96, namePlateY + 24, this.playerName, {
      fontFamily: FONT_FAMILY,
      fontSize: "32px",
      fontStyle: "bold",
      color: "#fff6ea",
    });
    this.view.add(nameText);

    // 3. 名字寄语与时代寓意
    const meaningY = cardY + 158;
    const meaningBg = this.add.graphics();
    meaningBg.fillStyle(0x09181d, 0.95).fillRoundedRect(28, meaningY, 334, 82, 8);
    meaningBg.lineStyle(1, 0x26424b, 1).strokeRoundedRect(28, meaningY, 334, 82, 8);
    this.view.add(meaningBg);

    const meaningTitle = this.add.text(38, meaningY + 10, "【 父母寄语与时代寓意 】", {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: "#ffd8a1",
    });
    const meaningContent = this.add.text(38, meaningY + 34, this.playerMeaning, {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      lineSpacing: 5,
      wordWrap: { width: 314 },
      color: "#8be5d1",
    });
    this.view.add(meaningTitle);
    this.view.add(meaningContent);

    // 4. 操作按钮行：【✏️ 手动输入】 与 【🎲 换个时代好名】
    const actionRowY = cardY + 252;

    // 自定义输入按钮
    const inputBtnG = this.add.graphics();
    inputBtnG.fillStyle(0x1a3842, 0.95).fillRoundedRect(28, actionRowY, 158, 50, 8);
    inputBtnG.lineStyle(1.5, 0x76cbb7, 0.9).strokeRoundedRect(28, actionRowY, 158, 50, 8);
    const inputBtnText = this.add.text(107, actionRowY + 25, "✏️ 手动输入姓名", {
      fontFamily: FONT_FAMILY,
      fontSize: "14px",
      fontStyle: "bold",
      color: "#e8fffa",
    }).setOrigin(0.5);
    this.view.add(inputBtnG);
    this.view.add(inputBtnText);

    const inputHit = this.add.rectangle(107, actionRowY + 25, 158, 50, 0x000000, 0);
    inputHit.setInteractive({ useHandCursor: true }).setDepth(20);
    inputHit.on("pointerdown", () => {
      this.openNameInputModal();
    });
    this.view.add(inputHit);

    // 随机时代好名按钮
    const randomBtnG = this.add.graphics();
    randomBtnG.fillStyle(0x1a3842, 0.95).fillRoundedRect(198, actionRowY, 164, 50, 8);
    randomBtnG.lineStyle(1.5, 0xd4a359, 0.9).strokeRoundedRect(198, actionRowY, 164, 50, 8);
    const randomBtnText = this.add.text(280, actionRowY + 25, "🎲 换个时代好名", {
      fontFamily: FONT_FAMILY,
      fontSize: "14px",
      fontStyle: "bold",
      color: "#fff3db",
    }).setOrigin(0.5);
    this.view.add(randomBtnG);
    this.view.add(randomBtnText);

    const randomHit = this.add.rectangle(280, actionRowY + 25, 164, 50, 0x000000, 0);
    randomHit.setInteractive({ useHandCursor: true }).setDepth(20);
    randomHit.on("pointerdown", () => {
      this.randomizeNameFromPool();
      this.render();
    });
    this.view.add(randomHit);

    // 5. 提示说明
    const hintText = this.add.text(
      28,
      cardY + 316,
      "可点击【手动输入姓名】自由为角色起名，或点击【换个时代好名】从 1978 年代经典名库中挑选。",
      {
        fontFamily: FONT_FAMILY,
        fontSize: "13px",
        lineSpacing: 5,
        wordWrap: { width: 334 },
        color: "#8a9c9b",
      },
    );
    this.view.add(hintText);

    // 底部下一步按钮：确认姓名，直接开启人生 (X: 16, Y: 684, W: 358, H: 54)
    const confirmNameG = this.add.graphics();
    confirmNameG.fillStyle(0xb55a3c, 0.98).fillRoundedRect(16, 684, 358, 54, 12);
    confirmNameG.lineStyle(2, 0xffd8a1, 1).strokeRoundedRect(16, 684, 358, 54, 12);
    confirmNameG.setDepth(15);
    this.view.add(confirmNameG);

    const confirmNameText = this.add.text(
      195,
      711,
      this.submitting ? "正在进入 1978 年…" : `【 确认定名：${this.playerName} · 开启 1978 人生 ▶ 】`,
      {
        fontFamily: FONT_FAMILY,
        fontSize: "16px",
        fontStyle: "bold",
        color: "#ffffff",
        padding: { x: 2, y: 2 },
      },
    ).setOrigin(0.5).setDepth(16);
    this.view.add(confirmNameText);

    const confirmHit = this.add.rectangle(195, 711, 358, 54, 0x000000, 0);
    confirmHit.setInteractive({ useHandCursor: true }).setDepth(25);
    confirmHit.on("pointerdown", () => {
      if (this.submitting) return;
      this.submitting = true;
      this.render();
      void (async () => {
        try {
          if (this.actions?.onComplete) {
            await this.actions.onComplete({
              seed: `life-${Date.now()}`,
              birthYear: 1978,
              name: this.playerName,
              gender: this.selectedGender,
              chosenItem: "pending_zhuazhou",
              interestBonus: "",
              attributeBonus: "",
            });
          }
          this.scene.start("GameFlowScene");
        } catch (err) {
          console.error("进入主游戏失败:", err);
          this.submitting = false;
          this.scene.start("GameFlowScene");
        }
      })();
    });
    this.view.add(confirmHit);

    // 底部返回按钮：Y: 768
    this.renderCancelButton(768);
  }

  // 渲染性别选项单选按钮
  private renderGenderOption(
    x: number,
    y: number,
    label: string,
    isSelected: boolean,
    onSelect: () => void,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    const bg = this.add.graphics();
    if (isSelected) {
      bg.fillStyle(0xd4a359, 1).fillRoundedRect(x, y, 104, 36, 8);
    } else {
      bg.fillStyle(0x0a161b, 0.85).fillRoundedRect(x, y, 104, 36, 8);
      bg.lineStyle(1, 0x3d5a63, 0.7).strokeRoundedRect(x, y, 104, 36, 8);
    }
    const txt = this.add.text(x + 52, y + 18, label, {
      fontFamily: FONT_FAMILY,
      fontSize: "14px",
      fontStyle: "bold",
      color: isSelected ? "#0a171a" : "#c1d0ce",
    }).setOrigin(0.5);

    bg.setInteractive(new Phaser.Geom.Rectangle(x, y, 104, 36), Phaser.Geom.Rectangle.Contains);
    bg.input!.cursor = "pointer";
    bindInteractiveFeedback(bg, {
      onPress: () => {
        onSelect();
      },
    });

    container.add([bg, txt]);
    return container;
  }

  // 从时代经典名字库中随机切换一个
  private randomizeNameFromPool(): void {
    const pool = this.selectedGender === "male" ? CLASSIC_MALE_NAMES : CLASSIC_FEMALE_NAMES;
    const filtered = pool.filter((item) => item.name !== this.playerName);
    const chosen = filtered[Math.floor(Math.random() * filtered.length)] ?? pool[0];
    this.playerName = chosen.name;
    this.playerMeaning = chosen.meaning;
  }

  // 调出全端友好的自定义姓名输入遮罩（支持 PC 键盘与移动端软键盘输入汉字）
  private openNameInputModal(): void {
    this.cleanupInputModal();

    const overlay = document.createElement("div");
    overlay.id = "birth-name-input-overlay";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.78)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "99999";
    overlay.style.backdropFilter = "blur(6px)";

    const dialog = document.createElement("div");
    dialog.style.width = "320px";
    dialog.style.background = "#12242a";
    dialog.style.border = "2px solid #d4a359";
    dialog.style.borderRadius = "12px";
    dialog.style.padding = "22px";
    dialog.style.boxShadow = "0 8px 32px rgba(0,0,0,0.85)";
    dialog.style.color = "#fff6ea";
    dialog.style.fontFamily = FONT_FAMILY;

    dialog.innerHTML = `
      <div style="font-size: 16px; font-weight: bold; color: #ffd8a1; margin-bottom: 12px; text-align: center;">
        ✏️ 为角色自定义起名
      </div>
      <div style="font-size: 13px; color: #a4b4b2; margin-bottom: 14px; line-height: 1.6;">
        请输入 2~4 字中文姓名，寄托你在 1978 年代人生的独特心愿：
      </div>
      <input id="birth-name-input-field" type="text" maxlength="6" value="${this.playerName}" style="
        width: 100%;
        box-sizing: border-box;
        padding: 12px 14px;
        background: #09161a;
        border: 1.5px solid #76cbb7;
        border-radius: 8px;
        color: #ffffff;
        font-size: 20px;
        font-weight: bold;
        text-align: center;
        outline: none;
        margin-bottom: 18px;
      " />
      <div style="display: flex; gap: 12px;">
        <button id="birth-name-cancel-btn" style="
          flex: 1;
          padding: 10px 0;
          background: #1d333b;
          border: 1px solid #3d5a63;
          border-radius: 8px;
          color: #c1d0ce;
          font-size: 14px;
          cursor: pointer;
        ">取消</button>
        <button id="birth-name-confirm-btn" style="
          flex: 1;
          padding: 10px 0;
          background: #d4a359;
          border: none;
          border-radius: 8px;
          color: #0a161b;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
        ">确认定名</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const inputField = document.getElementById("birth-name-input-field") as HTMLInputElement;
    inputField?.focus();
    inputField?.select();

    const handleConfirm = () => {
      const val = inputField?.value?.trim();
      if (val && val.length >= 1) {
        this.playerName = val;
        this.playerMeaning = `自定义姓名【${val}】：承载着你独特的个性与期许，开启一生传奇`;
      }
      this.cleanupInputModal();
      this.render();
    };

    document.getElementById("birth-name-confirm-btn")?.addEventListener("click", handleConfirm);
    document.getElementById("birth-name-cancel-btn")?.addEventListener("click", () => {
      this.cleanupInputModal();
    });

    inputField?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        handleConfirm();
      }
    });
  }

  // 渲染右上角【⚡ 快速跳过】按钮
  private renderQuickSkipButton(y: number = 24): void {
    const skipG = this.add.graphics();
    skipG.fillStyle(0xd97706, 0.95).fillRoundedRect(GAME_WIDTH - 110, y, 94, 34, 8);
    skipG.lineStyle(1.5, 0xfbbf24, 1).strokeRoundedRect(GAME_WIDTH - 110, y, 94, 34, 8);
    skipG.setDepth(25);
    this.view.add(skipG);

    const skipT = this.add.text(GAME_WIDTH - 63, y + 17, "⚡ 快速跳过", {
      fontFamily: FONT_FAMILY,
      fontSize: "12px",
      fontStyle: "bold",
      color: "#ffffff",
    }).setOrigin(0.5).setDepth(26);
    this.view.add(skipT);

    const skipHit = this.add.rectangle(GAME_WIDTH - 63, y + 17, 94, 34, 0x000000, 0);
    skipHit.setInteractive({ useHandCursor: true }).setDepth(27);
    skipHit.on("pointerdown", () => {
      if (this.submitting) return;
      this.submitting = true;
      this.render();
      void (async () => {
        try {
          if (this.actions?.onComplete) {
            await this.actions.onComplete({
              seed: `life-skip-${Date.now()}`,
              birthYear: 1978,
              name: this.playerName || "李建国",
              gender: this.selectedGender,
              chosenItem: "pending_zhuazhou",
              interestBonus: "",
              attributeBonus: "",
            });
          }
          this.scene.start("GameFlowScene");
        } catch (err) {
          console.error("跳过失败兜底:", err);
          this.submitting = false;
          this.scene.start("GameFlowScene");
        }
      })();
    });
    this.view.add(skipHit);
  }

  private cleanupInputModal(): void {
    const existing = document.getElementById("birth-name-input-overlay");
    if (existing) existing.remove();
  }

  private renderCancelButton(y: number, label: string = "← 返回主菜单"): void {
    const cancelText = this.add.text(GAME_WIDTH / 2, y + 10, label, {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      color: "#8a9c9b",
    }).setOrigin(0.5).setDepth(20);

    const cancelHit = this.add.rectangle(GAME_WIDTH / 2, y + 10, 140, 30, 0x000000, 0);
    cancelHit.setInteractive({ useHandCursor: true }).setDepth(25);
    cancelHit.on("pointerdown", () => {
      if (this.submitting) return;
      this.actions?.onCancel();
      this.scene.start("MainMenuScene");
    });
    this.view.add(cancelText);
    this.view.add(cancelHit);
  }
}
