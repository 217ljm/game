# 《1978—一生》简易美术与动画规范

状态：第一版已决定。  
目标：让文字选择具有“正在生活”的感觉，同时保持轻量、可读、低成本和跨端可迁移。

## 1. 美术方向

采用“时代生活剪贴簿”风格：旧纸、印刷色、手绘线条、少量生活物件与半写实剪影。它比写实人物立绘更适合跨越几十年，也避免大量角色需要保持面部连续性的制作负担。

视觉层级：

1. 文字和选择永远是主信息；
2. 场景美术负责地点、年代和气氛；
3. 人物图形负责“谁在这里”；
4. 动画负责确认变化和时间流动；
5. 装饰不能遮挡条件、所得、代价和真实数值。

## 2. 素材类型

| 类型 | 格式 | 用途 |
| --- | --- | --- |
| UI 图标、线框、印章 | SVG | 可变色、不同分辨率保持清晰 |
| 纸张纹理 | 小尺寸 WebP | 全局低透明度平铺 |
| 年代背景 | WebP，横竖安全裁切 | 家庭、学校、街道、工厂、宿舍等 |
| 人物剪影/半身 | 透明 WebP 或分层 SVG | 复用姿态与服装配件 |
| 关键事件插图 | WebP | 只给重要节点，不给每条普通事件 |
| 小型氛围特效 | SVG/CSS | 灯光、雨、尘埃、纸片、印章 |

发布素材目录：

```text
public/assets/
  manifest.json
  ui/
  textures/
  scenes/
    home/
    school/
    street/
    work/
    hospital/
  characters/
    silhouettes/
    clothing/
    props/
  events/
  fx/
art-source/
  editable/
  prompts-and-provenance/
```

`art-source` 保存原稿、生成提示、许可和修改记录；发布时只复制压缩后的素材。代码只能通过素材 ID 查找 manifest，不能散落硬编码路径。

## 3. 素材 Manifest

```json
{
  "version": "art-1",
  "assets": {
    "scene.home.rural.1980s.morning": {
      "type": "scene",
      "src": "/assets/scenes/home/rural-1980s-morning.webp",
      "focalPoint": [0.62, 0.45],
      "palette": "ochre-green",
      "motionPreset": "ambient-window-light"
    }
  }
}
```

事件和人物数据只保存 `assetId`。没有对应素材时必须正常回退到纯文字和通用背景。

## 4. 第一批美术范围

先做足以覆盖玩法的“小集合”，不追求每个事件一张图：

- 通用家庭室内：农村、城镇各1张；
- 学校：教室、操场各1张；
- 街道/邻里：1张；
- 工作环境：车间、办公室、商店各1张；
- 医疗/休息：1张；
- 6种人物基础剪影，每种3套年龄或服装变化；
- 5张0～18岁主线兑现事件插图；
- 年度结算印章、季度纸页、关系线和属性变化4组UI效果。

普通季度复用场景背景和人物剪影；只有人生主线、升学、第一份工作、伴侣、孩子、住房、退休和结局等重要节点使用独立插图。

## 5. 场景合成

`SceneBackdrop` 使用三层即可形成轻微空间感：

1. 背景层：房间、学校或街道；
2. 人物/物件层：剪影、桌椅、窗框等；
3. 氛围层：光线、雨、尘埃或纸张颗粒。

只对 `transform` 和 `opacity` 做缓慢动画，避免重绘型滤镜。移动幅度保持在4～10px，不能造成玩家阅读时背景晃动。

## 6. 动画语言

动画分为三个等级：

| 等级 | 例子 | 默认时长 |
| --- | --- | --- |
| ambient | 背景光线、纸张颗粒、人物呼吸 | 4～12秒循环，极小幅度 |
| feedback | 选项按下、属性变化、人物关系变化 | 160～550ms |
| transition | 季度结算、年份推进、章节完成 | 450～900ms |

第一批动画预设：

- `page-enter`：页面上移8px并淡入；
- `choice-press`：卡片压下2px，边框短暂加深；
- `choice-resolve`：选中路线上浮，未选道路退到档案；
- `ink-reveal`：关键事件标题像印刷墨迹一样显现；
- `stat-delta`：属性值只显示一次增减浮签，不滚动抽奖；
- `relationship-thread`：人物关系变化时短暂画出连接线；
- `quarter-stamp`：季度结算盖章；
- `year-page`：年度推进以单张纸页翻过，不做复杂3D；
- `chapter-complete`：章节标题、年份和三个真实证据依次出现；
- `ending-settle`：画面逐渐静止并显示一生复盘。

## 7. Motion Director

组件不自行决定重要动画。`MotionDirector` 只消费 presentation 层提供的 cue：

```ts
interface MotionDirector {
  play(cues: PresentationCue[], context: MotionContext): Promise<void>;
  skip(): void;
  setLevel(level: "off" | "reduced" | "full"): void;
}
```

执行顺序：

```text
玩家提交命令 → 引擎结算并保存 → 页面收到新 ViewModel
→ Motion Director 播放可跳过表现 → 玩家继续操作
```

动画失败、素材加载失败或玩家刷新时，界面直接显示结算后的状态。

## 8. 可访问性和性能

- 遵守 `prefers-reduced-motion`，并在游戏设置中提供“关闭/减少/完整”；
- 关键文字不依靠运动才能读取；
- 动画期间不能永久锁住继续按钮，最长900ms后自动释放；
- 背景图片提供焦点位置，窄屏按焦点裁切；
- 首屏只加载当前场景，下一关键场景空闲预加载；
- 装饰素材失败时使用颜色、纹理和文字回退；
- 同时活动的 ambient 动画不超过3个；
- 主要动画使用 `transform`、`opacity`，动态控制使用 Web Animations API；
- 浏览器回归分别覆盖完整动画与 reduced motion。

## 9. 不采用的方案

- 不用人物全身骨骼动画：制作量与文字玩法收益不匹配；
- 不给每季度生成新插图：难以保持年代、人物和画风一致；
- 不用纯照片做主要角色：人物跨年龄连续性弱，也容易与虚构角色混淆；
- 不让动画改变随机数或延迟存档：视觉表现不得成为模拟条件；
- 不在第一阶段加入复杂天气、地图移动和实时小游戏。

## 10. 第一轮实现验收

- `manifest.json` 可以校验全部素材 ID；
- 纯文字回退完整可玩；
- 页面进入、选择确认、属性变化、季度盖章、年份推进5类动画可用；
- 0～18岁五个关键事件有场景或插图映射；
- 动画可以立即跳过；
- reduced motion 下无持续移动背景；
- 390px手机宽度、低速加载和素材404时无阻断；
- 动画不改变专项模拟测试的任何 JSON 结果。

## 11. 官方参考

- Web Animations API：https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API
- 使用 Web Animations API：https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Using_the_Web_Animations_API

