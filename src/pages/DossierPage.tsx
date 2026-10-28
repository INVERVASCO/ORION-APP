// @ts-nocheck
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, ShieldCheck, Brain, Target, AlertTriangle, Users, Zap } from 'lucide-react';
import { useState } from 'react';
// @ts-ignore
import html2pdf from 'html2pdf.js';

export default function DossierPage() {
  const navigate = useNavigate();
  const [descargando, setDescargando] = useState(false);

  const descargarPDF = async () => {
    const element = document.getElementById('dossier-pdf');
    if (!element) return;

    setDescargando(true);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const opt = {
      margin: 0,
      filename: 'Dossier_Estrategico_ORION.pdf',
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: true, letterRendering: true, scrollY: 0, windowWidth: 1000 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert("Hubo un problema. Por favor usa el botón de 'Imprimir PDF' y elige 'Guardar como PDF'.");
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#050A14', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      
      {/* BOTONES FLOTANTES */}
      <div className="no-print" style={{ position: 'fixed', top: '20px', left: '20px', right: '20px', display: 'flex', justifyContent: 'space-between', zIndex: 1000, flexWrap: 'wrap', gap: '10px' }}>
        <button onClick={() => navigate('/')} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', backdropFilter: 'blur(10px)' }}>
          <ArrowLeft size={18} /> Volver
        </button>
        
        <button onClick={descargarPDF} disabled={descargando} style={{ background: descargando ? '#64748B' : '#00D4FF', color: '#0A1628', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: descargando ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '900', boxShadow: '0 0 30px rgba(0, 212, 255, 0.5)' }}>
          <Download size={18} /> {descargando ? 'Generando...' : 'Descargar PDF'}
        </button>
      </div>

      <div id="dossier-pdf" style={{ maxWidth: '210mm', margin: '0 auto', boxShadow: '0 0 100px rgba(0,0,0,0.8)', backgroundColor: '#0A1628' }}>
        
        {/* PÁGINA 1 */}
        <div className="pdf-page">
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'url(https://i.ibb.co/PZkChNVN/1793051979.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
          <div className="overlay" style={{ background: 'linear-gradient(to top, rgba(10,22,40,1) 0%, rgba(10,22,40,0.3) 100%)' }}></div>
          
          <div className="content" style={{ justifyContent: 'flex-end', paddingBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
              <div style={{ width: '60px', height: '60px', background: 'rgba(0,212,255,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #00D4FF' }}>
                <Brain size={32} color="#00D4FF" />
              </div>
              <h3 style={{ margin: 0, color: '#00D4FF', letterSpacing: '4px', fontSize: '14px', fontWeight: 'bold' }}>DOSSIER ESTRATÉGICO</h3>
            </div>
            <h1 className="title-text" style={{ fontSize: '48px', fontWeight: '900', lineHeight: '1.1', marginBottom: '20px', textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}>No es un software.<br/><span style={{ color: '#00D4FF' }}>Es tu Director de Campaña.</span></h1>
            <p style={{ fontSize: '20px', color: '#E2E8F0', lineHeight: '1.6', maxWidth: '600px', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>La estrategia de Inteligencia Artificial que erradica la simulación y te asegura la victoria electoral.</p>
            <div style={{ marginTop: '40px', display: 'flex', gap: '20px', color: '#94A3B8', fontSize: '14px', fontWeight: 'bold' }}>
              <span>CICLO 2026-2027</span>
              <span>|</span>
              <span>ORION CAMPAIGN INTELLIGENCE</span>
            </div>
          </div>
        </div>

        {/* PÁGINA 2 */}
        <div className="pdf-page">
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'url(https://i.ibb.co/N20mFSCB/1793052089.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
          <div className="overlay" style={{ background: 'linear-gradient(to right, rgba(10,22,40,0.95) 0%, rgba(10,22,40,0.6) 100%)' }}></div>
          
          <div className="content">
            <div style={{ maxWidth: '500px' }}>
              <AlertTriangle size={48} color="#F43F5E" style={{ marginBottom: '20px' }} />
              <h2 className="title-text" style={{ fontSize: '40px', fontWeight: '900', color: '#F43F5E', lineHeight: '1.1', marginBottom: '20px' }}>¿Por qué las campañas siguen perdiendo?</h2>
              <p style={{ fontSize: '18px', color: '#E2E8F0', lineHeight: '1.6', marginBottom: '30px' }}>
                Miles de pesos se pierden cada elección por reportes falsos y simulación de trabajo territorial. El 73% de las campañas pierde no por falta de recursos, sino por falta de inteligencia.
              </p>
              <div className="glass-box" style={{ padding: '20px', borderLeft: '4px solid #F43F5E' }}>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#E2E8F0', lineHeight: '1.8' }}>
                  <li>Brigadistas reportando desde su casa.</li>
                  <li>Presupuesto diluido en zonas improductivas.</li>
                  <li>Descubrimiento tardío de crisis territoriales.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* PÁGINA 3 */}
        <div className="pdf-page">
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'url(https://i.ibb.co/60fYfTw9/1793052658.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
          <div className="overlay" style={{ background: 'linear-gradient(to top, rgba(10,22,40,0.95) 0%, rgba(10,22,40,0.3) 100%)' }}></div>
          
          <div className="content" style={{ justifyContent: 'flex-end' }}>
            <div className="glass-box">
              <h2 className="title-text" style={{ fontSize: '36px', fontWeight: '900', marginBottom: '10px' }}>ADN Emocional del Electorado</h2>
              <p style={{ fontSize: '18px', color: '#E2E8F0', lineHeight: '1.6' }}>
                Las campañas tradicionales preguntan <em>qué</em> quiere la gente. ORION descubre <em>por qué</em> lo quiere. Analiza el sentimiento real para que tus discursos conecten con el corazón del votante.
              </p>
            </div>
          </div>
        </div>

        {/* PÁGINA 4 */}
        <div className="pdf-page">
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'url(https://i.ibb.co/9mbR8XjN/1793052345.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
          <div className="overlay" style={{ background: 'linear-gradient(to right, rgba(10,22,40,0.95) 0%, transparent 100%)' }}></div>
          
          <div className="content">
            <div style={{ maxWidth: '500px' }}>
              <h2 className="title-text" style={{ fontSize: '40px', fontWeight: '900', color: '#00D4FF', lineHeight: '1.1', marginBottom: '20px' }}>El Centro Neuronal de tu Victoria</h2>
              <p style={{ fontSize: '18px', color: '#E2E8F0', lineHeight: '1.6' }}>
                Un candidato informado, un equipo conectado, una campaña imparable. ORION unifica datos históricos del INE con el trabajo de campo en tiempo real.
              </p>
            </div>
          </div>
        </div>

        {/* PÁGINA 5 */}
        <div className="pdf-page">
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'url(https://i.ibb.co/jk7HFxrp/1793052205.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
          <div className="overlay" style={{ background: 'linear-gradient(to top, rgba(10,22,40,0.95) 0%, rgba(10,22,40,0.3) 100%)' }}></div>
          
          <div className="content" style={{ justifyContent: 'flex-end' }}>
            <div className="glass-box">
              <Target size={40} color="#F59E0B" style={{ marginBottom: '15px' }} />
              <h2 className="title-text" style={{ fontSize: '36px', fontWeight: '900', marginBottom: '10px' }}>Domina cada sección electoral</h2>
              <p style={{ fontSize: '18px', color: '#E2E8F0', lineHeight: '1.6' }}>
                Visualiza las secciones electorales como si fueran tu propia casa. Identifica zonas seguras, en disputa y de riesgo. La información está en todas partes. La inteligencia no.
              </p>
            </div>
          </div>
        </div>

        {/* PÁGINA 6 */}
        <div className="pdf-page">
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'url(https://i.ibb.co/PGkq7gbv/1793052461.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
          <div className="overlay" style={{ background: 'linear-gradient(to right, rgba(10,22,40,0.95) 0%, rgba(10,22,40,0.4) 100%)' }}></div>
          
          <div className="content">
            <div style={{ maxWidth: '500px' }}>
              <Users size={40} color="#00D4FF" style={{ marginBottom: '15px' }} />
              <h2 className="title-text" style={{ fontSize: '40px', fontWeight: '900', lineHeight: '1.1', marginBottom: '20px' }}>Operación Territorial Real</h2>
              <p style={{ fontSize: '18px', color: '#E2E8F0', lineHeight: '1.6' }}>
                Controla a tus presidentes, secretarios y vocales por colonia. Sabrás con precisión matemática quién está cumpliendo con su cuota de movilización y dónde tienes huecos.
              </p>
            </div>
          </div>
        </div>

        {/* PÁGINA 7 */}
        <div className="pdf-page">
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'url(https://i.ibb.co/p880mHY/1793052543.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
          <div className="overlay" style={{ background: 'linear-gradient(to top, rgba(10,22,40,0.95) 0%, rgba(10,22,40,0.2) 100%)' }}></div>
          
          <div className="content" style={{ justifyContent: 'flex-end' }}>
            <div className="glass-box">
              <Brain size={40} color="#8B5CF6" style={{ marginBottom: '15px' }} />
              <h2 className="title-text" style={{ fontSize: '36px', fontWeight: '900', marginBottom: '10px' }}>AURA: Tu Copiloto de Campaña</h2>
              <p style={{ fontSize: '18px', color: '#E2E8F0', lineHeight: '1.6' }}>
                AURA no duerme. No se cansa. No se equivoca. Pregúntale: <em>"¿En qué colonias debo enfocarme hoy?"</em> y en segundos analizará 21 tablas de datos para darte recomendaciones.
              </p>
            </div>
          </div>
        </div>

        {/* PÁGINA 8 */}
        <div className="pdf-page">
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'url(https://i.ibb.co/QvJxQj0T/1793052782.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
          <div className="overlay" style={{ background: 'linear-gradient(to right, rgba(10,22,40,0.95) 0%, rgba(10,22,40,0.3) 100%)' }}></div>
          
          <div className="content">
            <div style={{ maxWidth: '550px' }}>
              <ShieldCheck size={40} color="#10B981" style={{ marginBottom: '15px' }} />
              <h2 className="title-text" style={{ fontSize: '40px', fontWeight: '900', lineHeight: '1.1', marginBottom: '20px' }}>Blindaje de Presupuesto GPS</h2>
              <p style={{ fontSize: '18px', color: '#E2E8F0', lineHeight: '1.6' }}>
                Deja de pagar sueldos a fantasmas. Cada paso de tus brigadistas, auditado. Cada peso, justificado. El sistema captura la ubicación exacta y bloquea reportes si el brigadista está a más de 2 km de su zona.
              </p>
            </div>
          </div>
        </div>

        {/* PÁGINA 9 */}
        <div className="pdf-page">
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'url(https://i.ibb.co/VppsM1kD/1793052874.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
          <div className="overlay" style={{ background: 'rgba(10,22,40,0.85)' }}></div>
          
          <div className="content" style={{ textAlign: 'center', alignItems: 'center' }}>
            <Zap size={60} color="#F59E0B" style={{ marginBottom: '30px' }} />
            <h2 className="title-text" style={{ fontSize: '52px', fontWeight: '900', lineHeight: '1.1', marginBottom: '20px' }}>La diferencia entre ganar y perder</h2>
            <p style={{ fontSize: '22px', color: '#E2E8F0', textAlign: 'center', maxWidth: '700px', lineHeight: '1.6' }}>
              rara vez está en el dinero. Está en la información que nadie más ve.
            </p>
          </div>
        </div>

        {/* PÁGINA 10 */}
        <div className="pdf-page" style={{ background: 'linear-gradient(135deg, #0A1628 0%, #111827 100%)' }}>
          <div className="content">
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <h2 className="title-text" style={{ fontSize: '36px', fontWeight: '900', lineHeight: '1.1', marginBottom: '20px' }}>Mientras otros operan con Excel,<br/>tú puedes tener un Director de Campaña con IA.</h2>
            </div>
            
            <div className="grid-2-cols" style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginBottom: '40px' }}>
              <div className="glass-box" style={{ flex: 1, textAlign: 'center', borderTop: '4px solid #00D4FF' }}>
                <h3 style={{ color: '#00D4FF', fontSize: '22px', marginBottom: '10px' }}>Licencia por Ciclo</h3>
                <div style={{ fontSize: '32px', fontWeight: '900', color: 'white', marginBottom: '20px' }}>$350,000 <span style={{ fontSize: '14px', color: '#94A3B8' }}>MXN</span></div>
                <ul style={{ textAlign: 'left', color: '#E2E8F0', lineHeight: '1.8', listStyle: 'none', padding: 0, fontSize: '14px' }}>
                  <li>✓ Clonación exclusiva en 48h</li>
                  <li>✓ Carga de datos e IA entrenada</li>
                  <li>✓ Capacitación a tu equipo</li>
                  <li>✓ Soporte 24/7 en campaña</li>
                </ul>
              </div>
            </div>

            <div className="glass-box" style={{ textAlign: 'center', background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)', padding: '25px', borderRadius: '16px' }}>
              <h3 style={{ fontSize: '22px', color: '#F59E0B', marginBottom: '15px', fontWeight: 'bold' }}>
                ¿Vas a dejar que tu competencia tenga esto primero?
              </h3>
              
              <div style={{ color: '#E2E8F0', fontSize: '14px', lineHeight: '1.8', marginBottom: '20px' }}>
                <strong>Oficina:</strong> Avenida Sur 403, Col. Unidad Habitacional Pemex, Piso 3, Oficina 7, Tula de Allende, Hgo. C.P. 42808<br/>
                <strong>Teléfono:</strong> 773 732 7730 · <strong>Móvil:</strong> 55 4926 3775
              </div>

              <a href="https://wa.me/525549263775" style={{ display: 'inline-block', background: '#00D4FF', color: '#0A1628', padding: '15px 30px', borderRadius: '8px', textDecoration: 'none', fontWeight: '900', fontSize: '16px', boxShadow: '0 10px 30px rgba(0,212,255,0.4)' }}>
                Agendar Demostración Privada
              </a>
              <p style={{ color: '#64748B', marginTop: '15px', fontSize: '12px' }}>orion-electoral.com · Campaign Intelligence</p>
            </div>
          </div>
        </div>

      </div>

      {/* ESTILOS CSS RESPONSIVOS */}
      <style>{`
        .pdf-page {
          width: 210mm;
          height: 296mm; 
          position: relative;
          overflow: hidden;
          page-break-after: always;
          background-color: #0A1628;
          display: flex;
          flex-direction: column;
          padding: 60px;
          box-sizing: border-box;
          color: white;
        }

        .overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: 1;
        }

        .content {
          position: relative;
          z-index: 2;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .glass-box {
          background-color: rgba(17, 24, 39, 0.95);
          border: 1px solid rgba(0, 212, 255, 0.3);
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        }

        /* ADAPTACIÓN PARA CELULARES Y TABLETS */
        @media screen and (max-width: 800px) {
          .pdf-page {
            width: 100% !important;
            height: auto !important;
            min-height: 100vh;
            padding: 40px 20px !important;
            border-bottom: 2px solid #00D4FF;
          }
          
          .title-text {
            font-size: 32px !important;
          }

          .grid-2-cols {
            flex-direction: column !important;
            gap: 15px !important;
          }

          .glass-box {
            padding: 20px !important;
          }
        }

        /* ESTILOS PARA IMPRESIÓN / PDF */
        @media print {
          .no-print { display: none !important; }
          body { background-color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #dossier-pdf { box-shadow: none !important; max-width: 100% !important; }
          @page { size: A4 portrait; margin: 0; }
          .pdf-page { page-break-after: always; height: 297mm; }
        }
      `}</style>
    </div>
  );
}
