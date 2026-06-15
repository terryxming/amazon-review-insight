# Analysis Rules

analysis_rules_version: v0.3.1

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
- `value_support_trust`
- `trust_support`

进入前台规则：

- `count >= 3` 进入前台 VOC 主题地图。
- `count` 为 1 到 2 且 `severity = high` 进入前台，并归入低频高风险。
- `count` 为 1 到 2 且非高严重度进入后台观察池。

不得只输出 Top N，不得丢弃符合前台规则的主题。

VOC 主题的作用：把多个开放标签归因为一个可以被产品、Listing 或图片/视频动作处理的业务问题或机会。它不是简单词频表，也不等于关键结论。主题必须解释核心问题、可能原因、业务含义和优先级。

前台 VOC 主题地图必须按三个主分组穷举全部主题：

1. `正向主题`：`positive_purchase_driver`、`audience_fit`、`value_support_trust`、`trust_support`，或观点极性明显以正向为主的主题。
2. `负向主题`：已经造成低星、故障、可靠性、强烈不满或高严重度风险的主题，典型包括 `low_frequency_high_risk`。
3. `未满足的机会点`：用户有明确预期但体验、说明、配件、场景或边界还未被充分满足的主题，典型包括 `expectation_gap`、`product_pain_point`、`scenario_problem`。

每个前台主题必须且只能归入一个主分组；三组主题数量之和必须等于 `voc_themes.length`。不得因为分组而只展示 Top N，也不得把同一主题在多个分组中重复展示。如果一个主题同时包含明显正负信号，优先拆分为两个业务含义清晰的主题；无法拆分时按主导业务动作归类，并在主题说明中保留混合证据。

主题优先级是运营动作顺序，不是严重度本身：

- `P0`：立即处理。正向购买驱动类主题表示立即放大主卖点和转化证据；负向、风险或预期落差类主题表示立即止损。
- `P1`：本轮迭代处理。通常用于澄清预期、闭环风险或放大已验证机会。
- `P2`：排期优化。通常用于低成本补齐体验、补强信任或进入后续素材/页面/客服优化池。

生成 `priority` 时必须能回答“运营接下来要干嘛”。例如“强声音+便携一体化支撑家庭聚会主卖点”的 P0 含义是立即放大转化主线；“说明书、充电器和支架等配件完整性影响高价感知”的 P2 含义是排期补齐低成本体验缺口，而不是说它不重要或不用处理。

示例：

- 开放标签：`tag_ui_song_selection_friction`、`tag_instruction_gap`
- VOC 主题：`theme_ui_app_screen_instruction_friction`
- 业务含义：用户即使认可声音，也可能因为找歌、触屏和说明不清而降低满意度或留下差评。

## VOC 主题观点

每个前台 VOC 主题必须继续拆出 `viewpoints[]`。观点是主题内部可统计、可点击、可追溯的具体用户声音。

推荐流程：

1. 从 `feedback_units[]` 读取原子反馈。
2. 用 `open_tags[]` 聚合同义表达。
3. 将开放标签归入 VOC 主题。
4. 在同一主题内，把业务含义接近的开放标签归并成 viewpoint。
5. 为每个 viewpoint 记录去重 `review_indexes`。
6. 为每个 viewpoint 输出全量 `detail_reviews[]`。

观点命名规则：

1. 必须业务可读，例如 `HDMI 仅视频导致家庭影院连接预期落差`。
2. 不得写 `体验问题`、`产品好`、`不满意` 这类泛词。
3. 正向和负向观点分开。
4. 每个观点必须有提及数量、占比、角色、极性、判断依据、业务含义和 evidence。

同一条 Review 可以命中同一主题下多个 viewpoint，因此主题内观点百分比允许合计超过 100%。

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
