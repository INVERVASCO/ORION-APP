// @ts-nocheck
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Vote, UserCheck, TrendingUp, Loader2, Award, MapPin, 
  AlertTriangle, CheckCircle2, Minus, Target, Download, FileText,
  ArrowRight, BarChart3, Brain, Zap, Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import MapaSecciones from '../components/MapaSecciones';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface TopBarrio {
  barrio_colonia_id: string;
  nombre: string;
  total: number;
}

interface PronosticoResumen {
  totalVotos: number;
  seguras: number;
  disputa: number;
  riesgo: number;
  seccionesEnRiesgo: { seccion: number; pct: number; votos: number }[];
}

interface DatosMapa {
  [seccion: number]: {
    pct: number;
    riesgo: 'alto' | 'medio' | 'bajo';
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metricas, setMetricas] = useState({
    totalPersonas: 0,
    totalCasillas: 0,
    casillasCubiertas: 0,
    totalBarrios: 0,
    barriosConActivismo: 0,
    totalFuncionarios: 0,
  });
  const [pronostico, setPronostico] = useState<PronosticoResumen>({
    totalVotos: 0, seguras: 0, disputa: 0, riesgo: 0, seccionesEnRiesgo: [],
  });
  const [topBarrios, setTopBarrios] = useState<TopBarrio[]>([]);
  const [funcionariosPorTipo, setFuncionariosPorTipo] = useState<Record<string, number>>({});
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMensaje, setToastMensaje] = useState('');
  const [datosMapa, setDatosMapa] = useState<DatosMapa>({});

  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMetricas = async () => {
      setLoading(true);

      const { count: totalPersonas } = await supabase.from('personas').select('*', { count: 'exact', head: true });
      const { count: totalCasillas } = await supabase.from('casillas').select('*', { count: 'exact', head: true });
      const { data: funcData } = await supabase.from('funcionarios_casilla').select('casilla_id');
      const casillasCubiertas = funcData ? new Set(funcData.map(f => f.casilla_id)).size : 0;
      const totalFuncionarios = funcData ? funcData.length : 0;
      const { count: totalBarrios } = await supabase.from('barrios_colonias').select('*', { count: 'exact', head: true });
      const { data: activismoData } = await supabase.from('activismo').select('barrio_colonia_id');
      const barriosConActivismo = activismoData ? new Set(activismoData.map(a => a.barrio_colonia_id)).size : 0;

      const { data: personasData } = await supabase
        .from('personas')
        .select('barrio_colonia_id, barrios_colonias(nombre)')
        .not('barrio_colonia_id', 'is', null);

      if (personasData) {
        const conteo: Record<string, { nombre: string; total: number }> = {};
        personasData.forEach((p: any) => {
          const id = p.barrio_colonia_id;
          const nombre = p.barrios_colonias?.nombre || 'Sin nombre';
          if (!conteo[id]) conteo[id] = { nombre, total: 0 };
          conteo[id].total++;
        });
        const top = Object.entries(conteo)
          .map(([id, v]) => ({ barrio_colonia_id: id, nombre: v.nombre, total: v.total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);
        setTopBarrios(top);
      }

      const { data: funcTipos } = await supabase.from('funcionarios_casilla').select('tipo_funcionario');
      if (funcTipos) {
        const conteo: Record<string, number> = {};
        funcTipos.forEach(f => { conteo[f.tipo_funcionario] = (conteo[f.tipo_funcionario] || 0) + 1; });
        setFuncionariosPorTipo(conteo);
      }

      const { data: seccionesData } = await supabase
        .from('secciones_electorales')
        .select('id, numero_seccion, barrio_colonia_id');

      const { data: resultadosData } = await supabase
        .from('resultados_casilla')
        .select('anio, seccion, morena, total_votos, lista_nominal, tipo_eleccion')
        .eq('tipo_eleccion', 'Presidencial');

      if (seccionesData && resultadosData) {
        let totalVotosProyectados = 0;
        let seguras = 0, disputa = 0, riesgo = 0;
        const enRiesgo: { seccion: number; pct: number; votos: number }[] = [];
        const datosTemporales: DatosMapa = {};

        const capturadosPorBarrio: Record<string, number> = {};
        personasData?.forEach((p: any) => {
          if (p.barrio_colonia_id) capturadosPorBarrio[p.barrio_colonia_id] = (capturadosPorBarrio[p.barrio_colonia_id] || 0) + 1;
        });

        const activistasPorBarrio: Record<string, number> = {};
        activismoData?.forEach(a => {
          if (a.barrio_colonia_id) activistasPorBarrio[a.barrio_colonia_id] = (activistasPorBarrio[a.barrio_colonia_id] || 0) + 1;
        });

        seccionesData.forEach(sec => {
          const numSeccion = Number(sec.numero_seccion);

          const res2018 = resultadosData.filter(r => Number(r.seccion) === numSeccion && r.anio === 2018);
          const res2024 = resultadosData.filter(r => Number(r.seccion) === numSeccion && r.anio === 2024);

          const votos2018 = res2018.reduce((s, r) => s + r.morena, 0);
          const votos2024 = res2024.reduce((s, r) => s + r.morena, 0);
          const lista2024 = res2024.reduce((s, r) => s + r.lista_nominal, 0);

          let proyeccionVotos = votos2024;
          if (votos2018 > 0) {
            const tendenciaAnual = (votos2024 - votos2018) / 6;
            proyeccionVotos = Math.round(votos2024 + (tendenciaAnual * 3));
          } else {
            proyeccionVotos = Math.round(votos2024 * 1.05);
          }

          const activistas = activistasPorBarrio[sec.barrio_colonia_id || ''] || 0;
          const capturados = capturadosPorBarrio[sec.barrio_colonia_id || ''] || 0;
          const factorEstructura = Math.min(1 + (activistas * 0.01), 1.15);
          const factorPadron = Math.min(1 + (capturados * 0.005), 1.10);

          proyeccionVotos = Math.round(proyeccionVotos * factorEstructura * factorPadron);
          const proyeccionPct = lista2024 > 0 ? (proyeccionVotos / lista2024) * 100 : 0;

          totalVotosProyectados += proyeccionVotos;

          let nivelRiesgo: 'alto' | 'medio' | 'bajo' = 'bajo';
          
          if (proyeccionPct >= 45) {
            seguras++;
            nivelRiesgo = 'bajo';
          } else if (proyeccionPct < 35) {
            riesgo++;
            nivelRiesgo = 'alto';
            enRiesgo.push({ seccion: numSeccion, pct: proyeccionPct, votos: proyeccionVotos });
          } else {
            disputa++;
            nivelRiesgo = 'medio';
          }

          datosTemporales[numSeccion + 54] = { pct: proyeccionPct, riesgo: nivelRiesgo };
        });

        enRiesgo.sort((a, b) => b.votos - a.votos);

        setPronostico({
          totalVotos: totalVotosProyectados,
          seguras, disputa, riesgo,
          seccionesEnRiesgo: enRiesgo.slice(0, 5),
        });

        setDatosMapa(datosTemporales);
      }

      setMetricas({
        totalPersonas: totalPersonas || 0,
        totalCasillas: totalCasillas || 0,
        casillasCubiertas,
        totalBarrios: totalBarrios || 0,
        barriosConActivismo,
        totalFuncionarios,
      });
      setLoading(false);
    };

    fetchMetricas();
  }, []);

  const descargarResumenPDF = () => {
    if (!pdfRef.current) return;
    const opt = {
      margin: [8, 8, 8, 8],
      filename: `Resumen_Ejecutivo_ORION_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollY: 0, windowWidth: 800 },
      jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    html2pdf().set(opt).from(pdfRef.current).save();
    setToastMensaje('Resumen Ejecutivo descargado');
    setToastVisible(true);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '50px', gap: '10px', color: '#00D4FF' }}>
        <Loader2 size={32} /> Cargando métricas y pronóstico...
      </div>
    );
  }

  const pctCasillas = metricas.totalCasillas > 0 ? Math.round((metricas.casillasCubiertas / metricas.totalCasillas) * 100) : 0;
  const pctActivismo = metricas.totalBarrios > 0 ? Math.round((metricas.barriosConActivismo / metricas.totalBarrios) * 100) : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 className="header-title" style={{ marginBottom: '5px' }}>Panel de Control Ejecutivo</h1>
          <p style={{ margin: 0, color: '#64748B', fontSize: '14px' }}>Resumen en tiempo real de la operación territorial.</p>
        </div>
        <button onClick={descargarResumenPDF} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', fontSize: '14px' }}>
          <Download size={18} /> Descargar Reporte Ejecutivo
        </button>
      </div>

      <div style={{ background: 'linear-gradient(135deg, #0A1628 0%, #00D4FF 100%)', borderRadius: '16px', padding: '28px', marginBottom: '25px', color: 'white', boxShadow: '0 10px 30px rgba(0, 212, 255, 0.3)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid rgba(255,255,255,0.3)' }}>
            <Brain size={38} />
          </div>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <Sparkles size={18} />
              <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '2px', opacity: 0.9 }}>POWERED BY DEEPSEEK IA</span>
            </div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: '800', lineHeight: '1.3' }}>Tu Director de Campaña con Inteligencia Artificial</h2>
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.95, lineHeight: '1.5' }}>La IA analiza los datos de tu campaña y te dice qué hacer HOY.</p>
          </div>
          <button onClick={() => navigate('/app/centro-ia')} style={{ background: 'white', color: '#0A1628', border: 'none', padding: '16px 28px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 6px 20px rgba(0,0,0,0.15)', transition: 'transform 0.2s', whiteSpace: 'nowrap' }}>
            <Zap size={18} /> Ir al Centro IA <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {pronostico.riesgo > 0 && (
        <div style={{ background: '#FFE4E6', borderLeft: '5px solid #F43F5E', borderRadius: '10px', padding: '20px', marginBottom: '25px', display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
          <AlertTriangle size={32} color="#F43F5E" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#F43F5E', fontSize: '18px' }}>⚠️ Alerta Electoral 2027</h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#4C0519', lineHeight: '1.5' }}>
              El sistema ha detectado <strong>{pronostico.riesgo} secciones en riesgo</strong> y <strong>{pronostico.disputa} en disputa</strong>. Se requiere acción inmediata.
            </p>
            <button onClick={() => navigate('/app/pronostico')} style={{ background: '#F43F5E', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Ver Plan de Trabajo Prioritario <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      <h3 style={{ color: '#0A1628', fontSize: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Target size={20} color="#00D4FF" /> Pronóstico Electoral 2027
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '30px' }}>
        <div className="card" style={{ padding: '18px', textAlign: 'center' }}>
          <Target size={24} color="#00D4FF" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0A1628' }}>{pronostico.totalVotos.toLocaleString()}</div>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 'bold' }}>Votos Proyectados</div>
        </div>
        <div className="card" style={{ padding: '18px', textAlign: 'center' }}>
          <CheckCircle2 size={24} color="#10B981" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10B981' }}>{pronostico.seguras}</div>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 'bold' }}>Secciones Seguras</div>
        </div>
        <div className="card" style={{ padding: '18px', textAlign: 'center' }}>
          <Minus size={24} color="#F59E0B" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#F59E0B' }}>{pronostico.disputa}</div>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 'bold' }}>En Disputa</div>
        </div>
        <div className="card" style={{ padding: '18px', textAlign: 'center' }}>
          <AlertTriangle size={24} color="#F43F5E" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#F43F5E' }}>{pronostico.riesgo}</div>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 'bold' }}>En Riesgo</div>
        </div>
      </div>

      <h3 style={{ color: '#0A1628', fontSize: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <MapPin size={20} color="#00D4FF" /> Mapa Electoral
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '30px', alignItems: 'start' }}>
        <div style={{ height: '450px', width: '100%' }}>
          <MapaSecciones datos={datosMapa} />
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', borderTop: '4px solid #F43F5E', height: '450px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
            <AlertTriangle size={22} color="#F43F5E" />
            <h3 style={{ color: '#F43F5E', fontSize: '15px', margin: 0 }}>Prioridades de Hoy</h3>
          </div>
          <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '15px', lineHeight: '1.4' }}>Secciones con mayor cantidad de votos en riesgo.</p>

          {pronostico.seccionesEnRiesgo.length > 0 ? (
            pronostico.seccionesEnRiesgo.map((s, idx) => (
              <div key={s.seccion} onClick={() => navigate(`/app/secciones?seccion=${s.seccion + 54}`)} style={{ padding: '12px', background: idx === 0 ? '#FFE4E6' : '#F8FAFC', borderRadius: '8px', marginBottom: '10px', borderLeft: '4px solid #F43F5E', cursor: 'pointer', transition: 'transform 0.15s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <strong style={{ fontSize: '14px', color: '#0F172A' }}>#{idx + 1} · Sec. {s.seccion + 54}</strong>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '2px 6px', background: '#F43F5E', color: 'white', borderRadius: '4px' }}>ALTO</span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '3px' }}>Proyección: <b style={{ color: '#F43F5E' }}>{s.pct.toFixed(1)}%</b></div>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>{s.votos.toLocaleString()} votos esperados</div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94A3B8', fontSize: '13px' }}>🎉 No hay secciones en riesgo crítico</div>
          )}
        </div>
      </div>

      <h3 style={{ color: '#0A1628', fontSize: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <BarChart3 size={20} color="#00D4FF" /> Operación Territorial
      </h3>
      <div className="grid-menu" style={{ marginBottom: '30px' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <Users size={24} color="#00D4FF" />
            <h3 style={{ fontSize: '15px', margin: 0, color: '#0F172A' }}>Personas Capturadas</h3>
          </div>
          <p style={{ fontSize: '42px', color: '#0A1628', fontWeight: 'bold', margin: 0 }}>{metricas.totalPersonas}</p>
        </div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <Vote size={24} color="#00D4FF" />
            <h3 style={{ fontSize: '15px', margin: 0, color: '#0F172A' }}>Casillas Cubiertas</h3>
          </div>
          <p style={{ fontSize: '42px', color: '#0A1628', fontWeight: 'bold', margin: 0 }}>{metricas.casillasCubiertas} <span style={{ fontSize: '22px', color: '#64748B' }}>/ {metricas.totalCasillas}</span></p>
          <div style={{ marginTop: '10px', height: '8px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${pctCasillas}%`, height: '100%', background: '#00D4FF', transition: 'width 0.5s' }} />
          </div>
          <p style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>{pctCasillas}% de cobertura</p>
        </div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <UserCheck size={24} color="#00D4FF" />
            <h3 style={{ fontSize: '15px', margin: 0, color: '#0F172A' }}>Estructura de Activismo</h3>
          </div>
          <p style={{ fontSize: '42px', color: '#0A1628', fontWeight: 'bold', margin: 0 }}>{pctActivismo}%</p>
          <p style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>{metricas.barriosConActivismo} de {metricas.totalBarrios} barrios</p>
        </div>
      </div>

      <div style={{ display: 'none' }}>
        <div ref={pdfRef} style={{ padding: '40px', background: 'white', width: '800px', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '4px solid #0A1628', paddingBottom: '25px' }}>
            <img src="https://i.ibb.co/mr0jxmKQ/orion-stars-png.png" alt="ORION" style={{ height: '100px', margin: '0 auto' }} />
            <h2 style={{ color: '#00D4FF', fontSize: '18px', margin: '10px 0 0 0', fontWeight: 'bold' }}>Reporte Ejecutivo General</h2>
            <p style={{ color: '#64748B', fontSize: '13px', margin: '5px 0 0 0' }}>Inteligencia Electoral</p>
            <p style={{ color: '#94A3B8', fontSize: '12px', margin: '8px 0 0 0' }}>Generado el {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
          <div style={{ marginBottom: '35px' }}>
            <h3 style={{ color: '#0A1628', fontSize: '18px', borderBottom: '2px solid #E2E8F0', paddingBottom: '8px', marginBottom: '15px' }}>1. Pronóstico Electoral 2027</h3>
            <p style={{ fontSize: '13px', color: '#0F172A', lineHeight: '1.7' }}>
              Con base en los resultados históricos, el sistema proyecta un total de <strong style={{ fontSize: '16px', color: '#00D4FF' }}>{pronostico.totalVotos.toLocaleString()} votos</strong> para el partido.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', gap: '10px' }}>
              <div style={{ textAlign: 'center', flex: 1, background: '#F0FDF4', padding: '15px', borderRadius: '8px' }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10B981' }}>{pronostico.seguras}</div>
                <div style={{ fontSize: '12px', color: '#0F172A', fontWeight: 'bold' }}>Secciones Seguras</div>
              </div>
              <div style={{ textAlign: 'center', flex: 1, background: '#FEF3C7', padding: '15px', borderRadius: '8px' }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#F59E0B' }}>{pronostico.disputa}</div>
                <div style={{ fontSize: '12px', color: '#0F172A', fontWeight: 'bold' }}>En Disputa</div>
              </div>
              <div style={{ textAlign: 'center', flex: 1, background: '#FFE4E6', padding: '15px', borderRadius: '8px' }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#F43F5E' }}>{pronostico.riesgo}</div>
                <div style={{ fontSize: '12px', color: '#0F172A', fontWeight: 'bold' }}>En Riesgo</div>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '40px', paddingTop: '20px', borderTop: '2px solid #E2E8F0', fontSize: '10px', color: '#94A3B8' }}>
            <p style={{ margin: 0, fontWeight: 'bold', color: '#0A1628' }}>ORION · Inteligencia Electoral</p>
            <p style={{ margin: '4px 0 0 0' }}>Documento Confidencial</p>
          </div>
        </div>
      </div>

      {toastVisible && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: 'white', padding: '16px 24px', borderRadius: '10px', boxShadow: '0 8px 25px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 2000, borderLeft: '5px solid #00D4FF' }}>
          <CheckCircle2 size={24} color="#00D4FF" />
          <p style={{ margin: 0, fontWeight: 'bold', color: '#0F172A', fontSize: '14px' }}>{toastMensaje}</p>
        </div>
      )}
    </div>
  );
}
