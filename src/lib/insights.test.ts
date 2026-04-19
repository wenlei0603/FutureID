import { describe, expect, it } from "vitest";

import { buildResultNarrative } from "./insights";

describe("buildResultNarrative", () => {
  it("summarizes percentile tier and strongest nodes in Chinese", () => {
    const narrative = buildResultNarrative({
      percentile: 82,
      complementarity: 1.27,
      topNodes: [
        { label: "与他人合作" },
        { label: "有抱负" },
        { label: "积极乐观" }
      ]
    });

    expect(narrative.summary).toContain("前 20%");
    expect(narrative.summary).toContain("1.27");
    expect(narrative.connections).toContain("与他人合作");
    expect(narrative.connections).toContain("有抱负");
  });
});
