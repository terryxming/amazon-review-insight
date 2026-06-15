# Data Contract

data_contract_version: v0.1.0

## 核心口径

1. `asin_total_review_count` = Sorftime `product_detail` 字段 `评论数`。
2. `asin_total_review_count` 展示为 ASIN 总评论数量。
3. `review_sample_size` = `product_reviews` 实际返回条数。
4. VOC 主题、关键结论、业务动作的百分比分母必须使用 `review_sample_size`。
5. ASIN 总评论数量只能作为产品规模背景。

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
- 日期无法解析时写 `unknown`。
- 星级无法解析时写 `unknown`。
- 重复 Review 默认按 `评论日期 + 评星 + 标题 + 评论` 完全一致判断。

