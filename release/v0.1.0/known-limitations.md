# Known Limitations

1. v0.1.0 only supports one Amazon US ASIN per run.
2. v0.1.0 does not perform competitor comparison or multi-ASIN ranking.
3. v0.1.0 does not export CSV, XLSX or PDF.
4. `product_reviews` may not include reviewer name, verified purchase, helpful vote, review URL or Vine fields; missing fields must remain `unknown`.
5. CLI scripts perform deterministic checks and rendering only. Review coding, theme attribution and business action generation are performed by the active Codex agent.
6. `live:smoke` is an environment preflight. Actual Sorftime MCP tool calls must be made by a MCP-enabled Codex agent.

