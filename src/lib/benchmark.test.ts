import { describe, expect, it } from "vitest";

import {
  computeBenchmarkSummary,
  computePercentileFromSorted
} from "./benchmark";

describe("computePercentileFromSorted", () => {
  it("returns percentile rank based on empirical distribution", () => {
    const sorted = [0.4, 0.8, 1.2, 1.6, 2.0];

    expect(computePercentileFromSorted(sorted, 1.2)).toBe(60);
    expect(computePercentileFromSorted(sorted, 1.9)).toBe(80);
    expect(computePercentileFromSorted(sorted, 0.1)).toBe(0);
  });
});

describe("computeBenchmarkSummary", () => {
  it("filters extreme negative density cases and builds benchmark percentiles", () => {
    const rows = [
      { positive_density_valued: "0.4", negative_density_valued: "0.2" },
      { positive_density_valued: "1.0", negative_density_valued: "0.0" },
      { positive_density_valued: "1.4", negative_density_valued: "1.4" },
      { positive_density_valued: "1.8", negative_density_valued: "0.3" }
    ];

    const summary = computeBenchmarkSummary(rows);

    expect(summary.sampleSize).toBe(3);
    expect(summary.filteredOut).toBe(1);
    expect(summary.min).toBe(0.4);
    expect(summary.max).toBe(1.8);
    expect(summary.mean).toBeCloseTo(1.0666667, 6);
    expect(summary.percentiles.p50).toBe(1);
    expect(summary.percentiles.p90).toBe(1.8);
  });
});
