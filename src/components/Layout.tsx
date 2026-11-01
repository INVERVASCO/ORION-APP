import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Vote, LogOut, Menu, X, Contact, 
  Hash, Upload, PieChart, Shield, Target, TrendingUp, 
  ShieldAlert, AlertTriangle, CheckCircle2, Brain, DollarSign,
  Calendar as CalendarIcon, Mic, MessageCircle, Map, MapPin, Globe 
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface ConfirmModalData {
  visible: boolean;
  titulo: string;
  mensaje: string;
  tipo: 'danger' | 'success' | 'warning';
  onConfirm: () => void;
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from('perfiles').select('rol').eq('id', session.user.id).single();
        if (data) setUserRole(data.rol);
      }
    };
    fetchRole();
  }, []);

  const [confirmModal, setConfirmModal] = useState<ConfirmModalData>({
    visible: false, titulo: '', mensaje: '', tipo: 'warning', onConfirm: () => {},
  });

  const mostrarConfirm = (titulo: string, mensaje: string, tipo: 'danger' | 'success' | 'warning', onConfirm: () => void) => {
    setConfirmModal({ visible: true, titulo, mensaje, tipo, onConfirm });
  };
  const cerrarConfirm = () => setConfirmModal({ ...confirmModal, visible: false });

  // 🚀 DEFINIMOS EL MENÚ CON SUS ROLES PERMITIDOS
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
    { name: 'Geocodificación', path: '/app/admin-geocode', icon: <Map size={20} />, roles: ['admin'] }, // Oculto para no-admins
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsSidebarOpen(false);
  };

  const handleCerrarSesion = () => {
    mostrarConfirm(
      '¿Cerrar sesión?',
      'Se cerrará tu sesión actual y volverás a la pantalla de inicio. ¿Deseas continuar?',
      'warning',
      async () => {
        cerrarConfirm();
        setCerrandoSesion(true);
        try {
          await supabase.auth.signOut();
          setIsSidebarOpen(false);
          navigate('/login', { replace: true });
        } catch (err) {
          console.error('Error inesperado al cerrar sesión:', err);
        } finally {
          setCerrandoSesion(false);
        }
      }
    );
  };

  // Filtramos los items según el rol
  const menuPermitido = menuItems.filter(item => item.roles.includes(userRole));

  return (
    <div className="app-container">
      <header className="mobile-header">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          {isSidebarOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
        <img src="https://i.ibb.co/qLGmzCyZ/orion-logo-png.png" alt="ORION" style={{ height: '30px' }} />
        <div style={{ width: '28px' }}></div>
      </header>

      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 998 }}
        />
      )}

      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <img 
            src="https://i.ibb.co/qLGmzCyZ/orion-logo-png.png" 
            alt="ORION" 
            style={{ width: '180px', height: 'auto', filter: 'drop-shadow(0px 0px 15px rgba(0, 212, 255, 0.3))' }} 
          />
        </div>

        <nav>
          {/* 🚀 RENDERIZAMOS SOLO LOS PERMITIDOS */}
          {menuPermitido.map((item) => (
            <div
              key={item.name}
              className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => handleNavigation(item.path)}
            >
              {item.icon}
              <span>{item.name}</span>
            </div>
          ))}
        </nav>

        <div style={{ marginTop: 'auto' }}>
          
          <div style={{ padding: '10px 20px', background: 'rgba(0, 212, 255, 0.05)', borderRadius: '8px', marginBottom: '10px' }}>
            <p style={{ margin: 0, fontSize: '11px', color: '#94A3B8' }}>ROL ACTUAL:</p>
            <p style={{ margin: 0, fontSize: '13px', color: '#00D4FF', fontWeight: 'bold', textTransform: 'uppercase' }}>{userRole || 'Cargando...'}</p>
          </div>

          <div
            className="menu-item"
            onClick={() => navigate('/')}
            style={{ marginBottom: '10px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}
          >
            <Globe size={20} />
            <span>Ir a la Página Web</span>
          </div>

          <div
            className="menu-item"
            onClick={handleCerrarSesion}
            style={{ opacity: cerrandoSesion ? 0.5 : 1 }}
          >
            <LogOut size={20} />
            <span>{cerrandoSesion ? 'Cerrando sesión...' : 'Cerrar Sesión'}</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>

      {confirmModal.visible && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', borderTop: `5px solid ${confirmModal.tipo === 'danger' ? '#F43F5E' : confirmModal.tipo === 'success' ? '#10B981' : '#F59E0B'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                <div style={{ background: confirmModal.tipo === 'danger' ? '#FFE4E6' : confirmModal.tipo === 'success' ? '#D1FAE5' : '#FEF3C7', color: confirmModal.tipo === 'danger' ? '#F43F5E' : confirmModal.tipo === 'success' ? '#10B981' : '#F59E0B', width: '46px', height: '46px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {confirmModal.tipo === 'success' ? <CheckCircle2 size={26} /> : <AlertTriangle size={26} />}
                </div>
                <h3 style={{ margin: 0, fontSize: '17px', color: '#0F172A', wordBreak: 'break-word', lineHeight: '1.3' }}>{confirmModal.titulo}</h3>
              </div>
              <button onClick={cerrarConfirm} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', marginLeft: '8px' }}><X size={20} color="#64748B" /></button>
            </div>
            <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.6', marginBottom: '25px' }}>{confirmModal.mensaje}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={cerrarConfirm} style={{ flex: 1, padding: '13px', background: '#F1F5F9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', color: '#64748B' }}>Cancelar</button>
              <button onClick={confirmModal.onConfirm} style={{ flex: 1, padding: '13px', background: confirmModal.tipo === 'danger' ? '#F43F5E' : confirmModal.tipo === 'success' ? '#10B981' : '#F59E0B', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>Sí, confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
