export type PairRating = {
  source: string;
  target: string;
  value: number;
};

export type PersonalNetworkInput = {
  selectedNodeIds: string[];
  ratings: PairRating[];
};

export type PersonalNodeMetric = {
  id: string;
  weightedDegree: number;
  relativeCentrality: number;
};

export type PersonalNetworkMetrics = {
  nodeCount: number;
  positiveTieCount: number;
  complementarity: number;
  nodes: PersonalNodeMetric[];
};

export function buildPairMatrix(nodeIds: string[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];

  for (let i = 0; i < nodeIds.length; i += 1) {
    for (let j = i + 1; j < nodeIds.length; j += 1) {
      pairs.push([nodeIds[i], nodeIds[j]]);
    }
  }

  return pairs;
}

export function computePersonalNetworkMetrics(input: PersonalNetworkInput): PersonalNetworkMetrics {
  const nodeIds = [...input.selectedNodeIds];
  const weightedDegreeMap = new Map<string, number>(nodeIds.map((nodeId) => [nodeId, 0]));

  let positiveTieCount = 0;
  let valuedTieSum = 0;

  for (const rating of input.ratings) {
    const positiveValue = rating.value > 0 ? rating.value : 0;
    if (positiveValue === 0) {
      continue;
    }

    valuedTieSum += positiveValue;
    positiveTieCount += 1;
    weightedDegreeMap.set(rating.source, (weightedDegreeMap.get(rating.source) ?? 0) + positiveValue);
    weightedDegreeMap.set(rating.target, (weightedDegreeMap.get(rating.target) ?? 0) + positiveValue);
  }

  const maxPossibleTies = (nodeIds.length * (nodeIds.length - 1)) / 2;
  const complementarity = maxPossibleTies === 0 ? 0 : Number((valuedTieSum / maxPossibleTies).toFixed(6));
  const maxWeightedDegree = Math.max(...Array.from(weightedDegreeMap.values()), 0);

  const nodes = nodeIds
    .map((id) => {
      const weightedDegree = weightedDegreeMap.get(id) ?? 0;
      const relativeCentrality = maxWeightedDegree === 0 ? 0 : Number(((weightedDegree / maxWeightedDegree) * 100).toFixed(6));
      return {
        id,
        weightedDegree,
        relativeCentrality
      };
    })
    .sort((left, right) => right.weightedDegree - left.weightedDegree || left.id.localeCompare(right.id));

  return {
    nodeCount: nodeIds.length,
    positiveTieCount,
    complementarity,
    nodes
  };
}
