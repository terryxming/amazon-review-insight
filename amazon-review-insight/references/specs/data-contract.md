# Data Contract

data_contract_version: v0.2.0

## 核心口径

1. `asin_total_review_count` = Sorftime `product_detail` 字段 `评论数`。
2. `asin_total_review_count` 展示为 ASIN 总评论数量。
3. `review_sample_size` = `product_reviews` 实际返回条数。
4. VOC 主题、关键结论、关键结论分布、业务动作的百分比分母必须使用 `review_sample_size`。
5. ASIN 总评论数量只能作为产品规模背景。
6. `normalized_reviews.length` 必须等于 `review_sample_size`。Review 编码层 Excel 是全量样本复核文件，不是 VOC 详情页证据片段集合。
7. Excel 对外可见 sheet 名和字段名必须使用中文；`原始评论` 与 `Review编码层` 前五列固定为 `ASIN`、`评论日期`、`星级`、`title`、`text`。

## NormalizedReview

```json
{
  "asin": "B0DHPN1DMJ",
  "variant": "Size=Shell S3;Color=Black",
  "review_date": "2025-01-31",
  "rating": 5,
  "title": "Great speaker",
  "text": "Original review text",
  "raw": {}
}
```

## 字段规则

- 原始 Sorftime 字段必须保留到 `raw`。
- 每条 `normalized_reviews` 必须保留 `raw.review_index`，用于和 `feedback_units.review_index` 对齐。
- 日期无法解析时写 `unknown`。
- 星级无法解析时写 `unknown`。
- 重复 Review 默认按 `评论日期 + 评星 + 标题 + 评论` 完全一致判断。

## FeedbackUnit

`feedback_units[]` 是 Review 编码层的最小分析单位。同一条 Review 如果同时表达多个独立反馈逻辑，必须拆成多条 feedback unit。

全量规则：每条 `normalized_reviews` 至少要有一条对应 `feedback_units`。如果一条评论只有很短的正向或负向表达，也要保留一条基础编码记录，并可将 `confidence` 标为 `low`。

关键字段：

- `feedback_unit_id`：稳定 ID，便于追溯。
- `review_index`：对应原始 Review 序号。
- `dimension`：该反馈主要服务的洞察维度，例如 `满意点`、`不满意点`、`场景`。
- `audience/scenario/user_task/purchase_reason/user_expectation/actual_experience` 等字段：从原文中提取的结构化信号；没有表达时写 `unknown`。
- `evidence`：必须能在原 Review text 中找到的原文证据。
- `open_tags`：该 feedback unit 归属的开放标签 ID。
- `confidence`：编码置信度。

## OpenTag

`open_tags[]` 用于把分散的原文表达归并成可统计的业务信号。它不是最终报告主题，而是从 feedback unit 到 VOC 主题、关键结论分布之间的中间桥梁。

关键字段：

- `tag_id`：稳定标签 ID。
- `tag_name`：可读标签名称，例如 `UI/找歌/触屏摩擦`。
- `dimension`：服务的洞察维度。
- `count/sample_size/percentage`：该标签在 Review 样本中的提及规模。
- `representative_evidence`：代表性原文证据。
- `theme_ids`：被哪些 VOC 主题吸收。

## KeyInsight Distribution

每个关键结论必须提供 `distribution[]`，用于回答“该维度下有哪些类型、各自提及多少、谁是主要矛盾和次要矛盾”。

字段：

- `label`：类型名称，例如 `家庭购买者/家庭共同使用者`。
- `review_count`：提及该类型的 Review 数量。
- `sample_size`：Review 样本数。
- `percentage`：`review_count / sample_size`。
- `role`：类型角色，取值为 `primary`、`secondary`、`emerging`、`long_tail`、`unknown`。
- `reason`：为什么把它判定为该类型和该角色。
- `evidence`：支撑该类型的 Review 原文证据。
- `theme_ids`：关联的 VOC 主题。

说明：同一条 Review 可以同时表达多个类型，所以同一维度下的 `distribution[].percentage` 不要求加总为 100%。
