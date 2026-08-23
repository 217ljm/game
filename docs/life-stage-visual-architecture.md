# 6岁入学季度：视觉与运行架构

## 目标

这个切片把原有“档案卡片 + 文本按钮”升级为混合渲染游戏界面，同时不复制或改写模拟规则：

- Canvas 2D 只负责真实位图场景的分层合成、镜头漂移、主角呼吸和场景交叉淡化。
- DOM 负责行动按钮、时间预算、无障碍状态、调试入口和真实数据绑定。
- `submitLifeChoice` 仍是唯一的行动提交入口；属性、兴趣、成长线、随机事件和季度延续继续由模拟引擎结算。
- 当前仅在 6 岁季度计划节点启用，后续年龄段通过新增场景包与行动到场景的映射复用。

## 视觉规范

- 布局：沿用视觉方案 1 的“主场景 + 三张推荐行动卡 + 全宽主按钮”。
- 配色：采用视觉方案 3 的雨洗蓝绿、石板蓝、鲜叶绿、暖琥珀光和珊瑚红。
- 年代感：由 1984 年校舍、木桌、衣着、搪瓷器皿和自行车表达；避免整页泛黄、仿旧纸张和档案式排版。
- 动效：只动画 `transform`、`opacity` 与 Canvas 位图采样；设备像素比上限为 2，并在页面不可见时停帧。
- 无障碍：行动使用原生按钮与 `aria-pressed`；支持 `prefers-reduced-motion`。

## 美术资产

| 文件 | 用途 | 生成方式 |
| --- | --- | --- |
| `public/assets/life-stage/primary-1984-base.webp` | 雨后小学主场景 | ImageGen 内置模式，转 WebP |
| `public/assets/life-stage/player-1984.webp` | 可独立动画的 6 岁主角 | ImageGen 洋红背景，色键去除后保留透明通道 |
| `public/assets/life-stage/action-study.webp` | 学习类行动演出与卡面 | ImageGen 内置模式，转 WebP |
| `public/assets/life-stage/action-play.webp` | 玩耍/同伴类行动演出与卡面 | ImageGen 内置模式，转 WebP |
| `public/assets/life-stage/action-family.webp` | 家庭类行动演出与卡面 | ImageGen 内置模式，转 WebP |

压缩后五项运行时素材约 1.2 MB。选定的融合参考稿保存在 `artifacts/design-reference/life-stage-fusion.png`。

## Prompt set

所有图像均以选定融合稿为参考，核心约束如下：

1. 主场景：1984 年中国公立小学、春季雨后、儿童视角、木桌与校门、自行车和远处同学；前景留出主角合成空间；禁止 UI、边框、标牌和可读文字。
2. 主角：6 岁中国男孩、褪色蓝色棉布外套、浅色衬衣、深蓝长裤、布鞋、铅笔与练习本；完整全身、简洁发丝边缘、纯洋红背景，便于色键提取。
3. 学习：同一主角在放学后的木桌前练习，远处教师与雨后校园；构图可同时用于卡面和主场景。
4. 玩耍：同一主角与两名同学在雨后校园玩玻璃弹珠；强调动作、友谊和湿地反光。
5. 家庭：同一主角在朴素家中完成符合年龄的小任务，摆放碗筷，家人在背景做饭；强调连接和成就感，而非惩罚。

统一风格词：polished cinematic storybook illustration、tactile painted detail、rain-washed teal/slate shadows、fresh leaf green、warm amber light、restrained coral accents、subtle 1980s patina、not sepia、not documentary。

## 复用接口

- `LifeStageRenderer.setScene(scene)`：切换实际位图场景，支持 `base/study/play/family`。
- `LifeStageRenderer.playCommit()`：播放提交前的镜头推进，并等待动效完成。
- `lifeStageSceneFor(option)`：把真实行动语义映射到场景，不把数据类别当成唯一依据。
- 新年龄段应新增独立素材清单与语义映射；不要在 Canvas 内画占位人物或图标。
