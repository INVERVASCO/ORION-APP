/// <reference types="vite/client" />

// Declaramos librerías sin tipos oficiales para evitar usar @ts-ignore
declare module 'html2pdf.js';
declare module 'react-leaflet-cluster';

// Declaramos el JSON de las secciones
declare module '*.json' {
  const value: any;
  export default value;
}
