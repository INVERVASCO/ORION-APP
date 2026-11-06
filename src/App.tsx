import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { supabase } from './lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';

import { SyncProvider } from './lib/syncManager';
import OrionAnimatedLogo from './components/OrionAnimatedLogo';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Páginas públicas
import LandingPage from './pages/LandingPage';
import DossierPage from './pages/DossierPage';
import Login from './pages/Login';
import RecuperarPassword from './pages/RecuperarPassword';
import CambiarPassword from './pages/CambiarPassword';

// 🚀 LA MAGIA: Función que recarga si falla el archivo (Chunk Error)
// (Solo reemplaza la función lazyWithRetry en tu App.tsx)
const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
        // 🚀 FIX: Evita que React muestre la pantalla de error mientras recarga
        return new Promise(() => {}); 
      }
      throw error;
    }
  });

// Páginas privadas (Lazy con Reintento)
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const Analisis = lazyWithRetry(() => import('./pages/Analisis'));
const Pronostico = lazyWithRetry(() => import('./pages/Pronostico'));
const CentroInteligenciaElectoral = lazyWithRetry(() => import('./pages/CentroInteligenciaElectoral'));
const Municipio = lazyWithRetry(() => import('./pages/Municipio'));
const BarrioDetalle = lazyWithRetry(() => import('./pages/BarrioDetalle'));
const Personas = lazyWithRetry(() => import('./pages/Personas'));
const Secciones = lazyWithRetry(() => import('./pages/Secciones'));
const ActivismoGlobal = lazyWithRetry(() => import('./pages/ActivismoGlobal'));
const ElectoralGlobal = lazyWithRetry(() => import('./pages/ElectoralGlobal'));
const Problematicas = lazyWithRetry(() => import('./pages/Problematicas'));
const Gastos = lazyWithRetry(() => import('./pages/Gastos'));
const Eventos = lazyWithRetry(() => import('./pages/Eventos'));
const Promesas = lazyWithRetry(() => import('./pages/Promesas'));
const Encuestas = lazyWithRetry(() => import('./pages/Encuestas'));
const MonitoreoRedes = lazyWithRetry(() => import('./pages/MonitoreoRedes'));
const Reportes = lazyWithRetry(() => import('./pages/Reportes'));
const Importar = lazyWithRetry(() => import('./pages/Importar'));
const Usuarios = lazyWithRetry(() => import('./pages/Usuarios'));
const Auditoria = lazyWithRetry(() => import('./pages/Auditoria'));
const AuditoriaCampo = lazyWithRetry(() => import('./pages/AuditoriaCampo'));
const AdminGeocode = lazyWithRetry(() => import('./pages/AdminGeocode'));

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#00D4FF', gap: '10px' }}>
    <OrionAnimatedLogo />
  </div>
);

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled && loading) {
        setBootError('El servidor tardó demasiado en responder. Verifica tu conexión.');
        setLoading(false);
      }
    }, 15000);

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (cancelled) return;
        if (error) throw error;
        setSession(data.session);
      } catch (err: any) {
        console.error('[App] getSession error:', err);
        if (!cancelled) setBootError('No se pudo conectar con el servidor.');
      } finally {
        if (!cancelled) {
          clearTimeout(timeout);
          setLoading(false);
        }
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setSession(session);
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0A1628' }}>
        <OrionAnimatedLogo />
        <p style={{ color: '#00D4FF', marginTop: '20px', fontWeight: 'bold', letterSpacing: '2px' }}>INICIANDO SISTEMA...</p>
      </div>
    );
  }

  if (bootError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0A1628', color: 'white', padding: '20px', textAlign: 'center' }}>
        <h1 style={{ color: '#F43F5E', marginBottom: '15px' }}>Error de inicio</h1>
        <p style={{ marginBottom: '25px', color: '#94A3B8', maxWidth: '400px' }}>{bootError}</p>
        <button onClick={() => window.location.reload()} style={{ background: '#00D4FF', color: '#0A1628', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <Sentry.ErrorBoundary fallback={
      <div style={{ padding: '50px', textAlign: 'center', background: '#0A1628', minHeight: '100vh', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <h1 style={{ color: '#F43F5E', fontSize: '28px', marginBottom: '10px' }}>Algo salió mal</h1>
        <p style={{ color: '#94A3B8', marginTop: '10px', maxWidth: '500px', marginBottom: '25px', lineHeight: '1.6' }}>
          Ocurrió un error inesperado. El equipo técnico ha sido notificado automáticamente.
        </p>
        <button onClick={() => window.location.reload()} style={{ padding: '14px 28px', background: '#00D4FF', color: '#0A1628', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
          Recargar Sistema
        </button>
      </div>
    }>
      <SyncProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/dossier" element={<DossierPage />} />
              <Route path="/login" element={!session ? <Login /> : <Navigate to="/app" replace />} />
              <Route path="/recuperar-password" element={!session ? <RecuperarPassword /> : <Navigate to="/app" replace />} />
              <Route path="/cambiar-password" element={<CambiarPassword />} />

              <Route path="/app" element={session ? <Layout /> : <Navigate to="/login" replace />}>
                <Route index element={<Dashboard />} />
                <Route path="analisis" element={<ProtectedRoute allowedRoles={['admin','coordinador','consulta']}><Analisis /></ProtectedRoute>} />
                <Route path="pronostico" element={<ProtectedRoute allowedRoles={['admin','coordinador','consulta']}><Pronostico /></ProtectedRoute>} />
                <Route path="centro-ia" element={<ProtectedRoute allowedRoles={['admin','coordinador','consulta']}><CentroInteligenciaElectoral /></ProtectedRoute>} />
                <Route path="municipio" element={<Municipio />} />
                <Route path="municipio/:barrioId" element={<BarrioDetalle />} />
                <Route path="personas" element={<ProtectedRoute allowedRoles={['admin','coordinador','brigadista']}><Personas /></ProtectedRoute>} />
                <Route path="secciones" element={<ProtectedRoute allowedRoles={['admin','coordinador']}><Secciones /></ProtectedRoute>} />
                <Route path="activismo" element={<ProtectedRoute allowedRoles={['admin','coordinador','brigadista']}><ActivismoGlobal /></ProtectedRoute>} />
                <Route path="electoral" element={<ElectoralGlobal />} />
                <Route path="problematicas" element={<ProtectedRoute allowedRoles={['admin','coordinador','brigadista']}><Problematicas /></ProtectedRoute>} />
                <Route path="gastos" element={<ProtectedRoute allowedRoles={['admin','coordinador']}><Gastos /></ProtectedRoute>} />
                <Route path="eventos" element={<ProtectedRoute allowedRoles={['admin','coordinador']}><Eventos /></ProtectedRoute>} />
                <Route path="promesas" element={<ProtectedRoute allowedRoles={['admin','coordinador']}><Promesas /></ProtectedRoute>} />
                <Route path="encuestas" element={<ProtectedRoute allowedRoles={['admin','coordinador','brigadista']}><Encuestas /></ProtectedRoute>} />
                <Route path="monitoreo-redes" element={<ProtectedRoute allowedRoles={['admin','coordinador']}><MonitoreoRedes /></ProtectedRoute>} />
                <Route path="reportes" element={<ProtectedRoute allowedRoles={['admin','coordinador','consulta']}><Reportes /></ProtectedRoute>} />
                <Route path="importar" element={<ProtectedRoute allowedRoles={['admin','coordinador']}><Importar /></ProtectedRoute>} />
                <Route path="usuarios" element={<ProtectedRoute allowedRoles={['admin']}><Usuarios /></ProtectedRoute>} />
                <Route path="auditoria" element={<ProtectedRoute allowedRoles={['admin']}><Auditoria /></ProtectedRoute>} />
                <Route path="auditoria-campo" element={<ProtectedRoute allowedRoles={['admin','coordinador']}><AuditoriaCampo /></ProtectedRoute>} />
                <Route path="admin-geocode" element={<ProtectedRoute allowedRoles={['admin']}><AdminGeocode /></ProtectedRoute>} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </SyncProvider>
    </Sentry.ErrorBoundary>
  );
}

export default App;
