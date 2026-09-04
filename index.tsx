import React from 'react';
import ReactDOM from 'react-dom/client';
import './src/styles/global.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { initErrorReporting, onUncaughtError, onRecoverableError } from './utils/errorReporting';
import { suppressBrowserContextMenu } from './utils/suppressBrowserContextMenu';
import { debugLog } from './utils/debugLog';

// No-ops when VITE_SENTRY_DSN isn't set — see utils/errorReporting.ts.
// Called before render so it can catch errors from mount onward.
initErrorReporting();

// Right-click is a game input (emote picker, inventory item actions), so the
// browser's menu must never appear over the game. See the module for why this
// has to be document-level.
suppressBrowserContextMenu();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement, { onUncaughtError, onRecoverableError });
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Register service worker for PWA support (production only)
// In development, SW caching interferes with Vite's HMR and can serve stale content.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/TwilightGame/sw.js')
      .then((registration) => {
        debugLog('PWA', 'Service Worker registered:', registration);
      })
      .catch((error) => {
        // A failed service-worker registration is a real problem — keep it ungated.
        console.warn('[PWA] Service Worker registration failed:', error);
      });
  });
}
