import {
  createEventCues,
  createSceneRuntimePort,
  validateLightSceneContent,
} from "../../src/game/light-scene-contract.mjs";
import { createCueDirector } from "./cue-director.mjs";
import { playSound, setSoundEnabled } from "../sound-haptic-service.mjs";
import {
  clearCheckpoint,
  createCheckpoint,
  loadCheckpoint,
  saveCheckpoint,
} from "./scene-checkpoint.mjs";

const CONTENT_URL = new URL("../../data/gameplay/light_scene_yard_1984.json", import.meta.url);
const SELECTORS = Object.freeze({
  stage: "[data-light-scene-stage-shell]",
  sceneNode: "[data-scene-node]",
  actionBar: "[data-context-action-bar]",
  actions: "[data-scene-actions]",
  objectList: "[data-object-list]",
  objectListToggle: "[data-object-list] > summary",
  objectListClose: "[data-object-list] [data-close]",
  motionToggle: "#scene-motion-mode",
  soundToggle: "#scene-sound-toggle",
  skip: "#scene-skip",
  restart: "#scene-restart",
  timeLabel: ".time-copy strong",
  timeDots: ".time-slots",
  stageHint: ".scene-result[data-scene-feedback]",
  focusName: ".dock-title h2",
  focusState: ".dock-title span",
  focusHint: ".action-note",
  speech: ".scene-speech",
  speechText: "[data-speech-text]",
  eventChip: "[data-event-layer]",
  eventText: "[data-event-text]",
  player: ".scene-actor[data-character-id='player_child']",
  friend: ".scene-actor[data-character-id='partner_xiaoyu']",
  elder: ".scene-actor[data-character-id='older_child_asha']",
});

const ACTION_POSES = Object.freeze({
  join_marbles: "crouch",
  practice_writing: "working",
  inspect_bicycle: "active",
  set_table: "working",
});

const appRoot = document.querySelector("[data-light-scene-runtime]") || document.body;
const root = appRoot.querySelector(SELECTORS.stage) || appRoot;
const storage = (() => { try { return globalThis.localStorage; } catch { return null; } })();

function clone(value) { return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value)); }
function textOf(element) { return `${element?.dataset?.label ?? ""} ${element?.getAttribute?.("aria-label") ?? ""}`.trim(); }
function setText(selector, text) { const element = appRoot?.querySelector(selector); if (element) element.textContent = text; }

function showFatalError(message, retry) {
  const existing = root?.querySelector("[data-light-scene-error]");
  if (existing) existing.remove();
  const layer = document.createElement("section");
  layer.dataset.lightSceneError = "true";
  layer.setAttribute("role", "alert");
  layer.style.cssText = "position:absolute;inset:20px;z-index:30;display:grid;place-items:center;padding:24px;border-radius:20px;background:#fffaf0;color:#24344a;text-align:center;box-shadow:0 16px 40px rgba(35,52,74,.25)";
  layer.innerHTML = `<div><strong>场景暂时无法打开</strong><p style="max-width:260px;line-height:1.6;font-size:13px">${message}</p><button type="button" data-light-scene-retry style="padding:9px 18px;border:0;border-radius:12px;background:#e97963;color:#fff;cursor:pointer">重新加载</button></div>`;
  root?.append(layer);
  layer.querySelector("[data-light-scene-retry]")?.addEventListener("click", retry);
}

function matchContentNode(content, element) {
  const candidates = [element.dataset.nodeId, element.dataset.node, element.dataset.label, textOf(element)].filter(Boolean);
  const exactId = content.nodes.find((node) => candidates.includes(node.id));
  if (exactId) return exactId;
  const exactLabel = content.nodes.find((node) => candidates.some((candidate) => candidate === node.label));
  if (exactLabel) return exactLabel;
  return content.nodes.find((node) => candidates.some((candidate) => candidate.includes(node.label) || node.label.includes(candidate))) ?? content.nodes[0];
}

function matchDomNode(content, nodeId) {
  return [...root.querySelectorAll(SELECTORS.sceneNode)].find((element) => matchContentNode(content, element)?.id === nodeId) ?? null;
}

function domElementsForNode(content, nodeId) {
  return [...root.querySelectorAll(`${SELECTORS.sceneNode}, [data-node-id], [data-object]`)].filter((element) => matchContentNode(content, element)?.id === nodeId);
}

function characterTarget(characterId, content) {
  const character = content.characters.find((item) => item.id === characterId);
  if (!character) return root;
  const candidates = [...root.querySelectorAll(".actor, [data-character-id]")];
  return candidates.find((element) => `${element.getAttribute("aria-label") ?? ""} ${element.dataset.characterId ?? ""}`.includes(character.label))
    ?? candidates.find((element) => character.role === "peer" && element.classList.contains("friend"))
    ?? candidates.find((element) => character.role === "older_peer" && element.classList.contains("elder"))
    ?? root;
}

function stageNodes(content, stageId) { return content.nodes.filter((node) => node.stageId === stageId); }

function setVisibleStage(stageId) {
  root.dataset.sceneState = stageId;
  root.querySelectorAll(".stage-layer[data-stage-id]").forEach((layer) => {
    const visible = layer.dataset.stageId === stageId;
    layer.setAttribute("aria-hidden", String(!visible));
    layer.dataset.stageVisibility = visible ? "visible" : "hidden";
    layer.style.display = visible ? "block" : "none";
  });
  appRoot.querySelectorAll(".stage-tabs button").forEach((tab, index) => {
    const visible = contentStageIdAt(index) === stageId;
    tab.setAttribute("aria-current", String(visible));
  });
}

function contentStageIdAt(index) { return bootContent?.stages?.[index]?.id ?? null; }

let bootContent = null;

function transitionCues(content, fromStageId, toStageId) {
  const transition = content.stageTransitions.find((item) => item.fromStageId === fromStageId && item.toStageId === toStageId);
  if (!transition) return [];
  return transition.cueTypes.map((type, index) => ({ cueId: `${transition.id}:${index + 1}`, sceneId: content.id, type, text: transition.line, durationMs: 500, skipSafe: true, payload: { transitionId: transition.id } }));
}

async function loadContent() {
  const response = await fetch(CONTENT_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`内容加载失败（${response.status}）`);
  const content = await response.json();
  validateLightSceneContent(content);
  return content;
}

function modeFromCheckpoint(checkpoint) { return checkpoint?.motion?.mode === "off" || checkpoint?.motion?.mode === "reduced" ? checkpoint.motion.mode : "full"; }

async function boot(content) {
  if (!root) throw new Error("缺少轻场景舞台入口");
  bootContent = content;
  const checkpoint = loadCheckpoint(content, storage);
  const port = createSceneRuntimePort(content, checkpoint?.runtimeState ? {
    stageId: checkpoint.runtimeState.stageId,
    focusedNodeId: checkpoint.runtimeState.focusedNodeId,
    usedTimeSlots: checkpoint.runtimeState.usedTimeSlots,
    completedActionIds: checkpoint.runtimeState.completedActionIds,
    eventChoiceIds: checkpoint.runtimeState.eventChoiceIds,
    actorStates: checkpoint.runtimeState.actorStates,
    propStates: checkpoint.runtimeState.propStates,
    reducedMotion: modeFromCheckpoint(checkpoint) !== "full",
  } : {});
  const journal = Array.isArray(checkpoint?.commandJournal) ? checkpoint.commandJournal : [];
  let eventTriggered = checkpoint?.eventTriggered === true;
  let eventResolved = checkpoint?.eventResolved === true;
  let triggeredFactIds = Array.isArray(checkpoint?.triggeredFactIds) ? [...checkpoint.triggeredFactIds] : [];
  let nextJournalSequence = journal.reduce((max, entry) => Math.max(max, Number.isInteger(entry?.sequence) ? entry.sequence : 0), 0) + 1;
  const motion = { mode: modeFromCheckpoint(checkpoint) };
  const sound = { enabled: checkpoint?.sound?.enabled !== false };
  setSoundEnabled(sound.enabled);
  let currentNodeId = port.getState().focusedNodeId;
  const cueDirector = createCueDirector({ mode: motion.mode, resolveTarget: (cue) => cueTarget(cue), onStart: handleCueStart, onComplete: handleCueComplete });
  const motionControl = appRoot.querySelector(SELECTORS.motionToggle);
  if (motionControl && "value" in motionControl) motionControl.value = motion.mode;
  const soundControl = appRoot.querySelector(SELECTORS.soundToggle);
  if (soundControl) soundControl.checked = sound.enabled;
  document.body.dataset.motion = motion.mode;

  function cueTarget(cue) {
    if (cue.type === "npc.react") return characterTarget(cue.payload?.npcCharacterId, content);
    if (cue.type === "actor.pose" || cue.type === "actor.move-between-anchors") return appRoot.querySelector(SELECTORS.player);
    if (cue.type === "prop.change") return domElementsForNode(content, cue.payload?.propNodeId || cue.payload?.nodeId)[0] || root;
    return matchDomNode(content, cue.payload?.nodeId) || root;
  }

  function handleCueStart(cue) {
    if (cue.type === "focus.node" && cue.payload?.nodeId) focusNode(cue.payload.nodeId, { announce: false, persist: false });
    if (cue.type === "actor.pose") appRoot.querySelector(SELECTORS.player)?.setAttribute("data-pose", cue.payload?.pose || ACTION_POSES[cue.payload?.actionId] || "active");
    if (cue.type === "npc.react") characterTarget(cue.payload?.npcCharacterId, content)?.setAttribute("data-pose", "happy");
    if (cue.type === "prop.change") domElementsForNode(content, cue.payload?.propNodeId || cue.payload?.nodeId).forEach((element) => element.setAttribute("data-state", "changed"));
    if (cue.text) announce(cue.text);
  }

  function handleCueComplete(cue) { if (cue.type === "prop.change") domElementsForNode(content, cue.payload?.propNodeId || cue.payload?.nodeId).forEach((element) => element.setAttribute("data-state", "settled")); }

  function announce(message) {
    const speech = root.querySelector(SELECTORS.speech);
    const text = root.querySelector(SELECTORS.speechText);
    if (text) text.textContent = `“${message}”`;
    else if (speech) speech.textContent = `“${message}”`;
    speech?.setAttribute("data-visible", "true");
    const live = appRoot.querySelector(SELECTORS.stageHint);
    if (live) live.textContent = message;
  }

  function save() {
    const checkpointState = { ...port.getState(), triggeredFactIds: [...triggeredFactIds] };
    const checkpointData = createCheckpoint({ content, runtimeState: checkpointState, commandJournal: journal, eventTriggered, eventResolved, motion, sound, triggeredFactIds });
    saveCheckpoint(checkpointData, content, storage);
  }

  function appendJournal(entry) {
    const journalEntry = { sequence: nextJournalSequence, ...entry };
    nextJournalSequence += 1;
    journal.push(journalEntry);
    return journalEntry;
  }

  function addFacts(facts) {
    for (const factId of facts ?? []) {
      if (typeof factId === "string" && !triggeredFactIds.includes(factId)) triggeredFactIds.push(factId);
    }
  }

  function renderTime() {
    const state = port.getState();
    const left = Math.max(0, content.timeAndEnergy.totalSlots - state.usedTimeSlots);
    setText(SELECTORS.timeLabel, `放学后 ${left * 5} 分钟`);
    const dots = appRoot.querySelector(SELECTORS.timeDots);
    if (dots) dots.innerHTML = Array.from({ length: content.timeAndEnergy.totalSlots }, (_, index) => `<i class="${index < state.usedTimeSlots ? "used" : ""}"></i>`).join("");
  }

  function actionIdsForNode(node) {
    if (Array.isArray(node.actionIds) && node.actionIds.length > 0) return node.actionIds;
    return content.stages.find((stage) => stage.id === node.stageId)?.availableActionIds ?? [];
  }

  function renderActions(node) {
    const actions = appRoot.querySelector(SELECTORS.actions);
    if (!actions) return;
    const actionIds = actionIdsForNode(node).slice(0, 3);
    actions.innerHTML = actionIds.map((actionId, index) => {
      const action = content.actions.find((item) => item.id === actionId);
      if (!action) return "";
      const availability = port.getActionAvailability(action.id);
      const disabled = !availability.available;
      const reason = availability.reason === "already-completed" ? "已完成" : availability.reason === "insufficient-time" ? "时间不够" : `消耗 ${availability.costSlots} 格时间`;
      return `<button class="action-button ${index === 0 ? "primary action-primary" : ""}" data-scene-action="action" data-action-id="${action.id}" data-action="${action.id}" type="button" ${disabled ? "disabled" : ""} aria-disabled="${disabled}"><span class="action-icon">${index + 1}</span><span><b>${action.label}</b><small>${reason}</small></span></button>`;
    }).join("");
  }

  function renderFocus(node) {
    const stage = content.stages.find((item) => item.id === node.stageId);
    setText(SELECTORS.focusName, node.label);
    setText(SELECTORS.focusState, node.affordance);
    setText(SELECTORS.focusHint, `点击对象，选择一个短动作 · ${stage?.label ?? ""}`);
    renderActions(node);
    renderTime();
  }

  function restoreDomState() {
    const state = port.getState();
    for (const [characterId, pose] of Object.entries(state.actorStates ?? {})) {
      appRoot.querySelectorAll("[data-character-id]").forEach((element) => { if (element.dataset.characterId === characterId) element.setAttribute("data-pose", pose); });
    }
    for (const [nodeId, visualState] of Object.entries(state.propStates ?? {})) {
      domElementsForNode(content, nodeId).forEach((element) => element.setAttribute("data-state", visualState));
    }
    for (const actionId of state.completedActionIds ?? []) {
      const action = content.actions.find((item) => item.id === actionId);
      if (!action) continue;
      const playerPose = ACTION_POSES[action.id];
      if (playerPose) appRoot.querySelectorAll(SELECTORS.player).forEach((element) => element.setAttribute("data-pose", playerPose));
      if (action.npcResponse?.characterId) appRoot.querySelectorAll(`[data-character-id="${action.npcResponse.characterId}"]`).forEach((element) => element.setAttribute("data-pose", "happy"));
      domElementsForNode(content, action.nodeId).forEach((element) => { element.setAttribute("data-state", "completed"); element.setAttribute("data-state-text", action.objectState?.after ?? ""); });
      if (action.propResponse?.nodeId) domElementsForNode(content, action.propResponse.nodeId).forEach((element) => element.setAttribute("data-state", "changed"));
    }
    const eventLayer = appRoot.querySelector(SELECTORS.eventChip);
    if (eventLayer) {
      eventLayer.dataset.triggered = String(eventTriggered);
      eventLayer.dataset.resolved = String(eventResolved);
      if (eventResolved) eventLayer.dataset.visible = "false";
    }
    renderTime();
  }

  function focusNode(nodeId, options = {}) {
    const node = content.nodes.find((item) => item.id === nodeId) ?? content.nodes[0];
    currentNodeId = node.id;
    port.dispatchIntent({ type: "scene.focus", nodeId: node.id });
    root.dataset.focus = node.id;
    root.querySelectorAll(SELECTORS.sceneNode).forEach((element) => element.classList.toggle("active", matchContentNode(content, element)?.id === node.id));
    renderFocus(node);
    const finalStageId = content.stages[content.stages.length - 1].id;
    const actionIds = actionIdsForNode(node);
    if (node.stageId === finalStageId && actionIds.every((actionId) => !port.getActionAvailability(actionId).available)) showRipples();
    if (options.announce !== false) announce(node.affordance);
    if (options.persist !== false) save();
  }

  async function moveToStage(stageId) {
    const targetStage = content.stages.find((stage) => stage.id === stageId) ?? content.stages[0];
    const state = port.getState();
    if (state.stageId === targetStage.id) return;
    const cues = transitionCues(content, state.stageId, targetStage.id);
    port.dispatchIntent({ type: "scene.transition", targetStageId: targetStage.id });
    setVisibleStage(targetStage.id);
    save();
    root.querySelectorAll(SELECTORS.sceneNode).forEach((element) => {
      const node = matchContentNode(content, element);
      element.dataset.stageVisibility = node?.stageId === targetStage.id ? "visible" : "hidden";
    });
    await cueDirector.play(cues);
    focusNode(targetStage.nodeIds[0] ?? content.nodes[0].id, { announce: false });
    announce(targetStage.entryLine);
  }

  function findRippleSummary() {
    const facts = new Set(triggeredFactIds);
    return content.ripples.filter((ripple) => ripple.sourceFactCandidates?.some((fact) => facts.has(fact))).slice(0, 3);
  }

  function showRipples() {
    const ripples = findRippleSummary();
    if (ripples.length === 0) return;
    const existingLayer = appRoot.querySelector("[data-ripple-layer]");
    const existingItems = existingLayer?.querySelector(".ripple-items");
    if (existingItems) {
      existingItems.innerHTML = ripples.map((ripple) => `<span title="${ripple.summary.slice(0, 80)}">${ripple.title}</span>`).join("");
      existingLayer.setAttribute("data-visible", "true");
    }
  }

  function showEvent(options = {}) {
    const event = content.event;
    eventTriggered = true;
    const chip = appRoot.querySelector(SELECTORS.eventChip);
    if (chip) chip.dataset.visible = "true";
    const eventText = appRoot.querySelector(SELECTORS.eventText);
    if (eventText) eventText.textContent = event.announce;
    else if (chip) chip.textContent = `✦ ${event.announce}`;
    const actions = appRoot.querySelector(SELECTORS.actions);
    if (actions) {
      actions.innerHTML = event.choices.map((choice, index) => {
        const availability = port.getEventChoiceAvailability(choice.id);
        const disabled = !availability.available;
        const reason = availability.reason === "event-resolved" ? "已处理" : availability.reason === "insufficient-time" ? "时间不够" : `消耗 ${availability.costSlots} 格时间`;
        return `<button class="action-button ${index === 0 ? "primary action-primary" : ""}" data-scene-action="event-choice" data-action-id="${choice.id}" data-event-choice="${choice.id}" type="button" ${disabled ? "disabled" : ""} aria-disabled="${disabled}"><span class="action-icon">${index + 1}</span><span><b>${choice.label}</b><small>${reason}</small></span></button>`;
      }).join("");
    }
    setText(SELECTORS.focusName, event.label);
    setText(SELECTORS.focusState, "请选择怎么处理");
    announce(event.announce);
    if (options.persist !== false) save();
  }

  async function performAction(actionId) {
    const action = content.actions.find((item) => item.id === actionId);
    const cueContext = { propNodeId: action?.propResponse?.nodeId, npcCharacterId: action?.npcResponse?.characterId };
    const result = port.prepareAction(actionId, cueContext);
    if (result.rejected) { announce(result.reason === "already-completed" ? "这件事已经做过了。" : "剩下的时间不够了。"); renderActions(content.nodes.find((node) => node.id === currentNodeId) ?? content.nodes[0]); return; }
    playSound("choice");
    appendJournal({ kind: "action", actionId: action.id, command: clone(result.command) });
    addFacts(action.longTermFactCandidates);
    if (actionId === content.event.trigger.afterActionId) eventTriggered = true;
    save();
    await cueDirector.play(result.cues);
    const triggeredEventNow = actionId === content.event.trigger.afterActionId && !eventResolved;
    if (triggeredEventNow) {
      await cueDirector.play(createEventCues(content, content.event.choices[0].id).slice(0, content.event.sequence.length));
      showEvent();
      return;
    }
    if (action.stageId === content.stages[content.stages.length - 1].id || port.getState().stageId === content.stages[content.stages.length - 1].id) showRipples();
    renderFocus(content.nodes.find((node) => node.id === currentNodeId) ?? content.nodes[0]);
    save();
  }

  async function performChoice(choiceId) {
    const result = port.prepareEventChoice(choiceId);
    if (result.rejected) {
      playSound("warning");
      announce(result.reason === "event-resolved" ? "这件事已经处理过了。" : "剩下的时间不够了。");
      return;
    }
    const choice = content.event.choices.find((item) => item.id === choiceId);
    appendJournal({ kind: "event-choice", choiceId: choice.id, command: clone(result.command) });
    addFacts(choice.longTermFactCandidates);
    eventResolved = true;
    save();
    renderTime();
    const sequenceLength = content.event.sequence.length;
    await cueDirector.play(result.cues.slice(sequenceLength));
    const eventLayer = appRoot.querySelector(SELECTORS.eventChip);
    if (eventLayer) {
      eventLayer.dataset.visible = "false";
      eventLayer.dataset.resolved = "true";
    }
    setText(SELECTORS.focusState, "这件小事记住了");
    setText(SELECTORS.focusHint, content.event.shortResult);
    const finalStageId = content.stages[content.stages.length - 1].id;
    const shouldGoHome = choice.targetStageId === finalStageId
      || /回家/.test(choice.label ?? "")
      || /回家/.test(choice.triggerText ?? "");
    if (shouldGoHome) {
      await moveToStage(finalStageId);
    }
    const currentNode = content.nodes.find((node) => node.id === currentNodeId) ?? content.nodes[0];
    renderFocus(currentNode);
    showRipples();
    save();
  }

  function updateMotion(mode) {
    motion.mode = mode === "off" || mode === "reduced" ? mode : "full";
    cueDirector.setMode(motion.mode);
    root.dataset.motion = motion.mode;
    document.body.dataset.motion = motion.mode;
    const toggle = appRoot.querySelector(SELECTORS.motionToggle);
    if (toggle) { toggle.setAttribute("aria-pressed", String(motion.mode !== "full")); toggle.dataset.motionMode = motion.mode; }
    save();
  }

  function attach() {
    appRoot.addEventListener("pointerdown", (event) => { const button = event.target.closest("button"); if (button) { playSound("click"); button.classList.add("is-pressed"); button.focus({ preventScroll: true }); requestAnimationFrame(() => button.classList.remove("is-pressed")); } });
    appRoot.addEventListener("click", async (event) => {
      const nodeElement = event.target.closest(SELECTORS.sceneNode);
      if (nodeElement) {
        const node = matchContentNode(content, nodeElement);
        if (node) { if (port.getState().stageId !== node.stageId) await moveToStage(node.stageId); focusNode(node.id); }
        return;
      }
      const listNode = event.target.closest("[data-object-list] [data-node-id]");
      if (listNode) { const node = matchContentNode(content, listNode); if (node) { if (port.getState().stageId !== node.stageId) await moveToStage(node.stageId); focusNode(node.id); } const list = appRoot.querySelector(SELECTORS.objectList); if (list instanceof HTMLDetailsElement) list.open = false; else list?.setAttribute("hidden", ""); return; }
      const action = event.target.closest("[data-action]");
      if (action && action.dataset.action !== "reduce-motion" && action.dataset.action !== "restart") { await performAction(action.dataset.action); return; }
      const choice = event.target.closest("[data-event-choice]");
      if (choice) { await performChoice(choice.dataset.eventChoice); return; }
      if (action?.dataset.action === "restart" || event.target.closest(SELECTORS.restart)) { clearCheckpoint(storage); window.location.reload(); return; }
      if (action?.dataset.action === "reduce-motion") updateMotion(motion.mode === "full" ? "reduced" : "full");
      if (event.target.closest(SELECTORS.skip)) { cueDirector.skip(); return; }
      if (event.target.closest(SELECTORS.objectListToggle)) { const list = appRoot.querySelector(SELECTORS.objectList); if (list instanceof HTMLDetailsElement) list.open = !list.open; else list?.removeAttribute("hidden"); return; }
      if (event.target.closest(SELECTORS.objectListClose)) appRoot.querySelector(SELECTORS.objectList)?.setAttribute("hidden", "");
    });
    appRoot.addEventListener("change", (event) => {
      if (event.target.matches(SELECTORS.motionToggle)) updateMotion(event.target.value);
      if (event.target.matches(SELECTORS.soundToggle)) { sound.enabled = event.target.checked; setSoundEnabled(sound.enabled); save(); }
    });
    appRoot.addEventListener("keydown", async (event) => {
      if (event.key === "Escape") { const list = appRoot.querySelector(SELECTORS.objectList); if (list instanceof HTMLDetailsElement) list.open = false; else list?.setAttribute("hidden", ""); cueDirector.skip(); }
      if ((event.key === "Enter" || event.key === " ") && event.target.matches(SELECTORS.sceneNode)) { event.preventDefault(); event.target.click(); }
    });
    root.querySelectorAll(SELECTORS.sceneNode).forEach((element) => { element.setAttribute("aria-controls", "focusCard"); });
    appRoot.querySelectorAll(".stage-tabs button").forEach((tab, index) => tab.addEventListener("click", () => moveToStage(content.stages[index]?.id)));
    if (!appRoot.querySelector(SELECTORS.restart)) { const controls = appRoot.querySelector(".scene-controls") || appRoot; const restart = document.createElement("button"); restart.type = "button"; restart.id = "scene-restart"; restart.textContent = "重新开始"; controls.append(restart); }
  }

  attach();
  root.dataset.contentId = content.id;
  setVisibleStage(port.getState().stageId);
  focusNode(currentNodeId, { announce: false, persist: false });
  restoreDomState();
  root.querySelectorAll(SELECTORS.sceneNode).forEach((element) => { const node = matchContentNode(content, element); element.dataset.stageVisibility = node?.stageId === port.getState().stageId ? "visible" : "hidden"; });
  if (eventTriggered && !eventResolved) showEvent({ persist: false });
  renderTime();
  if (eventResolved || port.getState().stageId === content.stages[content.stages.length - 1].id) showRipples();
  root.dataset.ready = "true";
  // The scene port deliberately exposes only simulation-facing scene state.  The
  // presentation runtime owns its command journal and player preferences, so a
  // browser observer needs a composed *copy* rather than the port object itself.
  // Keeping this here also makes a reload snapshot comparable without leaking a
  // mutable reference to the journal that is later handed to the Core bridge.
  function snapshot() {
    const runtimeState = clone(port.getState());
    const commandJournal = clone(journal);
    return {
      ...runtimeState,
      runtimeState,
      commandJournal,
      // `journal` is retained as a read-only compatibility alias for older
      // playtest tooling.  It contains the same deterministic command entries.
      journal: clone(commandJournal),
      eventTriggered,
      eventResolved,
      triggeredFactIds: clone(triggeredFactIds),
      motion: clone(motion),
      sound: clone(sound),
    };
  }
  const debugApi = Object.freeze({
    getSnapshot: () => snapshot(),
    getState: () => snapshot(),
    getCheckpoint: () => clone(loadCheckpoint(content, storage)),
    getJournal: () => clone(journal),
    skip: () => cueDirector.skip(),
  });
  try {
    Object.defineProperty(globalThis, "__LIGHT_SCENE_RUNTIME__", {
      value: debugApi,
      writable: false,
      configurable: false,
      enumerable: false,
    });
  } catch { /* 已存在不可配置调试对象时保持当前对象 */ }
  return { content, port, cueDirector, restart: () => { clearCheckpoint(storage); window.location.reload(); } };
}

export async function startLightScene() {
  try {
    const content = await loadContent();
    return await boot(content);
  } catch (error) {
    showFatalError(error?.message || "请稍后重试。", () => startLightScene());
    return null;
  }
}

if (typeof document !== "undefined") startLightScene();
