// @ts-nocheck
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'; // <-- Importamos ArrowLeft
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
        navigate('/app', { replace: true });
      }
    } catch (err: any) {
      setError('Error inesperado: ' + (err.message || 'Intenta de nuevo'));
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{ position: 'relative' }}>
      
      {/* 👇 ESTE ES EL BOTÓN QUE TE REGRESA A LA PÁGINA WEB 👇 */}
      <button 
        onClick={() => navigate('/')}
        style={{
          position: 'absolute',
          top: '30px',
          left: '30px',
          background: 'rgba(255, 255, 255, 0.1)',
          color: 'white',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          padding: '10px 20px',
          borderRadius: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 'bold',
          fontSize: '14px',
          backdropFilter: 'blur(10px)',
          zIndex: 100,
          transition: 'all 0.3s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
      >
        <ArrowLeft size={18} /> Volver a la Web
      </button>
      {/* 👆 FIN DEL BOTÓN 👆 */}

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
          color: '#0A1628', 
          marginBottom: '20px',
          fontSize: '22px',
          fontWeight: '800'
        }}>
          Acceso al Sistema
        </h2>
        
        {error && (
          <div style={{ 
            color: '#F43F5E', 
            marginBottom: '15px', 
            fontSize: '14px',
            padding: '10px 12px',
            background: '#FFE4E6',
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
                color: '#00D4FF', 
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
