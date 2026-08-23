# 内容数据规范

## 1. 设计目标

事件、出身、属性和结局使用 JSON 配置，程序不硬编码剧情。策划只需修改数据文件，就能添加新事件。

所有标识符采用小写英文和下划线，例如 `first_salary`。所有显示给玩家的内容使用简体中文。

## 2. 全局配置

`data/game_config.json` 包含：

- `stats`：属性定义和初始值。
- `origins`：随机出身及其属性修正。
- `stages`：年龄对应的人生阶段。
- `round`：单局年龄和事件数量限制。
- `endingRules`：按优先级匹配的结局。

结局从高到低检查 `priority`，匹配到第一条规则即停止。没有规则匹配时使用 `fallbackEndingId`。

## 3. 事件结构

```json
{
  "id": "first_salary",
  "title": "第一份工资",
  "text": "工资到账的那天，你盯着余额看了很久。",
  "minAge": 20,
  "maxAge": 28,
  "yearsPassed": 4,
  "weight": 100,
  "once": true,
  "tags": ["career", "money"],
  "requirements": {
    "allFlags": [],
    "noneFlags": [],
    "minStats": {},
    "maxStats": {}
  },
  "choices": [
    {
      "id": "save",
      "text": "先存下一半",
      "effects": { "wealth": 8, "happiness": -2 },
      "addFlags": ["saving_habit"],
      "removeFlags": []
    }
  ]
}
```

## 4. 字段约定

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| `id` | 字符串 | 全局唯一，发布后不要修改 |
| `minAge` / `maxAge` | 整数 | 当前年龄必须在闭区间内 |
| `yearsPassed` | 整数 | 选择后统一推进的年龄，必须大于 0 |
| `weight` | 整数 | 候选事件的随机权重，必须大于 0 |
| `once` | 布尔值 | 为真时每局最多出现一次 |
| `requirements` | 对象 | 事件级触发条件 |
| `effects` | 对象 | 未填写的属性视为变化 0 |
| `addFlags` | 字符串数组 | 选择后添加的状态标记 |
| `removeFlags` | 字符串数组 | 选择后移除的状态标记 |

所有属性变化后必须限制在 0～100，不能溢出。

## 5. 条件结构

- `allFlags`：必须拥有其中所有标记。
- `noneFlags`：不能拥有其中任何标记。
- `minStats`：属性不得低于指定值。
- `maxStats`：属性不得高于指定值。

首版只使用“全部满足”的条件，不加入 OR 嵌套，以保持编辑和测试简单。

## 6. 内容编写规则

- 正文尽量控制在 20～60 个汉字。
- 每个选项尽量控制在 4～12 个汉字。
- 选项要表达态度或行动，避免“选项A/选项B”。
- 单次属性变化通常控制在 -12～+12。
- 两个选择都应有合理代价，避免明显的唯一正确答案。
- 重要事件通过 flag 影响后续事件，而不是堆叠大量隐藏属性。
