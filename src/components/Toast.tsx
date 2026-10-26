import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  mensaje: string;
  visible: boolean;
  onClose: () => void;
}

export default function Toast({ mensaje, visible, onClose }: Props) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => onClose(), 3000);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'white',
      padding: '16px 24px',
      borderRadius: '10px',
      boxShadow: '0 8px 25px rgba(0,0,0,0.25)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      zIndex: 2000,
      borderLeft: '5px solid #2E7D32',
      maxWidth: '90%',
      animation: 'slideDown 0.3s ease'
    }}>
      <CheckCircle2 size={24} color="#2E7D32" />
      <div>
        <p style={{ margin: 0, fontWeight: 'bold', color: '#333', fontSize: '14px' }}>
          {mensaje}
        </p>
      </div>
      <button onClick={onClose} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: '#999', fontSize: '18px', padding: '0 5px'
      }}>
        ×
      </button>
    </div>
  );
}