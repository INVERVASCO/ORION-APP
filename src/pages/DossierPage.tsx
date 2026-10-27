import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, ShieldCheck, Brain, Target, TrendingUp, AlertTriangle, Users, Zap } from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';

export default function DossierPage() {
  const navigate = useNavigate();

  const descargarPDF = () => {
    const element = document.getElementById('dossier-pdf');
    if (!element) return;

    const opt = {
      margin: 0,
      filename: 'Dossier_Estrategico_ORION.pdf',
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { scale: 3, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(element).save();
  };

  // Estilos reutilizables para las páginas
  const pageStyle: React.CSSProperties = {
    width: '210mm',
    height: '297mm',
    position: 'relative',
    overflow: 'hidden',
    pageBreakAfter: 'always',
    backgroundColor: '#0A1628',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '60px',
    boxSizing: 'border-box',
    color: 'white'
  };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(10, 22, 40, 0.75)', // Capa oscura para legibilidad
    zIndex: 1
  };

  const contentStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 2,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  };

  const glassBox: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '40px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '48px',
    fontWeight: '900',
    lineHeight: '1.1',
    marginBottom: '20px',
    textShadow: '0 4px 20px rgba(0,0,0,0.5)'
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '20px',
    color: '#E2E8F0',
    lineHeight: '1.6',
    maxWidth: '600px'
  };

  return (
    <div style={{ backgroundColor: '#050A14', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      
      {/* BOTONES FLOTANTES */}
      <div className="no-print" style={{ position: 'fixed', top: '20px', left: '20px', right: '20px', display: 'flex', justifyContent: 'space-between', zIndex: 1000 }}>
        <button onClick={() => navigate('/')} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', backdropFilter: 'blur(10px)' }}>
          <ArrowLeft size={18} /> Volver
        </button>
        <button onClick={descargarPDF} style={{ background: '#00D4FF', color: '#0A1628', border: 'none', padding: '12px 30px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '900', boxShadow: '0 0 30px rgba(0, 212, 255, 0.5)', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
          <Download size={18} /> Descargar Dossier PDF
        </button>
      </div>

      <div id="dossier-pdf" style={{ maxWidth: '210mm', margin: '0 auto', boxShadow: '0 0 100px rgba(0,0,0,0.8)' }}>
        
        {/* ================= PÁGINA 1: PORTADA ================= */}
        <div style={pageStyle}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'url(https://i.ibb.co/PZkChNVN/1793051979.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
          <div style={{ ...overlayStyle, background: 'linear-gradient(to top, rgba(10,22,40,1) 0%, rgba(10,22,40,0.4) 100%)' }}></div>
          
          <div style={{ ...contentStyle, justifyContent: 'flex-end', paddingBottom: '80px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
              <div style={{ width: '60px', height: '60px', background: 'rgba(0,212,255,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #00D4FF' }}>
                <Brain size={32} color="#00D4FF" />
              </div>
              <h3 style={{ margin: 0, color: '#00D4FF', letterSpacing: '4px', fontSize: '14px', fontWeight: 'bold' }}>DOSSIER ESTRATÉGICO CONFIDENCIAL</h3>
            </div>
            <h1 style={titleStyle}>No es un software.<br/><span style={{ color: '#00D4FF' }}>Es tu Director de Campaña.</span></h1>
            <p style={subtitleStyle}>La plataforma de Inteligencia Artificial que erradica la simulación y te asegura la victoria electoral.</p>
            <div style={{ marginTop: '40px', display: 'flex', gap: '20px', color: '#94A3B8', fontSize: '14px', fontWeight: 'bold' }}>
              <span>CICLO ELECTORAL 2026-2027</span>
              <span>|</span>
              <span>ORION CAMPAIGN INTELLIGENCE</span>
            </div>
          </div>
        </div>

        {/* ================= PÁGINA 2: EL PROBLEMA ================= */}
        <div style={pageStyle}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'url(https://i.ibb.co/N20mFSCB/1793052089.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
          <div style={{ ...overlayStyle, background: 'linear-gradient(to right, rgba(10,22,40,0.95) 0%, rgba(10,22,40,0.6) 100%)' }}></div>
          
          <div style={contentStyle}>
            <div style={{ maxWidth: '500px' }}>
              <AlertTriangle size={48} color="#F43F5E" style={{ marginBottom: '20px' }} />
              <h2 style={{ ...titleStyle, fontSize: '40px', color: '#F43F5E' }}>¿Por qué las campañas siguen perdiendo?</h2>
              <p style={{ ...subtitleStyle, fontSize: '18px', marginBottom: '30px' }}>
                Miles de pesos se pierden cada elección por reportes falsos y simulación de trabajo territorial. El 73% de las campañas pierde no por falta de recursos, sino por falta de inteligencia.
              </p>
              <div style={{ ...glassBox, padding: '20px', borderLeft: '4px solid #F43F5E' }}>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#E2E8F0', lineHeight: '1.8' }}>
                  <li>Brigadistas reportando desde su casa.</li>
                  <li>Presupuesto diluido en zonas improductivas.</li>
                  <li>Descubrimiento tardío de crisis territoriales.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* ================= PÁGINA 3: ADN EMOCIONAL ================= */}
        <div style={pageStyle}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'url(https://i.ibb.co/60fYfTw9/1793052658.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
          <div style={{ ...overlayStyle, background: 'linear-gradient(to top, rgba(10,22,40,0.95) 0%, rgba(10,22,40,0.2) 100%)' }}></div>
          
          <div style={{ ...contentStyle, justifyContent: 'flex-end' }}>
            <div style={glassBox}>
              <h2 style={{ ...titleStyle, fontSize: '36px', marginBottom: '10px' }}>ADN Emocional del Electorado</h2>
              <p style={{ ...subtitleStyle, fontSize: '18px' }}>
                Las campañas tradicionales preguntan <em>qué</em> quiere la gente. ORION descubre <em>por qué</em> lo quiere. Analiza el sentimiento real (enojo, esperanza, miedo) para que tus discursos conecten con el corazón del votante.
              </p>
            </div>
          </div>
        </div>

        {/* ================= PÁGINA 4: CENTRO NEURONAL ================= */}
        <div style={pageStyle}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'url(https://i.ibb.co/9mbR8XjN/1793052345.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
          <div style={{ ...overlayStyle, background: 'linear-gradient(to right, rgba(10,22,40,0.95) 0%, transparent 100%)' }}></div>
          
          <div style={contentStyle}>
            <div style={{ maxWidth: '500px' }}>
              <h2 style={{ ...titleStyle, fontSize: '40px', color: '#00D4FF' }}>El Centro Neuronal de tu Victoria</h2>
              <p style={{ ...subtitleStyle, fontSize: '18px' }}>
                Un candidato informado, un equipo conectado, una campaña imparable. ORION unifica datos históricos del INE con el trabajo de campo en tiempo real. No almacena información, la transforma en decisiones.
              </p>
            </div>
          </div>
        </div>

        {/* ================= PÁGINA 5: CONTROL TERRITORIAL ================= */}
        <div style={pageStyle}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'url(https://i.ibb.co/jk7HFxrp/1793052205.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
          <div style={{ ...overlayStyle, background: 'linear-gradient(to top, rgba(10,22,40,0.95) 0%, rgba(10,22,40,0.3) 100%)' }}></div>
          
          <div style={{ ...contentStyle, justifyContent: 'flex-end' }}>
            <div style={glassBox}>
              <Target size={40} color="#F59E0B" style={{ marginBottom: '15px' }} />
              <h2 style={{ ...titleStyle, fontSize: '36px', marginBottom: '10px' }}>Domina cada sección electoral</h2>
              <p style={{ ...subtitleStyle, fontSize: '18px' }}>
                Visualiza las 52 secciones electorales como si fueran tu propia casa. Identifica zonas seguras, en disputa y de riesgo. La información está en todas partes. La inteligencia no.
              </p>
            </div>
          </div>
        </div>

        {/* ================= PÁGINA 6: BRIGADISTAS ================= */}
        <div style={pageStyle}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'url(https://i.ibb.co/PGkq7gbv/1793052461.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
          <div style={{ ...overlayStyle, background: 'linear-gradient(to right, rgba(10,22,40,0.95) 0%, rgba(10,22,40,0.4) 100%)' }}></div>
          
          <div style={contentStyle}>
            <div style={{ maxWidth: '500px' }}>
              <Users size={40} color="#00D4FF" style={{ marginBottom: '15px' }} />
              <h2 style={{ ...titleStyle, fontSize: '40px' }}>Operación Territorial Real</h2>
              <p style={{ ...subtitleStyle, fontSize: '18px' }}>
                Controla a tus presidentes, secretarios y vocales por colonia. Sabrás con precisión matemática quién está cumpliendo con su cuota de movilización y dónde tienes huecos antes de la votación.
              </p>
            </div>
          </div>
        </div>

        {/* ================= PÁGINA 7: AURA IA ================= */}
        <div style={pageStyle}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'url(https://i.ibb.co/p880mHY/1793052543.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
          <div style={{ ...overlayStyle, background: 'linear-gradient(to top, rgba(10,22,40,0.95) 0%, rgba(10,22,40,0.1) 100%)' }}></div>
          
          <div style={{ ...contentStyle, justifyContent: 'flex-end' }}>
            <div style={glassBox}>
              <Brain size={40} color="#8B5CF6" style={{ marginBottom: '15px' }} />
              <h2 style={{ ...titleStyle, fontSize: '36px', marginBottom: '10px' }}>AURA: Tu Copiloto de Campaña</h2>
              <p style={{ ...subtitleStyle, fontSize: '18px' }}>
                AURA no duerme. No se cansa. No se equivoca. Pregúntale: <em>"¿En qué colonias debo enfocarme hoy?"</em> y en segundos analizará 21 tablas de datos para darte recomendaciones estratégicas.
              </p>
            </div>
          </div>
        </div>

        {/* ================= PÁGINA 8: GPS ================= */}
        <div style={pageStyle}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'url(https://i.ibb.co/QvJxQj0T/1793052782.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
          <div style={{ ...overlayStyle, background: 'linear-gradient(to right, rgba(10,22,40,0.95) 0%, rgba(10,22,40,0.3) 100%)' }}></div>
          
          <div style={contentStyle}>
            <div style={{ maxWidth: '500px' }}>
              <ShieldCheck size={40} color="#10B981" style={{ marginBottom: '15px' }} />
              <h2 style={{ ...titleStyle, fontSize: '40px' }}>Blindaje Operativo GPS</h2>
              <p style={{ ...subtitleStyle, fontSize: '18px' }}>
                Cada paso de tus brigadistas, auditado. Cada peso, justificado. El sistema captura la ubicación exacta y bloquea reportes si el brigadista está a más de 2 km de su zona.
              </p>
            </div>
          </div>
        </div>

        {/* ================= PÁGINA 9: VICTORIA ================= */}
        <div style={pageStyle}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'url(https://i.ibb.co/VppsM1kD/1793052874.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
          <div style={{ ...overlayStyle, background: 'rgba(10,22,40,0.85)' }}></div>
          
          <div style={{ ...contentStyle, textAlign: 'center', alignItems: 'center' }}>
            <Zap size={60} color="#F59E0B" style={{ marginBottom: '30px' }} />
            <h2 style={{ ...titleStyle, fontSize: '52px' }}>La diferencia entre ganar y perder</h2>
            <p style={{ ...subtitleStyle, fontSize: '22px', textAlign: 'center', maxWidth: '700px' }}>
              rara vez está en el dinero. Está en la información que nadie más ve.
            </p>
          </div>
        </div>

        {/* ================= PÁGINA 10: CTA / INVERSIÓN ================= */}
        <div style={{ ...pageStyle, background: 'linear-gradient(135deg, #0A1628 0%, #111827 100%)' }}>
          <div style={contentStyle}>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <h2 style={{ ...titleStyle, fontSize: '42px' }}>Mientras otros operan con Excel,<br/>tú puedes tener un Director de Campaña con IA.</h2>
            </div>
            
            <div style={{ display: 'flex', gap: '30px', justifyContent: 'center' }}>
              <div style={{ ...glassBox, flex: 1, textAlign: 'center', borderTop: '4px solid #00D4FF' }}>
                <h3 style={{ color: '#00D4FF', fontSize: '24px', marginBottom: '10px' }}>Licencia por Ciclo</h3>
                <div style={{ fontSize: '36px', fontWeight: '900', color: 'white', marginBottom: '20px' }}>$350,000 <span style={{ fontSize: '16px', color: '#94A3B8' }}>MXN</span></div>
                <ul style={{ textAlign: 'left', color: '#E2E8F0', lineHeight: '2', listStyle: 'none', padding: 0 }}>
                  <li>✓ Clonación exclusiva en 48h</li>
                  <li>✓ Carga de datos e IA entrenada</li>
                  <li>✓ Capacitación a tu equipo</li>
                  <li>✓ Soporte 24/7 en campaña</li>
                </ul>
              </div>
            </div>

            <div style={{ marginTop: '60px', textAlign: 'center' }}>
              <h3 style={{ fontSize: '24px', color: 'white', marginBottom: '20px' }}>¿Listo para asegurar tu victoria?</h3>
              <a href="https://wa.me/tu-numero" style={{ display: 'inline-block', background: '#00D4FF', color: '#0A1628', padding: '18px 40px', borderRadius: '12px', textDecoration: 'none', fontWeight: '900', fontSize: '18px', boxShadow: '0 10px 30px rgba(0,212,255,0.4)' }}>
                Agendar Demostración Privada
              </a>
              <p style={{ color: '#64748B', marginTop: '20px', fontSize: '14px' }}>orion-electoral.com · Campaign Intelligence</p>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background-color: white !important; }
          #dossier-pdf { box-shadow: none !important; max-width: 100% !important; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>
    </div>
  );
}
