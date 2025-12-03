# NetPulse: Event Horizon

[中文](./README_zh.md)
---

## 🌍 Introduction

**NetPulse** is an intelligent internet event analyzer powered by search grounding. It transforms scattered web information into structured insights, providing real-time summaries, core impact analysis, and historical context comparisons for major tech and internet events.

## ✨ Key Features

- **Search Grounding**: Utilizes **Tavily API** to fetch real-time, accurate context from the web, reducing hallucinations.
- **Deep Analysis**: Powered by **Gemini 3 Pro** (via OpenAI-compatible proxy) to generate professional journalistic summaries.
- **Historical Echoes**: Unique feature that compares current events with historical precedents to find patterns.
- **Responsive UI**: A modern, glassmorphism-inspired interface built with **Tailwind CSS**, optimized for mobile and desktop.
- **Secure Architecture**: Implements secure API calls using HTTP Headers (Bearer Token) instead of URL parameters.

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS, Lucide React (Icons)
- **AI Model**: Google Gemini 3 Pro Preview (accessed via OpenAI-compatible interface)
- **Search**: Tavily AI Search API
- **Deployment**: Cloudflare Pages

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+) or Bun
- A **Tavily API Key** (for search)
- A **Gemini API Key** (or a proxy key supporting OpenAI format)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/netpulse.git
   cd netpulse
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Configuration**
   Create a `.env` file in the root directory (optional for local dev, or set in your environment):
   ```env
   VITE_GEMINI_API_KEY=sk-your-proxy-key-here
   VITE_TAVILY_API_KEY=tvly-your-tavily-key-here
   ```

   > **Note**: The project is configured to use a custom proxy (`https://0rzz.ggff.net`) by default to ensure stability and security. You can modify `services/geminiService.ts` if you wish to use a different endpoint.

4. **Run Local Development**
   ```bash
   npm run dev
   ```

## 📦 Deployment

This project includes a `wrangler.json` and is optimized for **Cloudflare Pages**.

1. Link your repository to Cloudflare Pages.
2. Set the **Build Command** to: `npm run build`
3. Set the **Output Directory** to: `dist`
4. **Crucial**: Add the following Environment Variables in the Cloudflare Dashboard:
   - `VITE_GEMINI_API_KEY`
   - `VITE_TAVILY_API_KEY`

## ⚖️ License

&copy; 2025 Cyberceratops. All rights reserved.
