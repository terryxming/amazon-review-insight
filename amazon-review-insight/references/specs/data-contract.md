# Data Contract

data_contract_version: v0.3.2

## 核心口径

1. `asin_total_review_count` = Sorftime `product_detail` 字段 `评论数`。
2. `asin_total_review_count` 展示为 ASIN 总评论数量。
3. `review_sample_size` = `product_reviews` 实际返回条数。
4. VOC 主题、关键结论、关键结论分布、业务动作的百分比分母必须使用 `review_sample_size`。
5. ASIN 总评论数量只能作为产品规模背景。
6. `normalized_reviews.length` 必须等于 `review_sample_size`。Review 编码层 Excel 是全量样本复核文件，不是 VOC 详情页证据片段集合。
7. Excel 对外可见 sheet 名和字段名必须使用中文；`原始评论` 与 `Review编码层` 前五列固定为 `ASIN`、`评论日期`、`星级`、`title`、`text`。
8. `Review编码层` 是 feedback unit 级别表，一行只解释一个反馈点。整条 Review 汇总字段必须后置并加 `整条Review-` 前缀，避免和本行反馈点混淆。
9. 每个前台 `voc_themes[]` 必须包含 `viewpoints[]`，用于展示该主题内部具体观点的提及数量、占比和全量评论证据。

## ProductMetadata

`product_metadata` 来自 Sorftime `product_detail`，用于报告顶部 ASIN 元数据模块。它只能使用 Sorftime 明确返回的字段；缺失时写 `unknown`，不得根据 Listing 文案或 Review 内容推断。

字段：

- `asin`：产品 ASIN，对应 `产品ASIN码`。
- `parent_asin`：父级 ASIN，对应 `父级ASIN码`，可选。
- `brand`：品牌，对应 `品牌`。
- `title`：标题，对应 `标题`。
- `main_image`：主图 URL，对应 `主图`。
- `price`：价格，对应 `价格`。
- `rating`：产品星级，对应 `星级`。
- `asin_total_review_count`：ASIN 总评论数量，对应 `评论数`。
- `category`：分类，对应 `分类`。
- `browse_node_id`：所属 node id，对应 `所属nodeid`。
- `root_category`：所属大类及排名，对应 `所属大类`。
- `leaf_category`：所属细分类目及排名，对应 `所属细分类目`。
- `launch_date`：上架时间，对应 `上架时间`。

报告只展示用户指定的 ASIN 元数据字段：ASIN、品牌、标题、主图、价格、星级、ASIN 总评论数、分类、所属大类、所属细分类目、上架时间。

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

## Review 编码层 Excel 字段口径

`Review编码层` sheet 前五列固定为 `ASIN`、`评论日期`、`星级`、`title`、`text`。后续字段必须先服务人工复核：

- `原Review序号`：该 feedback unit 来自第几条 Review。
- `反馈点序号`：同一条 Review 内第几个 feedback unit。
- `编码单元ID`：稳定追踪 ID，例如 `B0CR1R7FKP-FU-001-08`。
- `本行编码维度`：该 feedback unit 主要服务哪个洞察维度。
- `本行反馈极性`：`正向`、`负向/风险`、`混合` 或 `中性/洞察`。
- `本行反馈点`：本行编码的可读反馈点，通常来自开放标签名称。
- `本行开放标签`：开放标签中文名称。
- `开放标签ID`：开放标签稳定 ID。
- `关联主题ID`：该 feedback unit 归入的 VOC 主题 ID。
- `证据原文`：能在原 Review text 中定位的完整证据句或最小完整判断句。
- `结果/影响`：该反馈造成的使用、购买、推荐、退货或售后影响。
- `置信度`：编码置信度。

`人群`、`场景`、`用户任务`、`购买理由`、`用户期望`、`实际体验`、`满意点`、`不满意点` 等整条 Review 汇总字段可以保留，但列名必须写成 `整条Review-人群`、`整条Review-场景`、`整条Review-满意点汇总` 等形式。

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

## ThemeViewpoint

`voc_themes[].viewpoints[]` 是 VOC 主题内部的观点分布层。它回答“这个主题下面到底有哪些具体观点、各自有多少 Review 支撑、点击后能看到哪些完整证据”。

字段：

- `viewpoint_id`：观点稳定 ID。
- `viewpoint_name`：业务可读的观点名称。
- `viewpoint_polarity`：观点极性，取值为 `positive`、`negative`、`mixed`、`neutral`。
- `review_count/sample_size/percentage`：该观点的提及 Review 数、样本数和占比。
- `role`：观点角色，取值为 `primary`、`secondary`、`emerging`、`long_tail`、`risk_signal`、`unknown`。
- `reason`：为什么归为该观点。
- `tag_ids`：来源开放标签 ID。
- `review_indexes`：该观点命中的去重 Review 序号。
- `evidence`：代表性原文证据。
- `business_meaning`：该观点对产品、Listing、图片视频或售后的业务含义。
- `confidence`：观点归因置信度。
- `detail_reviews`：该观点相关的全量 Review 原文、完整中文翻译和句子级证据高亮数据。

`detail_reviews[]` 字段：

- `review_index`：Review 序号。
- `rating`：星级。
- `review_date`：评论日期。
- `title`：Review 标题。
- `text`：完整 Review 原文。
- `translation`：完整中文翻译，不得使用摘要模板。
- `evidence_sentences`：句子级证据数组。

`evidence_sentences[]` 字段：

- `original`：能在 `text` 中定位的完整证据句。
- `translation`：能在 `translation` 中定位的对应完整中文证据句。
- `evidence_type`：证据类型，取值为 `positive`、`negative`、`opportunity`、`context`。
- `target`：可选，证据支撑的主题、观点或关键结论 ID。

规则：

1. `percentage = review_count / sample_size`。
2. `detail_reviews.length` 默认必须等于 `review_count`。
3. `evidence_sentences[].original` 必须能在 `detail_reviews[].text` 中定位。
4. `evidence_sentences[].translation` 必须能在 `detail_reviews[].translation` 中定位。
5. `detail_reviews[]` 不得继续保留 `highlight_terms` 或 `translation_highlight_terms`。
6. 同一 Review 可以命中同一主题下多个 viewpoint，因此观点占比允许合计超过 100%。

说明：同一条 Review 可以同时表达多个类型，所以同一维度下的 `distribution[].percentage` 不要求加总为 100%。
