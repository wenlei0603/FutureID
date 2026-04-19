import { describe, expect, it } from "vitest";

import { createSurveySubmission } from "./payload";

describe("createSurveySubmission", () => {
  it("builds a stable computation payload from selected nodes and ratings", () => {
    const payload = createSurveySubmission({
      selectedNodeIds: ["n3", "n1", "n2"],
      importantNodeIds: ["n2", "n1"],
      ratings: [
        { source: "n2", target: "n1", value: 2 },
        { source: "n3", target: "n1", value: -1 }
      ]
    });

    expect(payload.selectedNodeIds).toEqual(["n1", "n2", "n3"]);
    expect(payload.importantNodeIds).toEqual(["n1", "n2"]);
    expect(payload.ratings).toEqual([
      { source: "n1", target: "n2", value: 2 },
      { source: "n1", target: "n3", value: -1 }
    ]);
  });
});
