export type DistributionBin = {
  start: number;
  end: number;
  count: number;
  containsUserScore: boolean;
};

export type DistributionSummary = {
  bins: DistributionBin[];
  maxCount: number;
  userScore: number;
  min: number;
  max: number;
};

export function buildDistributionBins(
  values: number[],
  userScore: number,
  desiredBinCount = 20
): DistributionSummary {
  if (values.length === 0) {
    return {
      bins: [],
      maxCount: 0,
      userScore,
      min: 0,
      max: 0
    };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const safeBinCount = Math.max(1, desiredBinCount);
  const range = max - min || 1;
  const binWidth = range / safeBinCount;

  const bins: DistributionBin[] = Array.from({ length: safeBinCount }, (_, index) => {
    const start = Number((min + index * binWidth).toFixed(6));
    const isLastBin = index === safeBinCount - 1;
    const end = isLastBin ? max : Number((min + (index + 1) * binWidth).toFixed(6));
    return {
      start,
      end,
      count: 0,
      containsUserScore: false
    };
  });

  for (const value of values) {
    const rawIndex = Math.floor((value - min) / binWidth);
    const index = Math.min(safeBinCount - 1, Math.max(0, rawIndex));
    bins[index].count += 1;
  }

  for (const bin of bins) {
    const inRange =
      userScore >= bin.start &&
      (userScore < bin.end || (bin.end === max && userScore <= bin.end));
    if (inRange) {
      bin.containsUserScore = true;
    }
  }

  return {
    bins,
    maxCount: Math.max(...bins.map((bin) => bin.count)),
    userScore,
    min,
    max
  };
}
