// @ts-nocheck
import { useEffect, useState } from 'react';
import { 
  Search, Trash2, Plus, X, Loader2, CheckCircle2, 
  AlertTriangle, Mic, Phone, MessageSquare, MapPin, Brain
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Toast from '../components/Toast';
import { obtenerUbicacion, calcularDistanciaMetros } from '../lib/geolocalizacion';
import { offlineInsert } from '../lib/syncManager';

interface Encuesta {
  id: string;
  tipo: string;
  pregunta: string;
  respuesta: string | null;
  barrio_colonia_id: string | null;
  seccion_electoral_id: string | null;
  encuestador_id: string | null;
  fecha_encuesta: string;
  created_at: string;
  es_sospechosa?: boolean;
  barrios_colonias?: { nombre: string } | null;
}

interface ConfirmModalData {
  visible: boolean;
  titulo: string;
  mensaje: string;
  tipo: 'danger' | 'success' | 'warning';
  onConfirm: () => void;
}

const PREGUNTAS_ADN = {
  'adn_18_30': [
    "Si pudieras cambiar UNA SOLA COSA de Tula para quedarte a vivir aquí toda tu vida, ¿qué sería?",
    "¿Qué es lo que más te frustra de cómo te ven los políticos?",
    "Cuando escuchas a un candidato hablar, ¿qué palabra o frase te hace pensar 'este sí me entiende'?"
  ],
  'adn_31_50': [
    "¿Cuál es el mayor miedo que tienes sobre el futuro de tus hijos en este municipio?",
    "¿Qué significa para ti 'progreso'?",
    "¿Qué te hace sentir abandonado por las autoridades?"
  ],
  'adn_50_mas': [
    "¿Qué es lo que más extrañas de la Tula de antes?",
    "¿Qué te haría sentir respetado por un gobierno?",
    "¿Cuál es la herencia que más te preocupa dejarle a tu familia?"
  ]
};

export default function Encuestas() {
  const [encuestas, setEncuestas] = useState<Encuesta[]>([]);
  const [filtradas, setFiltradas] = useState<Encuesta[]>([]);
  const [barrios, setBarrios] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  
  const [modalAbierto, setModalAbierto] = useState(false);
  const [esModoADN, setEsModoADN] = useState(false);
  const [rangoEdadADN, setRangoEdadADN] = useState<'adn_18_30' | 'adn_31_50' | 'adn_50_mas'>('adn_18_30');
  
  const [encuestaNueva, setEncuestaNueva] = useState<any | null>(null);
  
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMensaje, setToastMensaje] = useState('');

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
      const [encuestasRes, barriosRes] = await Promise.all([
        supabase.from('encuestas').select('*, barrios_colonias(nombre)').order('created_at', { ascending: false }),
        supabase.from('barrios_colonias').select('id, nombre').order('nombre'),
      ]);
      
      if (encuestasRes.data) {
        setEncuestas(encuestasRes.data as any);
        setFiltradas(encuestasRes.data as any);
      }
      if (barriosRes.data) setBarrios(barriosRes.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    let resultado = [...encuestas];
    if (busqueda.trim() !== '') {
      const q = busqueda.toLowerCase();
      resultado = resultado.filter(e =>
        e.pregunta.toLowerCase().includes(q) ||
        (e.respuesta || '').toLowerCase().includes(q)
      );
    }
    if (filtroTipo) resultado = resultado.filter(e => e.tipo === filtroTipo);
    setFiltradas(resultado);
  }, [busqueda, filtroTipo, encuestas]);

  const abrirModal = (modoADN: boolean) => {
    setEsModoADN(modoADN);
    if (modoADN) {
      setRangoEdadADN('adn_18_30');
      setEncuestaNueva({
        tipo: 'adn_18_30',
        pregunta: PREGUNTAS_ADN['adn_18_30'][0],
        respuesta: '',
        barrio_colonia_id: '',
      });
    } else {
      setEncuestaNueva({
        tipo: 'territorial',
        pregunta: '',
        respuesta: '',
        barrio_colonia_id: '',
      });
    }
    setModalAbierto(true);
  };

  const handleCambioRangoADN = (rango: 'adn_18_30' | 'adn_31_50' | 'adn_50_mas') => {
    setRangoEdadADN(rango);
    setEncuestaNueva({...encuestaNueva, tipo: rango, pregunta: PREGUNTAS_ADN[rango][0]});
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!encuestaNueva) return;
    
    setGuardando(true);
    setToastMensaje('📍 Obteniendo ubicación GPS...');
    setToastVisible(true);

    const ubicacion = await obtenerUbicacion();

    if (!ubicacion) {
      setGuardando(false);
      mostrarConfirm(
        'Ubicación Requerida',
        'Para garantizar la transparencia de la campaña, es OBLIGATORIO permitir el acceso a tu ubicación GPS para poder registrar la encuesta. Por favor, activa los permisos en tu navegador e intenta de nuevo.',
        'danger',
        () => cerrarConfirm()
      );
      return;
    }

    let esSospechosa = false;
    if (encuestaNueva.barrio_colonia_id) {
      const { data: barrio } = await supabase
        .from('barrios_colonias')
        .select('latitud_centro, longitud_centro')
        .eq('id', encuestaNueva.barrio_colonia_id)
        .single();

      if (barrio?.latitud_centro && barrio?.longitud_centro) {
        const distancia = calcularDistanciaMetros(
          ubicacion.lat, ubicacion.lng, 
          barrio.latitud_centro, barrio.longitud_centro
        );
        if (distancia > 2000) {
          esSospechosa = true;
        }
      }
    }

    const { data: { user } } = await supabase.auth.getUser();

    const nuevaEncuesta = {
      tipo: encuestaNueva.tipo,
      pregunta: encuestaNueva.pregunta,
      respuesta: encuestaNueva.respuesta || null,
      barrio_colonia_id: encuestaNueva.barrio_colonia_id || null,
      latitud: ubicacion.lat,
      longitud: ubicacion.lng,
      precision_gps: ubicacion.precision,
      encuestador_id: user?.id || null,
      es_sospechosa: esSospechosa,
      created_at: new Date().toISOString(),
      barrios_colonias: barrios.find(b => b.id === encuestaNueva.barrio_colonia_id) ? { nombre: barrios.find(b => b.id === encuestaNueva.barrio_colonia_id)?.nombre } : null
    };

    // ✅ MODO OFFLINE
    const res = await offlineInsert('encuestas', nuevaEncuesta);

    if (res.ok) {
      setEncuestas([nuevaEncuesta, ...encuestas]);
      setModalAbierto(false);
      
      if (res.queued) {
        setToastMensaje('📡 Sin señal: Encuesta guardada localmente. Se subirá al recuperar internet.');
      } else if (esSospechosa) {
        setToastMensaje('⚠️ Encuesta guardada, pero el GPS NO coincide con el barrio.');
      } else {
        setToastMensaje('¡Encuesta registrada con ubicación correcta!');
      }
      setToastVisible(true);
    }
    setGuardando(false);
  };

  const handleEliminar = (id: string) => {
    mostrarConfirm(
      '¿Eliminar esta encuesta?',
      'Esta acción no se puede deshacer.',
      'danger',
      async () => {
        cerrarConfirm();
        const { error } = await supabase.from('encuestas').delete().eq('id', id);
        if (error) {
          setToastMensaje('Error al eliminar: ' + error.message);
          setToastVisible(true);
        } else {
          setEncuestas(encuestas.filter(e => e.id !== id));
          setToastMensaje('Encuesta eliminada');
          setToastVisible(true);
        }
      }
    );
  };

  const getTipoInfo = (tipo: string) => {
    if (tipo.startsWith('adn_')) return { label: 'ADN Emocional', color: '#9C27B0', icono: <Brain size={16} /> };
    if (tipo === 'telefonica') return { label: 'Telefónica', color: '#2196F3', icono: <Phone size={16} /> };
    if (tipo === 'digital') return { label: 'Digital', color: '#FF9800', icono: <MessageSquare size={16} /> };
    return { label: 'Territorial', color: '#00D4FF', icono: <Mic size={16} /> };
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px', gap: '10px', color: '#00D4FF' }}>
        <Loader2 size={32} /> Cargando encuestas...
      </div>
    );
  }

  return (
    <div>
      <h1 className="header-title">Encuestas Ciudadanas</h1>
      <p style={{ marginBottom: '20px', color: '#64748B', fontSize: '14px' }}>
        Registro de encuestas y sondeos. Alimenta al cerebro de la campaña.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '25px' }}>
        <div className="card" style={{ padding: '18px', borderTop: '4px solid #00D4FF', borderLeft: 'none', textAlign: 'center' }}>
          <Mic size={22} color="#00D4FF" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#00D4FF' }}>{encuestas.length}</div>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 'bold' }}>Totales</div>
        </div>
        <div className="card" style={{ padding: '18px', borderTop: '4px solid #9C27B0', borderLeft: 'none', textAlign: 'center' }}>
          <Brain size={22} color="#9C27B0" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#9C27B0' }}>
            {encuestas.filter(e => e.tipo.startsWith('adn_')).length}
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 'bold' }}>ADN Emocional</div>
        </div>
        <div className="card" style={{ padding: '18px', borderTop: '4px solid #F43F5E', borderLeft: 'none', textAlign: 'center' }}>
          <AlertTriangle size={22} color="#F43F5E" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#F43F5E' }}>
            {encuestas.filter(e => e.es_sospechosa).length}
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 'bold' }}>Sospechosas</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => abrirModal(false)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
            <Plus size={16} /> Nueva Encuesta
          </button>
          <button onClick={() => abrirModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', background: '#9C27B0', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            <Brain size={16} /> Nueva Encuesta ADN 🧬
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '25px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input type="text" placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ width: '100%', padding: '11px 11px 11px 40px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '14px', boxSizing: 'border-box' }} />
        </div>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} style={{ padding: '11px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '14px', background: 'white' }}>
          <option value="">Todos los tipos</option>
          <option value="territorial">Territorial</option>
          <option value="telefonica">Telefónica</option>
          <option value="digital">Digital</option>
          <option value="adn_18_30">ADN: 18-30 años</option>
          <option value="adn_31_50">ADN: 31-50 años</option>
          <option value="adn_50_mas">ADN: 50+ años</option>
        </select>
      </div>

      {filtradas.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Mic size={40} color="#00D4FF" style={{ opacity: 0.5, marginBottom: '15px' }} />
          <p style={{ color: '#64748B', fontSize: '15px' }}>No hay encuestas registradas.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '15px' }}>
          {filtradas.map(e => {
            const info = getTipoInfo(e.tipo);
            return (
              <div key={e.id} style={{ background: 'white', borderRadius: '10px', padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${e.es_sospechosa ? '#F43F5E' : info.color}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ background: `${info.color}20`, color: info.color, padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {info.icono} {info.label}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {e.es_sospechosa && (
                      <span style={{ background: '#FFE4E6', color: '#F43F5E', padding: '4px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertTriangle size={12} /> FUERA DE ZONA
                      </span>
                    )}
                    <button onClick={() => handleEliminar(e.id)} style={{ background: 'none', border: 'none', color: '#F43F5E', cursor: 'pointer', padding: '4px' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 'bold', marginBottom: '4px' }}>PREGUNTA</div>
                  <p style={{ margin: 0, fontSize: '14px', color: '#0F172A', fontWeight: '600', lineHeight: '1.4' }}>{e.pregunta}</p>
                </div>
                {e.respuesta && (
                  <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${e.es_sospechosa ? '#F43F5E' : info.color}` }}>
                    <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 'bold', marginBottom: '4px' }}>RESPUESTA</div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>{e.respuesta}</p>
                  </div>
                )}
                {e.barrios_colonias?.nombre && (
                  <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={12} color={e.es_sospechosa ? '#F43F5E' : '#00D4FF'} /> {e.barrios_colonias.nombre}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalAbierto && encuestaNueva && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: esModoADN ? '#9C27B0' : '#00D4FF', fontSize: '18px', margin: 0 }}>
                {esModoADN ? '🧬 Captura de ADN Emocional' : 'Nueva Encuesta Clásica'}
              </h3>
              <button onClick={() => setModalAbierto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} /></button>
            </div>

            <form onSubmit={handleCrear} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {esModoADN ? (
                <>
                  <div style={{ background: '#F3E5F5', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #9C27B0' }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#555' }}>
                      <strong>Instrucción:</strong> Pregunta la edad al ciudadano. Selecciona el rango y el sistema te dirá exactamente qué preguntar para descubrir su ADN.
                    </p>
                  </div>
                  <div>
                    <label style={labelStyle}>Rango de Edad *</label>
                    <select value={rangoEdadADN} onChange={(e) => handleCambioRangoADN(e.target.value as any)} style={inputStyle}>
                      <option value="adn_18_30">18 a 30 años (Jóvenes)</option>
                      <option value="adn_31_50">31 a 50 años (Adultos)</option>
                      <option value="adn_50_mas">50+ años (Mayores)</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Pregunta de Oro *</label>
                    <select 
                      value={encuestaNueva.pregunta} 
                      onChange={(e) => setEncuestaNueva({...encuestaNueva, pregunta: e.target.value})} 
                      style={{ ...inputStyle, fontWeight: 'bold', color: '#9C27B0' }}
                    >
                      {PREGUNTAS_ADN[rangoEdadADN].map((p, i) => (
                        <option key={i} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label style={labelStyle}>Tipo de encuesta *</label>
                    <select value={encuestaNueva.tipo} onChange={(e) => setEncuestaNueva({...encuestaNueva, tipo: e.target.value})} style={inputStyle}>
                      <option value="territorial">Territorial</option>
                      <option value="telefonica">Telefónica</option>
                      <option value="digital">Digital</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Pregunta *</label>
                    <textarea required rows={2} placeholder="Escribe la pregunta..." value={encuestaNueva.pregunta} onChange={(e) => setEncuestaNueva({...encuestaNueva, pregunta: e.target.value})} style={{...inputStyle, resize: 'vertical', fontFamily: 'inherit'}} />
                  </div>
                </>
              )}

              <div>
                <label style={labelStyle}>Respuesta del Ciudadano (Lo que te dijo) *</label>
                <textarea required rows={3} placeholder="Escribe textualmente lo que respondió..." value={encuestaNueva.respuesta} onChange={(e) => setEncuestaNueva({...encuestaNueva, respuesta: e.target.value})} style={{...inputStyle, resize: 'vertical', fontFamily: 'inherit'}} />
              </div>

              <div>
                <label style={labelStyle}>Barrio / Colonia</label>
                <select value={encuestaNueva.barrio_colonia_id} onChange={(e) => setEncuestaNueva({...encuestaNueva, barrio_colonia_id: e.target.value})} style={inputStyle}>
                  <option value="">Sin asignar</option>
                  {barrios.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setModalAbierto(false)} style={btnSecundario}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, background: esModoADN ? '#9C27B0' : undefined, border: 'none' }} disabled={guardando}>
                  {guardando ? <><Loader2 size={16} className="animate-spin" /> Obteniendo GPS...</> : 'Registrar Respuesta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmModal.visible && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', borderTop: `5px solid ${confirmModal.tipo === 'danger' ? '#F43F5E' : '#00D4FF'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <div style={{ background: confirmModal.tipo === 'danger' ? '#FFE4E6' : '#E0F2FE', color: confirmModal.tipo === 'danger' ? '#F43F5E' : '#00D4FF', width: '46px', height: '46px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {confirmModal.tipo === 'success' ? <CheckCircle2 size={26} /> : <AlertTriangle size={26} />}
                </div>
                <h3 style={{ margin: 0, fontSize: '17px', color: '#0F172A' }}>{confirmModal.titulo}</h3>
              </div>
              <button onClick={cerrarConfirm} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#64748B" /></button>
            </div>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', marginBottom: '25px' }}>{confirmModal.mensaje}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={cerrarConfirm} style={{ flex: 1, padding: '13px', background: '#F1F5F9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', color: '#64748B' }}>Cancelar</button>
              <button onClick={confirmModal.onConfirm} style={{ flex: 1, padding: '13px', background: confirmModal.tipo === 'danger' ? '#F43F5E' : '#00D4FF', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>Sí, confirmar</button>
            </div>
          </div>
        </div>
      )}

      <Toast mensaje={toastMensaje} visible={toastVisible} onClose={() => setToastVisible(false)} />
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '11px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '15px', boxSizing: 'border-box' };
const btnSecundario: React.CSSProperties = { flex: 1, padding: '12px', background: '#EEE', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };
