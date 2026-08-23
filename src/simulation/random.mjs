/**
 * 将字符串种子转换为可复现的伪随机数生成器。
 * 这不是安全随机数，只用于游戏模拟和回放。
 * @param {string | number} seed
 * @returns {() => number}
 */
export function createSeededRandom(seed) {
  const text = String(seed);
  let state = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    state ^= text.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }

  return function random() {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** @param {() => number} random @param {number} min @param {number} max */
export function randomInt(random, min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

/**
 * @template T
 * @param {() => number} random
 * @param {{ value: T, weight: number }[]} options
 * @returns {T}
 */
export function weightedChoice(random, options) {
  const usable = options.filter((option) => Number.isFinite(option.weight) && option.weight > 0);
  const total = usable.reduce((sum, option) => sum + option.weight, 0);

  if (usable.length === 0 || total <= 0) {
    throw new Error("weightedChoice 至少需要一个正权重选项");
  }

  let cursor = random() * total;
  for (const option of usable) {
    cursor -= option.weight;
    if (cursor < 0) return option.value;
  }

  return usable.at(-1).value;
}

/** @param {() => number} random */
export function standardNormal(random) {
  let first = 0;
  let second = 0;
  while (first === 0) first = random();
  while (second === 0) second = random();
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
}

/** @param {number} value @param {number} min @param {number} max */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** @param {number} value @param {number} digits */
export function roundTo(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
