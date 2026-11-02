import { useEffect, useState } from 'react';
import { 
  Loader2, Search, Eye, Clock, User, Database, 
  X, AlertTriangle, CheckCircle2, Trash2, Edit3, PlusCircle,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface RegistroAuditoria {
  id: string;
  tabla_afectada: string;
  registro_id: string;
  accion: 'INSERT' | 'UPDATE' | 'DELETE';
  usuario_id: string | null;
  datos_anteriores: any;
  datos_nuevos: any;
  created_at: string;
}

export default function Auditoria() {
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
  const [perfiles, setPerfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroAccion, setFiltroAccion] = useState('');
  const [registroSeleccionado, setRegistroSeleccionado] = useState<RegistroAuditoria | null>(null);

  // 🚀 ESTADOS DE PAGINACIÓN SERVER-SIDE
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 20; // Tamaño de página para auditoría

  // Cargar perfiles de usuario (esto se puede cachear)
  useEffect(() => {
    const fetchPerfiles = async () => {
      const { data } = await supabase.from('perfiles').select('id, nombre_completo, email');
      const mapa: Record<string, string> = {};
      data?.forEach((p: any) => { mapa[p.id] = p.nombre_completo || p.email || 'Desconocido'; });
      setPerfiles(mapa);
    };
    fetchPerfiles();
  }, []);

  // 🚀 FUNCIÓN DE CARGA PAGINADA
  const fetchAuditoria = async () => {
    setLoading(true);
    
    let query = supabase.from('auditoria').select('*', { count: 'exact' });

    if (busqueda.trim() !== '') {
      // Buscamos en tabla o en ID de registro
      query = query.or(`tabla_afectada.ilike.%${busqueda}%,registro_id.ilike.%${busqueda}%`);
    }
    if (filtroAccion) {
      query = query.eq('accion', filtroAccion);
    }

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (!error && data) {
      setRegistros(data || []);
      if (count !== null) setTotalCount(count);
    }
    setLoading(false);
  };

  // Efecto con debounce para búsquedas
  useEffect(() => {
    const timer = setTimeout(() => { setPage(0); fetchAuditoria(); }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, filtroAccion]);

  // Efecto para cambiar de página
  useEffect(() => {
    fetchAuditoria();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const getAccionInfo = (accion: string) => {
    switch (accion) {
      case 'INSERT': return { color: '#2E7D32', icon: <PlusCircle size={16} />, label: 'Creación' };
      case 'UPDATE': return { color: '#F9A825', icon: <Edit3 size={16} />, label: 'Edición' };
      case 'DELETE': return { color: '#C62828', icon: <Trash2 size={16} />, label: 'Eliminación' };
      default: return { color: '#666', icon: <Database size={16} />, label: 'Desconocido' };
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      <h1 className="header-title">Bitácora de Auditoría</h1>
      <p style={{ marginBottom: '25px', color: '#666', fontSize: '14px' }}>
        Registro histórico de los cambios realizados en la base de datos. Solo visible para administradores.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '25px' }}>
        <div className="card" style={{ padding: '15px', textAlign: 'center', borderTop: '4px solid #9F2241', borderLeft: 'none' }}>
          <Database size={22} color="#9F2241" style={{ marginBottom: '5px' }} />
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#9F2241' }}>{totalCount.toLocaleString()}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Movimientos Totales</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input
            type="text"
            placeholder="Buscar por tabla o ID..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ width: '100%', padding: '11px 11px 11px 40px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>
        <select 
          value={filtroAccion} 
          onChange={(e) => setFiltroAccion(e.target.value)}
          style={{ padding: '11px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '14px', background: 'white' }}
        >
          <option value="">Todas las acciones</option>
          <option value="INSERT">Creaciones</option>
          <option value="UPDATE">Ediciones</option>
          <option value="DELETE">Eliminaciones</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: '#9F2241' }}>
          <Loader2 size={32} className="animate-spin" /> Consultando bitácora...
        </div>
      ) : registros.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <CheckCircle2 size={40} color="#2E7D32" style={{ opacity: 0.5, marginBottom: '15px' }} />
          <p style={{ color: '#666', fontSize: '15px' }}>No hay movimientos registrados con estos filtros.</p>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: 0, overflowX: 'auto', marginBottom: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#9F2241', color: 'white' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Fecha</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Usuario</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Acción</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Tabla</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Detalles</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r, idx) => {
                  const info = getAccionInfo(r.accion);
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #EEE', background: idx % 2 === 0 ? '#F9F9F9' : 'white' }}>
                      <td style={{ padding: '10px', color: '#666' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Clock size={12} /> {new Date(r.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: '#333' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <User size={12} color="#9F2241" /> 
                          {r.usuario_id ? (perfiles[r.usuario_id] || 'Usuario desconocido') : 'Sistema'}
                        </div>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: `${info.color}20`, color: info.color, padding: '4px 8px', borderRadius: '12px', fontWeight: 'bold', fontSize: '11px' }}>
                          {info.icon} {info.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <code style={{ background: '#EEE', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                          {r.tabla_afectada}
                        </code>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <button 
                          onClick={() => setRegistroSeleccionado(r)}
                          style={{ background: '#9F2241', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Eye size={12} /> Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* CONTROLES DE PAGINACIÓN SERVER-SIDE */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', background: 'white', padding: '15px', borderRadius: '10px', border: '1px solid #E0E0E0' }}>
              <button 
                onClick={() => setPage(prev => Math.max(prev - 1, 0))}
                disabled={page === 0}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 16px', background: page === 0 ? '#F0F0F0' : 'white', color: page === 0 ? '#999' : '#9F2241', border: '1px solid #E0E0E0', borderRadius: '6px', cursor: page === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
              >
                <ChevronLeft size={16} /> Anterior
              </button>
              
              <span style={{ fontSize: '13px', color: '#666', fontWeight: 'bold' }}>
                Página {page + 1} de {totalPages} (Mostrando {PAGE_SIZE} por página)
              </span>

              <button 
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages - 1))}
                disabled={page === totalPages - 1}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 16px', background: page === totalPages - 1 ? '#F0F0F0' : 'white', color: page === totalPages - 1 ? '#999' : '#9F2241', border: '1px solid #E0E0E0', borderRadius: '6px', cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
              >
                Siguiente <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal de Detalle (Igual que tu versión anterior) */}
      {registroSeleccionado && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #9F2241', paddingBottom: '10px' }}>
              <h3 style={{ color: '#9F2241', fontSize: '18px', margin: 0 }}>Detalle del Movimiento</h3>
              <button onClick={() => setRegistroSeleccionado(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: '#999' }}>&times;</button>
            </div>

            <div style={{ display: 'grid', gap: '15px', fontSize: '14px' }}>
              <div>
                <strong style={{ color: '#666' }}>Registro ID:</strong>
                <p style={{ margin: '5px 0 0 0', fontFamily: 'monospace', fontSize: '12px', background: '#F4F4F4', padding: '8px', borderRadius: '4px', wordBreak: 'break-all' }}>
                  {registroSeleccionado.registro_id}
                </p>
              </div>
              {registroSeleccionado.datos_anteriores && (
                <div>
                  <strong style={{ color: '#C62828' }}>🔴 Datos Anteriores:</strong>
                  <pre style={{ margin: '5px 0 0 0', background: '#FFEBEE', padding: '12px', borderRadius: '6px', fontSize: '11px', overflowX: 'auto', borderLeft: '4px solid #C62828' }}>
                    {JSON.stringify(registroSeleccionado.datos_anteriores, null, 2)}
                  </pre>
                </div>
              )}
              {registroSeleccionado.datos_nuevos && (
                <div>
                  <strong style={{ color: '#2E7D32' }}>🟢 Datos Nuevos:</strong>
                  <pre style={{ margin: '5px 0 0 0', background: '#E8F5E9', padding: '12px', borderRadius: '6px', fontSize: '11px', overflowX: 'auto', borderLeft: '4px solid #2E7D32' }}>
                    {JSON.stringify(registroSeleccionado.datos_nuevos, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
