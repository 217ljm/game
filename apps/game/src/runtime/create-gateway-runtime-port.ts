import type {
  GameRuntimePort,
  GameRuntimeSnapshot,
  PresentationCue,
  RuntimeCommand,
  RuntimePresentationCheckpoint,
  QuarterIntensity,
} from "../contracts";

type Gateway = {
  startLife(config?: Record<string, unknown>): { session: unknown; result: unknown };
  resumeLife(session: unknown): { session: unknown; result: unknown };
  submitChoice(session: unknown, pending: unknown, choice: unknown): { session: unknown; result: unknown };
};

type RuntimePresenter = {
  buildGameRuntimeSnapshot(input: Record<string, unknown>): GameRuntimeSnapshot;
  mapGameRuntimeCues(previous: GameRuntimeSnapshot | null, next: GameRuntimeSnapshot, context?: Record<string, unknown>): PresentationCue[];
};

type RuntimePortOptions = {
  /** Browser base URL used by the legacy data loader. Defaults to the Vite root. */
  baseUrl?: string | URL;
  /** Optional already-loaded data package; useful for tests and native hosts. */
  data?: Record<string, unknown>;
  /** A v5 session supplied by the application/save layer. */
  session?: unknown;
  /** New-life configuration. It is only used when session is absent. */
  lifeConfig?: Record<string, unknown>;
  /** Explicit development fixture. It never changes Core rules or save format. */
  fixture?: "age6-q1";
  /** Called after a Core command has produced a new session. */
  onSessionChange?: (session: unknown) => void;
  /** Disposable presentation progress. It never changes Core facts. */
  presentationCheckpoint?: RuntimePresentationCheckpoint;
  /** Called after a result/execution/age-entry presentation acknowledgement. */
  onPresentationCheckpointChange?: (checkpoint: RuntimePresentationCheckpoint) => void;
};

type DebugReplay = (data: Record<string, unknown>, config: Record<string, unknown>) => { session: unknown; result: unknown };

const bundledDataModules = import.meta.glob([
  "../../../../data/gameplay/quarterly_age6_1984.json",
  "../../../../data/annual_life_operations.json",
  "../../../../data/quarterly_life_content.json",
  "../../../../data/childhood_play_content.json",
  "../../../../data/youth_mainline_payoffs.json",
  "../../../../data/calibration/timeline_1978_2026.json",
  "../../../../data/social_character_catalog.json",
  "../../../../data/calibration/birth_1978_1982.json",
  "../../../../data/calibration/childhood_1978_1988.json",
  "../../../../data/childhood_events.json",
  "../../../../data/calibration/primary_education_1984_1996.json",
  "../../../../data/primary_education_events.json",
  "../../../../data/calibration/adolescence_education_1986_2000.json",
  "../../../../data/adolescence_events.json",
  "../../../../data/calibration/youth_entry_1992_2006.json",
  "../../../../data/youth_entry_events.json",
  "../../../../data/entry_job_catalog.json",
  "../../../../data/calibration/adult_life_1992_2025.json",
  "../../../../data/adult_life_events.json",
  "../../../../data/adult_job_catalog.json",
], { import: "default" });

async function loadBundledGameData(dataFiles: Record<string, string>): Promise<Record<string, unknown>> {
  const entries = await Promise.all(Object.entries(dataFiles).map(async ([key, relativePath]) => {
    const load = bundledDataModules[`../../../../${relativePath}`];
    if (!load) throw new Error(`正式游戏数据包缺少 ${relativePath}`);
    return [key, await load()] as const;
  }));
  return Object.fromEntries(entries);
}

async function loadModules(baseUrl?: string | URL): Promise<{
  data: Record<string, unknown>;
  gatewayFactory: (data: Record<string, unknown>) => Gateway;
  presenter: RuntimePresenter;
  debugReplay: DebugReplay;
}> {
  const [{ loadGameData, DATA_FILES }, { createGameGateway }, presenter, { replayDebugToTarget }] = await Promise.all([
    import("../../../../src/game/load-game-data.mjs"),
    import("../../../../src/game/game-gateway.mjs"),
    import("../../../../src/game/game-runtime-presenter.mjs"),
    import("../../../../src/game/debug-tools.mjs"),
  ]);
  return {
    data: baseUrl == null
      ? await loadBundledGameData(DATA_FILES)
      : await loadGameData(typeof baseUrl === "string" ? new URL(baseUrl, import.meta.url) : baseUrl),
    gatewayFactory: createGameGateway as (data: Record<string, unknown>) => Gateway,
    presenter: presenter as RuntimePresenter,
    debugReplay: replayDebugToTarget as DebugReplay,
  };
}

function copy<T>(value: T): T {
  return structuredClone(value);
}

function fixtureConfig(): Record<string, unknown> {
  return {
    seed: "p0-age6-q1",
    birthYear: 1978,
    targetAge: 6,
    targetPoint: "q1",
    mortality: false,
    routePreset: "balanced",
    familyPreset: "natural",
    pressurePreset: "ordinary",
    randomMode: "normal",
    forcedEventId: null,
  };
}

function emptyPresentationCheckpoint(sessionKey: string): RuntimePresentationCheckpoint {
  return {
    schemaVersion: 1,
    sessionKey,
    activeQuarterKey: null,
    activeQuarterPhase: null,
    activeAgeEntryKey: null,
    activeAgeEntryFrom: null,
    acknowledgedQuarterKeys: [],
    acknowledgedAgeEntryKeys: [],
  };
}

function runtimeSessionKey(session: unknown): string {
  const value = session as { seed?: unknown; birthYear?: unknown } | null;
  return `${String(value?.seed ?? "unknown")}:${String(value?.birthYear ?? "default")}`;
}

function latestRecord(result: unknown): Record<string, unknown> | null {
  const value = result as {
    currentState?: { annualRecords?: Array<Record<string, unknown>> };
    stages?: Record<string, { annualRecords?: Array<Record<string, unknown>> }>;
  } | null;
  const current = value?.currentState?.annualRecords?.at(-1);
  if (current) return current;
  const records = Object.values(value?.stages ?? {}).flatMap((stage) => stage?.annualRecords ?? []);
  return records.at(-1) ?? null;
}

function completedQuarter(result: unknown): { key: string; calendarYear: number; age: number; quarter: number } | null {
  const record = latestRecord(result) as {
    calendarYear?: number;
    age?: number;
    quarterRecords?: Array<{ quarter?: number; monthTicks?: unknown[]; monthSimulation?: { monthTicks?: unknown[] } }>;
  } | null;
  const quarter = [...(record?.quarterRecords ?? [])].reverse().find((entry) => (
    (entry.monthTicks?.length ?? entry.monthSimulation?.monthTicks?.length ?? 0) === 3
  ));
  if (!record || !quarter || !Number.isFinite(record.calendarYear) || !Number.isFinite(record.age) || !Number.isFinite(quarter.quarter)) return null;
  return {
    key: `quarter:${record.calendarYear}:age${record.age}:Q${quarter.quarter}`,
    calendarYear: record.calendarYear as number,
    age: record.age as number,
    quarter: quarter.quarter as number,
  };
}

function completedQuarterMatchesPending(
  completed: { calendarYear: number; age: number; quarter: number },
  pending: PendingView | null,
): boolean {
  if (!pending || !Number.isFinite(pending.calendarYear) || !Number.isFinite(pending.age)) return false;
  if (completed.calendarYear !== pending.calendarYear || completed.age !== pending.age) return false;
  if (pending.kind === "year_review") return completed.quarter === 4;
  if (pending.kind === "quarter_plan" && Number.isFinite(pending.quarter)) {
    return completed.quarter === (pending.quarter as number) - 1;
  }
  return false;
}

type PendingView = { kind?: string; eventId?: string; calendarYear?: number; age?: number; quarter?: number; minActivities?: number; options?: Array<{ id: string; available?: boolean }> };

function corePending(result: unknown): PendingView | null {
  return (result as { pendingDecision?: PendingView } | null)?.pendingDecision ?? null;
}

function isRuntimeEventPending(pending: PendingView | null): boolean {
  if (!pending?.eventId || !Array.isArray(pending.options)) return false;
  if (["random_life_event", "mainline_event"].includes(pending.kind ?? "")) return true;
  return pending.kind == null && pending.options.length > 0;
}

function currentAgeEntry(result: unknown, checkpoint: RuntimePresentationCheckpoint): { key: string; from: { calendarYear: number; age: number } } | null {
  const pending = corePending(result);
  if (pending?.kind !== "quarter_plan" || !Number.isFinite(pending.calendarYear) || !Number.isFinite(pending.age)) return null;
  const key = `age-entry:${pending.calendarYear}:age${pending.age}`;
  if (checkpoint.activeAgeEntryKey !== key || !checkpoint.activeAgeEntryFrom) return null;
  return {
    key,
    from: copy(checkpoint.activeAgeEntryFrom),
  };
}

/**
 * Adapter from the deterministic legacy GameGateway to the Phaser runtime port.
 * It is intentionally async because loading the JSON content pack is an I/O concern;
 * the returned port itself is synchronous and never exposes a mutable Core object.
 */
export async function createGatewayRuntimePort(options: RuntimePortOptions = {}): Promise<GameRuntimePort> {
  const loaded = options.data
    ? await (async () => {
      const [{ createGameGateway }, presenter, { replayDebugToTarget }] = await Promise.all([
        import("../../../../src/game/game-gateway.mjs"),
        import("../../../../src/game/game-runtime-presenter.mjs"),
        import("../../../../src/game/debug-tools.mjs"),
      ]);
      return {
        data: options.data as Record<string, unknown>,
        gatewayFactory: createGameGateway as (data: Record<string, unknown>) => Gateway,
        presenter: presenter as RuntimePresenter,
        debugReplay: replayDebugToTarget as DebugReplay,
      };
    })()
    : await loadModules(options.baseUrl);

  const gateway = loaded.gatewayFactory(loaded.data);
  let session: unknown;
  let result: unknown;
  if (options.session != null) {
    ({ session, result } = gateway.resumeLife(copy(options.session)));
  } else if (options.lifeConfig) {
    const fixtureReplay = loaded.debugReplay(loaded.data, {
      ...fixtureConfig(),
      birthYear: options.lifeConfig.birthYear ?? 1978,
      targetAge: 1,
      targetPoint: "q1",
      seed: options.lifeConfig.seed ?? "life-1978",
    });
    session = {
      ...(fixtureReplay.session as Record<string, unknown>),
      quarterCadenceProfile: "age6-1984-quarterly-v1",
      playerName: options.lifeConfig.name ?? "李建国",
      gender: options.lifeConfig.gender ?? "male",
    };
    ({ session, result } = gateway.resumeLife(copy(session)));
  } else if (options.fixture === "age6-q1") {
    const fixtureReplay = loaded.debugReplay(loaded.data, fixtureConfig());
    session = {
      ...(fixtureReplay.session as Record<string, unknown>),
      quarterCadenceProfile: "age6-1984-quarterly-v1",
    };
    ({ session, result } = gateway.resumeLife(copy(session)));
  } else {
    ({ session, result } = gateway.startLife(options.lifeConfig ?? { seed: "p0-production", birthYear: 1978, mortality: false }));
  }

  let previousSnapshot: GameRuntimeSnapshot | null = null;
  let activeModuleId: string | null = null;
  let activeUtility: "records" | null = null;
  let draft: { eventId: string; allocations: Array<{ actionId: string; intensity: QuarterIntensity }> } | null = null;
  const sessionKey = runtimeSessionKey(session);
  let presentationCheckpoint = options.presentationCheckpoint?.sessionKey === sessionKey
    ? copy(options.presentationCheckpoint)
    : emptyPresentationCheckpoint(sessionKey);

  const initCompleted = completedQuarter(result);
  if (initCompleted && !presentationCheckpoint.acknowledgedQuarterKeys.includes(initCompleted.key)) {
    presentationCheckpoint.acknowledgedQuarterKeys.push(initCompleted.key);
  }

  const listeners = new Set<(snapshot: GameRuntimeSnapshot, cues: PresentationCue[]) => void>();
  let snapshot = makeSnapshot();

  function persistPresentation(next: RuntimePresentationCheckpoint): void {
    const normalized = {
      ...next,
      schemaVersion: 1 as const,
      sessionKey,
      acknowledgedQuarterKeys: [...new Set(next.acknowledgedQuarterKeys)].slice(-32),
      acknowledgedAgeEntryKeys: [...new Set(next.acknowledgedAgeEntryKeys)].slice(-16),
    };
    if (JSON.stringify(normalized) === JSON.stringify(presentationCheckpoint)) return;
    presentationCheckpoint = normalized;
    options.onPresentationCheckpointChange?.(copy(presentationCheckpoint));
  }

  function resolveFlow(): { screen: GameRuntimeSnapshot["screen"]; ageEntryFrom?: { calendarYear: number; age: number } } {
    if (activeUtility === "records") return { screen: "records" };
    const pending = corePending(result);
    if (isRuntimeEventPending(pending)) return { screen: "event" };

    const completed = completedQuarter(result);
    if (
      completed
      && completedQuarterMatchesPending(completed, pending)
      && !presentationCheckpoint.acknowledgedQuarterKeys.includes(completed.key)
    ) {
      if (presentationCheckpoint.activeQuarterKey !== completed.key || !presentationCheckpoint.activeQuarterPhase) {
        persistPresentation({
          ...presentationCheckpoint,
          activeQuarterKey: completed.key,
          activeQuarterPhase: "execution",
        });
      }
      return {
        screen: presentationCheckpoint.activeQuarterPhase === "result" ? "quarter-result" : "quarter-execution",
      };
    }

    if (pending?.kind === "year_review") return { screen: "year-review" };

    const ageEntry = currentAgeEntry(result, presentationCheckpoint);
    if (ageEntry && !presentationCheckpoint.acknowledgedAgeEntryKeys.includes(ageEntry.key)) {
      return { screen: "age-entry", ageEntryFrom: ageEntry.from };
    }
    return { screen: "life" };
  }

  function makeSnapshot(): GameRuntimeSnapshot {
    const pending = (result as { pendingDecision?: { eventId?: string } } | null)?.pendingDecision;
    if (pending?.eventId && draft?.eventId !== pending.eventId) draft = null;
    const next = loaded.presenter.buildGameRuntimeSnapshot({
      result,
      session,
      registry: loaded.data.quarterlyAge6,
      draft,
      activeModuleId,
      flow: resolveFlow(),
    });
    return copy(next);
  }

  function publish(cues?: PresentationCue[]): void {
    const next = makeSnapshot();
    const mapped = cues ?? loaded.presenter.mapGameRuntimeCues(previousSnapshot, next, { screen: next.screen });
    previousSnapshot = next;
    snapshot = next;
    for (const listener of listeners) listener(copy(snapshot), copy(mapped));
  }

  function setDraft(eventId: string, allocations: Array<{ actionId: string; intensity: QuarterIntensity }>): void {
    draft = { eventId, allocations };
    publish();
  }

  function submit(choice: unknown): void {
    try {
      const reply = gateway.submitChoice(session, (result as { pendingDecision?: unknown }).pendingDecision, choice);
      session = reply.session;
      result = reply.result;
      options.onSessionChange?.(copy(session));
      publish();
    } catch (error) {
      snapshot = { ...snapshot, resourceBlockReason: error instanceof Error ? error.message : "当前选择无法提交。" };
      for (const listener of listeners) listener(copy(snapshot), []);
    }
  }

  const port: GameRuntimePort = {
    getSnapshot: () => copy(snapshot),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch: (command: RuntimeCommand) => {
      const pending = corePending(result);
      if (command.type === "utility.open") {
        if (command.utilityId !== "records" || snapshot.screen !== "life") return;
        activeUtility = "records";
        publish();
        return;
      }
      if (command.type === "utility.close") {
        if (!activeUtility) return;
        activeUtility = null;
        publish();
        return;
      }
      if (command.type === "module.open") {
        activeModuleId = command.moduleId;
        publish();
        return;
      }
      if (command.type === "module.close") {
        activeModuleId = null;
        publish();
        return;
      }
      if (command.type === "action.intensity") {
        if (!draft) return;
        setDraft(draft.eventId, draft.allocations.map((entry) => entry.actionId === command.actionId ? { ...entry, intensity: command.intensity } : entry));
        return;
      }
      if (command.type === "action.toggle") {
        if (pending?.kind !== "quarter_plan" || !pending.eventId) return;
        const current = draft?.eventId === pending.eventId ? draft.allocations : [];
        const exists = current.some((entry) => entry.actionId === command.actionId);
        const option = pending.options?.find((entry) => entry.id === command.actionId);
        if (!option || option.available === false) return;
        setDraft(pending.eventId, exists ? current.filter((entry) => entry.actionId !== command.actionId) : [...current, { actionId: command.actionId, intensity: "regular" }]);
        return;
      }
      if (command.type === "quarter.advance") {
        if (pending?.kind !== "quarter_plan" || !pending.eventId || !draft || draft.eventId !== pending.eventId) return;
        if (draft.allocations.length < (pending.minActivities ?? 1)) return;
        submit({ type: "quarter.plan", eventId: draft.eventId, allocations: draft.allocations });
        return;
      }
      if (command.type === "quarter.execution.skip") {
        const completed = completedQuarter(result);
        if (!completed || snapshot.screen !== "quarter-execution") return;
        persistPresentation({
          ...presentationCheckpoint,
          activeQuarterKey: completed.key,
          activeQuarterPhase: "result",
        });
        publish();
        return;
      }
      if (command.type === "quarter.result.continue") {
        const completed = completedQuarter(result);
        if (!completed || snapshot.screen !== "quarter-result") return;
        persistPresentation({
          ...presentationCheckpoint,
          activeQuarterKey: null,
          activeQuarterPhase: null,
          acknowledgedQuarterKeys: [...presentationCheckpoint.acknowledgedQuarterKeys, completed.key],
        });
        publish();
        return;
      }
      if (command.type === "event.choose" && pending?.eventId === command.eventId) {
        submit(command.optionId);
        return;
      }
      if (command.type === "year.confirm" && pending?.kind === "year_review" && pending.eventId === command.eventId) {
        const fromYear = Number(pending.calendarYear ?? snapshot.calendarYear);
        const fromAge = Number(pending.age ?? snapshot.age);
        persistPresentation({
          ...presentationCheckpoint,
          activeAgeEntryKey: `age-entry:${fromYear + 1}:age${fromAge + 1}`,
          activeAgeEntryFrom: { calendarYear: fromYear, age: fromAge },
        });
        submit("confirm_year_review");
        return;
      }
      if (command.type === "age-entry.continue") {
        const ageEntry = currentAgeEntry(result, presentationCheckpoint);
        if (!ageEntry || snapshot.screen !== "age-entry") return;
        persistPresentation({
          ...presentationCheckpoint,
          activeAgeEntryKey: null,
          activeAgeEntryFrom: null,
          acknowledgedAgeEntryKeys: [...presentationCheckpoint.acknowledgedAgeEntryKeys, ageEntry.key],
        });
        publish();
      }
    },
  };
  return port;
}

export type { RuntimePortOptions };
