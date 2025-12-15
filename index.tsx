
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// NOTE: With the Cloudflare Functions architecture, we no longer need 
// to polyfill process.env or inject keys into the browser.
// The frontend is now strictly a UI layer.

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
