# NetPulse: Event Horizon

[中文](./README_zh.md)
---

## 🌍 Introduction

**NetPulse** is an intelligent internet event analyzer powered by search grounding. It transforms scattered web information into structured insights, providing real-time summaries, core impact analysis, and historical context comparisons for major tech and internet events.

**Architecture Upgrade**: NetPulse now uses a **Backend-for-Frontend (BFF)** architecture powered by **Cloudflare Workers**. All API calls (Tavily Search & Gemini Analysis) are executed securely on the server-side, ensuring your API keys are never exposed to the client.

## ✨ Key Features

- **Search Grounding**: Utilizes **Tavily API** to fetch real-time, accurate context from the web, reducing hallucinations.
- **Deep Analysis**: Powered by **Gemini 3 Pro** (via OpenAI-compatible proxy) to generate professional journalistic summaries.
- **Historical Echoes**: Unique feature that compares current events with historical precedents to find patterns.
- **Secure Architecture**: API Keys are stored in Cloudflare Worker Secrets. The frontend only communicates with your own backend (`/api/analyze`).
- **Responsive UI**: A modern, glassmorphism-inspired interface built with **Tailwind CSS**, optimized for mobile and desktop.

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Backend**: Cloudflare Workers (TypeScript)
- **Styling**: Tailwind CSS, Lucide React (Icons)
- **AI Model**: Google Gemini 3 Pro Preview (accessed via OpenAI-compatible interface)
- **Search**: Tavily AI Search API

## 🧱 Build Notes

- Tailwind CSS is loaded via CDN in `index.html`; there is no PostCSS/Tailwind pipeline. Keep the CDN script tag when updating styles to avoid build-time failures caused by missing plugins.

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

3. **Local Development (Full Stack)**
   To run both the frontend and the backend worker locally:
   ```bash
   # Start Vite dev server (Frontend)
   npm run dev
   ```
   *Note: For fully integrated testing including the backend API, use `npx wrangler dev`.*

## 📦 Deployment

This project is configured as a **Cloudflare Worker** that serves static assets.

1. **Build the Frontend**
   ```bash
   npm run build
   ```
   This generates the static files in the `dist` directory.

2. **Deploy to Cloudflare**
   ```bash
   npx wrangler deploy
   ```
   *Note: This command uses `wrangler.json` which points to `worker.ts` as the main entry point.*

3. **Configure Environment Variables**
   After deployment, go to the **Cloudflare Dashboard** -> **Workers & Pages** -> Select your Worker -> **Settings** -> **Variables**.
   Add the following variables (encrypt them as **Secrets**):
   - `VITE_GEMINI_API_KEY`: Your Gemini/OpenAI-proxy API Key.
   - `VITE_TAVILY_API_KEY`: Your Tavily API Key.

   > **Important**: You must redeploy (Retry deployment) after adding variables for them to take effect.

## ⚖️ License

&copy; 2025 Cyberceratops. All rights reserved.