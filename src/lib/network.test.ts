import { describe, expect, it } from "vitest";

import { buildPairMatrix, computePersonalNetworkMetrics } from "./network";

describe("buildPairMatrix", () => {
  it("creates all unique node pairs in upper-triangle order", () => {
    const pairs = buildPairMatrix(["a", "b", "c", "d"]);

    expect(pairs).toEqual([
      ["a", "b"],
      ["a", "c"],
      ["a", "d"],
      ["b", "c"],
      ["b", "d"],
      ["c", "d"]
    ]);
  });
});

describe("computePersonalNetworkMetrics", () => {
  it("computes complementarity and weighted centrality from pair ratings", () => {
    const metrics = computePersonalNetworkMetrics({
      selectedNodeIds: ["a", "b", "c"],
      ratings: [
        { source: "a", target: "b", value: 2 },
        { source: "a", target: "c", value: 1 },
        { source: "b", target: "c", value: -2 }
      ]
    });

    expect(metrics.nodeCount).toBe(3);
    expect(metrics.positiveTieCount).toBe(2);
    expect(metrics.complementarity).toBeCloseTo(1, 6);
    expect(metrics.nodes).toEqual([
      expect.objectContaining({ id: "a", weightedDegree: 3, relativeCentrality: 100 }),
      expect.objectContaining({ id: "b", weightedDegree: 2, relativeCentrality: 66.666667 }),
      expect.objectContaining({ id: "c", weightedDegree: 1, relativeCentrality: 33.333333 })
    ]);
  });
});
