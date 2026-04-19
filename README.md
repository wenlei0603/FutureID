# FutureID（未来自我互补性 · 互动前端）

基于 Study 2 预计算基准的静态问卷与结果可视化。部署后为纯静态站点，**不包含**原始 CSV / 研究材料；更新分布基准请在本地运行 `npm run build:benchmark` 后重新构建并部署。

## 开发与构建

```bash
npm install
npm run build        # 生产包在 dist/
npm run dev          # 本地开发
npm test
```

若需从本地数据重新生成 `src/data/study2-benchmark.json`（仓库不附带 `complementarity_future_id/`）：

将 Study 2 处理后的 CSV 放到本机约定路径后执行 `npm run build:benchmark`，或自行维护 `study2-benchmark.json` 后执行 `npm run build`。

## 部署

将 `dist/` 目录部署到任意静态托管（GitHub Pages、Vercel、Netlify 等）。基准与分布图随 **构建时** 的 JSON 固定，不会随远程数据表自动变化。
