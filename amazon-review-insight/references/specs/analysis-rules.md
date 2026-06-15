# Analysis Rules

analysis_rules_version: v0.2.0

## Review 编码

每条 Review 可以拆成多个 `feedback_units[]`。固定字段：

- `audience`
- `scenario`
- `user_task`
- `purchase_reason`
- `user_expectation`
- `expectation_source`
- `actual_experience`
- `satisfied_points`
- `unsatisfied_points`
- `consequence`
- `evidence`
- `confidence`

规则：

1. 没有明确表达的信息写 `unknown`。
2. 非 `unknown` 字段必须有 evidence。
3. evidence 必须能在原 Review text 中找到。
4. 不得根据标题、价格、品牌、类目、Listing 文案或星级推断。
5. 同一 Review 中多个独立反馈逻辑必须拆成多个 feedback unit。
6. Review 编码层必须覆盖 Sorftime MCP 返回的全部 Review；不得只编码 VOC 主题详情页要展示的代表性 Review。

## 开放标签

开放标签用于把具体原文表达转成可聚合业务信号。它的作用是连接 `feedback_units[]` 和后续的 VOC 主题、关键结论分布、业务动作。

示例：

- 原文表达：`user interface is very hard to navigate`、`hard to select songs`、`touchscreen is awful`
- 开放标签：`tag_ui_song_selection_friction`
- 可用于：归因到 `theme_ui_app_screen_instruction_friction`，并进入关键结论 `不满意点` 的 `UI/触屏/找歌慢` 类型。

标签不得只写 `quality`、`good`、`bad`、`sound` 这类泛词。同义表达要归并，不同业务含义要拆开。

## VOC 主题

主题类型固定：

- `positive_purchase_driver`
- `product_pain_point`
- `scenario_problem`
- `expectation_gap`
- `audience_fit`
- `low_frequency_high_risk`

进入前台规则：

- `count >= 3` 进入前台 VOC 主题地图。
- `count` 为 1 到 2 且 `severity = high` 进入前台，并归入低频高风险。
- `count` 为 1 到 2 且非高严重度进入后台观察池。

不得只输出 Top N，不得丢弃符合前台规则的主题。

VOC 主题的作用：把多个开放标签归因为一个可以被产品、Listing 或图片/视频动作处理的业务问题或机会。它不是简单词频表，也不等于关键结论。主题必须解释核心问题、可能原因、业务含义和优先级。

示例：

- 开放标签：`tag_ui_song_selection_friction`、`tag_instruction_gap`
- VOC 主题：`theme_ui_app_screen_instruction_friction`
- 业务含义：用户即使认可声音，也可能因为找歌、触屏和说明不清而降低满意度或留下差评。

## 关键结论分布

八类关键结论都必须包含 `distribution[]`。类型需要尽量穷举该维度下出现的独立反馈逻辑，而不是只写一句总结。

示例：

```json
{
  "dimension": "人群",
  "summary": "当前样本中，人群信号主要来自家庭购买者、儿童/青少年使用者、伴侣礼物购买者和经常办聚会的人。",
  "distribution": [
    {
      "label": "家庭购买者/家庭共同使用者",
      "review_count": 18,
      "sample_size": 76,
      "percentage": 23.7,
      "role": "primary",
      "reason": "多条评论明确提到 family、kids、children、grandchildren 或家人一起使用。",
      "evidence": ["Ages 3-20+ are my grandchildren, nieces and nephews"],
      "theme_ids": ["theme_family_party_gifting"]
    }
  ]
}
```

`role` 规则：

- `primary`：当前维度最主要的类型，通常是最高频且业务意义明确。
- `secondary`：重要但不是第一矛盾。
- `emerging`：提及较少但有增长或差异化潜力。
- `long_tail`：长尾信号，需要保留但不应主导当前判断。
- `unknown`：样本未表达或无法判断。

## 业务动作

动作方向固定为 `product`、`listing`、`image_video`。每条动作必须绑定 `theme_id` 和 evidence，并包含优先级、优先级理由、影响指标和验证方式。

业务动作的作用：把 VOC 主题转成可以执行、验证和复盘的下一步，而不是泛泛建议。
