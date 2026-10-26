import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Eye, EyeOff, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function CambiarPassword() {
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [sesionValida, setSesionValida] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const navigate = useNavigate();

  // Verificar que exista una sesión (Supabase la crea automáticamente desde el link)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSesionValida(true);
      }
      setVerificando(false);
    };
    checkSession();
  }, []);

  const handleCambiar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      setError('Error al cambiar la contraseña: ' + updateError.message);
      setLoading(false);
      return;
    }

    setExito(true);
    setLoading(false);

    // Cerrar sesión después de 3 segundos y redirigir al login
    setTimeout(async () => {
      await supabase.auth.signOut();
      navigate('/login', { replace: true });
    }, 3000);
  };

  if (verificando) {
    return (
      <div className="login-container">
        <div className="login-box" style={{ textAlign: 'center' }}>
          <Loader2 size={40} color="#9F2241" style={{ marginBottom: '15px' }} />
          <p style={{ color: '#666' }}>Verificando enlace...</p>
        </div>
      </div>
    );
  }

  if (!sesionValida) {
    return (
      <div className="login-container">
        <div className="login-box">
          <div style={{ 
            background: '#FFEBEE', 
            color: '#C62828',
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <AlertTriangle size={36} />
          </div>
          <h2 style={{ color: '#C62828', marginBottom: '15px', fontSize: '20px' }}>
            Enlace Inválido o Expirado
          </h2>
          <p style={{ color: '#555', fontSize: '14px', marginBottom: '25px', lineHeight: '1.5' }}>
            El enlace de recuperación ha expirado o ya fue usado. Por favor solicita uno nuevo.
          </p>
          <button 
            onClick={() => navigate('/recuperar-password')}
            className="btn-primary"
            style={{ width: '100%' }}
          >
            Solicitar nuevo enlace
          </button>
        </div>
      </div>
    );
  }

  if (exito) {
    return (
      <div className="login-container">
        <div className="login-box">
          <div style={{ 
            background: '#2E7D32', 
            color: 'white',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <CheckCircle2 size={44} />
          </div>
          <h2 style={{ color: '#2E7D32', marginBottom: '15px', fontSize: '20px' }}>
            ¡Contraseña Actualizada!
          </h2>
          <p style={{ color: '#555', fontSize: '14px', marginBottom: '15px', lineHeight: '1.5' }}>
            Tu contraseña se cambió correctamente.
          </p>
          <p style={{ color: '#666', fontSize: '13px', fontStyle: 'italic' }}>
            Redirigiendo al inicio de sesión...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-box">
       
        
        <div style={{ 
          background: '#9F2241', 
          color: 'white',
          width: '70px',
          height: '70px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <KeyRound size={36} />
        </div>

        <h2 style={{ color: '#9F2241', marginBottom: '10px', fontSize: '20px' }}>
          Nueva Contraseña
        </h2>
        <p style={{ color: '#666', fontSize: '13px', marginBottom: '25px', lineHeight: '1.5' }}>
          Ingresa tu nueva contraseña. Debe tener al menos 6 caracteres.
        </p>

        {error && (
          <div style={{ 
            color: '#C62828', 
            marginBottom: '15px', 
            fontSize: '13px',
            padding: '10px 12px',
            background: '#FFEBEE',
            borderRadius: '6px',
            borderLeft: '3px solid #C62828',
            textAlign: 'left'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleCambiar}>
          <div style={{ position: 'relative', marginBottom: '15px' }}>
            <input 
              type={mostrarPassword ? 'text' : 'password'}
              placeholder="Nueva contraseña" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              minLength={6}
              style={{ 
                width: '100%', 
                padding: '12px 45px 12px 12px', 
                borderRadius: '6px', 
                border: '1px solid #E0E0E0', 
                fontSize: '16px',
                boxSizing: 'border-box',
                marginBottom: 0
              }}
            />
            <button
              type="button"
              onClick={() => setMostrarPassword(!mostrarPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                color: '#666',
              }}
            >
              {mostrarPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <input 
            type={mostrarPassword ? 'text' : 'password'}
            placeholder="Confirmar contraseña" 
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            required 
            minLength={6}
            autoComplete="new-password"
          />

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} 
            disabled={loading}
          >
            {loading ? <><Loader2 size={18} /> Guardando...</> : 'Cambiar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}