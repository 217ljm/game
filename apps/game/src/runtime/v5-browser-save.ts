import type { RuntimePresentationCheckpoint } from "../contracts";

const ACTIVE_SAVE_KEY = "people-life:active:v5";
const BACKUP_SAVE_KEY = "people-life:backup:v5";
const DEVELOPMENT_SAVE_KEY = "people-life:game-development:v1";
const PRESENTATION_STATE_KEY = "people-life:game-presentation-state:v1";
const PRESENTATION_PREFS_KEY = "people-life:presentation:v1";

export type PresentationPreferences = {
  motionMode: "full" | "reduced" | "off";
  soundEnabled: boolean;
  hapticEnabled: boolean;
};

export type BrowserSaveSummary = {
  label: string;
  detail: string;
};

function readJson(key: string): unknown | null {
  const raw = window.localStorage.getItem(key);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function readV5SessionCandidates(): unknown[] {
  return [readJson(ACTIVE_SAVE_KEY), readJson(BACKUP_SAVE_KEY)].filter((value) => value != null);
}

export function readDevelopmentSessionCandidate(): unknown | null {
  return readJson(DEVELOPMENT_SAVE_KEY);
}

export function summarizeSessionForMenu(session: unknown): BrowserSaveSummary | null {
  const value = session as {
    schemaVersion?: unknown;
    birthYear?: unknown;
    quarterPlans?: Record<string, unknown>;
  } | null;
  if (value?.schemaVersion !== 5) return null;
  const birthYear = Number.isInteger(value.birthYear) ? Number(value.birthYear) : 1978;
  const quarters = Object.keys(value.quarterPlans ?? {}).flatMap((key) => {
    const match = /^quarter:(\d{4}):Q([1-4])$/.exec(key);
    return match ? [{ year: Number(match[1]), quarter: Number(match[2]) }] : [];
  }).sort((left, right) => left.year - right.year || left.quarter - right.quarter);
  const latest = quarters.at(-1);
  if (!latest) return { label: `${birthYear}年出生`, detail: "人生刚刚开始" };
  const calendarYear = latest.quarter === 4 ? latest.year + 1 : latest.year;
  const quarter = latest.quarter === 4 ? 1 : latest.quarter + 1;
  return {
    label: `${calendarYear}年 · ${Math.max(0, calendarYear - birthYear)}岁 · Q${quarter}`,
    detail: `最近完成 ${latest.year}年 Q${latest.quarter} 安排`,
  };
}

export function readPresentationPreferences(systemReducedMotion = false): PresentationPreferences {
  const raw = readJson(PRESENTATION_PREFS_KEY) as Partial<PresentationPreferences> | null;
  const motionMode = raw?.motionMode === "full" || raw?.motionMode === "reduced" || raw?.motionMode === "off"
    ? raw.motionMode
    : (systemReducedMotion ? "reduced" : "full");
  return {
    motionMode,
    soundEnabled: raw?.soundEnabled !== false,
    hapticEnabled: raw?.hapticEnabled !== false,
  };
}

export function writePresentationPreferences(settings: PresentationPreferences): void {
  window.localStorage.setItem(PRESENTATION_PREFS_KEY, JSON.stringify({ schemaVersion: 1, ...settings }));
}

export function writeV5Session(session: unknown): void {
  const previous = window.localStorage.getItem(ACTIVE_SAVE_KEY);
  if (previous != null) window.localStorage.setItem(BACKUP_SAVE_KEY, previous);
  window.localStorage.setItem(ACTIVE_SAVE_KEY, JSON.stringify(session));
}

export function writeDevelopmentSession(session: unknown): void {
  window.localStorage.setItem(DEVELOPMENT_SAVE_KEY, JSON.stringify(session));
}

function emptyPresentationCheckpoint(): RuntimePresentationCheckpoint {
  return {
    schemaVersion: 1,
    sessionKey: null,
    activeQuarterKey: null,
    activeQuarterPhase: null,
    activeAgeEntryKey: null,
    activeAgeEntryFrom: null,
    acknowledgedQuarterKeys: [],
    acknowledgedAgeEntryKeys: [],
  };
}

export function readPresentationCheckpoint(): RuntimePresentationCheckpoint {
  const raw = readJson(PRESENTATION_STATE_KEY) as Partial<RuntimePresentationCheckpoint> | null;
  if (raw?.schemaVersion !== 1) return emptyPresentationCheckpoint();
  const phase = raw.activeQuarterPhase === "execution" || raw.activeQuarterPhase === "result"
    ? raw.activeQuarterPhase
    : null;
  return {
    schemaVersion: 1,
    sessionKey: typeof raw.sessionKey === "string" ? raw.sessionKey : null,
    activeQuarterKey: typeof raw.activeQuarterKey === "string" ? raw.activeQuarterKey : null,
    activeQuarterPhase: phase,
    activeAgeEntryKey: typeof raw.activeAgeEntryKey === "string" ? raw.activeAgeEntryKey : null,
    activeAgeEntryFrom: raw.activeAgeEntryFrom
      && Number.isFinite(raw.activeAgeEntryFrom.calendarYear)
      && Number.isFinite(raw.activeAgeEntryFrom.age)
      ? { calendarYear: raw.activeAgeEntryFrom.calendarYear, age: raw.activeAgeEntryFrom.age }
      : null,
    acknowledgedQuarterKeys: Array.isArray(raw.acknowledgedQuarterKeys)
      ? raw.acknowledgedQuarterKeys.filter((key): key is string => typeof key === "string").slice(-32)
      : [],
    acknowledgedAgeEntryKeys: Array.isArray(raw.acknowledgedAgeEntryKeys)
      ? raw.acknowledgedAgeEntryKeys.filter((key): key is string => typeof key === "string").slice(-16)
      : [],
  };
}

export function writePresentationCheckpoint(checkpoint: RuntimePresentationCheckpoint): void {
  window.localStorage.setItem(PRESENTATION_STATE_KEY, JSON.stringify(checkpoint));
}
