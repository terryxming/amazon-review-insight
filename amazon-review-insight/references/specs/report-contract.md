# Report Contract

report_contract_version: v0.1.0

## Product Design

HTML 报告视觉样式必须使用 Product Design 插件设计，产物沉淀为：

- `assets/report/design-tokens.json`
- `assets/report/report.css`
- `assets/report/report-layout.md`

`render_report.ts` 只能使用这些资产渲染报告。

## 主报告页章节

1. 数据范围与口径。
2. Review 健康度。
3. 关键结论。
4. VOC 主题地图。
5. 机会矩阵与业务动作清单。
6. 限制说明与 checkpoint 状态。

## 关键结论

必须覆盖八类洞察：人群、场景、用户任务、购买理由、用户期望、实际体验、满意点、不满意点。缺失时写 `unknown`，不得编造。

## VOC 主题详情页

同一个自包含 HTML 内必须提供主题详情视图。每个详情页展示：

- 完整 Review 原文。
- 完整中文翻译。
- 黄色高亮的原文关键词、词组或短句。
- 黄色高亮的中文翻译对应词、词组或短句。

## 禁止项

- 外部 CDN。
- 执行摘要。
- 主报告页展示大段完整 Review。
- 完整 Review 编码明细。
- 无 evidence 的关键结论。

