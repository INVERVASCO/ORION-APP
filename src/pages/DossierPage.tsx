import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, ShieldCheck, Brain, Target, Zap, MapPin, CheckCircle2 } from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';

export default function DossierPage() {
  const navigate = useNavigate();

  const descargarPDF = () => {
    const element = document.getElementById('dossier-pdf');
    if (!element) return;

    html2pdf().set({
      margin: 0,
      filename: 'Dossier_ORION_Campaign_Intelligence.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    }).from(element).save();
  };

  return (
    <div style={{ backgroundColor: '#0A1628', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Botones de navegación (No se imprimen en PDF) */}
      <div className="no-print" style={{ position: 'fixed', top: '20px', left: '20px', right: '20px', display: 'flex', justifyContent: 'space-between', zIndex: 1000 }}>
        <button onClick={() => navigate('/')} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', backdropFilter: 'blur(5px)' }}>
          <ArrowLeft size={18} /> Volver a la Web
        </button>
        <button onClick={descargarPDF} style={{ background: '#00D4FF', color: '#0A1628', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', boxShadow: '0 0 20px rgba(0, 212, 255, 0.4)' }}>
          <Download size={18} /> Descargar PDF
        </button>
      </div>

      {/* CONTENEDOR DEL PDF */}
      <div id="dossier-pdf" style={{ backgroundColor: '#F8FAFC', maxWidth: '850px', margin: '0 auto', boxShadow: '0 0 50px rgba(0,0,0,0.5)' }}>
        
        {/* ================= PORTADA ================= */}
        <div style={{ backgroundColor: '#0A1628', color: 'white', padding: '80px 60px', height: '1120px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', pageBreakAfter: 'always', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(0,212,255,0.2) 0%, transparent 70%)' }}></div>
          
          <img src="https://i.ibb.co/qLGmzCyZ/orion-logo-png.png" alt="ORION" style={{ width: '200px', marginBottom: '40px', filter: 'brightness(0) invert(1)' }} />
          
          <h1 style={{ fontSize: '56px', fontWeight: '900', lineHeight: '1.1', marginBottom: '20px', color: '#F9FAFB' }}>
            No es un software.<br/>
            <span style={{ color: '#00D4FF' }}>Es tu Director de Campaña con IA.</span>
          </h1>
          
          <p style={{ fontSize: '22px', color: '#9CA3AF', marginBottom: '60px', maxWidth: '600px', lineHeight: '1.5' }}>
            El primer Centro Neuronal diseñado para erradicar la simulación en el campo, optimizar tu presupuesto y asegurar tu victoria electoral.
          </p>
          
          <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', color: '#64748B', fontSize: '14px' }}>
            <span>Dossier Maestro de Operación y Estrategia</span>
            <span>Ciclo Electoral 2026-2027</span>
          </div>
        </div>

        {/* ================= PÁGINA 2: EL PROBLEMA ================= */}
        <div style={{ backgroundColor: 'white', padding: '60px', height: '1120px', pageBreakAfter: 'always' }}>
          <h2 style={{ fontSize: '32px', color: '#0F172A', fontWeight: '900', marginBottom: '40px', borderBottom: '4px solid #F43F5E', paddingBottom: '10px', display: 'inline-block' }}>
            El Mayor Secreto de las Campañas
          </h2>
          
          <p style={{ fontSize: '18px', color: '#334155', lineHeight: '1.8', marginBottom: '30px' }}>
            En cada proceso electoral se pierde una fortuna en brigadistas y operadores que <strong>simulan trabajar</strong>. Reportan miles de simpatizantes en hojas de Excel o encuestas inventadas desde la comodidad de sus casas.
          </p>
          
          <div style={{ background: '#FFE4E6', padding: '30px', borderRadius: '12px', borderLeft: '6px solid #F43F5E', marginBottom: '40px' }}>
            <h3 style={{ fontSize: '20px', color: '#9F1239', marginBottom: '15px', marginTop: 0 }}>El resultado es catastrófico:</h3>
            <ul style={{ fontSize: '16px', color: '#881337', lineHeight: '1.8', margin: 0, paddingLeft: '20px' }}>
              <li>El día de la elección te llevas sorpresas porque tus "datos" no eran reales.</li>
              <li>El dinero y los esfuerzos se diluyen en zonas donde ya tenías ganado o donde era imposible ganar.</li>
              <li>Descubres muy tarde que descuidaste las secciones clave que definirían tu triunfo.</li>
            </ul>
          </div>

          <h2 style={{ fontSize: '32px', color: '#0F172A', fontWeight: '900', marginBottom: '30px', borderBottom: '4px solid #10B981', paddingBottom: '10px', display: 'inline-block' }}>
            La Solución: ORION
          </h2>
          <p style={{ fontSize: '18px', color: '#334155', lineHeight: '1.8' }}>
            ORION unifica la información histórica del INE con el trabajo de campo de tu equipo en tiempo real. Cruza los datos automáticamente, te da un pronóstico real y te dice exactamente dónde enfocar tus recursos hoy.
          </p>
        </div>

        {/* ================= PÁGINA 3: PILARES 1 y 2 (CON CAPTURAS) ================= */}
        <div style={{ backgroundColor: 'white', padding: '60px', height: '1120px', pageBreakAfter: 'always' }}>
          <h2 style={{ fontSize: '28px', color: '#0F172A', fontWeight: '900', marginBottom: '40px', textAlign: 'center' }}>
            Los Pilares de tu Victoria
          </h2>

          {/* Pilar 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '50px', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <ShieldCheck size={28} color="#00D4FF" />
                <h3 style={{ fontSize: '22px', color: '#0A1628', margin: 0 }}>Auditoría GPS Antifraude</h3>
              </div>
              <p style={{ fontSize: '15px', color: '#475569', lineHeight: '1.6' }}>
                El sistema captura la ubicación exacta del dispositivo al hacer una encuesta. Si el brigadista está a más de 2 km de su zona, se enciende una alerta roja y se genera un reporte de fraude.
              </p>
            </div>
            {/* CAPTURA DEL MAPA */}
            <div style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', border: '1px solid #E2E8F0' }}>
               <img src="https://i.ibb.co/3s6Z8Q5/mapa.png" alt="Mapa GPS" style={{ width: '100%', display: 'block' }} />
               <div style={{ padding: '10px', background: '#F8FAFC', fontSize: '12px', color: '#64748B', textAlign: 'center' }}>Auditoría GPS en Tiempo Real</div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '40px 0' }} />

          {/* Pilar 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', alignItems: 'center' }}>
            {/* CAPTURA DEL CHAT IA */}
            <div style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', border: '1px solid #E2E8F0' }}>
               <img src="https://i.ibb.co/6PZqX9t/ia.png" alt="Chat IA" style={{ width: '100%', display: 'block' }} />
               <div style={{ padding: '10px', background: '#F8FAFC', fontSize: '12px', color: '#64748B', textAlign: 'center' }}>Asistente Estratégico AURA</div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <Brain size={28} color="#F59E0B" />
                <h3 style={{ fontSize: '22px', color: '#0A1628', margin: 0 }}>Centro Táctico AURA</h3>
              </div>
              <p style={{ fontSize: '15px', color: '#475569', lineHeight: '1.6' }}>
                Un chat privado con IA. No tienes que revisar gráficas complejas. Pregúntale: <em>"¿En qué colonias debo enfocarme hoy?"</em> y en segundos te dará recomendaciones de acciones inmediatas.
              </p>
            </div>
          </div>
        </div>

        {/* ================= PÁGINA 4: CIERRE Y CONTACTO ================= */}
        <div style={{ backgroundColor: '#0A1628', color: 'white', padding: '80px 60px', height: '1120px', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
          <h2 style={{ fontSize: '42px', fontWeight: '900', marginBottom: '20px', color: '#F9FAFB' }}>
            ¿Estás listo para <span style={{ color: '#00D4FF' }}>ganar</span>?
          </h2>
          <p style={{ fontSize: '20px', color: '#9CA3AF', marginBottom: '50px', maxWidth: '600px', margin: '0 auto 50px auto', lineHeight: '1.6' }}>
            Mientras otros operan con Excel y WhatsApp, tú puedes tener un Centro Neuronal con Inteligencia Artificial que trabaja 24/7.
          </p>

          <div style={{ background: 'rgba(0, 212, 255, 0.05)', border: '1px solid rgba(0, 212, 255, 0.2)', borderRadius: '16px', padding: '40px', maxWidth: '500px', margin: '0 auto' }}>
            <h3 style={{ fontSize: '24px', color: '#00D4FF', marginBottom: '20px', marginTop: 0 }}>Solicita tu Demo Privada</h3>
            <p style={{ fontSize: '16px', color: '#E2E8F0', marginBottom: '30px' }}>
              Agenda una presentación con datos reales de tu región o accede a nuestro entorno de pruebas.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <a href="https://orion-electoral.com" style={{ background: '#00D4FF', color: '#0A1628', padding: '15px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '18px' }}>
                Probar el Sistema en Vivo
              </a>
              <a href="https://wa.me/tu-numero" style={{ background: 'transparent', color: '#F59E0B', border: '2px solid #F59E0B', padding: '13px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '18px' }}>
                Contactar por WhatsApp
              </a>
            </div>
          </div>

          <p style={{ marginTop: '60px', color: '#64748B', fontSize: '14px' }}>
            ORION · Campaign Intelligence<br/>
            "La información está en todas partes. La inteligencia no."
          </p>
        </div>

      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background-color: white !important; }
          #dossier-pdf { box-shadow: none !important; max-width: 100% !important; }
        }
      `}</style>
    </div>
  );
}
