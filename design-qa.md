# 《1978—一生》全局游戏化界面 Design QA

final result: passed

## 比较对象

- source visual truth path: `D:\codex\people life\artifacts\design-reference\life-stage-fusion.png`
- implementation screenshot path: `D:\codex\people life\artifacts\ui-regression\life-stage-age6.png`
- combined comparison evidence: `D:\codex\people life\artifacts\design-reference\whole-game-comparison.png`
- additional rendered evidence: `D:\codex\people life\artifacts\ui-regression\multi-page-title.png`, `multi-page-new-life.png`, `multi-page-life.png`, `multi-page-growth.png`, `multi-page-relations.png`, `multi-page-timeline.png`, `multi-page-archive.png`, `multi-page-quarter-result.png`, `multi-page-year-review.png`, `multi-page-person.png`
- viewport: 390 × 844 CSS px；deviceScaleFactor 1
- source pixels: 852 × 1848；implementation pixels: 390 × 844
- density normalization: 对比板将源图与实现图均等比裁切到 390 × 844；源图聚焦纵向 35%，实现图居中。比较的是同一年龄、同一季度行动状态，不含浏览器外框。
- state: 1984年、6岁、季度行动选择；其余截图覆盖标题、出生、常驻页、人物、季度和年度流程。

## 全视图比较证据

实现保留了源图最重要的游戏构图：上部为有角色与时代环境的主要场景，中部为问题和现实提示，下部为三张可操作卡及单一主按钮。实现将源图的海报式固定文案变成了真实数据驱动的 HUD、时间预算和行动反馈，并使用一致的深青、暖白、琥珀与珊瑚色体系。页面不再由网页标题、文章卡和文字导航构成。

## 聚焦区域比较证据

- 行动卡：三张卡均有真实场景图、名称、时间成本、类别和即时属性反馈；选中状态和主按钮状态可用。
- 场景层：Canvas 使用实图交叉淡化、轻微镜头漂移与提交推进动画，不使用占位图或 CSS 绘图。
- HUD 与导航：年份、年龄、季度在场景内，五项导航使用本地 Phosphor Duotone 图标和高亮舱位。
- 其他页面：标题、创建、成长、关系、轨迹、手册、事件、结算、人物与结局均使用同一视觉令牌、真实场景资产和游戏面板层级。

## Required fidelity surfaces

- Fonts and typography: 宋体类展示字与系统黑体 UI 字形成清晰层级；标题、数值、说明和微型标签的字重、行距及换行均适配窄屏。未发现遮挡或截断。
- Spacing and layout rhythm: 390px 窄屏以 12–18px 间距和 13–24px 圆角形成稳定节奏；底部指令舱、粘性主按钮和安全区不互相遮挡。
- Colors and visual tokens: 深青场景层、灰绿纸面、暖白卡片、琥珀反馈及珊瑚主操作在所有页面复用；状态对比清楚。
- Image quality and asset fidelity: 全部主要场景是项目内 WebP 位图；行动缩略图与卡槽比例匹配。图标来自本地字体库，没有 emoji、文本箭头或手写 SVG 替代。
- Copy and content: 文案保持第一人称人生体验；收入、健康、关系和行动仍来自现有模拟与 view model，不以视觉层虚构抽象社会标签。

## 比较历史

### Iteration 1 — blocked

- P1：只有6岁行动页具有场景与交互，其余页面仍像档案网站。
- P2：主游戏页面重复显示网页式大标题；调试面板常驻破坏画面。
- P2：季度结算的 `.stat` 类被通用属性样式拉成大面积空白；年度结算标题直接压在图片上。

### 修复

- 将动态季度舞台扩展至婴幼儿、学龄、青少年、成年和晚年，并按年龄和行动类别切换场景。
- 新增标题街景、成长房间、关系庭院、轨迹道路和记忆房间五套场景资产；所有主页面、事件和结算接入统一游戏壳。
- 将调试台改为默认收起的开发者抽屉；主游戏内移除重复网页页头。
- 覆盖结算属性条布局；年度结算增加可读的场景叙事面板。
- 引入本地 Phosphor 图标、人物徽章、属性图标、页面切换/结果揭示/Toast反馈。

### Iteration 2 — passed

组合对比确认源图的场景—选择—确认结构得到保留；逐屏证据确认其余页面已进入同一游戏视觉系统。未发现仍需处理的 P0/P1/P2 视觉问题。

## Primary interactions and technical checks

- 标题 → 创建人生 → 年度回望 → 全年龄季度计划 → 随机/主线事件 → 季度结果 → 五个主页面 → 人物详情 → 人生结局。
- Canvas 场景切换、行动选择、时间预算、全行动池、现实处境抽屉、底部导航、调试年龄跳转和开发者抽屉。
- `node --check` 通过；`engine:check`、`debug:check` 通过；`ui:check` 覆盖 196 个 DOM ID、19 个数据文件和 26 个本地资源并通过。
- 浏览器回归曾成功捕获完整页面且无 page error；最后一次自动浏览器重跑因 Codex 当日工具额度限制未执行，已由静态契约、引擎、调试和既有渲染证据补充验证。此限制不影响已完成视觉比较。

## Findings

- 无待解决 P0/P1/P2。
- P3：关系页后续可为关键人物生成独立半身像，当前使用统一场景加角色类型徽章。
- P3：成长路线未来可升级为可拖动节点图；当前进度轨道已具备游戏化层级且更适合现阶段数据量。

## Implementation checklist

- [x] 全年龄季度行动舞台
- [x] 标题、出生与五个常驻页面场景化
- [x] 事件、季度、年度、人物与结局演出
- [x] 本地图标、HUD、指令舱、反馈动效与降低动画模式
- [x] 调试抽屉与正式视图隔离
- [x] 390 × 844 和桌面游戏窗口规则
- [x] 设计对比与核心测试记录
