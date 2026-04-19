import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { csvParse } from "d3-dsv";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const study2CsvPath = path.join(projectRoot, "complementarity_future_id", "Study 2", "study2_final_data_processed.csv");
const representationPath = path.join(projectRoot, "cognitive_representation_list_zh.json");
const outputDir = path.join(projectRoot, "src", "data");
const outputPath = path.join(outputDir, "study2-benchmark.json");

function computePercentiles(sortedValues) {
  const quantile = (probability) => {
    const rank = Math.max(1, Math.ceil(sortedValues.length * probability));
    return sortedValues[rank - 1] ?? 0;
  };

  return {
    p10: quantile(0.1),
    p25: quantile(0.25),
    p50: quantile(0.5),
    p75: quantile(0.75),
    p90: quantile(0.9)
  };
}

function main() {
  const csvText = fs.readFileSync(study2CsvPath, "utf8");
  const rows = csvParse(csvText);
  const representationDb = JSON.parse(fs.readFileSync(representationPath, "utf8"));
  const zhMap = new Map(representationDb.representations.map((entry) => [entry.item, entry.item_zh]));

  const keptRows = [];
  let filteredOut = 0;

  for (const row of rows) {
    const positiveDensity = Number(row.positive_density_valued);
    const negativeDensity = Number(row.negative_density_valued);

    if (!Number.isFinite(positiveDensity) || !Number.isFinite(negativeDensity) || negativeDensity >= 1) {
      filteredOut += 1;
      continue;
    }

    keptRows.push(row);
  }

  const sortedValues = keptRows
    .map((row) => Number(row.positive_density_valued))
    .sort((left, right) => left - right);

  const sampleSize = sortedValues.length;
  const mean = sortedValues.reduce((sum, current) => sum + current, 0) / sampleSize;

  const labelCounts = new Map();
  for (const row of keptRows) {
    for (let index = 1; index <= 20; index += 1) {
      const label = row[`label${index}`];
      if (!label || label === "NA") {
        continue;
      }
      labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
    }
  }

  const topRepresentations = Array.from(labelCounts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 15)
    .map(([item, count]) => ({
      item,
      item_zh: zhMap.get(item) ?? item,
      count,
      share: Number((count / sampleSize).toFixed(6))
    }));

  const payload = {
    benchmark: {
      sourceStudy: "Study 2",
      sourceMetric: "positive_density_valued",
      filterRule: "negative_density_valued < 1",
      sampleSize,
      filteredOut,
      min: Number(sortedValues[0].toFixed(6)),
      max: Number(sortedValues[sortedValues.length - 1].toFixed(6)),
      mean: Number(mean.toFixed(6)),
      percentiles: Object.fromEntries(
        Object.entries(computePercentiles(sortedValues)).map(([key, value]) => [key, Number(value.toFixed(6))])
      ),
      sortedValues: sortedValues.map((value) => Number(value.toFixed(6)))
    },
    topRepresentations,
    notes: [
      "整体百分位基于 Study 2 的 future self complementarity（positive_density_valued）分布。",
      "按论文分析脚本的做法，negative_density_valued >= 1 的极端个案被剔除。",
      "节点层面的可视化仅表示个人网络内的相对中心性，不代表样本节点百分位。"
    ],
    generatedAt: new Date().toISOString()
  };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  console.log(`Wrote benchmark JSON to ${outputPath}`);
}

main();
