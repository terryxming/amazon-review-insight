# Changelog

## v0.3.0

- VOC 主题地图升级为 `主题卡片 + 主题内观点分布 + 观点详情页`。
- `voc_themes[]` 新增 `viewpoints[]`，每个观点包含提及数量、样本数、占比、角色、极性、判断依据、业务含义和全量详情评论。
- HTML 报告中 VOC 主题卡片新增观点分布表；点击观点会在新标签页打开同一 HTML 内的观点详情页，当前主报告页不滚动跳转。
- 观点详情页顶部 sticky 展示所属 VOC 主题卡片，下方展示该观点相关全量 Review 原文、完整中文翻译和黄色高亮。
- Excel 新增 `VOC主题观点` 和 `VOC观点评论明细` sheet。
- 契约检查新增 VOC viewpoint、观点详情评论、观点高亮、HTML sticky 卡和 Excel 新 sheet 校验。

## v0.2.1

- 优化 `Review编码层` Excel 可读性：一行只解释一个 feedback unit，前置展示 `原Review序号`、`反馈点序号`、`本行反馈点`、`本行反馈极性`、`本行开放标签`、`关联主题ID` 和 `证据原文`。
- 将整条 Review 的人群、场景、用户任务、购买理由、用户期望、实际体验、满意点、不满意点汇总字段后置，并统一加 `整条Review-` 前缀，避免和本行 feedback unit 混淆。
- 契约检查新增 v0.2.1 可读字段要求，防止 Excel 回退到难读结构。

## v0.2.0

- 关键结论升级为“一句话总结 + 类型分布表”，覆盖人群、场景、用户任务、购买理由、用户期望、实际体验、满意点、不满意点。
- 新增 Review 编码层 Excel 导出，包含 `normalized_reviews`、`feedback_units`、`open_tags`、`key_insight_distribution`、`voc_themes`、`business_actions`、`checkpoints` 等 sheet。
- 契约检查新增关键结论分布校验和 Excel 工作簿校验。
- HTML 报告关键结论卡片新增分布表、角色标签和提及占比条。
- 密钥扫描支持 `.xlsx` 单元格内容。
- 更新 SDD specs、BDD features、checkpoints、evals、README 和样例分析数据。

## v0.1.0

- 初始 Codex agent skill。
- 支持 Amazon US 单 ASIN Review VOC 决策分析。
- 使用 Sorftime MCP 的 `product_detail` 和 `product_reviews`。
- 输出中文自包含 HTML 报告。
- 增加 Review 编码、VOC 主题地图、主题详情页、业务动作清单、Product Design 样式资产、tests、checkpoints、evals 和辅助 CLI。
