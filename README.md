# Amazon Review Insight

`amazon-review-insight` 是一个 Codex agent skill，用于分析 Amazon US 单个 ASIN 的 Review，并生成中文 VOC 决策 HTML 报告和 Review 编码层 Excel。

它通过 Sorftime MCP 获取 `product_detail` 和 `product_reviews`，由当前 Codex/code agent 完成 Review 开放编码、VOC 主题归因和业务动作生成，脚本负责确定性解析、统计、契约检查、报告渲染、Excel 导出、缓存和密钥扫描。

## 范围

- 只支持 Amazon US。
- 只支持单个 ASIN。
- 输出中文自包含 `.html` 报告。
- 输出全量 Review 编码层 `.xlsx`，用于人工复核和二次分析。
- 不做本地 Web 工作台。
- 不接外部 LLM provider。
- 不做多 ASIN、竞品对比、CSV 或 PDF。

## 安装与开发

```bash
npm install
npm run typecheck
npm test
```

## 常用 CLI

```bash
npm run render -- <analysis.json> <report.html>
npm run export:excel -- <analysis.json> <review-coding.xlsx>
npm run contract:check -- <analysis.json> <report.html> [review-coding.xlsx]
npm run secret:scan -- <path>
npm run cache:clear
npm run live:smoke -- B0DHPN1DMJ
```

## 数据口径

- ASIN 总评论数量 = Sorftime `product_detail` 字段 `评论数`。
- Review 样本数 = `product_reviews` 实际返回条数。
- VOC 百分比、关键结论百分比、业务动作百分比分母只能使用 Review 样本数。
- 关键结论必须同时给一句话总结和类型分布表；类型之间允许重叠。
- Review 编码层必须覆盖全部 Review 样本，`normalized_reviews` 行数应等于 Review 样本数。
- Excel sheet 名和字段名使用中文；`原始评论` 与 `Review编码层` 的前五列固定为 `ASIN`、`评论日期`、`星级`、`title`、`text`。

## 样例报告

v0.2.0 sample report 使用真实 Sorftime 数据摘要生成，默认测试 ASIN 为 `B0DHPN1DMJ`。样例报告和样例 Excel 不得包含 Sorftime key、环境变量值或运行时 token。

- `samples/B0DHPN1DMJ-sample-input.json`：真实 Sorftime 运行的输入摘要。
- `samples/B0DHPN1DMJ-sample-analysis.json`：agent 分析后的样例输出 JSON。
- `samples/B0DHPN1DMJ-sample-report.html`：中文自包含 HTML 样例报告。
- `samples/B0DHPN1DMJ-review-coding-v0.2.0.xlsx`：Review 编码层 Excel 样例。

`live:smoke` 是发布环境预检；真实 Sorftime MCP 调用由安装了该 skill 的 Codex agent 按 `SKILL.md` 工作流执行。
