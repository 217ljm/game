import { loadGameData } from "../src/game/load-game-data.mjs";
import { formatCurrency } from "../src/game/presenter.mjs";
import {
  restoreLifeSession,
  resumeLife,
  startLife,
  submitLifeChoice,
} from "../src/game/game-application.mjs";
import { buildPageViewModels } from "../src/game/page-presenter.mjs";
import {
  MAIN_ROUTES,
  ROUTES,
  formatRouteHash,
  isMainRoute,
  parseRouteHash,
  routeForPending,
  routeTitle,
} from "../src/app/routes.mjs";
import { createBrowserPlatform } from "./browser-platform.mjs";
import {
  DEBUG_FAMILY_PRESETS,
  DEBUG_KEY_AGES,
  DEBUG_PRESSURE_PRESETS,
  DEBUG_ROUTE_PRESETS,
  advanceDebugSession,
  buildDebugReport,
  debugInspectorSummary,
  debugStageEventCatalog,
  nextDebugKeyAge,
  replayDebugToTarget,
  replayDebugToStageEvent,
} from "../src/game/debug-tools.mjs";
import {
  playSound,
  setHapticEnabled,
  setSoundEnabled,
  triggerHaptic,
} from "./sound-haptic-service.mjs";
import { generateLifePoster } from "./poster-generator.mjs";
import {
  MOTION_MODES,
  PRESENTATION_STORAGE_KEY,
  normalizePresentationPreferences,
} from "../src/app/presentation-preferences.mjs";
import {
  restoreFirstValidSave,
  rotateRecoverableSave,
} from "../src/app/save-recovery.mjs";

const SAVE_KEY = "people-life:active:v5";
const BACKUP_SAVE_KEY = "people-life:backup:v5";
const DEBUG_SAVE_KEY = "people-life:debug:v1";
const DEBUG_BACKUP_SAVE_KEY = "people-life:debug-backup:v1";
const LEGACY_SAVE_KEYS = [
  "people-life:active:v4",
  "people-life:active:v3",
  "people-life:active:v2",
  "people-life:active:v1",
];
const GALLERY_KEY = "people-life:gallery:v1";
const UI_KEY = "people-life:ui:v1";
const DEBUG_UI_KEY = "people-life:debug-ui:v1";
const QUARTER_DRAFT_KEY = "people-life:quarter-draft:v1";
const DEBUG_QUARTER_DRAFT_KEY = "people-life:debug-quarter-draft:v1";
const DEBUG_MODE = new URLSearchParams(location.search).get("debug") === "1";
const platform = createBrowserPlatform();
const byId = (id) => document.getElementById(id);

function registerProductionServiceWorker() {
  if (!("serviceWorker" in navigator) || location.protocol !== "https:" || DEBUG_MODE) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/public/service-worker.js", { scope: "/" }).catch(() => {
      // H5 容器可能主动禁用 Service Worker；发布版在这种环境中继续在线运行。
    });
  }, { once: true });
}

registerProductionServiceWorker();
let presentationPreferences = normalizePresentationPreferences(
  platform.storage.read(PRESENTATION_STORAGE_KEY),
  { prefersReducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches },
);
document.body.dataset.motion = presentationPreferences.motionMode;
setSoundEnabled(presentationPreferences.soundEnabled);
setHapticEnabled(presentationPreferences.hapticEnabled);
const screens = [
  "loading",
  "start",
  "new-life",
  "game",
  "random-event",
  "quarter-result",
  "year-review",
  "person-detail",
  "ending",
  "error",
];

let data;
let session;
let result;
let pages;
let currentRoute = ROUTES.TITLE;
let currentParams = {};
let debugLastRun = null;
let debugLastError = null;
let debugTargetEnding = false;
let actionPoolState = { key: null, category: "all", offset: 0 };
const actionDrafts = new Map();
const actionIntensityDrafts = new Map();
let toastTimer = 0;
let lastPresentationFeedbackKey = null;
let recoveredSaveSourceKey = null;
let simulatorModuleId = "life.module.learning";
let activeQuarterPlanController = null;

function activeUiKey() {
  return DEBUG_MODE ? DEBUG_UI_KEY : UI_KEY;
}

function playFeedback(soundType, hapticType = "light") {
  playSound(soundType);
  triggerHaptic(hapticType);
}

function playFeedbackOnce(key, soundType, hapticType) {
  if (lastPresentationFeedbackKey === key) return;
  lastPresentationFeedbackKey = key;
  playFeedback(soundType, hapticType);
}

function applyPresentationPreferences(next, { persist = true } = {}) {
  presentationPreferences = normalizePresentationPreferences(next);
  document.body.dataset.motion = presentationPreferences.motionMode;
  setSoundEnabled(presentationPreferences.soundEnabled);
  setHapticEnabled(presentationPreferences.hapticEnabled);
  byId("motion-mode-select").value = presentationPreferences.motionMode;
  byId("sound-toggle").checked = presentationPreferences.soundEnabled;
  byId("haptic-toggle").checked = presentationPreferences.hapticEnabled;
  if (persist) platform.storage.write(PRESENTATION_STORAGE_KEY, presentationPreferences);
}

function showGameToast(message, icon = "ph-sparkle") {
  const toast = byId("game-toast");
  clearTimeout(toastTimer);
  toast.querySelector("i").className = `ph-duotone ${icon}`;
  toast.querySelector("span").textContent = message;
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add("visible"));
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("visible");
    window.setTimeout(() => { toast.hidden = true; }, 220);
  }, 1900);
}

function hideGameToast() {
  const toast = byId("game-toast");
  if (!toast) return;
  clearTimeout(toastTimer);
  toast.classList.remove("visible");
  toast.hidden = true;
}

function showScreen(name) {
  for (const screen of screens) byId(`${screen}-screen`).hidden = screen !== name;
  document.body.dataset.screen = name;
  if (["random-event", "quarter-result", "year-review"].includes(name)) hideGameToast();
  platform.scrollToTop();
}

function updateHeader(route) {
  byId("header-title").textContent = routeTitle(route);
  const back = byId("header-back-button");
  const endingTimeline = route === ROUTES.RECORDS && result?.status === "completed";
  const backRoutes = new Set([ROUTES.NEW_LIFE, ROUTES.PERSON]);
  back.hidden = !backRoutes.has(route) && !endingTimeline;
  back.dataset.target = endingTimeline ? ROUTES.ENDING : (route === ROUTES.PERSON ? ROUTES.RELATIONS : ROUTES.TITLE);
  byId("header-action-button").hidden = true;
  document.body.dataset.route = route;
}

function navigate(route, params = {}, { replace = false } = {}) {
  const hash = formatRouteHash(route, params);
  platform.storage.write(activeUiKey(), { route, params });
  if (replace) {
    history.replaceState(null, "", `${location.pathname}${location.search}${hash}`);
    renderRoute(route, params);
  } else if (location.hash === hash) {
    renderRoute(route, params);
  } else {
    location.hash = hash;
  }
}

function readJsonArray(key) {
  const value = platform.storage.read(key, []);
  return Array.isArray(value) ? value : [];
}

function readSavedSession() {
  const primaryKey = DEBUG_MODE ? DEBUG_SAVE_KEY : SAVE_KEY;
  const backupKey = DEBUG_MODE ? DEBUG_BACKUP_SAVE_KEY : BACKUP_SAVE_KEY;
  const restored = restoreFirstValidSave({
    storage: platform.storage,
    keys: DEBUG_MODE ? [primaryKey, backupKey] : [primaryKey, backupKey, ...LEGACY_SAVE_KEYS],
    restore: restoreLifeSession,
  });
  if (!restored.session) return null;
  if (restored.sourceKey !== primaryKey) {
    platform.storage.write(primaryKey, restored.session);
    recoveredSaveSourceKey = restored.sourceKey;
  }
  return restored.session;
}

function saveActiveSession() {
  if (!session) return;
  rotateRecoverableSave({
    storage: platform.storage,
    primaryKey: DEBUG_MODE ? DEBUG_SAVE_KEY : SAVE_KEY,
    backupKey: DEBUG_MODE ? DEBUG_BACKUP_SAVE_KEY : BACKUP_SAVE_KEY,
    nextValue: session,
    restore: restoreLifeSession,
  });
  if (!DEBUG_MODE) for (const key of LEGACY_SAVE_KEYS) platform.storage.remove(key);
  if (byId("save-status")) {
    byId("save-status").textContent = DEBUG_MODE
      ? `调试存档 · ${session.seed.slice(-12)}`
      : `已自动保存 · ${session.seed.slice(-8)}`;
  }
}

function quarterDraftStorageKey() {
  return DEBUG_MODE ? DEBUG_QUARTER_DRAFT_KEY : QUARTER_DRAFT_KEY;
}

function readQuarterDraft() {
  const draft = platform.storage.read(quarterDraftStorageKey());
  if (!draft || draft.protocol !== "quarter-draft-v1" || typeof draft.eventId !== "string") return null;
  if (!Array.isArray(draft.allocations)) return null;
  return draft;
}

function clearQuarterDraft(eventId = null) {
  const draft = readQuarterDraft();
  if (!draft || eventId == null || draft.eventId === eventId) platform.storage.remove(quarterDraftStorageKey());
}

function persistQuarterDraft(eventId, allocations) {
  platform.storage.write(quarterDraftStorageKey(), {
    protocol: "quarter-draft-v1",
    eventId,
    allocations: allocations.map(({ actionId, intensity }) => ({ actionId, intensity })),
    updatedAt: Date.now(),
  });
}

function restoreQuarterDraft(eventId, options) {
  const draft = readQuarterDraft();
  if (!draft || draft.eventId !== eventId) {
    if (draft) clearQuarterDraft(draft.eventId);
    return { allocations: [], valid: false };
  }
  const optionMap = new Map(options.map((option) => [option.id, option]));
  const allocations = draft.allocations
    .filter((allocation) => optionMap.has(allocation.actionId))
    .map((allocation) => ({
      actionId: allocation.actionId,
      intensity: ["trial", "regular", "focus"].includes(allocation.intensity)
        ? allocation.intensity
        : (optionMap.get(allocation.actionId).defaultIntensity ?? "regular"),
    }));
  if (allocations.length !== draft.allocations.length) persistQuarterDraft(eventId, allocations);
  return { allocations, valid: allocations.length > 0 };
}

function unchosenText(entry) {
  const value = entry.unchosen;
  if (typeof value === "string") return value;
  return value.label ?? value.templateId ?? value.id ?? "另一条没有选择的路";
}

function archiveEnding(view) {
  if (DEBUG_MODE) return;
  const gallery = readJsonArray(GALLERY_KEY);
  gallery.unshift({
    archetypeId: view.lifeReview.archetypeId,
    title: view.lifeReview.title,
    ageAtDeath: view.lifeReview.ageAtDeath,
    seed: session.seed,
    untraveledPaths: view.lifeReview.untraveledPaths.slice(-5).map((entry) => ({
      year: entry.decisionYear,
      age: entry.decisionAge,
      text: unchosenText(entry),
    })),
  });
  const unique = gallery.filter(
    (entry, index, all) => all.findIndex((candidate) => candidate.seed === entry.seed) === index,
  ).slice(0, 20);
  platform.storage.write(GALLERY_KEY, unique);
}

function galleryItems(entries) {
  return entries.slice(0, 5).map((entry) => {
    const item = document.createElement("article");
    const ending = document.createElement("strong");
    ending.textContent = `${entry.title} · ${entry.ageAtDeath}岁`;
    item.append(ending);
    const rememberedPath = entry.untraveledPaths?.at(-1);
    if (rememberedPath) {
      const road = document.createElement("small");
      road.textContent = `那一生没有走：${rememberedPath.text}`;
      item.append(road);
    }
    return item;
  });
}

function renderGallery() {
  const gallery = readJsonArray(GALLERY_KEY);
  for (const [cardId, listId] of [["gallery-card", "gallery-list"], ["archive-gallery-card", "archive-gallery-list"]]) {
    const card = byId(cardId);
    card.hidden = gallery.length === 0;
    byId(listId).replaceChildren(...galleryItems(gallery));
  }
}

function renderStats(containerId, stats) {
  const statIcons = {
    health: "ph-heartbeat",
    fitness: "ph-barbell",
    intelligence: "ph-brain",
    appearance: "ph-sparkle",
    social: "ph-users-three",
    willpower: "ph-shield-check",
  };
  byId(containerId).replaceChildren(...stats.map((stat) => {
    const item = document.createElement("div");
    const icon = document.createElement("i");
    const value = document.createElement("strong");
    const label = document.createElement("span");
    const meter = document.createElement("div");
    const fill = document.createElement("i");
    item.className = "stat";
    item.title = stat.basis ?? "";
    icon.className = `ph-duotone ${statIcons[stat.id] ?? "ph-sparkle"}`;
    icon.setAttribute("aria-hidden", "true");
    value.textContent = stat.value;
    label.textContent = stat.label;
    meter.className = "stat-meter";
    fill.style.width = `${stat.value}%`;
    meter.append(fill);
    item.append(icon, value, label, meter);
    return item;
  }));
}

function renderCharacterStates(states) {
  byId("character-state-row").replaceChildren(...states.map((state) => {
    const item = document.createElement("div");
    const heading = document.createElement("span");
    const label = document.createElement("small");
    const value = document.createElement("strong");
    const meter = document.createElement("div");
    const fill = document.createElement("i");
    item.className = `character-state ${state.tone}`;
    label.textContent = state.label;
    value.textContent = state.text ?? `${state.value}/${state.max}`;
    heading.append(label, value);
    if (state.max) {
      meter.className = "character-state-meter";
      fill.style.width = `${Math.min(100, Math.max(0, state.value / state.max * 100))}%`;
      meter.append(fill);
    }
    item.append(heading, meter);
    return item;
  }));
}

function renderCharacterPortrait(visual) {
  const portrait = byId("character-portrait");
  portrait.style.backgroundImage = `url("${visual.atlasUrl}")`;
  portrait.style.backgroundSize = `${visual.atlasColumns * 100}% ${visual.atlasRows * 100}%`;
  portrait.style.backgroundPosition = `${visual.cell.backgroundPositionX}% ${visual.cell.backgroundPositionY}%`;
  portrait.setAttribute("aria-label", visual.ariaLabel);
  portrait.dataset.ageBand = visual.ageBand.id;
  portrait.dataset.sex = visual.sex;
  byId("character-portrait-caption").textContent = `${visual.ageBand.label}形象 · ${visual.eraBand.label}。属性、兴趣和现实积累会共同打开后来的路。`;
}

function renderFacts(containerId, facts) {
  const lines = facts.length > 0 ? facts : ["本年的收入、健康和家庭状态已经记入档案。"];
  byId(containerId).replaceChildren(...lines.map((line) => {
    const item = document.createElement("li");
    item.textContent = line;
    return item;
  }));
}

function renderSituation(items) {
  byId("situation-grid").replaceChildren(...items.map((entry) => {
    const item = document.createElement("div");
    const label = document.createElement("span");
    const value = document.createElement("strong");
    label.textContent = entry.label;
    value.textContent = entry.value;
    item.append(label, value);
    return item;
  }));
}

function renderMainline(mainline) {
  if (!mainline) return;
  byId("mainline-chapter").textContent = mainline.chapter.label;
  byId("mainline-question").textContent = mainline.chapter.question;
  byId("mainline-direction").textContent = mainline.directionStatus;
  byId("mainline-chapter-progress").textContent = mainline.chapter.totalYears == null
    ? `第${mainline.chapter.currentYear}年`
    : `第${mainline.chapter.currentYear}/${mainline.chapter.totalYears}年`;
  byId("mainline-quest-list").replaceChildren(...mainline.quests.map((quest) => {
    const item = document.createElement("section");
    item.className = "mainline-quest";
    item.dataset.type = quest.type;
    const heading = document.createElement("div");
    heading.className = "mainline-quest-heading";
    const copy = document.createElement("div");
    const type = document.createElement("span");
    const title = document.createElement("strong");
    const progress = document.createElement("b");
    type.textContent = quest.typeLabel;
    title.textContent = quest.title;
    progress.textContent = `${quest.progress}%`;
    copy.append(type, title);
    heading.append(copy, progress);
    const meter = document.createElement("div");
    const fill = document.createElement("i");
    meter.className = "mainline-quest-meter";
    fill.style.width = `${quest.progress}%`;
    meter.append(fill);
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    const metrics = document.createElement("div");
    summary.textContent = `${quest.statusLabel} · ${quest.nextHint}`;
    metrics.className = "mainline-metric-list";
    metrics.replaceChildren(...quest.metrics.map((entry) => {
      const row = document.createElement("div");
      const label = document.createElement("span");
      const value = document.createElement("span");
      label.textContent = entry.label;
      value.textContent = entry.valueLabel;
      row.append(label, value);
      return row;
    }));
    details.append(summary, metrics);
    item.append(heading, meter, details);
    return item;
  }));
}

function renderLifeDirections(mainline) {
  if (!mainline) return;
  byId("life-direction-list").replaceChildren(...mainline.directions.slice(0, 5).map((direction, index) => {
    const item = document.createElement("section");
    item.className = `direction-item${index === 0 ? " primary" : ""}`;
    const heading = document.createElement("div");
    const title = document.createElement("strong");
    const level = document.createElement("span");
    const meter = document.createElement("div");
    const fill = document.createElement("i");
    const evidence = document.createElement("p");
    title.textContent = `${index === 0 ? "当前方向 · " : ""}${direction.label}`;
    level.textContent = `${direction.levelLabel} · ${direction.score}/100`;
    meter.className = "direction-meter";
    fill.style.width = `${direction.score}%`;
    meter.append(fill);
    evidence.textContent = direction.evidence.join(" · ");
    heading.append(title, level);
    item.append(heading, meter, evidence);
    return item;
  }));
  const details = byId("chapter-history-details");
  details.hidden = mainline.completedChapters.length === 0;
  byId("chapter-history-summary").textContent = `查看已经走完的${mainline.completedChapters.length}个人生章节`;
  byId("chapter-history-list").replaceChildren(...mainline.completedChapters.map((chapter) => {
    const item = document.createElement("section");
    const title = document.createElement("strong");
    const summary = document.createElement("p");
    const evidence = document.createElement("p");
    item.className = "chapter-history-item";
    title.textContent = `${chapter.label} · ${chapter.startYear}—${chapter.endYear}`;
    summary.textContent = chapter.summary;
    evidence.textContent = chapter.evidence.slice(0, 3).join("；");
    item.append(title, summary, evidence);
    return item;
  }));
}

function renderYouthPayoffReview(review) {
  const card = byId("youth-payoff-review-card");
  card.hidden = !review;
  if (!review) return;
  byId("youth-payoff-review-title").textContent = review.title;
  byId("youth-payoff-review-count").textContent = `${review.opportunityCount}次关键兑现`;
  byId("youth-payoff-review-summary").textContent = review.summary;
  const factRows = [
    ["连续投入", `${review.followThroughQuarterCount}个季度`],
    ["出现过的人", review.recurringPeople.length > 0 ? review.recurringPeople.map((person) => person.name).join("、") : "尚未形成持续人物"],
    ["主动放下", `${review.laidDownCount}条方向`],
  ];
  byId("youth-payoff-review-facts").replaceChildren(...factRows.map(([labelText, valueText]) => {
    const row = document.createElement("div");
    const label = document.createElement("dt");
    const value = document.createElement("dd");
    label.textContent = labelText;
    value.textContent = valueText;
    row.append(label, value);
    return row;
  }));
  byId("youth-payoff-chain-list").replaceChildren(...review.chain.map((entry) => {
    const item = document.createElement("section");
    const heading = document.createElement("div");
    const title = document.createElement("strong");
    const age = document.createElement("span");
    const evidence = document.createElement("p");
    const outcome = document.createElement("p");
    title.textContent = `${entry.chapterLabel} · ${entry.choice}`;
    age.textContent = `${entry.calendarYear}年 · ${entry.age}岁`;
    evidence.textContent = `此前依据：${entry.evidence}`;
    outcome.textContent = `得到：${entry.gain}；代价：${entry.tradeoff}${entry.followedThrough > 0 ? `；后来又实际投入${entry.followedThrough}个季度` : ""}${entry.personName ? `；${entry.personName}进入了这段经历` : ""}`;
    heading.append(title, age);
    item.append(heading, evidence, outcome);
    return item;
  }));
}

function renderYearReviewMainline(mainline) {
  if (!mainline) return;
  byId("year-review-mainline-title").textContent = `${mainline.chapter.label} · ${mainline.directionStatus}`;
  byId("year-review-mainline-list").replaceChildren(...mainline.quests.map((quest) => {
    const row = document.createElement("div");
    const type = document.createElement("span");
    const value = document.createElement("strong");
    type.textContent = quest.typeLabel;
    value.textContent = `${quest.title} · ${quest.progress}%`;
    row.append(type, value);
    return row;
  }));
}

function renderEndingMainline(mainline) {
  const review = mainline?.ending;
  const card = byId("ending-mainline-card");
  card.hidden = !review;
  if (!review) return;
  byId("ending-mainline-title").textContent = review.title;
  byId("ending-mainline-summary").textContent = `${review.became}${review.summary}`;
  const facts = document.createDocumentFragment();
  const rows = [
    ["一生仍然守住", review.kept.join("、")],
    ["曾经靠近又放下", review.laidDown.length > 0 ? review.laidDown.join("、") : "没有明确淡出的长期兴趣"],
    ["走过的人生章节", `${review.chapterCount}章`],
    ...(mainline.youthPayoffReview
      ? [["0—18岁经历兑现", `${mainline.youthPayoffReview.opportunityCount}次机会 · ${mainline.youthPayoffReview.followThroughQuarterCount}个季度继续投入`]]
      : []),
  ];
  for (const [labelText, valueText] of rows) {
    const row = document.createElement("div");
    const label = document.createElement("dt");
    const value = document.createElement("dd");
    label.textContent = labelText;
    value.textContent = valueText;
    row.append(label, value);
    facts.append(row);
  }
  byId("ending-mainline-facts").replaceChildren(facts);
}

function renderPeople(people) {
  byId("people-empty").hidden = people.length > 0;
  byId("people-list").replaceChildren(...people.map((person) => {
    const item = document.createElement("button");
    const portrait = document.createElement("span");
    const portraitIcon = document.createElement("i");
    const copy = document.createElement("span");
    const heading = document.createElement("strong");
    const detail = document.createElement("small");
    const arrow = document.createElement("i");
    item.type = "button";
    item.className = "person-list-button";
    const roleText = person.role ?? "";
    portrait.className = "person-avatar";
    portraitIcon.className = `ph-duotone ${/伴侣/.test(roleText) ? "ph-heart" : (/老师/.test(roleText) ? "ph-chalkboard-teacher" : (/同事|工作/.test(roleText) ? "ph-briefcase" : (/同学|朋友/.test(roleText) ? "ph-user-circle" : "ph-house-line")))}`;
    portraitIcon.setAttribute("aria-hidden", "true");
    copy.className = "person-card-copy";
    heading.textContent = `${person.name} · ${person.role}`;
    detail.textContent = person.detail;
    arrow.className = "ph-duotone ph-caret-right";
    arrow.setAttribute("aria-hidden", "true");
    portrait.append(portraitIcon);
    copy.append(heading, detail);
    item.append(portrait, copy, arrow);
    item.addEventListener("click", () => navigate(ROUTES.PERSON, { id: person.id }));
    return item;
  }));
}

function renderInterests(interests) {
  const card = byId("interest-card");
  card.hidden = interests.length === 0;
  if (card.hidden) return;
  byId("interest-list").replaceChildren(...interests.map((interest) => {
    const item = document.createElement("div");
    item.className = "interest-item";
    const heading = document.createElement("div");
    const label = document.createElement("strong");
    const stage = document.createElement("span");
    const detail = document.createElement("small");
    const meter = document.createElement("div");
    const fill = document.createElement("i");
    label.textContent = interest.label;
    stage.textContent = interest.stageLabel;
    detail.textContent = `累计约${interest.totalHours}小时${interest.lastActivityLabel ? ` · 最近：${interest.lastActivityLabel}` : ""}`;
    meter.className = "interest-meter";
    fill.style.width = `${interest.score}%`;
    meter.append(fill);
    heading.append(label, stage);
    item.append(heading, detail, meter);
    return item;
  }));
}

function renderChildhoodExperience(experience) {
  const card = byId("childhood-experience-card");
  card.hidden = !experience;
  if (!experience) return;
  byId("childhood-experience-title").textContent = `${experience.label}留下了什么`;
  byId("childhood-experience-meta").textContent = `${experience.calendarYear}年 · ${experience.age}岁`;
  byId("childhood-experience-list").replaceChildren(...experience.results.map((resultEntry) => {
    const item = document.createElement("details");
    item.className = "childhood-experience-item";
    const heading = document.createElement("summary");
    const headingMain = document.createElement("span");
    const title = document.createElement("strong");
    const hours = document.createElement("span");
    const summaryFeedback = document.createElement("span");
    const body = document.createElement("div");
    const context = document.createElement("p");
    const process = document.createElement("ol");
    const response = document.createElement("p");
    const outcome = document.createElement("p");
    title.textContent = resultEntry.activityLabel;
    hours.className = "experience-hours";
    hours.textContent = `实际${resultEntry.actualHours}/${resultEntry.plannedHours}小时`;
    summaryFeedback.className = "experience-summary-feedback";
    summaryFeedback.textContent = `${resultEntry.actorName}：${resultEntry.response}`;
    body.className = "experience-body";
    context.className = "experience-context";
    context.textContent = `${resultEntry.setting} · ${resultEntry.actorName}（${resultEntry.actorRoleLabel}）`;
    process.replaceChildren(...resultEntry.process.map((step) => {
      const entry = document.createElement("li");
      entry.textContent = step;
      return entry;
    }));
    response.className = "experience-response";
    response.textContent = `${resultEntry.actorRoleLabel === "自己" ? "这次感受" : "对方回应"}：${resultEntry.response}`;
    outcome.className = "experience-outcome";
    outcome.textContent = `这次结果：${resultEntry.outcome}（${resultEntry.completionLabel}）`;
    headingMain.append(title, hours);
    heading.append(headingMain, summaryFeedback);
    body.append(context, process, response, outcome);
    item.append(heading, body);
    return item;
  }));
  const randomEvents = experience.randomEvents.map((event) => {
    const item = document.createElement("div");
    const title = document.createElement("strong");
    const description = document.createElement("span");
    item.className = "childhood-milestone childhood-random-event";
    title.textContent = `随机事件 · ${event.title}`;
    description.textContent = `${event.scene} 你选择了“${event.selectedLabel}”：${event.selectedDescription}`;
    item.append(title, description);
    return item;
  });
  const milestones = experience.milestones.map((milestone) => {
    const item = document.createElement("div");
    const title = document.createElement("strong");
    const description = document.createElement("span");
    item.className = "childhood-milestone";
    title.textContent = `成长节点 · ${milestone.title}`;
    description.textContent = `${milestone.description} ${milestone.unlockHint}`;
    item.append(title, description);
    return item;
  });
  byId("childhood-milestone-list").replaceChildren(...randomEvents, ...milestones);
}

function renderChildhoodGrowth(paths, memories) {
  const card = byId("childhood-growth-card");
  card.hidden = paths.length === 0;
  if (card.hidden) return;
  byId("childhood-growth-list").replaceChildren(...paths.map((path) => {
    const item = document.createElement("div");
    const heading = document.createElement("div");
    const title = document.createElement("strong");
    const level = document.createElement("span");
    const detail = document.createElement("small");
    const meter = document.createElement("div");
    const fill = document.createElement("i");
    item.className = "childhood-growth-item";
    title.textContent = path.label;
    level.textContent = `${path.levelLabel} · ${path.points}点`;
    detail.textContent = `${path.lastActivityLabel ? `最近：${path.lastActivityLabel}` : "尚无最近活动"}${path.nextThreshold ? ` · 距下一节点${Math.max(0, path.nextThreshold - path.points)}点` : " · 已形成稳定方式"}`;
    meter.className = "childhood-growth-meter";
    fill.style.width = `${Math.min(100, path.points / 24 * 100)}%`;
    meter.append(fill);
    heading.append(title, level);
    item.append(heading, detail, meter);
    return item;
  }));
  const details = byId("childhood-memory-details");
  details.hidden = memories.length === 0;
  byId("childhood-memory-list").replaceChildren(...memories.map((memory) => {
    const item = document.createElement("div");
    const title = document.createElement("strong");
    const summary = document.createElement("span");
    item.className = "childhood-memory-item";
    title.textContent = `${memory.calendarYear}年 · ${memory.age}岁Q${memory.quarter} · ${memory.title}`;
    summary.textContent = memory.summary;
    item.append(title, summary);
    return item;
  }));
}

function renderYearLedger(containerId, entries) {
  byId(containerId).replaceChildren(...entries.map((entry) => {
    const item = document.createElement("div");
    const label = document.createElement("span");
    const value = document.createElement("strong");
    label.textContent = entry.label;
    value.textContent = entry.value;
    item.append(label, value);
    return item;
  }));
}

function renderQuarterProgress(progress) {
  byId("quarter-progress-title").textContent = progress.allCompleted ? "四个季度已完成" : `第${progress.currentQuarter}季度`;
  byId("quarter-progress-count").textContent = `${progress.completedCount} / 4 已结算`;
  byId("quarter-progress-list").replaceChildren(...progress.quarters.map((quarter) => {
    const item = document.createElement("div");
    item.className = `quarter-step ${quarter.status}`;
    item.title = quarter.plan ? `${quarter.plan} · ${quarter.detail}` : `${quarter.label}尚未结算`;
    const label = document.createElement("strong");
    const state = document.createElement("span");
    label.textContent = quarter.label;
    state.textContent = quarter.status === "completed" ? "已结" : (quarter.status === "current" ? "当前" : "待定");
    item.append(label, state);
    return item;
  }));
  const latest = [...progress.quarters].reverse().find((quarter) => quarter.plan);
  byId("quarter-plan-summary").textContent = latest ? `${latest.label} · ${latest.plan} · ${latest.detail}` : "本年还没有完成季度安排";
}

function renderLatestDecision(decision) {
  const card = byId("quarter-unchosen-card");
  card.hidden = !decision || decision.unchosen.length === 0;
  if (card.hidden) return;
  card.open = false;
  byId("chosen-line").textContent = `你刚刚选择了：${decision.chosenLabel}`;
  byId("unchosen-list").replaceChildren(...decision.unchosen.map((option) => {
    const item = document.createElement("div");
    item.className = "unchosen-item";
    const title = document.createElement("strong");
    title.textContent = option.label;
    item.append(title);
    if (option.meta.length > 0) {
      const meta = document.createElement("small");
      meta.textContent = option.meta.join(" · ");
      item.append(meta);
    }
    return item;
  }));
}

function makeOptionButton(option, kind) {
  const button = document.createElement("button");
  button.className = "option-button";
  button.type = "button";
  if (option.categoryLabel) {
    const category = document.createElement("span");
    category.className = "activity-category";
    category.textContent = option.categoryLabel;
    button.append(category);
  }
  const title = document.createElement("strong");
  title.textContent = option.label;
  button.append(title);
  if (option.description) {
    const description = document.createElement("span");
    description.className = "option-description";
    description.textContent = option.description;
    button.append(description);
  }
  const effects = option.effects ?? {};
  const impactEntries = [
    ...(effects.gains ?? []).map((entry) => ({ type: "得到", text: entry, className: "gain-impact" })),
    ...(effects.costs ?? []).map((entry) => ({ type: "代价", text: entry, className: "cost-impact" })),
    ...(effects.mainline ?? []).map((entry) => ({ type: "主线", text: entry.label, className: "mainline-impact" })),
    ...(effects.stats ?? []).map((entry) => ({ type: "属性", text: `${entry.label} ${entry.delta >= 0 ? "+" : ""}${entry.delta}`, className: "stat-impact" })),
    ...(effects.interests ?? []).map((entry) => ({ type: "兴趣", text: `${entry.label} +${entry.delta}`, className: "interest-impact" })),
    ...(effects.growth ?? []).map((entry) => ({ type: "成长", text: `${entry.label} +${entry.delta}`, className: "growth-impact" })),
    ...(effects.requirements ?? []).map((entry) => ({ type: "解锁条件", text: `${entry.label}需${entry.value}点`, className: "requirement-impact" })),
  ];
  if (impactEntries.length > 0) {
    const impactList = document.createElement("div");
    impactList.className = "option-impact-list";
    impactList.replaceChildren(...impactEntries.map((entry) => {
      const chip = document.createElement("span");
      chip.className = entry.className;
      chip.textContent = `${entry.type} · ${entry.text}`;
      return chip;
    }));
    button.append(impactList);
  }
  if ((option.meta ?? []).length > 0) {
    const meta = document.createElement("small");
    meta.textContent = option.meta.join(" · ");
    button.append(meta);
  }
  button.classList.toggle("quarter-option", kind === "quarter_plan");
  button.classList.toggle("review-option", kind === "year_review");
  button.classList.toggle("plan-control", Boolean(option.isPlanControl));
  button.disabled = option.available === false;
  return button;
}

const SIMULATOR_MODULES = Object.freeze([
  { id: "life.module.learning", label: "学校 / 启蒙", shortLabel: "学习", icon: "ph-book-open-text", categories: ["learning"] },
  { id: "life.module.interests", label: "兴趣 / 活动", shortLabel: "兴趣", icon: "ph-paint-brush", categories: ["creative", "exploration", "entertainment"] },
  { id: "life.module.relationships", label: "同伴 / 关系", shortLabel: "关系", icon: "ph-users-three", categories: ["social"] },
  { id: "life.module.family", label: "家庭 / 生活", shortLabel: "家庭", icon: "ph-house-line", categories: ["family"] },
  { id: "life.module.daily", label: "日常 / 恢复", shortLabel: "日常", icon: "ph-bed", categories: ["recovery", "health", "finance", "work"] },
]);

function simulatorModuleFor(option) {
  if (option.moduleId && SIMULATOR_MODULES.some((module) => module.id === option.moduleId)) return option.moduleId;
  return SIMULATOR_MODULES.find((module) => module.categories.includes(option.category))?.id
    ?? "life.module.daily";
}

function simulatorModule(id) {
  return SIMULATOR_MODULES.find((module) => module.id === id) ?? SIMULATOR_MODULES[0];
}

function simulatorIntensity(option, selectedIntensities) {
  const intensityId = selectedIntensities.get(option.id) ?? option.defaultIntensity ?? "regular";
  const intensity = option.intensities?.find((entry) => entry.id === intensityId);
  return {
    id: intensityId,
    label: intensity?.label ?? intensityId,
    timeSlots: intensity?.timeSlots ?? option.timeSlots ?? 2,
    energyCost: intensity?.energyCost ?? option.energyCost ?? 2,
  };
}

function simulatorCashLabel(value) {
  if (!Number.isFinite(value)) return "不限";
  return formatCurrency(value);
}

function renderSimulatorDrawer(activities, selectedIds, selectedIntensities, toggleActivity, setIntensity, resources, pending) {
  const drawer = byId("life-action-drawer");
  if (!drawer || drawer.hidden) return;
  const module = simulatorModule(simulatorModuleId);
  byId("life-action-drawer-kicker").textContent = module.shortLabel;
  byId("life-action-drawer-title").textContent = module.label;
  const moduleActivities = activities.filter((option) => simulatorModuleFor(option) === module.id);
  const list = byId("life-action-drawer-list");
  list.replaceChildren(...moduleActivities.map((option) => {
    const intensity = simulatorIntensity(option, selectedIntensities);
    const row = document.createElement("article");
    const header = document.createElement("div");
    const title = document.createElement("strong");
    const object = document.createElement("span");
    const costs = document.createElement("small");
    const hint = document.createElement("p");
    const longTerm = document.createElement("p");
    const action = document.createElement("button");
    row.className = "simulator-action-row";
    row.dataset.actionId = option.id;
    row.dataset.moduleId = simulatorModuleFor(option);
    row.classList.toggle("selected", selectedIds.has(option.id));
    row.classList.toggle("unavailable", option.available === false);
    title.textContent = option.label;
    object.textContent = option.actor?.name ? `对象：${option.actor.name}` : `对象：${option.setting ?? "当前生活"}`;
    costs.textContent = `${intensity.timeSlots}格 · ${intensity.energyCost}精力 · ${simulatorCashLabel(option.cashCostYuan ?? 0)}`;
    hint.textContent = option.available === false
      ? `条件：${option.unavailableReason ?? option.unlockHint ?? "当前条件还不满足"}`
      : `现在：${option.description ?? "这件事会在三个月里慢慢发生。"}`;
    longTerm.className = "simulator-action-long-term";
    longTerm.textContent = `长期：${option.longTermPrompt
      ?? option.effects?.[0]?.label
      ?? "结果会写入季度记录，后续行动和事件可能读取这段经历"}`;
    action.type = "button";
    action.className = "simulator-action-toggle";
    action.textContent = option.available === false ? "查看原因" : (selectedIds.has(option.id) ? "移除" : "加入本季");
    action.disabled = option.available === false;
    if (!action.disabled) action.addEventListener("click", () => toggleActivity(option));
    header.append(title, object, costs);
    row.append(header, hint, longTerm, action);
    if (selectedIds.has(option.id) && option.intensities?.length) {
      const intensityBar = document.createElement("div");
      intensityBar.className = "simulator-intensity-bar";
      intensityBar.replaceChildren(...option.intensities.map((entry) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = `${entry.label} · ${entry.timeSlots}格/${entry.energyCost}精力`;
        button.classList.toggle("active", entry.id === intensity.id);
        button.addEventListener("click", () => setIntensity(option, entry.id));
        return button;
      }));
      row.append(intensityBar);
    }
    return row;
  }));
  if (moduleActivities.length === 0) {
    const empty = document.createElement("p");
    empty.className = "simulator-empty-state";
    empty.textContent = "这一季暂时没有符合条件的具体行动。可以换一个生活模块。";
    list.append(empty);
  }
  byId("life-action-drawer-note").textContent = pending
    ? `已选${selectedIds.size}项 · 还剩${Math.max(0, resources.remainingSlots)}格时间、${Math.max(0, resources.remainingEnergy)}点精力。行动先进入草案，提交后才成为 Core 事实。`
    : "当前没有可编辑的季度草案。";
  byId("life-action-drawer-budget").textContent = `${resources.timeSlots}/${pending?.quarterBudget?.availableTimeSlots ?? 0}格 · ${resources.energy}/${pending?.quarterBudget?.availableEnergy ?? 0}精力`;
}

function renderSimulatorShell(view, pending, activities, selectedIds, selectedIntensities, resources, toggleActivity, setIntensity, submitQuarterPlan) {
  const root = byId("life-simulator-main");
  if (!root) return;
  const quarter = pending?.quarter ?? view.quarterProgress?.currentQuarter ?? 1;
  byId("simulator-year").textContent = `${view.year}`;
  byId("simulator-age").textContent = `${view.age}岁`;
  byId("simulator-quarter").textContent = `Q${quarter}`;
  byId("simulator-stage").textContent = view.stageLabel;
  byId("simulator-data-status").textContent = view.dataStatusLabel;
  const budget = pending?.quarterBudget;
  const availableSlots = budget?.availableTimeSlots ?? 0;
  const availableEnergy = budget?.availableEnergy ?? 0;
  const cash = pending?.availableCashYuan;
  byId("simulator-time").textContent = `${Math.max(0, resources.remainingSlots)}/${availableSlots}格`;
  byId("simulator-energy").textContent = `${Math.max(0, resources.remainingEnergy)}/${availableEnergy}`;
  byId("simulator-cash").textContent = Number.isFinite(cash) ? formatCurrency(cash) : "不限";
  const responsibilities = budget?.obligations ?? [];
  byId("simulator-responsibility-summary").textContent = `${budget?.obligationSlots ?? 0}格固定占用`;
  byId("simulator-responsibility-list").replaceChildren(...(responsibilities.length > 0 ? responsibilities.map((entry) => {
    const item = document.createElement("span");
    item.textContent = `${entry.label} · ${entry.slots ?? entry.timeSlots ?? 0}格`;
    return item;
  }) : [Object.assign(document.createElement("span"), { textContent: "本季暂无额外固定责任" })]));
  const quarterList = byId("simulator-quarter-list");
  quarterList.replaceChildren(...(view.quarterProgress?.quarters ?? []).map((entry) => {
    const item = document.createElement("div");
    item.className = `simulator-quarter-item ${entry.status}`;
    item.dataset.quarter = String(entry.quarter);
    item.innerHTML = `<b>Q${entry.quarter}</b><span>${entry.status === "completed" ? "已完成" : (entry.status === "current" ? "现在" : "将来")}</span>`;
    return item;
  }));
  byId("simulator-quarter-title").textContent = `Q${quarter} · ${pending?.quarterLabel ?? "本季度"}`;
  byId("simulator-quarter-count").textContent = `${view.quarterProgress?.completedCount ?? 0} / 4 已完成`;
  const selected = activities.filter((option) => selectedIds.has(option.id));
  byId("simulator-draft-budget").textContent = selected.length > 0
    ? `${selected.length}项 · ${resources.timeSlots}格/${resources.energy}精力`
    : "尚未安排";
  byId("simulator-draft-list").replaceChildren(...selected.map((option) => {
    const chip = document.createElement("div");
    const label = document.createElement("strong");
    const meta = document.createElement("span");
    const remove = document.createElement("button");
    const intensity = simulatorIntensity(option, selectedIntensities);
    chip.className = "simulator-draft-chip";
    chip.dataset.actionId = option.id;
    chip.dataset.moduleId = simulatorModuleFor(option);
    label.textContent = option.label;
    meta.textContent = `${intensity.label} · ${intensity.timeSlots}格/${intensity.energyCost}精力`;
    remove.type = "button";
    remove.textContent = "移除";
    remove.addEventListener("click", () => toggleActivity(option));
    chip.append(label, meta, remove);
    return chip;
  }));
  const budgetProblem = resources.remainingSlots < 0
    ? `时间还差${Math.abs(resources.remainingSlots)}格：固定责任已占用${budget?.obligationSlots ?? 0}格，请移除行动或降低投入。`
    : (resources.remainingEnergy < 0
      ? `精力还差${Math.abs(resources.remainingEnergy)}点：请降低投入或移除一项行动。`
      : (resources.validCash === false
        ? `现金还差${formatCurrency(resources.cash - (pending?.availableCashYuan ?? 0))}：先换一项不花钱的安排。`
        : null));
  byId("simulator-draft-note").textContent = budgetProblem
    ?? (selected.length > 0
      ? "行动仍是草案；推进季度后才由 Core 结算。"
      : `从下面五个生活模块加入${pending?.minActivities ?? 1}～${pending?.maxActivities ?? 3}件具体的事。`);
  const recent = [
    ...(view.latestQuarterOutcome?.mainline ?? []).map((entry) => entry.label),
    ...(view.interests ?? []).slice(0, 1).map((entry) => `${entry.label} · ${entry.stageLabel}`),
    ...(view.people ?? []).slice(0, 1).map((entry) => `${entry.name} · ${entry.role}`),
  ].filter(Boolean).slice(0, 2);
  byId("simulator-recent-list").replaceChildren(...(recent.length > 0 ? recent.map((text) => {
    const item = document.createElement("p");
    item.textContent = text;
    return item;
  }) : [Object.assign(document.createElement("p"), { textContent: "这是第一季，最近发生会从你的行动开始留下来。" })]));
  const moduleList = byId("simulator-module-list");
  moduleList.replaceChildren(...SIMULATOR_MODULES.map((module) => {
    const button = document.createElement("button");
    const icon = document.createElement("i");
    const title = document.createElement("strong");
    const count = document.createElement("small");
    const moduleCount = activities.filter((option) => simulatorModuleFor(option) === module.id).length;
    button.type = "button";
    button.className = `simulator-module ${module.id === simulatorModuleId ? "active" : ""}`;
    button.dataset.moduleId = module.id;
    icon.className = `ph-duotone ${module.icon}`;
    icon.setAttribute("aria-hidden", "true");
    title.textContent = module.label;
    count.textContent = `${moduleCount}项可用`;
    button.append(icon, title, count);
    button.addEventListener("click", () => {
      simulatorModuleId = module.id;
      const drawer = byId("life-action-drawer");
      drawer.hidden = false;
      renderSimulatorDrawer(activities, selectedIds, selectedIntensities, toggleActivity, setIntensity, resources, pending);
    });
    return button;
  }));
  const primary = byId("simulator-primary-action");
  primary.hidden = selected.length < (pending?.minActivities ?? 1);
  primary.disabled = !pending || !resources.valid;
  primary.textContent = selected.length > 0 && resources.valid ? "进入下一季度" : "安排本季度";
  primary.onclick = submitQuarterPlan;
  if (!byId("life-action-drawer").hidden) renderSimulatorDrawer(activities, selectedIds, selectedIntensities, toggleActivity, setIntensity, resources, pending);
}

function renderQuarterPlan(pending, view) {
  const poolKey = pending.eventId;
  if (actionPoolState.key !== poolKey) actionPoolState = { key: poolKey, category: "all", offset: 0 };
  const restoredDraft = restoreQuarterDraft(poolKey, pending.options.filter((option) => !option.isPlanControl));
  const selectedIds = actionDrafts.get(poolKey) ?? new Set(restoredDraft.allocations.map((allocation) => allocation.actionId));
  actionDrafts.set(poolKey, selectedIds);
  const selectedIntensities = actionIntensityDrafts.get(poolKey) ?? new Map(restoredDraft.allocations.map((allocation) => [allocation.actionId, allocation.intensity]));
  actionIntensityDrafts.set(poolKey, selectedIntensities);
  const controls = pending.options.filter((option) => option.isPlanControl);
  const activities = pending.options.filter((option) => !option.isPlanControl);
  const container = byId("option-list");
  const budget = byId("plan-budget");
  const confirm = byId("confirm-plan-button");
  const poolCard = byId("action-pool-card");
  const controlList = byId("plan-control-list");
  const pageSize = 6;
  poolCard.hidden = false;
  budget.hidden = false;
  confirm.hidden = false;
  const controlButtons = controls.map((option) => {
    const button = makeOptionButton(option, pending.kind);
    if (!button.disabled) button.addEventListener("click", () => chooseOption(option.id));
    return button;
  });
  controlList.hidden = controlButtons.length === 0;
  if (controlButtons.length > 0) {
    const heading = document.createElement("p");
    heading.className = "plan-control-heading";
    heading.textContent = "沿用已有生活节奏";
    controlList.replaceChildren(heading, ...controlButtons);
  } else controlList.replaceChildren();

  const categoryMap = new Map([["all", "全部"]]);
  for (const activity of activities) categoryMap.set(activity.category ?? "other", activity.categoryLabel ?? "其他");

  function toggleActivity(option) {
    let changed = false;
    if (selectedIds.has(option.id)) {
      selectedIds.delete(option.id);
      selectedIntensities.delete(option.id);
      changed = true;
    } else if (selectedIds.size < pending.maxActivities) {
      selectedIds.add(option.id);
      selectedIntensities.set(option.id, option.defaultIntensity ?? "regular");
      changed = true;
    } else {
      playFeedback("warning", "light");
      showGameToast(`这一季最多安排${pending.maxActivities}项行动`, "ph-warning");
    }
    if (changed) playFeedback("choice", "medium");
    persistQuarterDraft(poolKey, [...selectedIds].map((actionId) => ({
      actionId,
      intensity: selectedIntensities.get(actionId)
        ?? activities.find((entry) => entry.id === actionId)?.defaultIntensity
        ?? "regular",
    })));
    updateBudget();
  }

  function filteredActivities() {
    return actionPoolState.category === "all"
      ? activities
      : activities.filter((option) => option.category === actionPoolState.category);
  }

  function renderCategories() {
    byId("action-pool-categories").replaceChildren(...[...categoryMap].map(([id, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.classList.toggle("active", actionPoolState.category === id);
      button.setAttribute("aria-pressed", String(actionPoolState.category === id));
      button.addEventListener("click", () => {
        actionPoolState.category = id;
        actionPoolState.offset = 0;
        renderCategories();
        renderPool();
      });
      return button;
    }));
  }

  function renderPool() {
    const filtered = filteredActivities();
    if (actionPoolState.offset >= filtered.length) actionPoolState.offset = 0;
    const visible = filtered.slice(actionPoolState.offset, actionPoolState.offset + pageSize);
    byId("action-pool-count").textContent = `${activities.length}项符合${pending.age}岁 · 当前显示${visible.length}项`;
    byId("action-pool-next").hidden = filtered.length <= pageSize;
    byId("action-pool-hint").textContent = `从${filtered.length}项“${categoryMap.get(actionPoolState.category)}”行动中推出当前一批；不可执行项会保留并说明解锁条件。`;
    container.replaceChildren(...visible.map((option) => {
      const button = makeOptionButton(option, pending.kind);
      button.classList.add("activity-option");
      button.dataset.optionId = option.id;
      const selected = selectedIds.has(option.id);
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
      if (!button.disabled) button.addEventListener("click", () => toggleActivity(option));
      return button;
    }));
    updateBudget();
  }

  byId("action-pool-next").onclick = () => {
    const filtered = filteredActivities();
    actionPoolState.offset = (actionPoolState.offset + pageSize) % Math.max(1, filtered.length);
    renderPool();
  };

  function updateBudget() {
    const selected = activities.filter((option) => selectedIds.has(option.id));
    const allocationFor = (option) => {
      const intensityId = selectedIntensities.get(option.id) ?? option.defaultIntensity ?? "regular";
      const intensity = option.intensities?.find((entry) => entry.id === intensityId);
      return {
        actionId: option.id,
        intensity: intensityId,
        timeSlots: intensity?.timeSlots ?? option.timeSlots ?? 2,
        energyCost: intensity?.energyCost ?? option.energyCost ?? 2,
      };
    };
    const allocations = selected.map(allocationFor);
    const hours = selected.reduce((sum, option) => sum + option.timeUseHoursPerWeek, 0);
    const cash = selected.reduce((sum, option) => sum + (option.cashCostYuan ?? 0), 0);
    const timeSlots = allocations.reduce((sum, entry) => sum + entry.timeSlots, 0);
    const energy = allocations.reduce((sum, entry) => sum + entry.energyCost, 0);
    const remaining = pending.weeklyDiscretionaryHours - hours;
    const remainingSlots = pending.quarterBudget.availableTimeSlots - timeSlots;
    const remainingEnergy = pending.quarterBudget.availableEnergy - energy;
    const validCount = selected.length >= pending.minActivities && selected.length <= pending.maxActivities;
    const validHours = remaining >= 0;
    const validCash = !Number.isFinite(pending.availableCashYuan) || cash <= pending.availableCashYuan;
    const validSlots = remainingSlots >= 0;
    const validEnergy = remainingEnergy >= 0;
    const valid = validCount && validHours && validCash && validSlots && validEnergy;
    byId("plan-budget-title").textContent = `已选${selected.length}项 · 需${pending.minActivities}～${pending.maxActivities}项`;
    byId("plan-budget-hours").textContent = `${timeSlots}/${pending.quarterBudget.availableTimeSlots}格 · ${energy}/${pending.quarterBudget.availableEnergy}精力`;
    const fill = byId("plan-budget-fill");
    const resourceRatio = Math.max(
      timeSlots / pending.quarterBudget.availableTimeSlots,
      energy / (pending.quarterBudget.availableEnergy + 3),
    );
    fill.style.width = `${Math.min(100, resourceRatio * 100)}%`;
    fill.classList.toggle("over", !validHours || !validCash || !validSlots || !validEnergy);
    byId("plan-budget-note").textContent = validSlots && validEnergy && validHours && validCash
      ? `保留${remainingSlots}格时间、${Math.max(0, remainingEnergy)}点精力。${pending.unallocatedTimeMeaning}`
      : (!validSlots
          ? `超过季度时间预算${Math.abs(remainingSlots)}格，请减少行动或降低投入。`
               : (!validEnergy
               ? `精力还差${Math.abs(remainingEnergy)}点，请降低投入或移除一项行动。`
              : (!validHours ? `具体生活工时无法同时安排，请减少活动。` : `本季度活动预计支出${formatCurrency(cash)}，超过可用额度。`)));
    confirm.disabled = !valid;
    byId("plan-selected-summary").textContent = selected.length > 0
      ? `已选：${selected.map((option) => option.label).join("、")}`
      : "尚未选择行动；可以切换分类或换一批继续寻找。";
    const createIntensityRows = (compact = false) => selected.map((option) => {
      const row = document.createElement("div");
      const label = document.createElement("strong");
      const choices = document.createElement("div");
      row.className = "plan-intensity-row";
      row.classList.toggle("compact", compact);
      label.textContent = option.label;
      choices.className = "plan-intensity-choices";
      choices.replaceChildren(...(option.intensities ?? []).map((intensity) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = `${intensity.label} · ${intensity.timeSlots}格/${intensity.energyCost}精力`;
        button.classList.toggle("active", selectedIntensities.get(option.id) === intensity.id);
        button.setAttribute("aria-pressed", String(selectedIntensities.get(option.id) === intensity.id));
        button.addEventListener("click", () => {
          selectedIntensities.set(option.id, intensity.id);
          persistQuarterDraft(poolKey, [...selectedIds].map((actionId) => ({
            actionId,
            intensity: selectedIntensities.get(actionId)
              ?? activities.find((entry) => entry.id === actionId)?.defaultIntensity
              ?? "regular",
          })));
          playFeedback("click", "light");
          updateBudget();
        });
        return button;
      }));
      row.append(label, choices);
      return row;
    });
    byId("plan-intensity-list").replaceChildren(...createIntensityRows());
    for (const button of container.querySelectorAll(".activity-option")) {
      const selected = selectedIds.has(button.dataset.optionId);
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
    renderSimulatorShell(view, pending, activities, selectedIds, selectedIntensities, {
      timeSlots,
      energy,
      remainingSlots,
      remainingEnergy,
      valid,
      validCash,
      cash,
    }, toggleActivity, (option, intensity) => {
      selectedIntensities.set(option.id, intensity);
      persistQuarterDraft(poolKey, [...selectedIds].map((actionId) => ({
        actionId,
        intensity: selectedIntensities.get(actionId)
          ?? activities.find((entry) => entry.id === actionId)?.defaultIntensity
          ?? "regular",
      })));
      updateBudget();
    }, submitQuarterPlan);
  }
  async function submitQuarterPlan() {
    if (confirm.disabled || selectedIds.size === 0) return;
    playFeedback("stamp", "medium");
    chooseOption({
      type: "quarter.plan",
      eventId: pending.eventId,
      allocations: [...selectedIds].map((actionId) => ({
        actionId,
        intensity: selectedIntensities.get(actionId)
          ?? activities.find((option) => option.id === actionId)?.defaultIntensity
          ?? "regular",
      })),
    });
  }
  confirm.onclick = submitQuarterPlan;
  renderCategories();
  renderPool();
}

function renderSingleChoice(pending, containerId) {
  byId(containerId).replaceChildren(...pending.options.map((option) => {
    const button = makeOptionButton(option, pending.kind);
    if (!button.disabled) button.addEventListener("click", () => {
      playFeedback(pending.kind === "year_review" ? "page" : "choice", pending.kind === "year_review" ? "medium" : "light");
      chooseOption(option.id);
    });
    return button;
  }));
}

function pendingStageText(view) {
  if (view.pending.kind === "quarter_plan") return `${view.age}岁 · ${view.year}年${view.pending.quarterLabel}`;
  if (view.pending.kind === "year_review") return `${view.age}岁年度结算 · ${view.year}年`;
  if (view.pending.kind === "random_life_event") return `${view.age}岁 · ${view.year}年第${view.pending.quarter}季度第${view.pending.monthInQuarter ?? 2}个月 · 随机生活事件`;
  if (view.pending.kind === "mainline_event") return `${view.age}岁 · ${view.year}年第${view.pending.quarter}季度 · 人生主线事件`;
  return `${view.year}年 · ${view.stageLabel}关键事件`;
}

function renderLifeDecision(view) {
  const pending = view.pending;
  const quarterPlan = pending?.kind === "quarter_plan";
  byId("life-simulator-main").hidden = !quarterPlan;
  byId("event-card").hidden = !pending || quarterPlan;
  if (!pending) {
    return;
  }
  byId("event-stage").textContent = pendingStageText(view);
  byId("event-title").textContent = pending.title;
  byId("event-prompt").textContent = pending.kind === "quarter_plan"
    ? `${pending.prompt} 本季度有${pending.quarterBudget.availableTimeSlots}格可支配时间和${pending.quarterBudget.availableEnergy}点精力；行动将在三个月中结算。${Number.isFinite(pending.availableCashYuan) ? `本季度可用于这些活动的额度为${formatCurrency(pending.availableCashYuan)}。` : ""}`
    : pending.prompt;
  if (quarterPlan) renderQuarterPlan(pending, view);
  else {
    byId("action-pool-card").hidden = true;
    byId("plan-control-list").hidden = true;
    byId("plan-budget").hidden = true;
    byId("confirm-plan-button").hidden = true;
    byId("confirm-plan-button").onclick = null;
    renderSingleChoice(pending, "option-list");
  }
}

function impactRows(outcomes) {
  const totals = { stats: new Map(), statProgress: new Map(), interests: new Map(), growth: new Map() };
  const milestones = new Map();
  const mainline = new Map();
  const randomEvents = new Map();
  for (const outcome of outcomes.filter(Boolean)) {
    for (const type of ["stats", "statProgress", "interests", "growth"]) {
      for (const entry of outcome[type] ?? []) {
        const previous = totals[type].get(entry.id) ?? { ...entry, delta: 0 };
        previous.delta += entry.delta;
        totals[type].set(entry.id, previous);
      }
    }
    for (const milestone of outcome.milestones ?? []) milestones.set(milestone.id, milestone);
    for (const entry of outcome.mainline ?? []) mainline.set(`${entry.type}:${entry.label}`, entry);
    for (const event of outcome.randomEvents ?? []) randomEvents.set(event.eventId, event);
  }
  return [
    ...[...randomEvents.values()].map((event) => ({
      type: "突发事件",
      title: `${event.title}：${event.selectedLabel}`,
      detail: [
        `发生在季度第${event.monthInQuarter ?? 2}个月`,
        ...(event.stats ?? []).map((entry) => `${entry.label}${entry.delta >= 0 ? "+" : ""}${entry.delta}`),
      ].join(" · "),
      className: "event",
    })),
    ...[...mainline.values()].map((entry) => ({ type: "人生主线", title: entry.label, detail: "这项实际发生的行动已经进入当前课题和人生方向记录", className: "mainline" })),
    ...[...totals.stats.values()].map((entry) => ({ type: "属性", title: `${entry.label} ${entry.delta >= 0 ? "+" : ""}${Math.round(entry.delta * 100) / 100}`, detail: "季度行为已经即时计入属性成长", className: "stat" })),
    ...[...totals.statProgress.values()]
      .filter((entry) => !totals.stats.has(entry.id))
      .map((entry) => ({ type: "属性积累", title: `${entry.label} ${entry.delta >= 0 ? "+" : ""}${Math.round(entry.delta * 100) / 100}`, detail: "本季度已产生影响；累计到整数点后会显示在六项终身属性中", className: "stat-progress" })),
    ...[...totals.interests.values()].map((entry) => ({ type: "兴趣", title: `${entry.label} +${entry.delta}`, detail: "反复投入会从接触发展为兴趣、爱好与长期爱好", className: "interest" })),
    ...[...totals.growth.values()].map((entry) => ({ type: "成长线", title: `${entry.label} +${entry.delta}`, detail: "成长线会解锁更复杂的后续行动", className: "growth" })),
    ...[...milestones.values()].map((entry) => ({ type: "新解锁", title: entry.title, detail: entry.unlockHint, className: "unlock" })),
  ];
}

function renderImpactList(containerId, outcomes) {
  const rows = impactRows(outcomes);
  byId(containerId).replaceChildren(...rows.map((entry, index) => {
    const item = document.createElement("div");
    item.className = `impact-item ${entry.className}`;
    item.style.setProperty("--impact-delay", `${Math.min(index, 8) * 46}ms`);
    const type = document.createElement("span");
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    const detail = document.createElement("small");
    type.textContent = entry.type;
    title.textContent = entry.title;
    detail.textContent = entry.detail;
    copy.append(title, detail);
    item.append(type, copy);
    return item;
  }));
  return rows.length;
}

function renderQuarterMonths(outcomes) {
  const card = byId("quarter-month-card");
  const groups = outcomes.filter((outcome) => outcome.monthTicks?.length > 0);
  card.hidden = groups.length === 0;
  if (card.hidden) {
    byId("quarter-month-list").replaceChildren();
    return;
  }
  byId("quarter-month-list").replaceChildren(...groups.map((outcome, groupIndex) => {
    const group = document.createElement("section");
    const title = document.createElement("strong");
    const grid = document.createElement("div");
    group.className = "quarter-month-group";
    title.textContent = `Q${outcome.quarter} · ${outcome.executionRate < 1 ? `计划实际完成${Math.round(outcome.executionRate * 100)}%` : "计划按月推进"}`;
    grid.className = "quarter-month-grid";
    grid.replaceChildren(...outcome.monthTicks.map((tick, tickIndex) => {
      const item = document.createElement("div");
      const month = document.createElement("span");
      const status = document.createElement("i");
      const actions = document.createElement("strong");
      const resources = document.createElement("small");
      item.className = `quarter-month-item ${tick.status}`;
      item.style.setProperty("--month-delay", `${(groupIndex * 3 + tickIndex) * 90}ms`);
      month.textContent = `${tick.calendarMonth}月`;
      status.textContent = tick.interruption ? "发生变化" : (tick.overdraftEnergy > 0 ? "精力透支" : "已执行");
      actions.textContent = tick.actions.length > 0
        ? tick.actions.map((entry) => entry.label).join("、")
        : "普通生活与休息";
      resources.textContent = `${tick.energySpent}/${tick.energyAvailable}精力${tick.recoveryEnergy > 0 ? ` · 恢复${tick.recoveryEnergy}` : ""}`;
      item.append(month, status, actions, resources);
      item.title = tick.narrative;
      return item;
    }));
    group.append(title, grid);
    return group;
  }));
}

function renderQuarterInterruptions(outcomes) {
  const card = byId("quarter-interruption-card");
  const categoryLabels = {
    "*": "全部安排",
    entertainment: "兴趣活动",
    health: "身体活动",
    social: "关系活动",
    exploration: "观察探索",
  };
  const interrupted = outcomes.filter((outcome) => outcome.interruption);
  card.hidden = interrupted.length === 0;
  if (card.hidden) {
    byId("quarter-interruption-list").replaceChildren();
    return;
  }
  byId("quarter-interruption-list").replaceChildren(...interrupted.map((outcome) => {
    const interruption = outcome.interruption;
    const item = document.createElement("section");
    const title = document.createElement("strong");
    const timing = document.createElement("span");
    const affected = document.createElement("p");
    const settlement = document.createElement("small");
    const affectedCategories = interruption.affectedCategories ?? ["*"];
    const affectedActivities = (outcome.activities ?? [])
      .filter((activity) => affectedCategories.includes("*") || affectedCategories.includes(activity.category))
      .map((activity) => activity.label ?? activity.activityLabel ?? activity.id);
    const interruptionMonth = Math.min(3, Math.max(1, interruption.monthInQuarter ?? 1));
    const monthsBefore = interruptionMonth - 1;
    const monthsAfter = 3 - interruptionMonth;
    item.className = "quarter-interruption-item";
    title.textContent = `Q${outcome.quarter} · ${interruption.reason}`;
    timing.textContent = `第${interruptionMonth}个月发生 · 严重度${interruption.severity === "major" ? "较高" : "较轻"}`;
    affected.textContent = affectedActivities.length > 0
      ? `受影响行动：${affectedActivities.join("、")}`
      : `受影响范围：${affectedCategories.map((id) => categoryLabels[id] ?? id).join("、")}`;
    settlement.textContent = `事件前已执行${monthsBefore}个月；事件后剩余${monthsAfter}个月按调整后的计划继续，最终完成${Math.round((outcome.executionRate ?? 1) * 100)}%。`;
    item.append(title, timing, affected, settlement);
    return item;
  }));
}

function renderLatestGrowth(outcome) {
  const card = byId("latest-growth-card");
  const count = renderImpactList("latest-growth-list", outcome ? [outcome] : []);
  card.hidden = count === 0;
  if (!card.hidden) byId("latest-growth-title").textContent = `${outcome.label} · ${outcome.operationLabel}`;
}

function renderTimeline(groups) {
  byId("timeline-list").replaceChildren(...groups.map((groupEntry, index) => {
    const group = document.createElement("details");
    group.className = "timeline-year-group";
    group.open = index === 0;
    const summary = document.createElement("summary");
    const year = document.createElement("strong");
    const meta = document.createElement("span");
    year.textContent = groupEntry.year;
    meta.textContent = `${groupEntry.age}岁 · ${groupEntry.stageLabel} · ${groupEntry.quarterEntries.length}条季度记录`;
    summary.append(year, meta);
    group.append(summary);
    const annual = document.createElement("div");
    annual.className = "timeline-annual-summary";
    annual.replaceChildren(...groupEntry.annualEntries.map((entry) => {
      const line = document.createElement("p");
      line.textContent = entry.text;
      return line;
    }));
    group.append(annual);
    if (groupEntry.quarterEntries.length > 0) {
      const detail = document.createElement("details");
      detail.className = "timeline-quarter-details";
      const detailSummary = document.createElement("summary");
      detailSummary.textContent = "展开季度明细";
      detail.append(detailSummary, ...groupEntry.quarterEntries.map((entry) => {
        const line = document.createElement("p");
        line.textContent = entry.text;
        return line;
      }));
      group.append(detail);
    }
    return group;
  }));
}

function setRecordsTab(tabId) {
  const profile = tabId === "profile";
  byId("records-timeline-panel").hidden = profile;
  byId("records-profile-panel").hidden = !profile;
  for (const button of document.querySelectorAll("[data-record-tab]")) {
    const active = button.dataset.recordTab === tabId;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  }
}

function setCharacterTab(tabId) {
  for (const panelId of ["status", "growth", "life"]) {
    byId(`character-${panelId}-panel`).hidden = panelId !== tabId;
  }
  for (const button of document.querySelectorAll("[data-character-tab]")) {
    const active = button.dataset.characterTab === tabId;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  }
}

function renderMain(route) {
  const view = pages.game;
  showScreen("game");
  byId("current-year").textContent = view.year;
  byId("current-age").textContent = `${view.age}岁`;
  byId("stage-badge").textContent = view.stageLabel;
  byId("data-badge").textContent = view.dataStatusLabel;
  byId("data-badge").classList.toggle("scenario", view.dataStatus === "scenario");
  renderMainline(view.mainline);
  renderQuarterProgress(view.quarterProgress);
  renderSituation(view.situation);
  renderLifeDecision(view);
  renderStats("stats-row", view.stats);
  renderCharacterStates(view.characterStates);
  renderCharacterPortrait(view.visual);
  renderLifeDirections(view.mainline);
  renderYouthPayoffReview(view.mainline?.youthPayoffReview);
  renderLatestGrowth(pages.growth.latestGrowth);
  renderInterests(view.interests);
  renderChildhoodGrowth(view.childhoodGrowth, view.childhoodMemories);
  renderFacts("growth-fact-list", view.facts);
  renderYearLedger("year-ledger-list", view.yearLedger);
  renderPeople(view.people);
  renderTimeline(pages.timeline.groups);
  byId("archive-birth-year").textContent = `${pages.archive.birthYear}年`;
  byId("archive-current-point").textContent = `${pages.archive.year}年 · ${pages.archive.age}岁 · ${pages.archive.stageLabel}`;
  byId("archive-seed").textContent = pages.archive.seed;
  byId("archive-introduction").textContent = pages.archive.introduction;
  renderGallery();
  for (const pageRoute of MAIN_ROUTES) byId(`${pageRoute}-page`).hidden = pageRoute !== route;
  for (const button of byId("main-navigation").querySelectorAll("button")) {
    const active = button.dataset.route === route;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
  byId("main-navigation").hidden = result.status === "completed";
  if (result.status !== "completed") saveActiveSession();
}

function renderRandomEvent() {
  const view = pages.game;
  const pending = view.pending;
  showScreen("random-event");
  const isMainline = pending.kind === "mainline_event";
  byId("header-title").textContent = isMainline ? "人生事件" : "突发事件";
  byId("random-event-stage").textContent = isMainline
    ? pending.chapterLabel
    : `${pending.quarterLabel ?? `Q${pending.quarter}`}`;
  byId("random-event-meta").textContent = `${view.year}年 · ${view.age}岁`;
  byId("random-event-eyebrow").textContent = isMainline
    ? "过去做过的事，正在变成新的机会与代价"
    : "计划之外发生了变化";
  byId("random-event-title").textContent = pending.title;
  byId("random-event-prompt").textContent = pending.prompt;
  const evidenceCard = byId("mainline-event-evidence");
  evidenceCard.hidden = !isMainline;
  if (isMainline) {
    byId("mainline-event-direction").textContent = `当前连续方向 · ${pending.directionLabel} ${pending.evidence.score}/100`;
    const rows = [
      `相关兴趣累计约${pending.evidence.totalHours}小时`,
      `当前兴趣积累${pending.evidence.currentInterestScore}点`,
      `成长线积累${pending.evidence.growthPoints}点`,
      pending.evidence.lastActivityLabel ? `最近来源：${pending.evidence.lastActivityLabel}` : "还没有单一行动占据主导",
    ];
    byId("mainline-event-evidence-list").replaceChildren(...rows.map((text) => {
      const row = document.createElement("span");
      row.textContent = text;
      return row;
    }));
  }
  renderSingleChoice(pending, "random-event-option-list");
  saveActiveSession();
}

function renderQuarterResult() {
  const quarter = pages.quarterResult;
  const requestedFrom = Number(currentParams.from);
  const from = Number.isInteger(requestedFrom) && requestedFrom >= 0
    ? Math.min(requestedFrom, Math.max(0, quarter.outcomes.length - 1))
    : Math.max(0, quarter.outcomes.length - 1);
  const outcomes = quarter.outcomes.slice(from);
  const first = outcomes[0] ?? quarter.outcome;
  const last = outcomes.at(-1) ?? quarter.outcome;
  showScreen("quarter-result");
  playFeedbackOnce(`quarter-result:${quarter.year}:${quarter.quarter}`, "reward", "success");
  const visual = byId("quarter-result-visual");
  visual.hidden = !last;
  if (!visual.hidden) {
    byId("quarter-result-visual-kicker").textContent = `${quarter.year}年 · ${last.label}真实发生`;
    byId("quarter-result-visual-caption").textContent = last.operationLabel;
  }
  byId("quarter-result-title").textContent = first && last && first.quarter !== last.quarter
    ? `Q${first.quarter}—Q${last.quarter}留下了什么`
    : `${last?.label ?? quarter.label}留下了什么`;
  byId("quarter-result-meta").textContent = `${quarter.year}年 · ${quarter.age}岁 · 本次推进${outcomes.length || 1}个季度`;
  byId("quarter-result-plan").textContent = outcomes.map((entry) => entry.operationLabel).join("；") || quarter.plan;
  byId("quarter-result-detail").textContent = outcomes.map((entry) => `Q${entry.quarter}：${entry.detail}`).join("\n") || quarter.detail;
  renderQuarterInterruptions(outcomes);
  renderQuarterMonths(outcomes);
  const impactCount = renderImpactList("quarter-impact-list", outcomes);
  byId("quarter-impact-card").hidden = impactCount === 0;
  renderChildhoodExperience(quarter.experience);
  renderLatestDecision(quarter.latestDecision);
}

function renderYearReview() {
  const review = pages.yearReview;
  showScreen("year-review");
  playFeedbackOnce(`year-review:${review.year}`, "page", "medium");
  byId("year-review-title").textContent = `${review.year}年成为事实`;
  byId("year-review-meta").textContent = `${review.age}岁 · 收入、健康、关系与经历已经写入档案`;
  renderYearReviewMainline(review.mainline);
  renderFacts("year-review-fact-list", review.facts);
  renderYearLedger("year-review-ledger-list", review.ledger);
  if (review.pending) renderSingleChoice(review.pending, "year-review-option-list");
  else byId("year-review-option-list").replaceChildren();
  saveActiveSession();
}

function renderPerson(personId) {
  const person = pages.relations.people.find((entry) => entry.id === personId) ?? pages.relations.people[0];
  if (!person) {
    navigate(ROUTES.RELATIONS, {}, { replace: true });
    return;
  }
  showScreen("person-detail");
  byId("person-role").textContent = person.role;
  byId("person-name").textContent = person.name;
  byId("person-detail").textContent = person.detail;
  byId("person-memory").textContent = person.detail.includes("最近共同经历")
    ? person.detail.split(" · ").at(-1)
    : "你们目前的关系记录还不多，后续共同经历会继续写入这里。";
}

function addReviewFact(fragment, label, value) {
  const wrapper = document.createElement("div");
  const term = document.createElement("dt");
  const detail = document.createElement("dd");
  term.textContent = label;
  detail.textContent = value;
  wrapper.append(term, detail);
  fragment.append(wrapper);
}

function renderEnding() {
  const view = pages.game;
  showScreen("ending");
  archiveEnding(view);
  if (!DEBUG_MODE) {
    platform.storage.remove(SAVE_KEY);
    platform.storage.remove(BACKUP_SAVE_KEY);
  }
  const review = view.lifeReview;
  byId("ending-title").textContent = review.title;
  byId("ending-summary").textContent = review.summary;
  renderStats("ending-stats", view.stats);
  renderEndingMainline(view.mainline);
  const facts = document.createDocumentFragment();
  addReviewFact(facts, "生卒", `${review.birthYear}—${review.deathYear} · ${review.ageAtDeath}岁`);
  addReviewFact(facts, "最高教育", review.highestCompletedEducation);
  addReviewFact(facts, "工作", `${review.jobCount}份 · ${review.jobYears}年`);
  addReviewFact(facts, "伴侣关系", review.relationshipSummary);
  addReviewFact(facts, "孩子", review.childBorn ? "有一个孩子" : "没有孩子记录");
  addReviewFact(facts, "最后住房", review.finalHousingTenure);
  addReviewFact(facts, "最终净资产", formatCurrency(review.finalNetWorthYuan));
  addReviewFact(facts, "未来情景年份", `${review.scenarioYearsExperienced}年`);
  byId("review-facts").replaceChildren(facts);
  byId("untraveled-summary").textContent = `你做了 ${review.decisionCount} 次人生选择；档案保存了 ${review.untraveledPaths.length} 条当时没有走的路。`;
  byId("untraveled-list").replaceChildren(...review.untraveledPaths.slice(-8).reverse().map((entry) => {
    const item = document.createElement("div");
    item.textContent = `${entry.decisionYear}年，${entry.decisionAge}岁：${unchosenText(entry)}`;
    return item;
  }));
  renderGallery();
}

function showStart() {
  showScreen("start");
  byId("continue-button").hidden = readSavedSession() == null;
  renderGallery();
  if (DEBUG_MODE) renderDebugInspector();
}

function normalizedRoute(route) {
  if ([ROUTES.TITLE, ROUTES.NEW_LIFE, ROUTES.ERROR].includes(route)) return route;
  if (!result || !pages) return ROUTES.TITLE;
  if (result.status === "completed") return route === ROUTES.RECORDS ? ROUTES.RECORDS : ROUTES.ENDING;
  if (route === ROUTES.QUARTER_RESULT || route === ROUTES.PERSON) return route;
  if (["random_life_event", "mainline_event"].includes(pages.game.pending?.kind)) return ROUTES.RANDOM_EVENT;
  if (pages.game.pending?.kind === "year_review") return ROUTES.YEAR_REVIEW;
  if ([ROUTES.RANDOM_EVENT, ROUTES.YEAR_REVIEW, ROUTES.ENDING].includes(route)) return ROUTES.LIFE;
  return route;
}

function renderRoute(requestedRoute, params = {}) {
  const route = normalizedRoute(requestedRoute);
  if (route !== requestedRoute) {
    navigate(route, {}, { replace: true });
    return;
  }
  currentRoute = route;
  currentParams = params;
  updateHeader(route);
  if (route === ROUTES.TITLE) showStart();
  else if (route === ROUTES.NEW_LIFE) showScreen("new-life");
  else if (isMainRoute(route)) renderMain(route);
  else if (route === ROUTES.RANDOM_EVENT) renderRandomEvent();
  else if (route === ROUTES.QUARTER_RESULT) renderQuarterResult();
  else if (route === ROUTES.YEAR_REVIEW) renderYearReview();
  else if (route === ROUTES.PERSON) renderPerson(params.id);
  else if (route === ROUTES.ENDING) renderEnding();
  else if (route === ROUTES.ERROR) showScreen("error");
}

function renderCurrent(preferredRoute = null) {
  pages = buildPageViewModels(result, data, session);
  const route = result.status === "completed" ? ROUTES.ENDING : (preferredRoute ?? routeForPending(pages.game.pending));
  navigate(route, {}, { replace: true });
  if (DEBUG_MODE) renderDebugInspector();
}

function completedQuarterCount() {
  return pages?.game.quarterProgress.completedCount ?? 0;
}

function chooseOption(optionId) {
  for (const button of document.querySelectorAll(".option-list button, #confirm-plan-button")) button.disabled = true;
  const priorCount = completedQuarterCount();
  const priorKind = result?.pendingDecision?.kind;
  const priorEventId = result?.pendingDecision?.eventId;
  try {
    syncDebugConfigToSession();
    ({ session, result } = submitLifeChoice(data, session, result, optionId));
    saveActiveSession();
    const leadsToStrongResultSurface = ["quarter_plan", "random_life_event", "mainline_event", "year_review"].includes(priorKind);
    if (leadsToStrongResultSurface) hideGameToast();
    else showGameToast("选择已经写入人生", "ph-bookmark-simple");
    pages = buildPageViewModels(result, data, session);
    if (result.status === "completed") {
      navigate(ROUTES.ENDING);
      return;
    }
    const quarterSettled = priorKind !== "year_review" && completedQuarterCount() > priorCount;
    if (priorEventId) {
      actionDrafts.delete(priorEventId);
      actionIntensityDrafts.delete(priorEventId);
      clearQuarterDraft(priorEventId);
    }
    if (quarterSettled) navigate(ROUTES.QUARTER_RESULT, { from: priorCount });
    else navigate(routeForPending(pages.game.pending));
  } catch (error) {
    showError(error);
  }
}

function startNewLife() {
  clearQuarterDraft();
  if (DEBUG_MODE) {
    executeDebugJump();
    return;
  }
  const value = document.querySelector('input[name="birth-year"]:checked').value;
  ({ session, result } = startLife(data, {
    seed: platform.randomSeed("life"),
    ...(value === "random" ? {} : { birthYear: Number(value) }),
    mortality: byId("mortality-toggle").checked,
  }));
  saveActiveSession();
  renderCurrent();
}

function continueSavedLife() {
  session = readSavedSession();
  if (!session) {
    navigate(ROUTES.TITLE, {}, { replace: true });
    return;
  }
  ({ result } = resumeLife(data, session));
  renderCurrent();
  if (recoveredSaveSourceKey) {
    showGameToast("主存档异常，已从上一次有效进度恢复", "ph-arrow-counter-clockwise");
    recoveredSaveSourceKey = null;
  }
  if (DEBUG_MODE) setDebugStatus(`已读取独立调试存档：${session.seed}`, "ok");
}

function showError(error) {
  console.error(error);
  debugLastError = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : null,
    at: new Date().toISOString(),
  };
  byId("error-message").textContent = error instanceof Error ? error.message : String(error);
  navigate(ROUTES.ERROR, {}, { replace: true });
  if (DEBUG_MODE) renderDebugInspector();
}

function fillDebugSelect(id, entries) {
  byId(id).replaceChildren(...entries.map((entry) => {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = entry.label;
    return option;
  }));
}

function readDebugConfig() {
  const randomMode = byId("debug-random-mode").value;
  return {
    seed: byId("debug-seed").value.trim() || "debug-life",
    birthYear: Number(byId("debug-birth-year").value),
    targetAge: debugTargetEnding ? "ending" : Number(byId("debug-target-age").value),
    targetPoint: byId("debug-target-point").value,
    mortality: byId("debug-mortality").checked,
    routePreset: byId("debug-route-preset").value,
    familyPreset: byId("debug-family-preset").value,
    pressurePreset: byId("debug-pressure-preset").value,
    randomMode,
    forcedEventId: randomMode === "forced" ? byId("debug-event-select").value : null,
  };
}

function syncDebugConfigToSession() {
  if (!DEBUG_MODE || !session) return;
  const config = readDebugConfig();
  session.debug ??= { enabled: true, schemaVersion: 1 };
  session.debug.routePreset = config.routePreset;
  session.debug.familyPreset = config.familyPreset;
  session.debug.pressurePreset = config.pressurePreset;
  const previousRandom = session.debug.randomEvents ?? {};
  const randomChanged = previousRandom.mode !== config.randomMode || previousRandom.forcedEventId !== config.forcedEventId;
  session.debug.randomEvents = {
    mode: config.randomMode,
    forcedEventId: config.forcedEventId,
    activationYear: randomChanged ? result?.pendingDecision?.calendarYear ?? null : previousRandom.activationYear ?? null,
    activationQuarter: randomChanged ? result?.pendingDecision?.quarter ?? 1 : previousRandom.activationQuarter ?? null,
  };
  session.debug.minimumSurvivalAge = config.mortality
    ? null
    : (config.targetAge === "ending" ? session.debug.minimumSurvivalAge ?? null : config.targetAge);
}

function setDebugStatus(message, state = "normal") {
  const target = byId("debug-status");
  target.textContent = message;
  target.dataset.state = state;
}

function renderDebugInspector() {
  if (!DEBUG_MODE || !data) return;
  const report = buildDebugReport(data, session, result, { lastRun: debugLastRun, lastError: debugLastError });
  byId("debug-state-output").textContent = debugInspectorSummary(report);
  const selectedEventId = byId("debug-event-select").value;
  const diagnostics = [...report.randomEventDiagnostics].sort((left, right) => {
    if (left.id === selectedEventId) return -1;
    if (right.id === selectedEventId) return 1;
    return Number(right.eligible) - Number(left.eligible);
  });
  byId("debug-event-diagnostics").replaceChildren(...diagnostics.map((entry) => {
    const item = document.createElement("div");
    item.className = entry.eligible ? "eligible" : "";
    item.textContent = entry.eligible ? `可触发｜${entry.title}（${entry.id}）` : `不可触发｜${entry.title}：${entry.reasons.join("；")}`;
    return item;
  }));
  byId("debug-runtime-controls").hidden = !session || !result;
}

function updateDebugQuickSelection(value) {
  for (const button of byId("debug-quick-ages").querySelectorAll("button")) {
    button.classList.toggle("active", button.dataset.age === String(value));
  }
}

async function withDebugWork(label, callback) {
  const button = byId("debug-jump-button");
  button.disabled = true;
  setDebugStatus(label, "working");
  await new Promise((resolve) => setTimeout(resolve, 0));
  try {
    const outcome = callback();
    session = outcome.session;
    result = outcome.result;
    debugLastRun = outcome.report;
    debugLastError = null;
    saveActiveSession();
    pages = buildPageViewModels(result, data, session);
    renderCurrent();
    const warnings = outcome.report.warnings.length > 0 ? ` · ${outcome.report.warnings.join(" ")}` : "";
    setDebugStatus(`${outcome.report.reached} · 自动处理${outcome.report.steps}个前置节点${warnings}`, warnings ? "warning" : "ok");
    renderDebugInspector();
  } catch (error) {
    showError(error);
    setDebugStatus(`调试失败：${error.message ?? error}`, "error");
  } finally {
    button.disabled = false;
  }
}

async function executeDebugJump() {
  const config = readDebugConfig();
  await withDebugWork(
    config.targetAge === "ending" ? "正在从出生回放到人生结局……" : `正在从出生回放到${config.targetAge}岁……`,
    () => replayDebugToTarget(data, config),
  );
}

function currentDebugAge() {
  return result?.pendingDecision?.age ?? result?.ending?.age ?? result?.currentState?.currentAge ?? 0;
}

async function executeDebugAdvance(mode) {
  if (!session || !result) {
    await executeDebugJump();
    return;
  }
  let config = readDebugConfig();
  syncDebugConfigToSession();
  if (mode === "key_age") {
    const target = nextDebugKeyAge(currentDebugAge());
    debugTargetEnding = target === "ending";
    if (!debugTargetEnding) byId("debug-target-age").value = target;
    updateDebugQuickSelection(target);
    config = { ...readDebugConfig(), targetAge: target, targetPoint: "first" };
    await withDebugWork(target === "ending" ? "正在推进到人生结局……" : `正在推进到关键年龄${target}岁……`, () => replayDebugToTarget(data, config, session));
    return;
  }
  if (mode === "year") {
    const targetAge = currentDebugAge() + 1;
    debugTargetEnding = false;
    byId("debug-target-age").value = targetAge;
    updateDebugQuickSelection(targetAge);
    config = { ...readDebugConfig(), targetAge, targetPoint: "first" };
    await withDebugWork(`正在推进到${targetAge}岁……`, () => replayDebugToTarget(data, config, session));
    return;
  }
  const label = mode === "quarter" ? "正在推进到下一季度节点……" : "正在自动回答当前节点……";
  await withDebugWork(label, () => advanceDebugSession(data, session, result, config, mode));
}

function exportDebugReport() {
  const report = buildDebugReport(data, session, result, { lastRun: debugLastRun, lastError: debugLastError });
  platform.downloadJson(`people-life-debug-${report.reached?.age ?? "start"}-${Date.now()}.json`, report);
  setDebugStatus("调试报告已导出；其中包含存档、状态、事件条件和最近错误。", "ok");
}

function initializeDebugUI() {
  if (!DEBUG_MODE) return;
  const debugToggle = byId("debug-drawer-toggle");
  const debugPanel = byId("debug-panel");
  const setDebugDrawer = (open) => {
    document.body.classList.toggle("debug-drawer-open", open);
    debugToggle.setAttribute("aria-expanded", String(open));
    debugToggle.querySelector("span").textContent = open ? "收起工具" : "开发工具";
  };
  debugToggle.hidden = false;
  byId("debug-panel").hidden = false;
  debugToggle.addEventListener("click", () => setDebugDrawer(!document.body.classList.contains("debug-drawer-open")));
  setDebugDrawer(false);
  fillDebugSelect("debug-route-preset", DEBUG_ROUTE_PRESETS);
  fillDebugSelect("debug-family-preset", DEBUG_FAMILY_PRESETS);
  fillDebugSelect("debug-pressure-preset", DEBUG_PRESSURE_PRESETS);
  fillDebugSelect("debug-event-select", data.quarterlyLife.randomEvents.map((event) => ({ id: event.id, label: `${event.title}（${event.minAge}～${event.maxAge}岁）` })));
  const stageEventCatalog = debugStageEventCatalog(data);
  byId("debug-stage-event-select").replaceChildren(...stageEventCatalog.map((event) => {
    const option = document.createElement("option");
    option.value = event.id;
    option.textContent = `${event.groupLabel}｜${event.label}`;
    return option;
  }));
  byId("debug-quick-ages").replaceChildren(...[...DEBUG_KEY_AGES, "ending"].map((age) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.age = String(age);
    button.textContent = age === "ending" ? "结局" : `${age}岁`;
    button.addEventListener("click", async () => {
      debugTargetEnding = age === "ending";
      if (!debugTargetEnding) byId("debug-target-age").value = age;
      updateDebugQuickSelection(age);
      await executeDebugJump();
    });
    return button;
  }));
  byId("debug-target-age").addEventListener("input", () => {
    debugTargetEnding = false;
    updateDebugQuickSelection(byId("debug-target-age").value);
  });
  byId("debug-random-mode").addEventListener("change", () => {
    byId("debug-event-row").hidden = byId("debug-random-mode").value !== "forced";
    syncDebugConfigToSession();
    renderDebugInspector();
  });
  byId("debug-event-select").addEventListener("change", () => {
    syncDebugConfigToSession();
    renderDebugInspector();
  });
  byId("debug-jump-button").addEventListener("click", executeDebugJump);
  byId("debug-find-stage-event").addEventListener("click", async () => {
    const eventId = byId("debug-stage-event-select").value;
    const event = stageEventCatalog.find((entry) => entry.id === eventId);
    await withDebugWork(`正在为“${event.label}”寻找一条合法前史……`, () => replayDebugToStageEvent(data, readDebugConfig(), eventId));
  });
  byId("debug-next-node").addEventListener("click", () => executeDebugAdvance("node"));
  byId("debug-next-quarter").addEventListener("click", () => executeDebugAdvance("quarter"));
  byId("debug-next-year").addEventListener("click", () => executeDebugAdvance("year"));
  byId("debug-next-key-age").addEventListener("click", () => executeDebugAdvance("key_age"));
  byId("debug-refresh-report").addEventListener("click", renderDebugInspector);
  byId("debug-export-report").addEventListener("click", exportDebugReport);
  updateDebugQuickSelection(3);
  setDebugStatus("调试模式已启用。正式存档不会被读取或覆盖。", "ok");
}

byId("new-life-button").addEventListener("click", () => {
  playFeedback("click", "light");
  navigate(ROUTES.NEW_LIFE);
});
byId("start-button").addEventListener("click", () => {
  playFeedback("stamp", "stamp");
  startNewLife();
});
byId("continue-button").addEventListener("click", () => {
  playFeedback("click", "light");
  continueSavedLife();
});
byId("restart-button").addEventListener("click", DEBUG_MODE ? executeDebugJump : () => {
  byId("settings-dialog").close();
  navigate(ROUTES.TITLE);
});
byId("again-button").addEventListener("click", DEBUG_MODE ? executeDebugJump : () => navigate(ROUTES.NEW_LIFE));
byId("error-restart-button").addEventListener("click", () => navigate(ROUTES.TITLE));
byId("quarter-result-continue").addEventListener("click", () => {
  playFeedback("click", "light");
  navigate(routeForPending(pages.game.pending));
});
byId("latest-growth-back-life").addEventListener("click", () => navigate(ROUTES.LIFE));
function closeLifeActionDrawer() {
  const drawer = byId("life-action-drawer");
  if (drawer) drawer.hidden = true;
}
byId("life-action-drawer-close")?.addEventListener("click", closeLifeActionDrawer);
byId("life-action-drawer-backdrop")?.addEventListener("click", closeLifeActionDrawer);
byId("life-action-drawer-done")?.addEventListener("click", closeLifeActionDrawer);
byId("simulator-primary-action")?.addEventListener("click", () => {
  if (activeQuarterPlanController?.submit) activeQuarterPlanController.submit();
});
byId("ending-timeline-button").addEventListener("click", () => {
  if (result) navigate(ROUTES.RECORDS);
});

for (const button of document.querySelectorAll("[data-record-tab]")) {
  button.addEventListener("click", () => {
    playFeedback("click", "light");
    setRecordsTab(button.dataset.recordTab);
  });
}
for (const button of document.querySelectorAll("[data-character-tab]")) {
  button.addEventListener("click", () => {
    playFeedback("click", "light");
    setCharacterTab(button.dataset.characterTab);
  });
}
byId("open-settings-button").addEventListener("click", () => {
  playFeedback("click", "light");
  applyPresentationPreferences(presentationPreferences, { persist: false });
  byId("settings-dialog").showModal();
});
byId("close-settings-button").addEventListener("click", () => {
  playFeedback("click", "light");
  byId("settings-dialog").close();
});
byId("settings-dialog").addEventListener("click", (event) => {
  if (event.target === byId("settings-dialog")) byId("settings-dialog").close();
});
byId("motion-mode-select").addEventListener("change", (event) => {
  const motionMode = MOTION_MODES.includes(event.target.value) ? event.target.value : "full";
  applyPresentationPreferences({ ...presentationPreferences, motionMode });
  playFeedback("click", "light");
});
byId("sound-toggle").addEventListener("change", (event) => {
  applyPresentationPreferences({ ...presentationPreferences, soundEnabled: event.target.checked });
  if (event.target.checked) playFeedback("choice", "light");
});
byId("haptic-toggle").addEventListener("change", (event) => {
  applyPresentationPreferences({ ...presentationPreferences, hapticEnabled: event.target.checked });
  if (event.target.checked) triggerHaptic("medium");
});

// 一生轨迹长图海报生成与预览
const generatePosterBtn = byId("generate-poster-button");
const posterModal = byId("poster-modal");
const posterCloseBtn = byId("poster-modal-close");
const posterBackdrop = posterModal?.querySelector(".poster-modal-backdrop");

if (generatePosterBtn && posterModal) {
  generatePosterBtn.addEventListener("click", () => {
    try {
      const posterDataUrl = generateLifePoster({
        lifeReview: pages?.game?.lifeReview ?? result?.lifeReview,
        profile: result?.profile,
        ending: result?.ending,
        mainline: pages?.game?.mainline,
        seed: session?.seed ?? "people-life",
      });
      const previewImg = byId("poster-preview-image");
      const downloadLink = byId("poster-download-link");
      if (previewImg) previewImg.src = posterDataUrl;
      if (downloadLink) {
        downloadLink.href = posterDataUrl;
        downloadLink.download = `人生轨迹-${session?.seed ?? "life"}-${result?.ending?.age ?? 70}岁.png`;
      }
      posterModal.hidden = false;
      playFeedback("stamp", "stamp");
      showGameToast("一生轨迹长图已生成", "ph-image");
    } catch (err) {
      console.error("生成海报失败:", err);
      showGameToast("海报生成失败，请重试", "ph-warning");
    }
  });

  const closePoster = () => {
    posterModal.hidden = true;
    playFeedback("click", "light");
  };
  posterCloseBtn?.addEventListener("click", closePoster);
  posterBackdrop?.addEventListener("click", closePoster);
}

byId("header-back-button").addEventListener("click", () => navigate(byId("header-back-button").dataset.target));
for (const button of byId("main-navigation").querySelectorAll("button")) {
  button.addEventListener("click", () => {
    playFeedback("page", "light");
    navigate(button.dataset.route);
  });
}
window.addEventListener("hashchange", () => {
  const { route, params } = parseRouteHash(location.hash);
  renderRoute(route, params);
});

try {
  data = await loadGameData(new URL("../", import.meta.url));
  initializeDebugUI();
  const initial = parseRouteHash(location.hash);
  if (![ROUTES.TITLE, ROUTES.NEW_LIFE].includes(initial.route)) {
    session = readSavedSession();
    if (session) {
      ({ result } = resumeLife(data, session));
      pages = buildPageViewModels(result, data, session);
      renderRoute(initial.route, initial.params);
    } else navigate(ROUTES.TITLE, {}, { replace: true });
  } else renderRoute(initial.route, initial.params);
} catch (error) {
  showError(error);
}
