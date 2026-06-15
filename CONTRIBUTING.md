# Contributing

## PR 要求

每个 PR 必须：

1. 描述变更范围。
2. 标明版本影响：PATCH、MINOR 或 MAJOR。
3. 更新对应 SDD specs。
4. 更新对应 BDD features。
5. 更新 tests、checkpoints 或 evals。
6. 更新 `CHANGELOG.md`。
7. 通过 CI。

## 禁止合并

以下 PR 不得合并：

- 包含真实密钥。
- 包含未脱敏私有数据。
- 混用 Review 样本数和 ASIN 总评论数量。
- 移除无 evidence 不进入关键结论规则。
- 跳过 checkpoints 或 evals。
- 绕过 Product Design report assets 自行发明报告样式。

## 发布前检查

```bash
npm run typecheck
npm test
npm run secret:scan -- .
npm run contract:check -- <analysis.json> <report.html>
```

