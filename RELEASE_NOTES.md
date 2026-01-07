# NetPulse Release Notes

## v1.0.0 (2026-01-07)

首个正式版本发布，包含完整的国际化支持和 BFF 架构。

---

### ✨ 新功能

#### 国际化 (i18n) 支持
- **双语界面**：完整支持中文和英文界面切换
- **响应式语言切换器**：桌面端下拉菜单，移动端简洁按钮
- **语言感知 API**：后端根据用户语言返回对应语言的分析结果
- **热门话题多语言缓存**：按语言分别缓存热门话题

#### 双模式分析
- **快速模式 (Flash)**：使用 Gemini 2.5 Flash，约 15 秒完成分析
- **深度模式 (Pro)**：使用 Gemini 3 Pro，约 60 秒完成深度分析

#### 法律合规页面
- **隐私政策**：详细说明数据收集和使用方式
- **使用条款**：明确服务条款和用户责任

#### UI/UX 优化
- **绿色呼吸灯指示器**：实时显示系统状态
- **玻璃拟态设计**：现代化的视觉效果
- **响应式布局**：完美适配手机、平板和桌面端

---

### 🏗️ 架构

#### Backend-for-Frontend (BFF)
- **Cloudflare Workers**：所有 API 调用在服务端执行
- **API Key 安全**：密钥存储在 Cloudflare 加密环境变量中
- **前端零暴露**：前端仅与自建后端通信

#### 技术栈
| 层级 | 技术 |
|------|-----|
| 前端 | React 19, TypeScript, Vite, i18next |
| 后端 | Cloudflare Workers (JavaScript) |
| 样式 | Tailwind CSS (CDN), Lucide React |
| AI | Google Gemini 3 Pro / 2.5 Flash |
| 搜索 | Tavily AI Search API |

---

### 🐛 Bug 修复

- 修复结果页面无法滚动的问题
- 修复首页内容在小屏幕上溢出的问题
- 修复语言切换后热门话题不更新的问题
- 修复标题文字在桌面端换行的问题
- 修复描述文字断词不自然的问题

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
│   ├── LanguageSwitcher.tsx# 语言切换器
│   ├── PrivacyPolicy.tsx   # 隐私政策
│   └── TermsOfService.tsx  # 使用条款
├── services/
│   └── geminiService.ts    # API 服务层
└── backend/
    └── worker-i18n-v2.js   # Cloudflare Worker 后端
```

---

### 🚀 部署说明

#### 前端
通过 GitHub 集成自动部署到 Cloudflare Pages。

#### 后端
1. 在 Cloudflare Dashboard 中打开 Worker
2. 用 `backend/worker-i18n-v2.js` 的内容**完全替换**现有代码
3. 配置环境变量：`GEMINI_API_KEY` 和 `TAVILY_API_KEY`

---

### 📧 联系方式

- 法律事务: legal@zxvmax.site
- 隐私问题: privacy@zxvmax.site

---

&copy; 2026 Cyberceratops. All rights reserved.
