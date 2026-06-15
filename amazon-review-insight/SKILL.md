---
name: amazon-review-insight
description: 使用 Sorftime MCP 分析 Amazon US 单个 ASIN 的 Review，生成中文 VOC 决策 HTML 报告和 Review 编码层 Excel。适用于需要从评论中提炼用户洞察、产品优化、Listing 优化、图片/视频优化、证据高亮、Review 健康度、VOC 主题地图、关键结论分布和业务动作清单的任务。
---

# Amazon Review Insight

skill_version: v0.3.0

用这个 skill 把 Amazon US 单个 ASIN 的 Review 转成中文 VOC 决策报告，并交付 Review 编码层 Excel。当前 Codex/code agent 负责语义理解、开放编码、主题归因和业务动作生成；脚本只负责确定性的解析、统计、契约检查、报告渲染、Excel 导出、缓存清理和密钥扫描。

## 固定边界

1. 只支持 Amazon US。
2. 只支持单个 ASIN。
3. 只使用 Sorftime MCP 抓取 `product_detail` 和 `product_reviews`。
4. 不做本地 Web 工作台。
5. 不接外部 LLM provider。
6. 不做多 ASIN、竞品对比、CSV 或 PDF 导出。
7. 输出中文自包含 `.html` 报告。
8. 同时输出全量 Review 编码层 `.xlsx`，用于人工复核和二次分析。
9. 主报告页只展示短证据；VOC 主题详情页展示完整 Review 原文、完整中文翻译和黄色高亮。
10. 不得写入、缓存、打印或渲染 Sorftime key。
11. 用户要求分析真实 ASIN 时，禁止使用 `samples/` 下的样例 JSON 代替 Sorftime MCP 实时返回。

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
7. 关键结论必须覆盖八类洞察，并为每类洞察生成 `distribution[]`，穷举该维度下的主要、次要、新兴和长尾类型。
8. 运行确定性脚本计算 Review 健康度、占比、检查点和契约校验。
9. 使用 `assets/report/` 中经 Product Design 确认的样式资产渲染中文 HTML。
10. 导出 Review 编码层 `.xlsx`，Excel sheet 名和字段名必须使用中文；`原始评论` 行数必须等于 `metadata.review_sample_size`，`Review编码层` 必须覆盖每条 Review 的编码记录。
11. 交付前运行契约检查、密钥扫描和可用测试。

## 核心口径

1. Sorftime `product_detail` 字段 `评论数` 展示为 ASIN 总评论数量。
2. ASIN 总评论数量只作为产品规模背景，不得作为 VOC 分母。
3. Review 样本数等于 `product_reviews` 实际返回条数。
4. 所有 VOC 主题、关键结论和业务动作的百分比分母必须使用 Review 样本数。
5. 关键结论分布的 `review_count/percentage` 分母必须使用 Review 样本数；类型之间允许重叠，因为同一 Review 可表达多个类型。
6. `normalized_reviews` 必须覆盖 Sorftime MCP 返回的全部 Review 样本；不得只放 VOC 详情页中的代表性 Review。
7. 每条 `normalized_reviews` 至少要有一条对应 `feedback_units` 编码记录。
8. 评论没有表达的信息必须写 `unknown`。
9. 非 `unknown` 字段必须有 Review 原文 evidence。
10. 不得根据标题、价格、品牌、类目、Listing 文案或星级单独推断 Review 未表达的信息。

## 报告结构

HTML 报告必须包含：

1. 数据范围与口径。
2. Review 健康度。
3. 关键结论，且必须覆盖人群、场景、用户任务、购买理由、用户期望、实际体验、满意点、不满意点；每个结论必须包含类型分布表。
4. VOC 主题地图。
5. VOC 主题详情页。
6. VOC 观点详情页：点击 VOC 主题下的观点后，当前主报告页不得滚动跳转；浏览器必须在新标签页打开同一 HTML 内的该观点详情视图。详情页顶部 sticky 显示所属 VOC 主题卡片，下方展示该观点相关全量 Review 原文、完整中文翻译和黄色高亮。
7. 机会矩阵与业务动作清单。
8. 限制说明与 checkpoint 状态。

VOC 主题卡片必须能跳转到同一个 HTML 内的主题详情页。详情页展示该主题相关完整 Review 原文、完整中文翻译，并对原文和译文中支撑主题的词、词组或短句使用黄色高亮。

VOC 主题地图必须像关键结论一样展示主题内观点分布。每个主题必须包含 `viewpoints[]`；每个观点必须展示提及 Review 数量、样本数、占比、角色、极性、判断依据和业务含义。观点行必须可点击，并使用 `target="_blank"` 与 `rel="noopener"` 在新标签页打开同一 HTML 内的观点详情视图。观点详情页必须展示该观点相关的全量评论，默认不截断。

Excel 编码层必须包含：

1. `元数据`
2. `原始评论`
3. `Review编码层`
4. `开放标签`
5. `关键结论分布`
6. `VOC主题`
7. `VOC主题观点`
8. `VOC观点评论明细`
9. `业务动作`
10. `检查点`

`原始评论` sheet 前五列必须为 `ASIN`、`评论日期`、`星级`、`title`、`text`。

`Review编码层` sheet 前五列也必须为 `ASIN`、`评论日期`、`星级`、`title`、`text`。后续字段必须优先解释“本行到底编码了哪一个反馈点”，按以下顺序展开：

1. `原Review序号`
2. `反馈点序号`
3. `编码单元ID`
4. `本行编码维度`
5. `本行反馈极性`
6. `本行反馈点`
7. `本行开放标签`
8. `开放标签ID`
9. `关联主题ID`
10. `证据原文`
11. `结果/影响`
12. `置信度`

整条 Review 的综合字段只能作为后置上下文列展示，并必须加 `整条Review-` 前缀，例如 `整条Review-人群`、`整条Review-场景`、`整条Review-满意点汇总`，避免用户误以为这些汇总字段都属于当前反馈单元。

## 脚本

在仓库根目录运行：

```bash
npm install
npm run typecheck
npm test
npm run render -- <analysis.json> <report.html>
npm run export:excel -- <analysis.json> <review-coding.xlsx>
npm run contract:check -- <analysis.json> <report.html> [review-coding.xlsx]
npm run secret:scan -- <path>
npm run cache:clear
```

真实 Sorftime smoke 使用固定 ASIN `B0DHPN1DMJ`，只在配置好 Sorftime MCP 的发布前环境执行。

## 交付门禁

1. `SKILL.md` frontmatter 只包含 `name` 和 `description`。
2. `skill_version` 与 release 版本一致。
3. SDD specs、BDD features、checkpoints、tests、evals 必须存在。
4. 契约检查通过，且检查 HTML 与可选 Excel 工作簿。
5. 样例 HTML 与样例 Excel 使用真实 Sorftime 数据摘要生成并可打开。
6. Product Design 视觉 QA 通过。
7. secret scan 不得发现 Sorftime key、运行时 token 或环境变量值。
