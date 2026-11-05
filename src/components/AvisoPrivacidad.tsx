import { X, Shield, AlertTriangle } from 'lucide-react';
import { ORION_CONFIG } from '../lib/config'; // 🚀 IMPORTAMOS LA CONFIGURACIÓN

// ... (en el render):
<p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
  {ORION_CONFIG.organizacionNombre.toUpperCase()} · Activismo Ciudadano
</p>

// ... (en el texto legal):
<p><strong>1. Responsable del Tratamiento de Datos</strong><br />
El movimiento ciudadano <strong>{ORION_CONFIG.organizacionNombre.toUpperCase()}</strong>, con domicilio en Tula de Allende, Hidalgo, México, es el responsable del tratamiento de los datos personales que usted proporcione a través de esta plataforma.</p>

// (Cambia todas las demás apariciones de "UNIDOS X TULA" por {ORION_CONFIG.organizacionNombre.toUpperCase()})
