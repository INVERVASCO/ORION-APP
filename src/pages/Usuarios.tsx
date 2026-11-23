import { useEffect, useState } from 'react';
import { 
  Users, UserPlus, Search, Shield, MapPin, 
  CheckCircle2, XCircle, AlertTriangle, Key, Loader2, Sparkles, Filter, Trash2
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface Usuario {
  id: string;
  nombre_completo: string;
  email: string;
  telefono: string | null;
  rol: 'admin' | 'coordinador' | 'brigadista' | 'consulta';
  barrio_colonia_id: string | null;
  activo: boolean;
  created_at: string;
  ultimo_acceso: string | null;
  barrios_colonias?: { nombre: string } | null;
}

interface Barrio {
  id: string;
  nombre: string;
}

const colorRol: Record<string, string> = {
  admin: '#7C3AED',
  coordinador: '#0066CC',
  brigadista: '#00A651',
  consulta: '#666666',
};

const labelRol: Record<string, string> = {
  admin: 'Administrador',
  coordinador: 'Coordinador',
  brigadista: 'Brigadista',
  consulta: 'Solo Lectura',
};

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [filtrados, setFiltrados] = useState<Usuario[]>([]);
  const [barrios, setBarrios] = useState<Barrio[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<string>('');
  const [diagnostico, setDiagnostico] = useState<{ estado: 'cargando' | 'ok' | 'error'; mensaje: string; detalle?: string }>({
    estado: 'cargando',
    mensaje: 'Iniciando diagnóstico...',
  });

  const [modalCrear, setModalCrear] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre_completo: '',
    email: '',
    password: '',
    telefono: '',
    rol: 'brigadista' as 'admin' | 'coordinador' | 'brigadista' | 'consulta',
    barrio_colonia_id: '',
  });

  const [toastMensaje, setToastMensaje] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    setErrorCarga(null);
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('perfiles')
        .select('id, nombre_completo, email, telefono, rol, barrio_colonia_id, activo, created_at, ultimo_acceso, barrios_colonias(nombre)')
        .order('created_at', { ascending: false });

      if (usersError) {
        setErrorCarga(usersError.message.includes('policy') || usersError.message.includes('permission') ? 'No tienes permisos para ver los usuarios.' : 'Error al cargar: ' + usersError.message);
        setDiagnostico({ estado: 'error', mensaje: 'Error al leer la tabla perfiles', detalle: usersError.message });
        setLoading(false); return;
      }

      const { data: barriosData } = await supabase.from('barrios_colonias').select('id, nombre').order('nombre');

      const usersNormalizados = (usersData || []).map((u: any) => ({
        ...u,
        barrios_colonias: Array.isArray(u.barrios_colonias) ? u.barrios_colonias[0] : u.barrios_colonias
      }));

      setUsuarios(usersNormalizados as any); setFiltrados(usersNormalizados as any);
      if (barriosData) setBarrios(barriosData);

      setDiagnostico({ estado: 'ok', mensaje: `Conexión correcta — ${usersData?.length || 0} usuario(s) en el sistema` });
    } catch (err: any) {
      setErrorCarga('Error inesperado: ' + (err.message || 'Intenta de nuevo'));
      setDiagnostico({ estado: 'error', mensaje: 'Error inesperado', detalle: err.message });
    }
    setLoading(false);
  };

  useEffect(() => {
    let result = [...usuarios];
    if (busqueda.trim() !== '') {
      const q = busqueda.toLowerCase();
      result = result.filter(u => u.nombre_completo.toLowerCase().includes(q) || (u.email && u.email.toLowerCase().includes(q)));
    }
    if (filtroRol) result = result.filter(u => u.rol === filtroRol);
    setFiltrados(result);
  }, [busqueda, filtroRol, usuarios]);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación de contraseña
    const passRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passRegex.test(nuevoUsuario.password)) {
      setToastMensaje('La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.');
      setToastVisible(true);
      return;
    }

    setGuardando(true);

    try {
      // 1. Invocar la Edge Function para crear usuario en Supabase Auth
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: nuevoUsuario.email.trim().toLowerCase(),
          password: nuevoUsuario.password,
          nombre_completo: nuevoUsuario.nombre_completo,
          telefono: nuevoUsuario.telefono || null,
          rol: nuevoUsuario.rol,
          barrio_colonia_id: nuevoUsuario.barrio_colonia_id || null,
        },
      });

      if (error) throw error;
      if (data?.ok === false) throw new Error(data?.error || 'Error al crear usuario');

      // 🛡️ AUDITORÍA BLINDADA (A-05): Registrar al Administrador real autenticado
      const { data: { user: adminActual } } = await supabase.auth.getUser();
      if (adminActual) {
        await supabase.from('auditoria').insert([{
          accion: 'CREAR_USUARIO',
          tabla: 'perfiles',
          registro_id: data?.user?.id || null,
          valores_nuevos: {
            email: nuevoUsuario.email,
            nombre_completo: nuevoUsuario.nombre_completo,
            rol: nuevoUsuario.rol,
            creado_por_admin_id: adminActual.id
          },
          usuario_id: adminActual.id
        }]);
      }

      setToastMensaje('¡Usuario creado correctamente y registrado en bitácora!');
      setToastVisible(true);
      setModalCrear(false);
      setNuevoUsuario({
        nombre_completo: '', email: '', password: '', telefono: '', rol: 'brigadista', barrio_colonia_id: ''
      });
      cargarDatos();
    } catch (err: any) {
      setToastMensaje('Error: ' + (err.message || 'No se pudo crear'));
      setToastVisible(true);
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleActivo = async (u: Usuario) => {
    try {
      const nuevoEstado = !u.activo;
      const { error } = await supabase.from('perfiles').update({ activo: nuevoEstado }).eq('id', u.id);
      if (error) throw error;

      // Auditoría de cambio de estado
      const { data: { user: adminActual } } = await supabase.auth.getUser();
      if (adminActual) {
        await supabase.from('auditoria').insert([{
          accion: nuevoEstado ? 'ACTIVAR_USUARIO' : 'DESACTIVAR_USUARIO',
          tabla: 'perfiles',
          registro_id: u.id,
          valores_nuevos: { activo: nuevoEstado },
          usuario_id: adminActual.id
        }]);
      }

      setToastMensaje(`Usuario ${nuevoEstado ? 'activado' : 'desactivado'}`);
      setToastVisible(true);
      cargarDatos();
    } catch (err: any) {
      alert('Error al actualizar estado: ' + err.message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 className="header-title" style={{ marginBottom: '5px' }}>Gestión de Usuarios y Roles</h1>
          <p style={{ color: '#666', fontSize: '14px' }}>Control de acceso por roles (RBAC) y bitácora de auditoría.</p>
        </div>
        <button onClick={() => setModalCrear(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserPlus size={18} /> Nuevo Usuario
        </button>
      </div>

      {toastVisible && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', background: '#0A1628', color: '#00D4FF', padding: '12px 20px', borderRadius: '8px', zIndex: 9999, border: '1px solid #00D4FF', boxShadow: '0 4px 15px rgba(0,212,255,0.3)' }}>
          {toastMensaje}
          <button onClick={() => setToastVisible(false)} style={{ marginLeft: '10px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Buscador y Filtro */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 38px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '14px' }}
          />
        </div>
        <select
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '14px', background: 'white' }}
        >
          <option value="">Todos los roles</option>
          <option value="admin">Administrador</option>
          <option value="coordinador">Coordinador</option>
          <option value="brigadista">Brigadista</option>
          <option value="consulta">Solo Lectura</option>
        </select>
      </div>

      {/* Tabla de Usuarios */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '50px', gap: '10px', color: '#0066CC' }}>
          <Loader2 size={32} className="animate-spin" /> Cargando usuarios...
        </div>
      ) : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              <tr>
                <th style={{ padding: '12px 16px', color: '#64748B' }}>Nombre / Correo</th>
                <th style={{ padding: '12px 16px', color: '#64748B' }}>Rol</th>
                <th style={{ padding: '12px 16px', color: '#64748B' }}>Barrio Asignado</th>
                <th style={{ padding: '12px 16px', color: '#64748B' }}>Estado</th>
                <th style={{ padding: '12px 16px', color: '#64748B', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 'bold', color: '#0A1628' }}>{u.nombre_completo}</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>{u.email}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', color: 'white', background: colorRol[u.rol] || '#666' }}>
                      {labelRol[u.rol] || u.rol}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#334155' }}>
                    {u.barrios_colonias?.nombre || <span style={{ color: '#94A3B8' }}>Todo el territorio</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 'bold', color: u.activo ? '#16A34A' : '#DC2626' }}>
                      {u.activo ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleToggleActivo(u)}
                      style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', background: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                    >
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Crear Usuario */}
      {modalCrear && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', color: '#0A1628' }}>Crear Nuevo Usuario</h3>
            <form onSubmit={handleCrear}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Nombre Completo</label>
                <input required type="text" value={nuevoUsuario.nombre_completo} onChange={e => setNuevoUsuario({ ...nuevoUsuario, nombre_completo: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Correo Electrónico</label>
                <input required type="email" value={nuevoUsuario.email} onChange={e => setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Contraseña Temporal (mínimo 8 caracteres, 1 mayúscula, 1 número)</label>
                <input required type="password" value={nuevoUsuario.password} onChange={e => setNuevoUsuario({ ...nuevoUsuario, password: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Rol</label>
                  <select value={nuevoUsuario.rol} onChange={e => setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value as any })} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', background: 'white' }}>
                    <option value="brigadista">Brigadista</option>
                    <option value="coordinador">Coordinador</option>
                    <option value="consulta">Solo Lectura</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Barrio Asignado</label>
                  <select value={nuevoUsuario.barrio_colonia_id} onChange={e => setNuevoUsuario({ ...nuevoUsuario, barrio_colonia_id: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', background: 'white' }}>
                    <option value="">Ninguno / General</option>
                    {barrios.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalCrear(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', background: 'white', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={guardando} className="btn-primary" style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {guardando ? <Loader2 size={16} className="animate-spin" /> : null} {guardando ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
