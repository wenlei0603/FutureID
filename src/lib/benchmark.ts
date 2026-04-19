export type BenchmarkRow = {
  positive_density_valued: string | number;
  negative_density_valued: string | number;
};

export type BenchmarkSummary = {
  sampleSize: number;
  filteredOut: number;
  min: number;
  max: number;
  mean: number;
  sortedValues: number[];
  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
};

const NEGATIVE_DENSITY_OUTLIER_THRESHOLD = 1;

function toFiniteNumber(value: string | number): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function quantile(sortedValues: number[], probability: number): number {
  if (sortedValues.length === 0) {
    return 0;
  }

  const boundedProbability = Math.min(Math.max(probability, 0), 1);
  const rank = Math.max(1, Math.ceil(sortedValues.length * boundedProbability));
  return sortedValues[rank - 1];
}

export function computePercentileFromSorted(sortedValues: number[], value: number): number {
  if (sortedValues.length === 0) {
    return 0;
  }

  let lessThanOrEqualCount = 0;
  for (const entry of sortedValues) {
    if (entry <= value) {
      lessThanOrEqualCount += 1;
    }
  }

  return Number(((lessThanOrEqualCount / sortedValues.length) * 100).toFixed(6));
}

export function computeBenchmarkSummary(rows: BenchmarkRow[]): BenchmarkSummary {
  const values: number[] = [];
  let filteredOut = 0;

  for (const row of rows) {
    const positiveDensity = toFiniteNumber(row.positive_density_valued);
    const negativeDensity = toFiniteNumber(row.negative_density_valued);

    if (positiveDensity === null || negativeDensity === null) {
      filteredOut += 1;
      continue;
    }

    if (negativeDensity >= NEGATIVE_DENSITY_OUTLIER_THRESHOLD) {
      filteredOut += 1;
      continue;
    }

    values.push(positiveDensity);
  }

  const sortedValues = [...values].sort((a, b) => a - b);
  const sampleSize = sortedValues.length;
  const mean = sampleSize === 0 ? 0 : sortedValues.reduce((sum, current) => sum + current, 0) / sampleSize;

  return {
    sampleSize,
    filteredOut,
    min: sampleSize === 0 ? 0 : sortedValues[0],
    max: sampleSize === 0 ? 0 : sortedValues[sampleSize - 1],
    mean: Number(mean.toFixed(6)),
    sortedValues,
    percentiles: {
      p10: Number(quantile(sortedValues, 0.1).toFixed(6)),
      p25: Number(quantile(sortedValues, 0.25).toFixed(6)),
      p50: Number(quantile(sortedValues, 0.5).toFixed(6)),
      p75: Number(quantile(sortedValues, 0.75).toFixed(6)),
      p90: Number(quantile(sortedValues, 0.9).toFixed(6))
    }
  };
}
