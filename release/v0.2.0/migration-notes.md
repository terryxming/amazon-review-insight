# Migration Notes

## From v0.1.0 to v0.2.0

v0.2.0 changes the analysis contract.

1. `key_insights[]` still supports v0.1.0 fields, but every key insight must now include `distribution[]`.
2. Analysis JSON must include non-empty `normalized_reviews[]`, `feedback_units[]`, and `open_tags[]` so the Review coding layer can be exported.
3. `npm run contract:check` accepts an optional third argument for the Review coding Excel path.
4. New CLI command: `npm run export:excel -- <analysis.json> <review-coding.xlsx>`.
5. Report HTML now renders key insight distribution tables; mobile QA should verify table scrolling inside cards.

Existing v0.1.0 HTML reports remain readable, but v0.2.0 contract checks will fail old analysis JSON until the new fields are added.

