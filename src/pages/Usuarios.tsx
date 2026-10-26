import { useEffect, useState } from 'react';
import { Plus, Search, UserPlus, Edit3, X, Loader2, Shield, UserCheck, UserX, Mail, Phone, MapPin, KeyRound, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Toast from '../components/Toast';

interface Usuario {
  id: string;
  nombre_completo: string;
  email: string | null;
  telefono: string | null;
  rol: string;
  barrio_colonia_id: string | null;
  activo: boolean;
  created_at: string;
  ultimo_acceso: string | null;
  barrios_colonias: { nombre: string } | null;
}

interface Barrio { id: string; nombre: string; }

const ROLES = [
  { value: 'admin', label: 'Administrador', desc: 'Acceso total al sistema' },
  { value: 'coordinador', label: 'Coordinador', desc: 'Acceso a todo excepto gestión de usuarios' },
  { value: 'brigadista', label: 'Brigadista', desc: 'Solo captura en su barrio asignado' },
  { value: 'consulta', label: 'Consulta', desc: 'Solo lectura' },
];

const colorRol: Record<string, string> = {
  'admin': '#9F2241',
  'coordinador': '#6F1A2D',
  'brigadista': '#B85671',
  'consulta': '#666666',
};

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [barrios, setBarrios] = useState<Barrio[]>([]);
  const [filtrados, setFiltrados] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [modalCrear, setModalCrear] = useState(false);
  const [usuarioEditar, setUsuarioEditar] = useState<Usuario | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMensaje, setToastMensaje] = useState('');

  // Estados de diagnóstico
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [diagnostico, setDiagnostico] = useState<{
    estado: 'ok' | 'error' | 'cargando';
    mensaje: string;
    detalle?: string;
  }>({ estado: 'cargando', mensaje: 'Verificando conexión...' });

  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre_completo: '',
    email: '',
    password: '',
    telefono: '',
    rol: 'brigadista',
    barrio_colonia_id: '',
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    setErrorCarga(null);
    setDiagnostico({ estado: 'cargando', mensaje: 'Verificando conexión...' });

    try {
      // 1. Cargar usuarios
      const { data: usersData, error: usersError } = await supabase
        .from('perfiles')
        .select('id, nombre_completo, email, telefono, rol, barrio_colonia_id, activo, created_at, ultimo_acceso, barrios_colonias(nombre)')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('❌ Error al cargar usuarios:', usersError);
        setErrorCarga(
          usersError.message.includes('policy') || usersError.message.includes('permission')
            ? 'No tienes permisos para ver los usuarios. Contacta al administrador.'
            : 'Error al cargar usuarios: ' + usersError.message
        );
        setDiagnostico({
          estado: 'error',
          mensaje: 'Error al leer la tabla perfiles',
          detalle: usersError.message,
        });
        setLoading(false);
        return;
      }

      // 2. Cargar barrios
      const { data: barriosData } = await supabase
        .from('barrios_colonias')
        .select('id, nombre')
        .order('nombre');

      setUsuarios((usersData || []) as any);
      setFiltrados((usersData || []) as any);
      if (barriosData) setBarrios(barriosData);

      setDiagnostico({
        estado: 'ok',
        mensaje: `Conexión correcta — ${usersData?.length || 0} usuario(s) en el sistema`,
      });
    } catch (err: any) {
      console.error('❌ Error inesperado:', err);
      setErrorCarga('Error inesperado: ' + (err.message || 'Intenta de nuevo'));
      setDiagnostico({
        estado: 'error',
        mensaje: 'Error inesperado al cargar',
        detalle: err.message,
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    let result = [...usuarios];
    if (busqueda.trim() !== '') {
      const q = busqueda.toLowerCase();
      result = result.filter(u =>
        u.nombre_completo.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q))
      );
    }
    if (filtroRol) result = result.filter(u => u.rol === filtroRol);
    setFiltrados(result);
  }, [busqueda, filtroRol, usuarios]);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    try {
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

      if (error) {
        setToastMensaje('Error al crear usuario: ' + error.message);
        setToastVisible(true);
        setGuardando(false);
        return;
      }

      if (data?.error) {
        setToastMensaje('Error: ' + data.error);
        setToastVisible(true);
        setGuardando(false);
        return;
      }

      await cargarDatos();

      setModalCrear(false);
      setNuevoUsuario({
        nombre_completo: '',
        email: '',
        password: '',
        telefono: '',
        rol: 'brigadista',
        barrio_colonia_id: '',
      });
      setToastMensaje(`¡${nuevoUsuario.nombre_completo} agregado al equipo!`);
      setToastVisible(true);
    } catch (err: any) {
      setToastMensaje('Error inesperado: ' + (err.message || 'Intenta de nuevo'));
      setToastVisible(true);
    }

    setGuardando(false);
  };

  const handleEditar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioEditar) return;
    setGuardando(true);

    const { error } = await supabase
      .from('perfiles')
      .update({
        nombre_completo: usuarioEditar.nombre_completo,
        telefono: usuarioEditar.telefono,
        rol: usuarioEditar.rol,
        barrio_colonia_id: usuarioEditar.barrio_colonia_id,
        activo: usuarioEditar.activo,
      })
      .eq('id', usuarioEditar.id);

    if (error) {
      setToastMensaje('Error al actualizar: ' + error.message);
    } else {
      setUsuarios(usuarios.map(u => u.id === usuarioEditar.id ? usuarioEditar : u));
      setUsuarioEditar(null);
      setToastMensaje('Usuario actualizado');
    }
    setToastVisible(true);
    setGuardando(false);
  };

  const toggleActivo = async (usuario: Usuario) => {
    const nuevoEstado = !usuario.activo;
    const { error } = await supabase
      .from('perfiles')
      .update({ activo: nuevoEstado })
      .eq('id', usuario.id);

    if (!error) {
      setUsuarios(usuarios.map(u => u.id === usuario.id ? { ...u, activo: nuevoEstado } : u));
      setToastMensaje(`${usuario.nombre_completo} ${nuevoEstado ? 'activado' : 'desactivado'}`);
      setToastVisible(true);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px', gap: '10px', color: '#9F2241' }}>
        <Loader2 size={32} /> Cargando usuarios...
      </div>
    );
  }

  const totalActivos = usuarios.filter(u => u.activo).length;
  const totalAdmin = usuarios.filter(u => u.rol === 'admin').length;
  const totalBrigadistas = usuarios.filter(u => u.rol === 'brigadista').length;

  return (
    <div>
      <h1 className="header-title">Gestión de Usuarios</h1>
      <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
        Administra el equipo que usará el sistema, con roles y áreas asignadas.
      </p>

      {/* Banner de diagnóstico */}
      {diagnostico.estado === 'error' && (
        <div style={{
          background: '#FFEBEE',
          border: '1px solid #C62828',
          borderLeft: '5px solid #C62828',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}>
          <AlertTriangle size={24} color="#C62828" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ margin: '0 0 5px 0', color: '#C62828', fontSize: '15px' }}>
              ⚠️ Problema de conexión detectado
            </h4>
            <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#555' }}>
              {diagnostico.mensaje}
            </p>
            {diagnostico.detalle && (
              <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#888', fontStyle: 'italic', wordBreak: 'break-word' }}>
                Detalle técnico: {diagnostico.detalle}
              </p>
            )}
            <button
              onClick={cargarDatos}
              style={{
                background: '#C62828',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <RefreshCw size={14} /> Reintentar
            </button>
          </div>
        </div>
      )}

      {diagnostico.estado === 'ok' && usuarios.length > 0 && (
        <div style={{
          background: '#E8F5E9',
          borderLeft: '5px solid #2E7D32',
          borderRadius: '8px',
          padding: '10px 15px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          color: '#2E7D32',
        }}>
          <CheckCircle2 size={18} />
          <span>{diagnostico.mensaje}</span>
          <button
            onClick={cargarDatos}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#2E7D32',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              textDecoration: 'underline',
            }}
          >
            <RefreshCw size={12} /> Refrescar
          </button>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '25px' }}>
        <div className="card" style={{ padding: '18px', textAlign: 'center', borderTop: '4px solid #9F2241', borderLeft: 'none' }}>
          <Shield size={24} color="#9F2241" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#9F2241' }}>{totalActivos}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Usuarios activos</div>
        </div>
        <div className="card" style={{ padding: '18px', textAlign: 'center', borderTop: '4px solid #6F1A2D', borderLeft: 'none' }}>
          <UserCheck size={24} color="#6F1A2D" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#6F1A2D' }}>{totalAdmin}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Administradores</div>
        </div>
        <div className="card" style={{ padding: '18px', textAlign: 'center', borderTop: '4px solid #B85671', borderLeft: 'none' }}>
          <UserPlus size={24} color="#B85671" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#B85671' }}>{totalBrigadistas}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Brigadistas</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => setModalCrear(true)} className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} /> Nuevo Usuario
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '25px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ width: '100%', padding: '11px 11px 11px 40px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>
        <select value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)}
          style={{ padding: '11px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '14px', background: 'white' }}>
          <option value="">Todos los roles</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {filtrados.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <UserX size={40} color="#9F2241" style={{ opacity: 0.5, marginBottom: '15px' }} />
          <p style={{ color: '#666', fontSize: '15px' }}>
            {usuarios.length === 0 ? 'Aún no hay usuarios registrados.' : 'No se encontraron resultados con los filtros aplicados.'}
          </p>
          {errorCarga && (
            <p style={{ color: '#C62828', fontSize: '13px', marginTop: '10px' }}>
              {errorCarga}
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '15px' }}>
          {filtrados.map(u => (
            <div key={u.id} style={{
              background: 'white', borderRadius: '10px', padding: '18px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              borderLeft: `4px solid ${u.activo ? colorRol[u.rol] || '#9F2241' : '#CCCCCC'}`,
              opacity: u.activo ? 1 : 0.65,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                  <div style={{
                    background: u.activo ? colorRol[u.rol] || '#9F2241' : '#CCC',
                    color: 'white', width: '40px', height: '40px',
                    borderRadius: '50%', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontWeight: 'bold', fontSize: '16px', flexShrink: 0
                  }}>
                    {u.nombre_completo.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '15px', wordBreak: 'break-word', color: '#333' }}>
                      {u.nombre_completo}
                    </h3>
                    <span style={{
                      display: 'inline-block', marginTop: '3px', padding: '2px 8px',
                      background: colorRol[u.rol] || '#9F2241',
                      color: 'white', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold'
                    }}>
                      {ROLES.find(r => r.value === u.rol)?.label || u.rol}
                    </span>
                  </div>
                </div>
                {!u.activo && (
                  <span style={{ fontSize: '10px', background: '#FFEBEE', color: '#C62828', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                    INACTIVO
                  </span>
                )}
              </div>

              {u.email && (
                <div style={{ fontSize: '13px', color: '#555', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
                  <Mail size={14} color="#9F2241" /> {u.email}
                </div>
              )}
              {u.telefono && (
                <div style={{ fontSize: '13px', color: '#555', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <Phone size={14} color="#9F2241" /> {u.telefono}
                </div>
              )}
              {u.barrios_colonias?.nombre && (
                <div style={{ fontSize: '13px', color: '#555', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <MapPin size={14} color="#9F2241" /> {u.barrios_colonias.nombre}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #EEE' }}>
                <button onClick={() => setUsuarioEditar(u)} style={{
                  flex: 1, padding: '8px', background: '#F4F4F4', border: 'none', borderRadius: '6px',
                  cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: '#333',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                }}>
                  <Edit3 size={14} /> Editar
                </button>
                <button onClick={() => toggleActivo(u)} style={{
                  padding: '8px 12px',
                  background: u.activo ? '#FFEBEE' : '#E8F5E9',
                  border: 'none', borderRadius: '6px', cursor: 'pointer',
                  color: u.activo ? '#C62828' : '#2E7D32',
                  fontSize: '12px', fontWeight: 'bold'
                }}>
                  {u.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear Usuario */}
      {modalCrear && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ background: 'white', padding: '28px', borderRadius: '12px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#9F2241', fontSize: '18px', margin: 0 }}>Nuevo Usuario del Equipo</h3>
              <button onClick={() => setModalCrear(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleCrear} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Nombre completo *</label>
                <input required type="text" placeholder="Nombre del usuario" value={nuevoUsuario.nombre_completo}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombre_completo: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Correo electrónico *</label>
                <input required type="email" placeholder="correo@ejemplo.com" value={nuevoUsuario.email}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Contraseña temporal * (mín. 6 caracteres)</label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                  <input required type="text" minLength={6} placeholder="Mínimo 6 caracteres" value={nuevoUsuario.password}
                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, password: e.target.value })}
                    style={{ ...inputStyle, paddingLeft: '36px' }} />
                </div>
                <p style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>El usuario podrá cambiarla después desde su perfil.</p>
              </div>
              <div>
                <label style={labelStyle}>Teléfono</label>
                <input type="tel" placeholder="7712345678" value={nuevoUsuario.telefono}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, telefono: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Rol *</label>
                <select value={nuevoUsuario.rol} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value })} style={inputStyle}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>)}
                </select>
              </div>
              {nuevoUsuario.rol === 'brigadista' && (
                <div>
                  <label style={labelStyle}>Barrio / Colonia asignada *</label>
                  <select value={nuevoUsuario.barrio_colonia_id} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, barrio_colonia_id: e.target.value })} style={inputStyle}>
                    <option value="">Selecciona un barrio</option>
                    {barrios.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                  </select>
                </div>
              )}
              <div style={{ fontSize: '12px', color: '#666', padding: '10px', background: '#FFF8E1', borderRadius: '6px', borderLeft: '3px solid #F9A825' }}>
                El usuario podrá acceder inmediatamente con el correo y contraseña que definas.
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                <button type="button" onClick={() => setModalCrear(false)} style={btnSecundario}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} disabled={guardando}>
                  {guardando ? <><Loader2 size={16} /> Creando...</> : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Usuario */}
      {usuarioEditar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ background: 'white', padding: '28px', borderRadius: '12px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#9F2241', fontSize: '18px', margin: 0 }}>Editar Usuario</h3>
              <button onClick={() => setUsuarioEditar(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleEditar} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Nombre completo *</label>
                <input required type="text" value={usuarioEditar.nombre_completo}
                  onChange={(e) => setUsuarioEditar({ ...usuarioEditar, nombre_completo: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Teléfono</label>
                <input type="tel" value={usuarioEditar.telefono || ''}
                  onChange={(e) => setUsuarioEditar({ ...usuarioEditar, telefono: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Rol *</label>
                <select value={usuarioEditar.rol} onChange={(e) => setUsuarioEditar({ ...usuarioEditar, rol: e.target.value })} style={inputStyle}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Barrio / Colonia asignada</label>
                <select value={usuarioEditar.barrio_colonia_id || ''}
                  onChange={(e) => setUsuarioEditar({ ...usuarioEditar, barrio_colonia_id: e.target.value || null })} style={inputStyle}>
                  <option value="">Sin asignar</option>
                  {barrios.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: '#F9F9F9', borderRadius: '6px' }}>
                <input type="checkbox" id="activo-check" checked={usuarioEditar.activo}
                  onChange={(e) => setUsuarioEditar({ ...usuarioEditar, activo: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                <label htmlFor="activo-check" style={{ cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
                  Usuario activo (puede iniciar sesión)
                </label>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                <button type="button" onClick={() => setUsuarioEditar(null)} style={btnSecundario}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} disabled={guardando}>
                  {guardando ? <><Loader2 size={16} /> Guardando...</> : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toast mensaje={toastMensaje} visible={toastVisible} onClose={() => setToastVisible(false)} />
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '11px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '15px', boxSizing: 'border-box' };
const btnSecundario: React.CSSProperties = { flex: 1, padding: '12px', background: '#EEE', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };