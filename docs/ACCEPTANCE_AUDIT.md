# 逐岁正式版本验收审计

本文件把产品总目标拆成可由当前工作树证明的验收项。这里只验收本地单机文字人生版本，不把平台 SDK、账号、广告、支付或正式上线资质混入核心玩法完成标准。

## 需求与证据

| 验收项 | 当前实现 | 权威证据 |
| --- | --- | --- |
| 年龄从 0 岁开始，每次只增加 1 岁 | 每个自然年先完成 Q1～Q4，再处理同岁关键事件并停在年度结算；确认后才进入下一岁 | `stage_based_quarterly_interaction_cadence`、`four_quarter_records_per_completed_year` 与 `year_review_before_time_advances` |
| 每岁都有合理的本人视角 | 0 岁自动记录感知经历；1～2 岁只回应眼前事物；3 岁后逐步组合本人能做的生活活动；12～59 岁每季一次，60 岁后半年一次 | `infant_first_person_reactions_without_caregiver_control`、91 组状态覆盖与阶段操作量校验 |
| 候选读取现实处境 | 条件读取年龄、学业路径、就业状态、具体职业、伴侣/孩子/年长父母、城乡、健康、自然年份、现金和时间 | `region_era_health_job_and_family_context_candidates`、`cash_affordability_constraints` |
| 季度计划有时间和经济约束 | 同季可组合多项学习、娱乐、交往和生活活动；超时或现金不足不能确认；未分配时间保留；季度成本汇入同年名义人民币账本 | `multi_activity_quarter_plans`、不可执行候选与 `annual_operation_cash_expense_ledger` |
| 点击量可控 | 支持延续一季、维持到年底、跨年自动推进；低龄阶段减少交互，关键节点和条件随机事件才另行打断 | `continue_keep_year_and_notify_only_quarter_automation` 和真实浏览器回归 |
| 兴趣与偶发经历可积累 | 启蒙接触按实际活动时数形成兴趣阶段；事件读取年龄、年代、身份与活动条件，带独立种子和冷却期 | `interest_growth_and_random_life_events`、季度内容配置校验 |
| 出生健康值可解释 | 出生储备分层后总体婴儿风险仍回归 1981 年 37.6‰锚点；成人寿命模型使用新量表参考值，避免全体异常长寿 | `calibrated_birth_health_reserve_distribution`、`stratified_infant_risk_reconciles_to_population_anchor` 与成年批量校验 |
| 事实、五属性和长期因果一致 | 每次行动生成来源事实和属性变化；重复行动在阈值年产生长期回响，并修改后续状态 | `annual_operation_echo`；`npm run causality:check` 的同种子十年对照分支 |
| 未选历程进入复盘 | 所有年度行动和关键事件保存未选项，最终按五阶段汇总 | `whole_life_untraveled_paths_with_labels` |
| 改革开放以来时代环境 | 1978～2025 每年只匹配一个历史时期，政策节点有来源；2026 年后切换为独立情景 | `npm run timeline:check`；成年情景校验 |
| 职业、收入和住房是具体事实 | 岗位含职业、行业、单位性质、工时、工作月份、合同和实际收入；住房含租金、首付、按揭、资产和债务 | 成年与青年批量检查；本年账本和完整年表 |
| 家庭关系与跨代人物连续 | 伴侣关系质量按年变化；父母逐岁变老；孩子从出生经历成长阶段；同学朋友跨阶段保留 | `cross_generation_parent_and_child_facts`、`npm run social:check` |
| 确定性存档与迁移 | 同一种子和选择精确回放；存档 schema v4；旧 v3 单行动、v2 年度计划和 v1 均可迁移 | `json_save_roundtrip_determinism`、`v1_v2_and_v3_save_migration`、浏览器回归 |
| 竖屏界面完整 | 显示年龄、Q1～Q4、多活动时间预算、兴趣、事实、五属性、本年账本、人物、未选道路、自动存档和可展开季度的年表 | `npm run ui:check`；390×844 的 `npm run browser:check` |
| 全生命周期稳定 | 自动与手动模式均能从出生走到死亡；早逝路径也能完成 | `interactive_life_completion`、`automatic_life_determinism`、`early_childhood_death_completion` |

## 发布候选门禁

```powershell
npm run release:check
```

该命令先运行全量数据、批量模拟、配置、因果、引擎和静态页面检查，再用真实无头浏览器完成“0岁自动经历 → 1岁第一人称反应 → 2岁延续控制 → 3岁多活动与兴趣”。浏览器回归截图保存在 `artifacts/ui-regression`。

## 保持明确的边界

- 历史统计只用于群体校准，不把均值直接分配给具体人物。
- 缺少地点、单位、学校或诊断资料时保留未知，不编造名称。
- 2026 年以后是 `SCENARIO_BASELINE_2026_PLUS`，不是历史事实或预测。
- 平台发布、软著、备案、隐私政策和主体资质属于下一阶段发布工程，不影响本地核心玩法验收，但上线前必须另行完成。
