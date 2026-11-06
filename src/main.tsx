import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from "@sentry/react";
import Clarity from '@microsoft/clarity';
import './index.css';
import App from './App.tsx';

// 🚀 Sentry (Ya configurado)
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({ maskAllText: true, maskAllInputs: true, blockAllMedia: true }),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  beforeBreadcrumb(b) {
    if ((b.category === 'fetch' || b.category === 'xhr') && b.data?.url) {
      b.data.url = String(b.data.url).split('?')[0];
    }
    return b;
  },
  beforeSend(e) {
    if (e.request?.url) {
      e.request.url = e.request.url.split('?')[0];
    }
    return e;
  },
});

// 🚀 Microsoft Clarity (Versión 1.0.2)
const clarityId = import.meta.env.VITE_CLARITY_PROJECT_ID;

if (import.meta.env.PROD && clarityId) {
  Clarity.init(clarityId);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
