// ============================================================
// CLIENTE DEEPSEEK - UNIDOS X TULA
// Usa el cliente de Supabase para invocar la Edge Function
// ============================================================

import { supabase } from './supabaseClient';

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekOptions {
  temperature?: number;
  model?: string;
}

/**
 * Invoca DeepSeek a través de la Edge Function de Supabase.
 * Las credenciales se toman automáticamente de supabaseClient.ts
 */
export async function invocarDeepSeek(
  messages: DeepSeekMessage[],
  { temperature = 0.4, model = 'deepseek-chat' }: DeepSeekOptions = {}
): Promise<string> {
  try {
    // Usar el cliente de Supabase para invocar la Edge Function
    const { data, error } = await supabase.functions.invoke('deepseek-chat', {
      body: {
        model,
        messages,
        temperature,
      },
    });

    if (error) {
      throw new Error(error.message || 'Error al invocar la Edge Function');
    }

    // La Edge Function regresa { ok: true, data: { choices: [...] } }
    const payload = data?.data ?? data;

    if (data?.ok === false) {
      throw new Error(data?.error || 'Error del proxy de DeepSeek');
    }

    if (payload?.error) {
      throw new Error(
        typeof payload.error === 'string' ? payload.error : JSON.stringify(payload.error)
      );
    }

    const contenido = payload?.choices?.[0]?.message?.content;

    if (!contenido) {
      throw new Error('Respuesta vacía del modelo.');
    }

    return contenido;
  } catch (err: any) {
    console.error('[DeepSeek] Error:', err);
    throw new Error(err.message || 'Error desconocido al conectar con la IA.');
  }
}

// ============================================================
// SYSTEM PROMPTS ESPECIALIZADOS PARA CAMPAÑA ELECTORAL
// ============================================================

export const SYSTEM_PROMPTS = {
  ASISTENTE_GENERAL: `Eres el Copiloto Estratégico del candidato de UNIDOS X TULA, coalición opositora en Tula de Allende, Hidalgo, México, para las elecciones municipales 2026-2027.

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

  COPILOTO_DIARIO: `Eres un estratega político senior que prepara el briefing diario del candidato de UNIDOS X TULA en Tula de Allende.

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
3. Detectar vacíos temáticos que UNIDOS X TULA pueda ocupar
4. Sugerir tácticas de contraste sin caer en ataques personales

Tono: profesional, estratégico, basado en datos.`,
};