import { useState, useEffect } from 'react';
import { Gift, PartyPopper, Mail, X, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface Props {
  visible: boolean;
  onClose: () => void;
  persona: { id: string; nombre_completo: string; telefono: string | null } | null;
  onGenerarTarjeta: (tipo: string, eventoData?: any) => void;
}

export default function TarjetaSelector({ visible, onClose, persona, onGenerarTarjeta }: Props) {
  const [tipo, setTipo] = useState<'bienvenida' | 'cumpleanos' | 'evento'>('bienvenida');
  const [eventos, setEventos] = useState<any[]>([]);
  const [eventoSeleccionado, setEventoSeleccionado] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (visible && tipo === 'evento' && eventos.length === 0) {
      // Cargar eventos próximos
      supabase.from('eventos').select('id, nombre, fecha, lugar, hora')
        .gte('fecha', new Date().toISOString().split('T')[0])
        .order('fecha', { ascending: true })
        .then(({ data }) => {
          if (data) setEventos(data);
        });
    }
  }, [visible, tipo, eventos.length]);

  if (!visible || !persona) return null;

  const handleEnviar = async () => {
    if (tipo === 'evento' && !eventoSeleccionado) {
      alert('Por favor, selecciona un evento de la lista.');
      return;
    }

    setGuardando(true);

    // 1. Obtener el usuario actual
    const { data: { user } } = await supabase.auth.getUser();

    // 2. Registrar en la base de datos para el semáforo
    const { error } = await supabase.from('comunicaciones_enviadas').insert([{
      persona_id: persona.id,
      tipo_tarjeta: tipo,
      evento_id: tipo === 'evento' ? eventoSeleccionado : null,
      enviado_por: user?.id
    }]);

    if (error) {
      alert('Error al registrar la comunicación: ' + error.message);
      setGuardando(false);
      return;
    }

    // 3. Pasar los datos al componente padre para generar la imagen
    const eventoData = tipo === 'evento' ? eventos.find(e => e.id === eventoSeleccionado) : null;
    onGenerarTarjeta(tipo, eventoData);
    
    setGuardando(false);
    onClose();
  };

  const opciones = [
    { id: 'bienvenida', icon: <Mail size={24} />, titulo: 'Bienvenida', desc: 'Agradece por sumarse al movimiento.' },
    { id: 'cumpleanos', icon: <PartyPopper size={24} />, titulo: 'Cumpleaños', desc: 'Felicita al ciudadano en su día.' },
    { id: 'evento', icon: <Gift size={24} />, titulo: 'Invitación', desc: 'Invita a un mitin o reunión.' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 4000, padding: '15px' }}>
      <div style={{ background: 'white', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#0F172A', fontSize: '20px' }}>Enviar Tarjeta</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}>Para: <strong>{persona.nombre_completo}</strong></p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#64748B" /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {opciones.map((opt) => (
            <div 
              key={opt.id}
              onClick={() => setTipo(opt.id as any)}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', 
                borderRadius: '8px', cursor: 'pointer', border: `2px solid ${tipo === opt.id ? '#00D4FF' : '#E2E8F0'}`,
                background: tipo === opt.id ? 'rgba(0, 212, 255, 0.05)' : 'white',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ color: tipo === opt.id ? '#00D4FF' : '#64748B' }}>{opt.icon}</div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#0F172A' }}>{opt.titulo}</div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>{opt.desc}</div>
              </div>
              {tipo === opt.id && <CheckCircle2 size={20} color="#00D4FF" style={{ marginLeft: 'auto' }} />}
            </div>
          ))}
        </div>

        {tipo === 'evento' && (
          <div style={{ marginBottom: '20px', background: '#F8FAFC', padding: '15px', borderRadius: '8px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#0F172A', marginBottom: '8px' }}>Selecciona el evento:</label>
            {eventos.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>No hay eventos próximos registrados.</p>
            ) : (
              <select 
                value={eventoSeleccionado} 
                onChange={(e) => setEventoSeleccionado(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px' }}
              >
                <option value="">-- Selecciona un evento --</option>
                {eventos.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.fecha} - {ev.nombre}</option>
                ))}
              </select>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', background: '#F1F5F9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#64748B' }}>
            Cancelar
          </button>
          <button 
            onClick={handleEnviar} 
            disabled={guardando || (tipo === 'evento' && !eventoSeleccionado)}
            style={{ flex: 2, padding: '12px', background: '#00D4FF', color: '#0A1628', border: 'none', borderRadius: '8px', cursor: (guardando || (tipo === 'evento' && !eventoSeleccionado)) ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: (guardando || (tipo === 'evento' && !eventoSeleccionado)) ? 0.5 : 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
          >
            {guardando ? <><Loader2 size={16} className="animate-spin" /> Registrando...</> : 'Generar y Enviar por WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  );
}
