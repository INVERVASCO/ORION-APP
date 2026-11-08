const env = import.meta.env;

export const PARTIDOS_DB = [
  { key: 'morena', nombre: 'MORENA', color: '#9F2241' },
  { key: 'pan', nombre: 'PAN', color: '#0066CC' },
  { key: 'pri', nombre: 'PRI', color: '#E53935' },
  { key: 'mc', nombre: 'Mov. Ciudadano', color: '#FF9800' },
  { key: 'pt', nombre: 'Partido del Trabajo', color: '#D32F2F' },
  { key: 'pvem', nombre: 'Partido Verde', color: '#4CAF50' },
  { key: 'prd', nombre: 'PRD', color: '#FFC107' },
  { key: 'independiente', nombre: 'Independiente', color: '#94A3B8' },
  { key: 'otro', nombre: 'Otro / No definido', color: '#64748B' },
];

const legalEnv = {
  responsableNombre: env.VITE_LEGAL_RESPONSABLE,
  responsableDomicilio: env.VITE_LEGAL_DOMICILIO,
  responsableContactoARCO: env.VITE_LEGAL_ARCO_EMAIL,
  encargadoNombre: env.VITE_LEGAL_ENCARGADO,
  plazoConservacion: env.VITE_LEGAL_PLAZO,
  proveedorGeocoding: env.VITE_LEGAL_GEOCODING,
};

export const LEGAL_COMPLETO = Object.values(legalEnv).every(
  (v) => typeof v === 'string' && v.trim().length > 0
);

export const ORION_CONFIG = {
  organizacionNombre: env.VITE_ORG_NOMBRE || 'ORION',
  organizacionSubtitulo: env.VITE_ORG_SUBTITULO || 'Campaign Intelligence',
  organizacionLogo: env.VITE_ORG_LOGO || '/dossier/orion-logo.png',
  organizacionColorPrimario: env.VITE_ORG_COLOR || '#00D4FF',
  
  precioLicencia: env.VITE_PRECIO_LICENCIA || '450,000',

  territorio: {
    activo: env.VITE_TERRITORIO_ACTIVO !== 'false',
    nombreNivel1: env.VITE_TERRITORIO_N1 || 'Barrio/Colonia',
    nombreNivel2: env.VITE_TERRITORIO_N2 || 'Sección Electoral',
    usaSecciones: env.VITE_TERRITORIO_SECCIONES !== 'false',
  },

  electoral: {
    activo: env.VITE_ELECTORAL_ACTIVO !== 'false',
    anioBase: Number(env.VITE_ANIO_BASE || 2024),
    anioProyeccion: Number(env.VITE_ANIO_PROYECCION || 2027),
    umbralSegura: Number(env.VITE_UMBRAL_SEGURA || 45),
    umbralRiesgo: Number(env.VITE_UMBRAL_RIESGO || 30),
    partidoOpositor: env.VITE_PARTIDO_OPOSITOR || 'morena',
  },

  legal: legalEnv,

  features: {
    mostrarModuloElectoral: env.VITE_ELECTORAL_ACTIVO !== 'false',
    mostrarModuloGastos: env.VITE_GASTOS_ACTIVO !== 'false',
    mostrarModuloPromesas: env.VITE_PROMESAS_ACTIVO !== 'false',
    mostrarModuloMonitoreo: env.VITE_MONITOREO_ACTIVO !== 'false',
    iaActiva: env.VITE_IA_ACTIVA !== 'false',
  },
};

export const isCampanaElectoral = () => ORION_CONFIG.electoral.activo;
