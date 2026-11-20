import { forwardRef } from 'react';
import { ORION_CONFIG } from '../lib/config';

interface Props {
  tipo: 'bienvenida' | 'cumpleanos' | 'evento';
  persona: { id?: string; nombre_completo: string } | null;
  eventoData?: { nombre: string; fecha: string; hora: string | null; lugar: string | null } | null;
}

const TarjetaPremium = forwardRef<HTMLDivElement, Props>(({ tipo, persona, eventoData }, ref) => {
  if (!persona) return null;

  const nombreCompleto = persona.nombre_completo;
  const primerNombre = nombreCompleto.split(' ')[0];
  const colorPrimario = ORION_CONFIG.organizacionColorPrimario || '#00D4FF';

  // Limpiar guiones bajos si vienen en el nombre del evento
  const nombreEventoLimpio = eventoData?.nombre ? eventoData.nombre.replace(/_/g, ' ') : '';

  let fechaFormateada = '';
  if (eventoData?.fecha) {
    const [year, month, day] = eventoData.fecha.split('-');
    const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
    fechaFormateada = dateObj.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    fechaFormateada = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
  }

  const horaLimpia = eventoData?.hora ? eventoData.hora.substring(0, 5) : null;
  const folio = (persona.id ? persona.id.substring(0, 6) : 'VIP01').toUpperCase();

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, zIndex: -9999, opacity: 0, pointerEvents: 'none' }}>
      <div 
        ref={ref} 
        style={{ 
          width: '640px', 
          height: '920px', 
          background: 'linear-gradient(155deg, #070D18 0%, #0F1A2E 45%, #0A1322 100%)', 
          borderRadius: '28px', 
          padding: '42px 38px', 
          boxSizing: 'border-box',
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
          overflow: 'hidden', 
          position: 'relative',
          border: '2px solid rgba(0, 212, 255, 0.4)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), inset 0 0 40px rgba(0, 212, 255, 0.08)'
        }}
      >
        {/* Destellos de luz ambientales de fondo */}
        <div style={{ position: 'absolute', top: '-12%', right: '-15%', width: '420px', height: '420px', background: 'radial-gradient(circle, rgba(0, 212, 255, 0.22) 0%, transparent 68%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-15%', left: '-15%', width: '450px', height: '450px', background: 'radial-gradient(circle, rgba(245, 158, 11, 0.16) 0%, transparent 68%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '35%', left: '-20%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

        {/* Marca de agua / Líneas de seguridad */}
        <div style={{
          position: 'absolute', inset: '12px',
          border: '1px dashed rgba(255, 255, 255, 0.12)',
          borderRadius: '20px',
          pointerEvents: 'none'
        }} />

        {/* 1. CABECERA: Acreditación y Folio */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2, padding: '0 8px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(0, 212, 255, 0.12)', border: '1px solid rgba(0, 212, 255, 0.35)', padding: '6px 14px', borderRadius: '50px' }}>
            <span style={{ color: '#00D4FF', fontSize: '11px', fontWeight: '800', letterSpacing: '2px', textTransform: 'uppercase' }}>
              ⭐ {tipo === 'evento' ? 'PASE OFICIAL DE ACCESO' : tipo === 'bienvenida' ? 'ACREDITACIÓN CIUDADANA' : 'FELICITACIÓN ESPECIAL'}
            </span>
          </div>
          <span style={{ color: '#94A3B8', fontSize: '12px', fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: '1px' }}>
            FOLIO #{folio}
          </span>
        </div>

        {/* 2. LOGO INSTITUCIONAL EMBLEMÁTICO */}
        <div style={{ zIndex: 2, textAlign: 'center', marginTop: '4px' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.96)',
            padding: '12px 26px',
            borderRadius: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.45), 0 0 20px rgba(0, 212, 255, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.5)'
          }}>
            <img 
              src={ORION_CONFIG.organizacionLogo} 
              alt="Logo" 
              crossOrigin="anonymous" 
              style={{ height: '54px', maxWidth: '240px', objectFit: 'contain' }} 
            />
          </div>
        </div>

        {/* 3. CONTENIDO PRINCIPAL DINÁMICO */}
        <div style={{ width: '100%', textAlign: 'center', zIndex: 2 }}>
          {tipo === 'bienvenida' && (
            <div style={{ padding: '0 10px' }}>
              <p style={{ color: '#00D4FF', fontSize: '13px', fontWeight: 'bold', letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 10px 0' }}>
                RECONOCIMIENTO AL LIDERAZGO
              </p>
              <h1 style={{ color: '#FFFFFF', fontSize: '42px', fontWeight: '900', margin: '0 0 12px 0', lineHeight: '1.15', textShadow: '0 4px 15px rgba(0,0,0,0.6)' }}>
                ¡Bienvenido(a),<br /><span style={{ color: '#38BDF8' }}>{nombreCompleto}</span>!
              </h1>
              <p style={{ color: '#CBD5E1', fontSize: '19px', margin: '0 auto', maxWidth: '480px', lineHeight: '1.5' }}>
                Tu convicción y liderazgo son el verdadero motor de este movimiento. Juntos construimos el futuro que merece nuestra tierra.
              </p>
            </div>
          )}

          {tipo === 'cumpleanos' && (
            <div style={{ padding: '0 10px' }}>
              <div style={{ fontSize: '50px', marginBottom: '8px', filter: 'drop-shadow(0 4px 10px rgba(245,158,11,0.5))' }}>🎂</div>
              <p style={{ color: '#F59E0B', fontSize: '13px', fontWeight: 'bold', letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 8px 0' }}>
                NUESTROS MEJORES DESEOS
              </p>
              <h1 style={{ color: '#FFFFFF', fontSize: '40px', fontWeight: '900', margin: '0 0 12px 0', lineHeight: '1.15' }}>
                ¡Feliz Cumpleaños,<br /><span style={{ color: '#FCD34D' }}>{primerNombre}</span>!
              </h1>
              <p style={{ color: '#CBD5E1', fontSize: '18px', margin: '0 auto', maxWidth: '460px', lineHeight: '1.5' }}>
                Que este nuevo año de vida esté lleno de bendiciones, salud y grandes éxitos familiares y profesionales.
              </p>
            </div>
          )}

          {tipo === 'evento' && eventoData && (
            <div style={{
              background: 'rgba(15, 23, 42, 0.78)',
              border: '1px solid rgba(0, 212, 255, 0.35)',
              borderRadius: '22px',
              padding: '24px 20px',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            }}>
              <p style={{ color: '#00D4FF', fontSize: '12px', fontWeight: 'bold', letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 6px 0' }}>
                PASE DE INVITADO DE HONOR
              </p>
              <h2 style={{ color: '#FFFFFF', fontSize: '28px', fontWeight: '900', margin: '0 0 16px 0', lineHeight: '1.2' }}>
                {nombreEventoLimpio}
              </h2>
              
              <div style={{ 
                display: 'inline-block',
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '6px 18px',
                borderRadius: '8px',
                color: '#38BDF8',
                fontSize: '17px',
                fontWeight: 'bold',
                marginBottom: '16px',
                border: '1px solid rgba(56, 189, 248, 0.25)'
              }}>
                Extendida a: {nombreCompleto}
              </div>

              {/* Bloques de detalles del evento */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: horaLimpia ? '1fr 1fr' : '1fr', 
                gap: '12px', 
                background: 'rgba(0,0,0,0.3)',
                padding: '14px',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>📅 FECHA</div>
                  <div style={{ color: '#FFFFFF', fontSize: '15px', fontWeight: 'bold', marginTop: '3px' }}>{fechaFormateada}</div>
                </div>
                {horaLimpia && (
                  <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>🕒 HORARIO</div>
                    <div style={{ color: '#FFFFFF', fontSize: '15px', fontWeight: 'bold', marginTop: '3px' }}>{horaLimpia} hrs</div>
                  </div>
                )}
              </div>

              {eventoData.lugar && (
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#E2E8F0', fontSize: '14px' }}>
                  <span style={{ fontSize: '16px' }}>📍</span>
                  <strong>Sede:</strong> {eventoData.lugar}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. SECCIÓN HIGH-TECH: CÓDIGO QR VECTORIAL Y VALIDACIÓN */}
        <div style={{
          width: '100%',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '14px 20px',
          boxSizing: 'border-box'
        }}>
          {/* QR Code SVG nítido y libre de dependencias */}
          <div style={{ background: '#FFFFFF', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="64" height="64" viewBox="0 0 33 33" fill="#0A1628">
              {/* Esquinas / Ojos del QR */}
              <rect x="2" y="2" width="9" height="9" fill="#0A1628" rx="1.5" />
              <rect x="4" y="4" width="5" height="5" fill="#FFFFFF" rx="0.8" />
              <rect x="5.5" y="5.5" width="2" height="2" fill="#00D4FF" />

              <rect x="22" y="2" width="9" height="9" fill="#0A1628" rx="1.5" />
              <rect x="24" y="4" width="5" height="5" fill="#FFFFFF" rx="0.8" />
              <rect x="25.5" y="5.5" width="2" height="2" fill="#00D4FF" />

              <rect x="2" y="22" width="9" height="9" fill="#0A1628" rx="1.5" />
              <rect x="4" y="24" width="5" height="5" fill="#FFFFFF" rx="0.8" />
              <rect x="5.5" y="25.5" width="2" height="2" fill="#00D4FF" />

              {/* Matriz interior decorativa */}
              <rect x="13" y="3" width="2" height="4" />
              <rect x="17" y="5" width="3" height="2" />
              <rect x="14" y="9" width="4" height="2" />
              <rect x="3" y="13" width="4" height="2" />
              <rect x="9" y="14" width="2" height="5" />
              <rect x="13" y="13" width="7" height="7" fill="#00D4FF" rx="1" />
              <rect x="15" y="15" width="3" height="3" fill="#FFFFFF" />
              <rect x="23" y="13" width="3" height="3" />
              <rect x="28" y="15" width="3" height="2" />
              <rect x="13" y="22" width="3" height="4" />
              <rect x="18" y="24" width="4" height="3" />
              <rect x="24" y="24" width="6" height="2" />
              <rect x="26" y="28" width="4" height="3" />
            </svg>
          </div>

          <div style={{ flex: 1, marginLeft: '16px', textAlign: 'left' }}>
            <div style={{ color: '#00D4FF', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>
              ACCESO DIGITAL VERIFICADO
            </div>
            <div style={{ color: '#E2E8F0', fontSize: '13px', fontWeight: 'bold', marginTop: '2px' }}>
              Presentar este pase en la entrada
            </div>
            <div style={{ color: '#94A3B8', fontSize: '10px', marginTop: '2px' }}>
              Búnker Electoral • Seguridad Criptográfica
            </div>
          </div>
        </div>

        {/* 5. FOOTER: Lema y Sello */}
        <div style={{ width: '100%', textAlign: 'center', zIndex: 2 }}>
          <div style={{ color: '#E2E8F0', fontSize: '14px', fontWeight: '800', letterSpacing: '2px', textTransform: 'uppercase' }}>
            {tipo === 'evento' ? '¡TU PRESENCIA ES INDISPENSABLE!' : 'JUNTOS HACEMOS HISTORIA'}
          </div>
          <div style={{ color: '#64748B', fontSize: '11px', marginTop: '4px', letterSpacing: '1.5px' }}>
            {ORION_CONFIG.organizacionNombre.toUpperCase()} • CAMPAIGN INTELLIGENCE PLATFORM
          </div>
        </div>
      </div>
    </div>
  );
});

export default TarjetaPremium;
