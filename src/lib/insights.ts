export type NarrativeInput = {
  percentile: number;
  complementarity: number;
  topNodes: Array<{ label: string }>;
};

export type ResultNarrative = {
  summary: string;
  connections: string;
  paperTakeaway: string;
};

function describePercentile(percentile: number): string {
  if (percentile >= 80) {
    return "前 20%";
  }
  if (percentile >= 60) {
    return "前 40%";
  }
  if (percentile >= 40) {
    return "中间区间";
  }
  return "后 40%";
}

export function buildResultNarrative(input: NarrativeInput): ResultNarrative {
  const topLabels = input.topNodes.map((node) => node.label);
  const joinedLabels = topLabels.length > 0 ? topLabels.join("、") : "你选中的几个关键表征";
  const percentileTier = describePercentile(input.percentile);

  let reflection = "";
  if (input.percentile >= 70) {
    reflection = "这意味着你想象中的未来自我高度整合，内部充满了彼此支持、强效共鸣的元素。";
  } else if (input.percentile >= 40) {
    reflection = "这说明你的未来自我具有一定的内在逻辑，核心表征之间能够形成有效的协同，为你提供稳定的心理支撑。";
  } else {
    reflection = "这暗示你当前的未来愿景可能包含多个尚在探索中的侧面，虽然它们尚未完全交织成紧密的网，但也预示了未来多样的可能性。";
  }

  return {
    summary: `你的整体互补性（Complementarity）得分为 ${input.complementarity.toFixed(2)}，大约位于研究样本的 ${percentileTier}。${reflection}`,
    connections: `在你的图谱里，${joinedLabels} 位于更核心的位置，它们是你未来想象中连接最紧密的“支点”。`,
    paperTakeaway:
      "论文揭示了：未来自我不仅仅要追求“清晰”，更重要的是内部各元素能否“互补”。高互补性的网络能激发更强的内在活力（Vitality），从而驱动更积极的职业塑造行为。"
  };
}
