import { describe, expect, it } from "vitest";

import { buildDistributionBins } from "./distribution";

describe("buildDistributionBins", () => {
  it("groups sample values into bins and marks the user's score bin", () => {
    const result = buildDistributionBins([0.2, 0.4, 0.7, 0.8, 1.1, 1.4, 1.8], 1.05, 4);

    expect(result.bins).toHaveLength(4);
    expect(result.maxCount).toBe(2);
    expect(result.userScore).toBe(1.05);
    expect(result.bins.map((bin) => bin.count)).toEqual([2, 2, 2, 1]);
    expect(result.bins.some((bin) => bin.containsUserScore)).toBe(true);
    expect(result.bins.find((bin) => bin.containsUserScore)).toEqual(
      expect.objectContaining({
        start: 1,
        end: 1.4,
        count: 2
      })
    );
  });
});
