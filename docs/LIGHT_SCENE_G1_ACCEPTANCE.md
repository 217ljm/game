# G1 轻场景院落灰盒验收说明

版本：2.0　日期：2026-08-23　状态：G1 内容与场景契约验收表

G1只验收“1984年、6岁、放学后院落”这一段10～12分钟灰盒，不扩展到18岁、完整人生、职业、婚姻或大地图。

## 1. 唯一事实源与检查命令

内容与协议只允许有以下两个事实源：

```text
data/gameplay/light_scene_yard_1984.json
src/game/light-scene-contract.mjs
```

运行：

```powershell
node scripts/check-light-scene-yard-content.mjs
```

脚本会读取内容JSON，动态import协议模块并调用其`validateLightSceneContent(content)`、`createSceneRuntimePort(content)`和`validateSceneRuntimeState(content, state)`。任何文件缺失、JSON无法解析、协议自身校验失败或内容与协议运行时ID不一致，都会返回非零状态并输出明确错误。不得创建第二份G1 JSON。

## 2. 内容JSON合同

### 2.1 三舞台与节点

`stages`必须恰好三项，顺序为：

```text
gate  院门
yard  院中
home  家中
```

每个舞台必须有`nodeIds`和`availableActionIds`，并且必须与顶层扁平`nodes`的ID完全一致。节点必须至少包含`id`、`kind`、`stageId`、`anchorId`、`label`。`anchorId`只代表稳定舞台锚点，不是自由移动坐标。

### 2.2 四人物

`characters`必须恰好四项，角色必须覆盖：

```text
player       主角
peer         同龄伙伴
older_peer   年长孩子
caregiver    照护者
```

人物至少有稳定`id`、`role`、`label`。人物不是关系档案项，必须由场景动作和NPC回应引用。

### 2.3 四项主行动

`actions`必须恰好四项。脚本按现有内容Schema检查每项的：

```text
id
coreActionId
corePlan
nodeId
timeCost.slots
processCues
longTermFactCandidates
```

每项`processCues`必须出现：

- `actor.pose`或`actor.move-between-anchors`；
- `prop.change`；
- `npc.react`。

`coreActionId`必须指向既有季度模拟可结算的稳定活动；`corePlan`声明进入季度时的投入强度和季度时间格。现场的5分钟时间格只使用`timeCost.slots`，不能冒充季度投入。现场动作ID继续用于场景表现，两者不能混用。脚本不强行要求内容中不存在的`actorId`、`propId`、`npcId`或`timeLabel`字段。人物、物件、NPC由节点、角色回应和Cue共同表达。

### 2.4 动态弹珠事件

`event`必须是单个对象，不使用`dynamicEvents`数组；`event.choices`必须恰好三项。事件ID或标签必须能明确识别为弹珠事件，每个选项至少有`id`、`label`、`processCues`和`longTermFactCandidates`。

### 2.5 时间与文字

`timeAndEnergy.totalSlots`必须为9。`costTiers`必须提供三档，数值为1、2、3；当前Schema允许使用`timeSlots`或`tier`承载档位数值。

`textLimits`必须满足：

| 内容 | 上限 |
| --- | ---: |
| 节点名称 | 5字 |
| 行动标签 | 7字 |
| 气泡 | 24字 |
| 转场 | 18字 |
| 季度余波 | 80字 |

## 3. 协议一致性

脚本会动态import`src/game/light-scene-contract.mjs`，并验证：

- `LIGHT_SCENE_CONTRACT_VERSION`与内容`version`一致；
- 协议运行时`getStages()`与内容舞台ID完全一致；
- 协议运行时`getNodes()`与内容节点ID完全一致；
- 协议运行时`getCharacters()`与内容人物ID完全一致；
- 协议运行时`getActions()`与内容行动ID完全一致；
- 协议节点的`stageId`、`anchorId`与内容一致；
- 协议动作的`nodeId`、`timeSlots`与内容一致；
- 协议事件命令的`eventId`与内容`event.id`一致；
- 每项动作和事件选择都能由协议生成Cue，且动作Cue覆盖actor、prop、NPC。

这是故意的强一致性检查。协议和内容不一致时，必须统一稳定ID，不得在QA脚本里增加别名映射或兼容第二套事实源。

## 4. 明确禁止的字段

内容JSON不得出现以下字段：

```text
x / y / z / coordinate / coordinates
physics / formula / equation / simulation
freeMovement / openWorld / largeMap
pathfinding / collision / navmesh
joystick / gamepad / card / cards / actionCards
scrollableActionList
```

脚本只扫描字段名，不会把`acceptance.forbidden`里的说明文本误判为实现字段。G1只允许节点锚点和节点转场，不允许自由移动、物理碰撞、寻路或大地图系统进入内容合同。

## 5. 后续浏览器灰盒检查

内容合同通过后运行：

```powershell
node scripts/check-light-scene-spikes-browser.mjs
```

两个Spike分别在`390×844`和`1280×900`检查：

- 主舞台、情境动作条和至少4个节点/等价入口可见；
- 无页面错误、控制台错误和横向溢出；
- 键盘入口可聚焦；
- 减少动态入口可用；
- 点击伙伴并执行加入玩耍；
- 点击弹珠并执行弹珠互动；
- 动作后NPC/物件反馈状态真实改变；
- 输出两张截图：

```text
artifacts/ui-regression/light-scene-spike-dom.png
artifacts/ui-regression/light-scene-spike-phaser.png
```

浏览器检查必须等待可观察状态，不得用固定sleep替代状态等待。

## 6. G1人工验收

主代理需要完成一次完整10～12分钟灰盒试玩，并记录：

```text
看见节点 → 聚焦节点 → 出现短动词
→ 主角动作 → 物件改变 → NPC回应
→ 时间格减少 → 事件/余波进入长期事实候选
```

人工通过标准：

| 项目 | 标准 |
| --- | --- |
| 三舞台 | 院门、院中、家中由节点转场连接，不是三个网页 |
| 四人物 | 人物在场景中有行为或回应，不是档案列表 |
| 四行动 | 每项都能看到actor、物件、NPC、时间和长期事实闭环 |
| 弹珠事件 | 单事件、三选项、至少一项物件变化和NPC回应 |
| 时间 | 9格有可见消耗，行动不是直接跳结算 |
| 文本 | 无大段正文、无行动卡墙、无滚动文章 |
| 场景 | 动作前后人物/物件状态有可见区别 |
| 参与感 | 未参与编写的人能说出“我和谁做了什么” |
| 重玩 | 至少两项行动值得换路线重新尝试 |

## 7. G1退出标准

全部条件满足后才能进入G2视觉目标：

1. 内容脚本返回`ok: true`；
2. 协议动态校验和ID一致性通过；
3. 浏览器脚本在两个视口、两个Spike通过；
4. 两张指定截图已生成并可查看；
5. 10～12分钟流程从院门走到家中余波；
6. 四项行动都有可见动作、物件变化、NPC回应和时间消耗；
7. 弹珠事件的三个选项可达且结果可观察；
8. 无横向溢出、页面错误、键盘阻断或减少动态阻断；
9. 至少一名未参与内容编写的人无需讲解即可完成第一次行动；
10. 没有卡片行动、自由移动、物理或寻路字段。

G1通过不等于正式发布。后续仍需G2视觉目标、G3可玩切片和5～8人小范围盲测。
