# T0 轻场景技术 Spike 合同与评分表

版本：1.1　日期：2026-08-23　状态：**T0 已完成，正式选择 DOM SceneRuntime**

本表对应 [轻场景互动垂直切片开发说明](LIGHT_SCENE_VERTICAL_SLICE_DEVELOPMENT_PLAN.md) 第 8 节。它只评估“固定生活舞台＋对象热点＋短动作演出”的两份技术 Spike，不评估全人生内容，也不把旧网页页面的功能数量当作游戏质量。

## 1. 固定入口与清单

T0 必须提供两个独立入口，路径不能改名：

```text
public/spikes/light-scene/dom/index.html
public/spikes/light-scene/dom/spike-manifest.json
public/spikes/light-scene/phaser/index.html
public/spikes/light-scene/phaser/spike-manifest.json
```

每份 `spike-manifest.json` 是自动检查的机器合同，至少包含：

```json
{
  "id": "dom",
  "runtime": "dom",
  "entry": "index.html",
  "viewport": { "width": 390, "height": 844 },
  "resources": ["public/spikes/light-scene/dom/scene.js"],
  "nodes": [],
  "interaction": {
    "semanticEntry": "native",
    "reducedMotion": true,
    "largeTextBlock": false,
    "actionCardList": false,
    "physics": false,
    "pathfinding": false
  },
  "copy": {
    "longTextScroll": false,
    "maxVisibleParagraphChars": 36,
    "maxActionLabelChars": 7
  },
  "actions": [],
  "manualScores": null
}
```

Phaser入口可以使用 `semanticEntry: "equivalent"`，但必须在入口中提供可访问对象列表、ARIA等价入口或其他能在不操作Canvas的情况下触发相同对象动作的证据。DOM入口必须使用原生 `button`、`a`、`input`、`select` 或 `summary` 等交互元素。

## 2. 自动合同检查

从项目根目录运行：

```powershell
node scripts/check-light-scene-spikes.mjs
```

脚本在两个Spike尚未完成时应失败，并逐条指出缺少的入口、清单、资源或契约；不能因为某一份Spike缺失就静默跳过。通过后输出两个Spike的节点数、动作数、资源数、硬门槛状态和评分摘要。

自动检查覆盖：

| 合同 | 通过条件 |
| --- | --- |
| 两个入口/资源 | DOM与Phaser入口、清单存在；清单声明的本地资源全部存在；HTML引用的本地资源可解析 |
| 390×844 | HTML声明移动端viewport；清单准确声明宽390、高844 |
| 场景节点 | 每个Spike至少4个有稳定ID的节点，并包含kind、stageId、anchorId、label |
| 语义入口 | native或equivalent之一；不能只有Canvas坐标点击而没有替代入口 |
| 文字边界 | 不允许大段文字滚动；可见段落最多36字，行动标签最多7字；入口不得使用行动卡列表命名 |
| 减少动态 | `reducedMotion: true`，且所有动作声明`skipSafe: true` |
| 轻场景边界 | `physics: false`、`pathfinding: false`；入口不能出现物理/碰撞/寻路实现 |
| 动作契约 | 至少两段动作；每段都声明`npc.react`和`prop.change`；每段均可安全跳过表现 |

自动合同通过不等于可玩性通过。尤其不能把资源存在、无控制台错误或清单完整当作“像游戏”的证明。

## 3. 动作清单合同

每个动作至少应类似：

```json
{
  "id": "join-marbles",
  "label": "加入弹珠",
  "cueTypes": [
    "actor.move-between-anchors",
    "actor.pose",
    "prop.change",
    "npc.react"
  ],
  "skipSafe": true
}
```

必须体现两段真实短动作，而不是两个“显示结果”的按钮。动作过程应让玩家看到：

```text
对象状态 → 玩家意图 → 可见过程 → NPC/物件回应 → 局面变化
```

推荐动作：加入弹珠、练一会字、看看自行车、帮忙摆碗中的任意两项，但实际名称可以由切片实现代理根据冻结规格确定。

## 4. 评分权重

人工评分使用0～10分，每一项先给原始分，再按权重换算：

```text
加权总分 = Σ（原始分 ÷ 10 × 权重）
满分100分
```

| 评分项 | 权重 | 评分问题 | 0分表现 | 10分表现 | 硬门槛 |
| --- | ---: | --- | --- | --- | :---: |
| 场景感、角色层级与动作连续性 | 25 | 是否像一个正在发生的生活片段？ | 背景图＋按钮，人物/物件不动 | 4个以上对象有明确层级、焦点、短动作和连续反馈 | 是 |
| 新增人物/物件/舞台的维护成本 | 20 | 新增一个节点或NPC是否有稳定入口？ | 需要改多处隐式坐标和分支 | 用数据和独立对象即可增删，结构清楚 | 是 |
| 与确定性Core和Cue的隔离 | 15 | 表现是否不会决定模拟事实？ | UI/动画直接改属性或重新抽随机 | Core、Cue Mapper、SceneRuntime边界清晰，刷新/跳过结果一致 | 是 |
| 390×844性能与资源体积 | 15 | 手机竖屏是否稳定、加载是否合理？ | 溢出、掉帧、资源阻塞首屏 | 390×844无横向溢出；交互稳定；资源可追踪 | 是 |
| 触摸、键盘与无障碍替代入口 | 15 | 不操作画布或减少动态时是否仍能玩？ | 只能点击Canvas坐标 | 触摸、键盘焦点、原生/等价对象入口和减少动态均可完成 | 是 |
| 构建、调试与发布复杂度 | 10 | 个人开发者能否维护和发布？ | 依赖隐式环境或无法复现 | 启动、调试、打包路径清晰，依赖最少 | 否 |

每项评分必须记录证据：截图/录屏时间点、操作步骤、资源体积或代码位置。不能用“感觉更好”替代证据。

## 5. 选型规则

按以下顺序执行：

1. 任意一项硬门槛失败，立即淘汰该Spike，不能用总分补偿。
2. 两个Spike都通过硬门槛，且总分差小于10分，选择DOM SceneRuntime，控制个人开发复杂度。
3. Phaser总分至少高出DOM 10分，或DOM无法稳定维护人物、物件、镜头和焦点层级，选择Phaser SceneRuntime。
4. 构建复杂度不是硬门槛，但必须记录后续成本；它不能掩盖场景感或无障碍失败。
5. 选型冻结后，首切片期间不得再次摇摆；新引擎只能在下一次架构评审提出。

选型记录模板：

| Spike | 场景25 | 维护20 | Core15 | 性能15 | 入口15 | 复杂度10 | 总分 | 硬门槛 | 证据位置 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| DOM |  |  |  |  |  |  |  |  |  |
| Phaser |  |  |  |  |  |  |  |  |  |

最终选型：`DOM / Phaser`

选型理由：

```text
硬门槛：
总分差：
场景层级证据：
移动端证据：
维护成本证据：
```

### 5.1 2026-08-23 实际选型记录

| Spike | 场景25 | 维护20 | Core15 | 性能15 | 入口15 | 复杂度10 | 总分 | 硬门槛 | 证据位置 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| DOM | 9 | 7.5 | 9 | 9.5 | 9 | 9.5 | 88.25 | 通过 | `light-scene-spike-dom.png`、浏览器合同、3 个运行资源 |
| Phaser | 7.5 | 8.5 | 9 | 7.5 | 7.5 | 6 | 77.75 | 通过 | `light-scene-spike-phaser.png`、浏览器合同、Phaser 约 1.2 MB 运行文件 |

最终选型：**DOM SceneRuntime**。

理由：

```text
硬门槛：两个 Spike 均通过静态合同与 390×844 / 1280×900 浏览器合同。
总分差：DOM 高 10.5 分。
场景层级证据：DOM 将 HUD、人物、物件、节点、对白和动作条收在同一全屏舞台；
Phaser 画布外仍需要动作面板与对象面板，首切片视觉重新出现页面分段。
移动端证据：DOM 无横向溢出，伙伴和弹珠两段动作均产生可观察反馈；
热点被底部动作条遮挡的问题在主验收中被发现并修复。
维护成本证据：Phaser 的显示列表与 Tween 更强，但首切片不使用物理、寻路和自由移动；
DOM 可用原生按钮完成触摸、键盘和无障碍，并避免约 1.2 MB 引擎运行文件进入正式首包。
```

冻结约束：正式 G1 只能发展独立 `SceneRuntime`，不得把轻场景重新写进旧 Presenter；Phaser Spike 保留为技术证据，不进入正式发布包。若未来单场景同时活动角色、复杂帧动画和镜头数量明显超出 DOM 维护能力，只能在下一次架构评审重新提出 Phaser。

## 6. T0不负责证明的事情

T0只决定“轻场景表现层采用哪条技术路线”，不证明以下内容：

- 全人生从出生到结局的内容量是否足够；
- 18岁、成年、职业、婚姻或完整社会系统；
- 商店发布资格、留存、商业化或市场规模；
- 正式美术质量、最终音乐或完整本地化；
- 玩家盲测通过。

T0通过后进入G1灰盒；G1仍需完成10～12分钟首切片，之后才进行5～8人的探索性盲测。自动检查和技术评分不能替代真实玩家判断。
