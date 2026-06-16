import { describe, expect, it } from "vitest";
import reviewsFixture from "../fixtures/sorftime_single_asin_reviews.json" with { type: "json" };
import detailFixture from "../fixtures/sorftime_product_detail.json" with { type: "json" };
import {
  computeReviewHealth,
  deliveryFileName,
  highlightEvidenceSentences,
  isValidAsin,
  parseProductDetail,
  parseSorftimeReviews
} from "../../scripts/core.js";

describe("core parsing and metrics", () => {
  it("validates Amazon ASIN format", () => {
    expect(isValidAsin("B0DHPN1DMJ")).toBe(true);
    expect(isValidAsin("bad")).toBe(false);
  });

  it("parses Sorftime product_reviews Chinese fields", () => {
    const reviews = parseSorftimeReviews(reviewsFixture, "B0DHPN1DMJ");
    expect(reviews).toHaveLength(3);
    expect(reviews[0].review_date).toBe("2025-01-31");
    expect(reviews[0].rating).toBe(5);
    expect(reviews[0].raw).toHaveProperty("评论");
  });

  it("parses product_detail ASIN total review count", () => {
    const detail = parseProductDetail(detailFixture, "B0DHPN1DMJ");
    expect(detail.asin_total_review_count).toBe(708);
    expect(detail.rating).toBe(4.5);
    expect(detail.brand).toBe("Ikarao");
    expect(detail.main_image).toBe("https://example.com/image.jpg");
    expect(detail.category).toBe("KARAOKE MACHINE");
    expect(detail.root_category).toBe("Musical Instruments（排名:999）");
    expect(detail.leaf_category).toBe("Portable Systems（排名:12）");
    expect(detail.launch_date).toBe("2024-01-01");
  });

  it("computes health metrics with Review sample size as denominator", () => {
    const reviews = parseSorftimeReviews(reviewsFixture, "B0DHPN1DMJ");
    const health = computeReviewHealth(reviews, 708);
    expect(health.review_sample_size).toBe(3);
    expect(health.asin_total_review_count).toBe(708);
    expect(health.positive_percentage).toBe(66.7);
    expect(health.negative_percentage).toBe(33.3);
    expect(health.earliest_review_date).toBe("2025-01-31");
    expect(health.latest_review_date).toBe("2025-02-02");
  });

  it("generates delivery filenames with date and ASIN prefix", () => {
    const date = new Date(2026, 5, 16);
    expect(deliveryFileName("B0CR1R7FKP", "review-insight-report", "html", date))
      .toBe("20260616-B0CR1R7FKP-review-insight-report.html");
    expect(deliveryFileName("b0cr1r7fkp", "review coding", ".xlsx", date))
      .toBe("20260616-B0CR1R7FKP-review-coding.xlsx");
  });

  it("highlights complete evidence sentences with semantic classes", () => {
    const html = highlightEvidenceSentences(
      "The microphones worked well. The battery did not last through the whole party.",
      [{
        original: "The battery did not last through the whole party.",
        translation: "电池没有支撑完整个聚会。",
        evidence_type: "negative",
        target: "theme_battery_party"
      }],
      "original"
    );
    expect(html).toContain('<mark class="evidence-highlight evidence-negative"');
    expect(html).toContain("The battery did not last through the whole party.");
    expect(html).not.toContain("<mark><mark");
  });
});
