/**
 * 轻场景Cue导演：只表现已确定的Cue，不参与模拟事实计算。
 * 模式：full / reduced / off。跳过会完成当前队列，不改变命令或事实。
 */
export class CueDirector {
  constructor(options = {}) {
    this.mode = options.mode === "off" || options.mode === "reduced" ? options.mode : "full";
    this.resolveTarget = typeof options.resolveTarget === "function" ? options.resolveTarget : () => null;
    this.onStart = typeof options.onStart === "function" ? options.onStart : () => {};
    this.onComplete = typeof options.onComplete === "function" ? options.onComplete : () => {};
    this.onError = typeof options.onError === "function" ? options.onError : () => {};
    this.current = null;
    this.skipRequested = false;
    this.runToken = 0;
  }

  setMode(mode) {
    this.mode = mode === "off" || mode === "reduced" ? mode : "full";
  }

  skip() {
    this.skipRequested = true;
    if (typeof this.current?.finish === "function") this.current.finish();
    if (this.current?.animation && typeof this.current.animation.finish === "function") {
      try { this.current.animation.finish(); } catch { /* 浏览器不支持finish时由兜底完成 */ }
    }
  }

  cancel() {
    this.runToken += 1;
    this.skipRequested = true;
    if (this.current?.animation && typeof this.current.animation.cancel === "function") {
      try { this.current.animation.cancel(); } catch { /* 无需向上抛出表现层取消错误 */ }
    }
    this.current = null;
  }

  async play(cues = [], context = {}) {
    const queue = Array.isArray(cues) ? cues.filter(Boolean) : [];
    const token = ++this.runToken;
    this.skipRequested = false;
    const results = [];
    for (let index = 0; index < queue.length; index += 1) {
      if (token !== this.runToken) break;
      results.push(await this.playCue(queue[index], context, token));
      if (this.skipRequested) {
        for (let rest = index + 1; rest < queue.length; rest += 1) {
          if (token !== this.runToken) break;
          results.push(await this.playCue(queue[rest], context, token));
        }
        break;
      }
    }
    this.current = null;
    return results;
  }

  async playCue(cue, context, token) {
    if (!cue || token !== this.runToken) return { cue, skipped: true };
    const skipped = this.skipRequested || this.mode === "off" || cue.skipped === true;
    const durationMs = skipped ? 0 : this.mode === "reduced" ? Math.min(Number(cue.durationMs) || 0, 180) : Math.max(0, Number(cue.durationMs) || 0);
    const target = this.resolveTarget(cue, context);
    this.current = { cue, target, animation: null };
    try { this.onStart(cue, { target, skipped, context }); } catch (error) { this.onError(error, cue); }
    if (!skipped && target && durationMs > 0) await this.animate(target, cue, durationMs, context);
    try { this.onComplete(cue, { target, skipped: skipped || this.skipRequested, context }); } catch (error) { this.onError(error, cue); }
    return { cue, skipped: skipped || this.skipRequested };
  }

  animate(target, cue, durationMs, context) {
    const keyframes = typeof context.keyframesFor === "function" ? context.keyframesFor(cue) : null;
    if (typeof target.animate === "function") {
      try {
        const animation = target.animate(keyframes || [{ opacity: 0.78 }, { opacity: 1 }], { duration: durationMs, easing: "cubic-bezier(.22,.72,.26,1)", fill: "both" });
        this.current.animation = animation;
        return this.waitForAnimation(animation, target, durationMs);
      } catch (error) { this.onError(error, cue); }
    }
    return this.waitForTransition(target, durationMs);
  }

  waitForAnimation(animation, target, durationMs) {
    const finished = animation.finished && typeof animation.finished.then === "function" ? animation.finished : Promise.resolve();
    return Promise.race([finished.catch(() => {}), this.timeoutFallback(target, durationMs)]);
  }

  waitForTransition(target, durationMs) {
    if (!target || typeof target.addEventListener !== "function") return Promise.resolve();
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => { if (settled) return; settled = true; target.removeEventListener("transitionend", finish); resolve(); };
      if (this.current) this.current.finish = finish;
      target.addEventListener("transitionend", finish, { once: true });
      const timer = setTimeout(finish, Math.max(120, durationMs + 250));
      void timer;
    });
  }

  timeoutFallback(target, durationMs) {
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, Math.max(120, durationMs + 250));
      void target;
      void timer;
    });
  }
}

export function createCueDirector(options = {}) { return new CueDirector(options); }
