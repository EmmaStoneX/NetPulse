# NetPulse Release Notes

## v1.0.0 (2026-01-18)

首个正式版本发布，包含完整的国际化支持、分享功能、自定义 API Key 模式和安全架构。

---

### ✨ 核心功能

#### 🔍 AI 驱动的科技事件分析
- **即时总结**：快速获取重大科技事件的核心要点
- **深度分析**：多维度解读事件影响和意义
- **历史镜像**：自动关联历史上的类似事件，寻找规律

#### 🌐 国际化 (i18n) 支持
- **双语界面**：完整支持中文和英文界面切换
- **响应式语言切换器**：桌面端下拉菜单，移动端简洁按钮
- **语言感知 API**：后端根据用户语言返回对应语言的分析结果
- **热门话题多语言缓存**：按语言分别缓存，聚焦科技领域

#### ⚡ 双模式分析
- **快速模式 (Flash)**：使用 Gemini 2.5 Flash，约 15 秒完成分析
- **深度模式 (Pro)**：使用 Gemini 3 Pro，约 60 秒完成深度分析

#### 🔗 分享功能
- **短链接分享**：生成简洁的分享链接，数据存储在 Cloudflare KV
- **分享配置**：可选择包含/排除查询、自定义标题、包含/排除来源
- **30 天有效期**：分享链接自动过期，保护隐私
- **降级支持**：KV 不可用时自动降级到 URL 编码方式

#### 🔑 自定义 API Key 模式 (BYK)
- **多 LLM 支持**：Gemini、DeepSeek、OpenAI、Claude、自定义端点
- **多搜索引擎**：Tavily、Exa
- **本地存储**：API Key 仅存储在用户浏览器本地
- **连接测试**：配置前可测试 API 连接是否正常

#### 📜 法律合规页面
- **隐私政策**：详细说明数据收集和使用方式
- **使用条款**：明确服务条款和用户责任

---

### 🏗️ 架构

#### Backend-for-Frontend (BFF)
- **Cloudflare Workers**：所有 API 调用在服务端执行
- **API Key 安全**：密钥存储在 Cloudflare 加密环境变量中
- **前端零暴露**：前端仅与自建后端 (`/api/analyze`) 通信
- **环境变量配置**：支持 `GEMINI_PROXY_URL` 配置代理地址

#### 多 Tavily Key 轮询
- 支持配置最多 10 个 Tavily API Key
- 自动 Round-Robin 负载均衡
- 避免单个 Key 触发速率限制

#### 技术栈
| 层级 | 技术 |
|------|-----|
| 前端 | React 19, TypeScript, Vite, i18next |
| 后端 | Cloudflare Workers (JavaScript) |
| 存储 | Cloudflare KV (分享数据) |
| 样式 | Tailwind CSS, Lucide React |
| AI | Google Gemini 3 Pro / 2.5 Flash |
| 搜索 | Tavily AI Search API |

---

### 🎨 UI/UX

- **玻璃拟态设计**：现代化的视觉效果
- **响应式布局**：完美适配手机、平板和桌面端
- **绿色呼吸灯指示器**：实时显示系统状态
- **分享按钮**：响应式设计，移动端纯图标，桌面端图标+文字
- **设置面板**：齿轮图标触发，配置自定义 API Key

---

### 🐛 Bug 修复

- 修复结果页面无法滚动的问题
- 修复首页内容在小屏幕上溢出的问题
- 修复语言切换后热门话题不更新的问题
- 修复标题文字在桌面端换行的问题
- 修复热门话题偏离科技定位的问题
- 修复 Tavily API 525 SSL 错误处理

---

### 🔒 安全改进

- API 端点地址通过环境变量配置，不再硬编码
- 分享数据 XSS 防护和输入验证
- 客户端速率限制防止滥用

---

### 📁 项目结构

```
NetPulse/
├── App.tsx                 # 主应用组件
├── i18n.ts                 # i18next 配置
├── locales/
│   ├── zh/translation.json # 中文翻译
│   └── en/translation.json # 英文翻译
├── components/
│   ├── Header.tsx          # 头部组件
│   ├── SearchBar.tsx       # 搜索界面
│   ├── ResultView.tsx      # 结果展示
│   ├── ShareButton.tsx     # 分享按钮
│   ├── ShareModal.tsx      # 分享配置弹窗
│   ├── SharedView.tsx      # 分享视图
│   ├── SettingsPanel.tsx   # 设置面板
│   ├── LanguageSwitcher.tsx# 语言切换器
│   ├── PrivacyPolicy.tsx   # 隐私政策
│   └── TermsOfService.tsx  # 使用条款
├── services/
│   ├── geminiService.ts    # API 服务层
│   └── directApiService.ts # 直接 API 调用（BYK 模式）
├── utils/
│   ├── shareUtils.ts       # 分享工具函数
│   └── apiConfigStore.ts   # API 配置存储
├── types/
│   └── apiConfig.ts        # API 配置类型定义
└── backend/
    └── worker-i18n-v2.js   # Cloudflare Worker 后端
```

---

### 🚀 部署说明

#### 自动化部署
1. 将 GitHub 仓库连接到 Cloudflare Workers & Pages
2. 推送到 `main` 分支即可触发自动构建和部署

#### 环境变量配置
在 Cloudflare Worker 设置中添加：
- `GEMINI_API_KEY`: Gemini 或 OpenAI 中转 API Key
- `GEMINI_PROXY_URL`: Gemini API 代理地址（可选）
- `TAVILY_API_KEY_1` ~ `TAVILY_API_KEY_10`: Tavily API Key（支持多 Key 轮询）

#### KV 命名空间
创建 `SHARE_DATA` KV 命名空间用于存储分享数据。

---

### 📧 联系方式

- 法律事务: legal@zxvmax.site
- 隐私问题: privacy@zxvmax.site

---

&copy; 2026 Cyberceratops. All rights reserved.
