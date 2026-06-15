---
name: amazon-review-insight
description: 使用 Sorftime MCP 分析 Amazon US 单个 ASIN 的 Review，生成中文 VOC 决策 HTML 报告。适用于需要从评论中提炼用户洞察、产品优化、Listing 优化、图片/视频优化、证据高亮、Review 健康度、VOC 主题地图和业务动作清单的任务。
---

# Amazon Review Insight

skill_version: v0.1.0

用这个 skill 把 Amazon US 单个 ASIN 的 Review 转成中文 VOC 决策报告。当前 Codex/code agent 负责语义理解、开放编码、主题归因和业务动作生成；脚本只负责确定性的解析、统计、契约检查、报告渲染、缓存清理和密钥扫描。

## 固定边界

1. 只支持 Amazon US。
2. 只支持单个 ASIN。
3. 只使用 Sorftime MCP 抓取 `product_detail` 和 `product_reviews`。
4. 不做本地 Web 工作台。
5. 不接外部 LLM provider。
6. 不做多 ASIN、竞品对比、CSV、XLSX 或 PDF 导出。
7. 输出中文自包含 `.html` 报告。
8. 主报告页只展示短证据；VOC 主题详情页展示完整 Review 原文、完整中文翻译和黄色高亮。
9. 不展示完整 Review 编码明细。
10. 不得写入、缓存、打印或渲染 Sorftime key。

## 渐进式披露

只读取当前阶段需要的引用文件：

- 调用 Sorftime MCP 前，读取 `references/specs/sorftime-contract.md`。
- 解析和规范化数据前，读取 `references/specs/data-contract.md`。
- 生成 Review 编码、VOC 主题或业务动作前，读取 `references/specs/analysis-rules.md`。
- 生成 HTML 报告前，读取 `references/specs/report-contract.md`。
- 遇到缺失或模糊信息时，读取 `references/specs/user-confirmation-rules.md`。
- 修改报告行为前，读取 `references/features/report-generation.feature`。
- 修改缺失信息处理前，读取 `references/features/user-confirmation.feature`。

## 工作流

1. 校验用户只提供一个合法 ASIN；站点固定为 Amazon US。
2. 使用 Sorftime MCP 调用 `product_detail` 和 `product_reviews`，参数 `amzSite=US`，`reviewType=Both`。
3. 将 Sorftime 中文字段规范化为标准 Review 对象，并保留原始字段到 `raw`。
4. 当前 agent 逐条阅读 Review 原文，拆成 `feedback_units[]`。
5. 当前 agent 用开放标签聚合 `feedback_units[]`，生成 `voc_themes[]`。
6. 当前 agent 从 `voc_themes[]` 生成 `business_actions[]`。
7. 运行确定性脚本计算 Review 健康度、占比、检查点和契约校验。
8. 使用 `assets/report/` 中经 Product Design 确认的样式资产渲染中文 HTML。
9. 交付前运行契约检查、密钥扫描和可用测试。

## 核心口径

1. Sorftime `product_detail` 字段 `评论数` 展示为 ASIN 总评论数量。
2. ASIN 总评论数量只作为产品规模背景，不得作为 VOC 分母。
3. Review 样本数等于 `product_reviews` 实际返回条数。
4. 所有 VOC 主题、关键结论和业务动作的百分比分母必须使用 Review 样本数。
5. 评论没有表达的信息必须写 `unknown`。
6. 非 `unknown` 字段必须有 Review 原文 evidence。
7. 不得根据标题、价格、品牌、类目、Listing 文案或星级单独推断 Review 未表达的信息。

## 报告结构

HTML 报告必须包含：

1. 数据范围与口径。
2. Review 健康度。
3. 关键结论，且必须覆盖人群、场景、用户任务、购买理由、用户期望、实际体验、满意点、不满意点。
4. VOC 主题地图。
5. VOC 主题详情页。
6. 机会矩阵与业务动作清单。
7. 限制说明与 checkpoint 状态。

VOC 主题卡片必须能跳转到同一个 HTML 内的主题详情页。详情页展示该主题相关完整 Review 原文、完整中文翻译，并对原文和译文中支撑主题的词、词组或短句使用黄色高亮。

## 脚本

在仓库根目录运行：

```bash
npm install
npm run typecheck
npm test
npm run render -- <analysis.json> <report.html>
npm run contract:check -- <analysis.json> <report.html>
npm run secret:scan -- <path>
npm run cache:clear
```

真实 Sorftime smoke 使用固定 ASIN `B0DHPN1DMJ`，只在配置好 Sorftime MCP 的发布前环境执行。

## 交付门禁

1. `SKILL.md` frontmatter 只包含 `name` 和 `description`。
2. `skill_version` 与 release 版本一致。
3. SDD specs、BDD features、checkpoints、tests、evals 必须存在。
4. 契约检查通过。
5. 样例 HTML 使用真实 Sorftime 数据生成并可打开。
6. Product Design 视觉 QA 通过。
7. secret scan 不得发现 Sorftime key、运行时 token 或环境变量值。
