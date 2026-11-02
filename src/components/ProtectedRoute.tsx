import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Loader2 } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  allowedRoles: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const [role, setRole] = useState<string | null>(null);
  const [activo, setActivo] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    const checkRole = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          if (!cancelled) { setRole(null); setLoading(false); }
          return;
        }

        const { data: perfil, error: perfilError } = await supabase
          .from('perfiles')
          .select('rol, activo')
          .eq('id', session.user.id)
          .maybeSingle();

        if (perfilError || !perfil) {
          if (!cancelled) { setRole(null); setLoading(false); }
          return;
        }

        if (!cancelled) {
          setRole(perfil.rol);
          setActivo(perfil.activo);
          setLoading(false);
        }
      } catch (err) {
        console.error('[ProtectedRoute]', err);
        if (!cancelled) { setRole(null); setLoading(false); }
      }
    };

    checkRole();
    return () => { cancelled = true; };
  }, [location.pathname]);

  if (loading) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '60vh', color: '#00D4FF', gap: '10px',
      }}>
        <Loader2 className="animate-spin" size={32} />
        <span style={{ fontWeight: 'bold' }}>Verificando permisos...</span>
      </div>
    );
  }

  if (!role) return <Navigate to="/login" replace />;
  if (activo === false) return <Navigate to="/login?motivo=inactivo" replace />;
  if (!allowedRoles.includes(role)) return <Navigate to="/app" replace />;

  return <>{children}</>;
}
