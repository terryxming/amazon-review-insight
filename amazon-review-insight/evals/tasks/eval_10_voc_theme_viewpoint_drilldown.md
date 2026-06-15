# Eval 10: VOC Theme Viewpoint Drilldown

输入：单个 Amazon US ASIN 的 Sorftime Review 样本。

检查：

1. 每个前台 `voc_theme` 都包含 `viewpoints[]`。
2. 每个 viewpoint 都有 `viewpoint_id`、`viewpoint_name`、`review_count`、`sample_size`、`percentage`、`role`、`viewpoint_polarity`、`reason`、`business_meaning` 和 `evidence`。
3. viewpoint `percentage` 使用 Review 样本数作为分母。
4. VOC 主题地图展示每个主题下的观点分布、提及数量和占比。
5. 每个观点可以点击后在新标签页打开同一 HTML 内的观点详情页，当前主报告页不得滚动跳转。
6. 观点详情页顶部 sticky 展示所属 VOC 主题卡片。
7. 观点详情页下方展示该观点相关的全量 Review 原文和完整中文翻译。
8. 原文和译文中的支撑词、词组或短句使用黄色高亮。
9. 同一主题下观点允许多标签重叠，报告中说明占比允许合计超过 100%。
10. Excel 包含 `VOC主题观点` 和 `VOC观点评论明细`，可用于观点级人工复核。
