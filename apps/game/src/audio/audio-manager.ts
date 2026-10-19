/**
 * @file audio-manager.ts
 * @description 《1978—一生》全局高品质音频管理系统
 * 采用 Web Audio API 纯原生合成与环境声场模拟，无需外部庞大音频包，
 * 即可随时随地提供温暖怀旧的 1978 时代旋律（八音盒/复古钢琴）与细腻的操作音效（纸张翻页、木质按键、钟表齿轮、成长铃音）。
 */

export type BgmTheme = "nostalgia_theme" | "daily_life" | "birth_dawn";
export type SfxType = "click" | "page_flip" | "stat_ding" | "quarter_tick" | "milestone";

export class AudioManager {
  private static instance: AudioManager | null = null;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isMuted: boolean = false;
  private currentTheme: BgmTheme | null = null;
  private bgmTimer: number | null = null;
  private isInitialized: boolean = false;

  private constructor() {
    // 延迟初始化，等待首次用户手势
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /**
   * 初始化音频上下文（需用户首次交互触发以绕过浏览器 Autoplay 策略）
   */
  public initContext(): void {
    if (this.isInitialized && this.ctx && this.ctx.state !== "suspended") return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.bgmGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();

        this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
        this.bgmGain.gain.setValueAtTime(0.45, this.ctx.currentTime);
        this.sfxGain.gain.setValueAtTime(0.65, this.ctx.currentTime);

        this.bgmGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
      }

      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }

      this.isInitialized = true;

      // 如果有挂起的 BGM，立即播放
      if (this.currentTheme) {
        this.playBgm(this.currentTheme);
      }
    } catch (e) {
      console.warn("[AudioManager] 音频上下文初始化延迟：", e);
    }
  }

  /**
   * 播放怀旧时代背景音乐
   */
  public playBgm(theme: BgmTheme): void {
    this.currentTheme = theme;
    if (!this.ctx || this.ctx.state === "suspended") return;
    if (this.isMuted) return;

    this.stopBgm();

    // 时代五声音阶与和弦进行：C, D, E, G, A (宫商角徵羽，充满东方怀旧温情)
    const notes = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
    const melodyPattern = [
      [2, 4, 7, 4], // E, G, High E, G
      [0, 2, 4, 2], // C, D, E, D
      [4, 5, 4, 2], // E, A, E, D
      [0, 2, 0, 4], // C, D, C, E
    ];

    let bar = 0;
    let step = 0;

    const playNextNote = () => {
      if (!this.ctx || this.isMuted) return;
      const noteIdx = melodyPattern[bar % melodyPattern.length][step % 4];
      const freq = notes[noteIdx] || 329.63;

      this.synthGentleChime(freq, 0.7);

      step++;
      if (step >= 4) {
        step = 0;
        bar++;
      }

      // 每拍 580ms，舒缓宁静的时光漫步节奏
      this.bgmTimer = window.setTimeout(playNextNote, 580);
    };

    playNextNote();
  }

  /**
   * 停止 BGM
   */
  public stopBgm(): void {
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  /**
   * 合成轻柔温润的音乐八音盒/钢琴单音
   */
  private synthGentleChime(freq: number, duration: number): void {
    if (!this.ctx || !this.bgmGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // 采用正弦波 + 三角波混合模拟温暖八音盒
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);

    // 低通滤波器滤除刺耳高频，营造木质箱体泛音
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1400, now);

    // 柔和的琴锤敲击包络：瞬态轻起，平滑长衰减
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  /**
   * 播放操作音效
   */
  public playSfx(type: SfxType): void {
    if (!this.isInitialized) {
      this.initContext();
    }
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;

    switch (type) {
      case "click": {
        // 木质触键声 (Wood Tap)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.07);
        break;
      }

      case "page_flip": {
        // 纸张轻柔翻动声 (Paper Shuffle)
        const bufferSize = this.ctx.sampleRate * 0.12;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(1200, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        noise.start(now);
        break;
      }

      case "stat_ding": {
        // 属性成长空灵小风铃 (Level Up Ding)
        [523.25, 659.25, 783.99].forEach((f, i) => {
          if (!this.ctx || !this.sfxGain) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(f, now + i * 0.06);

          gain.gain.setValueAtTime(0.2, now + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.35);

          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now + i * 0.06);
          osc.stop(now + i * 0.06 + 0.36);
        });
        break;
      }

      case "quarter_tick": {
        // 季度时钟齿轮与钟鸣
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.18);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.23);
        break;
      }

      case "milestone": {
        // 重大里程碑金光盛大和弦
        [261.63, 329.63, 392.0, 523.25].forEach((f, i) => {
          if (!this.ctx || !this.sfxGain) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(f, now + i * 0.08);

          gain.gain.setValueAtTime(0.25, now + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.8);

          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.85);
        });
        break;
      }
    }
  }

  /**
   * 切换静音状态
   */
  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    if (!this.isMuted && this.currentTheme) {
      this.playBgm(this.currentTheme);
    } else if (this.isMuted) {
      this.stopBgm();
    }
    return this.isMuted;
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }
}
