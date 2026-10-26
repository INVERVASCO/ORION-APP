import { useEffect, useState } from 'react';
import { 
  User, Phone, Plus, Trash2, X, Loader2, Briefcase, 
  AlertTriangle, CheckCircle2 
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Toast from './Toast';
import { obtenerOCrearPersona } from '../lib/personaHelper';

interface Activista {
  id: string;
  tipo_cargo: string;
  periodo: string | null;
  personas: { nombre_completo: string; telefono: string | null; ocupacion: string | null; } | null;
}

interface Props {
  barrioId: string | undefined;
}

interface ConfirmModalData {
  visible: boolean;
  titulo: string;
  mensaje: string;
  tipo: 'danger' | 'success' | 'warning';
  onConfirm: () => void;
}

export default function ActivismoSection({ barrioId }: Props) {
  const [activistas, setActivistas] = useState<Activista[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMensaje, setToastMensaje] = useState('');
  
  const [nuevo, setNuevo] = useState({
    nombre_completo: '',
    telefono: '',
    ocupacion: '',
    tipo_cargo: 'Presidente',
    periodo: new Date().getFullYear() + '-' + (new Date().getFullYear() + 3)
  });

  // Modal de confirmación flotante
  const [confirmModal, setConfirmModal] = useState<ConfirmModalData>({
    visible: false, titulo: '', mensaje: '', tipo: 'warning', onConfirm: () => {},
  });

  const mostrarConfirm = (titulo: string, mensaje: string, tipo: 'danger' | 'success' | 'warning', onConfirm: () => void) => {
    setConfirmModal({ visible: true, titulo, mensaje, tipo, onConfirm });
  };
  const cerrarConfirm = () => setConfirmModal({ ...confirmModal, visible: false });

  // Cargar activistas del barrio
  useEffect(() => {
    const fetchActivistas = async () => {
      if (!barrioId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('activismo')
        .select('id, tipo_cargo, periodo, personas(nombre_completo, telefono, ocupacion)')
        .eq('barrio_colonia_id', barrioId)
        .order('tipo_cargo');

      if (!error && data) setActivistas(data as any);
      setLoading(false);
    };
    fetchActivistas();
  }, [barrioId]);

  // Guardar activista (crea o reutiliza persona + registro de activismo)
  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barrioId) return;
    setGuardando(true);

    // 1. Buscar o crear la persona
    const resultado = await obtenerOCrearPersona({
      nombre_completo: nuevo.nombre_completo,
      telefono: nuevo.telefono || null,
      ocupacion: nuevo.ocupacion || null,
      barrio_colonia_id: barrioId,
      origen_captura: 'Brigada',
    });

    if (!resultado) {
      setToastMensaje('Error al crear la persona. Verifica los datos.');
      setToastVisible(true);
      setGuardando(false);
      return;
    }

    const personaId = resultado.id;
    const esPersonaNueva = resultado.esNueva;

    // 2. Crear el registro de activismo
    const { data: activismoData, error: activismoError } = await supabase
      .from('activismo')
      .insert([{
        barrio_colonia_id: barrioId,
        persona_id: personaId,
        tipo_cargo: nuevo.tipo_cargo,
        periodo: nuevo.periodo
      }])
      .select('id, tipo_cargo, periodo, personas(nombre_completo, telefono, ocupacion)')
      .single();

    if (activismoError) {
      setToastMensaje('Error al guardar activista: ' + activismoError.message);
      setToastVisible(true);
    } else if (activismoData) {
      setActivistas([...activistas, activismoData as any]);
      setModalAbierto(false);
      setNuevo({
        nombre_completo: '',
        telefono: '',
        ocupacion: '',
        tipo_cargo: 'Presidente',
        periodo: new Date().getFullYear() + '-' + (new Date().getFullYear() + 3)
      });
      setToastMensaje(esPersonaNueva 
        ? `¡${nuevo.nombre_completo} registrado por primera vez!` 
        : `¡Vinculado! ${nuevo.nombre_completo} ya estaba registrado. Se agregó el cargo de ${nuevo.tipo_cargo}.`);
      setToastVisible(true);
    }
    setGuardando(false);
  };

  // Eliminar activista con modal flotante
  const handleEliminar = (id: string, nombre: string) => {
    mostrarConfirm(
      '¿Eliminar a este integrante?',
      `Se eliminará a "${nombre}" de la estructura de activismo. Esta acción no se puede deshacer.`,
      'danger',
      async () => {
        cerrarConfirm();
        const { error } = await supabase.from('activismo').delete().eq('id', id);
        if (!error) {
          setActivistas(activistas.filter(a => a.id !== id));
          setToastMensaje('Integrante eliminado');
          setToastVisible(true);
        }
      }
    );
  };

  if (loading) return <p style={{ padding: '20px', color: '#9F2241' }}>Cargando activismo...</p>;

  const cargos = ['Presidente', 'Secretario', 'Vocal'];
  const colorCargo: Record<string, string> = {
    'Presidente': '#9F2241',
    'Secretario': '#6F1A2D',
    'Vocal': '#B85671'
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <p style={{ margin: 0, fontSize: '14px' }}>
          Estructura de activismo: <strong>{activistas.length}</strong> integrantes capturados
        </p>
        <button className="btn-primary" onClick={() => setModalAbierto(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
          <Plus size={16} /> Agregar Integrante
        </button>
      </div>

      {/* Resumen por cargo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginBottom: '25px' }}>
        {cargos.map(cargo => {
          const count = activistas.filter(a => a.tipo_cargo === cargo).length;
          return (
            <div key={cargo} style={{
              background: 'white', padding: '15px', borderRadius: '8px',
              borderTop: `4px solid ${colorCargo[cargo]}`, textAlign: 'center',
              boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
            }}>
              <div style={{ fontSize: '26px', fontWeight: 'bold', color: colorCargo[cargo] }}>{count}</div>
              <div style={{ fontSize: '13px', color: '#666', fontWeight: 'bold' }}>{cargo}s</div>
            </div>
          );
        })}
      </div>

      {/* Lista de activistas por cargo */}
      {cargos.map(cargo => {
        const integrantes = activistas.filter(a => a.tipo_cargo === cargo);
        if (integrantes.length === 0) return null;
        return (
          <div key={cargo} className="card" style={{ borderLeftColor: colorCargo[cargo] }}>
            <h3 style={{ color: colorCargo[cargo], marginBottom: '15px', fontSize: '16px' }}>
              {cargo}s ({integrantes.length})
            </h3>
            {integrantes.map(integrante => (
              <div key={integrante.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px', background: '#F9F9F9', borderRadius: '8px',
                marginBottom: '8px', gap: '10px', borderLeft: `3px solid ${colorCargo[cargo]}`
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <User size={16} color={colorCargo[cargo]} />
                    <strong style={{ fontSize: '14px', wordBreak: 'break-word' }}>
                      {integrante.personas?.nombre_completo || 'Sin nombre'}
                    </strong>
                  </div>
                  {integrante.personas?.telefono && (
                    <div style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                      <Phone size={12} /> {integrante.personas.telefono}
                    </div>
                  )}
                  {integrante.personas?.ocupacion && (
                    <div style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <Briefcase size={12} /> {integrante.personas.ocupacion}
                    </div>
                  )}
                  {integrante.periodo && (
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '3px' }}>
                      Periodo: {integrante.periodo}
                    </div>
                  )}
                </div>
                <button onClick={() => handleEliminar(integrante.id, integrante.personas?.nombre_completo || 'Sin nombre')}
                  style={{ background: 'none', border: 'none', color: '#C62828', cursor: 'pointer', padding: '5px' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        );
      })}

      {activistas.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <User size={40} color="#9F2241" style={{ marginBottom: '15px', opacity: 0.5 }} />
          <p style={{ color: '#666', fontSize: '15px' }}>
            Aún no hay integrantes del activismo capturados para este barrio/colonia.
          </p>
          <p style={{ color: '#999', fontSize: '13px', marginTop: '8px' }}>
            Presiona "Agregar Integrante" para comenzar.
          </p>
        </div>
      )}

      {/* Modal de captura */}
      {modalAbierto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#9F2241', fontSize: '18px' }}>Nuevo Integrante de Activismo</h3>
              <button onClick={() => setModalAbierto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Nombre completo *</label>
                <input required type="text" placeholder="Nombre del integrante" value={nuevo.nombre_completo}
                  onChange={(e) => setNuevo({...nuevo, nombre_completo: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Teléfono</label>
                <input type="tel" placeholder="Ej. 7712345678" value={nuevo.telefono}
                  onChange={(e) => setNuevo({...nuevo, telefono: e.target.value})} style={inputStyle} />
                <p style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                  Si el teléfono ya existe, se vinculará a la persona registrada.
                </p>
              </div>
              <div>
                <label style={labelStyle}>Ocupación</label>
                <input type="text" placeholder="Ej. Comerciante, Maestro, Hogar..." value={nuevo.ocupacion}
                  onChange={(e) => setNuevo({...nuevo, ocupacion: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Cargo *</label>
                <select value={nuevo.tipo_cargo}
                  onChange={(e) => setNuevo({...nuevo, tipo_cargo: e.target.value})} style={inputStyle}>
                  <option>Presidente</option>
                  <option>Secretario</option>
                  <option>Vocal</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Periodo</label>
                <input type="text" placeholder="Ej. 2025-2028" value={nuevo.periodo}
                  onChange={(e) => setNuevo({...nuevo, periodo: e.target.value})} style={inputStyle} />
              </div>
              <div style={{ fontSize: '12px', color: '#666', padding: '10px', background: '#FFF8E1', borderRadius: '6px', borderLeft: '3px solid #F9A825' }}>
                Al guardar, se registra el consentimiento del titular para el tratamiento de sus datos personales (LFPDPPP).
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                <button type="button" onClick={() => setModalAbierto(false)} style={btnSecundario}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} disabled={guardando}>
                  {guardando ? <><Loader2 size={16} /> Guardando...</> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
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

      {/* Toast de éxito */}
      <Toast mensaje={toastMensaje} visible={toastVisible} onClose={() => setToastVisible(false)} />
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '11px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '15px', boxSizing: 'border-box' };
const btnSecundario: React.CSSProperties = { flex: 1, padding: '12px', background: '#EEE', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };