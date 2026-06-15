# Report Layout

Product Design brief: light, professional, evidence-first, action-oriented analytical report for Chinese Amazon operators and product managers.

## Views

1. Main report page with sticky table of contents on desktop.
2. Key insight cards with compact distribution tables.
3. VOC theme cards grouped by theme category, each with a compact viewpoint distribution table.
4. In-document VOC theme detail sections.
5. New-tab VOC viewpoint detail views that resolve to in-document anchors and show sticky parent theme cards.
6. Mobile single-column layout.

## Interaction

- Theme cards link to `#theme-detail-{theme_id}`.
- Viewpoint rows open `#voc-viewpoint-detail-{theme_id}-{viewpoint_id}` in a new browser tab with `target="_blank"` and `rel="noopener"`.
- Detail sections include a back link to `#voc-theme-map`.
- Viewpoint detail sections keep the parent VOC theme card sticky on desktop.
- Highlighted source and translation fragments use `mark` with yellow background.

## Density

Cards use 8px radius, compact spacing, scan-friendly tables, and no hero or decorative background.

Key insight distribution tables use compact rows, role badges, and small inline bars to make primary, secondary, emerging, and long-tail signals scannable without turning the section into a separate dashboard.

VOC viewpoint distribution tables use the same compact table language as key insights, with an additional polarity badge. Sticky theme cards stay bounded and reuse the normal card surface so the detail page remains analytical rather than dashboard-like.
