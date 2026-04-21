# fit

基于 TypeScript + Vite 的训练记录网页（可部署到 GitHub Pages）。

## 项目结构

- `src/main.ts`: 应用主入口（状态管理、渲染、事件绑定）
- `src/data.ts`: 配置、系统动作、训练计划
- `src/types.ts`: 核心类型定义
- `doc/architecture.md`: 模块职责、扩展与兼容指南
- `styles.css`: 全局样式
- `index.html`: 页面容器 + 模块入口
- `vite.config.ts`: 构建配置（`base: /fit/`）

## 本地开发

```bash
npm install
npm run dev
```

## 类型检查与构建

```bash
npm run typecheck
npm run build
```

构建产物在 `dist/`。

## 部署到 GitHub Pages

你现在的仓库地址是 `https://xiaoming0016.github.io/fit/`，可继续沿用。

推荐两种方式：

1. 在 GitHub Actions 中执行 `npm ci && npm run build`，然后发布 `dist/`
2. 本地构建后，把 `dist/` 内容发布到 Pages 分支（如 `gh-pages`）

只要发布的是 `dist/`，页面就可以正常访问。