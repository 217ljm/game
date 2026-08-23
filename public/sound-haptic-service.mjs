/**
 * 《人生轨迹》轻量时代音效与触觉反馈系统 (Sound & Haptics Engine)
 * 采用 Web Audio API 实时算法合成，无需下载外部音频文件（零延迟、零网络请求、零体积）。
 * 自动适配 Web、移动端浏览器及微信/抖音小游戏振动接口。
 */

let audioContext = null;
let soundEnabled = true;
let hapticEnabled = true;

/**
 * 获取或激活单例 AudioContext
 */
function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioContext) {
    audioContext = new AudioCtx();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => null);
  }
  return audioContext;
}

/**
 * 触发触觉振动反馈
 * @param {"light" | "medium" | "heavy" | "stamp" | "success"} type 
 */
export function triggerHaptic(type = "light") {
  if (!hapticEnabled || typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    switch (type) {
      case "light":
        navigator.vibrate(12);
        break;
      case "medium":
        navigator.vibrate(25);
        break;
      case "heavy":
        navigator.vibrate(45);
        break;
      case "stamp":
        navigator.vibrate([35, 30, 20]);
        break;
      case "success":
        navigator.vibrate([15, 40, 25]);
        break;
      default:
        navigator.vibrate(15);
    }
  } catch {
    // 忽略不支持平台报错
  }
}

/**
 * 播放算法合成时代音效
 * @param {"click" | "page" | "stamp" | "reward" | "choice" | "warning"} type 
 */
export function playSound(type = "click") {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    
    if (type === "click") {
      // 木质轻脆微咔哒
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.035);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.035);
    } else if (type === "choice") {
      // 选中行动时的柔和弹响
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(580, now + 0.06);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === "page") {
      // 宣纸翻页沙沙声（低通白噪声模拟）
      const bufferSize = ctx.sampleRate * 0.08;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1400, now);
      filter.Q.setValueAtTime(1.8, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      whiteNoise.start(now);
    } else if (type === "stamp") {
      // 厚重朱红印章闷响（低频冲激 + 余震）
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.16);
      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === "reward") {
      // 季度结算/金币五度清亮泛音
      [523.25, 659.25, 783.99].forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const offset = index * 0.05;
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + offset);
        gain.gain.setValueAtTime(0.14, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.18);
      });
    } else if (type === "warning") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(230, now);
      osc.frequency.setValueAtTime(180, now + 0.07);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    }
  } catch {
    // 忽略音频播放异常
  }
}

/**
 * 设置全局音效开启状态
 * @param {boolean} enabled 
 */
export function setSoundEnabled(enabled) {
  soundEnabled = Boolean(enabled);
}

/**
 * 获取全局音效开启状态
 */
export function isSoundEnabled() {
  return soundEnabled;
}

/**
 * 设置全局触觉振动开启状态
 * @param {boolean} enabled 
 */
export function setHapticEnabled(enabled) {
  hapticEnabled = Boolean(enabled);
}

/**
 * 获取全局触觉振动开启状态
 */
export function isHapticEnabled() {
  return hapticEnabled;
}
