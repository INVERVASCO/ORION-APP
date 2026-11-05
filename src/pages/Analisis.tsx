import { useEffect, useState } from 'react';
import { Loader2, TrendingUp, TrendingDown, Minus, MapPin, BarChart3, Target, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { supabase } from '../lib/supabaseClient';
import { ORION_CONFIG, PARTIDOS_DB } from '../lib/config';

interface Resultado {
  anio: number;
  tipo_eleccion: string;
  seccion: number;
  casilla: string;
  es_especial: boolean;
  total_votos: number;
  lista_nominal: number;
  participacion: number;
  votos_nulos: number;
  votos_no_reg: number;
  [key: string]: any; 
}

interface ResumenSeccion {
  seccion: number;
  pct_nuestra_org: number;
  participacion: number;
  total_votos: number;
  total_lista: number;
  casillas: number;
  semaforo: 'segura' | 'disputa' | 'riesgo';
  tendencia: 'sube' | 'baja' | 'estable';
}

export default function Analisis() {
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [loading, setLoading] = useState(true);
  const [seccionActiva, setSeccionActiva] = useState<number | null>(null);
  const [resumenSecciones, setResumenSecciones] = useState<ResumenSeccion[]>([]);
  const [filtroSemaforo, setFiltroSemaforo] = useState<'todas' | 'segura' | 'disputa' | 'riesgo'>('todas');
  
  const [partidoObjetivo, setPartidoObjetivo] = useState<string>('todos');

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('resultados_casilla')
        .select('*')
        .order('anio', { ascending: true });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setResultados(data || []);
      setResumenSecciones(calcularResumen(data || []));
      setLoading(false);
    };
    cargarDatos();
  }, [partidoObjetivo]);

  const calcularResumen = (data: Resultado[]): ResumenSeccion[] => {
    const porSeccion = new Map<number, Resultado[]>();
    data.forEach(r => {
      if (!porSeccion.has(r.seccion)) porSeccion.set(r.seccion, []);
      porSeccion.get(r.seccion)!.push(r);
    });

    const resumen: ResumenSeccion[] = [];

    porSeccion.forEach((rows, seccion) => {
      const pres2018 = rows.filter(r => r.anio === 2018 && r.tipo_eleccion === 'Presidencial');
      const pres2024 = rows.filter(r => r.anio === 2024 && r.tipo_eleccion === 'Presidencial');

      const getVotos = (res: any[]) => {
        return res.reduce((sum, r) => {
          if (partidoObjetivo === 'todos') return sum + (Number(r.total_votos) || 0);
          return sum + (Number(r[partidoObjetivo]) || 0);
        }, 0);
      };

      const votosNuestraOrg2024 = getVotos(pres2024);
      const votosNuestraOrg2018 = getVotos(pres2018);
      
      const total2024 = pres2024.reduce((s, r) => s + (Number(r.total_votos) || 0), 0);
      const lista2024 = pres2024.reduce((s, r) => s + (Number(r.lista_nominal) || 0), 0);

      const participacion = lista2024 > 0 ? (total2024 / lista2024) * 100 : 0;
      const pctNuestraOrg = total2024 > 0 ? (votosNuestraOrg2024 / total2024) * 100 : 0;

      let semaforo: 'segura' | 'disputa' | 'riesgo' = 'disputa';
      if (pctNuestraOrg >= ORION_CONFIG.electoral.umbralSegura) semaforo = 'segura';
      else if (pctNuestraOrg < ORION_CONFIG.electoral.umbralRiesgo) semaforo = 'riesgo';

      let tendencia: 'sube' | 'baja' | 'estable' = 'estable';
      if (votosNuestraOrg2018 > 0) {
        const dif = ((votosNuestraOrg2024 - votosNuestraOrg2018) / votosNuestraOrg2018) * 100;
        if (dif > 5) tendencia = 'sube';
        else if (dif < -5) tendencia = 'baja';
      }

      resumen.push({
        seccion,
        pct_nuestra_org: Math.round(pctNuestraOrg * 10) / 10,
        participacion: Math.round(participacion * 10) / 10,
        total_votos: total2024,
        total_lista: lista2024,
        casillas: pres2024.length,
        semaforo,
        tendencia
      });
    });

    return resumen.sort((a, b) => a.seccion - b.seccion);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px', gap: '10px', color: '#00A651' }}>
        <Loader2 size={32} /> Cargando análisis territorial...
      </div>
    );
  }

  if (seccionActiva !== null) {
    return <DetalleSeccion seccion={seccionActiva} resultados={resultados} partidoObjetivo={partidoObjetivo} onBack={() => setSeccionActiva(null)} />;
  }

  const filtradas = resumenSecciones.filter(s => filtroSemaforo === 'todas' || s.semaforo === filtroSemaforo);
  const conteoSeguras = resumenSecciones.filter(s => s.semaforo === 'segura').length;
  const conteoDisputa = resumenSecciones.filter(s => s.semaforo === 'disputa').length;
  const conteoRiesgo = resumenSecciones.filter(s => s.semaforo === 'riesgo').length;

  return (
    <div>
      <h1 className="header-title">Análisis Territorial</h1>
      <p style={{ marginBottom: '10px', color: '#666', fontSize: '14px' }}>
        Mapa de calor de las {resumenSecciones.length} secciones. Análisis de oportunidad y tendencia histórica.
      </p>
      
      <p style={{ marginBottom: '20px', color: '#94A3B8', fontSize: '12px', fontStyle: 'italic', maxWidth: '800px' }}>
        ⚠️ Aviso: Las proyecciones y tendencias son estimaciones heurísticas basadas en datos históricos. No constituyen una predicción matemática exacta.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', background: 'white', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', width: 'fit-content' }}>
        <Target size={18} color="#00A651" />
        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>Analizar desempeño de:</span>
        <select 
          value={partidoObjetivo} 
          onChange={(e) => setPartidoObjetivo(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '14px', fontWeight: 'bold', color: '#00A651', background: 'transparent', cursor: 'pointer' }}
        >
          <option value="todos">Participación Total</option>
          {PARTIDOS_DB.map(p => <option key={p.key} value={p.key}>{p.nombre}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '25px' }}>
        <div className="card" style={{ padding: '15px', textAlign: 'center', borderTop: '4px solid #4CAF50', borderLeft: 'none' }}>
          <CheckCircle2 size={22} color="#4CAF50" style={{ marginBottom: '5px' }} />
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#4CAF50' }}>{conteoSeguras}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Zonas Seguras</div>
          <div style={{ fontSize: '10px', color: '#999' }}>≥{ORION_CONFIG.electoral.umbralSegura}%</div>
        </div>
        <div className="card" style={{ padding: '15px', textAlign: 'center', borderTop: '4px solid #F9A825', borderLeft: 'none' }}>
          <Minus size={22} color="#F9A825" style={{ marginBottom: '5px' }} />
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#F9A825' }}>{conteoDisputa}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>En Disputa</div>
        </div>
        <div className="card" style={{ padding: '15px', textAlign: 'center', borderTop: '4px solid #F44336', borderLeft: 'none' }}>
          <AlertTriangle size={22} color="#F44336" style={{ marginBottom: '5px' }} />
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#F44336' }}>{conteoRiesgo}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>En Riesgo</div>
          <div style={{ fontSize: '10px', color: '#999' }}>&lt;{ORION_CONFIG.electoral.umbralRiesgo}%</div>
        </div>
        <div className="card" style={{ padding: '15px', textAlign: 'center', borderTop: '4px solid #00A651', borderLeft: 'none' }}>
          <Target size={22} color="#00A651" style={{ marginBottom: '5px' }} />
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#00A651' }}>{resumenSecciones.length}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Total Secciones</div>
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
              border: `2px solid ${f === 'segura' ? '#4CAF50' : f === 'disputa' ? '#F9A825' : f === 'riesgo' ? '#F44336' : '#00A651'}`,
              background: filtroSemaforo === f ? (f === 'segura' ? '#4CAF50' : f === 'disputa' ? '#F9A825' : f === 'riesgo' ? '#F44336' : '#00A651') : 'white',
              color: filtroSemaforo === f ? 'white' : '#333',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '13px',
              textTransform: 'capitalize'
            }}
          >
            {f === 'todas' ? 'Todas' : f === 'segura' ? 'Seguras' : f === 'disputa' ? 'En disputa' : 'En riesgo'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
        {filtradas.map(s => (
          <div
            key={s.seccion}
            onClick={() => setSeccionActiva(s.seccion)}
            style={{
              background: 'white',
              padding: '16px',
              borderRadius: '10px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              borderLeft: `5px solid ${s.semaforo === 'segura' ? '#4CAF50' : s.semaforo === 'disputa' ? '#F9A825' : '#F44336'}`,
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <strong style={{ fontSize: '15px', color: '#333' }}>Sección {s.seccion}</strong>
              {s.tendencia === 'sube' && <TrendingUp size={18} color="#4CAF50" />}
              {s.tendencia === 'baja' && <TrendingDown size={18} color="#F44336" />}
              {s.tendencia === 'estable' && <Minus size={18} color="#999" />}
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0066CC', marginBottom: '4px' }}>
              {s.pct_nuestra_org}%
            </div>
            <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px' }}>
              Porcentaje de presencia
            </div>
            <div style={{ fontSize: '11px', color: '#999', borderTop: '1px solid #EEE', paddingTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
              <span>{s.casillas} casillas</span>
              <span>Part. {s.participacion}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetalleSeccion({ seccion, resultados, partidoObjetivo, onBack }: { seccion: number; resultados: Resultado[]; partidoObjetivo: string; onBack: () => void; }) {
  const datosSeccion = resultados.filter(r => r.seccion === seccion);
  
  const nombreOrg = partidoObjetivo === 'todos' ? 'Participación Total' : (PARTIDOS_DB.find(p => p.key === partidoObjetivo)?.nombre || 'Nuestra Organización');
  const colorOrg = partidoObjetivo === 'todos' ? '#0066CC' : (PARTIDOS_DB.find(p => p.key === partidoObjetivo)?.color || '#00A651');

  const historicos = ['2018-Presidencial', '2021-Diputacion Federal', '2022-Gubernatura', '2024-Presidencial'];
  const dataGrafica = historicos.map(key => {
    const [anio, tipo] = key.split('-');
    const filas = datosSeccion.filter(r => r.anio === Number(anio) && r.tipo_eleccion === tipo);
    const total = filas.reduce((s, r) => s + (Number(r.total_votos) || 0), 0);
    const votosOrg = filas.reduce((s, r) => s + (Number(r[partidoObjetivo]) || 0), 0);
    
    return {
      name: `${anio} ${tipo.split(' ')[0]}`,
      [nombreOrg]: votosOrg,
      'Resto': total - votosOrg,
      'Total': total
    };
  });

  const pres2024 = datosSeccion.filter(r => r.anio === 2024 && r.tipo_eleccion === 'Presidencial');
  const dataCasillas = pres2024.map(r => {
    const totalPartidos = r.morena + r.pan + r.pri + r.prd + r.pvem + r.pt + r.mc + r.otros;
    const votosOrg = Number(r[partidoObjetivo]) || 0;
    return {
      casilla: r.casilla,
      [nombreOrg]: votosOrg,
      'Resto': totalPartidos - votosOrg,
      pct: totalPartidos > 0 ? Math.round((votosOrg / totalPartidos) * 1000) / 10 : 0
    };
  });

  const totalVotos2024 = pres2024.reduce((s, r) => s + (Number(r.total_votos) || 0), 0);
  const votosOrg2024 = pres2024.reduce((s, r) => s + (Number(r[partidoObjetivo]) || 0), 0);
  const lista2024 = pres2024.reduce((s, r) => s + (Number(r.lista_nominal) || 0), 0);
  const pctOrg = totalVotos2024 > 0 ? Math.round((votosOrg2024 / totalVotos2024) * 1000) / 10 : 0;
  const participacion = lista2024 > 0 ? Math.round((totalVotos2024 / lista2024) * 1000) / 10 : 0;

  let recomendacion = '';
  let colorRecomendacion = '#00A651';
  
  if (pctOrg >= ORION_CONFIG.electoral.umbralSegura) {
    recomendacion = `Zona de fortaleza para ${nombreOrg}. Priorizar el mantenimiento de la estructura, asegurar representantes y consolidar la presencia.`;
    colorRecomendacion = '#4CAF50';
  } else if (pctOrg >= ORION_CONFIG.electoral.umbralRiesgo) {
    recomendacion = `Zona en disputa. Enfocar esfuerzos en persuasión, identificar indecisos y reforzar la presencia territorial de ${nombreOrg}.`;
    colorRecomendacion = '#F9A825';
  } else {
    recomendacion = `Zona de oportunidad baja. Optimizar recursos, mantener estructura mínima de contacto y buscar estrategias de giro o alianzas locales.`;
    colorRecomendacion = '#F44336';
  }

  return (
    <div>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', color: colorOrg, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '15px',
        fontWeight: 'bold', fontSize: '15px'
      }}>
        ← Volver al mapa
      </button>

      <h1 className="header-title">Sección {seccion}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '25px' }}>
        <div className="card" style={{ padding: '15px', textAlign: 'center', borderTop: `4px solid ${colorOrg}`, borderLeft: 'none' }}>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: colorOrg }}>{pctOrg}%</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Presencia de {nombreOrg}</div>
        </div>
        <div className="card" style={{ padding: '15px', textAlign: 'center', borderTop: '4px solid #0277BD', borderLeft: 'none' }}>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#0277BD' }}>{participacion}%</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Participación</div>
        </div>
        <div className="card" style={{ padding: '15px', textAlign: 'center', borderTop: `4px solid ${colorOrg}`, borderLeft: 'none' }}>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: colorOrg }}>{votosOrg2024.toLocaleString()}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Votos {nombreOrg}</div>
        </div>
        <div className="card" style={{ padding: '15px', textAlign: 'center', borderTop: '4px solid #666', borderLeft: 'none' }}>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#666' }}>{pres2024.length}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Casillas</div>
        </div>
      </div>

      <div style={{
        background: `${colorRecomendacion}15`,
        borderLeft: `5px solid ${colorRecomendacion}`,
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '25px'
      }}>
        <h3 style={{ color: colorRecomendacion, fontSize: '15px', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target size={18} /> Recomendación estratégica
        </h3>
        <p style={{ fontSize: '13px', color: '#333', margin: 0 }}>{recomendacion}</p>
      </div>

      <div className="card" style={{ marginBottom: '25px' }}>
        <h3 style={{ color: colorOrg, fontSize: '16px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={20} /> Tendencia histórica: {nombreOrg} vs Resto
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dataGrafica}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
            <XAxis dataKey="name" stroke="#666" tick={{ fontSize: 11 }} />
            <YAxis stroke="#666" />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E0E0E0' }} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Line type="monotone" dataKey={nombreOrg} stroke={colorOrg} strokeWidth={3} dot={{ fill: colorOrg, r: 5 }} />
            <Line type="monotone" dataKey="Resto" stroke="#999" strokeWidth={2} dot={{ fill: '#999', r: 3 }} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3 style={{ color: colorOrg, fontSize: '16px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={20} /> Rendimiento por casilla (Presidencial 2024)
        </h3>
        <ResponsiveContainer width="100%" height={Math.max(250, dataCasillas.length * 35)}>
          <BarChart data={dataCasillas} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
            <XAxis type="number" stroke="#666" />
            <YAxis dataKey="casilla" type="category" width={100} stroke="#666" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E0E0E0' }} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <ReferenceLine x={0} stroke="#999" />
            <Bar dataKey={nombreOrg} stackId="a" fill={colorOrg} name={nombreOrg} />
            <Bar dataKey="Resto" stackId="a" fill="#E2E8F0" name="Resto" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
