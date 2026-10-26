import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Brain, MapPin, Zap, Target } from 'lucide-react';
import { OrionLogoIcon } from '../components/OrionLogoIcon';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ backgroundColor: '#0A1628', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#F9FAFB', overflowX: 'hidden' }}>
      
      {/* NAVBAR CON EL NUEVO LOGO SVG */}
      <nav style={{ backgroundColor: 'rgba(10, 22, 40, 0.9)', backdropFilter: 'blur(10px)', padding: '15px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <OrionLogoIcon size={40} />
          <span style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '2px', color: '#F9FAFB' }}>
            ORION
          </span>
        </div>

        <div style={{ display: 'flex', gap: '15px' }}>
          <button 
            onClick={() => navigate('/login')} 
            style={{ background: 'transparent', color: '#00D4FF', border: '1px solid #00D4FF', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: 'all 0.3s' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            Iniciar Sesión
          </button>
          <button 
            onClick={() => navigate('/login')} 
            style={{ background: '#00D4FF', color: '#0A1628', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 0 15px rgba(0, 212, 255, 0.4)' }}
          >
            Probar Demo <ArrowRight size={16} />
          </button>
        </div>
      </nav>

      {/* SECCIÓN 1: HERO */}
      <header style={{ textAlign: 'center', padding: '180px 20px 100px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '10%', left: '20%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(0, 212, 255, 0.15) 0%, transparent 70%)', filter: 'blur(50px)', zIndex: 0 }}></div>
        <div style={{ position: 'absolute', bottom: '10%', right: '20%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, transparent 70%)', filter: 'blur(50px)', zIndex: 0 }}></div>
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: '52px', fontWeight: '900', marginBottom: '20px', lineHeight: '1.1', letterSpacing: '-1px' }}>
            La información está en todas partes.<br/>
            <span style={{ color: '#00D4FF' }}>La inteligencia no.</span>
          </h1>
          <p style={{ fontSize: '20px', color: '#9CA3AF', maxWidth: '650px', margin: '0 auto 40px auto', lineHeight: '1.6' }}>
            ORION — El primer Centro Neuronal de Campaña con IA real. Toma el control del territorio, audita a tu equipo con GPS y gana la elección con datos.
          </p>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={() => navigate('/login')} 
              style={{ background: '#00D4FF', color: '#0A1628', border: 'none', padding: '16px 36px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', boxShadow: '0 0 20px rgba(0, 212, 255, 0.4)', transition: 'transform 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Ver Demo en Vivo
            </button>
            <button 
              style={{ background: 'transparent', color: '#F59E0B', border: '2px solid #F59E0B', padding: '14px 34px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
 <button 
  onClick={() => navigate('/dossier')} 
  style={{ background: 'transparent', color: '#F59E0B', border: '2px solid #F59E0B', padding: '14px 34px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', transition: 'all 0.2s' }}
  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)'; }}
  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
>
  Descargar Dossier
</button>

      {/* SECCIÓN 2: EL PROBLEMA */}
      <section style={{ padding: '80px 20px', backgroundColor: '#111827' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '50px', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '36px', fontWeight: '800', marginBottom: '20px', lineHeight: '1.2' }}>
              ¿Por qué pierden las campañas?
            </h2>
            <p style={{ fontSize: '18px', color: '#9CA3AF', lineHeight: '1.6' }}>
              La mayoría de las campañas pierden no por falta de recursos, sino por falta de información útil para tomar decisiones. Mientras tú operas con Excel y WhatsApp, tu competencia ya está usando datos.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {[
              { icon: <MapPin size={24} color="#00D4FF" />, title: 'Datos dispersos', desc: 'La información de tus brigadistas está en 10 lugares diferentes.' },
              { icon: <Target size={24} color="#00D4FF" />, title: 'Decisiones tardías', desc: 'Te enteras de las problemáticas cuando ya es demasiado tarde.' },
              { icon: <ShieldCheck size={24} color="#00D4FF" />, title: 'Recursos mal dirigidos', desc: 'Gastas el presupuesto en zonas donde no hay oportunidad de voto.' }
            ].map((item, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #00D4FF', display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                <div style={{ background: 'rgba(0, 212, 255, 0.1)', padding: '10px', borderRadius: '8px' }}>{item.icon}</div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '5px', color: '#F9FAFB' }}>{item.title}</h3>
                  <p style={{ color: '#9CA3AF', fontSize: '14px', margin: 0 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECCIÓN 3: LA SOLUCIÓN (SIN MENCIONAR DEEPSEEK) */}
      <section style={{ padding: '100px 20px', backgroundColor: '#0A1628' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{ fontSize: '36px', fontWeight: '800', marginBottom: '15px' }}>
            Conoce a <span style={{ color: '#00D4FF' }}>ORION</span>
          </h2>
          <p style={{ color: '#9CA3AF', fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>
            No es un software. Es tu Director de Campaña con IA que trabaja 24/7, conectando las 6 áreas de tu operación.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px', maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ background: '#111827', padding: '30px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', transition: 'transform 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <MapPin size={32} color="#00D4FF" style={{ marginBottom: '20px' }} />
            <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>Auditoría GPS Antifraude</h3>
            <p style={{ color: '#9CA3AF', fontSize: '15px', lineHeight: '1.6' }}>Sabe exactamente dónde se hizo cada encuesta. Detecta si un brigadista está inventando datos desde su casa.</p>
          </div>
          
          <div style={{ background: '#111827', padding: '30px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', transition: 'transform 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <Brain size={32} color="#F59E0B" style={{ marginBottom: '20px' }} />
            <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>AURA · Copiloto IA</h3>
            <p style={{ color: '#9CA3AF', fontSize: '15px', lineHeight: '1.6' }}>Impulsado por Inteligencia Artificial. Analiza tus datos y te dice exactamente qué hacer hoy para ganar votos.</p>
          </div>
          
          <div style={{ background: '#111827', padding: '30px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', transition: 'transform 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <Zap size={32} color="#6366F1" style={{ marginBottom: '20px' }} />
            <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>Pronóstico Electoral</h3>
            <p style={{ color: '#9CA3AF', fontSize: '15px', lineHeight: '1.6' }}>Proyecciones matemáticas basadas en tendencia histórica y estructura actual para priorizar secciones.</p>
          </div>
        </div>
      </section>

      {/* SECCIÓN 4: AURA CHAT SIMULATION */}
      <section style={{ padding: '80px 20px', backgroundColor: '#111827', textAlign: 'center' }}>
        <h2 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '40px' }}>
          Habla con el cerebro de tu campaña
        </h2>
        <div style={{ maxWidth: '600px', margin: '0 auto', background: '#0A1628', padding: '30px', borderRadius: '16px', border: '1px solid rgba(0, 212, 255, 0.2)', textAlign: 'left', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
            <div style={{ background: '#1E293B', padding: '12px 16px', borderRadius: '12px 12px 12px 0', color: '#F9FAFB', fontSize: '14px' }}>
              ¿En qué colonias debo enfocar mi esfuerzo hoy?
            </div>
          </div>
          <div style={{ display: 'flex', gap: '15px', flexDirection: 'row-reverse' }}>
            <div style={{ background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)', padding: '16px', borderRadius: '12px 12px 0 12px', color: '#F9FAFB', fontSize: '14px', lineHeight: '1.6' }}>
              <strong style={{ color: '#00D4FF', display: 'block', marginBottom: '8px' }}>AURA AI:</strong>
              Basándome en los datos: <br/>
              • Prioriza <strong>Bugambilias</strong> (33 reportes de agua).<br/>
              • ⚠️ <strong>Nueva Santa María</strong> (0 activistas).<br/>
              • <strong>Sección 1492</strong> (18 secciones en riesgo).<br/><br/>
              <em>Recomendación: Envía 3 brigadistas a Bugambilias.</em>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN 5: CTA FINAL */}
      <section style={{ padding: '120px 20px', backgroundColor: '#0A1628', textAlign: 'center', position: 'relative' }}>
        <h2 style={{ fontSize: '40px', fontWeight: '900', marginBottom: '20px', lineHeight: '1.2' }}>
          Mientras otros operan con Excel,<br/>
          tú puedes tener un Director de Campaña con IA.
        </h2>
        <p style={{ color: '#9CA3AF', fontSize: '18px', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px auto' }}>
          La pregunta es: ¿Vas a dejar que tu competencia lo tenga primero?
        </p>
        <button 
          onClick={() => navigate('/login')} 
          style={{ background: '#00D4FF', color: '#0A1628', border: 'none', padding: '20px 50px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900', fontSize: '18px', boxShadow: '0 0 30px rgba(0, 212, 255, 0.5)', transition: 'transform 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          Solicitar Demo Ahora
        </button>
        <p style={{ color: '#64748B', marginTop: '20px', fontSize: '14px' }}>
          O escríbenos directo: <a href="https://wa.me/tu-numero" style={{ color: '#00D4FF', textDecoration: 'none' }}>WhatsApp</a>
        </p>
      </section>

      {/* FOOTER CON TU NUEVO LOGO TRANSPARENTE CORREGIDO */}
      <footer style={{ backgroundColor: '#050A14', color: '#64748B', textAlign: 'center', padding: '40px 20px', fontSize: '13px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
        
        {/* REEMPLAZA ESTE ENLACE POR TU ENLACE DIRECTO DE IMGBB (i.ibb.co/...) */}
        <img 
          src="https://i.ibb.co/Myk4tpTD/Firefly-Remove-Background.png" 
          alt="ORION" 
          style={{ 
            height: 'auto', 
            maxHeight: '100px', 
            maxWidth: '100%', 
            objectFit: 'contain',
            opacity: 0.8 
          }} 
        />
        
        <p style={{ margin: 0 }}>© {new Date().getFullYear()} ORION · Campaign Intelligence. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
