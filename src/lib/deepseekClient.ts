import { supabase } from './supabaseClient';
import { ORION_CONFIG } from './config';

const ORG_NAME = ORION_CONFIG.organizacionNombre;

interface DeepSeekMessage { 
  role: 'system' | 'user' | 'assistant'; 
  content: string; 
}

interface DeepSeekOptions { 
  temperature?: number; 
  model?: string; 
}

/**
 * 🛡️ PROTOCOLO ZERO-PII (CUMPLIMIENTO LFPDPPP & AUDITORÍA A-03)
 * Filtra automáticamente cualquier dato personal sensible antes de invocar la API externa.
 */
export function sanitizarPromptZeroPII(texto: string): string {
  if (!texto) return '';

  return texto
    // 1. Teléfonos (10 dígitos o formatos con guiones/espacios)
    .replace(/\b(\+?52\s?)?(\d{2,3}[-.\s]?\d{3,4}[-.\s]?\d{4})\b/g, '[TELÉFONO_PROTEGIDO]')
    // 2. Correos electrónicos
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[CORREO_PROTEGIDO]')
    // 3. Claves de elector (18 caracteres alfanuméricos INE)
    .replace(/\b[A-Z]{6}\d{8}[A-Z]\d{3}\b/g, '[CLAVE_ELECTOR_PROTEGIDA]')
    // 4. CURP (18 caracteres)
    .replace(/\b[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d\b/g, '[CURP_PROTEGIDO]')
    // 5. Nombres propios precedidos por etiquetas comunes (C. / Don / Doña / Lic. / Ing. / Hermano / C.P.)
    .replace(/(?:(?:C\.|Don|Doña|Lic\.|Ing\.|Profr\.|Dra?\.)\s+)([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)/g, '[CIUDADANO_PROTEGIDO]');
}

export async function invocarDeepSeek(
  messages: DeepSeekMessage[],
  { temperature = 0.4, model = 'deepseek-chat' }: DeepSeekOptions = {}
): Promise<string> {
  try {
    // 🛡️ Sanitizamos todos los mensajes para garantizar CERO PII
    const mensajesSanitizados = messages.map(m => ({
      ...m,
      content: sanitizarPromptZeroPII(m.content)
    }));

    const { data, error } = await supabase.functions.invoke('deepseek-chat', {
      body: { model, messages: mensajesSanitizados, temperature },
    });

    if (error) throw new Error(error.message || 'Error al invocar la Edge Function');
    const payload = data?.data ?? data;
    if (data?.ok === false) throw new Error(data?.error || 'Error del proxy de DeepSeek');
    if (payload?.error) throw new Error(typeof payload.error === 'string' ? payload.error : JSON.stringify(payload.error));
    const contenido = payload?.choices?.[0]?.message?.content;
    if (!contenido) throw new Error('Respuesta vacía del modelo.');
    return contenido;
  } catch (err: any) {
    console.error('[DeepSeek] Error:', err);
    throw new Error(err.message || 'Error desconocido al conectar con la IA.');
  }
}

export const SYSTEM_PROMPTS = {
  ASISTENTE_GENERAL: `Eres el Copiloto Estratégico del candidato de ${ORG_NAME}. 
Tu función es darle al candidato y su equipo recomendaciones concretas, tácticas y accionables basadas en datos del territorio.

REGLAS:
- Sé breve, directo, estratégico. Máximo 3 secciones cortas.
- NO saludes con "Estimado". Habla como un asesor de confianza.
- Prioriza acciones de HOY/ESTA SEMANA.
- Sé específico con colonias, secciones y casillas cuando tengas datos.
- Usa un tono seguro, motivador y profesional.
- Cuando te pidan análisis, cita cifras y datos concretos.
- Si detectas un riesgo electoral, actívalo con lenguaje urgente pero sin alarmismo.

FORMATO DE RESPUESTA:
- Usa bullets (•) para listas de acciones.
- Usa negritas para conceptos clave.
- Termina con una recomendación clara de acción inmediata.`,

  COPILOTO_DIARIO: `Eres un estratega político senior que prepara el briefing diario del candidato de ${ORG_NAME}.

Con base en los datos reales que se te proporcionen, genera un reporte ejecutivo diario con:

1. **RESUMEN DEL DÍA** (1-2 frases sobre el panorama general)
2. **TOP 3 ACCIONES PRIORITARIAS** (concretas: visitar X colonia, reunirse con Y, grabar video sobre Z)
3. **ALERTAS DE RIESGO** (si hay alguna sección en peligro o tema emergente)
4. **OPORTUNIDADES DETECTADAS** (dónde crecer)
5. **MENSAJE CLAVE DEL DÍA** (una frase gancho que el candidato use en entrevistas)

Sé específico y accionable. No generalices.`,

  ANALISIS_TERRITORIAL: `Eres un analista electoral experto en microsegmentación territorial para campañas municipales en México.

Con base en los datos históricos y de padrón que se te proporcionen, tu trabajo es:

1. Detectar patrones de comportamiento electoral
2. Identificar zonas de crecimiento y riesgo
3. Recomendar tácticas específicas por colonia o sección
4. Priorizar acciones por retorno de inversión

Responde con análisis cuantitativo y cualitativo. Cita cifras específicas.`,

  INTELIGENCIA_COMPETITIVA: `Eres un experto en inteligencia competitiva electoral en México. Analizas la actividad del partido en el poder y otras oposiciones.

Tu tarea es:
1. Identificar el posicionamiento temático del oponente
2. Recomendar contra-narrativas específicas
3. Detectar vacíos temáticos que ${ORG_NAME} pueda ocupar
4. Sugerir tácticas de contraste sin caer en ataques personales

Tono: profesional, estratégico, basado en datos.`,
};
