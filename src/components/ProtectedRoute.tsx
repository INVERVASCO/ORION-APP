// src/components/ProtectedRoute.tsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Loader2 } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  allowedRoles: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setLoading(false);
        return;
      }

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('rol, activo')
        .eq('id', session.user.id)
        .single();

      if (perfil && perfil.activo) {
        setRole(perfil.rol);
      }
      setLoading(false);
    };

    checkRole();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#00D4FF' }}>
        <Loader2 className="animate-spin" size={32} />
        <span style={{ marginLeft: '10px', fontWeight: 'bold' }}>Verificando permisos...</span>
      </div>
    );
  }

  if (!role || !allowedRoles.includes(role)) {
    // Si no tiene el rol, lo regresamos al dashboard
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
