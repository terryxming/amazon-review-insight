# Report Layout

Product Design brief: light, professional, evidence-first, action-oriented analytical report for Chinese Amazon operators and product managers.

## Views

1. Main report page with sticky table of contents on desktop.
2. Numbered first-level navigation.
3. Default-open collapsible secondary navigation under Key Insights and VOC Theme Map.
4. Key insight section with one default-open collapsible block per insight dimension.
5. VOC theme map section with one default-open collapsible block per theme.
6. New-tab VOC theme detail sections that default to all theme-related reviews.
7. In-theme viewpoint filters that narrow the current detail page to viewpoint-related reviews.
8. Opportunity matrix and business actions grouped by direction, with one default-open collapsible action block per direction.

## Interaction

- Theme cards open `#theme-detail-{theme_id}` in a new browser tab with `target="_blank"` and `rel="noopener"`.
- When the hash is `#theme-detail-{theme_id}`, the report enters an isolated theme detail route: hide the TOC, main report sections, and other theme details; show only the active theme detail section.
- Theme detail sections keep one combined sticky header panel on desktop.
- The combined sticky panel contains the parent VOC theme summary and the viewpoint filter area in the same card, separated internally by a subtle divider.
- The sticky panel is the only full theme summary in the detail route. Do not render a second card below it that repeats the same theme title, core issue, root-cause hypothesis, or business meaning.
- Theme detail sections default to all reviews supporting the theme.
- Viewpoint controls inside the theme detail section filter the current tab to reviews supporting that viewpoint.
- Detail sections include a back link to `#voc-theme-map` and a "全部主题评论" filter.
- Key insight and VOC theme secondary headings live in the left navigation, not as duplicate body subtitles.
- First-level and second-level navigation labels are numbered.
- First-level navigation groups that contain second-level links default to expanded and can be collapsed.
- Primary section titles do not render explanatory text directly below them.
- Key insight and VOC Theme Map titles expose a question-mark tooltip explaining the difference between both sections.
- The VOC Theme Map tooltip explains that operational priority is an action order, not severity: P0 means immediate action, P1 means current iteration, and P2 means scheduled optimization.
- Main report key insight, VOC theme, and action blocks default to expanded and expose an expand/collapse affordance.
- Highlighted source and translation fragments use `mark` with yellow background.

## Density

Cards use 8px radius, compact spacing, scan-friendly tables, and no hero or decorative background. Data scope and Review health use compact desktop metric grids; star distribution uses horizontal bars instead of a wide table. Mobile-specific layouts are out of scope.

Key insight distribution tables use compact rows and small inline bars. The HTML report does not display role columns or role badges in key insight or VOC viewpoint distribution tables; role stays in the analysis JSON and Excel coding layer only.

VOC viewpoint distribution tables use the same compact table language as key insights, with an additional polarity badge. Theme detail filter controls use compact buttons inside the combined sticky panel so the detail page remains analytical rather than dashboard-like.

VOC theme cards display "运营优先级" with an action label, never bare P0/P1/P2. Each theme card and detail header includes an "运营动作" line that tells operators whether to amplify a selling point, clarify expectations, close risk, or schedule low-cost fixes.

Business actions are never rendered as one horizontal mega-table. Split them by direction, then render compact action cards with priority, related theme, finding, suggested action, impact metric, and verification method.
