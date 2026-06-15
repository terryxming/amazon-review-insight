# Migration Notes

## From v0.1.0 to v0.2.0

v0.2.0 changes the analysis contract.

1. `key_insights[]` still supports v0.1.0 fields, but every key insight must now include `distribution[]`.
2. Analysis JSON must include full `normalized_reviews[]`, `feedback_units[]`, and `open_tags[]` so the Review coding layer can be exported.
3. `normalized_reviews.length` must equal `metadata.review_sample_size`, and every normalized Review must have at least one `feedback_units` record.
4. `npm run contract:check` accepts an optional third argument for the Review coding Excel path.
5. New CLI command: `npm run export:excel -- <analysis.json> <review-coding.xlsx>`.
6. Report HTML now renders key insight distribution tables; mobile QA should verify table scrolling inside cards.

Existing v0.1.0 HTML reports remain readable, but v0.2.0 contract checks will fail old analysis JSON until the new fields are added.
