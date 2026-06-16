# Version Lifecycle

version_lifecycle_version: v0.3.2

## 核心原则

已发布版本必须冻结。任何已经打 tag 并推送到 GitHub 的版本，都视为不可变历史；后续任何行为、样式、契约、测试、文档或输出口径修改，都必须通过新版本承载。

## 生命周期状态

1. `development`：开发中版本，可以继续修改；必须使用高于最新已发布版本的版本号。
2. `release-candidate`：候选发布版本，只允许修复阻断发布的问题；不得再混入新的产品需求。
3. `released`：已发布版本，必须已有对应 Git tag 并推送到 GitHub；该版本内容冻结。
4. `deprecated`：不再推荐使用的已发布版本；仍然不可改写，只能在新版本中替代。

## 当前版本线

- 最新已发布版本：`v0.3.2`，状态为 `released`，已冻结。
- 当前开发版本：无。后续修改必须先进入高于 `v0.3.2` 的新版本。
- 本地安装版可以同步当前工作版本用于继续使用，但不得把同步动作理解为重新发布旧版本。

## 版本号规则

1. 修改已发布版本之后的任何内容前，先提升工作版本号。
2. 修复已发布版本的问题时，不回写原 tag；创建下一个 patch 版本，例如从 `v0.3.1` 进入 `v0.3.2`。
3. 新增或改变报告交互、数据契约、分析口径、输出字段、视觉样式、测试门禁时，至少提升 patch 版本。
4. 版本号必须同步到 `package.json`、`package-lock.json`、`SKILL.md`、相关 contract/spec、checkpoint、CHANGELOG 和测试。
5. 如果某个 spec 没有发生语义变化，可以保留其内部 spec version；但 skill 总版本和 release 记录必须反映当前交付版本。

## 发布冻结规则

1. 发布前必须确认工作区干净，或明确知道哪些未提交文件属于本次发布。
2. 发布动作必须包含一个 Git commit 和一个对应的 Git tag，例如 `v0.3.2`。
3. tag 推送到 GitHub 后，该 tag 指向的内容不得再被修改、移动、强推或覆盖。
4. 若发布后发现问题，必须在新版本中修复，并在 CHANGELOG 中说明。
5. 不得把安装版 skill 直接当作历史发布版本修改；安装版只是当前可用工作副本。

## 变更同步清单

每次进入新版本或发布前，必须检查：

1. `package.json` 与 `package-lock.json` 的版本号。
2. `SKILL.md` 的 `skill_version` 和 `release_status`。
3. 本规范的当前版本线。
4. 被修改的 contract/spec/BDD/checkpoint/eval/test 是否同步。
5. `CHANGELOG.md` 是否新增当前版本条目。
6. 已安装 skill 是否需要同步当前工作版本。
7. 发布后是否推送 commit 和 tag，并确认远端 tag 指向正确 commit。
