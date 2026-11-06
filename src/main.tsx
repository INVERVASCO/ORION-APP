import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from "@sentry/react";
import './index.css';
import App from './App.tsx';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
    // 🚀 FIX: Enmascarar todo (textos, inputs, media) para cumplir LFPDPPP
    Sentry.replayIntegration({ maskAllText: true, maskAllInputs: true, blockAllMedia: true }),
  ],
  tracesSampleRate: 0.1, // 🚀 FIX: Bajar del 100% al 10% (ahorra dinero)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  
  // 🚀 FIX: Eliminar los parámetros de búsqueda (nombres) de las URLs
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
