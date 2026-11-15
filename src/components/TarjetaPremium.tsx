import { forwardRef } from 'react';
import { ORION_CONFIG } from '../lib/config';

interface Props {
  tipo: 'bienvenida' | 'cumpleanos' | 'evento';
  persona: { nombre_completo: string } | null;
  eventoData?: { nombre: string; fecha: string; hora: string | null; lugar: string | null } | null;
}

const TarjetaPremium = forwardRef<HTMLDivElement, Props>(({ tipo, persona, eventoData }, ref) => {
  if (!persona) return null;

  const nombre = persona.nombre_completo.split(' ')[0]; 
  const colorPrimario = ORION_CONFIG.organizacionColorPrimario || '#00D4FF';

  let fechaFormateada = '';
  if (eventoData?.fecha) {
    const [year, month, day] = eventoData.fecha.split('-');
    const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
    fechaFormateada = dateObj.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    fechaFormateada = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
  }

  return (
    // 🚀 FIX: Lo ocultamos con opacity y z-index, pero lo dejamos en el DOM para que html2canvas lo vea
    <div style={{ position: 'fixed', top: 0, left: 0, zIndex: -9999, opacity: 0, pointerEvents: 'none' }}>
      <div 
        ref={ref} 
        style={{ 
          width: '600px', height: '800px', 
          background: 'linear-gradient(135deg, #0A1628 0%, #111827 100%)', 
          borderRadius: '24px', padding: '40px', boxSizing: 'border-box',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
          fontFamily: 'system-ui, -apple-system, sans-serif', overflow: 'hidden', position: 'relative'
        }}
      >
        <div style={{ position: 'absolute', top: '-10%', right: '-20%', width: '400px', height: '400px', background: `radial-gradient(circle, ${colorPrimario}33 0%, transparent 70%)`, borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-20%', width: '400px', height: '400px', background: `radial-gradient(circle, #F59E0B33 0%, transparent 70%)`, borderRadius: '50%' }} />

        <div style={{ textAlign: 'center', zIndex: 1 }}>
          {/* 🚀 FIX: crossOrigin para evitar el error de CORS */}
          <img src={ORION_CONFIG.organizacionLogo} alt="Logo" crossOrigin="anonymous" style={{ height: '80px', objectFit: 'contain' }} />
        </div>

        <div style={{ textAlign: 'center', zIndex: 1, width: '100%' }}>
          {tipo === 'bienvenida' && (
            <>
              <h1 style={{ color: 'white', fontSize: '46px', fontWeight: '900', margin: '0 0 15px 0', lineHeight: '1.1' }}>¡Bienvenido,<br/>{nombre}!</h1>
              <p style={{ color: '#94A3B8', fontSize: '22px', margin: 0, lineHeight: '1.5' }}>Tu voz es el motor de este cambio.<br/>Gracias por sumarte al movimiento.</p>
            </>
          )}

          {tipo === 'cumpleanos' && (
            <>
              <div style={{ fontSize: '60px', marginBottom: '10px' }}>🎉</div>
              <h1 style={{ color: 'white', fontSize: '46px', fontWeight: '900', margin: '0 0 15px 0', lineHeight: '1.1' }}>¡Feliz Cumpleaños,<br/>{nombre}!</h1>
              <p style={{ color: '#94A3B8', fontSize: '22px', margin: 0, lineHeight: '1.5' }}>Que este nuevo año esté lleno de éxitos,<br/>salud y grandes momentos.</p>
            </>
          )}

          {tipo === 'evento' && eventoData && (
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '30px', backdropFilter: 'blur(10px)' }}>
              <p style={{ color: colorPrimario, fontSize: '16px', fontWeight: 'bold', letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 10px 0' }}>Invitación Especial</p>
              <h1 style={{ color: 'white', fontSize: '36px', fontWeight: '900', margin: '0 0 20px 0', lineHeight: '1.2' }}>{eventoData.nombre}</h1>
              
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', marginTop: '20px' }}>
                <p style={{ color: '#CBD5E1', fontSize: '18px', margin: '0 0 10px 0' }}>📅 {fechaFormateada}</p>
                {eventoData.hora && <p style={{ color: '#CBD5E1', fontSize: '18px', margin: '0 0 10px 0' }}>🕒 {eventoData.hora} hrs</p>}
                {eventoData.lugar && <p style={{ color: '#CBD5E1', fontSize: '18px', margin: 0 }}>📍 {eventoData.lugar}</p>}
              </div>
            </div>
          )}
        </div>

        <div style={{ zIndex: 1, textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', padding: '10px 20px', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.2)' }}>
            <p style={{ color: 'white', fontSize: '16px', fontWeight: 'bold', margin: 0 }}>
              {tipo === 'evento' ? '¡Te esperamos!' : 'Juntos hacemos la diferencia'}
            </p>
          </div>
          <p style={{ color: '#64748B', fontSize: '14px', marginTop: '15px', letterSpacing: '1px' }}>{ORION_CONFIG.organizacionNombre.toUpperCase()}</p>
        </div>
      </div>
    </div>
  );
});

export default TarjetaPremium;
