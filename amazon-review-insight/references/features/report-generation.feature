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
    And VOC 主题地图展示带动作语义的运营优先级
    And VOC 主题地图展示每个主题的运营动作
    And VOC 主题地图中的主题卡片任意位置可以在新标签页打开该主题详情页
    And VOC 主题详情页顶部 sticky 展示所属 VOC 主题卡片
    And VOC 主题详情页顶部 sticky 展示带动作语义的运营优先级和运营动作
    And VOC 主题详情页默认展示该主题相关全部 Review 原文、完整中文翻译和黄色高亮
    And VOC 主题详情页中的观点可以在当前标签页内筛选出对应观点的全量 Review
    And 报告展示机会矩阵与业务动作清单
    And 系统生成 Review 编码层 Excel

  Scenario: 点击 VOC 主题卡片后打开主题详情新标签页
    Given 报告中存在一个 VOC 主题卡片
    And 该主题包含 theme_evidence
    And 该主题包含至少一个 viewpoint
    When 用户点击主题卡片任意非链接位置
    Then 系统在新标签页打开该主题详情页
    And 当前主报告页停留在 VOC 主题地图
    And 新标签页进入主题详情独立路由模式
    And 新标签页只展示当前 VOC 主题详情，不展示目录、主报告其它章节或其它 VOC 主题详情
    And 详情页顶部 sticky 面板在同一个卡片内展示所属 VOC 主题和观点筛选入口
    And sticky 面板的主题区展示核心问题、归因假设、业务含义和运营动作
    And sticky 面板下方不再另起卡片重复展示同一主题摘要
    And 详情页展示支撑该主题的全部相关 Review 原文
    And 详情页展示支撑该主题的全部相关 Review 完整中文翻译
    And 完整 Review 原文中的关键词、词组或短句使用黄色背景高亮
    And 完整中文翻译中对应词、词组或短句使用黄色背景高亮
    And 详情页提供观点筛选入口和返回主报告页的入口

  Scenario: 在主题详情新标签页中点击观点后筛选评论
    Given 用户已在某个 VOC 主题详情的新标签页
    And 页面当前展示该主题的全部相关 Review
    And 该 VOC 主题包含多个 viewpoints
    And 每个 viewpoint 包含 review_indexes 和 detail_reviews
    When 用户点击主题详情页中的某一个观点
    Then 当前新标签页不再新开标签
    And 合并后的 sticky 主题筛选面板仍保持在顶部
    And 页面展示该观点提及数量、占比、极性和判断依据
    And 页面只展示该观点相关的全量 Review 原文
    And 页面只展示该观点相关的完整中文翻译
    And 原文和译文中的该观点支撑词、词组或短句使用黄色高亮

  Scenario: 用户从观点筛选返回主题全量评论
    Given 用户已在某个 VOC 主题详情的新标签页
    And 当前页面处于某个 viewpoint 的筛选状态
    When 用户点击“全部主题评论”
    Then 页面恢复展示支撑该 VOC 主题的全部相关 Review
    And 合并后的 sticky 主题筛选面板仍保持在顶部
    And 原主报告页仍不受影响

  Scenario: 主报告关键结论和 VOC 主题地图按单列折叠块展示
    Given 报告已生成关键结论和 VOC 主题地图
    When 用户阅读主报告页
    Then 左侧一级导航全部带序号
    And 左侧导航在“3. 关键结论”下展示带序号的八类洞察二级导航
    And 左侧导航在“4. VOC 主题地图”下展示带序号的主题二级导航
    And 带有二级导航的一级导航默认展开并支持折叠和展开
    And 正文中不应额外渲染“八类横向洞察”或“主题与观点分布”副标题
    And 每个一级章节标题下方不展示说明文字
    And 关键结论和 VOC 主题地图标题右上角展示问号 tooltip
    And VOC 主题地图 tooltip 解释 P0、P1、P2 是运营动作顺序而不是严重度
    And 每个关键结论维度独占一整行
    And 每个 VOC 主题独占一整行
    And 每个块都支持折叠和展开
    And 每个块默认处于展开状态
    And 不应出现关键结论或 VOC 主题一行多个块的 grid 布局

  Scenario: HTML 分布表不展示角色列
    Given 关键结论分布和 VOC 主题观点分布已生成
    When 用户阅读主报告页的分布表
    Then 分布表不展示“角色”列
    And 分布表不展示 primary、secondary、emerging、long_tail 或 risk_signal 角色 badge
    And 分布表保留类型或观点名称、提及占比、极性和判断依据
    And Excel 可继续保留角色字段用于人工复核

  Scenario: VOC 主题优先级必须让运营知道下一步动作
    Given 报告已生成 VOC 主题地图
    When 用户阅读任意 VOC 主题卡片
    Then 主题卡片不应裸展示“优先级：P0”、“优先级：P1”或“优先级：P2”
    And 主题卡片展示“运营优先级”及动作语义
    And P0 正向购买驱动主题展示为立即放大卖点或同等转化动作
    And P0 或 P1 负向风险主题展示为立即止损、本轮澄清预期或本轮闭环风险
    And P2 产品痛点主题展示为排期补齐体验或同等低成本补齐动作
    And 主题卡片展示“运营动作”，说明运营下一步应放大、澄清、止损还是排期补齐

  Scenario: 机会矩阵与业务动作按方向拆分
    Given business_actions 包含多个 action_area
    When 用户进入机会矩阵与业务动作清单
    Then 系统按业务方向拆分为多个独立块
    And 每个方向块独占一行并支持折叠展开
    And 每个方向块默认展开
    And 每个方向块展示动作数量、最高优先级和关联主题摘要
    And 每个方向块内以动作卡片展示业务发现、建议动作、影响指标和验证方式
    And 系统不应把全部业务动作扔进一个横向大表

  Scenario: 主报告顶部和电脑端布局优化
    Given 用户在电脑端桌面宽度阅读报告
    When 页面按桌面布局展示
    Then 数据范围与口径使用紧凑指标卡和缺失字段说明
    And Review 健康度使用紧凑指标卡和星级分布条展示
    And 长文本、主题 ID、按钮和标签在桌面宽度下自然换行
    And 表格列不得窄到形成竖排式阅读
    And 长表格可通过横向滚动或块状布局保持可读
    And HTML 不再包含移动端媒体查询或移动端特化样式

  Scenario: 报告资源和旧口径同步清理
    Given 本轮迭代修改主报告布局和展示口径
    When 系统更新生成器、样式和契约
    Then SKILL、report contract、BDD、checkpoint、eval 和 tests 必须同步
    And 不再使用的旧 grid 布局、旧角色列和旧业务动作大表检查必须被删除或改写
    And 不再使用的正文说明段和移动端媒体查询必须被删除或改写
    And 如允许使用外部 CDN，契约必须从禁止 CDN 更新为允许白名单展示型 CDN
    And HTML、Excel 和输出目录不得包含 Sorftime key、运行时 token 或环境变量值

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
