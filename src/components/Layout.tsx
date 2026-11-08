// src/components/Layout.tsx
import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Vote, LogOut, Menu, X, Contact,
  Hash, Upload, PieChart, Shield, Target, TrendingUp,
  ShieldAlert, AlertTriangle, Brain, DollarSign,
  Calendar as CalendarIcon, Mic, MessageCircle, Map, MapPin, Globe,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { ORION_CONFIG } from '../lib/config';
import {
  getQueueStats,
  exportarColaMuerta,
  limpiarColaPropia,
  olvidarUsuario,
  reintentarMuertas,
  useSyncStatus,
} from '../lib/syncManager';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Estado de sincronización para el indicador del menú
  const { queueSize, deadSize, lastError, isOnline, syncing, syncNow } = useSyncStatus();

  useEffect(() => {
    let cancelled = false;
    const fetchRole = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('No hay sesión activa');

        const { data, error } = await supabase
          .from('perfiles')
          .select('rol, activo, fecha_expiracion')
          .eq('id', user.id)
          .single();
        if (error) throw error;

        if (!cancelled) {
          if (!data) throw new Error('Perfil no encontrado en la base de datos');

          // Cuenta desactivada: se cierra la sesión (la cola local NO se borra aquí)
          if (data.activo === false) {
            await supabase.auth.signOut();
            alert('Tu cuenta ha sido desactivada. Contacta al administrador.');
            navigate('/login', { replace: true });
            return;
          }

          // Acceso temporal vencido
          if (data.fecha_expiracion && new Date(data.fecha_expiracion) < new Date()) {
            await supabase.auth.signOut();
            alert('Tu acceso temporal ha expirado.');
            navigate('/login', { replace: true });
            return;
          }

          setUserRole(data.rol);
        }
      } catch (err: any) {
        console.error('Error cargando rol:', err);
        if (!cancelled) setFetchError(err.message || 'Error al cargar permisos');
      } finally {
        if (!cancelled) setRoleLoading(false);
      }
    };
    fetchRole();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [confirmModal, setConfirmModal] = useState<any>({ visible: false, titulo: '', mensaje: '', tipo: 'warning', onConfirm: () => {} });

  const mostrarConfirm = (titulo: string, mensaje: string, tipo: string, onConfirm: () => void) => {
    setConfirmModal({ visible: true, titulo, mensaje, tipo, onConfirm });
  };
  const cerrarConfirm = () => setConfirmModal((prev: any) => ({ ...prev, visible: false }));

  const menuItems = [
    { name: 'Dashboard', path: '/app', icon: <LayoutDashboard size={20} />, roles: ['admin', 'coordinador', 'brigadista', 'consulta'] },
    { name: 'Activismo', path: '/app/activismo', icon: <Users size={20} />, roles: ['admin', 'coordinador', 'brigadista'] },
    { name: 'Análisis', path: '/app/analisis', icon: <Target size={20} />, roles: ['admin', 'coordinador', 'consulta'] },
    { name: 'Arenero', path: '/app/importar', icon: <Upload size={20} />, roles: ['admin', 'coordinador'] },
    { name: 'Auditoría', path: '/app/auditoria', icon: <ShieldAlert size={20} />, roles: ['admin'] },
    { name: 'Auditoría Campo', path: '/app/auditoria-campo', icon: <MapPin size={20} />, roles: ['admin', 'coordinador'] },
    { name: 'Centro IA', path: '/app/centro-ia', icon: <Brain size={20} />, roles: ['admin', 'coordinador', 'consulta'] },
    { name: 'Electoral', path: '/app/electoral', icon: <Vote size={20} />, roles: ['admin', 'coordinador', 'brigadista', 'consulta'] },
    { name: 'Encuestas', path: '/app/encuestas', icon: <Mic size={20} />, roles: ['admin', 'coordinador', 'brigadista'] },
    { name: 'Eventos', path: '/app/eventos', icon: <CalendarIcon size={20} />, roles: ['admin', 'coordinador'] },
    { name: 'Gastos', path: '/app/gastos', icon: <DollarSign size={20} />, roles: ['admin', 'coordinador'] },
    { name: 'Municipio', path: '/app/municipio', icon: <MapPin size={20} />, roles: ['admin', 'coordinador', 'brigadista', 'consulta'] },
    { name: 'Personas', path: '/app/personas', icon: <Contact size={20} />, roles: ['admin', 'coordinador', 'brigadista'] },
    { name: 'Problemáticas', path: '/app/problematicas', icon: <AlertTriangle size={20} />, roles: ['admin', 'coordinador', 'brigadista'] },
    { name: 'Promesas', path: '/app/promesas', icon: <Target size={20} />, roles: ['admin', 'coordinador'] },
    { name: 'Pronóstico', path: '/app/pronostico', icon: <TrendingUp size={20} />, roles: ['admin', 'coordinador', 'consulta'] },
    { name: 'Radar Social', path: '/app/monitoreo-redes', icon: <MessageCircle size={20} />, roles: ['admin', 'coordinador'] },
    { name: 'Reportes', path: '/app/reportes', icon: <PieChart size={20} />, roles: ['admin', 'coordinador', 'consulta'] },
    { name: 'Secciones', path: '/app/secciones', icon: <Hash size={20} />, roles: ['admin', 'coordinador'] },
    { name: 'Usuarios', path: '/app/usuarios', icon: <Shield size={20} />, roles: ['admin'] },
    { name: 'Geocodificación', path: '/app/admin-geocode', icon: <Map size={20} />, roles: ['admin'] },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsSidebarOpen(false);
  };

  const handleCerrarSesion = async () => {
    try {
      // getQueueStats lanza error si IndexedDB falla: en ese caso NO se cierra la sesión
      const stats = await getQueueStats();

      if (stats.pending > 0) {
        alert(`⚠️ Tienes ${stats.pending} registro(s) pendientes de subir.\n\nConéctate a internet y espera a que se sincronicen antes de cerrar sesión.`);
        return;
      }

      if (stats.dead > 0) {
        const descargar = window.confirm(
          `⚠️ Tienes ${stats.dead} registro(s) fallidos que el servidor rechazó.\n\n` +
          `🚨 ATENCIÓN: El respaldo JSON contiene datos personales SIN CIFRAR. Guárdalo en un lugar seguro y elimínalo cuando termines de revisarlo.\n\n` +
          `Si continúas, estos registros se borrarán de este dispositivo.\n\n` +
          `¿Deseas descargar el respaldo y continuar con el cierre de sesión?\n\n` +
          `(Aceptar = Descargar y continuar | Cancelar = No cerrar sesión)`
        );
        if (!descargar) return;
        await exportarColaMuerta();
        await new Promise((r) => setTimeout(r, 1000));
      }

      const avisoAjenas = stats.ajenas > 0
        ? `\n\n⚠️ Hay ${stats.ajenas} registro(s) pendientes de OTRO usuario en este dispositivo.\n\nNO se borrarán al cerrar sesión. La persona dueña de esos datos debe iniciar sesión aquí para sincronizarlos.\n\nMientras tanto quedan guardados localmente sin cifrar.`
        : '';

      mostrarConfirm('¿Cerrar sesión?', `Se cerrará tu sesión actual.${avisoAjenas}`, 'warning', async () => {
        cerrarConfirm();
        setCerrandoSesion(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const uid = session?.user?.id ?? null;

          // Lectura nueva: pudieron encolarse registros mientras se decidía
          const fresh = await getQueueStats();
          if (fresh.pending > 0) {
            alert(`Se encolaron ${fresh.pending} registro(s) nuevos. Espera a que se sincronicen antes de cerrar sesión.`);
            return;
          }

          // Sin red, signOut puede fallar: se cierra la sesión local
          const { error } = await supabase.auth.signOut();
          if (error) await supabase.auth.signOut({ scope: 'local' });

          // Borra solo lo propio; la base completa solo si no queda nada ajeno
          await limpiarColaPropia(uid);
          olvidarUsuario();
          navigate('/login', { replace: true });
        } catch (e) {
          console.error('Error al cerrar sesión:', e);
          alert('No se pudo completar el cierre de sesión de forma segura. Recarga la página e inténtalo de nuevo.');
        } finally {
          setCerrandoSesion(false);
        }
      });
    } catch (error) {
      console.error('Error al verificar la cola:', error);
      alert('No se pudo verificar la seguridad de los datos. Por favor, recarga la página.');
    }
  };

  const menuPermitido = userRole ? menuItems.filter((item) => item.roles.includes(userRole)) : [];
  const hayAvisoSync = queueSize > 0 || deadSize > 0 || !isOnline;

  return (
    <div className="app-container">
      <header className="mobile-header">
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
          {isSidebarOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
        <img src={ORION_CONFIG.organizacionLogo} alt="ORION" style={{ height: '35px', borderRadius: '8px' }} />
        <div style={{ width: '28px' }}></div>
      </header>

      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 998 }} />}

      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo" style={{ padding: '15px', display: 'flex', justifyContent: 'center' }}>
          <img src={ORION_CONFIG.organizacionLogo} alt="ORION" style={{ width: '100%', maxWidth: '200px', height: 'auto', borderRadius: '8px' }} />
        </div>

        <nav style={{ marginTop: '10px' }}>
          {roleLoading && <div style={{ padding: '20px', textAlign: 'center', color: '#64748B', fontSize: '12px' }}>Cargando menú...</div>}

          {!roleLoading && fetchError && (
            <div style={{ padding: '15px', background: 'rgba(244, 63, 94, 0.1)', borderRadius: '8px', margin: '0 10px' }}>
              <p style={{ color: '#F43F5E', fontSize: '11px', margin: '0 0 10px 0', lineHeight: '1.4' }}>⚠️ Error de permisos: {fetchError}.</p>
            </div>
          )}

          {!roleLoading && !fetchError && menuPermitido.map((item) => (
            <div key={item.name} className={`menu-item ${location.pathname === item.path ? 'active' : ''}`} onClick={() => handleNavigation(item.path)}>
              {item.icon}
              <span>{item.name}</span>
            </div>
          ))}
        </nav>

        <div style={{ marginTop: 'auto' }}>
          {hayAvisoSync && (
            <div style={{ padding: '10px 14px', background: deadSize > 0 ? 'rgba(244, 63, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)', borderRadius: '8px', marginBottom: '10px' }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#94A3B8' }}>
                {!isOnline ? 'SIN CONEXIÓN' : syncing ? 'SINCRONIZANDO...' : 'SINCRONIZACIÓN'}
              </p>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: deadSize > 0 ? '#F43F5E' : '#F59E0B', fontWeight: 'bold' }}>
                {queueSize} pendiente(s){deadSize > 0 ? ` · ${deadSize} con error` : ''}
              </p>
              {lastError && <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#94A3B8' }}>{lastError}</p>}
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                {queueSize > 0 && isOnline && !syncing && (
                  <button onClick={() => { void syncNow(); }} style={{ background: '#00D4FF', color: '#0A1628', border: 'none', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Sincronizar ahora
                  </button>
                )}
                {deadSize > 0 && (
                  <button onClick={() => { void reintentarMuertas(); }} style={{ background: 'transparent', color: '#F43F5E', border: '1px solid #F43F5E', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Reintentar fallidos
                  </button>
                )}
              </div>
            </div>
          )}

          <div style={{ padding: '10px 20px', background: 'rgba(0, 212, 255, 0.05)', borderRadius: '8px', marginBottom: '10px' }}>
            <p style={{ margin: 0, fontSize: '11px', color: '#94A3B8' }}>ROL ACTUAL:</p>
            <p style={{ margin: 0, fontSize: '13px', color: '#00D4FF', fontWeight: 'bold', textTransform: 'uppercase' }}>
              {roleLoading ? 'CARGANDO...' : userRole || 'SIN PERMISOS'}
            </p>
          </div>
          <div className="menu-item" onClick={() => navigate('/')} style={{ marginBottom: '10px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
            <Globe size={20} /> <span>Ir a la Página Web</span>
          </div>
          <div className="menu-item" onClick={handleCerrarSesion} style={{ opacity: cerrandoSesion ? 0.5 : 1 }}>
            <LogOut size={20} /> <span>{cerrandoSesion ? 'Cerrando...' : 'Cerrar Sesión'}</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>

      {confirmModal.visible && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '440px' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#0F172A' }}>{confirmModal.titulo}</h3>
            <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '25px', whiteSpace: 'pre-wrap' }}>{confirmModal.mensaje}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={cerrarConfirm} style={{ flex: 1, padding: '13px', background: '#F1F5F9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
              <button onClick={confirmModal.onConfirm} style={{ flex: 1, padding: '13px', background: '#F43F5E', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
