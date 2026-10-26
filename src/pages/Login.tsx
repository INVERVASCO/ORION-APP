import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import AvisoPrivacidad from '../components/AvisoPrivacidad';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avisoVisible, setAvisoVisible] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('Correo o contraseña incorrectos. Verifica ambos campos.');
        } else if (authError.message.includes('Email not confirmed')) {
          setError('El correo no está confirmado. Contacta al administrador.');
        } else {
          setError(authError.message);
        }
        setLoading(false);
        return;
      }

      if (data.session) {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setError('Error inesperado: ' + (err.message || 'Intenta de nuevo'));
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        
        {/* LOGO DE ORION */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '20px',
          paddingBottom: '15px',
          borderBottom: '1px solid #E2E8F0'
        }}>
          <img 
            src="https://i.ibb.co/qLGmzCyZ/orion-logo-png.png" 
            alt="ORION" 
            style={{ width: '100%', maxWidth: '220px', height: 'auto' }}
          />
        </div>

        <h2 style={{ 
          color: '#0A1628', // Navy en lugar del verde viejo
          marginBottom: '20px',
          fontSize: '22px',
          fontWeight: '800'
        }}>
          Acceso al Sistema
        </h2>
        
        {error && (
          <div style={{ 
            color: '#F43F5E', // Rojo Rose
            marginBottom: '15px', 
            fontSize: '14px',
            padding: '10px 12px',
            background: '#FFE4E6', // Fondo Rose claro
            borderRadius: '6px',
            borderLeft: '3px solid #F43F5E',
            textAlign: 'left'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <input 
            type="email" 
            placeholder="Correo electrónico" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required 
          />
          
          <div style={{ position: 'relative', marginBottom: '10px' }}>
            <input 
              type={mostrarPassword ? 'text' : 'password'}
              placeholder="Contraseña" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required 
              style={{ 
                width: '100%', 
                padding: '12px 45px 12px 12px', 
                borderRadius: '8px', 
                border: '1px solid #E2E8F0', 
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
                color: '#64748B',
              }}
            >
              {mostrarPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div style={{ textAlign: 'right', marginBottom: '20px' }}>
            <Link 
              to="/recuperar-password"
              style={{ 
                color: '#00D4FF', // Cyan
                fontSize: '13px', 
                textDecoration: 'none',
                fontWeight: 'bold'
              }}
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px' 
            }} 
            disabled={loading}
          >
            {loading ? <><Loader2 size={18} /> Ingresando...</> : 'Ingresar'}
          </button>
        </form>

        <div style={{ 
          textAlign: 'center', 
          marginTop: '20px', 
          fontSize: '11px', 
          color: '#64748B',
          lineHeight: '1.5'
        }}>
          Al ingresar, aceptas nuestro{' '}
          <button 
            type="button"
            onClick={() => setAvisoVisible(true)}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#00D4FF', 
              cursor: 'pointer', 
              textDecoration: 'underline', 
              fontSize: '11px', 
              fontWeight: 'bold', 
              padding: 0
            }}
          >
            Aviso de Privacidad
          </button>
        </div>
      </div>

      <AvisoPrivacidad 
        visible={avisoVisible} 
        onClose={() => setAvisoVisible(false)} 
      />
    </div>
  );
}