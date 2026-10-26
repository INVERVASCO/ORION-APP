import { useEffect, useState } from 'react';
import { 
  Search, User, Phone, Briefcase, MapPin, Trash2, Loader2, Users, Award,
  AlertTriangle, CheckCircle2, X
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Toast from '../components/Toast';

interface ActivistaGlobal {
  id: string;
  tipo_cargo: string;
  periodo: string | null;
  barrio_colonia_id: string;
  personas: { nombre_completo: string; telefono: string | null; ocupacion: string | null; } | null;
  barrios_colonias: { nombre: string; tipo: string; } | null;
}

interface ConfirmModalData {
  visible: boolean;
  titulo: string;
  mensaje: string;
  tipo: 'danger' | 'success' | 'warning';
  onConfirm: () => void;
}

export default function ActivismoGlobal() {
  const [activistas, setActivistas] = useState<ActivistaGlobal[]>([]);
  const [filtrados, setFiltrados] = useState<ActivistaGlobal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCargo, setFiltroCargo] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMensaje, setToastMensaje] = useState('');

  // Modal de confirmación flotante
  const [confirmModal, setConfirmModal] = useState<ConfirmModalData>({
    visible: false, titulo: '', mensaje: '', tipo: 'warning', onConfirm: () => {},
  });

  const mostrarConfirm = (titulo: string, mensaje: string, tipo: 'danger' | 'success' | 'warning', onConfirm: () => void) => {
    setConfirmModal({ visible: true, titulo, mensaje, tipo, onConfirm });
  };
  const cerrarConfirm = () => setConfirmModal({ ...confirmModal, visible: false });

  // Cargar datos
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('activismo')
        .select(`
          id,
          tipo_cargo,
          periodo,
          barrio_colonia_id,
          personas(nombre_completo, telefono, ocupacion),
          barrios_colonias(nombre, tipo)
        `)
        .order('tipo_cargo');

      if (!error && data) {
        setActivistas(data as any);
        setFiltrados(data as any);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // Filtros
  useEffect(() => {
    let result = [...activistas];
    if (busqueda.trim() !== '') {
      const q = busqueda.toLowerCase();
      result = result.filter(a =>
        (a.personas?.nombre_completo || '').toLowerCase().includes(q) ||
        (a.personas?.telefono || '').includes(q) ||
        (a.barrios_colonias?.nombre || '').toLowerCase().includes(q)
      );
    }
    if (filtroCargo) {
      result = result.filter(a => a.tipo_cargo === filtroCargo);
    }
    setFiltrados(result);
  }, [busqueda, filtroCargo, activistas]);

  // Eliminar con modal flotante
  const handleEliminar = (id: string, nombre: string) => {
    mostrarConfirm(
      '¿Eliminar a este integrante?',
      `Se eliminará a "${nombre}" de la estructura de activismo municipal. Esta acción no se puede deshacer.`,
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px', gap: '10px', color: '#9F2241' }}>
        <Loader2 size={32} /> Cargando estructura de activismo...
      </div>
    );
  }

  const cargos = ['Presidente', 'Secretario', 'Vocal'];
  const colorCargo: Record<string, string> = {
    'Presidente': '#9F2241',
    'Secretario': '#6F1A2D',
    'Vocal': '#B85671'
  };

  const conteoPorCargo: Record<string, number> = {};
  cargos.forEach(c => { conteoPorCargo[c] = activistas.filter(a => a.tipo_cargo === c).length; });

  const barriosCubiertos = new Set(activistas.map(a => a.barrio_colonia_id)).size;

  return (
    <div>
      <h1 className="header-title">Activismo Municipal</h1>
      <p style={{ marginBottom: '25px', color: '#666', fontSize: '14px' }}>
        Vista global de toda la estructura de activismo de Tula de Allende.
      </p>

      {/* Resumen por cargo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        {cargos.map(cargo => (
          <div key={cargo} className="card" style={{ padding: '15px', textAlign: 'center', borderTop: `4px solid ${colorCargo[cargo]}`, borderLeft: 'none' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: colorCargo[cargo] }}>{conteoPorCargo[cargo]}</div>
            <div style={{ fontSize: '13px', color: '#666', fontWeight: 'bold' }}>{cargo}s</div>
          </div>
        ))}
        <div className="card" style={{ padding: '15px', textAlign: 'center', borderTop: '4px solid #2E7D32', borderLeft: 'none' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2E7D32' }}>{barriosCubiertos}</div>
          <div style={{ fontSize: '13px', color: '#666', fontWeight: 'bold' }}>Barrios con estructura</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '25px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input
            type="text"
            placeholder="Buscar nombre, teléfono o barrio..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ width: '100%', padding: '11px 11px 11px 40px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>
        <select value={filtroCargo} onChange={(e) => setFiltroCargo(e.target.value)}
          style={{ padding: '11px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '14px', background: 'white' }}>
          <option value="">Todos los cargos</option>
          <option value="Presidente">Presidentes</option>
          <option value="Secretario">Secretarios</option>
          <option value="Vocal">Vocales</option>
        </select>
      </div>

      <p style={{ marginBottom: '15px', fontSize: '14px', color: '#666' }}>
        Mostrando <strong>{filtrados.length}</strong> de {activistas.length} integrantes
      </p>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Users size={40} color="#9F2241" style={{ opacity: 0.5, marginBottom: '15px' }} />
          <p style={{ color: '#666', fontSize: '15px' }}>
            {activistas.length === 0 ? 'Aún no hay integrantes de activismo capturados.' : 'No se encontraron resultados con los filtros aplicados.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
          {filtrados.map(a => (
            <div key={a.id} style={{
              background: 'white', borderRadius: '10px', padding: '15px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              borderLeft: `4px solid ${colorCargo[a.tipo_cargo] || '#9F2241'}`,
              display: 'flex', flexDirection: 'column', gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                  <div style={{
                    background: colorCargo[a.tipo_cargo] || '#9F2241', color: 'white',
                    width: '36px', height: '36px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold', fontSize: '15px', flexShrink: 0
                  }}>
                    {(a.personas?.nombre_completo || 'S').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '14px', wordBreak: 'break-word', color: '#333' }}>
                      {a.personas?.nombre_completo || 'Sin nombre'}
                    </h3>
                    <span style={{
                      display: 'inline-block', marginTop: '3px', padding: '2px 8px',
                      background: colorCargo[a.tipo_cargo] || '#9F2241',
                      color: 'white', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold'
                    }}>
                      {a.tipo_cargo}
                    </span>
                  </div>
                </div>
              </div>

              {a.barrios_colonias?.nombre && (
                <div style={{ fontSize: '13px', color: '#555', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={13} color="#9F2241" />
                  <strong>{a.barrios_colonias.nombre}</strong>
                </div>
              )}
              {a.personas?.telefono && (
                <div style={{ fontSize: '13px', color: '#555', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={13} color="#9F2241" /> {a.personas.telefono}
                </div>
              )}
              {a.personas?.ocupacion && (
                <div style={{ fontSize: '13px', color: '#555', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Briefcase size={13} color="#9F2241" /> {a.personas.ocupacion}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '8px', borderTop: '1px solid #EEE' }}>
                <span style={{ fontSize: '11px', color: '#999' }}>
                  {a.periodo ? `Periodo: ${a.periodo}` : 'Sin periodo'}
                </span>
                <button onClick={() => handleEliminar(a.id, a.personas?.nombre_completo || 'Sin nombre')}
                  style={{ background: 'none', border: 'none', color: '#C62828', cursor: 'pointer', padding: '4px' }}>
                  <Trash2 size={15} />
                </button>
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