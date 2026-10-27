import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';

import OrionAnimatedLogo from './components/OrionAnimatedLogo';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import DossierPage from './pages/DossierPage';
import Login from './pages/Login';
import RecuperarPassword from './pages/RecuperarPassword';
import CambiarPassword from './pages/CambiarPassword';
import Dashboard from './pages/Dashboard';
import Analisis from './pages/Analisis';
import Pronostico from './pages/Pronostico';
import CentroInteligenciaElectoral from './pages/CentroInteligenciaElectoral';
import Municipio from './pages/Municipio';
import BarrioDetalle from './pages/BarrioDetalle';
import Personas from './pages/Personas';
import Secciones from './pages/Secciones';
import ActivismoGlobal from './pages/ActivismoGlobal';
import ElectoralGlobal from './pages/ElectoralGlobal';
import Problematicas from './pages/Problematicas';
import Gastos from './pages/Gastos';
import Eventos from './pages/Eventos';
import Promesas from './pages/Promesas';
import Encuestas from './pages/Encuestas';
import MonitoreoRedes from './pages/MonitoreoRedes';
import Reportes from './pages/Reportes';
import Importar from './pages/Importar';
import Usuarios from './pages/Usuarios';
import Auditoria from './pages/Auditoria';
import AuditoriaCampo from './pages/AuditoriaCampo';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      
      // Retraso de 6 segundos para disfrutar la animación del logo
      setTimeout(() => {
        setLoading(false);
      }, 6000); 
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#0A1628'
      }}>
        <OrionAnimatedLogo />
        <p style={{ color: '#00D4FF', marginTop: '20px', fontWeight: 'bold', letterSpacing: '2px' }}>
          INICIANDO SISTEMA...
        </p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* RUTAS PÚBLICAS */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/dossier" element={<DossierPage />} />
        
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/app" replace />} />
        <Route path="/recuperar-password" element={!session ? <RecuperarPassword /> : <Navigate to="/app" replace />} />
        <Route path="/cambiar-password" element={<CambiarPassword />} />

        {/* RUTAS PROTEGIDAS */}
        <Route path="/app" element={session ? <Layout /> : <Navigate to="/login" replace />}>
          <Route index element={<Dashboard />} />
          <Route path="analisis" element={<Analisis />} />
          <Route path="pronostico" element={<Pronostico />} />
          <Route path="centro-ia" element={<CentroInteligenciaElectoral />} />
          <Route path="municipio" element={<Municipio />} />
          <Route path="municipio/:barrioId" element={<BarrioDetalle />} />
          <Route path="personas" element={<Personas />} />
          <Route path="secciones" element={<Secciones />} />
          <Route path="activismo" element={<ActivismoGlobal />} />
          <Route path="electoral" element={<ElectoralGlobal />} />
          <Route path="problematicas" element={<Problematicas />} />
          <Route path="gastos" element={<Gastos />} />
          <Route path="eventos" element={<Eventos />} />
          <Route path="promesas" element={<Promesas />} />
          <Route path="encuestas" element={<Encuestas />} />
          <Route path="monitoreo-redes" element={<MonitoreoRedes />} />
          <Route path="reportes" element={<Reportes />} />
          <Route path="importar" element={<Importar />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="auditoria" element={<Auditoria />} />
          <Route path="auditoria-campo" element={<AuditoriaCampo />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
