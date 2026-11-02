import { useEffect, useState } from 'react';
import { 
  Search, Trash2, Plus, X, Loader2, AlertTriangle, 
  Mic, Phone, MessageSquare, MapPin, Brain, ChevronLeft, ChevronRight
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
  created_at: string;
  es_sospechosa?: boolean;
  barrios_colonias?: { nombre: string } | null;
}

const PREGUNTAS_ADN: Record<string, string[]> = {
  'adn_18_30': ["Si pudieras cambiar UNA SOLA COSA de Tula para quedarte a vivir aquí toda tu vida, ¿qué sería?", "¿Qué es lo que más te frustra de cómo te ven los políticos?", "Cuando escuchas a un candidato hablar, ¿qué palabra o frase te hace pensar 'este sí me entiende'?"],
  'adn_31_50': ["¿Cuál es el mayor miedo que tienes sobre el futuro de tus hijos en este municipio?", "¿Qué significa para ti 'progreso'?", "¿Qué te hace sentir abandonado por las autoridades?"],
  'adn_50_mas': ["¿Qué es lo que más extrañas de la Tula de antes?", "¿Qué te haría sentir respetado por un gobierno?", "¿Cuál es la herencia que más te preocupa dejarle a tu familia?"]
};

export default function Encuestas() {
  const [encuestas, setEncuestas] = useState<Encuesta[]>([]);
  const [barrios, setBarrios] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  
  // 🚀 PAGINACIÓN
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 50;

  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  
  const [modalAbierto, setModalAbierto] = useState(false);
  const [esModoADN, setEsModoADN] = useState(false);
  const [rangoEdadADN, setRangoEdadADN] = useState<'adn_18_30' | 'adn_31_50' | 'adn_50_mas'>('adn_18_30');
  const [encuestaNueva, setEncuestaNueva] = useState<any | null>(null);
  
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMensaje, setToastMensaje] = useState('');
  const [confirmModal, setConfirmModal] = useState({ visible: false, id: '', titulo: '' });

  const fetchEncuestas = async () => {
    setLoading(true);
    let query = supabase.from('encuestas').select('*, barrios_colonias(nombre)', { count: 'exact' });
    
    if (busqueda.trim() !== '') query = query.ilike('pregunta', `%${busqueda}%`);
    if (filtroTipo) query = query.eq('tipo', filtroTipo);

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
    
    if (!error && data) {
      const procesadas = data.map((e: any) => ({
        ...e,
        barrios_colonias: Array.isArray(e.barrios_colonias) ? e.barrios_colonias[0] : e.barrios_colonias
      }));
      setEncuestas(procesadas as any);
      if (count !== null) setTotalCount(count);
    }
    setLoading(false);
  };

  useEffect(() => {
    const fetchBarrios = async () => {
      const { data } = await supabase.from('barrios_colonias').select('id, nombre').order('nombre');
      if (data) setBarrios(data);
    };
    fetchBarrios();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { setPage(0); fetchEncuestas(); }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, filtroTipo]);

  useEffect(() => { fetchEncuestas(); }, [page]);

  const abrirModal = (modoADN: boolean) => {
    setEsModoADN(modoADN);
    if (modoADN) {
      setRangoEdadADN('adn_18_30');
      setEncuestaNueva({ tipo: 'adn_18_30', pregunta: PREGUNTAS_ADN['adn_18_30'][0], respuesta: '', barrio_colonia_id: '' });
    } else {
      setEncuestaNueva({ tipo: 'territorial', pregunta: '', respuesta: '', barrio_colonia_id: '' });
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
    setToastMensaje('📍 Obteniendo ubicación GPS...'); setToastVisible(true);

    const ubicacion = await obtenerUbicacion();
    if (!ubicacion) {
      setGuardando(false);
      alert('Ubicación Requerida. Por favor, activa los permisos GPS en tu navegador.');
      return;
    }

    let esSospechosa = false;
    if (encuestaNueva.barrio_colonia_id) {
      const { data: barrio } = await supabase.from('barrios_colonias').select('latitud_centro, longitud_centro').eq('id', encuestaNueva.barrio_colonia_id).single();
      if (barrio?.latitud_centro && barrio?.longitud_centro) {
        const distancia = calcularDistanciaMetros(ubicacion.lat, ubicacion.lng, barrio.latitud_centro, barrio.longitud_centro);
        if (distancia > 2000) esSospechosa = true;
      }
    }

    const { data: { user } } = await supabase.auth.getUser();

    const payloadLimpio = {
      tipo: encuestaNueva.tipo, pregunta: encuestaNueva.pregunta, respuesta: encuestaNueva.respuesta || null,
      barrio_colonia_id: encuestaNueva.barrio_colonia_id || null,
      latitud: ubicacion.lat, longitud: ubicacion.lng, precision_gps: ubicacion.precision,
      encuestador_id: user?.id || null, es_sospechosa: esSospechosa, created_at: new Date().toISOString()
    };

    const res = await offlineInsert('encuestas', payloadLimpio);

    if (res.ok) {
      setModalAbierto(false);
      setToastMensaje(res.queued ? '📡 Sin señal: Encuesta guardada localmente.' : (esSospechosa ? '⚠️ Guardada, pero el GPS NO coincide.' : '¡Encuesta registrada con éxito!'));
      setToastVisible(true);
      fetchEncuestas();
    }
    setGuardando(false);
  };

  const handleEliminar = async () => {
    const { error } = await supabase.from('encuestas').delete().eq('id', confirmModal.id);
    if (!error) {
      setConfirmModal({ visible: false, id: '', titulo: '' });
      setToastMensaje('Encuesta eliminada'); setToastVisible(true);
      fetchEncuestas();
    }
  };

  const getTipoInfo = (tipo: string) => {
    if (tipo.startsWith('adn_')) return { label: 'ADN Emocional', color: '#9C27B0', icono: <Brain size={16} /> };
    if (tipo === 'telefonica') return { label: 'Telefónica', color: '#2196F3', icono: <Phone size={16} /> };
    if (tipo === 'digital') return { label: 'Digital', color: '#FF9800', icono: <MessageSquare size={16} /> };
    return { label: 'Territorial', color: '#00D4FF', icono: <Mic size={16} /> };
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      <h1 className="header-title">Encuestas Ciudadanas</h1>
      <p style={{ marginBottom: '20px', color: '#64748B', fontSize: '14px' }}>Total en base de datos: <strong>{totalCount.toLocaleString()}</strong> encuestas.</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => abrirModal(false)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}><Plus size={16} /> Nueva Encuesta</button>
          <button onClick={() => abrirModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', background: '#9C27B0', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}><Brain size={16} /> Nueva ADN 🧬</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '25px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input type="text" placeholder="Buscar en toda la base de datos..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ width: '100%', padding: '11px 11px 11px 40px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '14px', boxSizing: 'border-box' }} />
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

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '50px', color: '#00D4FF' }}><Loader2 size={32} className="animate-spin" /> Buscando en el servidor...</div>
      ) : encuestas.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}><Mic size={40} color="#00D4FF" style={{ opacity: 0.5, marginBottom: '15px' }} /><p style={{ color: '#64748B', fontSize: '15px' }}>No hay encuestas registradas.</p></div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '15px', marginBottom: '20px' }}>
            {encuestas.map(e => {
              const info = getTipoInfo(e.tipo);
              return (
                <div key={e.id} style={{ background: 'white', borderRadius: '10px', padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${e.es_sospechosa ? '#F43F5E' : info.color}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ background: `${info.color}20`, color: info.color, padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>{info.icono} {info.label}</div>
                    <button onClick={() => setConfirmModal({ visible: true, id: e.id, titulo: '¿Eliminar encuesta?' })} style={{ background: 'none', border: 'none', color: '#F43F5E', cursor: 'pointer', padding: '4px' }}><Trash2 size={14} /></button>
                  </div>
                  <div><div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 'bold', marginBottom: '4px' }}>PREGUNTA</div><p style={{ margin: 0, fontSize: '14px', color: '#0F172A', fontWeight: '600', lineHeight: '1.4' }}>{e.pregunta}</p></div>
                  {e.respuesta && <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${e.es_sospechosa ? '#F43F5E' : info.color}` }}><div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 'bold', marginBottom: '4px' }}>RESPUESTA</div><p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>{e.respuesta}</p></div>}
                  {e.barrios_colonias?.nombre && <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={12} color={e.es_sospechosa ? '#F43F5E' : '#00D4FF'} /> {e.barrios_colonias.nombre}</div>}
                </div>
              );
            })}
          </div>
          
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', background: 'white', padding: '15px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 16px', background: page === 0 ? '#F0F0F0' : 'white', color: page === 0 ? '#999' : '#00D4FF', border: '1px solid #E2E8F0', borderRadius: '6px', cursor: page === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}><ChevronLeft size={16} /> Anterior</button>
              <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 'bold' }}>Página {page + 1} de {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 16px', background: page === totalPages - 1 ? '#F0F0F0' : 'white', color: page === totalPages - 1 ? '#999' : '#00D4FF', border: '1px solid #E2E8F0', borderRadius: '6px', cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>Siguiente <ChevronRight size={16} /></button>
            </div>
          )}
        </>
      )}

      {/* Modal simplificado para no alargar el codigo, usa el mismo de tu version anterior */}
      {modalAbierto && encuestaNueva && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
           {/* Pega aquí tu modal de nueva encuesta, no ha cambiado nada en él */}
           <div style={{ background: 'white', padding: '25px', borderRadius: '12px', textAlign: 'center' }}>
              <p>El modal de encuesta se mantiene igual.</p>
              <button onClick={() => setModalAbierto(false)}>Cerrar</button>
           </div>
        </div>
      )}

      {confirmModal.visible && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '440px', textAlign: 'center' }}>
            <h3 style={{ color: '#F43F5E' }}>{confirmModal.titulo}</h3>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setConfirmModal({ visible: false, id: '', titulo: '' })} style={{ flex: 1, padding: '13px', background: '#F1F5F9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
              <button onClick={handleEliminar} style={{ flex: 1, padding: '13px', background: '#F43F5E', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
      <Toast mensaje={toastMensaje} visible={toastVisible} onClose={() => setToastVisible(false)} />
    </div>
  );
}
