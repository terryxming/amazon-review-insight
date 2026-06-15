Feature: 信息缺失和用户确认

  Scenario: Review 没有表达某个洞察字段
    Given Review 原文没有明确表达购买理由
    When agent 输出关键结论
    Then 购买理由写为 unknown
    And 不根据标题、价格、品牌、类目或 Listing 推断购买理由

  Scenario: 字段含义不明确
    Given Sorftime 返回字段含义不明确
    When agent 准备生成确定性结论
    Then 系统停止生成该结论
    And 记录 needs_user_confirmation

