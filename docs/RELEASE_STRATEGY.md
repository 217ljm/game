# 《1978—一生》发布策略

状态：主平台已决定。

## 最终主发布平台

**TapTap H5 小游戏。**

选择原因：

1. TapTap 官方支持普通小游戏和 H5 小游戏；当前 Vue/Vite 客户端可以直接构建为 H5，不需要为了首发重写成 Canvas 游戏；
2. 即点即玩适合文字人生，不需要玩家先下载大型包体；
3. TapTap 用户本身具有游戏消费和评价意愿，比单独发一个网址更容易获得有效玩家反馈；
4. 官方提供首页、排行榜、编辑推荐和“玩游戏/即点即玩”专区等小游戏曝光入口；
5. 认证开发者支持个人主体，适合学生个人开发者；
6. 后续可以在不改变模拟核心的情况下增加云存档、分享和广告；
7. 如果游戏验证成功，同一项目仍可继续生成 Android、独立 iOS App 或桌面版本。

TapTap H5 小游戏本身同时覆盖 TapTap 的 iOS 和 Android 客户端。iPhone 玩家可以即点即玩，只是第一阶段不会在苹果 App Store 里出现一个独立下载图标。

## 发布层级

### 1. 开发版本

- 本地地址和 PWA；
- 只用于开发、调试和小范围链接测试；
- 不把自建网页当作最终获客渠道。

### 2. TapTap 预约与测试

- 先建立游戏详情页；
- 发布“敬请期待/预约”；
- 上传竖屏实机截图、录屏和开发日志；
- 使用小规模测试验证季度循环、留存、存档和设备兼容。

### 3. TapTap H5 小游戏主版本

- 采用竖屏即点即玩；
- 第一版免费、无内购；
- 平台只负责账号、防沉迷、云存档、分享和生命周期适配；
- 模拟、内容、存档格式和动画仍由本项目控制；
- 先完成正式要求的小游戏前置备案和审核材料。

### 4. 后续独立应用

- 玩家数据证明值得扩展后，再用 Capacitor 分别生成 Android APK 和独立 iOS App；
- iOS 版本通过 TestFlight 测试并提交 App Store 审核；
- PC 排版、键鼠体验和内容量达到要求后，再考虑 Steam；
- Steam 不是第一次正式发布平台。

## 个人开发者需要准备

TapTap 认证开发者支持个人主体。官方当前列出的个人资料包括开发者姓名、常用地址、身份证正反面、邮箱和已验证手机号。正式发布小游戏前还需要完成小游戏前置备案。

只提供小游戏游玩方式时，TapTap 文档说明未成年人防沉迷由平台默认承接。无内购小游戏不以付费为首发目标；任何内购计划都必须重新核对版号、支付和当时审核要求，不能先做收费再补资质。

宣发素材至少提前准备：

- 1920×1080 横版宣传图；
- 1440×1440 方形宣传图；
- 至少3张不低于1280×720的实机截图；
- 竖屏实机视频建议9:16、720×1280以上；
- 游戏图标、简介、隐私说明和全部游戏文本审核稿。

## 技术发布结构

```text
packages/core + content + presentation
                 │
          apps/web（开发/PWA）
                 │ 复用构建
          apps/taptap-h5
                 │
      TapTap 登录 / 云存档 / 分享 / 生命周期
```

`apps/taptap-h5` 只能实现平台接口。任何 TapTap API 缺失时，游戏必须退化到本地存档和普通分享提示，而不是中断人生模拟。

## 不作为首发主平台

- 独立网址：适合测试，没有稳定自然分发；
- 微信小游戏：需要单独适配和另一套平台审核，不让它延误第一版；
- Steam：个人可以申请，但有每个产品100美元 Steam Direct 费用、身份/银行/税务资料和至少30天等待期；适合内容成熟后的PC版；
- App Store 独立版：不是首发必需；个人开发者可加入 Apple Developer Program，但当前年费为99美元，并需要 macOS/Xcode、签名、TestFlight 和 App Store 审核；
- Android 各应用商店：首发同时维护多个渠道包和审核，个人开发阶段成本过高。

## 官方参考

- TapTap 小游戏介绍：https://developer.taptap.cn/minigameapidoc/quick-start/guide/minigames-intro/
- TapTap 小游戏文档指引：https://developer.taptap.cn/minigameapidoc/quick-start/document-guide/
- 创建小游戏与资质：https://developer.taptap.cn/minigameapidoc/quick-start/guide/creation-improvement/
- 个人开发者认证：https://developer.taptap.cn/minigameapidoc/quick-start/guide/registration-login/
- 宣发物料：https://developer.taptap.cn/minigameapidoc/quick-start/guide/game-publish/material/
- Steam Direct：https://partner.steamgames.com/steamdirect
- Apple Developer Program：https://developer.apple.com/programs/
