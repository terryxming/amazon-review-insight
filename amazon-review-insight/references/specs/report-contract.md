# Report Contract

report_contract_version: v0.2.0

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

每个关键结论卡片必须包含：

- 一句话总结，用于快速理解该维度。
- 类型分布表，用于穷举该维度下的主要、次要、新兴和长尾类型。
- 提及数量和占比，分母为 Review 样本数。
- 判断依据和代表性 evidence。
- 对产品改进、Listing 优化或图片/视频优化的业务含义。

类型分布表的边界：它回答“这个洞察维度内部由哪些类型构成”，不替代 VOC 主题地图。VOC 主题地图回答“哪些跨维度问题或机会需要被业务处理”。

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
- 关键结论只有一句话总结但没有类型分布。
- 无 evidence 的关键结论。
