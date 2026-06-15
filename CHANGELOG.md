# Changelog

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
