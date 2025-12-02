import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// POLYFILL: Initialize process.env for the browser environment
// This bridges the gap between Cloudflare/Vite (import.meta.env) and the Gemini SDK (process.env)
// @ts-ignore
window.process = window.process || {};
// @ts-ignore
window.process.env = window.process.env || {};

// Map environment variables
// Priority: 
// 1. import.meta.env (Cloudflare Build / Vite)
// 2. localStorage (Manual Injection for testing)
try {
  // Cast import.meta to any to prevent TypeScript errors if types are not correctly loaded
  const metaEnv = (import.meta as any).env || {};

  const geminiKey = metaEnv.VITE_GEMINI_API_KEY || localStorage.getItem('VITE_GEMINI_API_KEY') || '';
  const tavilyKey = metaEnv.VITE_TAVILY_API_KEY || localStorage.getItem('VITE_TAVILY_API_KEY') || '';

  // @ts-ignore
  window.process.env.API_KEY = geminiKey;
  // @ts-ignore
  window.process.env.VITE_TAVILY_API_KEY = tavilyKey;

  if (!geminiKey || !tavilyKey) {
    console.warn("NetPulse Warning: API Keys are missing. Check your Cloudflare Environment Variables.");
  }
} catch (e) {
  console.warn("NetPulse: Error initializing environment variables", e);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);