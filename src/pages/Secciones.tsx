import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom'; // <-- NUEVA IMPORTACIÓN
import { 
  Search, Loader2, MapPin, Save, Hash, Building2,
  AlertTriangle, CheckCircle2, X
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Toast from '../components/Toast';

interface Seccion {
  id: string;
  numero_seccion: number;
  barrio_colonia_id: string | null;
  barrio_actual: string | null;
  casillas_count: number;
}

interface ConfirmModalData {
  visible: boolean;
  titulo: string;
  mensaje: string;
  tipo: 'danger' | 'success' | 'warning';
  onConfirm: () => void;
}

export default function Secciones() {
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [seccionesFiltradas, setSeccionesFiltradas] = useState<Seccion[]>([]);
  const [barrios, setBarrios] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [guardando, setGuardando] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMensaje, setToastMensaje] = useState('');

  // 🚀 NUEVO: Leer la sección desde la URL
  const [searchParams] = useSearchParams();
  const seccionUrl = searchParams.get('seccion');

  // Modal de confirmación flotante
  const [confirmModal, setConfirmModal] = useState<ConfirmModalData>({
    visible: false, titulo: '', mensaje: '', tipo: 'warning', onConfirm: () => {},
  });

  const mostrarConfirm = (titulo: string, mensaje: string, tipo: 'danger' | 'success' | 'warning', onConfirm: () => void) => {
    setConfirmModal({ visible: true, titulo, mensaje, tipo, onConfirm });
  };
  const cerrarConfirm = () => setConfirmModal({ ...confirmModal, visible: false });

  // 🚀 NUEVO: Efecto para aplicar el filtro automático si viene de la URL
  useEffect(() => {
    if (seccionUrl) {
      // La URL trae la sección federal (ej. 1508). Le restamos 54 para buscar en la BD.
      const localSeccion = Number(seccionUrl) - 54;
      setBusqueda(localSeccion.toString());
    }
  }, [seccionUrl]);

  // Cargar datos
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: barriosData } = await supabase
        .from('barrios_colonias')
        .select('id, nombre')
        .order('nombre');
      if (barriosData) setBarrios(barriosData);

      const { data: seccionesData } = await supabase
        .from('secciones_electorales')
        .select('id, numero_seccion, barrio_colonia_id, barrios_colonias(nombre)')
        .order('numero_seccion');
      
      const { data: casillasData } = await supabase
        .from('casillas')
        .select('seccion_id');
      
      const conteoCasillas: Record<string, number> = {};
      casillasData?.forEach(c => {
        conteoCasillas[c.seccion_id] = (conteoCasillas[c.seccion_id] || 0) + 1;
      });

      if (seccionesData) {
        const seccionesConBarrio = seccionesData.map((s: any) => ({
          id: s.id,
          numero_seccion: s.numero_seccion,
          barrio_colonia_id: s.barrio_colonia_id,
          barrio_actual: s.barrios_colonias?.nombre || null,
          casillas_count: conteoCasillas[s.id] || 0,
        }));
        setSecciones(seccionesConBarrio);
        setSeccionesFiltradas(seccionesConBarrio);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // Filtro
  useEffect(() => {
    if (busqueda.trim() === '') {
      setSeccionesFiltradas(secciones);
    } else {
      const q = busqueda.toLowerCase();
      setSeccionesFiltradas(secciones.filter(s =>
        s.numero_seccion.toString().includes(q) ||
        (s.barrio_actual && s.barrio_actual.toLowerCase().includes(q))
      ));
    }
  }, [busqueda, secciones]);

  // Cambiar barrio de una sección
  const handleAsignar = async (seccionId: string, nuevoBarrioId: string, numeroSeccion: number) => {
    setGuardando(seccionId);
    const barrioId = nuevoBarrioId || null;

    const { error } = await supabase
      .from('secciones_electorales')
      .update({ barrio_colonia_id: barrioId })
      .eq('id', seccionId);

    if (error) {
      setToastMensaje('Error al reasignar: ' + error.message);
      setToastVisible(true);
    } else {
      const nombreBarrio = barrioId ? barrios.find(b => b.id === barrioId)?.nombre || null : null;
      setSecciones(secciones.map(s =>
        s.id === seccionId ? { ...s, barrio_colonia_id: barrioId, barrio_actual: nombreBarrio } : s
      ));
      setToastMensaje(`Sección ${numeroSeccion} reasignada a ${nombreBarrio || 'Sin asignar'}`);
      setToastVisible(true);
    }
    setGuardando(null);
  };

  // Cambiar barrio con confirmación
  const handleCambiarBarrio = (seccionId: string, nuevoBarrioId: string, numeroSeccion: number, barrioActual: string | null) => {
    const nombreNuevoBarrio = nuevoBarrioId 
      ? barrios.find(b => b.id === nuevoBarrioId)?.nombre || 'Desconocido'
      : 'Sin asignar';

    if (!barrioActual) {
      handleAsignar(seccionId, nuevoBarrioId, numeroSeccion);
      return;
    }

    mostrarConfirm(
      '¿Reasignar esta sección?',
      `La Sección ${numeroSeccion} cambiará del barrio "${barrioActual}" al barrio "${nombreNuevoBarrio}". Esto puede afectar los reportes y pronósticos.`,
      'warning',
      () => {
        cerrarConfirm();
        handleAsignar(seccionId, nuevoBarrioId, numeroSeccion);
      }
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px', gap: '10px', color: '#9F2241' }}>
        <Loader2 size={32} /> Cargando secciones...
      </div>
    );
  }

  const asignadas = secciones.filter(s => s.barrio_colonia_id).length;
  const sinAsignar = secciones.length - asignadas;

  return (
    <div>
      <h1 className="header-title">Secciones Electorales</h1>
      <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
        Administra la asignación de las {secciones.length} secciones electorales de Tula de Allende a sus barrios y colonias.
      </p>

      {/* Banner de aviso si viene desde el mapa */}
      {seccionUrl && (
        <div style={{ background: '#E3F2FD', borderLeft: '4px solid #2196F3', padding: '12px 15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={18} color="#2196F3" />
          <span style={{ fontSize: '14px', color: '#333' }}>
            Mostrando resultado para la sección <strong>{seccionUrl}</strong> (Local: {Number(seccionUrl) - 54})
          </span>
          <button onClick={() => setBusqueda('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#2196F3', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', textDecoration: 'underline' }}>
            Ver todas
          </button>
        </div>
      )}

      {/* Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '25px' }}>
        <div className="card" style={{ padding: '18px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#9F2241' }}>{asignadas}</div>
          <div style={{ fontSize: '13px', color: '#666' }}>Asignadas</div>
        </div>
        <div className="card" style={{ padding: '18px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: sinAsignar > 0 ? '#C62828' : '#2E7D32' }}>{sinAsignar}</div>
          <div style={{ fontSize: '13px', color: '#666' }}>Sin asignar</div>
        </div>
        <div className="card" style={{ padding: '18px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#9F2241' }}>{barrios.length}</div>
          <div style={{ fontSize: '13px', color: '#666' }}>Barrios disponibles</div>
        </div>
      </div>

      {/* Buscador */}
      <div style={{ position: 'relative', marginBottom: '20px', maxWidth: '500px' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
        <input
          type="text"
          placeholder="Buscar por número de sección o barrio..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ width: '100%', padding: '11px 11px 11px 40px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '14px', boxSizing: 'border-box' }}
        />
      </div>

      {/* Lista de secciones */}
      {seccionesFiltradas.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Hash size={40} color="#9F2241" style={{ opacity: 0.5, marginBottom: '15px' }} />
          <p style={{ color: '#666', fontSize: '15px' }}>No se encontraron secciones con ese criterio.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
          {seccionesFiltradas.map(s => (
            <div key={s.id} style={{
              background: 'white', borderRadius: '10px', padding: '18px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              borderLeft: `4px solid ${s.barrio_colonia_id ? '#9F2241' : '#C62828'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Hash size={18} color="#9F2241" />
                  <strong style={{ fontSize: '16px', color: '#333' }}>
                    Sección {s.numero_seccion}
                  </strong>
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                  background: s.barrio_colonia_id ? '#9F2241' : '#FFEBEE',
                  color: s.barrio_colonia_id ? 'white' : '#C62828',
                }}>
                  {s.casillas_count} casilla{s.casillas_count !== 1 ? 's' : ''}
                </span>
              </div>

              <div style={{ fontSize: '13px', color: '#666', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={14} color="#9F2241" />
                <span style={{ color: s.barrio_actual ? '#333' : '#C62828', fontWeight: s.barrio_actual ? 'normal' : 'bold' }}>
                  {s.barrio_actual || 'Sin asignar'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={16} color="#666" />
                <select
                  value={s.barrio_colonia_id || ''}
                  onChange={(e) => handleCambiarBarrio(s.id, e.target.value, s.numero_seccion, s.barrio_actual)}
                  disabled={guardando === s.id}
                  style={{
                    flex: 1, padding: '9px', borderRadius: '6px',
                    border: '1px solid #E0E0E0', fontSize: '13px',
                    background: 'white', cursor: 'pointer'
                  }}
                >
                  <option value="">Sin asignar</option>
                  {barrios.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
                {guardando === s.id && <Loader2 size={16} className="animate-spin" />}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN FLOTANTE */}
      {confirmModal.visible && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', borderTop: `5px solid ${confirmModal.tipo === 'danger' ? '#C62828' : confirmModal.tipo === 'success' ? '#2E7D32' : '#F9A825'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                <div style={{ background: confirmModal.tipo === 'danger' ? '#FFEBEE' : confirmModal.tipo === 'success' ? '#E8F5E9' : '#FFF8E1', color: confirmModal.tipo === 'danger' ? '#C62828' : confirmModal.tipo === 'success' ? '#2E7D32' : '#F9A825', width: '46px', height: '46px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {confirmModal.tipo === 'success' ? <CheckCircle2 size={26} /> : <AlertTriangle size={26} />}
                </div>
                <h3 style={{ margin: 0, fontSize: '17px', color: '#333', wordBreak: 'break-word', lineHeight: '1.3' }}>{confirmModal.titulo}</h3>
              </div>
              <button onClick={cerrarConfirm} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', marginLeft: '8px' }}>
                <X size={20} color="#999" />
              </button>
            </div>
            <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.6', marginBottom: '25px' }}>{confirmModal.mensaje}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={cerrarConfirm} style={{ flex: 1, padding: '13px', background: '#F0F0F0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', color: '#666' }}>Cancelar</button>
              <button onClick={confirmModal.onConfirm} style={{ flex: 1, padding: '13px', background: confirmModal.tipo === 'danger' ? '#C62828' : confirmModal.tipo === 'success' ? '#2E7D32' : '#F9A825', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>Sí, confirmar</button>
            </div>
          </div>
        </div>
      )}

      <Toast mensaje={toastMensaje} visible={toastVisible} onClose={() => setToastVisible(false)} />
    </div>
  );
}