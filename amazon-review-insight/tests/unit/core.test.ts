import { describe, expect, it } from "vitest";
import reviewsFixture from "../fixtures/sorftime_single_asin_reviews.json" with { type: "json" };
import detailFixture from "../fixtures/sorftime_product_detail.json" with { type: "json" };
import {
  computeReviewHealth,
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
  });

  it("computes health metrics with Review sample size as denominator", () => {
    const reviews = parseSorftimeReviews(reviewsFixture, "B0DHPN1DMJ");
    const health = computeReviewHealth(reviews, 708);
    expect(health.review_sample_size).toBe(3);
    expect(health.asin_total_review_count).toBe(708);
    expect(health.positive_percentage).toBe(66.7);
    expect(health.negative_percentage).toBe(33.3);
  });
});

