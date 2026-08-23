# G1→G3 轻场景接入审计地图

版本：1.0　日期：2026-08-23　状态：接入前审计，不包含代码修改

本文件只审计当前仓库的接入边界，不能替代G1内容合同、T0评分或G3实现规格。

## 1. 审计结论

T0已经选择DOM SceneRuntime，两个Spike和上游纯协议检查当前均可通过：

- DOM Spike入口：`public/spikes/light-scene/dom/index.html`；
- Phaser Spike入口：`public/spikes/light-scene/phaser/index.html`；
- 纯协议入口：`src/game/light-scene-contract.mjs`；
- 当前正式应用入口仍是`public/index.html`加载`public/app.mjs`。

当前还没有把轻场景接入正式`#/life`流程。现有页面仍由`public/app.mjs`调用`buildPageViewModels`后渲染旧的页面式生活界面，`src/app/routes.mjs`也没有`scene-y1984`路由。正式接入必须保留旧`#/life`作为回退路径，并在独立路由和开关下挂载轻场景。

目前存在三个必须先解决的合同缺口：

1. [G1验收文档](LIGHT_SCENE_G1_ACCEPTANCE.md)、内容检查脚本和协议检查已经统一使用`data/gameplay/light_scene_yard_1984.json`与`src/game/light-scene-contract.mjs`，当前不存在第二份G1 JSON。正式应用仍未加载这份唯一内容源，这是接入缺口，不是内容合同缺口。
2. [轻场景协议](../src/game/light-scene-contract.mjs)已经改为由调用方传入canonical content，不再复制舞台、节点、人物和动作ID；但`src/game/load-game-data.mjs`仍没有加载该内容，正式应用也没有把它注入协议端口。
3. `createSceneRuntimePort().prepareAction()`只返回本地场景状态、Core命令和Cue，没有现成的“提交命令→取得引擎回复→写入存档→把回复映射为Cue”的应用层用例。直接把Spike按钮接到`ReplayGameGateway.submitChoice()`会绕过G1内容与正式季度选项的映射校验。

因此，下一批开发的第一目标不是改旧页面，而是冻结一个canonical JSON、一个契约适配器和一个独立场景用例，再挂到`#/scene-y1984`。

## 2. 正式DOM SceneRuntime的目录和入口

### 2.1 当前仓库的过渡目录

T0目录只用于技术证据，不进入正式主应用：

```text
public/spikes/light-scene/dom/index.html
public/spikes/light-scene/dom/runtime.mjs
public/spikes/light-scene/dom/styles.css
public/spikes/light-scene/dom/spike-manifest.json
```

不要继续把G1实现堆到这个Spike目录；它必须保持可复现的对照样本。

### 2.2 正式接入入口

当前架构下，正式入口应是现有HTML壳，而不是第二个独立HTML页面：

```text
public/index.html                         # 现有应用壳，新增唯一的场景挂载区
public/app.mjs                            # 现有启动器和Hash路由，新增独立分支
src/game/light-scene-runtime/
  dom-scene-runtime.mjs                   # DOM SceneRuntime唯一实现入口
  scene-content-adapter.mjs               # canonical JSON → 场景节点/动作模型
  scene-cue-mapper.mjs                    # DomainEvent/SceneCue → 表现Cue
  scene-runtime-view.mjs                  # DOM挂载、销毁和订阅管理
```

正式HTML挂载区固定命名为`#light-scene-root`，并与旧的`#game-screen`并列。正式场景不复制整套页面壳，也不从`public/spikes`动态加载。审计时`public/index.html`尚无`#light-scene-root`，这是待实施缺口。

未来按[技术架构](TECHNICAL_ARCHITECTURE.md)迁移到Vite/Vue后，对应目录应收敛为：

```text
apps/web/src/features/light-scene/
  LightSceneView.vue
  dom-scene-runtime.ts
  scene-content-adapter.ts
  scene-cue-mapper.ts
```

这只是迁移目标，不得在当前原生ESM阶段提前制造第二套构建系统。

## 3. 路由和Feature Flag接入

### 3.1 当前真实路由

[路由模块](../src/app/routes.mjs)导出`ROUTES`、`MAIN_ROUTES`、`parseRouteHash`、`formatRouteHash`、`routeForPending`和`routeTitle`。当前`ROUTES.SCENE`值为`scene`，`LEGACY_ROUTES.life`把`#/life`兼容到`scene`。

[应用启动器](../public/app.mjs)在`renderRoute()`中将主路由交给`renderMain()`；首次加载时先从`readSavedSession()`恢复存档，再调用`resumeLife()`，没有独立场景路由分支。

### 3.2 推荐的安全路由

新增稳定路由名：

```text
#/scene-y1984
```

保留以下行为：

| 地址 | 处理方式 |
| --- | --- |
| `#/life` | 继续进入旧`ROUTES.SCENE`，不改变已有存档和回归测试 |
| `#/scene-y1984`且开关关闭 | 回退到`#/life`，显示一次开发提示，不修改人生事实 |
| `#/scene-y1984`且开关开启 | 挂载正式DOM SceneRuntime，不显示旧底部主导航 |
| `?debug=1&lightScene=1#/scene-y1984` | 仅开发环境允许直达，并保留调试抽样入口 |
| 生产环境直接带`lightScene=1` | 不应绕过发布配置；以构建时开关为准 |

当前只有`public/app.mjs`中的`DEBUG_MODE`（读取`?debug=1`），没有通用Feature Flag模块。建议新增一个小型`src/app/feature-flags.mjs`，只负责读取布尔开关，不让SceneRuntime读取URL、DOM或存储。路由层先判断开关，运行时只接收已经批准的`SceneRuntimeOptions`。

### 3.3 不破坏旧原型的挂载顺序

```text
parseRouteHash
→ feature flag判断
→ scene-y1984分支：加载场景内容并挂载#light-scene-root
→ 其他路由：沿用normalizedRoute/renderMain
```

`normalizedRoute()`当前在没有`result/pages`时会回到标题页；新场景分支必须在这条旧规则之前单独处理，否则直达场景会被误判为没有存档。若G1需要从一个独立灰盒人生开始，必须明确使用`sceneHarness`模式，不得偷偷创建或修改正式人生存档。

## 4. 当前可复用的确定性API

### 4.1 SceneRuntime协议

[src/game/light-scene-contract.mjs](../src/game/light-scene-contract.mjs)目前实际导出：

| 导出名 | 作用 | 接入结论 |
| --- | --- | --- |
| `LIGHT_SCENE_CONTRACT_VERSION`、`LIGHT_SCENE_ID` | 协议和场景稳定标识 | 可复用，但需要与canonical内容ID做一次映射 |
| `SCENE_CUE_TYPES` | 允许的Cue类型 | 可复用 |
| `validateLightSceneContent()` | 校验canonical JSON的舞台、节点、角色、行动、Cue和事件 | 可复用；当前检查已覆盖 |
| `normalizeLocalSceneIntent(content, input)` | 按内容ID归一化本地意图并安全回退 | 可复用 |
| `mapSceneActionToCommand(content, actionId, context)`、`mapEventChoiceToCommand()` | 从内容动作/事件选择生成确定性命令 | 可复用；仍需应用层pending校验 |
| `createActionCues()`、`createEventCues()`、`skipSceneCues()` | 从JSON过程Cue生成/跳过表现Cue | 可复用；跳过不改变命令 |
| `createSceneRuntimeState(content, options)`、`validateSceneRuntimeState(content, state)` | 内容驱动的场景状态和验证 | 可复用；当前状态没有接入正式存档 |
| `createSceneRuntimePort(content, options)` | `getState/getStages/getNodes/getCharacters/getActions/dispatchIntent/prepareAction/prepareEventChoice/skipPresentation/subscribe` | 可作为DOM运行时端口，但需要应用层桥接 |

该模块通过检查证明了纯ESM、无DOM、无`Math.random()`和可跳过Cue；它不负责加载JSON、不负责读写存档、不负责调用`ReplayGameGateway`。内容由调用方传入，这正是正式加载器和应用桥接仍缺失的位置。

### 4.2 Core Gateway和应用层

[src/game/game-gateway.mjs](../src/game/game-gateway.mjs)实际导出`ReplayGameGateway`和`createGameGateway()`：

- `restoreSession(rawSession)`：迁移并校验会话；
- `startLife(config)`：创建会话并运行到第一个等待节点；
- `resumeLife(session)`：校验并继续运行；
- `submitChoice(session, pendingDecision, choice)`：调用`applySessionChoice()`后继续运行。

[src/game/game-application.mjs](../src/game/game-application.mjs)实际导出`getGameGateway()`、`restoreLifeSession()`、`startLife()`、`resumeLife()`和`submitLifeChoice()`。这些是旧人生流程的可复用入口。

当前缺口：没有`submitSceneAction()`或`resolveSceneEvent()`。正式桥接应新建独立用例文件，避免让DOM直接依赖`ReplayGameGateway`内部实现：

```text
prepareSceneAction(sceneState, actionId, context)
→ mapSceneActionToCommand()
→ validate command against pendingDecision
→ submitLifeChoice(data, session, result, command)
→ return { session, result, domainEvents, presentationCues }
```

在四项G1行动没有进入当前Core的`pendingDecision.options`以前，不能声称它们已经接入了人生模拟。当前`SCENE_ACTION_COMMANDS`中的`child_play_nearby`、`child_practice_symbols`等ID必须能在正式季度内容中找到，否则只能作为Spike演示命令。

### 4.3 存档恢复

[src/app/save-recovery.mjs](../src/app/save-recovery.mjs)实际导出：

- `restoreFirstValidSave({ storage, keys, restore })`：按主存档、备份和旧版本顺序恢复，损坏项删除；
- `rotateRecoverableSave({ storage, primaryKey, backupKey, nextValue, restore })`：写入前轮换有效主存档到备份。

`public/app.mjs`当前使用：

- 正式主存档`people-life:active:v5`；
- 正式备份`people-life:backup:v5`；
- 调试主存档`people-life:debug:v1`；
- 调试备份`people-life:debug-backup:v1`；
- `readSavedSession()`在约第197行调用恢复；
- `saveActiveSession()`在约第213行调用轮换写入。

当前存档只保存人生`session`，没有保存`SceneRuntimeState`的舞台、焦点、9格已用时间、场景完成动作或本地事件演出状态。G1正式接入必须把“已经发生的场景事实”写入Core命令/事实或可验证的场景checkpoint；不能只把DOM状态塞进`localStorage`。

### 4.4 动画、声音和设置

[src/app/presentation-preferences.mjs](../src/app/presentation-preferences.mjs)实际导出`PRESENTATION_STORAGE_KEY`、`MOTION_MODES`、`normalizePresentationPreferences()`和`motionDuration()`。当前偏好包含`motionMode`、`soundEnabled`、`hapticEnabled`。

[public/sound-haptic-service.mjs](../public/sound-haptic-service.mjs)实际导出`playSound()`、`setSoundEnabled()`、`isSoundEnabled()`、`triggerHaptic()`、`setHapticEnabled()`和`isHapticEnabled()`。

可复用方式：

- SceneRuntime读取应用层传入的`motionMode`，不自己读`matchMedia`或localStorage；
- Cue时长通过`motionDuration()`裁剪；`off`模式必须直接完成状态表现；
- `npc.react`、`prop.change`等Cue可以调用`playSound()`和`triggerHaptic()`；
- 音效和震动只表现已完成的事实，不能参与随机或结算。

当前缺口：没有`SceneAudioDirector`或`SceneMotionDirector`，没有把Cue类型映射到音效/震动的统一表，也没有面向SceneRuntime的设置注入接口。G3应新建独立适配器，不能让DOM节点直接调用平台音频状态。

## 5. Canonical JSON与light-scene-contract数据流

### 5.1 当前文件事实

当前仓库中存在并已被G1合同脚本读取：

```text
data/gameplay/light_scene_yard_1984.json
```

但[load-game-data.mjs](../src/game/load-game-data.mjs)的`DATA_FILES`没有`lightScene`条目，且主应用不会加载它。G1验收说明、内容合同脚本和协议合同脚本均已读取同一份`data/gameplay/light_scene_yard_1984.json`；因此“内容合同已通过”不等于“正式应用已接入”。

### 5.2 需要冻结的单一来源

G1的唯一来源已经冻结为：

```text
data/gameplay/light_scene_yard_1984.json    # 叙事、舞台、人物、行动、事件、余波
src/game/light-scene-contract.mjs           # 运行时映射、Cue、时间和稳定ID交叉合同
```

不得再创建第二份G1 JSON；内容加载器和SceneRuntime适配器必须直接使用该路径，并复用现有协议校验。

### 5.3 目标数据流

```text
canonical JSON
  → JSON解析/内容合同
  → 稳定ID索引与内容版本
  → scene-content-adapter
  → SceneRuntimePort（节点、动作、时间、Cue）
  → DOM SceneRuntime（焦点、短动作、物件和NPC反馈）

玩家点击对象
  → LocalSceneIntent（只改变焦点/舞台）
  → prepareSceneAction
  → 稳定GameCommand（quarter.plan或event.choose）
  → ReplayGameGateway / 未来IncrementalGameGateway
  → EngineReply（session、pending、domain events、checkpoint）
  → scene-cue-mapper
  → DOM表现Cue
  → saveActiveSession / checkpoint写入
```

边界规则：

- canonical JSON不包含坐标和模拟公式；
- `light-scene-contract.mjs`不读取DOM、存储或素材；
- DOM不直接修改Core快照；
- 动画跳过只改变Cue时长和播放队列；
- 命令、事件和事实使用稳定ID，不使用页面顺序或中文标题；
- `SceneRuntimeState`的可恢复部分必须来自事实/checkpoint，不保存为不可验证的ViewModel。

## 6. 下一批并行文件所有权

每项任务只改自己拥有的文件；`src/game/light-scene-contract.mjs`、存档版本、全局CSS和内容ID表必须由主代理或指定唯一所有者维护。

| 代理职责 | 推荐模型 | 唯一文件所有权 | 交付与验收 |
| --- | --- | --- | --- |
| 路由/主应用接入 | Luna；跨`app.mjs`流程失败再升Terra | `src/app/routes.mjs`、`public/index.html`、`public/app.mjs` | `#/life`不变；开关关闭回退；开关开启挂载`#light-scene-root` |
| 内容加载与适配 | Luna | `src/game/light-scene-content-adapter.mjs`、`src/game/load-game-data.mjs` | canonical JSON只加载一次；ID和文本合同失败即阻断 |
| DOM SceneRuntime | Luna | `src/game/light-scene-runtime/`新目录及其测试 | 无卡片行动；对象热点、Cue、跳过和键盘入口可用 |
| Core应用桥接 | Terra | `src/game/light-scene-application.mjs`、新桥接测试 | 命令经过pending校验；结果和Cue同一回复返回 |
| 存档与设置适配 | Luna | `src/app/scene-save-repository.mjs`、`src/app/scene-presentation-adapter.mjs` | 恢复不重抽结果；动画/音频设置不写入人生事实 |
| G1浏览器QA | Luna | `scripts/check-light-scene-integration.mjs`、`scripts/check-light-scene-integration-browser.mjs` | 390×844、桌面、无横溢出、反馈改变、减少动态 |

模型升级条件遵循项目规则：Luna缺少必要工具、两次修订仍不达标、无法维护跨文件一致性或涉及Core/存档状态权衡时，保留产物和失败证据后再交Terra；Sol只用于新的跨层协议或高风险迁移裁决。

## 7. 最小自动检查命令

在接入前运行当前已有检查：

```powershell
node scripts/check-light-scene-contract.mjs
node scripts/check-light-scene-spikes.mjs
node scripts/check-ui-contract.mjs
node scripts/check-game-gateway.mjs
node scripts/check-save-recovery.mjs
```

G1内容合同当前应运行：

```powershell
node scripts/check-light-scene-yard-content.mjs
```

正式接入完成后追加：

```powershell
node scripts/check-light-scene-integration.mjs
node scripts/check-light-scene-integration-browser.mjs
npm run ui:check
npm run browser:check
```

核心命令、存档协议或RNG改变时再运行：

```powershell
npm run check
```

本次审计实际运行并通过了：`check-light-scene-contract`、`check-light-scene-yard-content`、`check-light-scene-spikes`、`check-ui-contract`、`check-game-gateway`和`check-save-recovery`。内容合同通过只证明canonical JSON与纯协议一致，尚不证明正式路由、Gateway、存档和DOM场景已经接通。

## 8. G1→G3闸门

```text
G1：唯一canonical JSON + 内容合同 + SceneRuntime适配器
  ↓
G2：真实DOM场景、人物/物件分层、动作与设置适配
  ↓
G3：#/scene-y1984独立开关、Core命令闭环、存档恢复、浏览器回归
  ↓
5～8人小范围盲测
```

如果任一阶段仍需要在`public/app.mjs`里硬编码第二套行动、事件或人物ID，说明适配边界没有冻结，必须回到G1处理，不能继续用页面条件分支掩盖缺口。
