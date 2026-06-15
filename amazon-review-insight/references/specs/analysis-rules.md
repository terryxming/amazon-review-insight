# Analysis Rules

analysis_rules_version: v0.1.0

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

## 开放标签

开放标签用于把具体原文表达转成可聚合业务信号。标签不得只写 `quality`、`good`、`bad`、`sound` 这类泛词。同义表达要归并，不同业务含义要拆开。

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

## 业务动作

动作方向固定为 `product`、`listing`、`image_video`。每条动作必须绑定 `theme_id` 和 evidence，并包含优先级、优先级理由、影响指标和验证方式。

