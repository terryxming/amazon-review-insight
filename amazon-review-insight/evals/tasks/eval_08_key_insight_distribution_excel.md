# Eval 08: Key Insight Distribution and Excel Export

输入：单个 Amazon US ASIN 的 Sorftime Review 样本。

检查：

1. 八个关键结论都包含一句话总结和 `distribution[]`。
2. 每个 `distribution[]` 类型都有 `label`、`review_count`、`sample_size`、`percentage`、`role`、`reason`、`evidence` 和 `theme_ids`。
3. `percentage` 使用 Review 样本数作为分母。
4. 类型角色能区分主要、次要、新兴和长尾信号。
5. Excel 编码层包含必需 sheet，且 `feedback_units` 和 `key_insight_distribution` 可用于人工复核。
6. `normalized_reviews` sheet 行数等于 Review 样本数。
7. 每条 Review 至少有一条 `feedback_units` 编码记录。
8. HTML 与 Excel 均不包含 Sorftime key、运行时 token 或环境变量值。
