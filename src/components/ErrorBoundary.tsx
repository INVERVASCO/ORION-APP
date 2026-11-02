import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: '#0A1628', padding: '20px',
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', padding: '40px',
            maxWidth: '500px', width: '100%', textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          }}>
            <AlertTriangle size={64} color="#F43F5E" style={{ margin: '0 auto 20px' }} />
            <h1 style={{ color: '#0A1628', marginBottom: '15px', fontSize: '22px' }}>
              Algo salió mal
            </h1>
            <p style={{ color: '#64748B', marginBottom: '25px', fontSize: '14px', lineHeight: '1.6' }}>
              Ocurrió un error inesperado. Por favor recarga la página.
              Si el problema persiste, contacta a soporte.
            </p>
            {this.state.error && (
              <details style={{ textAlign: 'left', marginBottom: '20px', fontSize: '12px', color: '#94A3B8' }}>
                <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>Ver detalle técnico</summary>
                <pre style={{
                  background: '#F1F5F9', padding: '10px', borderRadius: '6px',
                  overflow: 'auto', fontSize: '11px', color: '#475569',
                }}>
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              style={{
                background: '#00D4FF', color: '#0A1628', border: 'none',
                padding: '12px 24px', borderRadius: '8px', cursor: 'pointer',
                fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '8px',
              }}
            >
              <RefreshCw size={16} /> Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
