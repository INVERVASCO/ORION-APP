import { useEffect, useState } from 'react';
import { Loader2, TrendingUp, TrendingDown, Minus, MapPin, BarChart3, Target, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { supabase } from '../lib/supabaseClient';

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
  morena: number;
  pan: number;
  pri: number;
  prd: number;
  pvem: number;
  pt: number;
  mc: number;
  otros: number;
}

interface ResumenSeccion {
  seccion: number;
  seccion_oposicion_2024: number;
  seccion_oposicion_2018: number;
  pct_oposicion: number;
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
  }, []);

  // === Calcular resumen por sección (ADAPTADO A OPOSICIÓN) ===
  const calcularResumen = (data: Resultado[]): ResumenSeccion[] => {
    const porSeccion = new Map<number, Resultado[]>();
    data.forEach(r => {
      if (!porSeccion.has(r.seccion)) porSeccion.set(r.seccion, []);
      porSeccion.get(r.seccion)!.push(r);
    });

    const resumen: ResumenSeccion[] = [];

    porSeccion.forEach((rows, seccion) => {
      // Filtrar solo Presidencial 2018 y Presidencial 2024 (comparables)
      const pres2018 = rows.filter(r => r.anio === 2018 && r.tipo_eleccion === 'Presidencial');
      const pres2024 = rows.filter(r => r.anio === 2024 && r.tipo_eleccion === 'Presidencial');

      // Votos de MORENA
      const morena2018 = pres2018.reduce((s, r) => s + r.morena, 0);
      const morena2024 = pres2024.reduce((s, r) => s + r.morena, 0);
      
      const total2024 = pres2024.reduce((s, r) => s + r.total_votos, 0);
      const lista2024 = pres2024.reduce((s, r) => s + r.lista_nominal, 0);

      // 🚀 CÁLCULO DE OPOSICIÓN: Todo lo que NO es MORENA
      const votos_oposicion_2024 = total2024 - morena2024;
      const votos_oposicion_2018 = pres2018.reduce((s, r) => s + r.total_votos, 0) - morena2018;

      // Participación
      const participacion = lista2024 > 0 ? (total2024 / lista2024) * 100 : 0;

      // % de Oportunidad (Voto Opositor) sobre votos totales 2024
      const pct_oposicion = total2024 > 0 ? (votos_oposicion_2024 / total2024) * 100 : 0;

      // 🚦 SEMÁFORO INVERTIDO (A favor de UNIDOS X TULA)
      // Si la oposición tiene >= 50%, es una sección SEGURA para nosotros (Verde)
      // Si la oposición tiene < 35%, es una sección en RIESGO (Rojo - terreno enemigo)
      let semaforo: 'segura' | 'disputa' | 'riesgo' = 'disputa';
      if (pct_oposicion >= 50) semaforo = 'segura';
      else if (pct_oposicion < 35) semaforo = 'riesgo';

      // Tendencia
      let tendencia: 'sube' | 'baja' | 'estable' = 'estable';
      if (votos_oposicion_2018 > 0) {
        const dif = ((votos_oposicion_2024 - votos_oposicion_2018) / votos_oposicion_2018) * 100;
        if (dif > 5) tendencia = 'sube';
        else if (dif < -5) tendencia = 'baja';
      }

      resumen.push({
        seccion,
        seccion_oposicion_2024: votos_oposicion_2024,
        seccion_oposicion_2018: votos_oposicion_2018,
        pct_oposicion: Math.round(pct_oposicion * 10) / 10,
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

  // === Vista de detalle de sección ===
  if (seccionActiva !== null) {
    return <DetalleSeccion seccion={seccionActiva} resultados={resultados} onBack={() => setSeccionActiva(null)} />;
  }

  // === Vista general (mapa de calor + KPIs) ===
  const filtradas = resumenSecciones.filter(s => filtroSemaforo === 'todas' || s.semaforo === filtroSemaforo);

  const conteoSeguras = resumenSecciones.filter(s => s.semaforo === 'segura').length;
  const conteoDisputa = resumenSecciones.filter(s => s.semaforo === 'disputa').length;
  const conteoRiesgo = resumenSecciones.filter(s => s.semaforo === 'riesgo').length;

  return (
    <div>
      <h1 className="header-title">Análisis Territorial</h1>
      <p style={{ marginBottom: '25px', color: '#666', fontSize: '14px' }}>
        Mapa de calor de las {resumenSecciones.length} secciones de Tula de Allende. Análisis de oportunidad frente al partido en el poder (2018-2024).
      </p>

      {/* KPIs superiores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '25px' }}>
        <div className="card" style={{ padding: '15px', textAlign: 'center', borderTop: '4px solid #4CAF50', borderLeft: 'none' }}>
          <CheckCircle2 size={22} color="#4CAF50" style={{ marginBottom: '5px' }} />
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#4CAF50' }}>{conteoSeguras}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Secciones Seguras</div>
          <div style={{ fontSize: '10px', color: '#999' }}>Voto Opositor ≥50%</div>
        </div>
        <div className="card" style={{ padding: '15px', textAlign: 'center', borderTop: '4px solid #F9A825', borderLeft: 'none' }}>
          <Minus size={22} color="#F9A825" style={{ marginBottom: '5px' }} />
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#F9A825' }}>{conteoDisputa}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>En Disputa</div>
          <div style={{ fontSize: '10px', color: '#999' }}>Voto Opositor 35-49%</div>
        </div>
        <div className="card" style={{ padding: '15px', textAlign: 'center', borderTop: '4px solid #F44336', borderLeft: 'none' }}>
          <AlertTriangle size={22} color="#F44336" style={{ marginBottom: '5px' }} />
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#F44336' }}>{conteoRiesgo}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>En Riesgo</div>
          <div style={{ fontSize: '10px', color: '#999' }}>Voto Opositor &lt;35%</div>
        </div>
        <div className="card" style={{ padding: '15px', textAlign: 'center', borderTop: '4px solid #00A651', borderLeft: 'none' }}>
          <Target size={22} color="#00A651" style={{ marginBottom: '5px' }} />
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#00A651' }}>{resumenSecciones.length}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Total Secciones</div>
        </div>
      </div>

      {/* Filtros de semáforo */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {(['todas', 'segura', 'disputa', 'riesgo'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFiltroSemaforo(f)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: `2px solid ${
                f === 'segura' ? '#4CAF50' :
                f === 'disputa' ? '#F9A825' :
                f === 'riesgo' ? '#F44336' : '#00A651'
              }`,
              background: filtroSemaforo === f
                ? (f === 'segura' ? '#4CAF50' : f === 'disputa' ? '#F9A825' : f === 'riesgo' ? '#F44336' : '#00A651')
                : 'white',
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

      {/* Grid de secciones */}
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
              borderLeft: `5px solid ${
                s.semaforo === 'segura' ? '#4CAF50' :
                s.semaforo === 'disputa' ? '#F9A825' : '#F44336'
              }`,
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
              {s.pct_oposicion}%
            </div>
            <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px' }}>
              Voto a Conquistar (2024)
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

// ==========================================================
// COMPONENTE: Detalle de Sección
// ==========================================================
function DetalleSeccion({ seccion, resultados, onBack }: { seccion: number; resultados: Resultado[]; onBack: () => void; }) {
  const datosSeccion = resultados.filter(r => r.seccion === seccion);

  // Agrupar por año/tipo para la gráfica histórica
  const historicos = ['2018-Presidencial', '2021-Diputacion Federal', '2022-Gubernatura', '2024-Presidencial'];
  const dataGrafica = historicos.map(key => {
    const [anio, tipo] = key.split('-');
    const filas = datosSeccion.filter(r => r.anio === Number(anio) && r.tipo_eleccion === tipo);
    const total = filas.reduce((s, r) => s + r.total_votos, 0);
    const morena = filas.reduce((s, r) => s + r.morena, 0);
    const oposicion = total - morena;
    
    return {
      name: `${anio} ${tipo.split(' ')[0]}`,
      'Voto Opositor': oposicion,
      'MORENA': morena,
      'Total': total
    };
  });

  // Comparativa de casillas 2024 Presidencial
  const pres2024 = datosSeccion.filter(r => r.anio === 2024 && r.tipo_eleccion === 'Presidencial');
  const dataCasillas = pres2024.map(r => {
    const totalPartidos = r.morena + r.pan + r.pri + r.prd + r.pvem + r.pt + r.mc + r.otros;
    return {
      casilla: r.casilla,
      'Voto Opositor': totalPartidos - r.morena,
      'MORENA': r.morena,
      pct: totalPartidos > 0 ? Math.round(((totalPartidos - r.morena) / totalPartidos) * 1000) / 10 : 0
    };
  });

  // Cálculos
  const totalVotos2024 = pres2024.reduce((s, r) => s + r.total_votos, 0);
  const morena2024 = pres2024.reduce((s, r) => s + r.morena, 0);
  const oposicion2024 = totalVotos2024 - morena2024;
  const lista2024 = pres2024.reduce((s, r) => s + r.lista_nominal, 0);
  const pctOposicion = totalVotos2024 > 0 ? Math.round((oposicion2024 / totalVotos2024) * 1000) / 10 : 0;
  const participacion = lista2024 > 0 ? Math.round((totalVotos2024 / lista2024) * 1000) / 10 : 0;

  // Recomendación automática (INVERTIDA PARA OPOSICIÓN)
  let recomendacion = '';
  let colorRecomendacion = '#00A651';
  
  if (pctOposicion >= 50) {
    recomendacion = 'Sección prioritaria para consolidar. Tenemos la mayoría. Asegurar representantes de casilla y mantener el contacto con los simpatizantes.';
    colorRecomendacion = '#4CAF50';
  } else if (pctOposicion >= 35) {
    recomendacion = 'Sección en disputa. Enfocar brigadas de persuasión en indecisos. Revisar casillas donde MORENA tenga menor rendimiento para atacar.';
    colorRecomendacion = '#F9A825';
  } else {
    recomendacion = 'Sección en terreno enemigo. No gastar recursos excesivos aquí. Enfocar el esfuerzo en mantener la estructura mínima y buscar un giro de última hora.';
    colorRecomendacion = '#F44336';
  }

  return (
    <div>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', color: '#00A651', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '15px',
        fontWeight: 'bold', fontSize: '15px'
      }}>
        ← Volver al mapa
      </button>

      <h1 className="header-title">Sección {seccion}</h1>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '25px' }}>
        <div className="card" style={{ padding: '15px', textAlign: 'center', borderTop: '4px solid #0066CC', borderLeft: 'none' }}>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#0066CC' }}>{pctOposicion}%</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Voto a Conquistar</div>
        </div>
        <div className="card" style={{ padding: '15px', textAlign: 'center', borderTop: '4px solid #0277BD', borderLeft: 'none' }}>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#0277BD' }}>{participacion}%</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Participación</div>
        </div>
        <div className="card" style={{ padding: '15px', textAlign: 'center', borderTop: '4px solid #00A651', borderLeft: 'none' }}>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#00A651' }}>{oposicion2024.toLocaleString()}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Votos Opositores</div>
        </div>
        <div className="card" style={{ padding: '15px', textAlign: 'center', borderTop: '4px solid #666', borderLeft: 'none' }}>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#666' }}>{pres2024.length}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Casillas</div>
        </div>
      </div>

      {/* Recomendación */}
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

      {/* Gráfica histórica */}
      <div className="card" style={{ marginBottom: '25px' }}>
        <h3 style={{ color: '#00A651', fontSize: '16px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={20} /> Tendencia histórica: Voto Opositor vs MORENA
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dataGrafica}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
            <XAxis dataKey="name" stroke="#666" tick={{ fontSize: 11 }} />
            <YAxis stroke="#666" />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E0E0E0' }} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Line type="monotone" dataKey="Voto Opositor" stroke="#0066CC" strokeWidth={3} dot={{ fill: '#0066CC', r: 5 }} />
            <Line type="monotone" dataKey="MORENA" stroke="#9F2241" strokeWidth={2} dot={{ fill: '#9F2241', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Comparativa por casilla */}
      <div className="card">
        <h3 style={{ color: '#00A651', fontSize: '16px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            <Bar dataKey="Voto Opositor" stackId="a" fill="#0066CC" name="Voto Opositor" />
            <Bar dataKey="MORENA" stackId="a" fill="#9F2241" name="MORENA" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}