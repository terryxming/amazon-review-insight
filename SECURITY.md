# Security

## 密钥规则

- Sorftime key 只能来自用户当次明确提供、环境变量 `SORFTIME_MCP_KEY`、或用户授权的运行环境。
- 不得把 Sorftime key 写入 `SKILL.md`、`references/`、`tests/fixtures/`、`evals/`、缓存、报告或日志。
- `.env` 禁止提交。
- CI 和发布前必须运行 `npm run secret:scan -- <path>`。

## 数据规则

- 公开 fixture 使用人工合成数据。
- 真实 Sorftime 原始响应不得提交到 GitHub。
- v0.1.0 sample HTML report 使用真实 Sorftime 数据生成，但不得包含 key、环境变量值或运行时 token。

## 泄露处理

如果发现真实 key 被提交：

1. 立即撤销该 key。
2. 清理仓库和发布产物。
3. 发布安全修复版本。
4. 在 changelog 中记录安全修复摘要，不记录真实 key。

