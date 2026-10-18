export const GAME_WIDTH = 390;
export const GAME_HEIGHT = 844;

export type QuarterIntensity = "trial" | "regular" | "focus";

export type RuntimeScreen =
  | "life"
  | "event"
  | "quarter-execution"
  | "quarter-result"
  | "year-review"
  | "age-entry"
  | "records";

export type RuntimeCommand =
  | { type: "module.open"; moduleId: string }
  | { type: "module.close" }
  | { type: "action.toggle"; actionId: string }
  | { type: "action.intensity"; actionId: string; intensity: QuarterIntensity }
  | { type: "quarter.advance" }
  | { type: "quarter.execution.skip" }
  | { type: "quarter.result.continue" }
  | { type: "event.choose"; eventId: string; optionId: string }
  | { type: "year.confirm"; eventId: string }
  | { type: "age-entry.continue" }
  | { type: "utility.close" }
  | { type: "utility.open"; utilityId: "settings" | "records" | "debug" };

export type PresentationCueType =
  | "screen.enter"
  | "action.scheduled"
  | "action.resolve"
  | "resource.delta"
  | "person.react"
  | "event.interrupt"
  | "month.advance"
  | "quarter.complete"
  | "year.advance";

export interface PresentationCue {
  id: string;
  type: PresentationCueType;
  priority: "ambient" | "normal" | "key";
  payload: Record<string, unknown>;
}

export interface RuntimeModule {
  id: string;
  label: string;
  iconKey: string;
  availableCount: number;
  lockedCount: number;
}

export interface RuntimeActionOption {
  id: string;
  moduleId: string;
  label: string;
  targetLabel: string;
  timeSlots: number;
  energyCost: number;
  cashCostYuan: number;
  intensity: QuarterIntensity;
  available: boolean;
  unavailableReason: string | null;
}

export interface RuntimeAllocation extends RuntimeActionOption {
  selected: true;
}

export interface RuntimeCoreView {
  status: "awaiting_choice" | "completed";
  stage: string | null;
  pendingKind: "quarter_plan" | "random_life_event" | "mainline_event" | "year_review" | null;
  pendingEventId: string | null;
  calendarYear: number;
  age: number;
  quarter: 1 | 2 | 3 | 4;
  monthInQuarter: 1 | 2 | 3 | null;
}

export interface RuntimeEventOption {
  id: string;
  label: string;
  description: string;
  effectSummary: string | null;
  planImpact: Record<string, unknown> | null;
}

export interface RuntimeEventView {
  eventId: string;
  eventTemplateId: string | null;
  title: string;
  prompt: string;
  calendarYear: number;
  age: number;
  quarter: 1 | 2 | 3 | 4;
  monthInQuarter: 1 | 2 | 3;
  options: RuntimeEventOption[];
  affectedActionIds: string[];
  affectedActions: Array<{ id: string; label: string }>;
}

export interface RuntimeMonthAction {
  actionId: string;
  label: string;
  status: "completed" | "partly_completed";
  executedShare: number;
  energyCost: number;
}

export interface RuntimeMonthTick {
  monthInQuarter: 1 | 2 | 3;
  calendarMonth: number;
  status: "active" | "interrupted" | "overdrawn" | "resting";
  narrative: string;
  energyAvailable: number;
  energySpent: number;
  energyRemaining: number;
  actions: RuntimeMonthAction[];
  interruption: { severity: string; reason: string } | null;
}

export interface RuntimeQuarterExecution {
  key: string;
  calendarYear: number;
  age: number;
  quarter: 1 | 2 | 3 | 4;
  quarterLabel: string;
  operationLabel: string;
  activityIds: string[];
  activities: Array<{ id: string; label: string }>;
  months: RuntimeMonthTick[];
}

export interface RuntimeQuarterResult {
  key: string;
  calendarYear: number;
  age: number;
  quarter: 1 | 2 | 3 | 4;
  operationLabel: string;
  activityIds: string[];
  activities: Array<{ id: string; label: string }>;
  executionRate: number;
  executedTimeSlots: number;
  plannedTimeSlots: number;
  energySpent: number;
  energyRemaining: number;
  overdraftEnergy: number;
  interestChanges: Record<string, unknown>;
  growthChanges: Record<string, unknown>;
  characterGrowth: Record<string, unknown>;
  relationshipChanges: Array<Record<string, unknown>>;
  randomEventResults: Array<Record<string, unknown>>;
  planInterruption: Record<string, unknown> | null;
  activityResults: Array<Record<string, unknown>>;
}

export interface RuntimeYearReview {
  eventId: string;
  calendarYear: number;
  completedAge: number;
  nextAge: number;
  title: string;
  prompt: string;
  confirmOptionId: "confirm_year_review";
  quarterSummary: Array<{
    quarter: 1 | 2 | 3 | 4;
    label: string;
    operationLabel: string;
    activityIds: string[];
    executionRate: number;
  }>;
  highlights: string[];
  unchosenPaths: Array<Record<string, unknown>>;
}

export interface RuntimeAgeEntry {
  key: string;
  from: { calendarYear: number; age: number };
  to: { calendarYear: number; age: number };
  identityLabel: string;
  unlockedModuleIds: string[];
  unlockedModules: Array<{ id: string; label: string }>;
  actionIds: string[];
  actions: Array<{ id: string; label: string }>;
  persistentPeople: string[];
  people: Array<{ roleId: string; label: string }>;
}

export interface RuntimeRecordsQuarter {
  key: string;
  quarter: 1 | 2 | 3 | 4;
  label: string;
  operationLabel: string;
  executionRate: number;
  activityIds: string[];
  activities: Array<{ id: string; label: string }>;
  months: RuntimeMonthTick[];
  eventCount: number;
  interruptionReason: string | null;
  interestCount: number;
  growthCount: number;
  relationshipCount: number;
  resources: {
    executedTimeSlots: number;
    plannedTimeSlots: number;
    energySpent: number;
    energyRemaining: number;
  };
}

export interface RuntimeRecordsView {
  calendarYear: number;
  age: number;
  title: string;
  quarters: RuntimeRecordsQuarter[];
  people: Array<{ id: string | null; roleId: string | null; label: string }>;
  interests: Array<{ id: string; label: string; score: number; stageLabel: string }>;
}

export interface RuntimePresentationCheckpoint {
  schemaVersion: 1;
  sessionKey: string | null;
  activeQuarterKey: string | null;
  activeQuarterPhase: "execution" | "result" | null;
  activeAgeEntryKey: string | null;
  activeAgeEntryFrom: { calendarYear: number; age: number } | null;
  acknowledgedQuarterKeys: string[];
  acknowledgedAgeEntryKeys: string[];
}

export interface GameRuntimeSnapshot {
  protocol: "game-runtime-snapshot-v2";
  screen: RuntimeScreen;
  core: RuntimeCoreView;
  calendarYear: number;
  age: number;
  quarter: 1 | 2 | 3 | 4;
  identityLabel: string;
  playerName: string;
  playerVisualKey: string;
  playerMood: "calm" | "happy" | "tired" | "worried";
  playerResponse: string;
  resources: {
    availableTimeSlots: number;
    totalTimeSlots: number;
    availableEnergy: number;
    maxEnergy: number;
    cashYuan: number;
  };
  recentLife: string[];
  modules: RuntimeModule[];
  actionOptions: RuntimeActionOption[];
  allocations: RuntimeAllocation[];
  activeModuleId: string | null;
  advanceEnabled: boolean;
  resourceBlockReason: string | null;
  event: RuntimeEventView | null;
  quarterExecution: RuntimeQuarterExecution | null;
  quarterResult: RuntimeQuarterResult | null;
  yearReview: RuntimeYearReview | null;
  ageEntry: RuntimeAgeEntry | null;
  records: RuntimeRecordsView;
}

export interface GameRuntimePort {
  getSnapshot(): GameRuntimeSnapshot;
  dispatch(command: RuntimeCommand): void;
  subscribe(listener: (snapshot: GameRuntimeSnapshot, cues: PresentationCue[]) => void): () => void;
}
