# NetPulse: 事件视界

[English](./README.md)

---

## 🌏 简介

**NetPulse: 事件视界** 是一款基于搜索增强生成的智能互联网事件分析器。它能将零散的网络信息转化为结构化的深度洞察，为重大的科技与互联网事件提供实时摘要、核心影响分析以及历史镜像对比。

**架构升级**: 本项目现已采用基于 **Cloudflare Workers** 的 **BFF (Backend-for-Frontend)** 架构。所有的 API 调用（Tavily 搜索和 Gemini 分析）均在服务端安全执行，彻底杜绝了 API Key 在前端泄露的风险。

## ✨ 核心功能

- **双语支持**：完整的国际化 (i18n) 支持，中英文界面自由切换，API 响应也会根据语言自动调整。
- **搜索增强 (RAG)**：集成 **Tavily API** 获取实时、准确的网络上下文，大幅降低大模型幻觉。
- **双模式分析**：
  - **快速模式** (~15秒)：使用 Gemini 2.5 Flash 快速扫描
  - **深度模式** (~60秒)：使用 Gemini 3 Pro 深度分析
- **历史回响**：独创功能，自动将当前事件与历史上的类似事件进行对比，寻找历史的韵脚。
- **安全架构**：API Key 存储在 Cloudflare Worker 的加密环境变量中。前端仅与自建后端 (`/api/analyze`) 通信。
- **响应式设计**：基于 **Tailwind CSS** 构建的现代化"玻璃拟态"界面，完美适配手机、平板和桌面端。
- **动态热门话题**：实时获取热门话题，按语言分别缓存。

## 🛠 技术栈

| 层级 | 技术 |
|------|-----|
| **前端** | React 19, TypeScript, Vite, i18next |
| **后端** | Cloudflare Workers (JavaScript) |
| **样式** | Tailwind CSS, Lucide React (图标) |
| **AI 模型** | Google Gemini 3 Pro Preview / Gemini 2.5 Flash |
| **搜索引擎** | Tavily AI Search API |

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
│   ├── SearchBar.tsx       # 搜索界面（含热门话题）
│   ├── ResultView.tsx      # 分析结果展示
│   ├── LanguageSwitcher.tsx# 响应式语言切换组件
│   ├── PrivacyPolicy.tsx   # 隐私政策页面
│   └── TermsOfService.tsx  # 使用条款页面
├── services/
│   └── geminiService.ts    # API 服务层
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

### 前端 (Cloudflare Pages)

前端通过 GitHub 集成自动部署，只需推送到 `main` 分支即可。

### 后端 (Cloudflare Workers)

1. 前往 **Cloudflare 控制台** → **Workers & Pages** → 你的 Worker
2. 点击 **Edit Code** 或 **Quick Edit**
3. **全选并替换**为 `backend/worker-i18n-v2.js` 的内容
4. 点击 **Save and Deploy**

### 环境变量配置

在 Cloudflare Worker 设置中添加以下密钥：
- `GEMINI_API_KEY`: 你的 Gemini 或 OpenAI 中转 API Key
- `TAVILY_API_KEY`: 你的 Tavily API Key

## 🌐 API 接口

| 接口 | 方法 | 描述 |
|-----|------|-----|
| `/api/analyze` | POST | 基于搜索增强分析查询 |
| `/api/trending` | GET | 获取热门话题（支持 `?lang=zh` 或 `?lang=en`） |

## ⚖️ 许可证

&copy; 2026 Cyberceratops. 保留所有权利。

## 📧 联系方式

- 法律事务: legal@zxvmax.site
- 隐私问题: privacy@zxvmax.site
