import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Vote, LogOut, Menu, X, Contact, 
  Hash, Upload, PieChart, Shield, Target, TrendingUp, 
  ShieldAlert, AlertTriangle, CheckCircle2, Brain, DollarSign,
  Calendar as CalendarIcon, Mic, MessageCircle, Map
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

  const [confirmModal, setConfirmModal] = useState<ConfirmModalData>({
    visible: false, titulo: '', mensaje: '', tipo: 'warning', onConfirm: () => {},
  });

  const mostrarConfirm = (titulo: string, mensaje: string, tipo: 'danger' | 'success' | 'warning', onConfirm: () => void) => {
    setConfirmModal({ visible: true, titulo, mensaje, tipo, onConfirm });
  };
  const cerrarConfirm = () => setConfirmModal({ ...confirmModal, visible: false });

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Activismo', path: '/activismo', icon: <Users size={20} /> },
    { name: 'Análisis', path: '/analisis', icon: <Target size={20} /> },
    { name: 'Arenero', path: '/importar', icon: <Upload size={20} /> },
    { name: 'Auditoría', path: '/auditoria', icon: <ShieldAlert size={20} /> },
    { name: 'Auditoría Campo', path: '/auditoria-campo', icon: <Map size={20} /> },
    { name: 'Centro IA', path: '/centro-ia', icon: <Brain size={20} /> },
    { name: 'Electoral', path: '/electoral', icon: <Vote size={20} /> },
    { name: 'Encuestas', path: '/encuestas', icon: <Mic size={20} /> },
    { name: 'Eventos', path: '/eventos', icon: <CalendarIcon size={20} /> },
    { name: 'Gastos', path: '/gastos', icon: <DollarSign size={20} /> },
    { name: 'Municipio', path: '/municipio', icon: <MapPin size={20} /> },
    { name: 'Personas', path: '/personas', icon: <Contact size={20} /> },
    { name: 'Problemáticas', path: '/problematicas', icon: <AlertTriangle size={20} /> },
    { name: 'Promesas', path: '/promesas', icon: <Target size={20} /> },
    { name: 'Pronóstico', path: '/pronostico', icon: <TrendingUp size={20} /> },
    { name: 'Radar Social', path: '/monitoreo-redes', icon: <MessageCircle size={20} /> },
    { name: 'Reportes', path: '/reportes', icon: <PieChart size={20} /> },
    { name: 'Secciones', path: '/secciones', icon: <Hash size={20} /> },
    { name: 'Usuarios', path: '/usuarios', icon: <Shield size={20} /> },
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
          const { error } = await supabase.auth.signOut();
          if (error) {
            console.error('Error al cerrar sesión:', error);
            setCerrandoSesion(false);
            return;
          }
          localStorage.removeItem('supabase.auth.token');
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
          style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.5)', zIndex: 998
          }}
        />
      )}

      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <img 
            src="https://i.ibb.co/qLGmzCyZ/orion-logo-png.png" 
            alt="ORION" 
            style={{ 
              width: '180px', 
              height: 'auto', 
              filter: 'drop-shadow(0px 0px 15px rgba(0, 212, 255, 0.3))' 
            }} 
          />
        </div>

        <nav>
          {menuItems.map((item) => (
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
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.65)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 2000, padding: '20px'
        }}>
          <div style={{
            background: 'white', borderRadius: '14px', padding: '28px',
            width: '100%', maxWidth: '440px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            borderTop: `5px solid ${confirmModal.tipo === 'danger' ? '#F43F5E' : confirmModal.tipo === 'success' ? '#10B981' : '#F59E0B'}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                <div style={{
                  background: confirmModal.tipo === 'danger' ? '#FFE4E6' : confirmModal.tipo === 'success' ? '#D1FAE5' : '#FEF3C7',
                  color: confirmModal.tipo === 'danger' ? '#F43F5E' : confirmModal.tipo === 'success' ? '#10B981' : '#F59E0B',
                  width: '46px', height: '46px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  {confirmModal.tipo === 'success' ? <CheckCircle2 size={26} /> : <AlertTriangle size={26} />}
                </div>
                <h3 style={{ margin: 0, fontSize: '17px', color: '#0F172A', wordBreak: 'break-word', lineHeight: '1.3' }}>
                  {confirmModal.titulo}
                </h3>
              </div>
              <button onClick={cerrarConfirm} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', marginLeft: '8px' }}>
                <X size={20} color="#64748B" />
              </button>
            </div>
            <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.6', marginBottom: '25px' }}>
              {confirmModal.mensaje}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={cerrarConfirm} style={{
                flex: 1, padding: '13px', background: '#F1F5F9',
                border: 'none', borderRadius: '8px', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '14px', color: '#64748B'
              }}>
                Cancelar
              </button>
              <button onClick={confirmModal.onConfirm} style={{
                flex: 1, padding: '13px',
                background: confirmModal.tipo === 'danger' ? '#F43F5E' : confirmModal.tipo === 'success' ? '#10B981' : '#F59E0B',
                color: 'white', border: 'none', borderRadius: '8px',
                cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
              }}>
                Sí, cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Necesitamos importar MapPin para el menú
import { MapPin } from 'lucide-react';