# 轻场景 G1 浏览器验收矩阵

## 范围

本矩阵针对正式入口 `/public/light-scene/` 的 390×844 竖屏和 1280×900 桌面视口。它只验收“院中放学后 · 1984”这一 G1 垂直切片：院门 → 院中 → 家中三舞台，9 个生活对象，9 格时间，主行动和弹珠事件闭环。

自动脚本（脚本会在每个独立浏览器 context 清空 checkpoint；每次断言都等待运行时或 DOM 条件，不能用固定 sleep 证明成功）：

```text
node --check scripts/check-light-scene-g1-browser.mjs
node scripts/check-light-scene-g1-browser.mjs
```

脚本通过 `window.__LIGHT_SCENE_RUNTIME__` 的只读 snapshot/state API 读取运行时状态；它不修改实现，不把 DOM 文案当作模拟事实。运行时必须在正式入口暴露：

```css
[data-light-scene-stage-shell][data-ready="true"]
```

## 自动验收矩阵

| 编号 | 检查 | 通过标准 | 证据 |
| --- | --- | --- | --- |
| A1 | 启动与错误 | 正式入口可加载；无 `pageerror`、console error、request failure；HTTP 4xx/5xx（含 favicon 等 404）输出完整 URL | JSON `blockers`、页面监听 |
| A2 | 响应式布局 | 390×844、1280×900 均无 html/body 横向或纵向页面溢出 | `scrollWidth/scrollHeight` |
| A3 | 舞台结构 | 主舞台、动作条可见；3 个舞台、9 个对象节点 | DOM selector/count |
| A4 | 时间与输入 | 9 格时间显示；键盘 Tab 首焦点落在可交互控件 | DOM/activeElement |
| A5 | 第一段行动 | `yard → partner → join_marbles` 成功；操作前后主角/NPC 的 `data-pose` 与物件的 `data-state` 确实变化（不把初始非空 `actorStates/propStates` 当作行动证据），并等待演出稳定后再截图 | runtime snapshot + DOM |
| A6 | 动态事件 | 独立干净 context 分别实际选择 `help_search`、`ask_first`、`go_home`；三者均可达、反馈可观察、journal 各只增加一次；先等待选择后的最终舞台，再重新读取稳定 snapshot，`go_home` 的最终舞台确为 `home` | event layer + final runtime snapshot + `mobile-event-{choice}.png` |
| A7 | 第二段行动 | `practice_writing`、`inspect_bicycle` 均执行；actor/prop/NPC 的操作前后 DOM 状态变化；重复行动被拒绝且不改变 snapshot/journal | runtime snapshot + DOM |
| A8 | 断点恢复 | 合法 checkpoint 注入时 `usedTimeSlots=8`；刷新后 stage/time/completed actions/event choices/journal 一致 | checkpoint + snapshot 深比较 |
| A9 | 资源不足 | 8 格状态下 3 格 `set_table` 被禁用，不伪造执行；另以独立干净流程真正执行 `set_table`，验证物件、照护者、时间和 journal，输出 `mobile-home-action.png` | disabled action selector + runtime snapshot + DOM |
| A10 | 损坏降级 | 损坏 checkpoint 被丢弃，回退 `gate`、0 格、无已完成行动；再放回合法 checkpoint 可恢复 | snapshot |
| A11 | 跳过演出 | full/reduced/off 都能完成；动作进行中点击“跳过演出”不会额外写 journal，最终 DOM 反馈、时间和状态仍可继续 | motion modes + journal count + DOM |
| A12 | 截图 | mobile/desktop 初始、事件、行动后、恢复截图，以及三种独立事件选择和独立 home action 截图，均在演出稳定、时间文案与9格 used 状态和快照一致后生成，落在 `artifacts/ui-regression/` | 文件路径 + stable DOM + snapshot |

脚本只使用运行时状态、DOM 可观察条件和动画结束条件的 25ms 轮询；不使用固定 sleep。每次截图前都会等待 `document.getAnimations()` 没有 running/pending 动画，并核对 `放学后 ${剩余格数*5} 分钟` 与 `.time-slots i.used` 数量。

## 运行时只读 API 契约

脚本兼容以下任一只读入口：`getSnapshot()`、`snapshot()`、`getState()` 或只读 `snapshot/state` 属性。快照至少应能提供：

```text
stageId
focusedNodeId
usedTimeSlots
completedActionIds
eventChoiceIds
actorStates
propStates
commandJournal / journal
```

若正式入口没有 `data-ready=true` 或上述 API，脚本会输出具体 selector/API 阻断并以失败退出；这不是 QA 通过。

## 人工验收（自动化不能替代）

自动脚本不能证明可玩性、节奏和情绪反馈。G1 退出前仍需 5–8 名目标玩家进行探索性盲测，至少观察：

- 玩家是否知道“点击对象 → 动作条”的入口，而不是把页面当档案阅读。
- 玩家是否能在不看说明的情况下理解三舞台、9 格时间和事件反馈。
- 玩家是否注意到行动改变了人物姿态、物件状态和身边人的反应。
- 玩家是否愿意在第一次行动后继续尝试第二个对象，而不是立即退出。
- full/reduced/off 三种动态模式是否都保持反馈清楚，跳过不会让玩家怀疑状态丢失。

盲测结果须记录完成率、首次行动耗时、事件理解率、重复点击率、退出点和一句话复述；自动 JSON 通过不能替代这组证据。G1 也尚未进行 20–30 人封闭测试或公开测试。
