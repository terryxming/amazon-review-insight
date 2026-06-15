# User Confirmation Rules

user_confirmation_rules_version: v0.1.0

## 规则

1. 信息缺失时写 `unknown`。
2. 字段含义不明确时写 `needs_user_confirmation`。
3. 用户没有确认前，不使用推断内容生成确定性结论。
4. 不根据产品描述推断购买理由。
5. 不根据 Listing 卖点推断满意点。
6. 不根据星级单独推断不满意点。
7. 报告正文禁止出现没有 Review evidence 的确定性结论。

