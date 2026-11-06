import { supabase } from './supabaseClient';
import { ORION_CONFIG } from './config';

export async function recolectarContextoCampana(partidoObjetivo: string = 'todos'): Promise<any> {
  const hoy = new Date();
  const fechaISO = hoy.toISOString().split('T')[0];
  const fecha30DiasAtras = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // 🚀 FIX 1: Usar la RPC para evitar el límite de 1,000 filas en los totales
  const { data: metricasRPC } = await supabase.rpc('obtener_metricas_campana');

  const [
    personasRes, activismoRes, problematicasRes, promesasRes, 
    eventosRes, barriosRes, seccionesRes, resultadosRes, inteligenciaRes
  ] = await Promise.all([
    supabase.from('personas').select('barrio_colonia_id'),
    supabase.from('activismo').select('barrio_colonia_id'),
    supabase.from('problematicas').select('tipo, barrio_colonia_id, created_at, barrios_colonias(nombre)').gte('created_at', fecha30DiasAtras),
    supabase.from('promesas').select('titulo, estado, barrio_colonia_id, barrios_colonias(nombre)').in('estado', ['prometida', 'planeacion', 'gestion', 'ejecucion']),
    supabase.from('eventos').select('nombre, fecha, lugar').gte('fecha', fechaISO).order('fecha', { ascending: true }).limit(5),
    supabase.from('barrios_colonias').select('id, nombre'),
    supabase.from('secciones_electorales').select('id, numero_seccion, barrio_colonia_id'),
    // 🚀 FIX 2: Aumentar el límite para que no se corte a 1,000
    supabase.from('resultados_casilla').select('*').eq('tipo_eleccion', 'Presidencial').limit(10000),
    supabase.from('inteligencia_competitiva').select('tipo_actividad, descripcion, fecha').gte('fecha', fecha30DiasAtras).order('fecha', { ascending: false }).limit(10),
  ]);

  const personas = personasRes.data || [];
  const activismo = activismoRes.data || [];
  const resultados = resultadosRes.data || [];
  // ... (El resto de la lógica de cálculo se mantiene igual, usando `metricasRPC?.total_personas` en lugar de personas.length)

  // 🚀 FIX 3: Quitar MORENA hardcodeado
  const getVotos = (res: any[]) => {
    return res.reduce((sum, r) => {
      if (partidoObjetivo === 'todos') return sum + (Number(r.total_votos) || 0);
      if (partidoObjetivo === 'oposicion') {
        const partidoOpositor = ORION_CONFIG.electoral.partidoOpositor?.toLowerCase() || 'morena';
        return sum + ((Number(r.total_votos) || 0) - (Number(r[partidoOpositor]) || 0));
      }
      return sum + (Number(r[partidoObjetivo]) || 0);
    }, 0);
  };

  return {
    resumenGeneral: {
      totalPersonas: metricasRPC?.total_personas || personas.length,
      totalActivistas: metricasRPC?.total_activistas || activismo.length,
      totalGastos: metricasRPC?.total_gastos || 0,
      // ... el resto
    },
    // ... el resto de la función
  };
}
