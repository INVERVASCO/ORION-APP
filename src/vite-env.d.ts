/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_ORG_NOMBRE: string;
  // ... otras variables
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Declaramos librerías sin tipos oficiales
declare module 'html2pdf.js';
declare module 'react-leaflet-cluster';
declare module '*.json' {
  const value: any;
  export default value;
}
