import { useEffect, useState } from 'react';
import { Loader2, BarChart3, Users, Vote, UserCheck, PieChart, Activity } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { supabase } from '../lib/supabaseClient';

interface DataBarrio { barrio: string; personas: number; }
interface DataVoto { name: string; value: number; color: string; }
interface DataSeccion { seccion: string; cubiertas: number; sinCubrir: number; }
interface DataActivismo { barrio: string; presidentes: number; secretarios: number; vocales: number; }
interface DataTiempo { fecha: string; capturas: number; }

export default function Reportes() {
  const [loading, setLoading] = useState(true);
  const [personasPorBarrio, setPersonasPorBarrio] = useState<DataBarrio[]>([]);
  const [preferenciaVoto, setPreferenciaVoto] = useState<DataVoto[]>([]);
  const [casillasPorSeccion, setCasillasPorSeccion] = useState<DataSeccion[]>([]);
  const [activismoPorBarrio, setActivismoPorBarrio] = useState<DataActivismo[]>([]);
  const [capturasTiempo, setCapturasTiempo] = useState<DataTiempo[]>([]);
  
  const [stats, setStats] = useState({
    totalPersonas: 0, totalCasillas: 0, casillasCubiertas: 0, totalActivismo: 0, barriosConGente: 0,
  });

  useEffect(() => {
const fetchData = async () => {
  setLoading(true);
  try {
    const { data, error } = await supabase.rpc('obtener_resumen_reportes');
    if (error) throw error;
    if (data) {
      setPersonasPorBarrio(data.topBarrios);
      setPreferenciaVoto(data.preferencias);
      setActivismoPorBarrio(data.activismoBarrios);
      setCapturasTiempo(data.capturasTiempo);
      // Nota: Los KPIs superiores de Reportes (stats) ahora los puedes calcular sumando los arrays o dejarlos fijos si prefieres.
    }
  } catch (err) {
    console.error("Error cargando reportes:", err);
  } finally {
    setLoading(false);
  }
};
    fetchData();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '50px', gap: '10px', color: '#00A651' }}><Loader2 size={32} className="animate-spin" /> Cargando reportes...</div>;
  }

  const pctCasillas = stats.totalCasillas > 0 ? Math.round((stats.casillasCubiertas / stats.totalCasillas) * 100) : 0;

  return (
    <div>
      <h1 className="header-title">Reportes y Análisis de Inteligencia</h1>
      <p style={{ marginBottom: '25px', color: '#666', fontSize: '14px' }}>
        Visualización estratégica de la operación territorial.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '30px' }}>
        <div className="card" style={{ padding: '18px', textAlign: 'center', borderTop: '4px solid #00A651', borderLeft: 'none' }}>
          <Users size={24} color="#00A651" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#00A651' }}>{stats.totalPersonas}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Personas capturadas</div>
        </div>
        <div className="card" style={{ padding: '18px', textAlign: 'center', borderTop: '4px solid #0066CC', borderLeft: 'none' }}>
          <Vote size={24} color="#0066CC" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0066CC' }}>{pctCasillas}%</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Casillas cubiertas</div>
        </div>
        <div className="card" style={{ padding: '18px', textAlign: 'center', borderTop: '4px solid #F9A825', borderLeft: 'none' }}>
          <UserCheck size={24} color="#F9A825" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#F9A825' }}>{stats.totalActivismo}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Activistas totales</div>
        </div>
        <div className="card" style={{ padding: '18px', textAlign: 'center', borderTop: '4px solid #4CAF50', borderLeft: 'none' }}>
          <BarChart3 size={24} color="#4CAF50" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4CAF50' }}>{stats.barriosConGente}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Barrios con capturas</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '25px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <BarChart3 size={22} color="#00A651" />
          <h3 style={{ color: '#00A651', fontSize: '16px', margin: 0 }}>Top 10 Barrios con Más Personas Capturadas</h3>
        </div>
        {personasPorBarrio.length === 0 ? <p style={{ color: '#999', textAlign: 'center', padding: '30px' }}>Aún no hay datos suficientes.</p> : (
          <ResponsiveContainer width="100%" height={Math.max(250, personasPorBarrio.length * 40)}>
            <BarChart data={personasPorBarrio} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
              <XAxis type="number" stroke="#666" />
              <YAxis dataKey="barrio" type="category" width={120} stroke="#666" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E0E0E0' }} />
              <Bar dataKey="personas" fill="#00A651" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px', marginBottom: '25px' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <PieChart size={22} color="#00A651" />
            <h3 style={{ color: '#00A651', fontSize: '16px', margin: 0 }}>Inteligencia de Votante (Preferencias)</h3>
          </div>
          {preferenciaVoto.length === 0 ? <p style={{ color: '#999', textAlign: 'center', padding: '30px' }}>Aún no hay datos suficientes.</p> : (
            <ResponsiveContainer width="100%" height={280}>
              <RePieChart>
                {/* 🚀 FIX: Evitamos funciones inline en el label para prevenir crashes de Recharts */}
                <Pie data={preferenciaVoto} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} label={true} labelLine={true}>
                  {preferenciaVoto.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E0E0E0' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </RePieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <Vote size={22} color="#00A651" />
            <h3 style={{ color: '#00A651', fontSize: '16px', margin: 0 }}>Casillas Cubiertas por Sección</h3>
          </div>
          {casillasPorSeccion.length === 0 ? <p style={{ color: '#999', textAlign: 'center', padding: '30px' }}>Aún no hay datos suficientes.</p> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={casillasPorSeccion} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                <XAxis dataKey="seccion" stroke="#666" tick={{ fontSize: 11 }} />
                <YAxis stroke="#666" />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E0E0E0' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="cubiertas" stackId="a" fill="#00A651" name="Cubiertas" />
                <Bar dataKey="sinCubrir" stackId="a" fill="#EF5350" name="Sin cubrir" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '25px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <UserCheck size={22} color="#0066CC" />
          <h3 style={{ color: '#0066CC', fontSize: '16px', margin: 0 }}>Top 10 Barrios con Estructura de Activismo</h3>
        </div>
        {activismoPorBarrio.length === 0 ? <p style={{ color: '#999', textAlign: 'center', padding: '30px' }}>Aún no hay estructura de activismo capturada.</p> : (
          <ResponsiveContainer width="100%" height={Math.max(280, activismoPorBarrio.length * 40)}>
            <BarChart data={activismoPorBarrio} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
              <XAxis type="number" stroke="#666" />
              <YAxis dataKey="barrio" type="category" width={120} stroke="#666" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E0E0E0' }} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="presidentes" stackId="a" fill="#0066CC" name="Presidentes" />
              <Bar dataKey="secretarios" stackId="a" fill="#42A5F5" name="Secretarios" />
              <Bar dataKey="vocales" stackId="a" fill="#90CAF9" name="Vocales" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <Activity size={22} color="#00A651" />
          <h3 style={{ color: '#00A651', fontSize: '16px', margin: 0 }}>Tendencia de Capturas (Últimos 30 días)</h3>
        </div>
        {capturasTiempo.length === 0 ? <p style={{ color: '#999', textAlign: 'center', padding: '30px' }}>Aún no hay datos suficientes.</p> : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={capturasTiempo} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
              <XAxis dataKey="fecha" stroke="#666" tick={{ fontSize: 10 }} interval={2} />
              <YAxis stroke="#666" />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E0E0E0' }} />
              <Line type="monotone" dataKey="capturas" stroke="#00A651" strokeWidth={3} dot={{ fill: '#00A651', r: 4 }} activeDot={{ r: 7, fill: '#0066CC' }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
