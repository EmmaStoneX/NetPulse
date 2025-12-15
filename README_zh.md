# NetPulse: 事件视界

[English](./README.md)
---

## 🌏 简介

**NetPulse: 事件视界** 是一款基于搜索增强生成的智能互联网事件分析器。它能将零散的网络信息转化为结构化的深度洞察，为重大的科技与互联网事件提供实时摘要、核心影响分析以及历史镜像对比。

**架构升级**: 本项目现已采用基于 **Cloudflare Workers** 的 **BFF (Backend-for-Frontend)** 架构。所有的 API 调用（Tavily 搜索和 Gemini 分析）均在服务端安全执行，彻底杜绝了 API Key 在前端泄露的风险。

## ✨ 核心功能

- **搜索增强 (RAG)**：集成 **Tavily API** 获取实时、准确的网络上下文，大幅降低大模型幻觉。
- **深度分析**：由 **Gemini 3 Pro** 模型驱动（通过 OpenAI 兼容协议调用），生成专业记者级的分析报告。
- **历史回响**：独创功能，自动将当前事件与历史上的类似事件进行对比，寻找历史的韵脚。
- **安全架构**：API Key 存储在 Cloudflare Worker 的加密环境变量中。前端仅与自建后端 (`/api/analyze`) 通信。
- **响应式设计**：基于 **Tailwind CSS** 构建的现代化“玻璃拟态”界面，完美适配手机、平板和桌面端。

## 🛠 技术栈

- **前端框架**: React 19, TypeScript, Vite
- **后端运行时**: Cloudflare Workers (TypeScript)
- **样式库**: Tailwind CSS, Lucide React (图标)
- **AI 模型**: Google Gemini 3 Pro Preview (通过 OpenAI 兼容接口访问)
- **搜索引擎**: Tavily AI Search API

## 🧱 构建说明

- 在 `index.html` 中通过 CDN 引入 Tailwind CSS，本项目没有 PostCSS/Tailwind 的构建管线。更新样式时请保留该 CDN 脚本标签，避免因为缺少插件导致构建失败。

## 🚀 快速开始

### 前置要求
- Node.js (v18+) 或 Bun
- **Tavily API Key** (用于实时搜索)
- **Gemini API Key** (或支持 OpenAI 格式的中转 Key)

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/your-username/netpulse.git
   cd netpulse
   ```

2. **安装依赖**
   ```bash
   npm install
   # 或者
   bun install
   ```

3. **本地开发 (全栈)**
   启动前端开发服务器：
   ```bash
   npm run dev
   ```
   *注：若要测试包含后端 API 的完整流程，建议使用 `npx wrangler dev`。*

## 📦 部署指南

本项目配置为 **Cloudflare Worker** 模式，同时托管静态资源。

1. **构建前端**
   ```bash
   npm run build
   ```
   这将在 `dist` 目录生成静态文件。

2. **部署到 Cloudflare**
   ```bash
   npx wrangler deploy
   ```
   *注：此命令会使用 `wrangler.json` 配置文件，其中指定了 `worker.ts` 为主入口。*

3. **配置环境变量**
   部署完成后，前往 **Cloudflare 控制台** -> **Workers & Pages** -> 选择你的 Worker -> **设置 (Settings)** -> **变量 (Variables)**。
   添加以下变量（建议保存为 **加密/Secret** 类型）：
   - `VITE_GEMINI_API_KEY`: 你的 Gemini 或 OpenAI 中转 API Key。
   - `VITE_TAVILY_API_KEY`: 你的 Tavily API Key。

   > **重要提示**: 添加变量后，请务必在控制台点击“重试部署 (Retry deployment)”或重新运行部署命令，以使变量生效。

## ⚖️ License

&copy; 2025 Cyberceratops. All rights reserved.