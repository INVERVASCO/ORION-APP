import { useEffect, useState } from 'react';
import { Search, Loader2, MapPin, User, Phone, Vote, UserCheck, Users2, Hash } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface Funcionario {
  id: string;
  casilla_id: string;
  tipo_funcionario: string;
  tipo_nombramiento: string;
  personas: { nombre_completo: string; telefono: string | null; } | null;
}

interface Casilla {
  id: string;
  tipo_casilla: string;
  numero_casilla: string;
  ubicacion: string;
  direccion: string;
  seccion_id: string;
  secciones_electorales: { numero_seccion: number; } | null;
}

export default function ElectoralGlobal() {
  const [casillas, setCasillas] = useState<Casilla[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [filtrados, setFiltrados] = useState<Casilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroSeccion, setFiltroSeccion] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: casillasData } = await supabase
        .from('casillas')
        .select('id, tipo_casilla, numero_casilla, ubicacion, direccion, seccion_id, secciones_electorales(numero_seccion)')
        .order('numero_casilla');

      if (casillasData) {
        setCasillas(casillasData as any);
        setFiltrados(casillasData as any);

        const casillaIds = casillasData.map(c => c.id);
        if (casillaIds.length > 0) {
          const { data: funcData } = await supabase
            .from('funcionarios_casilla')
            .select('id, casilla_id, tipo_funcionario, tipo_nombramiento, personas(nombre_completo, telefono)')
            .in('casilla_id', casillaIds);
          if (funcData) setFuncionarios(funcData as any);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // Filtros
  useEffect(() => {
    let result = [...casillas];
    if (busqueda.trim() !== '') {
      const q = busqueda.toLowerCase();
      result = result.filter(c =>
        c.ubicacion.toLowerCase().includes(q) ||
        c.numero_casilla.toLowerCase().includes(q) ||
        (c.direccion || '').toLowerCase().includes(q) ||
        // Buscar por nombre de funcionario
        funcionarios.some(f => f.casilla_id === c.id && (f.personas?.nombre_completo || '').toLowerCase().includes(q))
      );
    }
    if (filtroSeccion) {
      result = result.filter(c => c.seccion_id === filtroSeccion);
    }
    setFiltrados(result);
  }, [busqueda, filtroSeccion, casillas, funcionarios]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px', gap: '10px', color: '#9F2241' }}>
        <Loader2 size={32} /> Cargando casillas...
      </div>
    );
  }

  // Estadísticas
  const totalCasillas = casillas.length;
  const casillasCubiertas = casillas.filter(c => funcionarios.some(f => f.casilla_id === c.id)).length;
  const totalFuncionarios = funcionarios.length;
  const pct = totalCasillas > 0 ? Math.round((casillasCubiertas / totalCasillas) * 100) : 0;

  const conteoPorTipo: Record<string, number> = {};
  funcionarios.forEach(f => {
    conteoPorTipo[f.tipo_funcionario] = (conteoPorTipo[f.tipo_funcionario] || 0) + 1;
  });

  // Secciones únicas para el filtro
  const seccionesUnicas = Array.from(
    new Set(casillas.map(c => c.seccion_id))
  ).map(id => {
    const casilla = casillas.find(c => c.seccion_id === id);
    return { id, numero: casilla?.secciones_electorales?.numero_seccion || 0 };
  }).sort((a, b) => a.numero - b.numero);

  return (
    <div>
      <h1 className="header-title">Electoral Municipal</h1>
      <p style={{ marginBottom: '25px', color: '#666', fontSize: '14px' }}>
        Vista global de todas las casillas y funcionarios de Tula de Allende.
      </p>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '18px', textAlign: 'center', borderTop: '4px solid #9F2241', borderLeft: 'none' }}>
          <Vote size={24} color="#9F2241" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#9F2241' }}>{totalCasillas}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Casillas totales</div>
        </div>
        <div className="card" style={{ padding: '18px', textAlign: 'center', borderTop: '4px solid #2E7D32', borderLeft: 'none' }}>
          <UserCheck size={24} color="#2E7D32" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2E7D32' }}>{casillasCubiertas}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Casillas cubiertas ({pct}%)</div>
        </div>
        <div className="card" style={{ padding: '18px', textAlign: 'center', borderTop: '4px solid #9F2241', borderLeft: 'none' }}>
          <Users2 size={24} color="#9F2241" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#9F2241' }}>{totalFuncionarios}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Funcionarios capturados</div>
        </div>
      </div>

      {/* Desglose por tipo */}
      {totalFuncionarios > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#9F2241', fontSize: '15px', marginBottom: '12px' }}>Funcionarios por Tipo</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
            {Object.entries(conteoPorTipo).map(([tipo, count]) => (
              <div key={tipo} style={{ padding: '12px', background: '#F9F9F9', borderRadius: '8px', borderLeft: '3px solid #9F2241' }}>
                <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#9F2241' }}>{count}</div>
                <div style={{ fontSize: '12px', color: '#555' }}>{tipo}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input
            type="text"
            placeholder="Buscar ubicación, número o funcionario..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ width: '100%', padding: '11px 11px 11px 40px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>
        <select value={filtroSeccion} onChange={(e) => setFiltroSeccion(e.target.value)}
          style={{ padding: '11px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '14px', background: 'white' }}>
          <option value="">Todas las secciones</option>
          {seccionesUnicas.map(s => (
            <option key={s.id} value={s.id}>Sección {s.numero}</option>
          ))}
        </select>
      </div>

      <p style={{ marginBottom: '15px', fontSize: '14px', color: '#666' }}>
        Mostrando <strong>{filtrados.length}</strong> de {casillas.length} casillas
      </p>

      {/* Lista de casillas */}
      {filtrados.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Vote size={40} color="#9F2241" style={{ opacity: 0.5, marginBottom: '15px' }} />
          <p style={{ color: '#666', fontSize: '15px' }}>No se encontraron casillas.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
          {filtrados.map(casilla => {
            const funcs = funcionarios.filter(f => f.casilla_id === casilla.id);
            const cubierta = funcs.length > 0;
            return (
              <div key={casilla.id} style={{
                background: 'white', borderRadius: '10px', padding: '15px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                borderLeft: `4px solid ${cubierta ? '#2E7D32' : '#C62828'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Hash size={16} color="#9F2241" />
                    <strong style={{ fontSize: '14px', color: '#333' }}>
                      Sección {casilla.secciones_electorales?.numero_seccion || '?'}
                    </strong>
                  </div>
                  <span style={{
                    padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                    background: cubierta ? '#E8F5E9' : '#FFEBEE',
                    color: cubierta ? '#2E7D32' : '#C62828',
                  }}>
                    {cubierta ? `${funcs.length} funcionario${funcs.length !== 1 ? 's' : ''}` : 'Sin cubrir'}
                  </span>
                </div>

                <div style={{ fontSize: '13px', color: '#333', fontWeight: 'bold', marginBottom: '6px' }}>
                  {casilla.tipo_casilla} {casilla.numero_casilla}
                </div>
                <div style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '10px' }}>
                  <MapPin size={13} color="#9F2241" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{casilla.ubicacion}</span>
                </div>

                {cubierta && (
                  <div style={{ paddingTop: '10px', borderTop: '1px solid #EEE' }}>
                    {funcs.map(f => (
                      <div key={f.id} style={{ fontSize: '12px', color: '#555', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <User size={12} color="#9F2241" />
                        <strong style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.personas?.nombre_completo || 'Sin nombre'}
                        </strong>
                        <span style={{ fontSize: '10px', color: '#999' }}>{f.tipo_funcionario.split(' ')[0]}</span>
                        {f.personas?.telefono && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '10px', color: '#999' }}>
                            <Phone size={10} /> {f.personas.telefono}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}