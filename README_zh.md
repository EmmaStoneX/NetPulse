# NetPulse: 事件视界

[English](./README.md)

---

## 🌏 简介

**NetPulse: 事件视界** 是一款基于搜索增强生成的智能互联网事件分析器。它能将零散的网络信息转化为结构化的深度洞察，为重大的科技与互联网事件提供实时摘要、核心影响分析以及历史镜像对比。
<p align="center">
  <img src="https://img.0rzz.ggff.net/netpulse_chs.png" alt="NetPulse 界面预览" width="100%">
</p>


**架构升级**: 本项目现已采用基于 **Cloudflare Workers** 的 **BFF (Backend-for-Frontend)** 架构。所有的 API 调用（Tavily 搜索和 Gemini 分析）均在服务端安全执行，彻底杜绝了 API Key 在前端泄露的风险。

## ✨ 核心功能

- **双语支持**：完整的国际化 (i18n) 支持，中英文界面自由切换，API 响应也会根据语言自动调整。
- **搜索增强 (RAG)**：集成 **Tavily API** 获取实时、准确的网络上下文，大幅降低大模型幻觉。
- **双模式分析**：
  - **快速模式** (~15秒)：使用 Gemini 3.0 Flash 快速扫描
  - **深度模式** (~60秒)：使用 Gemini 3.0 Pro 深度分析
- **自定义 API Key**：高级用户可配置自己的搜索服务（Tavily/Exa）和大模型服务（Gemini/DeepSeek/OpenAI/Claude 或自定义端点）的 API Key。
- **历史回响**：独创功能，自动将当前事件与历史上的类似事件进行对比，寻找历史的韵脚。
- **分享功能**：生成短链接分享分析结果，数据存储在 Cloudflare KV 中，30 天有效期。
- **安全架构**：API Key 存储在 Cloudflare Worker 的加密环境变量中。前端仅与自建后端 (`/api/analyze`) 通信。
- **响应式设计**：基于 **Tailwind CSS** 构建的现代化"玻璃拟态"界面，完美适配手机、平板和桌面端。
- **沉浸式体验**：全新的"事件视界"太空主题，配备交互式粒子背景和流畅的动画效果。
- **动态热门话题**：实时获取热门话题，按语言分别缓存。

## 🛠 技术栈

| 层级 | 技术 |
|------|-----|
| **前端** | React 19, TypeScript, Vite, i18next |
| **后端** | Cloudflare Workers (JavaScript) |
| **样式** | Tailwind CSS, Lucide React (图标) |
| **AI 模型** | Google Gemini 3.0 Pro / Gemini 3.0 Flash |
| **搜索引擎** | Tavily AI Search API |
| **存储** | Cloudflare KV (用于分享链接) |

## 📁 项目结构

```
NetPulse/
├── App.tsx                 # 主应用组件
├── i18n.ts                 # i18next 配置
├── locales/
│   ├── zh/translation.json # 中文翻译
│   └── en/translation.json # 英文翻译
├── components/
│   ├── Header.tsx          # 头部（含语言切换器）
│   ├── ParticleBackground.tsx # 交互式粒子背景
│   ├── SearchBar.tsx       # 搜索界面（含热门话题）
│   ├── ResultView.tsx      # 分析结果展示
│   ├── ShareButton.tsx     # 分享按钮组件
│   ├── ShareModal.tsx      # 分享配置弹窗
│   ├── SharedView.tsx      # 分享视图页面
│   ├── SettingsPanel.tsx   # 自定义 API Key 设置面板
│   ├── LanguageSwitcher.tsx# 响应式语言切换组件
│   ├── PrivacyPolicy.tsx   # 隐私政策页面
│   └── TermsOfService.tsx  # 使用条款页面
├── utils/
│   ├── shareUtils.ts       # 分享链接编解码工具
│   └── apiConfigStore.ts   # API 配置存储
├── services/
│   ├── geminiService.ts    # API 服务层
│   └── directApiService.ts # 自定义 Key 直接调用服务
├── types/
│   └── apiConfig.ts        # API 配置类型定义
└── backend/
    └── worker-i18n-v2.js   # Cloudflare Worker 后端（最新版）
```

## 🚀 快速开始

### 前置要求
- Node.js (v18+) 或 Bun
- **Tavily API Key** (用于实时搜索)
- **Gemini API Key** (或支持 OpenAI 格式的中转 Key)

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/EmmaStoneX/NetPulse.git
   cd NetPulse
   ```

2. **安装依赖**
   ```bash
   npm install
   # 或者
   bun install
   ```

3. **本地开发**
   ```bash
   npm run dev
   ```

## 📦 部署指南

本项目采用 **Cloudflare Workers with Static Assets** 统一部署方案，前后端一起部署。

### 自动化部署

1. 将 GitHub 仓库连接到 Cloudflare Workers & Pages
2. 推送到 `main` 分支即可触发自动构建和部署
3. Cloudflare 会自动构建前端 (`npm run build`) 并与 Worker 后端一起部署

### 环境变量配置

在 Cloudflare Worker 设置中添加以下密钥（**设置** → **变量和机密**）：
- `GEMINI_API_KEY`: 你的 Gemini 或 OpenAI 中转 API Key
- `GEMINI_PROXY_URL`: Gemini API 代理地址（可选，默认使用 Google 官方端点）
  - 如果使用中转服务，填写中转站地址，如 `https://api.example.com`
  - 留空则使用 Google 官方端点 `https://generativelanguage.googleapis.com`
- `TAVILY_API_KEY_1`: 你的第一个 Tavily API Key
- `TAVILY_API_KEY_2`: 你的第二个 Tavily API Key（可选）
- `TAVILY_API_KEY_3`: 你的第三个 Tavily API Key（可选）
- ... 最多支持到 `TAVILY_API_KEY_10`

> **多 Key 轮询**：NetPulse 支持配置最多 10 个 Tavily API Key，自动进行 Round-Robin 负载均衡。这有助于分散 API 调用量，避免单个 Key 触发速率限制。如果你只有一个 Key，配置 `TAVILY_API_KEY_1` 即可。

### KV 命名空间（用于分享链接）

1. 在 Cloudflare 控制台创建名为 `SHARE_DATA` 的 KV 命名空间（**存储和数据库** → **KV**）
2. 绑定配置已在 `wrangler.json` 中设置好，只需将 `id` 更新为你的 KV 命名空间 ID

## 🌐 API 接口

| 接口 | 方法 | 描述 |
|-----|------|-----|
| `/api/analyze` | POST | 基于搜索增强分析查询 |
| `/api/trending` | GET | 获取热门话题（支持 `?lang=zh` 或 `?lang=en`） |
| `/api/share` | POST | 创建分享链接（数据存储到 KV） |
| `/api/share/:id` | GET | 根据 ID 获取分享的分析数据 |


## 📧 联系方式

- 法律事务: legal@zxvmax.site
- 隐私问题: privacy@zxvmax.site
