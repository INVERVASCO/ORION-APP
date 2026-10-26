import { useEffect, useState, useRef } from 'react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { 
  Loader2, TrendingUp, TrendingDown, Minus, Target, 
  AlertTriangle, CheckCircle2, BarChart3, Users, UserCheck, FileText, Filter, Download
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { supabase } from '../lib/supabaseClient';

interface Resultado {
  anio: number;
  tipo_eleccion: string;
  seccion: number;
  total_votos: number;
  lista_nominal: number;
  morena: number;
}

interface PronosticoData {
  seccion: number;
  seccion_id: string;
  barrio_id: string | null;
  votos_2018: number;
  votos_2024: number;
  pct_2024: number;
  proyeccion_votos_2027: number;
  proyeccion_pct_2027: number;
  tendencia: 'sube' | 'baja' | 'estable';
  semaforo: 'segura' | 'disputa' | 'riesgo';
  recomendacion: string;
  explicacion: string;
  activistas: number;
  capturados: number;
}

export default function Pronostico() {
  const [datos, setDatos] = useState<PronosticoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [seccionSeleccionada, setSeccionSeleccionada] = useState<PronosticoData | null>(null);
  const [filtroSemaforo, setFiltroSemaforo] = useState<'todas' | 'segura' | 'disputa' | 'riesgo'>('todas');
  const [generandoPDF, setGenerandoPDF] = useState(false);
  
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);

      const { data: seccionesData } = await supabase
        .from('secciones_electorales')
        .select('id, numero_seccion, barrio_colonia_id');

      const { data: resultadosData } = await supabase
        .from('resultados_casilla')
        .select('*')
        .eq('tipo_eleccion', 'Presidencial');

      const { data: activismoData } = await supabase
        .from('activismo')
        .select('barrio_colonia_id');

      const { data: personasData } = await supabase
        .from('personas')
        .select('barrio_colonia_id');

      if (!seccionesData || !resultadosData) {
        setLoading(false);
        return;
      }

      const procesados: PronosticoData[] = [];

      seccionesData.forEach(sec => {
        const secResultados = resultadosData.filter(r => r.seccion === sec.numero_seccion);
        const res2018 = secResultados.filter(r => r.anio === 2018);
        const res2024 = secResultados.filter(r => r.anio === 2024);

        const votos2018 = res2018.reduce((sum, r) => sum + r.morena, 0);
        const votos2024 = res2024.reduce((sum, r) => sum + r.morena, 0);
        const totalVotos2024 = res2024.reduce((sum, r) => sum + r.total_votos, 0);
        const lista2024 = res2024.reduce((sum, r) => sum + r.lista_nominal, 0);

        const pct2024 = totalVotos2024 > 0 ? (votos2024 / totalVotos2024) * 100 : 0;

        let proyeccionVotos = votos2024;
        let proyeccionPct = pct2024;
        let tendencia: 'sube' | 'baja' | 'estable' = 'estable';

        if (votos2018 > 0) {
          const tendenciaAnual = (votos2024 - votos2018) / 6;
          proyeccionVotos = Math.round(votos2024 + (tendenciaAnual * 3));
          
          if (proyeccionVotos > votos2024 * 1.05) tendencia = 'sube';
          else if (proyeccionVotos < votos2024 * 0.95) tendencia = 'baja';
        } else {
          proyeccionVotos = Math.round(votos2024 * 1.05);
          tendencia = 'sube';
        }

        const activistasSeccion = activismoData?.filter(a => a.barrio_colonia_id === sec.barrio_colonia_id).length || 0;
        const capturadosSeccion = personasData?.filter(p => p.barrio_colonia_id === sec.barrio_colonia_id).length || 0;

        const factorEstructura = Math.min(1 + (activistasSeccion * 0.01), 1.15);
        const factorPadron = Math.min(1 + (capturadosSeccion * 0.005), 1.10);

        proyeccionVotos = Math.round(proyeccionVotos * factorEstructura * factorPadron);

        if (lista2024 > 0) {
          proyeccionPct = (proyeccionVotos / lista2024) * 100;
        }

        let semaforo: 'segura' | 'disputa' | 'riesgo' = 'disputa';
        if (proyeccionPct >= 45) semaforo = 'segura';
        else if (proyeccionPct < 35) semaforo = 'riesgo';

        let explicacion = `En 2024, el partido obtuvo el ${pct2024.toFixed(1)}% de la votación. `;
        if (tendencia === 'baja') {
          explicacion += `La tendencia histórica muestra una caída. `;
        } else if (tendencia === 'sube') {
          explicacion += `La tendencia histórica muestra un crecimiento. `;
        } else {
          explicacion += `La tendencia histórica se mantiene estable. `;
        }
        explicacion += `Con la estructura actual (${activistasSeccion} activistas y ${capturadosSeccion} capturados), el sistema proyecta un ${proyeccionPct.toFixed(1)}% para 2027.`;

        let recomendacion = '';
        if (semaforo === 'segura') {
          recomendacion = `Sección prioritaria para consolidar. La proyección es del ${proyeccionPct.toFixed(1)}%. Mantener estructura actual y asegurar representantes de casilla.`;
        } else if (semaforo === 'disputa') {
          recomendacion = `Sección en disputa. La proyección es del ${proyeccionPct.toFixed(1)}%. Enfocar brigadas de persuasión en indecisos.`;
        } else {
          recomendacion = `Sección en riesgo. La proyección es del ${proyeccionPct.toFixed(1)}%. Analizar causas de baja votación.`;
        }

        procesados.push({
          seccion: sec.numero_seccion,
          seccion_id: sec.id,
          barrio_id: sec.barrio_colonia_id,
          votos_2018: votos2018,
          votos_2024: votos2024,
          pct_2024: pct2024,
          proyeccion_votos_2027: proyeccionVotos,
          proyeccion_pct_2027: proyeccionPct,
          tendencia,
          semaforo,
          explicacion,
          recomendacion,
          activistas: activistasSeccion,
          capturados: capturadosSeccion
        });
      });

      setDatos(procesados.sort((a, b) => a.seccion - b.seccion));
      setLoading(false);
    };

    cargarDatos();
  }, []);

  const descargarPDFSeccion = () => {
    if (!pdfRef.current || !seccionSeleccionada) return;
    setGenerandoPDF(true);

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `Plan_Trabajo_Seccion_${seccionSeleccionada.seccion}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true }, // <-- IMPORTANTE
      jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(pdfRef.current).save().then(() => {
      setGenerandoPDF(false);
    }).catch((err: any) => {
      console.error('Error al generar PDF:', err);
      setGenerandoPDF(false);
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px', gap: '10px', color: '#00D4FF' }}>
        <Loader2 size={32} /> Calculando pronóstico electoral...
      </div>
    );
  }

  const seguras = datos.filter(d => d.semaforo === 'segura').length;
  const disputa = datos.filter(d => d.semaforo === 'disputa').length;
  const riesgo = datos.filter(d => d.semaforo === 'riesgo').length;
  const totalProyectado = datos.reduce((sum, d) => sum + d.proyeccion_votos_2027, 0);

  const datosFiltrados = datos.filter(d => filtroSemaforo === 'todas' || d.semaforo === filtroSemaforo);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 className="header-title" style={{ marginBottom: '5px' }}>Pronóstico Electoral 2027</h1>
          <p style={{ margin: 0, color: '#64748B', fontSize: '14px' }}>
            Proyección basada en tendencia histórica y estructura actual.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '25px' }}>
        <div className="card" style={{ padding: '15px', textAlign: 'center', borderTop: '4px solid #00D4FF', borderLeft: 'none' }}>
          <Target size={22} color="#00D4FF" style={{ marginBottom: '5px' }} />
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#0A1628' }}>{totalProyectado.toLocaleString()}</div>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 'bold' }}>Votos Proyectados</div>
        </div>
        <div className="card" style={{ padding: '15px', textAlign: 'center', borderTop: '4px solid #10B981', borderLeft: 'none' }}>
          <CheckCircle2 size={22} color="#10B981" style={{ marginBottom: '5px' }} />
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#10B981' }}>{seguras}</div>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 'bold' }}>Secciones Seguras</div>
        </div>
        <div className="card" style={{ padding: '15px', textAlign: 'center', borderTop: '4px solid #F59E0B', borderLeft: 'none' }}>
          <Minus size={22} color="#F59E0B" style={{ marginBottom: '5px' }} />
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#F59E0B' }}>{disputa}</div>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 'bold' }}>En Disputa</div>
        </div>
        <div className="card" style={{ padding: '15px', textAlign: 'center', borderTop: '4px solid #F43F5E', borderLeft: 'none' }}>
          <AlertTriangle size={22} color="#F43F5E" style={{ marginBottom: '5px' }} />
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#F43F5E' }}>{riesgo}</div>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 'bold' }}>En Riesgo</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {(['todas', 'segura', 'disputa', 'riesgo'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFiltroSemaforo(f)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: `2px solid ${
                f === 'segura' ? '#10B981' :
                f === 'disputa' ? '#F59E0B' :
                f === 'riesgo' ? '#F43F5E' : '#00D4FF'
              }`,
              background: filtroSemaforo === f
                ? (f === 'segura' ? '#10B981' : f === 'disputa' ? '#F59E0B' : f === 'riesgo' ? '#F43F5E' : '#00D4FF')
                : 'white',
              color: filtroSemaforo === f ? 'white' : '#0F172A',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '13px',
              textTransform: 'capitalize'
            }}
          >
            {f === 'todas' ? `Todas (${datos.length})` : 
             f === 'segura' ? `Seguras (${seguras})` : 
             f === 'disputa' ? `En Disputa (${disputa})` : 
             `En Riesgo (${riesgo})`}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
        {datosFiltrados.map(d => (
          <div
            key={d.seccion}
            onClick={() => setSeccionSeleccionada(d)}
            style={{
              background: 'white',
              padding: '16px',
              borderRadius: '10px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              borderLeft: `5px solid ${
                d.semaforo === 'segura' ? '#10B981' :
                d.semaforo === 'disputa' ? '#F59E0B' : '#F43F5E'
              }`,
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <strong style={{ fontSize: '15px', color: '#0F172A' }}>Sección {d.seccion}</strong>
              {d.tendencia === 'sube' && <TrendingUp size={18} color="#10B981" />}
              {d.tendencia === 'baja' && <TrendingDown size={18} color="#F43F5E" />}
              {d.tendencia === 'estable' && <Minus size={18} color="#94A3B8" />}
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00D4FF', marginBottom: '4px' }}>
              {d.proyeccion_pct_2027.toFixed(1)}%
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '6px' }}>
              Proyección 2027
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8', borderTop: '1px solid #E2E8F0', paddingTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
              <span>{d.proyeccion_votos_2027.toLocaleString()} votos</span>
              <span>2024: {d.pct_2024.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>

      {seccionSeleccionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #00D4FF', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ color: '#0A1628', fontSize: '20px', margin: 0 }}>
                  Plan de Trabajo: Sección {seccionSeleccionada.seccion}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                  Análisis estratégico ORION
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={descargarPDFSeccion}
                  disabled={generandoPDF}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 15px' }}
                >
                  {generandoPDF ? (
                    <><Loader2 size={16} className="animate-spin" /> Generando...</>
                  ) : (
                    <><Download size={16} /> Descargar PDF</>
                  )}
                </button>
                <button onClick={() => setSeccionSeleccionada(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: '#64748B' }}>
                  &times;
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '20px' }}>
              <div style={{ background: '#F0FDF4', padding: '12px', borderRadius: '8px', textAlign: 'center', borderLeft: '4px solid #10B981' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10B981' }}>{seccionSeleccionada.proyeccion_pct_2027.toFixed(1)}%</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Proyección 2027</div>
              </div>
              <div style={{ background: '#E0F2FE', padding: '12px', borderRadius: '8px', textAlign: 'center', borderLeft: '4px solid #00D4FF' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0284C7' }}>{seccionSeleccionada.proyeccion_votos_2027.toLocaleString()}</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Votos Esperados</div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', textAlign: 'center', borderLeft: '4px solid #6366F1' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                  <Users size={16} /> {seccionSeleccionada.activistas}
                </div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Activistas</div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', textAlign: 'center', borderLeft: '4px solid #F59E0B' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                  <UserCheck size={16} /> {seccionSeleccionada.capturados}
                </div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Capturados</div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#64748B', fontSize: '14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BarChart3 size={16} /> Tendencia Histórica y Proyección IA
              </h4>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={[
                  { name: '2018', votos: seccionSeleccionada.votos_2018 },
                  { name: '2024', votos: seccionSeleccionada.votos_2024 },
                  { name: '2027 (IA)', votos: seccionSeleccionada.proyeccion_votos_2027 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" stroke="#64748B" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#64748B" tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }} 
                    formatter={(value) => [`${value} votos`, 'Partido']}
                  />
                  <ReferenceLine x="2024" stroke="#94A3B8" strokeDasharray="3 3" label={{ value: "Actual", position: "top", fill: '#64748B', fontSize: 10 }} />
                  <Line type="monotone" dataKey="votos" stroke="#00D4FF" strokeWidth={3} dot={{ fill: '#00D4FF', r: 5 }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{
              background: `${seccionSeleccionada.semaforo === 'segura' ? '#F0FDF4' : seccionSeleccionada.semaforo === 'disputa' ? '#FEF3C7' : '#FFE4E6'}80`,
              borderLeft: `5px solid ${seccionSeleccionada.semaforo === 'segura' ? '#10B981' : seccionSeleccionada.semaforo === 'disputa' ? '#F59E0B' : '#F43F5E'}`,
              padding: '15px',
              borderRadius: '8px'
            }}>
              <h4 style={{ 
                color: seccionSeleccionada.semaforo === 'segura' ? '#10B981' : seccionSeleccionada.semaforo === 'disputa' ? '#F59E0B' : '#F43F5E', 
                fontSize: '15px', 
                marginBottom: '5px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px' 
              }}>
                <Target size={18} /> Recomendación Estratégica
              </h4>
              <p style={{ fontSize: '14px', color: '#0F172A', margin: 0, lineHeight: '1.5' }}>
                {seccionSeleccionada.recomendacion}
              </p>
            </div>
          </div>
        </div>
      )}

      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={pdfRef} style={{ width: '210mm', padding: '15mm', backgroundColor: 'white', fontFamily: 'Arial, sans-serif', color: '#333' }}>
          {seccionSeleccionada && (
            <>
              {/* ENCABEZADO CON LOGO DE ESTRELLAS */}
              <div style={{ borderBottom: '4px solid #0A1628', paddingBottom: '15px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <img src="https://i.ibb.co/mr0jxmKQ/orion-stars-png.png" alt="ORION" style={{ height: '60px' }} />
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748B', letterSpacing: '2px' }}>
                    INTELIGENCIA ELECTORAL
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '11px', color: '#94A3B8', fontWeight: 'bold' }}>
                    PLAN DE TRABAJO
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#0F172A', fontWeight: 'bold' }}>
                    Sección {seccionSeleccionada.seccion}
                  </p>
                </div>
              </div>

              <p style={{ fontSize: '11px', color: '#64748B', marginBottom: '20px' }}>
                Generado el {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
                <div style={{ background: '#F0FDF4', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#10B981' }}>
                    {seccionSeleccionada.proyeccion_pct_2027.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 'bold' }}>PROYECCIÓN</div>
                </div>
                <div style={{ background: '#E0F2FE', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#0284C7' }}>
                    {seccionSeleccionada.proyeccion_votos_2027.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 'bold' }}>VOTOS</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#6366F1' }}>
                    {seccionSeleccionada.activistas}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 'bold' }}>ACTIVISTAS</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#F59E0B' }}>
                    {seccionSeleccionada.capturados}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 'bold' }}>CAPTURADOS</div>
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '15px', borderRadius: '8px', marginBottom: '20px', borderLeft: '5px solid #64748B' }}>
                <h3 style={{ color: '#0F172A', fontSize: '14px', marginBottom: '6px', marginTop: 0 }}>DIAGNÓSTICO</h3>
                <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: '1.6' }}>
                  {seccionSeleccionada.explicacion}
                </p>
              </div>

              <div style={{
                background: `${seccionSeleccionada.semaforo === 'segura' ? '#F0FDF4' : seccionSeleccionada.semaforo === 'disputa' ? '#FEF3C7' : '#FFE4E6'}`,
                borderLeft: `5px solid ${seccionSeleccionada.semaforo === 'segura' ? '#10B981' : seccionSeleccionada.semaforo === 'disputa' ? '#F59E0B' : '#F43F5E'}`,
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <h3 style={{ 
                  color: seccionSeleccionada.semaforo === 'segura' ? '#10B981' : seccionSeleccionada.semaforo === 'disputa' ? '#F59E0B' : '#F43F5E', 
                  fontSize: '14px', 
                  marginBottom: '6px',
                  marginTop: 0
                }}>
                  RECOMENDACIÓN ESTRATÉGICA
                </h3>
                <p style={{ fontSize: '12px', color: '#0F172A', margin: 0, lineHeight: '1.6' }}>
                  {seccionSeleccionada.recomendacion}
                </p>
              </div>

              <div style={{ marginTop: '30px', paddingTop: '15px', borderTop: '2px solid #E2E8F0', textAlign: 'center', fontSize: '10px', color: '#94A3B8' }}>
                <p style={{ margin: 0 }}>
                  <strong>ORION · Inteligencia Electoral</strong> · Documento Confidencial
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}