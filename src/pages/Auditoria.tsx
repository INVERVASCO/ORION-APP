import { useEffect, useState } from 'react';
import { 
  Loader2, Search, Eye, Clock, User, Database, 
  X, AlertTriangle, CheckCircle2, Trash2, Edit3, PlusCircle 
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

  useEffect(() => {
    const cargarAuditoria = async () => {
      setLoading(true);

      // 1. Cargar la tabla de auditoría (últimos 500 movimientos)
      const { data: auditoriaData, error } = await supabase
        .from('auditoria')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        console.error('Error al cargar auditoría:', error);
        setLoading(false);
        return;
      }

      // 2. Cargar los perfiles para mapear el ID de usuario con su nombre
      const { data: perfilesData } = await supabase
        .from('perfiles')
        .select('id, nombre_completo, email');

      const mapaPerfiles: Record<string, string> = {};
      perfilesData?.forEach(p => {
        mapaPerfiles[p.id] = p.nombre_completo || p.email || 'Usuario desconocido';
      });

      setPerfiles(mapaPerfiles);
      setRegistros(auditoriaData || []);
      setLoading(false);
    };

    cargarAuditoria();
  }, []);

  // Filtros
  const registrosFiltrados = registros.filter(r => {
    const cumpleBusqueda = busqueda.trim() === '' || 
      r.tabla_afectada.toLowerCase().includes(busqueda.toLowerCase()) ||
      (r.usuario_id && perfiles[r.usuario_id]?.toLowerCase().includes(busqueda.toLowerCase())) ||
      r.registro_id.toLowerCase().includes(busqueda.toLowerCase());
    
    const cumpleAccion = filtroAccion === '' || r.accion === filtroAccion;
    
    return cumpleBusqueda && cumpleAccion;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px', gap: '10px', color: '#9F2241' }}>
        <Loader2 size={32} /> Cargando bitácora de auditoría...
      </div>
    );
  }

  // Colores e íconos por acción
  const getAccionInfo = (accion: string) => {
    switch (accion) {
      case 'INSERT': return { color: '#2E7D32', icon: <PlusCircle size={16} />, label: 'Creación' };
      case 'UPDATE': return { color: '#F9A825', icon: <Edit3 size={16} />, label: 'Edición' };
      case 'DELETE': return { color: '#C62828', icon: <Trash2 size={16} />, label: 'Eliminación' };
      default: return { color: '#666', icon: <Database size={16} />, label: 'Desconocido' };
    }
  };

  return (
    <div>
      <h1 className="header-title">Bitácora de Auditoría</h1>
      <p style={{ marginBottom: '25px', color: '#666', fontSize: '14px' }}>
        Registro histórico de todos los cambios realizados en la base de datos. Solo visible para administradores.
      </p>

      {/* KPIs rápidos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '25px' }}>
        <div className="card" style={{ padding: '15px', textAlign: 'center', borderTop: '4px solid #9F2241', borderLeft: 'none' }}>
          <Database size={22} color="#9F2241" style={{ marginBottom: '5px' }} />
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#9F2241' }}>{registros.length}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Movimientos Totales</div>
        </div>
        <div className="card" style={{ padding: '15px', textAlign: 'center', borderTop: '4px solid #2E7D32', borderLeft: 'none' }}>
          <PlusCircle size={22} color="#2E7D32" style={{ marginBottom: '5px' }} />
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#2E7D32' }}>
            {registros.filter(r => r.accion === 'INSERT').length}
          </div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Creaciones</div>
        </div>
        <div className="card" style={{ padding: '15px', textAlign: 'center', borderTop: '4px solid #C62828', borderLeft: 'none' }}>
          <Trash2 size={22} color="#C62828" style={{ marginBottom: '5px' }} />
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#C62828' }}>
            {registros.filter(r => r.accion === 'DELETE').length}
          </div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Eliminaciones</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input
            type="text"
            placeholder="Buscar por tabla, usuario o ID..."
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

      <p style={{ marginBottom: '15px', fontSize: '14px', color: '#666' }}>
        Mostrando <strong>{registrosFiltrados.length}</strong> de {registros.length} movimientos
      </p>

      {/* Tabla de Auditoría (Responsive) */}
      {registrosFiltrados.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <CheckCircle2 size={40} color="#2E7D32" style={{ opacity: 0.5, marginBottom: '15px' }} />
          <p style={{ color: '#666', fontSize: '15px' }}>
            No hay movimientos registrados con estos filtros. La base de datos está limpia.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
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
              {registrosFiltrados.map((r, idx) => {
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
                      <span style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        background: `${info.color}20`, color: info.color, 
                        padding: '4px 8px', borderRadius: '12px', fontWeight: 'bold', fontSize: '11px'
                      }}>
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
                        style={{ 
                          background: '#9F2241', color: 'white', border: 'none', 
                          padding: '5px 10px', borderRadius: '4px', cursor: 'pointer',
                          fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px'
                        }}
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
      )}

      {/* Modal de Detalle */}
      {registroSeleccionado && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #9F2241', paddingBottom: '10px' }}>
              <h3 style={{ color: '#9F2241', fontSize: '18px', margin: 0 }}>
                Detalle del Movimiento
              </h3>
              <button onClick={() => setRegistroSeleccionado(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: '#999' }}>
                &times;
              </button>
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
                  <pre style={{ 
                    margin: '5px 0 0 0', background: '#FFEBEE', padding: '12px', 
                    borderRadius: '6px', fontSize: '11px', overflowX: 'auto',
                    borderLeft: '4px solid #C62828'
                  }}>
                    {JSON.stringify(registroSeleccionado.datos_anteriores, null, 2)}
                  </pre>
                </div>
              )}

              {registroSeleccionado.datos_nuevos && (
                <div>
                  <strong style={{ color: '#2E7D32' }}>🟢 Datos Nuevos:</strong>
                  <pre style={{ 
                    margin: '5px 0 0 0', background: '#E8F5E9', padding: '12px', 
                    borderRadius: '6px', fontSize: '11px', overflowX: 'auto',
                    borderLeft: '4px solid #2E7D32'
                  }}>
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