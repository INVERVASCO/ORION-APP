import { useEffect, useState } from 'react';
import { Loader2, BarChart3, Users, Vote, UserCheck, TrendingUp, PieChart, Activity } from 'lucide-react';
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

      // 1. Personas por barrio
      const { data: personasData } = await supabase
        .from('personas').select('barrio_colonia_id, barrios_colonias(nombre)').not('barrio_colonia_id', 'is', null);

      if (personasData) {
        const conteo: Record<string, { nombre: string; total: number }> = {};
        personasData.forEach((p: any) => {
          const id = p.barrio_colonia_id;
          const nombre = p.barrios_colonias?.nombre || 'Sin nombre';
          if (!conteo[id]) conteo[id] = { nombre, total: 0 };
          conteo[id].total++;
        });
        const top10 = Object.values(conteo).sort((a, b) => b.total - a.total).slice(0, 10)
          .map(v => ({ barrio: v.nombre.length > 20 ? v.nombre.substring(0, 18) + '…' : v.nombre, personas: v.total }));
        setPersonasPorBarrio(top10);
        setStats(prev => ({ ...prev, barriosConGente: Object.keys(conteo).length }));
      }

      // 2. Preferencia de voto
      const { data: votoData } = await supabase.from('personas').select('preferencia_voto');
      if (votoData) {
        const conteoVoto: Record<string, number> = { 'MORENA': 0, 'PAN': 0, 'PRI': 0, 'Indeciso': 0, 'Otro': 0, 'Sin definir': 0 };
        votoData.forEach((p: any) => {
          const pref = p.preferencia_voto || 'Sin definir';
          if (conteoVoto[pref] !== undefined) conteoVoto[pref]++;
          else conteoVoto['Otro']++;
        });
        // 🎨 COLORES NEUTRALIZADOS / OPOSICIÓN
        const colores: Record<string, string> = {
          'MORENA': '#9E9E9E', // Gris (Oponente, no nos importa su color)
          'PAN': '#0066CC',    // Azul (Nuestra alianza)
          'PRI': '#E53935',    // Rojo (Neutral)
          'Indeciso': '#F9A825', // Amarillo (Nuestra mina de oro)
          'Otro': '#00A651',   // Verde (Nuestro color)
          'Sin definir': '#CCCCCC',
        };
        const dataVoto = Object.entries(conteoVoto).filter(([_, v]) => v > 0).map(([name, value]) => ({ name, value, color: colores[name] || '#999' }));
        setPreferenciaVoto(dataVoto);
        setStats(prev => ({ ...prev, totalPersonas: votoData.length }));
      }

      // 3. Casillas por sección
      const { data: casillasData } = await supabase.from('casillas').select('id, secciones_electorales(numero_seccion)');
      const { data: funcData } = await supabase.from('funcionarios_casilla').select('casilla_id');

      if (casillasData) {
        const casillasCubiertasIds = new Set(funcData?.map(f => f.casilla_id) || []);
        const porSeccion: Record<number, { cubiertas: number; sinCubrir: number }> = {};
        casillasData.forEach((c: any) => {
          const numSeccion = c.secciones_electorales?.numero_seccion;
          if (!numSeccion) return;
          if (!porSeccion[numSeccion]) porSeccion[numSeccion] = { cubiertas: 0, sinCubrir: 0 };
          if (casillasCubiertasIds.has(c.id)) porSeccion[numSeccion].cubiertas++;
          else porSeccion[numSeccion].sinCubrir++;
        });
        const dataSecciones = Object.entries(porSeccion).sort((a, b) => Number(a[0]) - Number(b[0])).slice(0, 15)
          .map(([seccion, data]) => ({ seccion: `S${seccion}`, cubiertas: data.cubiertas, sinCubrir: data.sinCubrir }));
        setCasillasPorSeccion(dataSecciones);
        setStats(prev => ({ ...prev, totalCasillas: casillasData.length, casillasCubiertas: casillasCubiertasIds.size }));
      }

      // 4. Activismo por barrio
      const { data: activismoData } = await supabase.from('activismo').select('tipo_cargo, barrio_colonia_id, barrios_colonias(nombre)');
      if (activismoData) {
        const conteoActivismo: Record<string, { barrio: string; presidentes: number; secretarios: number; vocales: number }> = {};
        activismoData.forEach((a: any) => {
          const id = a.barrio_colonia_id;
          const nombre = a.barrios_colonias?.nombre || 'Sin nombre';
          if (!conteoActivismo[id]) conteoActivismo[id] = { barrio: nombre, presidentes: 0, secretarios: 0, vocales: 0 };
          if (a.tipo_cargo === 'Presidente') conteoActivismo[id].presidentes++;
          else if (a.tipo_cargo === 'Secretario') conteoActivismo[id].secretarios++;
          else if (a.tipo_cargo === 'Vocal') conteoActivismo[id].vocales++;
        });
        const top10Activismo = Object.values(conteoActivismo)
          .sort((a, b) => (b.presidentes + b.secretarios + b.vocales) - (a.presidentes + a.secretarios + a.vocales)).slice(0, 10)
          .map(v => ({ barrio: v.barrio.length > 18 ? v.barrio.substring(0, 16) + '…' : v.barrio, presidentes: v.presidentes, secretarios: v.secretarios, vocales: v.vocales }));
        setActivismoPorBarrio(top10Activismo);
        setStats(prev => ({ ...prev, totalActivismo: activismoData.length }));
      }

      // 5. Capturas en el tiempo
      const { data: fechasData } = await supabase.from('personas').select('created_at').order('created_at', { ascending: true });
      if (fechasData) {
        const hace30Dias = new Date(); hace30Dias.setDate(hace30Dias.getDate() - 30);
        const conteoPorDia: Record<string, number> = {};
        for (let i = 29; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i);
          conteoPorDia[d.toISOString().split('T')[0]] = 0;
        }
        fechasData.forEach((p: any) => {
          const fecha = new Date(p.created_at);
          if (fecha >= hace30Dias) {
            const key = fecha.toISOString().split('T')[0];
            if (conteoPorDia[key] !== undefined) conteoPorDia[key]++;
          }
        });
        const dataTiempo = Object.entries(conteoPorDia).map(([fecha, capturas]) => {
          const [, mes, dia] = fecha.split('-');
          return { fecha: `${dia}/${mes}`, capturas };
        });
        setCapturasTiempo(dataTiempo);
      }

      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '50px', gap: '10px', color: '#00A651' }}><Loader2 size={32} /> Cargando reportes...</div>;
  }

  const pctCasillas = stats.totalCasillas > 0 ? Math.round((stats.casillasCubiertas / stats.totalCasillas) * 100) : 0;

  return (
    <div>
      <h1 className="header-title">Reportes y Análisis de Inteligencia</h1>
      <p style={{ marginBottom: '25px', color: '#666', fontSize: '14px' }}>
        Visualización estratégica de la operación territorial en Tula de Allende.
      </p>

      {/* KPIs superiores - COLORES UNIDOS X TULA */}
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

      {/* Gráfica 1: Personas por barrio (Verde UNIDOS X TULA) */}
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

      {/* Grid para gráficas 2 y 3 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px', marginBottom: '25px' }}>
        
        {/* Gráfica 2: Preferencia de voto */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <PieChart size={22} color="#00A651" />
            <h3 style={{ color: '#00A651', fontSize: '16px', margin: 0 }}>Inteligencia de Votante (Preferencias)</h3>
          </div>
          {preferenciaVoto.length === 0 ? <p style={{ color: '#999', textAlign: 'center', padding: '30px' }}>Aún no hay datos suficientes.</p> : (
            <ResponsiveContainer width="100%" height={280}>
              <RePieChart>
                <Pie data={preferenciaVoto} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} label={({ name, value }) => `${name}: ${value}`} labelLine={{ stroke: '#999' }}>
                  {preferenciaVoto.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E0E0E0' }} />
              </RePieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Gráfica 3: Casillas cubiertas por sección */}
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

      {/* Gráfica 4: Activismo por barrio */}
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

      {/* Gráfica 5: Tendencia de capturas */}
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