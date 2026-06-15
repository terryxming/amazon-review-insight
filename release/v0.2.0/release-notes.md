# Release Notes: v0.2.0

v0.2.0 focuses on making the report more decision-useful and more auditable.

## Highlights

- Key insights now include a distribution table for each required dimension: 人群、场景、用户任务、购买理由、用户期望、实际体验、满意点、不满意点.
- Added Review coding Excel export with `normalized_reviews`, `feedback_units`, `open_tags`, `key_insight_distribution`, `voc_themes`, `business_actions`, and `checkpoints`.
- Review coding Excel now requires full `normalized_reviews` coverage: row count must equal `metadata.review_sample_size`, and every Review must have at least one feedback unit.
- Contract checks now validate key insight distribution rows and optional Excel workbook structure.
- HTML report cards render distribution tables with count, percentage, role, and reason.
- Secret scan now reads `.xlsx` cell content.
- `npm audit` is clean via a `uuid` override used by the Excel dependency chain.

## Sample Assets

- `samples/B0DHPN1DMJ-sample-report.html`
- `samples/B0DHPN1DMJ-review-coding-v0.2.0.xlsx`
