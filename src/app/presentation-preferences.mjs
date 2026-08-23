export const PRESENTATION_STORAGE_KEY = "people-life:presentation:v1";
export const MOTION_MODES = Object.freeze(["full", "reduced", "off"]);

export function normalizePresentationPreferences(value, { prefersReducedMotion = false } = {}) {
  const raw = value && typeof value === "object" ? value : {};
  const motionMode = MOTION_MODES.includes(raw.motionMode)
    ? raw.motionMode
    : (prefersReducedMotion ? "reduced" : "full");
  return {
    schemaVersion: 1,
    motionMode,
    soundEnabled: raw.soundEnabled !== false,
    hapticEnabled: raw.hapticEnabled !== false,
  };
}

export function motionDuration(baseDurationMs, motionMode) {
  if (motionMode === "off") return 0;
  if (motionMode === "reduced") return Math.round(baseDurationMs * 0.6);
  return baseDurationMs;
}
