Feature: 单 ASIN Review 分析报告

  Scenario: 用户输入单个 Amazon US ASIN 并生成中文 HTML 报告
    Given 用户提供一个合法 Amazon US ASIN
    And Sorftime MCP 返回 product_detail 和 product_reviews
    When agent 完成 Review 编码、VOC 主题归因和业务动作生成
    Then 系统生成中文自包含 HTML 报告
    And 报告展示 Review 样本数
    And 报告展示 ASIN 总评论数量
    And 关键结论覆盖人群、场景、用户任务、购买理由、用户期望、实际体验、满意点、不满意点
    And 每个关键结论展示类型分布、提及数量、占比和判断依据
    And 报告展示 VOC 主题地图
    And VOC 主题地图展示每个主题下的观点分布、提及数量和占比
    And VOC 主题地图中的主题卡片可以跳转到 VOC 主题详情页
    And VOC 主题地图中的观点可以在新标签页打开 VOC 观点详情页
    And VOC 主题详情页展示该主题相关完整 Review 原文、完整中文翻译和黄色高亮
    And VOC 观点详情页顶部 sticky 展示所属 VOC 主题卡片
    And VOC 观点详情页下方展示该观点相关全量 Review 原文、完整中文翻译和黄色高亮
    And 报告展示机会矩阵与业务动作清单
    And 系统生成 Review 编码层 Excel

  Scenario: VOC 主题详情页高亮证据
    Given 报告中存在一个 VOC 主题卡片
    And 该主题包含 theme_evidence
    When 用户点击主题卡片
    Then 系统跳转到同一个 HTML 内的主题详情页
    And 详情页展示该主题相关的完整 Review 原文
    And 详情页展示该主题相关的完整中文翻译
    And 完整 Review 原文中的关键词、词组或短句使用黄色背景高亮
    And 完整中文翻译中对应词、词组或短句使用黄色背景高亮
    And 详情页提供返回主报告页的入口

  Scenario: VOC 观点详情页全量证据追溯
    Given 一个 VOC 主题包含多个 viewpoints
    And 每个 viewpoint 包含 review_indexes 和 detail_reviews
    When 用户点击 VOC 主题地图中的观点
    Then 系统在新标签页打开同一个 HTML 内的 VOC 观点详情页
    And 当前主报告页停留在 VOC 主题地图
    And 详情页顶部 sticky 展示所属 VOC 主题卡片
    And 详情页展示观点提及数量、占比、角色、极性和判断依据
    And 详情页展示该观点相关的全量 Review 原文
    And 详情页展示该观点相关的完整中文翻译
    And 原文和译文中的支撑词、词组或短句使用黄色高亮

  Scenario: Review 编码层 Excel 可复核
    Given agent 已生成 normalized_reviews、feedback_units、open_tags 和关键结论 distribution
    And normalized_reviews 覆盖 Sorftime MCP 返回的全部 Review 样本
    And 每条 normalized_reviews 至少有一条 feedback_units 编码记录
    When 系统导出 Review 编码层 Excel
    Then Excel 包含 元数据、原始评论、Review编码层、开放标签、关键结论分布、VOC主题、VOC主题观点、VOC观点评论明细、业务动作、检查点
    And 原始评论 sheet 前五列为 ASIN、评论日期、星级、title、text
    And Review编码层 sheet 前五列为 ASIN、评论日期、星级、title、text
    And 关键结论分布 sheet 展示每个关键结论类型的提及数量、占比、角色、判断依据和 evidence
    And Review编码层 sheet 前置展示每个反馈单元的原Review序号、反馈点序号、本行反馈点、本行反馈极性、本行开放标签、关联主题ID和原文 evidence
    And Review编码层 sheet 后置展示整条 Review 汇总字段，且这些字段名以 整条Review- 开头
    And Excel 中不得包含 Sorftime key、运行时 token 或环境变量值
