import { useEffect, useState } from 'react';
import { 
  Search, Trash2, Plus, X, Loader2, CheckCircle2, 
  AlertTriangle, TrendingUp, ThumbsUp, ThumbsDown, Minus,
  MessageCircle, Sparkles, Brain, ArrowRight
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Toast from '../components/Toast';
import { invocarDeepSeek } from '../lib/deepseekClient';

interface Publicacion {
  id: string;
  red_social: string;
  tipo_contenido: string | null;
  url_publicacion: string | null;
  autor: string | null;
  contenido: string | null;
  sentimiento: string | null;
  temas: string[] | null;
  alcance: number;
  interacciones: number;
  es_ataque: boolean;
  requiere_respuesta: boolean;
  fecha_publicacion: string | null;
  created_at: string;
}

interface ConfirmModalData {
  visible: boolean;
  titulo: string;
  mensaje: string;
  tipo: 'danger' | 'success' | 'warning';
  onConfirm: () => void;
}

const REDES = [
  { value: 'facebook', label: 'Facebook', color: '#1877F2', icono: '📘' },
  { value: 'instagram', label: 'Instagram', color: '#E4405F', icono: '📷' },
  { value: 'tiktok', label: 'TikTok', color: '#000000', icono: '🎵' },
  { value: 'x', label: 'X (Twitter)', color: '#1DA1F2', icono: '🐦' },
  { value: 'whatsapp', label: 'WhatsApp', color: '#25D366', icono: '💬' },
  { value: 'youtube', label: 'YouTube', color: '#FF0000', icono: '▶️' },
];

const SENTIMIENTOS = [
  { value: 'positivo', label: 'Positivo', color: '#4CAF50', icono: <ThumbsUp size={14} /> },
  { value: 'negativo', label: 'Negativo', color: '#F44336', icono: <ThumbsDown size={14} /> },
  { value: 'neutral', label: 'Neutral', color: '#9E9E9E', icono: <Minus size={14} /> },
];

const SYSTEM_PROMPT_CAMPANA = `Eres un experto en marketing político y estrategia digital (Growth Hacker político).
Tu misión es analizar los reportes de redes sociales de la campaña y generar una "Campaña de Oportunidad".
NO generes ataques ni descalificaciones hacia el oponente. Usa la inteligencia emocional.
Con base en los sentimientos y temas detectados, devuelve un plan de contenido con este formato exacto:

1. 🔍 DIAGNÓSTICO SOCIAL: ¿Qué está sintiendo la gente? (Máximo 2 párrafos).
2. 💡 CONCEPTO DE CAMPAÑA: Un título pegajoso para la campaña en redes.
3. 🎨 SUGERENCIAS VISUALES: Describe 2 imágenes o videos ideales para acompañar el mensaje (ej. "Foto del candidato sin traje, en la colonia, escuchando a una señora").
4. 📝 COPYS SUGERIDOS: 3 textos listos para copiar y pegar en Facebook/Instagram.
5. 🚀 ACCIÓN TÁCTICA: Qué debe hacer el candidato esta semana con base en estas oportunidades.

Sé breve, directo, poético y muy estratégico. No uses lenguaje robótico.`;

export default function MonitoreoRedes() {
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [filtradas, setFiltradas] = useState<Publicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRed, setFiltroRed] = useState('');
  const [filtroSentimiento, setFiltroSentimiento] = useState('');
  
  const [publicacionNueva, setPublicacionNueva] = useState<any | null>(null);
  
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMensaje, setToastMensaje] = useState('');

  // Estados para la IA
  const [generandoIA, setGenerandoIA] = useState(false);
  const [campanaIA, setCampanaIA] = useState('');

  const [confirmModal, setConfirmModal] = useState<ConfirmModalData>({
    visible: false, titulo: '', mensaje: '', tipo: 'warning', onConfirm: () => {},
  });

  const mostrarConfirm = (titulo: string, mensaje: string, tipo: 'danger' | 'success' | 'warning', onConfirm: () => void) => {
    setConfirmModal({ visible: true, titulo, mensaje, tipo, onConfirm });
  };
  const cerrarConfirm = () => setConfirmModal({ ...confirmModal, visible: false });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('monitoreo_redes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) {
        setPublicaciones(data as any);
        setFiltradas(data as any);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    let resultado = [...publicaciones];
    if (busqueda.trim() !== '') {
      const q = busqueda.toLowerCase();
      resultado = resultado.filter(p =>
        (p.contenido || '').toLowerCase().includes(q) ||
        (p.autor || '').toLowerCase().includes(q)
      );
    }
    if (filtroRed) resultado = resultado.filter(p => p.red_social === filtroRed);
    if (filtroSentimiento) resultado = resultado.filter(p => p.sentimiento === filtroSentimiento);
    setFiltradas(resultado);
  }, [busqueda, filtroRed, filtroSentimiento, publicaciones]);

  const abrirModalNueva = () => {
    setPublicacionNueva({
      red_social: 'facebook',
      tipo_contenido: 'publicacion',
      url_publicacion: '',
      autor: '',
      contenido: '',
      sentimiento: 'neutral',
      alcance: '',
      interacciones: '',
      es_ataque: false,
      requiere_respuesta: false,
      fecha_publicacion: new Date().toISOString().split('T')[0],
    });
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicacionNueva) return;
    setGuardando(true);

    const { data, error } = await supabase
      .from('monitoreo_redes')
      .insert([{
        red_social: publicacionNueva.red_social,
        tipo_contenido: publicacionNueva.tipo_contenido,
        url_publicacion: publicacionNueva.url_publicacion || null,
        autor: publicacionNueva.autor || null,
        contenido: publicacionNueva.contenido || null,
        sentimiento: publicacionNueva.sentimiento,
        alcance: parseInt(publicacionNueva.alcance) || 0,
        interacciones: parseInt(publicacionNueva.interacciones) || 0,
        es_ataque: publicacionNueva.es_ataque,
        requiere_respuesta: publicacionNueva.requiere_respuesta,
        fecha_publicacion: publicacionNueva.fecha_publicacion || null,
      }])
      .select()
      .single();

    if (error) {
      setToastMensaje('Error al crear: ' + error.message);
      setToastVisible(true);
    } else if (data) {
      setPublicaciones([data as any, ...publicaciones]);
      setPublicacionNueva(null);
      setToastMensaje('¡Publicación registrada!');
      setToastVisible(true);
    }
    setGuardando(false);
  };

  const handleEliminar = (id: string) => {
    mostrarConfirm(
      '¿Eliminar esta publicación?',
      'Esta acción no se puede deshacer.',
      'danger',
      async () => {
        cerrarConfirm();
        const { error } = await supabase.from('monitoreo_redes').delete().eq('id', id);
        if (error) {
          setToastMensaje('Error al eliminar: ' + error.message);
          setToastVisible(true);
        } else {
          setPublicaciones(publicaciones.filter(p => p.id !== id));
          setToastMensaje('Publicación eliminada');
          setToastVisible(true);
        }
      }
    );
  };

  // 🧠 FUNCIÓN MÁGICA: GENERAR CAMPAÑA CON IA
  const generarCampanaIA = async () => {
    if (publicaciones.length === 0) {
      setToastMensaje('Registra algunas publicaciones primero para que la IA las analice.');
      setToastVisible(true);
      return;
    }

    setGenerandoIA(true);
    setCampanaIA('');

    try {
      // Preparamos el contexto para la IA
      let contextoRedes = `Últimos reportes de redes sociales de Tula:\n\n`;
      
      publicaciones.slice(0, 20).forEach((p, i) => {
        contextoRedes += `[Reporte ${i+1}]\n`;
        contextoRedes += `Red: ${p.red_social} | Sentimiento: ${p.sentimiento} | Ataque: ${p.es_ataque ? 'Sí' : 'No'}\n`;
        contextoRedes += `Contenido: "${p.contenido || 'Sin texto'}"\n\n`;
      });

      const respuesta = await invocarDeepSeek([
        { role: 'system', content: SYSTEM_PROMPT_CAMPANA },
        { role: 'user', content: contextoRedes }
      ], { temperature: 0.7 });

      setCampanaIA(respuesta);
    } catch (err: any) {
      setToastMensaje('Error de IA: ' + err.message);
      setToastVisible(true);
    } finally {
      setGenerandoIA(false);
    }
  };

  const getRedInfo = (red: string) => REDES.find(r => r.value === red) || REDES[0];
  const getSentimientoInfo = (s: string) => SENTIMIENTOS.find(x => x.value === s) || SENTIMIENTOS[2];

  const contarPositivos = publicaciones.filter(p => p.sentimiento === 'positivo').length;
  const contarNegativos = publicaciones.filter(p => p.sentimiento === 'negativo').length;
  const contarNeutrales = publicaciones.filter(p => p.sentimiento === 'neutral').length;
  const ataques = publicaciones.filter(p => p.es_ataque).length;
  const alcanceTotal = publicaciones.reduce((sum, p) => sum + (p.alcance || 0), 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px', gap: '10px', color: '#00A651' }}>
        <Loader2 size={32} /> Cargando monitoreo...
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 className="header-title">Radar Social</h1>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            Vigilancia continua del territorio digital. Detecta tendencias y ataques.
          </p>
        </div>
        <button 
          onClick={generarCampanaIA}
          disabled={generandoIA}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', 
            background: 'linear-gradient(135deg, #9C27B0 0%, #673AB7 100%)', 
            color: 'white', border: 'none', borderRadius: '8px', cursor: generandoIA ? 'not-allowed' : 'pointer', 
            fontWeight: 'bold', fontSize: '14px', boxShadow: '0 4px 10px rgba(156,39,176,0.3)'
          }}
        >
          {generandoIA ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          {generandoIA ? 'Creando Estrategia...' : 'Generar Campaña de Oportunidad IA'}
        </button>
      </div>

      {/* PANEL DE RESULTADO DE LA IA */}
      {campanaIA && (
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(156,39,176,0.05) 0%, rgba(103,58,183,0.05) 100%)', 
          border: '2px solid #9C27B0', borderRadius: '12px', padding: '25px', marginBottom: '30px',
          position: 'relative'
        }}>
          <button onClick={() => setCampanaIA('')} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
            <X size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <Brain size={24} color="#9C27B0" />
            <h2 style={{ margin: 0, color: '#9C27B0', fontSize: '20px' }}>Estrategia de Oportunidad Generada</h2>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', fontSize: '14px', lineHeight: '1.8', color: '#333', whiteSpace: 'pre-wrap' }}>
            {campanaIA}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '18px', borderTop: '4px solid #4CAF50', borderLeft: 'none', textAlign: 'center' }}>
          <ThumbsUp size={22} color="#4CAF50" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#4CAF50' }}>{contarPositivos}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Positivos</div>
        </div>
        <div className="card" style={{ padding: '18px', borderTop: '4px solid #F44336', borderLeft: 'none', textAlign: 'center' }}>
          <ThumbsDown size={22} color="#F44336" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#F44336' }}>{contarNegativos}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Negativos</div>
        </div>
        <div className="card" style={{ padding: '18px', borderTop: '4px solid #9E9E9E', borderLeft: 'none', textAlign: 'center' }}>
          <Minus size={22} color="#9E9E9E" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#9E9E9E' }}>{contarNeutrales}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Neutrales</div>
        </div>
        <div className="card" style={{ padding: '18px', borderTop: '4px solid #F44336', borderLeft: 'none', textAlign: 'center' }}>
          <AlertTriangle size={22} color="#F44336" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#F44336' }}>{ataques}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Ataques</div>
        </div>
        <div className="card" style={{ padding: '18px', borderTop: '4px solid #2196F3', borderLeft: 'none', textAlign: 'center' }}>
          <TrendingUp size={22} color="#2196F3" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#2196F3' }}>{alcanceTotal.toLocaleString()}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Alcance Total</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#00A651' }}>
          <MessageCircle size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
          {filtradas.length} {filtradas.length === 1 ? 'publicación' : 'publicaciones'}
        </p>
        <button onClick={abrirModalNueva} className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
          <Plus size={16} /> Nueva Publicación
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '25px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input type="text" placeholder="Buscar contenido o autor..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ width: '100%', padding: '11px 11px 11px 40px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '14px', boxSizing: 'border-box' }} />
        </div>
        <select value={filtroRed} onChange={(e) => setFiltroRed(e.target.value)} style={{ padding: '11px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '14px', background: 'white' }}>
          <option value="">Todas las redes</option>
          {REDES.map(r => <option key={r.value} value={r.value}>{r.icono} {r.label}</option>)}
        </select>
        <select value={filtroSentimiento} onChange={(e) => setFiltroSentimiento(e.target.value)} style={{ padding: '11px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '14px', background: 'white' }}>
          <option value="">Todos los sentimientos</option>
          {SENTIMIENTOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {filtradas.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <MessageCircle size={40} color="#00A651" style={{ opacity: 0.5, marginBottom: '15px' }} />
          <p style={{ color: '#666', fontSize: '15px' }}>No hay publicaciones registradas.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '15px' }}>
          {filtradas.map(p => {
            const redInfo = getRedInfo(p.red_social);
            const sentimientoInfo = getSentimientoInfo(p.sentimiento || 'neutral');
            return (
              <div key={p.id} style={{ background: 'white', borderRadius: '10px', padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${sentimientoInfo.color}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ background: `${redInfo.color}20`, color: redInfo.color, padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                      {redInfo.icono} {redInfo.label}
                    </span>
                    <span style={{ background: `${sentimientoInfo.color}20`, color: sentimientoInfo.color, padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {sentimientoInfo.icono} {sentimientoInfo.label}
                    </span>
                    {p.es_ataque && <span style={{ background: '#FFEBEE', color: '#C62828', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>⚠️ ATAQUE</span>}
                  </div>
                  <button onClick={() => handleEliminar(p.id)} style={{ background: 'none', border: 'none', color: '#C62828', cursor: 'pointer', padding: '4px' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                {p.autor && <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>@{p.autor}</div>}
                {p.contenido && <p style={{ margin: 0, fontSize: '13px', color: '#333', lineHeight: '1.5' }}>{p.contenido}</p>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                  <div style={{ background: '#F9F9F9', padding: '8px', borderRadius: '6px' }}>
                    <div style={{ color: '#999', fontSize: '10px', fontWeight: 'bold' }}>ALCANCE</div>
                    <div style={{ color: '#2196F3', fontWeight: 'bold', marginTop: '2px' }}>{p.alcance.toLocaleString()}</div>
                  </div>
                  <div style={{ background: '#F9F9F9', padding: '8px', borderRadius: '6px' }}>
                    <div style={{ color: '#999', fontSize: '10px', fontWeight: 'bold' }}>INTERACCIONES</div>
                    <div style={{ color: '#9C27B0', fontWeight: 'bold', marginTop: '2px' }}>{p.interacciones.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: NUEVA PUBLICACIÓN */}
      {publicacionNueva && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#00A651', fontSize: '18px', margin: 0 }}>Nuevo Reporte de Radar</h3>
              <button onClick={() => setPublicacionNueva(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} /></button>
            </div>
            <form onSubmit={handleCrear} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Red social *</label>
                <select value={publicacionNueva.red_social} onChange={(e) => setPublicacionNueva({...publicacionNueva, red_social: e.target.value})} style={inputStyle}>
                  {REDES.map(r => <option key={r.value} value={r.value}>{r.icono} {r.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Sentimiento *</label>
                <select value={publicacionNueva.sentimiento} onChange={(e) => setPublicacionNueva({...publicacionNueva, sentimiento: e.target.value})} style={inputStyle}>
                  {SENTIMIENTOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Autor / Usuario</label>
                <input type="text" placeholder="@usuario" value={publicacionNueva.autor} onChange={(e) => setPublicacionNueva({...publicacionNueva, autor: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Contenido</label>
                <textarea rows={3} placeholder="Texto de la publicación..." value={publicacionNueva.contenido} onChange={(e) => setPublicacionNueva({...publicacionNueva, contenido: e.target.value})} style={{...inputStyle, resize: 'vertical', fontFamily: 'inherit'}} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Alcance</label>
                  <input type="text" inputMode="numeric" placeholder="0" value={publicacionNueva.alcance} onChange={(e) => setPublicacionNueva({...publicacionNueva, alcance: e.target.value.replace(/[^0-9]/g, '')})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Interacciones</label>
                  <input type="text" inputMode="numeric" placeholder="0" value={publicacionNueva.interacciones} onChange={(e) => setPublicacionNueva({...publicacionNueva, interacciones: e.target.value.replace(/[^0-9]/g, '')})} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="checkbox" checked={publicacionNueva.es_ataque} onChange={(e) => setPublicacionNueva({...publicacionNueva, es_ataque: e.target.checked})} style={{ width: '16px', height: '16px' }} />
                  Es un ataque
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="checkbox" checked={publicacionNueva.requiere_respuesta} onChange={(e) => setPublicacionNueva({...publicacionNueva, requiere_respuesta: e.target.checked})} style={{ width: '16px', height: '16px' }} />
                  Requiere respuesta
                </label>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setPublicacionNueva(null)} style={btnSecundario}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} disabled={guardando}>
                  {guardando ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : <><CheckCircle2 size={16} /> Registrar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN */}
      {confirmModal.visible && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', borderTop: `5px solid ${confirmModal.tipo === 'danger' ? '#C62828' : '#00A651'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <div style={{ background: confirmModal.tipo === 'danger' ? '#FFEBEE' : '#E8F5E9', color: confirmModal.tipo === 'danger' ? '#C62828' : '#00A651', width: '46px', height: '46px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {confirmModal.tipo === 'success' ? <CheckCircle2 size={26} /> : <AlertTriangle size={26} />}
                </div>
                <h3 style={{ margin: 0, fontSize: '17px', color: '#333' }}>{confirmModal.titulo}</h3>
              </div>
              <button onClick={cerrarConfirm} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#999" /></button>
            </div>
            <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.6', marginBottom: '25px' }}>{confirmModal.mensaje}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={cerrarConfirm} style={{ flex: 1, padding: '13px', background: '#F0F0F0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', color: '#666' }}>Cancelar</button>
              <button onClick={confirmModal.onConfirm} style={{ flex: 1, padding: '13px', background: confirmModal.tipo === 'danger' ? '#C62828' : '#00A651', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>Sí, confirmar</button>
            </div>
          </div>
        </div>
      )}

      <Toast mensaje={toastMensaje} visible={toastVisible} onClose={() => setToastVisible(false)} />
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '11px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '15px', boxSizing: 'border-box' };
const btnSecundario: React.CSSProperties = { flex: 1, padding: '12px', background: '#EEE', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };