import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n'; // 导入 i18n 配置
import './src/index.css'; // 导入 Tailwind CSS

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
