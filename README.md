# NetPulse: Event Horizon

[中文](./README_zh.md)

---

## 🌍 Introduction

**NetPulse** is an intelligent internet event analyzer powered by search grounding. It transforms scattered web information into structured insights, providing real-time summaries, core impact analysis, and historical context comparisons for major tech and internet events.

**Architecture Upgrade**: NetPulse now uses a **Backend-for-Frontend (BFF)** architecture powered by **Cloudflare Workers**. All API calls (Tavily Search & Gemini Analysis) are executed securely on the server-side, ensuring your API keys are never exposed to the client.

## ✨ Key Features

- **Bilingual Support**: Full internationalization (i18n) with Chinese and English interfaces, including language-aware API responses.
- **Search Grounding**: Utilizes **Tavily API** to fetch real-time, accurate context from the web, reducing hallucinations.
- **Dual Analysis Modes**: 
  - **Quick Mode** (~15s): Fast scanning with Gemini 2.5 Flash
  - **Deep Mode** (~60s): Comprehensive analysis with Gemini 3 Pro
- **Historical Echoes**: Unique feature that compares current events with historical precedents to find patterns.
- **Secure Architecture**: API Keys are stored in Cloudflare Worker Secrets. The frontend only communicates with your own backend (`/api/analyze`).
- **Responsive UI**: A modern, glassmorphism-inspired interface built with **Tailwind CSS**, optimized for mobile and desktop.
- **Dynamic Trending Topics**: Real-time trending topics fetched and cached by language.

## 🛠 Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, TypeScript, Vite, i18next |
| **Backend** | Cloudflare Workers (JavaScript) |
| **Styling** | Tailwind CSS, Lucide React (Icons) |
| **AI Model** | Google Gemini 3 Pro Preview / Gemini 2.5 Flash |
| **Search** | Tavily AI Search API |

## 📁 Project Structure

```
NetPulse/
├── App.tsx                 # Main application component
├── i18n.ts                 # i18next configuration
├── locales/
│   ├── zh/translation.json # Chinese translations
│   └── en/translation.json # English translations
├── components/
│   ├── Header.tsx          # Header with language switcher
│   ├── SearchBar.tsx       # Search interface with trending topics
│   ├── ResultView.tsx      # Analysis result display
│   ├── LanguageSwitcher.tsx# Responsive language toggle
│   ├── PrivacyPolicy.tsx   # Privacy policy page
│   └── TermsOfService.tsx  # Terms of service page
├── services/
│   └── geminiService.ts    # API service layer
└── backend/
    └── worker-i18n-v2.js   # Cloudflare Worker backend (latest)
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+) or Bun
- A **Tavily API Key** (for search)
- A **Gemini API Key** (or a proxy key supporting OpenAI format)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/EmmaStoneX/NetPulse.git
   cd NetPulse
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Local Development**
   ```bash
   npm run dev
   ```

## 📦 Deployment

### Frontend (Cloudflare Pages)

The frontend auto-deploys via GitHub integration. Simply push to the `main` branch.

### Backend (Cloudflare Workers)

1. Go to **Cloudflare Dashboard** → **Workers & Pages** → Your Worker
2. Click **Edit Code** or **Quick Edit**
3. **Replace all code** with the content of `backend/worker-i18n-v2.js`
4. Click **Save and Deploy**

### Environment Variables

Add the following secrets in Cloudflare Worker settings:
- `GEMINI_API_KEY`: Your Gemini/OpenAI-proxy API Key
- `TAVILY_API_KEY`: Your Tavily API Key

## 🌐 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analyze` | POST | Analyze a query with search grounding |
| `/api/trending` | GET | Get trending topics (supports `?lang=zh` or `?lang=en`) |

## ⚖️ License

&copy; 2026 Cyberceratops. All rights reserved.

## 📧 Contact

- Legal inquiries: legal@zxvmax.site
- Privacy concerns: privacy@zxvmax.site
