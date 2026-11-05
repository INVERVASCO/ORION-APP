import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Vote, LogOut, Menu, X, Contact,
  Hash, Upload, PieChart, Shield, Target, TrendingUp,
  ShieldAlert, AlertTriangle, CheckCircle2, Brain, DollarSign,
  Calendar as CalendarIcon, Mic, MessageCircle, Map, MapPin, Globe,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { ORION_CONFIG } from '../lib/config';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchRole = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('No hay sesión activa');

        const { data, error } = await supabase.from('perfiles').select('rol, fecha_expiracion').eq('id', user.id).single();
        if (error) throw error;
        
        if (!cancelled) {
          if (data) {
            // VALIDACIÓN DE EXPIRACIÓN
            if (data.fecha_expiracion && new Date(data.fecha_expiracion) < new Date()) {
              await supabase.auth.signOut();
              alert('Tu acceso temporal a este sistema ha expirado. Contacta al administrador.');
              navigate('/login', { replace: true });
              return;
            }
            setUserRole(data.rol);
          } else {
            throw new Error('Perfil no encontrado en la base de datos');
          }
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
  }, [navigate]);

  const [confirmModal, setConfirmModal] = useState<any>({ visible: false, titulo: '', mensaje: '', tipo: 'warning', onConfirm: () => {} });

  const mostrarConfirm = (titulo: string, mensaje: string, tipo: string, onConfirm: () => void) => {
    setConfirmModal({ visible: true, titulo, mensaje, tipo, onConfirm });
  };
  const cerrarConfirm = () => setConfirmModal({ ...confirmModal, visible: false });

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

  const handleCerrarSesion = () => {
    mostrarConfirm('¿Cerrar sesión?', 'Asegúrate de que tus datos se hayan sincronizado.', 'warning', async () => {
      cerrarConfirm();
      setCerrandoSesion(true);
      
      try {
        // 🚀 VERIFICAR SI HAY DATOS PENDIENTES
        const dbRequest = indexedDB.open('orion_db');
        dbRequest.onsuccess = async (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (db.objectStoreNames.contains('queue')) {
            const tx = db.transaction('queue', 'readonly');
            const store = tx.objectStore('queue');
            const countRequest = store.count();
            
            countRequest.onsuccess = async () => {
              if (countRequest.result > 0) {
                alert(`⚠️ Tienes ${countRequest.result} registros sin sincronizar. Conéctate a internet y espera a que se suban antes de cerrar sesión.`);
                setCerrandoSesion(false);
                return;
              }
              // Si está vacío, cerramos
              db.close();
              indexedDB.deleteDatabase('orion_db');
              await supabase.auth.signOut();
              navigate('/login', { replace: true });
              setCerrandoSesion(false);
            };
          }
        };
      } catch (e) {
        console.warn('No se pudo verificar la cola:', e);
        await supabase.auth.signOut();
        navigate('/login', { replace: true });
        setCerrandoSesion(false);
      }
    });
  };

      await supabase.auth.signOut();
      navigate('/login', { replace: true });
      setCerrandoSesion(false);
    });
  };

  const menuPermitido = userRole ? menuItems.filter(item => item.roles.includes(userRole)) : [];

  return (
    <div className="app-container">
      <header className="mobile-header">
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
          {isSidebarOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
        <img src={ORION_CONFIG.organizacionLogo} alt={ORION_CONFIG.organizacionNombre} style={{ height: '35px', borderRadius: '8px' }} />
        <div style={{ width: '28px' }}></div>
      </header>

      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 998 }} />}

      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo" style={{ padding: '15px', display: 'flex', justifyContent: 'center' }}>
          <img src={ORION_CONFIG.organizacionLogo} alt={ORION_CONFIG.organizacionNombre} style={{ width: '100%', maxWidth: '200px', height: 'auto', borderRadius: '8px' }} />
        </div>

        <nav style={{ marginTop: '10px' }}>
          {roleLoading && <div style={{ padding: '20px', textAlign: 'center', color: '#64748B', fontSize: '12px' }}>Cargando menú...</div>}
          
          {!roleLoading && fetchError && (
            <div style={{ padding: '15px', background: 'rgba(244, 63, 94, 0.1)', borderRadius: '8px', margin: '0 10px' }}>
              <p style={{ color: '#F43F5E', fontSize: '11px', margin: '0 0 10px 0', lineHeight: '1.4' }}>⚠️ Error de permisos: {fetchError}. Contacta a soporte.</p>
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
            <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '25px' }}>{confirmModal.mensaje}</p>
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
