import type { PresentationCue } from "../contracts";

/** P1 fallback feedback until authored audio assets are frozen. */
export class ProceduralGameFeedback {
  private context: AudioContext | null = null;

  play(cue: PresentationCue): void {
    const tone = this.toneFor(cue.type);
    if (!tone || typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext
      ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    this.context ??= new AudioContextClass();
    const playTone = () => {
      const context = this.context;
      if (!context || context.state === "closed") return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(tone.frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(tone.endFrequency, now + tone.duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.035, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + tone.duration + 0.01);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    };
    if (this.context.state === "suspended") void this.context.resume().then(playTone).catch(() => undefined);
    else playTone();
  }

  vibrate(cue: PresentationCue): void {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
    if (cue.type === "action.scheduled") navigator.vibrate(12);
    else if (["quarter.complete", "event.interrupt", "year.advance"].includes(cue.type)) navigator.vibrate([18, 28, 22]);
  }

  destroy(): void {
    const context = this.context;
    this.context = null;
    if (context && context.state !== "closed") void context.close().catch(() => undefined);
  }

  private toneFor(type: PresentationCue["type"]): { frequency: number; endFrequency: number; duration: number } | null {
    if (type === "action.scheduled") return { frequency: 420, endFrequency: 610, duration: 0.09 };
    if (type === "event.interrupt") return { frequency: 330, endFrequency: 250, duration: 0.16 };
    if (type === "quarter.complete") return { frequency: 390, endFrequency: 720, duration: 0.22 };
    if (type === "year.advance") return { frequency: 460, endFrequency: 860, duration: 0.28 };
    return null;
  }
}
