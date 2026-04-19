import { useMemo, useState } from "react";

import benchmarkDataRaw from "./data/study2-benchmark.json";
import representationsRaw from "../cognitive_representation_list_zh.json";
import { computePercentileFromSorted } from "./lib/benchmark";
import { buildDistributionBins } from "./lib/distribution";
import { buildResultNarrative } from "./lib/insights";
import { buildPairMatrix, computePersonalNetworkMetrics, type PairRating } from "./lib/network";
import { createSurveySubmission } from "./lib/payload";
import type { RepresentationDatabase, RepresentationRecord } from "./types";

type StepId = "intro" | "select" | "important" | "rate" | "result";

type BenchmarkData = typeof benchmarkDataRaw;

const benchmarkData = benchmarkDataRaw as BenchmarkData;
const representationDb = representationsRaw as RepresentationDatabase;

// step logic
const ratingScale = [
  { value: -2, label: "相互牵扯", desc: "它们在未来可能难以共存或互相削弱" },
  { value: -1, label: "略有干扰", desc: "其中一个可能会分散另一个的能量" },
  { value: 0, label: "互不影响", desc: "它们在你未来的不同轨道上运行" },
  { value: 1, label: "有所助力", desc: "其中一个能为另一个提供动力或资源" },
  { value: 2, label: "极具启发", desc: "它们完美契合，达成 1+1 > 2 的状态" }
];

function nodeKey(id: number): string {
  return `r-${id}`;
}

function normalizePairKey(source: string, target: string): string {
  return [source, target].sort((left, right) => left.localeCompare(right)).join("::");
}

function formatPercentile(percentile: number): string {
  if (percentile >= 95) return "极高内部契合";
  if (percentile >= 80) return "显著互补结构";
  if (percentile >= 60) return "稳健的关联";
  if (percentile >= 40) return "平衡的状态";
  return "初现端倪的联结";
}

function formatScore(value: number): string {
  return value.toFixed(2);
}

function App() {
  const [currentStep, setCurrentStep] = useState<StepId>("intro");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [importantNodeIds, setImportantNodeIds] = useState<string[]>([]);
  const [ratingMap, setRatingMap] = useState<Record<string, number>>({});
  const [currentPairIndex, setCurrentPairIndex] = useState(0);

  const representationByKey = useMemo(() => {
    return new Map(representationDb.representations.map((item) => [nodeKey(item.id), item]));
  }, []);

  const filteredRepresentations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return representationDb.representations;
    return representationDb.representations.filter((item) => {
      return item.item.toLowerCase().includes(query) || item.item_zh.toLowerCase().includes(query);
    });
  }, [searchQuery]);

  const selectedRepresentations = useMemo(
    () => selectedNodeIds.map((id) => representationByKey.get(id)).filter(Boolean) as RepresentationRecord[],
    [representationByKey, selectedNodeIds]
  );

  const pairList = useMemo(() => buildPairMatrix(importantNodeIds), [importantNodeIds]);
  const currentPair = pairList[currentPairIndex] ?? null;

  const submission = useMemo(() => {
    const ratings: PairRating[] = Object.entries(ratingMap).map(([key, value]) => {
      const [source, target] = key.split("::");
      return { source, target, value };
    });
    return createSurveySubmission({ selectedNodeIds, importantNodeIds, ratings });
  }, [importantNodeIds, ratingMap, selectedNodeIds]);

  const metrics = useMemo(
    () => computePersonalNetworkMetrics({ selectedNodeIds: submission.importantNodeIds, ratings: submission.ratings }),
    [submission]
  );

  const percentile = useMemo(
    () => computePercentileFromSorted(benchmarkData.benchmark.sortedValues, metrics.complementarity),
    [metrics.complementarity]
  );

  const resultNarrative = useMemo(() => {
    const topNodes = metrics.nodes.slice(0, 3).map((node) => ({
      label: representationByKey.get(node.id)?.item_zh ?? node.id
    }));
    return buildResultNarrative({ percentile, complementarity: metrics.complementarity, topNodes });
  }, [metrics.complementarity, metrics.nodes, percentile, representationByKey]);

  const distribution = useMemo(
    () => buildDistributionBins(benchmarkData.benchmark.sortedValues, metrics.complementarity, 24),
    [metrics.complementarity]
  );

  const distributionBars = useMemo(() => {
    const chartHeight = 140; // 调低一点点，给顶部留白
    const barWidth = distribution.bins.length === 0 ? 0 : 320 / distribution.bins.length;
    return distribution.bins.map((bin, index) => {
      // 动态缩放：确保最高的那根柱子正好是 chartHeight
      const height = distribution.maxCount === 0 ? 0 : (bin.count / distribution.maxCount) * chartHeight;
      return { ...bin, x: index * barWidth, width: Math.max(8, barWidth - 4), height, y: 160 - height };
    });
  }, [distribution]);

  const userLineX = useMemo(() => {
    const range = distribution.max - distribution.min || 1;
    const clamped = Math.min(distribution.max, Math.max(distribution.min, metrics.complementarity));
    return ((clamped - distribution.min) / range) * 320;
  }, [distribution.max, distribution.min, metrics.complementarity]);

  const networkNodes = useMemo(() => {
    const count = importantNodeIds.length;
    if (count === 0) return [];
    return metrics.nodes.map((node, index) => {
      const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
      const cx = 250 + Math.cos(angle) * 180;
      const cy = 250 + Math.sin(angle) * 180;
      return {
        ...node,
        label: representationByKey.get(node.id)?.item_zh ?? node.id,
        x: cx,
        y: cy,
        radius: 20 + (node.relativeCentrality / 100) * 35
      };
    });
  }, [importantNodeIds.length, metrics.nodes, representationByKey]);

  const networkEdges = useMemo(() => {
    const nodePositions = new Map(networkNodes.map((node) => [node.id, node]));
    return submission.ratings
      .filter((rating) => rating.value > 0)
      .map((rating) => {
        const source = nodePositions.get(rating.source);
        const target = nodePositions.get(rating.target);
        if (!source || !target) return null;
        return { ...rating, source, target };
      })
      .filter(Boolean) as Array<PairRating & { source: (typeof networkNodes)[number]; target: (typeof networkNodes)[number] }>;
  }, [networkNodes, submission.ratings]);

  const ratingProgress = pairList.length === 0 ? 0 : submission.ratings.length / pairList.length;

  function toggleSelected(id: string) {
    setSelectedNodeIds((current) => current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]);
    setImportantNodeIds((current) => current.filter((entry) => entry !== id));
    setRatingMap({});
    setCurrentPairIndex(0);
  }

  function toggleImportant(id: string) {
    setImportantNodeIds((current) => {
      if (current.includes(id)) return current.filter((entry) => entry !== id);
      if (current.length >= 15) return current; // 调低上限以改善体验
      return [...current, id];
    });
    setRatingMap({});
    setCurrentPairIndex(0);
  }

  function setPairRating(value: number) {
    if (!currentPair) return;
    const key = normalizePairKey(currentPair[0], currentPair[1]);
    setRatingMap((current) => ({ ...current, [key]: value }));

    // 恢复 300ms 快速响应
    setTimeout(() => {
      if (currentPairIndex === pairList.length - 1) {
        setCurrentStep("result");
      } else {
        setCurrentPairIndex((i) => i + 1);
      }
    }, 300);
  }

  function resetFlow() {
    setCurrentStep("intro");
    setSearchQuery("");
    setSelectedNodeIds([]);
    setImportantNodeIds([]);
    setRatingMap({});
    setCurrentPairIndex(0);
  }

  return (
    <div className="museum-page">
      <div className="ambience-light" />
      <main className="exhibition-hall">
        {currentStep === "intro" && (
          <section className="curated-prologue">
            <p className="curator-badge">Future Self Exhibition</p>
            <h1 className="exhibition-title">未来的你，正在形成一张图</h1>
            <div className="prologue-text">
              <p>这不仅仅是一个关于未来的测试，而是一次对“自我图谱”的深度导览。</p>
              <p>
                我们每个人对未来都有无数琐碎的想象。但研究发现，最关键的往往不是想象有多清晰，
                而是你构想中的那些部分，彼此是否能“搭得起来”。
              </p>
              <p>接下来，我们将一起挑选出你未来的线索，看它们如何交织成一个稳固的整体。</p>
            </div>
            <button className="enter-button" onClick={() => setCurrentStep("select")}>
              步入探索 <span>→</span>
            </button>
          </section>
        )}

        {currentStep !== "intro" && currentStep !== "result" && (
          <nav className="exploration-progress">
            <div className={`nav-item ${currentStep === "select" ? "active" : ""}`}>1. 捕捉线索</div>
            <div className={`nav-item ${currentStep === "important" ? "active" : ""}`}>2. 确定锚点</div>
            <div className={`nav-item ${currentStep === "rate" ? "active" : ""}`}>3. 观测共鸣</div>
          </nav>
        )}

        {currentStep === "select" && (
          <section className="gallery-section">
            <header className="section-intro">
              <h2>第一步：捕捉未来的线索</h2>
              <p>在下面 206 个碎片中，哪些让你觉得“这就是未来的我”？请尽可能真实地勾选。</p>
            </header>
            <div className="interaction-area">
              <div className="search-box">
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    placeholder="搜索线索 (中文或英文)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%' }}
                  />
                  <div className="selection-benchmark">
                    <span>已捕捉: {selectedNodeIds.length}</span>
                    <div className="benchmark-meter">
                      {/* 40-90 range marker */}
                      <div className="benchmark-range-marker" style={{ left: '33.3%', width: '41.6%' }} />
                      <div className="mini-fill" style={{ width: `${Math.min(100, (selectedNodeIds.length / 120) * 100)}%`, opacity: 0.3 }} />
                    </div>
                    <span style={{ fontSize: '0.7rem' }}>Study 2 受访者选择 40-90 个</span>
                  </div>
                </div>
              </div>
              <div className="artifact-grid">
                {filteredRepresentations.map((item) => {
                  const id = nodeKey(item.id);
                  const isSelected = selectedNodeIds.includes(id);
                  return (
                    <button key={id} className={`artifact-chip ${isSelected ? "selected" : ""}`} onClick={() => toggleSelected(id)}>
                      <span className="zh">{item.item_zh}</span>
                      <span className="en">{item.item}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <footer className="hall-footer">
              <button className="action-button primary" disabled={selectedNodeIds.length < 3} onClick={() => setCurrentStep("important")}>
                继续，确定核心锚点
              </button>
            </footer>
          </section>
        )}

        {currentStep === "important" && (
          <section className="gallery-section">
            <header className="section-intro">
              <h2>第二步：确定核心锚点</h2>
              <p>从你刚才捕捉到的线索中，挑出最不可或缺的 3-15 个。它们将构成你未来网络的主框架。</p>
            </header>
            <div className="interaction-area">
              <div className="artifact-grid">
                {selectedRepresentations.map((item) => {
                  const id = nodeKey(item.id);
                  const isSelected = importantNodeIds.includes(id);
                  return (
                    <button key={id} className={`artifact-chip featured ${isSelected ? "selected" : ""}`} onClick={() => toggleImportant(id)}>
                      <span className="zh">{item.item_zh}</span>
                      <span className="en">{item.item}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <footer className="hall-footer">
              <button className="action-button secondary" onClick={() => setCurrentStep("select")}>返回</button>
              <button className="action-button primary" disabled={importantNodeIds.length < 3} onClick={() => setCurrentStep("rate")}>
                开始观测内部共鸣
              </button>
            </footer>
          </section>
        )}

        {currentStep === "rate" && (
          <section className="gallery-section">
            <header className="section-intro">
              <h2>第三步：观测内部共鸣</h2>
              <p>未来不是静态的清单。看看这两个元素在你的想象中，是在彼此赋能，还是互相抵消？</p>
            </header>
            <div className="interaction-area central-focus">
              <div className="progress-minimal">
                完成度 {Math.round(ratingProgress * 100)}% ({currentPairIndex + 1}/{pairList.length})
              </div>
              {currentPair && (
                <div className="resonance-chamber" key={currentPairIndex}>
                  <div className="pair-display">
                    <div className="node-box">{representationByKey.get(currentPair[0])?.item_zh}</div>
                    <div className="node-link">
                      <div className="link-line" />
                      <div className="link-pulse" />
                    </div>
                    <div className="node-box">{representationByKey.get(currentPair[1])?.item_zh}</div>
                  </div>
                  <div className="rating-options-elegant">
                    {ratingScale.map((option) => (
                      <button
                        key={option.value}
                        className={`elegant-choice ${ratingMap[normalizePairKey(currentPair[0], currentPair[1])] === option.value ? "selected" : ""}`}
                        onClick={() => setPairRating(option.value)}
                      >
                        <strong>{option.label}</strong>
                        <span>{option.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <footer className="hall-footer">
              <button className="action-button secondary" onClick={() => setCurrentPairIndex(i => Math.max(0, i - 1))} disabled={currentPairIndex === 0}>上一组</button>
            </footer>
          </section>
        )}

        {currentStep === "result" && (
          <div className="exhibition-result-v2">
            {/* 顶部：核心结论与概览 */}
            <header className="result-hero">
              <div className="hero-content">
                <div className="eyebrow">The Future Atlas</div>
                <h1 className="main-percentile">{formatPercentile(percentile)}</h1>
                <p className="hero-narrative">{resultNarrative.summary}</p>
              </div>
            </header>

            <div className="result-grid-main">
              {/* 左侧：可视化图谱 */}
              <div className="exhibit-main-canvas">
                <div className="canvas-header">
                  <h3>你的未来自我图谱</h3>
                  <p className="small-muted">节点大小代表中心度，连线粗细代表互补强度</p>
                </div>
                <div className="canvas-container">
                  <svg className="main-graph-v2" viewBox="0 0 500 500">
                    <defs>
                      <filter id="glow-v2">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>
                    {networkEdges.map((edge, i) => (
                      <line key={i} className={`edge-glow strength-${edge.value}`} x1={edge.source.x} y1={edge.source.y} x2={edge.target.x} y2={edge.target.y} />
                    ))}
                    {networkNodes.map((node) => (
                      <g key={node.id} className="node-group">
                        <circle className="node-sphere" cx={node.x} cy={node.y} r={node.radius} filter="url(#glow-v2)" />
                        <text className="node-label-museum" x={node.x} y={node.y} textAnchor="middle">{node.label}</text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>

              {/* 右侧：核心支点与解析 */}
              <div className="exhibit-analysis-wing">
                <div className="note-card-v2">
                  <h3>核心支点</h3>
                  <div className="centrality-list-v2">
                    {metrics.nodes.slice(0, 5).map(node => (
                      <div key={node.id} className="centrality-item-v2">
                        <div className="item-info-v2">
                          <strong>{representationByKey.get(node.id)?.item_zh}</strong>
                          <span>{formatScore(node.weightedDegree)}</span>
                        </div>
                        <div className="mini-track-v2"><div className="mini-fill-v2" style={{ width: `${node.relativeCentrality}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="note-card-v2">
                  <h3>深层意义</h3>
                  <p className="narrative-takeaway">{resultNarrative.paperTakeaway}</p>
                </div>
              </div>
            </div>

            <div className="result-grid-footer">
              {/* 左下：理论框架 */}
              <div className="context-card">
                <h3>发现背后的机制</h3>
                <div className="theory-visual-v2">
                  <svg viewBox="0 0 320 120" className="framework-svg-v2">
                    <rect x="5" y="40" width="70" height="30" rx="6" className="theory-node" />
                    <text x="40" y="60" textAnchor="middle" className="theory-label">互补性</text>
                    
                    <rect x="105" y="40" width="70" height="30" rx="6" className="theory-node" />
                    <text x="140" y="60" textAnchor="middle" className="theory-label">活力</text>
                    
                    <rect x="205" y="15" width="90" height="30" rx="6" className="theory-node highlight" />
                    <text x="250" y="35" textAnchor="middle" className="theory-label">主动行为</text>
                    
                    <rect x="205" y="65" width="90" height="30" rx="6" className="theory-node" />
                    <text x="250" y="85" textAnchor="middle" className="theory-label">职业适应性</text>

                    <path d="M 75 55 L 100 55" className="theory-arrow" markerEnd="url(#arrowhead)" />
                    <path d="M 175 55 L 200 35" className="theory-arrow" markerEnd="url(#arrowhead)" />
                    <path d="M 175 55 L 200 80" className="theory-arrow" markerEnd="url(#arrowhead)" />
                    
                    <defs>
                      <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                        <polygon points="0 0, 6 3, 0 6" fill="var(--accent-primary)" />
                      </marker>
                    </defs>
                  </svg>
                </div>
                <p className="tiny-text">论文揭示了“互补性”如何通过激发“内在活力”来驱动个体更积极地塑造自己的职业生涯。</p>
              </div>

              {/* 右下：样本分布 */}
              <div className="context-card" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0, textAlign: 'left', fontSize: '1rem', color: '#111', textTransform: 'none', letterSpacing: 'normal' }}>互补性得分分布 (Study 2)</h3>
                  <div className="legend-v2">
                    <div className="legend-item">
                      <div className="legend-box sample"></div>
                      <span>全样本 (565)</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-box user"></div>
                      <span>你的位置</span>
                    </div>
                  </div>
                </div>
                
                <div className="dist-container-v2">
                  <svg className="mini-distribution-v2" viewBox="0 0 380 190" overflow="visible">
                    {/* Y 轴刻度：放在左侧边距，不进绘图区 */}
                    {[0, 0.25, 0.5, 0.75, 1.0].map((p) => {
                      const yVal = 160 - p * 140;
                      const labelVal = Math.round(p * distribution.maxCount);
                      return (
                        <text key={p} x="42" y={yVal + 4} textAnchor="end" className="axis-label-v2 dist-y-tick">
                          {labelVal}
                        </text>
                      );
                    })}
                    <text x="14" y="82" className="dist-y-axis-title" transform="rotate(-90 14 82)">
                      样本人数
                    </text>

                    <g className="dist-plot-area" transform="translate(48, 0)">
                      {[0, 0.25, 0.5, 0.75, 1.0].map((p) => {
                        const yVal = 160 - p * 140;
                        return <line key={p} className="dist-grid-line" x1="0" y1={yVal} x2="320" y2={yVal} />;
                      })}

                      {distributionBars.map((bar, i) => (
                        <rect
                          key={i}
                          className={`dist-bar ${bar.containsUserScore ? "user" : ""}`}
                          x={bar.x}
                          y={bar.y}
                          width={bar.width}
                          height={bar.height}
                        />
                      ))}

                      <g className="user-marker-v2">
                        <line className="dist-line" x1={userLineX} y1="0" x2={userLineX} y2="160" />
                        <text x={userLineX} y="-15" textAnchor="middle" className="user-tag">
                          你在这里
                        </text>
                      </g>

                      <line x1="0" y1="160" x2="320" y2="160" stroke="#ccc" strokeWidth="1" />

                      {[0, 0.5, 1.0, 1.5, 2.0].map((val) => {
                        const x = (val / 2.0) * 320;
                        return (
                          <text key={val} x={x} y="185" textAnchor="middle" className="axis-label-v2">
                            {val.toFixed(1)}
                          </text>
                        );
                      })}
                    </g>
                  </svg>
                  
                  <div className="dist-meta">
                    <div className="meta-item">
                      <label>你的得分</label>
                      <span>{formatScore(metrics.complementarity)}</span>
                    </div>
                    <div className="meta-item">
                      <label>全样本中位数</label>
                      <span>{formatScore(benchmarkData.benchmark.percentiles.p50)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <footer className="result-footer-actions">
              <button className="action-button primary large" onClick={resetFlow}>重新开始探索</button>
            </footer>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
