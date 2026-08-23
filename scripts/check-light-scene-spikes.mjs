import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const spikeRoot = path.join(projectRoot, "public", "spikes", "light-scene");

// T0 has two deliberately fixed entry points. Keeping these paths stable makes
// the result comparable between agents and prevents a missing Spike from being
// hidden behind a differently named prototype directory.
const SPIKES = [
  { id: "dom", label: "DOM SceneRuntime", directory: "dom" },
  { id: "phaser", label: "Phaser SceneRuntime", directory: "phaser" },
];

const HARD_GATES = [
  "sceneFeel",
  "maintainability",
  "coreIsolation",
  "performance",
  "accessibility",
];

const WEIGHTS = Object.freeze({
  sceneFeel: 25,
  maintainability: 20,
  coreIsolation: 15,
  performance: 15,
  accessibility: 15,
  buildComplexity: 10,
});

const readJson = (absolutePath, label) => {
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`${label}不存在：${path.relative(projectRoot, absolutePath)}`);
  }
  try {
    return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch (error) {
    throw new Error(`${label}不是有效 JSON：${path.relative(projectRoot, absolutePath)}（${error.message}）`);
  }
};

const readText = (absolutePath, label) => {
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`${label}不存在：${path.relative(projectRoot, absolutePath)}`);
  }
  return fs.readFileSync(absolutePath, "utf8");
};

const fail = (message) => {
  throw new Error(message);
};

const assertBoolean = (value, expected, message) => {
  if (value !== expected) fail(message);
};

const assertNumber = (value, predicate, message) => {
  if (typeof value !== "number" || !predicate(value)) fail(message);
};

const checkResource = (resource, manifestPath, label) => {
  if (typeof resource !== "string" || resource.length === 0) {
    fail(`${label}的 resources 必须是非空字符串路径`);
  }
  const absolutePath = path.resolve(projectRoot, resource);
  const relativeToRoot = path.relative(projectRoot, absolutePath);
  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    fail(`${label}资源越过项目根目录：${resource}`);
  }
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    fail(`${label}资源不存在：${resource}（由 ${path.relative(projectRoot, manifestPath)} 引用）`);
  }
};

const referencedLocalFiles = (entryText) => {
  const references = [];
  for (const match of entryText.matchAll(/(?:src|href)=["']([^"']+)["']/gi)) references.push(match[1]);
  for (const match of entryText.matchAll(/url\(["']?([^"')]+)["']?\)/gi)) references.push(match[1]);
  return references
    .map((value) => value.split("#")[0].split("?")[0])
    .filter((value) => value && !/^(?:https?:|data:|mailto:|javascript:|#|\/)/i.test(value));
};

const checkSpike = ({ id, label, directory }) => {
  const spikeDirectory = path.join(spikeRoot, directory);
  const entryPath = path.join(spikeDirectory, "index.html");
  const manifestPath = path.join(spikeDirectory, "spike-manifest.json");
  const entryText = readText(entryPath, `${label}入口`);
  const manifest = readJson(manifestPath, `${label}清单`);
  const errors = [];

  const check = (callback) => {
    try {
      callback();
    } catch (error) {
      errors.push(error.message);
    }
  };

  check(() => {
    if (manifest.id !== id) fail(`${label}清单 id 应为 ${id}`);
    if (manifest.runtime !== id) fail(`${label}清单 runtime 应为 ${id}`);
    if (manifest.entry !== "index.html") fail(`${label}清单 entry 必须为 index.html`);
    if (!entryText.match(/<meta[^>]+name=["']viewport["'][^>]+>/i)
      || !entryText.match(/width\s*=\s*device-width/i)
      || !entryText.match(/initial-scale\s*=\s*1(?:\.0)?/i)) {
      fail(`${label}入口缺少移动端 viewport（必须包含 width=device-width 和 initial-scale=1）`);
    }
  });

  check(() => {
    const viewport = manifest.viewport;
    if (!viewport || viewport.width !== 390 || viewport.height !== 844) {
      fail(`${label}必须声明 390×844 viewport，实际为 ${JSON.stringify(viewport)}`);
    }
  });

  check(() => {
    if (!Array.isArray(manifest.resources) || manifest.resources.length === 0) {
      fail(`${label}必须声明至少一个 resources 文件`);
    }
    for (const resource of manifest.resources ?? []) checkResource(resource, manifestPath, label);
    for (const reference of referencedLocalFiles(entryText)) {
      const absolutePath = path.resolve(spikeDirectory, reference);
      if (!fs.existsSync(absolutePath)) fail(`${label}入口引用的本地资源不存在：${reference}`);
    }
  });

  check(() => {
    if (!Array.isArray(manifest.nodes) || manifest.nodes.length < 4) {
      fail(`${label}必须声明至少4个场景节点，实际为 ${manifest.nodes?.length ?? 0}`);
    }
    const nodeIds = new Set();
    for (const node of manifest.nodes) {
      if (!node || typeof node.id !== "string" || !node.id) fail(`${label}存在无效场景节点 id`);
      if (nodeIds.has(node.id)) fail(`${label}场景节点 id 重复：${node.id}`);
      nodeIds.add(node.id);
      for (const field of ["kind", "stageId", "anchorId", "label"]) {
        if (typeof node[field] !== "string" || !node[field]) fail(`${label}节点 ${node.id} 缺少 ${field}`);
      }
    }
  });

  check(() => {
    const interaction = manifest.interaction;
    if (!interaction || !["native", "equivalent"].includes(interaction.semanticEntry)) {
      fail(`${label}必须声明 interaction.semanticEntry 为 native 或 equivalent`);
    }
    assertBoolean(interaction.reducedMotion, true, `${label}必须支持 reducedMotion`);
    assertBoolean(interaction.largeTextBlock, false, `${label}不得包含 largeTextBlock`);
    assertBoolean(interaction.actionCardList, false, `${label}不得使用 actionCardList`);
    assertBoolean(interaction.physics, false, `${label}不得加入 physics`);
    assertBoolean(interaction.pathfinding, false, `${label}不得加入 pathfinding`);
    if (interaction.semanticEntry === "native" && !entryText.match(/<(?:button|a|input|select|summary)\b/i)) {
      fail(`${label}声明 native 语义入口，但 index.html 未找到原生交互元素`);
    }
    if (interaction.semanticEntry === "equivalent" && !entryText.match(/(?:accessible|accessib|aria-|role=["'](?:button|listbox|listitem|dialog)|object-list)/i)) {
      fail(`${label}声明 equivalent 语义入口，但 index.html 未找到等价入口证据`);
    }
  });

  check(() => {
    const copy = manifest.copy;
    if (!copy || copy.longTextScroll !== false) fail(`${label}必须声明 copy.longTextScroll=false`);
    assertNumber(copy.maxVisibleParagraphChars, (value) => value >= 0 && value <= 36,
      `${label}的 maxVisibleParagraphChars 必须在 0～36 之间`);
    assertNumber(copy.maxActionLabelChars, (value) => value >= 1 && value <= 7,
      `${label}的 maxActionLabelChars 必须在 1～7 之间`);
    if (entryText.match(/action-(?:card|list|grid)|choice-card|option-card/i)) {
      fail(`${label}入口源码出现行动卡列表命名，必须改为对象热点＋情境动作条`);
    }
  });

  check(() => {
    const actions = manifest.actions;
    if (!Array.isArray(actions) || actions.length < 2) {
      fail(`${label}必须声明至少两段可玩的动作，实际为 ${actions?.length ?? 0}`);
    }
    const actionIds = new Set();
    let hasNpcFeedback = false;
    let hasPropFeedback = false;
    for (const action of actions) {
      if (!action || typeof action.id !== "string" || !action.id) fail(`${label}存在无效动作 id`);
      if (actionIds.has(action.id)) fail(`${label}动作 id 重复：${action.id}`);
      actionIds.add(action.id);
      if (!Array.isArray(action.cueTypes) || action.cueTypes.length === 0) {
        fail(`${label}动作 ${action.id} 缺少 cueTypes`);
      }
      if (!action.cueTypes.includes("npc.react")) fail(`${label}动作 ${action.id} 缺少 npc.react 反馈契约`);
      if (!action.cueTypes.includes("prop.change")) fail(`${label}动作 ${action.id} 缺少 prop.change 反馈契约`);
      if (action.cueTypes.includes("npc.react")) hasNpcFeedback = true;
      if (action.cueTypes.includes("prop.change")) hasPropFeedback = true;
      assertBoolean(action.skipSafe, true, `${label}动作 ${action.id} 必须可安全跳过演出`);
    }
    if (!hasNpcFeedback || !hasPropFeedback) fail(`${label}两段动作必须覆盖 NPC 与物件反馈`);
  });

  check(() => {
    const forbidden = entryText.match(/(?:Matter\.JS|arcade|navmesh|pathfinding|astar|physics\.add|collider|collision)/i);
    if (forbidden) fail(`${label}入口源码出现禁止的物理/寻路实现：${forbidden[0]}`);
  });

  return {
    id,
    label,
    entry: path.relative(projectRoot, entryPath),
    manifest: path.relative(projectRoot, manifestPath),
    nodes: manifest.nodes?.length ?? 0,
    actions: manifest.actions?.length ?? 0,
    resources: manifest.resources?.length ?? 0,
    hardGate: errors.length === 0,
    errors,
    manualScores: manifest.manualScores ?? null,
  };
};

const weightedScore = (scores) => {
  if (!scores || typeof scores !== "object") return null;
  const missing = Object.keys(WEIGHTS).filter((key) => typeof scores[key] !== "number");
  if (missing.length > 0) return null;
  return Number(Object.entries(WEIGHTS)
    .reduce((sum, [key, weight]) => sum + scores[key] * weight / 10, 0).toFixed(2));
};

const results = [];
const topLevelErrors = [];
for (const spike of SPIKES) {
  try {
    results.push(checkSpike(spike));
  } catch (error) {
    results.push({
      id: spike.id,
      label: spike.label,
      entry: path.relative(projectRoot, path.join(spikeRoot, spike.directory, "index.html")),
      manifest: path.relative(projectRoot, path.join(spikeRoot, spike.directory, "spike-manifest.json")),
      nodes: 0,
      actions: 0,
      resources: 0,
      hardGate: false,
      errors: [error.message],
      manualScores: null,
    });
  }
}

const validResults = results.filter((result) => result.hardGate);
const scoreSummary = results.map((result) => ({
  id: result.id,
  label: result.label,
  hardGate: result.hardGate,
  manualScore: weightedScore(result.manualScores),
}));

const failures = results.flatMap((result) => result.errors.map((error) => `${result.label}：${error}`));
const output = {
  ok: failures.length === 0,
  contract: "T0-light-scene-spike-v1",
  projectRoot,
  viewport: "390x844",
  spikes: results,
  scoring: {
    weights: WEIGHTS,
    hardGates: HARD_GATES,
    scores: scoreSummary,
    selectionRule: "任一硬门槛失败即淘汰；两者通过且分差<10选DOM；Phaser高出至少10分或DOM无法稳定维护层级则选Phaser；构建复杂度不是硬门槛。",
  },
  failures,
};

if (failures.length > 0) {
  console.error(JSON.stringify(output, null, 2));
  console.error("\nT0 Spike 合同检查未通过。先按每条错误补齐入口、清单或资源，再重新运行：node scripts/check-light-scene-spikes.mjs");
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(output, null, 2));
  console.log("\nT0 Spike 合同检查通过。请人工填写两份 spike-manifest.json 的 manualScores，再按 scorecard 规则选型。");
}
