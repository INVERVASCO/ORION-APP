import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom'; 
import { 
  Brain, Target, AlertTriangle, MessageSquare, 
  Eye, Zap, Send, Loader2, Users, Radio, Megaphone, 
  DollarSign, MapPin, RefreshCw, Download, Dna
} from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { invocarDeepSeek, SYSTEM_PROMPTS } from '../lib/deepseekClient';
import { recolectarContextoCampana, formatearContextoParaIA } from '../lib/cerebroCampana';
import type { ContextoCampana } from '../lib/cerebroCampana';
import { supabase } from '../lib/supabaseClient';

const TABS = [
  { key: 'SISTEMA', label: 'Sistema Nervioso', icono: '🧠', descripcion: 'Vista completa del cerebro' },
  { key: 'COPILOTO', label: 'Copiloto del Día', icono: '⚡', descripcion: 'Briefing con datos reales' },
  { key: 'ADN_EMOCIONAL', label: 'ADN Emocional', icono: '🧬', descripcion: 'Inteligencia psicológica' },
  { key: 'CHAT', label: 'Asistente IA', icono: '💬', descripcion: 'Pregunta lo que necesites' },
  { key: 'RIESGOS', label: 'Alertas de Riesgo', icono: '⚠️', descripcion: 'Secciones que requieren acción' },
  { key: 'OPOSITOR', label: 'Inteligencia', icono: '🕵️', descripcion: 'Análisis del oponente' },
];

const SYSTEM_PROMPT_ADN = `Eres un experto en psicología política, sociología y estrategia electoral. 
Tu tarea es analizar las respuestas abiertas de los ciudadanos a nuestras encuestas especiales (segmentadas por edad).
No busques respuestas lógicas o materiales (como "agua" o "baches"). Busca el ADN emocional.
Agrupa el análisis por segmentos (18-30, 31-50, 50+).
Para cada segmento, dime:
1. El arquetipo dominante (Ej. "El joven abandonado", "La madre protectora").
2. El detonante emocional (miedo, orgullo, nostalgia, ira).
3. La narrativa exacta que el candidato debe usar para conectar.
Devuélveme un resumen ejecutivo muy fácil de leer, con viñetas. Sé poético y estratégico.`;

export default function CentroInteligenciaElectoral() {
  const [searchParams] = useSearchParams();
  const [tabActivo, setTabActivo] = useState('SISTEMA');

  useEffect(() => {
    const seccionParam = searchParams.get('seccion');
    if (seccionParam) {
      setTabActivo('CHAT');
    }
  }, [searchParams]);

  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, #00A651 0%, #0066CC 100%)',
        borderRadius: '12px', padding: '25px', marginBottom: '25px',
        color: 'white', boxShadow: '0 8px 20px rgba(0,166,81,0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={32} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800' }}>Centro Neuronal de Campaña</h1>
            <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '13px' }}>Sistema Nervioso Central · Inteligencia Electoral en Tiempo Real</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTabActivo(tab.key)}
            style={{
              background: tabActivo === tab.key ? 'linear-gradient(135deg, #00A651 0%, #0066CC 100%)' : 'white',
              color: tabActivo === tab.key ? 'white' : '#333',
              border: tabActivo === tab.key ? 'none' : '1px solid #E0E0E0',
              padding: '14px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.3s',
              boxShadow: tabActivo === tab.key ? '0 4px 12px rgba(0,166,81,0.3)' : '0 2px 6px rgba(0,0,0,0.05)',
              display: 'flex', alignItems: 'center', gap: '10px'
            }}
          >
            <span style={{ fontSize: '22px' }}>{tab.icono}</span>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{tab.label}</div>
              <div style={{ fontSize: '10px', opacity: 0.8 }}>{tab.descripcion}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="card" style={{ minHeight: '400px' }}>
        {tabActivo === 'SISTEMA' && <TabSistemaNervioso />}
        {tabActivo === 'COPILOTO' && <TabCopiloto />}
        {tabActivo === 'ADN_EMOCIONAL' && <TabADNEmocional />}
        {tabActivo === 'CHAT' && <TabChat />}
        {tabActivo === 'RIESGOS' && <TabRiesgos />}
        {tabActivo === 'OPOSITOR' && <TabOpositor />}
      </div>
    </div>
  );
}

// ============================================================
// TAB 0: SISTEMA NERVIOSO
// ============================================================
function TabSistemaNervioso() {
  const [contadores, setContadores] = useState({
    personas: 0, encuestas: 0, monitoreo_redes: 0, activismo: 0,
    problematicas: 0, gastos: 0, inteligencia: 0, eventos: 0, promesas: 0,
  });
  const [cargando, setCargando] = useState(true);
  const [refrescar, setRefrescar] = useState(0);

  useEffect(() => {
    const cargarContadores = async () => {
      setCargando(true);
      try {
        const [
          personasRes, encuestasRes, monitoreoRes, activismoRes, problematicasRes,
          gastosRes, inteligenciaRes, eventosRes, promesasRes,
        ] = await Promise.all([
          supabase.from('personas').select('*', { count: 'exact', head: true }),
          supabase.from('encuestas').select('*', { count: 'exact', head: true }),
          supabase.from('monitoreo_redes').select('*', { count: 'exact', head: true }),
          supabase.from('activismo').select('*', { count: 'exact', head: true }),
          supabase.from('problematicas').select('*', { count: 'exact', head: true }),
          supabase.from('gastos').select('monto'),
          supabase.from('inteligencia_competitiva').select('*', { count: 'exact', head: true }),
          supabase.from('eventos').select('*', { count: 'exact', head: true }),
          supabase.from('promesas').select('*', { count: 'exact', head: true }),
        ]);

        const totalGastos = (gastosRes.data || []).reduce(
          (sum: number, g: any) => sum + (parseFloat(g.monto) || 0), 0
        );

        setContadores({
          personas: personasRes.count || 0,
          encuestas: encuestasRes.count || 0,
          monitoreo_redes: monitoreoRes.count || 0,
          activismo: activismoRes.count || 0,
          problematicas: problematicasRes.count || 0,
          gastos: totalGastos,
          inteligencia: inteligenciaRes.count || 0,
          eventos: eventosRes.count || 0,
          promesas: promesasRes.count || 0,
        });
      } catch (err) {
        console.error('[TabSistemaNervioso] Error:', err);
      } finally {
        setCargando(false);
      }
    };
    cargarContadores();
  }, [refrescar]);

  const areas = [
    { icono: <Eye size={20} />, nombre: 'OJOS · Brigadistas', funcion: 'Capturan personas en el territorio', tabla: 'personas', color: '#00A651', valor: contadores.personas, unidad: 'capturas', formato: 'numero' },
    { icono: <Radio size={20} />, nombre: 'OÍDOS · Encuestadores', funcion: 'Reportan tendencias y encuestas', tabla: 'encuestas', color: '#2196F3', valor: contadores.encuestas, unidad: 'encuestas', formato: 'numero' },
    { icono: <Megaphone size={20} />, nombre: 'VOZ · Publicistas', funcion: 'Monitorean redes y competencia', tabla: 'monitoreo_redes', color: '#9C27B0', valor: contadores.monitoreo_redes, unidad: 'monitoreos', formato: 'numero' },
    { icono: <Users size={20} />, nombre: 'MEMORIA · Coordinadores', funcion: 'Registran activismo y estructura', tabla: 'activismo', color: '#FF9800', valor: contadores.activismo, unidad: 'activistas', formato: 'numero' },
    { icono: <MapPin size={20} />, nombre: 'PIERNAS · Operadores', funcion: 'Reportan problemáticas ciudadanas', tabla: 'problematicas', color: '#F44336', valor: contadores.problematicas, unidad: 'reportes', formato: 'numero' },
    { icono: <DollarSign size={20} />, nombre: 'BOLSILLO · Financiero', funcion: 'Controla gastos y presupuesto', tabla: 'gastos', color: '#4CAF50', valor: contadores.gastos, unidad: 'en gastos', formato: 'moneda' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <Brain size={24} color="#00A651" />
        <h2 style={{ margin: 0, color: '#0066CC', fontSize: '20px' }}>Sistema Nervioso de la Campaña</h2>
        <button onClick={() => setRefrescar(r => r + 1)} disabled={cargando}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'white', border: '2px solid #00A651', color: '#00A651', borderRadius: '8px', cursor: cargando ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '13px', opacity: cargando ? 0.6 : 1 }}>
          <RefreshCw size={14} /> {cargando ? 'Recargando...' : 'Recargar'}
        </button>
      </div>

      <div style={{ background: 'linear-gradient(135deg, rgba(0,166,81,0.03) 0%, rgba(0,102,204,0.03) 100%)', padding: '25px', borderRadius: '12px', marginBottom: '25px', borderLeft: '5px solid #00A651', textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 12px 0', fontSize: '22px', fontWeight: '800', background: 'linear-gradient(135deg, #00A651 0%, #0066CC 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: '1.3' }}>
          Un candidato informado, un equipo conectado, una campaña imparable.
        </h2>
        <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.7', color: '#555', maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto' }}>
          Cada área de la campaña alimenta esta plataforma con datos del territorio. La IA conecta todo y le devuelve al candidato decisiones estratégicas.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '25px' }}>
        {areas.map((area, i) => (
          <div key={i} style={{ background: 'white', padding: '18px', borderRadius: '10px', borderLeft: `4px solid ${area.color}`, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ background: `${area.color}15`, color: area.color, width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {area.icono}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#333', marginBottom: '4px' }}>{area.nombre}</div>
              <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.5', marginBottom: '8px' }}>{area.funcion}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: `${area.color}12`, border: `1px solid ${area.color}40`, padding: '4px 10px', borderRadius: '20px' }}>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: area.color }}>
                    {area.formato === 'moneda' ? `$${area.valor.toLocaleString('es-MX', { minimumFractionDigits: 0 })}` : area.valor.toLocaleString('es-MX')}
                  </span>
                  <span style={{ fontSize: '10px', color: '#666', fontWeight: '600' }}>{area.unidad}</span>
                </div>
                <code style={{ fontSize: '10px', background: '#F4F4F4', padding: '2px 8px', borderRadius: '4px', color: '#666' }}>{area.tabla}</code>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// TAB 1: COPILOTO DEL DÍA
// ============================================================
function TabCopiloto() {
  const [cargando, setCargando] = useState(false);
  const [briefing, setBriefing] = useState('');
  const [contexto, setContexto] = useState<ContextoCampana | null>(null);
  const [error, setError] = useState('');
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const generarBriefing = async () => {
    setCargando(true);
    setError('');
    setBriefing('');
    try {
      const ctx = await recolectarContextoCampana();
      setContexto(ctx);
      const contextoTexto = formatearContextoParaIA(ctx);
      const respuesta = await invocarDeepSeek([
        { role: 'system', content: SYSTEM_PROMPTS.COPILOTO_DIARIO },
        { role: 'user', content: `DATOS REALES:\n\n${contextoTexto}\n\nGenera el briefing ejecutivo del día. Prioriza acciones concretas.` },
      ], { temperature: 0.6 });
      setBriefing(respuesta);
    } catch (err: any) {
      setError(err.message || 'Error al conectar con la IA.');
    } finally {
      setCargando(false);
    }
  };

  const descargarPDF = () => {
    if (!pdfRef.current) return;
    setGenerandoPDF(true);
    const fecha = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    html2pdf().set({
      margin: [10, 10, 10, 10], filename: `Briefing_Campana_${fecha}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollY: 0 },
      jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    }).from(pdfRef.current).save().then(() => setGenerandoPDF(false));
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <Zap size={24} color="#00A651" />
        <h2 style={{ margin: 0, color: '#0066CC', fontSize: '20px' }}>Copiloto del Día</h2>
        <span style={{ background: '#E8F5E9', color: '#00A651', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>Datos reales en vivo</span>
      </div>

      {!briefing && !cargando && (
        <div style={{ background: '#F4F6F9', padding: '30px 20px', borderRadius: '10px', marginBottom: '20px', borderLeft: '5px solid #00A651', textAlign: 'center' }}>
          <Brain size={48} color="#00A651" style={{ marginBottom: '15px', opacity: 0.7 }} />
          <p style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold', color: '#333' }}>El cerebro está listo para pensar</p>
          <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#666', lineHeight: '1.6' }}>Voy a recolectar datos de las 6 áreas y generar tu briefing estratégico del día.</p>
          <button onClick={generarBriefing} className="btn-primary" style={{ padding: '12px 28px', fontSize: '15px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} /> Generar Briefing del Día
          </button>
        </div>
      )}

      {cargando && (
        <div style={{ background: '#F4F6F9', padding: '40px', borderRadius: '10px', textAlign: 'center', color: '#00A651' }}>
          <Loader2 size={32} className="animate-spin" style={{ marginBottom: '15px' }} />
          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '15px' }}>🧠 Recolectando datos de las 6 áreas...</p>
        </div>
      )}

      {error && <div style={{ background: '#FFEBEE', padding: '15px', borderRadius: '10px', borderLeft: '4px solid #C62828', color: '#C62828', fontSize: '14px' }}>⚠️ {error}</div>}

      {briefing && !cargando && (
        <div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
            <button onClick={descargarPDF} disabled={generandoPDF} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', fontSize: '14px' }}>
              {generandoPDF ? <><Loader2 size={16} className="animate-spin" /> Generando PDF...</> : <><Download size={16} /> Descargar Briefing en PDF</>}
            </button>
            <button onClick={generarBriefing} style={{ padding: '12px 20px', background: 'white', border: '2px solid #00A651', color: '#00A651', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={16} /> Regenerar
            </button>
          </div>

          <div style={{ background: 'white', padding: '25px', borderRadius: '10px', border: '2px solid #00A651', fontSize: '14px', lineHeight: '1.8', color: '#333', whiteSpace: 'pre-wrap' }}>
            {briefing}
          </div>

          {/* PDF Oculto */}
          <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
            <div ref={pdfRef} style={{ width: '210mm', padding: '15mm', backgroundColor: 'white', fontFamily: 'Arial, sans-serif', color: '#333' }}>
               <div style={{ borderBottom: '4px solid #00A651', paddingBottom: '15px', marginBottom: '20px', textAlign: 'center' }}>
                  <h1 style={{ margin: 0, fontSize: '24px', color: '#00A651', fontWeight: '900' }}>UNIDOS X TULA</h1>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>BRIEFING EJECUTIVO DIARIO</p>
               </div>
               <div style={{ background: '#F9F9F9', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #00A651', fontSize: '12px', lineHeight: '1.7', color: '#333', whiteSpace: 'pre-wrap' }}>
                {briefing}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// TAB 2: ADN EMOCIONAL (NUEVO)
// ============================================================
function TabADNEmocional() {
  const [cargando, setCargando] = useState(false);
  const [analisis, setAnalisis] = useState('');
  const [error, setError] = useState('');
  const [cantidad, setCantidad] = useState(0);

  const generarAnalisis = async () => {
    setCargando(true);
    setError('');
    setAnalisis('');

    try {
      // 1. Buscar todas las encuestas que empiecen con "adn_"
      const { data, error } = await supabase
        .from('encuestas')
        .select('tipo, pregunta, respuesta')
        .like('tipo', 'adn_%')
        .not('respuesta', 'is', null);

      if (error) throw new Error(error.message);
      if (!data || data.length === 0) {
        setError('Aún no hay respuestas de ADN Emocional. Ve al módulo de Encuestas y captura algunas.');
        setCargando(false);
        return;
      }

      setCantidad(data.length);

      // 2. Formatear las respuestas para la IA
      let textoParaIA = `Tengo ${data.length} respuestas abiertas de ciudadanos. Agrúpalas por segmento de edad (18-30, 31-50, 50+) y dame el análisis psicográfico:\n\n`;
      
      const segmentos: Record<string, string[]> = {
        'adn_18_30': [],
        'adn_31_50': [],
        'adn_50_mas': []
      };

      data.forEach((d: any) => {
        if (segmentos[d.tipo]) {
          segmentos[d.tipo].push(`[Pregunta: ${d.pregunta}] Respuesta: "${d.respuesta}"`);
        }
      });

      textoParaIA += `--- SEGMENTO 18-30 AÑOS ---\n${segmentos['adn_18_30'].join('\n') || 'Sin datos'}\n\n`;
      textoParaIA += `--- SEGMENTO 31-50 AÑOS ---\n${segmentos['adn_31_50'].join('\n') || 'Sin datos'}\n\n`;
      textoParaIA += `--- SEGMENTO 50+ AÑOS ---\n${segmentos['adn_50_mas'].join('\n') || 'Sin datos'}\n\n`;

      // 3. Llamar a DeepSeek con el prompt especial
      const respuesta = await invocarDeepSeek([
        { role: 'system', content: SYSTEM_PROMPT_ADN },
        { role: 'user', content: textoParaIA }
      ], { temperature: 0.7 });

      setAnalisis(respuesta);

    } catch (err: any) {
      setError('Error al analizar: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <Dna size={24} color="#9C27B0" />
        <h2 style={{ margin: 0, color: '#9C27B0', fontSize: '20px' }}>ADN Emocional del Votante</h2>
        <span style={{ background: '#F3E5F5', color: '#9C27B0', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>Psicografía Electoral</span>
      </div>

      {!analisis && !cargando && (
        <div style={{ background: '#F3E5F5', padding: '30px 20px', borderRadius: '10px', marginBottom: '20px', borderLeft: '5px solid #9C27B0', textAlign: 'center' }}>
          <Brain size={48} color="#9C27B0" style={{ marginBottom: '15px', opacity: 0.7 }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold', color: '#333' }}>Descubre los sentimientos ocultos</h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#666', lineHeight: '1.6', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
            La IA analizará las respuestas abiertas de las encuestas segmentadas por edad y te dirá exactamente qué narrativa usar para tocar el corazón de cada grupo.
          </p>
          <button onClick={generarAnalisis} className="btn-primary" style={{ padding: '12px 28px', fontSize: '15px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#9C27B0' }}>
            <Dna size={18} /> Analizar ADN Emocional
          </button>
        </div>
      )}

      {cargando && (
        <div style={{ background: '#F3E5F5', padding: '40px', borderRadius: '10px', textAlign: 'center', color: '#9C27B0' }}>
          <Loader2 size={32} className="animate-spin" style={{ marginBottom: '15px' }} />
          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '15px' }}>🧬 Analizando psicografía y arquetipos...</p>
        </div>
      )}

      {error && <div style={{ background: '#FFEBEE', padding: '15px', borderRadius: '10px', borderLeft: '4px solid #C62828', color: '#C62828', fontSize: '14px' }}>⚠️ {error}</div>}

      {analisis && !cargando && (
        <div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#666' }}>Basado en <strong>{cantidad}</strong> respuestas ciudadanas.</span>
            <button onClick={generarAnalisis} style={{ marginLeft: 'auto', padding: '10px 15px', background: 'white', border: '2px solid #9C27B0', color: '#9C27B0', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={14} /> Volver a Analizar
            </button>
          </div>
          <div style={{ background: 'white', padding: '25px', borderRadius: '10px', border: '2px solid #9C27B0', fontSize: '14px', lineHeight: '1.8', color: '#333', whiteSpace: 'pre-wrap' }}>
            {analisis}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// TAB 3: CHAT
// ============================================================
function TabChat() {
  const [searchParams] = useSearchParams();
  const seccionParam = searchParams.get('seccion');
  const pctParam = searchParams.get('pct');
  const riesgoParam = searchParams.get('riesgo');

  const [mensaje, setMensaje] = useState('');
  const [historial, setHistorial] = useState<{ tipo: 'user' | 'ia'; texto: string }[]>([
    { tipo: 'ia', texto: '¡Hola! Soy tu asistente estratégico. Pregúntame: "¿Qué problemática domina en Tula?", "¿Qué barrios están desatendidos?", "Dame 3 acciones para esta semana".' }
  ]);
  const [cargando, setCargando] = useState(false);

  const preguntasSugeridas = [
    '¿Qué problemática domina en el territorio?',
    '¿Qué barrios están desatendidos?',
    'Dame 3 acciones concretas para hoy',
  ];

  const enviarMensaje = async (texto: string) => {
    const pregunta = texto.trim();
    if (!pregunta || cargando) return;

    setHistorial(prev => [...prev, { tipo: 'user', texto: pregunta }]);
    setMensaje('');
    setCargando(true);

    try {
      const ctx = await recolectarContextoCampana();
      const contextoTexto = formatearContextoParaIA(ctx);
      const conversacionPrevia = historial.slice(-4).map(msg => ({
        role: msg.tipo === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.texto,
      }));

      const respuesta = await invocarDeepSeek([
        { role: 'system', content: SYSTEM_PROMPTS.ASISTENTE_GENERAL },
        { role: 'user', content: `CONTEXTO ACTUAL:\n\n${contextoTexto}` },
        ...conversacionPrevia,
        { role: 'user', content: pregunta },
      ], { temperature: 0.5 });

      setHistorial(prev => [...prev, { tipo: 'ia', texto: respuesta }]);
    } catch (err: any) {
      setHistorial(prev => [...prev, { tipo: 'ia', texto: `⚠️ Error: ${err.message}` }]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (seccionParam && historial.length === 1) {
      const preguntaAuto = `Analiza la Sección ${seccionParam}. Actualmente tiene una proyección de ${pctParam}% y un nivel de riesgo ${riesgoParam}. ¿Qué acciones tácticas específicas debo tomar esta semana en esta sección para mejorar la proyección?`;
      enviarMensaje(preguntaAuto);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccionParam]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <MessageSquare size={24} color="#00A651" />
        <h2 style={{ margin: 0, color: '#0066CC', fontSize: '20px' }}>Asistente Conversacional</h2>
        <span style={{ background: '#E8F5E9', color: '#00A651', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>Con contexto real</span>
      </div>

      <div style={{ background: '#F4F6F9', borderRadius: '10px', padding: '20px', maxHeight: '450px', overflowY: 'auto', marginBottom: '15px' }}>
        {historial.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.tipo === 'user' ? 'flex-end' : 'flex-start', marginBottom: '12px' }}>
            <div style={{ background: msg.tipo === 'user' ? 'linear-gradient(135deg, #00A651 0%, #0066CC 100%)' : 'white', color: msg.tipo === 'user' ? 'white' : '#333', padding: '12px 16px', borderRadius: '12px', maxWidth: '85%', fontSize: '14px', lineHeight: '1.6', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', whiteSpace: 'pre-wrap' }}>
              {msg.texto}
            </div>
          </div>
        ))}
        {cargando && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '12px' }}>
            <div style={{ background: 'white', padding: '12px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#666' }}>
              <Loader2 size={16} className="animate-spin" /> Recolectando datos reales...
            </div>
          </div>
        )}
      </div>

      {historial.length <= 1 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px' }}>
          {preguntasSugeridas.map((p, i) => (
            <button key={i} onClick={() => enviarMensaje(p)} disabled={cargando} style={{ background: 'white', border: '1px solid #E0E0E0', borderRadius: '20px', padding: '8px 14px', fontSize: '12px', color: '#0066CC', cursor: cargando ? 'not-allowed' : 'pointer', fontWeight: '500', opacity: cargando ? 0.5 : 1 }}>
              {p}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <input type="text" value={mensaje} onChange={(e) => setMensaje(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && enviarMensaje(mensaje)} placeholder="Escribe tu pregunta estratégica..." disabled={cargando} style={{ flex: 1, padding: '12px 16px', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
        <button onClick={() => enviarMensaje(mensaje)} disabled={cargando || !mensaje.trim()} className="btn-primary" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px', opacity: cargando || !mensaje.trim() ? 0.5 : 1, cursor: cargando || !mensaje.trim() ? 'not-allowed' : 'pointer' }}>
          <Send size={16} /> Enviar
        </button>
      </div>
    </div>
  );
}

// ============================================================
// TAB 4: ALERTAS DE RIESGO
// ============================================================
function TabRiesgos() {
  const [contexto, setContexto] = useState<ContextoCampana | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let montado = true;
    recolectarContextoCampana()
      .then(ctx => { if (montado) setContexto(ctx); })
      .catch(err => console.error('[TabRiesgos]', err))
      .finally(() => { if (montado) setCargando(false); });
    return () => { montado = false; };
  }, []);

  if (cargando) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#00A651' }}>
        <Loader2 size={32} className="animate-spin" style={{ marginBottom: '15px' }} />
        <p>Analizando alertas...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <AlertTriangle size={24} color="#C62828" />
        <h2 style={{ margin: 0, color: '#C62828', fontSize: '20px' }}>Alertas de Riesgo Electoral</h2>
      </div>

      {contexto && contexto.seccionesCriticas.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#C62828', fontSize: '15px', marginBottom: '12px' }}>🚨 Top 5 Secciones en Riesgo</h3>
          {contexto.seccionesCriticas.map((s, i) => (
            <div key={i} style={{ background: '#FFEBEE', padding: '14px', borderRadius: '8px', marginBottom: '8px', borderLeft: '4px solid #C62828', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ color: '#C62828' }}>Sección {s.seccion}</strong>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '3px' }}>Proyección: {s.pctProyeccion.toFixed(1)}%</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#C62828' }}>{s.votos.toLocaleString()}</div>
                <div style={{ fontSize: '10px', color: '#999' }}>votos en juego</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {contexto && contexto.barriosDesatendidos.length > 0 && (
        <div>
          <h3 style={{ color: '#F9A825', fontSize: '15px', marginBottom: '12px' }}>⚠️ Barrios Desatendidos</h3>
          {contexto.barriosDesatendidos.map((b, i) => (
            <div key={i} style={{ background: '#FFF8E1', padding: '14px', borderRadius: '8px', marginBottom: '8px', borderLeft: '4px solid #F9A825', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: '#333' }}>{b.nombre}</strong>
              <div style={{ fontSize: '12px', color: '#666' }}>{b.capturas} capturas · {b.activistas} activistas</div>
            </div>
          ))}
        </div>
      )}

      {contexto && contexto.seccionesCriticas.length === 0 && contexto.barriosDesatendidos.length === 0 && (
        <div style={{ background: '#E8F5E9', padding: '30px', borderRadius: '10px', textAlign: 'center', color: '#00A651' }}>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>✅ No hay alertas críticas detectadas. La campaña va por buen camino.</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// TAB 5: INTELIGENCIA COMPETITIVA
// ============================================================
function TabOpositor() {
  const [contexto, setContexto] = useState<ContextoCampana | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let montado = true;
    recolectarContextoCampana()
      .then(ctx => { if (montado) setContexto(ctx); })
      .catch(err => console.error('[TabOpositor]', err))
      .finally(() => { if (montado) setCargando(false); });
    return () => { montado = false; };
  }, []);

  if (cargando) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#0066CC' }}>
        <Loader2 size={32} className="animate-spin" style={{ marginBottom: '15px' }} />
        <p>Analizando actividad del oponente...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Eye size={24} color="#0066CC" />
        <h2 style={{ margin: 0, color: '#0066CC', fontSize: '20px' }}>Inteligencia Competitiva</h2>
      </div>

      {contexto && contexto.inteligenciaOpositor.length > 0 ? (
        <div>
          <p style={{ color: '#666', marginBottom: '15px', fontSize: '14px' }}>Últimos movimientos detectados del partido en el poder:</p>
          {contexto.inteligenciaOpositor.map((i, idx) => (
            <div key={idx} style={{ background: 'white', padding: '14px', borderRadius: '8px', marginBottom: '8px', borderLeft: '4px solid #0066CC', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ background: '#E3F2FD', color: '#0066CC', padding: '2px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>{i.tipo}</span>
                <span style={{ fontSize: '11px', color: '#999' }}>{i.fecha}</span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#333', lineHeight: '1.5' }}>{i.descripcion}</p>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: '#F4F6F9', padding: '30px', borderRadius: '10px', textAlign: 'center', color: '#666' }}>
          <Eye size={48} color="#0066CC" style={{ opacity: 0.4, marginBottom: '15px' }} />
          <p style={{ margin: 0, fontSize: '14px' }}>Aún no hay reportes de inteligencia competitiva registrados.</p>
        </div>
      )}
    </div>
  );
}