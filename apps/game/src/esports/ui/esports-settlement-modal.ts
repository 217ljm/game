import Phaser from "phaser";
import { DEFAULT_FONT_FAMILY, GAME_RESOLUTION } from "../../ui/game-text.ts";

export interface TeamMemberDamageStat {
  roleName: string;
  heroName: string;
  playerName: string;
  damage: number;
  sharePercent: number; // 如 38 代表 38%
  isPlayer: boolean;
}

export interface EsportsSettlementData {
  isWin: boolean;
  myTeamName: string;
  opponentTeamName: string;
  matchScore: [number, number]; // [2, 0]
  kills: number;
  deaths: number;
  assists: number;
  kda: string;
  isMvp: boolean;
  mvpRating: number; // 9.8
  mvpPlayerName: string;
  mvpHeroName: string;
  damageShare: number;
  goldEarned: number;
  prizeMoney: number; // ¥25,000
  clubPointsDelta: number; // +2
  fansGained: number; // +18,500
  standingsNote: string;
}

export interface EsportsSettlementModalConfig {
  scene: Phaser.Scene;
  x?: number;
  y?: number;
  width?: number; // 390
  height?: number; // 844
  data?: Partial<EsportsSettlementData>;
  onConfirm?: () => void;
}

/**
 * 赛后结算与荣誉面板 (EsportsSettlementModal)
 * 核心功能：
 * 1. 胜利/失利大横幅与金色粒子演出；
 * 2. MVP 荣誉勋章评定（桂冠、评分、高光战术评语）；
 * 3. 赛后全队伤害占比柱状图（Damage Breakdown Bar Chart）；
 * 4. 赛事奖金、俱乐部积分与粉丝增长结算卡片；
 * 5. 领奖归队交互闭环。
 */
export class EsportsSettlementModal extends Phaser.GameObjects.Container {
  private readonly modalWidth: number;
  private readonly modalHeight: number;
  private readonly modalData: EsportsSettlementData;
  private onConfirmCallback?: () => void;

  constructor(config: EsportsSettlementModalConfig) {
    super(config.scene, config.x ?? 0, config.y ?? 0);
    this.modalWidth = config.width ?? 390;
    this.modalHeight = config.height ?? 844;
    this.onConfirmCallback = config.onConfirm;

    this.modalData = {
      isWin: config.data?.isWin ?? true,
      myTeamName: config.data?.myTeamName ?? "BLG 战队",
      opponentTeamName: config.data?.opponentTeamName ?? "T1 战队",
      matchScore: config.data?.matchScore ?? [2, 0],
      kills: config.data?.kills ?? 11,
      deaths: config.data?.deaths ?? 1,
      assists: config.data?.assists ?? 14,
      kda: config.data?.kda ?? "11/1/14",
      isMvp: config.data?.isMvp ?? true,
      mvpRating: config.data?.mvpRating ?? 9.8,
      mvpPlayerName: config.data?.mvpPlayerName ?? "你 (中单)",
      mvpHeroName: config.data?.mvpHeroName ?? "影流之主",
      damageShare: config.data?.damageShare ?? 38,
      goldEarned: config.data?.goldEarned ?? 18600,
      prizeMoney: config.data?.prizeMoney ?? 25000,
      clubPointsDelta: config.data?.clubPointsDelta ?? 2,
      fansGained: config.data?.fansGained ?? 18500,
      standingsNote: config.data?.standingsNote ?? "战队胜场 +1，积分榜稳居前列！",
    };

    this.createModalElements();
    this.scene.add.existing(this);
  }

  private createModalElements(): void {
    const w = this.modalWidth;
    const h = this.modalHeight;

    // 1. 深色赛博遮罩
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x050c17, 0.96);
    bg.fillRect(0, 0, w, h);
    this.add(bg);

    // 2. 胜负大横幅与彩带光芒 (顶部高度 82)
    this.createBannerSection(w, 16);

    // 3. MVP 荣誉勋章评定卡片 (高度 140)
    this.createMvpSection(w, 106);

    // 4. 赛后全队伤害占比柱状图 (高度 235)
    this.createDamageChartSection(w, 254);

    // 5. 奖金、积分与粉丝结算面板 (高度 180)
    this.createRewardsSection(w, 498);

    // 6. 底部领奖归队按钮 (高度 54)
    this.createConfirmFooter(w, 730);
  }

  private createBannerSection(w: number, startY: number): void {
    const isWin = this.modalData.isWin;
    const bannerBox = this.scene.add.graphics();
    bannerBox.fillStyle(isWin ? 0x78350f : 0x1e293b, 0.98);
    bannerBox.fillRoundedRect(12, startY, w - 24, 82, 8);
    bannerBox.lineStyle(2, isWin ? 0xf59e0b : 0x64748b, 1);
    bannerBox.strokeRoundedRect(12, startY, w - 24, 82, 8);
    this.add(bannerBox);

    const title = this.scene.add.text(w / 2, startY + 24, isWin ? "🏆 VICTORY 斩获正式赛大胜！" : "💔 DEFEAT 鏖战惜败！", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "18px",
      fontStyle: "bold",
      color: isWin ? "#fef08a" : "#cbd5e1",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);

    const sub = this.scene.add.text(w / 2, startY + 54, `${this.modalData.myTeamName} [ ${this.modalData.matchScore[0]} : ${this.modalData.matchScore[1]} ] ${this.modalData.opponentTeamName} · 全场解说起立欢呼！`, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "11px",
      color: isWin ? "#fed7aa" : "#94a3b8",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);

    this.add([title, sub]);
  }

  private createMvpSection(w: number, startY: number): void {
    const mvpBox = this.scene.add.graphics();
    mvpBox.fillStyle(0x0f172a, 0.96);
    mvpBox.fillRoundedRect(12, startY, w - 24, 138, 8);
    mvpBox.lineStyle(1.5, 0xf59e0b, 0.9);
    mvpBox.strokeRoundedRect(12, startY, w - 24, 138, 8);
    this.add(mvpBox);

    // 左侧 MVP 桂冠徽章
    const medalIcon = this.scene.add.text(38, startY + 38, "🏅", { fontSize: "40px" }).setOrigin(0.5);
    const mvpTag = this.scene.add.text(38, startY + 74, "MVP", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: "#fbbf24",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);

    // 居中 MVP 评定信息
    const mvpTitle = this.scene.add.text(76, startY + 16, `【本场最佳 MVP 评定】`, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: "#ffd8a1",
      resolution: GAME_RESOLUTION,
    });

    const playerName = this.scene.add.text(76, startY + 38, `选手：${this.modalData.mvpPlayerName} · ${this.modalData.mvpHeroName}`, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "12px",
      fontStyle: "bold",
      color: "#ffffff",
      resolution: GAME_RESOLUTION,
    });

    const kdaText = this.scene.add.text(76, startY + 58, `战绩：${this.modalData.kda} (超神) · 伤害占比: ${this.modalData.damageShare}%`, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "11px",
      color: "#34d399",
      resolution: GAME_RESOLUTION,
    });

    const ratingText = this.scene.add.text(w - 24, startY + 22, `${this.modalData.mvpRating}分`, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "20px",
      fontStyle: "bold",
      color: "#fbbf24",
      resolution: GAME_RESOLUTION,
    }).setOrigin(1, 0);

    const quoteText = this.scene.add.text(76, startY + 84, "“毫无悬念的绝对主宰！多次单杀挽狂澜，万军丛中直取核心！”", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "10.5px",
      fontStyle: "italic",
      color: "#94a3b8",
      wordWrap: { width: w - 100, useAdvancedWrap: true },
      resolution: GAME_RESOLUTION,
    });

    this.add([medalIcon, mvpTag, mvpTitle, playerName, kdaText, ratingText, quoteText]);
  }

  private createDamageChartSection(w: number, startY: number): void {
    const chartBox = this.scene.add.graphics();
    chartBox.fillStyle(0x0a1622, 0.96);
    chartBox.fillRoundedRect(12, startY, w - 24, 234, 8);
    chartBox.lineStyle(1.5, 0x1e3a5f, 0.9);
    chartBox.strokeRoundedRect(12, startY, w - 24, 234, 8);
    this.add(chartBox);

    const title = this.scene.add.text(22, startY + 10, "📊 赛后全队伤害占比统计 (Damage Breakdown)", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "11.5px",
      fontStyle: "bold",
      color: "#38bdf8",
      resolution: GAME_RESOLUTION,
    });
    this.add(title);

    // 5 个位置的伤害数据
    const damages: TeamMemberDamageStat[] = [
      { roleName: "上单", heroName: "纳尔", playerName: "队友A", damage: 16800, sharePercent: 16, isPlayer: false },
      { roleName: "打野", heroName: "盲僧", playerName: "队友B", damage: 13200, sharePercent: 13, isPlayer: false },
      { roleName: "中单", heroName: this.modalData.mvpHeroName, playerName: "你", damage: 38400, sharePercent: 38, isPlayer: true },
      { roleName: "射手", heroName: "卡莎", playerName: "队友C", damage: 27500, sharePercent: 26, isPlayer: false },
      { roleName: "辅助", heroName: "泰坦", playerName: "队友D", damage: 7400, sharePercent: 7, isPlayer: false },
    ];

    const maxBarW = w - 160;
    const barStartY = startY + 36;

    damages.forEach((d, idx) => {
      const rowY = barStartY + idx * 38;

      // 角色标签
      const roleText = this.scene.add.text(22, rowY + 4, `[${d.roleName}] ${d.playerName}`, {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "10.5px",
        fontStyle: d.isPlayer ? "bold" : "normal",
        color: d.isPlayer ? "#fbbf24" : "#e2e8f0",
        resolution: GAME_RESOLUTION,
      });

      // 伤害条底槽
      const barG = this.scene.add.graphics();
      barG.fillStyle(0x0f2233, 0.9);
      barG.fillRoundedRect(95, rowY, maxBarW, 14, 3);
      barG.lineStyle(1, 0x1e293b, 0.8);
      barG.strokeRoundedRect(95, rowY, maxBarW, 14, 3);

      // 填充百分比柱状条
      const fillW = Math.max(8, (d.sharePercent / 50) * maxBarW);
      barG.fillStyle(d.isPlayer ? 0xf59e0b : 0x0284c7, 1);
      barG.fillRoundedRect(95, rowY, fillW, 14, 3);
      this.add(barG);

      // 伤害数字与百分比
      const statText = this.scene.add.text(w - 24, rowY + 2, `${d.sharePercent}% (${Math.round(d.damage / 1000)}k)`, {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: "10.5px",
        fontStyle: d.isPlayer ? "bold" : "normal",
        color: d.isPlayer ? "#fef08a" : "#94a3b8",
        resolution: GAME_RESOLUTION,
      }).setOrigin(1, 0);

      this.add([roleText, statText]);
    });
  }

  private createRewardsSection(w: number, startY: number): void {
    const rewBox = this.scene.add.graphics();
    rewBox.fillStyle(0x071520, 0.96);
    rewBox.fillRoundedRect(12, startY, w - 24, 218, 8);
    rewBox.lineStyle(1.5, 0x0284c7, 0.9);
    rewBox.strokeRoundedRect(12, startY, w - 24, 218, 8);
    this.add(rewBox);

    const title = this.scene.add.text(22, startY + 12, "💰 赛事收益与俱乐部积分结算：", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "12px",
      fontStyle: "bold",
      color: "#ffd8a1",
      resolution: GAME_RESOLUTION,
    });
    this.add(title);

    // 1. 奖金
    const prizeT = this.scene.add.text(22, startY + 38, `💵 选手比赛奖金分成到账：+ ¥${this.modalData.prizeMoney.toLocaleString()}`, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "12.5px",
      fontStyle: "bold",
      color: "#34d399",
      resolution: GAME_RESOLUTION,
    });

    // 2. 积分
    const pointT = this.scene.add.text(22, startY + 66, `🏆 俱乐部常规赛积分：+ ${this.modalData.clubPointsDelta} 积分 (胜场 +1)`, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "12px",
      color: "#38bdf8",
      resolution: GAME_RESOLUTION,
    });

    // 3. 粉丝
    const fanT = this.scene.add.text(22, startY + 92, `📣 电竞个人粉丝增长：+ ${this.modalData.fansGained.toLocaleString()} 忠实支持者`, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "12px",
      color: "#fbbf24",
      resolution: GAME_RESOLUTION,
    });

    // 4. 战队评述
    const noteT = this.scene.add.text(22, startY + 122, `📌 俱乐部状态：${this.modalData.standingsNote}\n全队士气高涨，主教练高度肯定了你在决胜局的定海神针表现！`, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "11px",
      lineSpacing: 4,
      color: "#cbd5e1",
      wordWrap: { width: w - 48, useAdvancedWrap: true },
      resolution: GAME_RESOLUTION,
    });

    this.add([prizeT, pointT, fanT, noteT]);
  }

  private createConfirmFooter(w: number, startY: number): void {
    const footerBtn = this.scene.add.container(12, startY);
    const btnW = w - 24;
    const btnH = 50;

    const g = this.scene.add.graphics();
    g.fillStyle(0xb45309, 1);
    g.fillRoundedRect(0, 0, btnW, btnH, 8);
    g.lineStyle(2, 0xfbbf24, 1);
    g.strokeRoundedRect(0, 0, btnW, btnH, 8);

    const t = this.scene.add.text(btnW / 2, btnH / 2, "【 🏆 荣誉归队 · 备战下一轮赛事 ▶ 】", {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: "15px",
      fontStyle: "bold",
      color: "#ffffff",
      resolution: GAME_RESOLUTION,
    }).setOrigin(0.5);

    const hit = this.scene.add.rectangle(btnW / 2, btnH / 2, btnW, btnH, 0x000000, 0);
    hit.setInteractive({ useHandCursor: true });
    hit.on("pointerdown", () => {
      if (this.onConfirmCallback) {
        this.onConfirmCallback();
      }
      this.destroy();
    });

    footerBtn.add([g, t, hit]);
    this.add(footerBtn);
  }
}
