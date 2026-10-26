// ============================================================
// CEREBRO DE CAMPAÑA - UNIDOS X TULA
// Sistema Nervioso Central
// ============================================================

import { supabase } from './supabaseClient';

export interface ContextoCampana {
  resumenGeneral: {
    totalPersonas: number;
    totalActivistas: number;
    totalFuncionarios: number;
    totalProblematicas: number;
    totalPromesas: number;
    totalEventos: number;
    totalGastos: number;
  };
  pronostico: {
    votosProyectados: number;
    seccionesSeguras: number;
    seccionesDisputa: number;
    seccionesRiesgo: number;
  };
  topBarrios: Array<{ nombre: string; capturas: number; activistas: number }>;
  barriosDesatendidos: Array<{ nombre: string; capturas: number; activistas: number }>;
  seccionesCriticas: Array<{ seccion: number; pctProyeccion: number; votos: number }>;
  problematicasRecientes: Array<{ tipo: string; barrio: string; fecha: string }>;
  problematicaDominante: { tipo: string; total: number } | null;
  promesasPendientes: Array<{ titulo: string; estado: string; barrio: string }>;
  eventosProximos: Array<{ nombre: string; fecha: string; lugar: string }>;
  inteligenciaOpositor: Array<{ tipo: string; descripcion: string; fecha: string }>;
  fechaActual: string;
}

export async function recolectarContextoCampana(): Promise<ContextoCampana> {
  const hoy = new Date();
  const hace30Dias = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fechaISO = hoy.toISOString().split('T')[0];
  const fecha30DiasAtras = hace30Dias.toISOString().split('T')[0];

  // ===== CONSULTAS PARALELAS =====
  const [
    personasRes,
    activismoRes,
    funcionariosRes,
    problematicasRes,
    promesasRes,
    eventosRes,
    gastosRes,
    barriosRes,
    seccionesRes,
    resultadosRes,
    inteligenciaRes,
  ] = await Promise.all([
    supabase.from('personas').select('barrio_colonia_id, barrios_colonias(nombre)'),
    supabase.from('activismo').select('barrio_colonia_id'),
    supabase.from('funcionarios_casilla').select('id'),
    supabase
      .from('problematicas')
      .select('tipo, barrio_colonia_id, created_at, barrios_colonias(nombre)')
      .gte('created_at', fecha30DiasAtras),
    supabase
      .from('promesas')
      .select('titulo, estado, barrio_colonia_id, barrios_colonias(nombre)')
      .in('estado', ['prometida', 'planeacion', 'gestion', 'ejecucion']),
    supabase
      .from('eventos')
      .select('nombre, fecha, lugar, barrio_colonia_id')
      .gte('fecha', fechaISO)
      .order('fecha', { ascending: true })
      .limit(5),
    supabase.from('gastos').select('monto, categoria, seccion_electoral_id'),
    supabase.from('barrios_colonias').select('id, nombre'),
    supabase.from('secciones_electorales').select('id, numero_seccion, barrio_colonia_id'),
    supabase
      .from('resultados_casilla')
      .select('anio, seccion, morena, total_votos, lista_nominal')
      .eq('tipo_eleccion', 'Presidencial'),
    supabase
      .from('inteligencia_competitiva')
      .select('tipo_actividad, descripcion, fecha')
      .gte('fecha', fecha30DiasAtras)
      .order('fecha', { ascending: false })
      .limit(10),
  ]);

  // ===== PROCESAMIENTO =====
  const personas = personasRes.data || [];
  const activismo = activismoRes.data || [];
  const funcionarios = funcionariosRes.data || [];
  const problematicas = problematicasRes.data || [];
  const promesas = promesasRes.data || [];
  const eventos = eventosRes.data || [];
  const gastos = gastosRes.data || [];
  const barrios = barriosRes.data || [];
  const secciones = seccionesRes.data || [];
  const resultados = resultadosRes.data || [];
  const inteligencia = inteligenciaRes.data || [];

  // Contar personas y activistas por barrio
  const capturasPorBarrio: Record<string, number> = {};
  const activistasPorBarrio: Record<string, number> = {};

  personas.forEach((p: any) => {
    if (p.barrio_colonia_id) {
      capturasPorBarrio[p.barrio_colonia_id] = (capturasPorBarrio[p.barrio_colonia_id] || 0) + 1;
    }
  });

  activismo.forEach((a: any) => {
    if (a.barrio_colonia_id) {
      activistasPorBarrio[a.barrio_colonia_id] = (activistasPorBarrio[a.barrio_colonia_id] || 0) + 1;
    }
  });

  // Barrios con datos
  const barriosConDatos = barrios.map((b: any) => ({
    nombre: b.nombre,
    capturas: capturasPorBarrio[b.id] || 0,
    activistas: activistasPorBarrio[b.id] || 0,
  }));

  const topBarrios = [...barriosConDatos]
    .sort((a, b) => b.capturas - a.capturas)
    .slice(0, 5);

  const barriosDesatendidos = [...barriosConDatos]
    .filter((b) => b.capturas < 5 && b.activistas < 2)
    .sort((a, b) => a.capturas - b.capturas)
    .slice(0, 5);

  // Calcular pronóstico
  let votosProyectados = 0;
  let seguras = 0;
  let disputa = 0;
  let riesgo = 0;
  const seccionesCriticas: Array<{ seccion: number; pctProyeccion: number; votos: number }> = [];

  secciones.forEach((sec: any) => {
    const res2018 = resultados.filter((r: any) => r.seccion === sec.numero_seccion && r.anio === 2018);
    const res2024 = resultados.filter((r: any) => r.seccion === sec.numero_seccion && r.anio === 2024);

    const votos2018 = res2018.reduce((s: number, r: any) => s + r.morena, 0);
    const votos2024 = res2024.reduce((s: number, r: any) => s + r.morena, 0);
    const lista2024 = res2024.reduce((s: number, r: any) => s + r.lista_nominal, 0);

    let proyeccionVotos = votos2024;
    if (votos2018 > 0) {
      const tendenciaAnual = (votos2024 - votos2018) / 6;
      proyeccionVotos = Math.round(votos2024 + tendenciaAnual * 3);
    } else {
      proyeccionVotos = Math.round(votos2024 * 1.05);
    }

    const activistasSec = activistasPorBarrio[sec.barrio_colonia_id] || 0;
    const capturadosSec = capturasPorBarrio[sec.barrio_colonia_id] || 0;
    const factorEstructura = Math.min(1 + activistasSec * 0.01, 1.15);
    const factorPadron = Math.min(1 + capturadosSec * 0.005, 1.10);

    proyeccionVotos = Math.round(proyeccionVotos * factorEstructura * factorPadron);

    const pctProyeccion = lista2024 > 0 ? (proyeccionVotos / lista2024) * 100 : 0;

    votosProyectados += proyeccionVotos;

    if (pctProyeccion >= 45) seguras++;
    else if (pctProyeccion < 35) {
      riesgo++;
      seccionesCriticas.push({
        seccion: sec.numero_seccion,
        pctProyeccion,
        votos: proyeccionVotos,
      });
    } else disputa++;
  });

  seccionesCriticas.sort((a, b) => b.votos - a.votos);

  // Problemática dominante
  const problematicasPorTipo: Record<string, number> = {};
  problematicas.forEach((p: any) => {
    problematicasPorTipo[p.tipo] = (problematicasPorTipo[p.tipo] || 0) + 1;
  });

  let problematicaDominante: { tipo: string; total: number } | null = null;
  Object.entries(problematicasPorTipo).forEach(([tipo, total]) => {
    if (!problematicaDominante || total > problematicaDominante.total) {
      problematicaDominante = { tipo, total };
    }
  });

  const problematicasRecientes = problematicas.slice(0, 10).map((p: any) => ({
    tipo: p.tipo,
    barrio: p.barrios_colonias?.nombre || 'Sin barrio',
    fecha: p.created_at?.split('T')[0] || 'N/D',
  }));

  const promesasPendientes = promesas.slice(0, 10).map((p: any) => ({
    titulo: p.titulo,
    estado: p.estado,
    barrio: p.barrios_colonias?.nombre || 'Sin barrio',
  }));

  const eventosProximos = eventos.map((e: any) => ({
    nombre: e.nombre,
    fecha: e.fecha,
    lugar: e.lugar || 'Sin lugar',
  }));

  const inteligenciaOpositor = inteligencia.map((i: any) => ({
    tipo: i.tipo_actividad,
    descripcion: i.descripcion,
    fecha: i.fecha,
  }));

  return {
    resumenGeneral: {
      totalPersonas: personas.length,
      totalActivistas: activismo.length,
      totalFuncionarios: funcionarios.length,
      totalProblematicas: problematicas.length,
      totalPromesas: promesas.length,
      totalEventos: eventos.length,
      totalGastos: gastos.length,
    },
    pronostico: {
      votosProyectados,
      seccionesSeguras: seguras,
      seccionesDisputa: disputa,
      seccionesRiesgo: riesgo,
    },
    topBarrios,
    barriosDesatendidos,
    seccionesCriticas: seccionesCriticas.slice(0, 5),
    problematicasRecientes,
    problematicaDominante,
    promesasPendientes,
    eventosProximos,
    inteligenciaOpositor,
    fechaActual: hoy.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  };
}

export function formatearContextoParaIA(ctx: ContextoCampana): string {
  const lineas: string[] = [];

  lineas.push(`📅 FECHA: ${ctx.fechaActual}`);
  lineas.push('');

  lineas.push('📊 RESUMEN OPERATIVO:');
  lineas.push(`• Personas capturadas: ${ctx.resumenGeneral.totalPersonas}`);
  lineas.push(`• Activistas en estructura: ${ctx.resumenGeneral.totalActivistas}`);
  lineas.push(`• Funcionarios de casilla: ${ctx.resumenGeneral.totalFuncionarios}`);
  lineas.push(`• Problemáticas reportadas (30 días): ${ctx.resumenGeneral.totalProblematicas}`);
  lineas.push(`• Promesas activas: ${ctx.resumenGeneral.totalPromesas}`);
  lineas.push(`• Eventos programados: ${ctx.resumenGeneral.totalEventos}`);
  lineas.push('');

  lineas.push('🎯 PRONÓSTICO ELECTORAL 2027:');
  lineas.push(`• Votos proyectados: ${ctx.pronostico.votosProyectados.toLocaleString()}`);
  lineas.push(`• Secciones seguras: ${ctx.pronostico.seccionesSeguras}`);
  lineas.push(`• Secciones en disputa: ${ctx.pronostico.seccionesDisputa}`);
  lineas.push(`• Secciones en riesgo: ${ctx.pronostico.seccionesRiesgo}`);
  lineas.push('');

  if (ctx.topBarrios.length > 0) {
    lineas.push('🏆 TOP 5 BARRIOS CON MÁS CAPTURAS:');
    ctx.topBarrios.forEach((b) => {
      lineas.push(`• ${b.nombre}: ${b.capturas} capturas, ${b.activistas} activistas`);
    });
    lineas.push('');
  }

  if (ctx.barriosDesatendidos.length > 0) {
    lineas.push('⚠️ BARRIOS DESATENDIDOS (requieren acción inmediata):');
    ctx.barriosDesatendidos.forEach((b) => {
      lineas.push(`• ${b.nombre}: SOLO ${b.capturas} capturas, ${b.activistas} activistas`);
    });
    lineas.push('');
  }

  if (ctx.seccionesCriticas.length > 0) {
    lineas.push('🚨 TOP 5 SECCIONES EN RIESGO (prioridad máxima):');
    ctx.seccionesCriticas.forEach((s) => {
      lineas.push(`• Sección ${s.seccion}: proyección ${s.pctProyeccion.toFixed(1)}%, ${s.votos} votos en juego`);
    });
    lineas.push('');
  }

  if (ctx.problematicaDominante) {
    lineas.push('📢 PROBLEMÁTICA CIUDADANA DOMINANTE:');
    lineas.push(`• "${ctx.problematicaDominante.tipo}" con ${ctx.problematicaDominante.total} reportes en los últimos 30 días`);
    lineas.push('');
  }

  if (ctx.problematicasRecientes.length > 0) {
    lineas.push('📝 PROBLEMÁTICAS RECIENTES:');
    ctx.problematicasRecientes.slice(0, 5).forEach((p) => {
      lineas.push(`• ${p.barrio}: "${p.tipo}" (${p.fecha})`);
    });
    lineas.push('');
  }

  if (ctx.eventosProximos.length > 0) {
    lineas.push('📅 EVENTOS PRÓXIMOS:');
    ctx.eventosProximos.forEach((e) => {
      lineas.push(`• ${e.fecha}: ${e.nombre} en ${e.lugar}`);
    });
    lineas.push('');
  }

  if (ctx.inteligenciaOpositor.length > 0) {
    lineas.push('🕵️ ACTIVIDAD DEL OPONENTE (últimos 30 días):');
    ctx.inteligenciaOpositor.slice(0, 5).forEach((i) => {
      lineas.push(`• [${i.fecha}] ${i.tipo}: ${i.descripcion}`);
    });
    lineas.push('');
  }

  if (ctx.promesasPendientes.length > 0) {
    lineas.push('📋 PROMESAS EN SEGUIMIENTO:');
    ctx.promesasPendientes.slice(0, 5).forEach((p) => {
      lineas.push(`• "${p.titulo}" (${p.estado}) en ${p.barrio}`);
    });
  }

  return lineas.join('\n');
}