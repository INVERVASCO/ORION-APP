// ============================================================
// CONFIGURACIÓN POR CLIENTE — ORION
// Cada despliegue (SNTE, partido, candidato) define sus env vars
// ============================================================

const env = import.meta.env;

export const ORION_CONFIG = {
  // --- Identidad visual ---
  organizacionNombre: env.VITE_ORG_NOMBRE || 'ORION',
  organizacionSubtitulo: env.VITE_ORG_SUBTITULO || 'Campaign Intelligence',
  organizacionLogo: env.VITE_ORG_LOGO || '/dossier/orion-logo.png',
  organizacionColorPrimario: env.VITE_ORG_COLOR || '#00D4FF',

  // --- Modelo territorial ---
  // "seccion" = campaña electoral | "comite" = sindicato | "zona" = asociación
  territorio: {
    activo: env.VITE_TERRITORIO_ACTIVO !== 'false',
    nombreNivel1: env.VITE_TERRITORIO_N1 || 'Barrio/Colonia',   // ej. SNTE: "Delegación"
    nombreNivel2: env.VITE_TERRITORIO_N2 || 'Sección Electoral',// ej. SNTE: "Comité"
    usaSecciones: env.VITE_TERRITORIO_SECCIONES !== 'false',    // SNTE puede ser false
    offsetSeccionFederalLocal: Number(env.VITE_SECCION_OFFSET || 0), // 0 para SNTE, 54 para Tula
  },

  // --- Modelo electoral (opcional) ---
  electoral: {
    activo: env.VITE_ELECTORAL_ACTIVO !== 'false', // SNTE: false
    nuestroMovimiento: env.VITE_MOVIMIENTO_NUESTRO || 'UNIDOS X TULA',
    movimientoOpositor: env.VITE_MOVIMIENTO_OPOSITOR || 'MORENA',
    anioBase: Number(env.VITE_ANIO_BASE || 2024),
    anioProyeccion: Number(env.VITE_ANIO_PROYECCION || 2027),
    umbralSegura: Number(env.VITE_UMBRAL_SEGURA || 50),
    umbralRiesgo: Number(env.VITE_UMBRAL_RIESGO || 35),
  },

  // --- Contacto comercial (para dossier) ---
  contacto: {
    oficina: env.VITE_CONTACTO_OFICINA || '',
    telefono: env.VITE_CONTACTO_TELEFONO || '',
    movil: env.VITE_CONTACTO_MOVIL || '',
    whatsapp: env.VITE_CONTACTO_WHATSAPP || '',
    sitio: env.VITE_CONTACTO_SITIO || '',
  },

  // --- Features (para clientes sin campaña electoral) ---
  features: {
    mostrarModuloElectoral: env.VITE_ELECTORAL_ACTIVO !== 'false',
    mostrarModuloGastos: env.VITE_GASTOS_ACTIVO !== 'false',
    mostrarModuloPromesas: env.VITE_PROMESAS_ACTIVO !== 'false',
    mostrarModuloMonitoreo: env.VITE_MONITOREO_ACTIVO !== 'false',
    iaActiva: env.VITE_IA_ACTIVA !== 'false',
  },
};

// Helper para saber si es un cliente con campaña electoral
export const isCampanaElectoral = () => ORION_CONFIG.electoral.activo;
