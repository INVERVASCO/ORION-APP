import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function RecuperarPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const handleRecuperar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // URL a la que Supabase redigirá al usuario desde el correo
    const redirectTo = `${window.location.origin}/cambiar-password`;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo }
    );

    if (resetError) {
      setError('Error al enviar el correo: ' + resetError.message);
      setLoading(false);
      return;
    }

    setEnviado(true);
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-box">
      
        
        {!enviado ? (
          <>
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
              <Mail size={36} />
            </div>
            <h2 style={{ color: '#9F2241', marginBottom: '10px', fontSize: '20px' }}>
              Recuperar Contraseña
            </h2>
            <p style={{ color: '#666', fontSize: '13px', marginBottom: '25px', lineHeight: '1.5' }}>
              Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
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

            <form onSubmit={handleRecuperar}>
              <input 
                type="email" 
                placeholder="Correo electrónico" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required 
              />

              <button 
                type="submit" 
                className="btn-primary" 
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }} 
                disabled={loading}
              >
                {loading ? <><Loader2 size={18} /> Enviando...</> : 'Enviar enlace de recuperación'}
              </button>
            </form>

            <Link 
              to="/login"
              style={{ 
                color: '#9F2241', 
                fontSize: '13px', 
                textDecoration: 'none',
                fontWeight: 'bold',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <ArrowLeft size={14} /> Volver al inicio de sesión
            </Link>
          </>
        ) : (
          <>
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
              ¡Correo Enviado!
            </h2>
            <p style={{ color: '#555', fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' }}>
              Enviamos un enlace de recuperación a:<br />
              <strong style={{ color: '#9F2241', wordBreak: 'break-word' }}>{email}</strong>
            </p>
            <p style={{ color: '#666', fontSize: '13px', marginBottom: '25px', lineHeight: '1.5', padding: '12px', background: '#FFF8E1', borderRadius: '6px', borderLeft: '3px solid #F9A825' }}>
              <strong>Importante:</strong> Revisa tu bandeja de entrada y también la carpeta de <strong>SPAM</strong> o correo no deseado. El enlace expira en 1 hora.
            </p>

            <Link 
              to="/login"
              style={{ 
                color: '#9F2241', 
                fontSize: '14px', 
                textDecoration: 'none',
                fontWeight: 'bold',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <ArrowLeft size={14} /> Volver al inicio de sesión
            </Link>
          </>
        )}
      </div>
    </div>
  );
}