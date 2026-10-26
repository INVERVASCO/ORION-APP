import { useEffect, useState } from 'react';
import { 
  Search, MapPin, Trash2, Edit3, Plus, X, Loader2, 
  AlertTriangle, CheckCircle2, Shield, Filter, TrendingUp 
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Toast from '../components/Toast';

interface Problematica {
  id: string;
  tipo: string;
  descripcion: string;
  barrio_colonia_id: string | null;
  prioridad: string;
  estado: string;
  created_at: string;
  barrios_colonias: { nombre: string } | null;
}

interface ConfirmModalData {
  visible: boolean;
  titulo: string;
  mensaje: string;
  tipo: 'danger' | 'success' | 'warning';
  onConfirm: () => void;
}

const TIPOS = [
  { value: 'agua', label: 'Agua Potable', color: '#2196F3', icono: '💧' },
  { value: 'baches', label: 'Baches', color: '#795548', icono: '🕳️' },
  { value: 'seguridad', label: 'Seguridad', color: '#F44336', icono: '🚨' },
  { value: 'basura', label: 'Basura', color: '#607D8B', icono: '🗑️' },
  { value: 'alumbrado', label: 'Alumbrado', color: '#FFC107', icono: '💡' },
  { value: 'drenaje', label: 'Drenaje', color: '#00BCD4', icono: '🌊' },
  { value: 'transporte', label: 'Transporte', color: '#9C27B0', icono: '🚌' },
  { value: 'salud', label: 'Salud', color: '#4CAF50', icono: '🏥' },
  { value: 'educacion', label: 'Educación', color: '#3F51B5', icono: '🎓' },
  { value: 'empleo', label: 'Empleo', color: '#FF9800', icono: '💼' },
  { value: 'otro', label: 'Otro', color: '#666', icono: '📋' },
];

const PRIORIDADES = [
  { value: 'baja', label: 'Baja', color: '#4CAF50' },
  { value: 'media', label: 'Media', color: '#FFC107' },
  { value: 'alta', label: 'Alta', color: '#FF9800' },
  { value: 'critica', label: 'Crítica', color: '#F44336' },
];

const ESTADOS = [
  { value: 'reportada', label: 'Reportada', color: '#9E9E9E' },
  { value: 'en_revision', label: 'En Revisión', color: '#2196F3' },
  { value: 'en_gestion', label: 'En Gestión', color: '#FF9800' },
  { value: 'resuelta', label: 'Resuelta', color: '#4CAF50' },
];

export default function Problematicas() {
  const [problematicas, setProblematicas] = useState<Problematica[]>([]);
  const [filtradas, setFiltradas] = useState<Problematica[]>([]);
  const [barrios, setBarrios] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroPrioridad, setFiltroPrioridad] = useState('');
  
  const [problemaEditar, setProblemaEditar] = useState<Problematica | null>(null);
  const [problemaNuevo, setProblemaNuevo] = useState<any | null>(null);
  
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
      const { data: problemData } = await supabase
        .from('problematicas')
        .select('id, tipo, descripcion, barrio_colonia_id, prioridad, estado, created_at, barrios_colonias(nombre)')
        .order('created_at', { ascending: false });

      const { data: barriosData } = await supabase
        .from('barrios_colonias')
        .select('id, nombre')
        .order('nombre');

      if (problemData) {
        setProblematicas(problemData as any);
        setFiltradas(problemData as any);
      }
      if (barriosData) setBarrios(barriosData);
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    let resultado = [...problematicas];
    if (busqueda.trim() !== '') {
      const q = busqueda.toLowerCase();
      resultado = resultado.filter(p =>
        p.descripcion.toLowerCase().includes(q) ||
        (p.barrios_colonias?.nombre || '').toLowerCase().includes(q)
      );
    }
    if (filtroTipo) resultado = resultado.filter(p => p.tipo === filtroTipo);
    if (filtroEstado) resultado = resultado.filter(p => p.estado === filtroEstado);
    if (filtroPrioridad) resultado = resultado.filter(p => p.prioridad === filtroPrioridad);
    setFiltradas(resultado);
  }, [busqueda, filtroTipo, filtroEstado, filtroPrioridad, problematicas]);

  const abrirModalNueva = () => {
    setProblemaNuevo({
      tipo: 'agua',
      descripcion: '',
      barrio_colonia_id: '',
      prioridad: 'media',
      estado: 'reportada',
    });
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemaNuevo) return;

    setGuardando(true);

    const { data, error } = await supabase
      .from('problematicas')
      .insert([{
        tipo: problemaNuevo.tipo,
        descripcion: problemaNuevo.descripcion,
        barrio_colonia_id: problemaNuevo.barrio_colonia_id || null,
        prioridad: problemaNuevo.prioridad,
        estado: problemaNuevo.estado,
      }])
      .select('id, tipo, descripcion, barrio_colonia_id, prioridad, estado, created_at, barrios_colonias(nombre)')
      .single();

    if (error) {
      setToastMensaje('Error al crear: ' + error.message);
      setToastVisible(true);
    } else if (data) {
      setProblematicas([data as any, ...problematicas]);
      setProblemaNuevo(null);
      setToastMensaje('¡Problemática registrada con éxito!');
      setToastVisible(true);
    }
    setGuardando(false);
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemaEditar) return;
    setGuardando(true);

    const { error } = await supabase
      .from('problematicas')
      .update({
        tipo: problemaEditar.tipo,
        descripcion: problemaEditar.descripcion,
        barrio_colonia_id: problemaEditar.barrio_colonia_id,
        prioridad: problemaEditar.prioridad,
        estado: problemaEditar.estado,
      })
      .eq('id', problemaEditar.id);

    if (error) {
      setToastMensaje('Error al guardar: ' + error.message);
      setToastVisible(true);
    } else {
      setProblematicas(problematicas.map(p => p.id === problemaEditar.id ? problemaEditar : p));
      setProblemaEditar(null);
      setToastMensaje('Problemática actualizada');
      setToastVisible(true);
    }
    setGuardando(false);
  };

  const handleEliminar = (id: string) => {
    mostrarConfirm(
      '¿Eliminar esta problemática?',
      'Esta acción no se puede deshacer.',
      'danger',
      async () => {
        cerrarConfirm();
        const { error } = await supabase.from('problematicas').delete().eq('id', id);
        if (error) {
          setToastMensaje('Error al eliminar: ' + error.message);
          setToastVisible(true);
        } else {
          setProblematicas(problematicas.filter(p => p.id !== id));
          setToastMensaje('Problemática eliminada');
          setToastVisible(true);
        }
      }
    );
  };

  const contarPorTipo = (tipo: string) => problematicas.filter(p => p.tipo === tipo).length;
  const contarPorEstado = (estado: string) => problematicas.filter(p => p.estado === estado).length;

  const getTipoInfo = (tipo: string) => TIPOS.find(t => t.value === tipo) || TIPOS[TIPOS.length - 1];
  const getEstadoInfo = (estado: string) => ESTADOS.find(e => e.value === estado) || ESTADOS[0];
  const getPrioridadInfo = (prio: string) => PRIORIDADES.find(p => p.value === prio) || PRIORIDADES[0];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px', gap: '10px', color: '#00A651' }}>
        <Loader2 size={32} /> Cargando problemáticas...
      </div>
    );
  }

  return (
    <div>
      <h1 className="header-title">Problemáticas Ciudadanas</h1>
      <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
        Registro de las problemáticas detectadas en el territorio. Alimenta al cerebro de la campaña.
      </p>

      {/* KPIs por tipo */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '10px',
        marginBottom: '25px'
      }}>
        {TIPOS.slice(0, 6).map(t => {
          const count = contarPorTipo(t.value);
          return (
            <div key={t.value} className="card" style={{ 
              padding: '15px', textAlign: 'center', 
              borderTop: `4px solid ${t.color}`, borderLeft: 'none',
              opacity: count > 0 ? 1 : 0.6
            }}>
              <div style={{ fontSize: '22px', marginBottom: '4px' }}>{t.icono}</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: t.color }}>{count}</div>
              <div style={{ fontSize: '11px', color: '#666', fontWeight: 'bold' }}>{t.label}</div>
            </div>
          );
        })}
      </div>

      {/* Botón + Resumen */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#00A651' }}>
          <AlertTriangle size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
          {filtradas.length} {filtradas.length === 1 ? 'problemática' : 'problemáticas'}
          {problematicas.length !== filtradas.length && <span style={{ color: '#999', fontWeight: 'normal' }}> (de {problematicas.length})</span>}
        </p>
        <button onClick={abrirModalNueva} className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
          <Plus size={16} /> Nueva Problemática
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '25px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input
            type="text"
            placeholder="Buscar descripción o barrio..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ width: '100%', padding: '11px 11px 11px 40px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
          style={{ padding: '11px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '14px', background: 'white' }}>
          <option value="">Todos los tipos</option>
          {TIPOS.map(t => <option key={t.value} value={t.value}>{t.icono} {t.label}</option>)}
        </select>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}
          style={{ padding: '11px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '14px', background: 'white' }}>
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
        <select value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)}
          style={{ padding: '11px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '14px', background: 'white' }}>
          <option value="">Todas las prioridades</option>
          {PRIORIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {/* Lista */}
      {filtradas.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <AlertTriangle size={40} color="#00A651" style={{ opacity: 0.5, marginBottom: '15px' }} />
          <p style={{ color: '#666', fontSize: '15px' }}>
            {problematicas.length === 0 ? 'Aún no hay problemáticas reportadas. Presiona "Nueva Problemática" para comenzar.' : 'No se encontraron resultados con los filtros aplicados.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '15px' }}>
          {filtradas.map(p => {
            const tipoInfo = getTipoInfo(p.tipo);
            const estadoInfo = getEstadoInfo(p.estado);
            const prioridadInfo = getPrioridadInfo(p.prioridad);
            
            return (
              <div key={p.id} style={{
                background: 'white', borderRadius: '10px', padding: '18px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                borderLeft: `4px solid ${tipoInfo.color}`,
                display: 'flex', flexDirection: 'column', gap: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                    <div style={{
                      background: `${tipoInfo.color}20`,
                      color: tipoInfo.color,
                      width: '40px', height: '40px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '20px', flexShrink: 0
                    }}>
                      {tipoInfo.icono}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: '15px', color: '#333', fontWeight: 'bold' }}>
                        {tipoInfo.label}
                      </h3>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold',
                          background: `${prioridadInfo.color}20`, color: prioridadInfo.color
                        }}>
                          {prioridadInfo.label}
                        </span>
                        <span style={{
                          padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold',
                          background: `${estadoInfo.color}20`, color: estadoInfo.color
                        }}>
                          {estadoInfo.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: '13px', color: '#555', lineHeight: '1.5' }}>
                  {p.descripcion}
                </p>

                {p.barrios_colonias?.nombre && (
                  <div style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={13} color="#00A651" />
                    {p.barrios_colonias.nombre}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid #EEE' }}>
                  <button onClick={() => setProblemaEditar(p)} style={{
                    flex: 1, padding: '8px', background: '#F4F4F4', border: 'none', borderRadius: '6px',
                    cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: '#333',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                  }}>
                    <Edit3 size={14} /> Editar
                  </button>
                  <button onClick={() => handleEliminar(p.id)} style={{
                    padding: '8px 12px', background: '#FFEBEE', border: 'none', borderRadius: '6px',
                    cursor: 'pointer', color: '#C62828',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: NUEVA PROBLEMÁTICA */}
      {problemaNuevo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#00A651', fontSize: '18px', margin: 0 }}>Nueva Problemática</h3>
              <button onClick={() => setProblemaNuevo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleCrear} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Tipo de problemática *</label>
                <select value={problemaNuevo.tipo}
                  onChange={(e) => setProblemaNuevo({...problemaNuevo, tipo: e.target.value})} style={inputStyle}>
                  {TIPOS.map(t => <option key={t.value} value={t.value}>{t.icono} {t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Descripción *</label>
                <textarea required rows={3}
                  placeholder="Describe el problema (ej: No pasa el camión de la basura desde hace 2 semanas)"
                  value={problemaNuevo.descripcion}
                  onChange={(e) => setProblemaNuevo({...problemaNuevo, descripcion: e.target.value})}
                  style={{...inputStyle, resize: 'vertical', fontFamily: 'inherit'}} />
              </div>
              <div>
                <label style={labelStyle}>Barrio / Colonia</label>
                <select value={problemaNuevo.barrio_colonia_id}
                  onChange={(e) => setProblemaNuevo({...problemaNuevo, barrio_colonia_id: e.target.value})} style={inputStyle}>
                  <option value="">Sin asignar</option>
                  {barrios.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Prioridad *</label>
                  <select value={problemaNuevo.prioridad}
                    onChange={(e) => setProblemaNuevo({...problemaNuevo, prioridad: e.target.value})} style={inputStyle}>
                    {PRIORIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Estado *</label>
                  <select value={problemaNuevo.estado}
                    onChange={(e) => setProblemaNuevo({...problemaNuevo, estado: e.target.value})} style={inputStyle}>
                    {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setProblemaNuevo(null)} style={btnSecundario}>Cancelar</button>
                <button type="submit" className="btn-primary" 
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} 
                  disabled={guardando}>
                  {guardando ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : <><Shield size={16} /> Registrar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR PROBLEMÁTICA */}
      {problemaEditar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#00A651', fontSize: '18px', margin: 0 }}>Editar Problemática</h3>
              <button onClick={() => setProblemaEditar(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleGuardarEdicion} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Tipo *</label>
                <select value={problemaEditar.tipo}
                  onChange={(e) => setProblemaEditar({...problemaEditar, tipo: e.target.value})} style={inputStyle}>
                  {TIPOS.map(t => <option key={t.value} value={t.value}>{t.icono} {t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Descripción *</label>
                <textarea required rows={3}
                  value={problemaEditar.descripcion}
                  onChange={(e) => setProblemaEditar({...problemaEditar, descripcion: e.target.value})}
                  style={{...inputStyle, resize: 'vertical', fontFamily: 'inherit'}} />
              </div>
              <div>
                <label style={labelStyle}>Barrio / Colonia</label>
                <select value={problemaEditar.barrio_colonia_id || ''}
                  onChange={(e) => setProblemaEditar({...problemaEditar, barrio_colonia_id: e.target.value || null})} style={inputStyle}>
                  <option value="">Sin asignar</option>
                  {barrios.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Prioridad *</label>
                  <select value={problemaEditar.prioridad}
                    onChange={(e) => setProblemaEditar({...problemaEditar, prioridad: e.target.value})} style={inputStyle}>
                    {PRIORIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Estado *</label>
                  <select value={problemaEditar.estado}
                    onChange={(e) => setProblemaEditar({...problemaEditar, estado: e.target.value})} style={inputStyle}>
                    {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setProblemaEditar(null)} style={btnSecundario}>Cancelar</button>
                <button type="submit" className="btn-primary" 
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} 
                  disabled={guardando}>
                  {guardando ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : 'Guardar Cambios'}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                <div style={{ background: confirmModal.tipo === 'danger' ? '#FFEBEE' : '#E8F5E9', color: confirmModal.tipo === 'danger' ? '#C62828' : '#00A651', width: '46px', height: '46px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {confirmModal.tipo === 'success' ? <CheckCircle2 size={26} /> : <AlertTriangle size={26} />}
                </div>
                <h3 style={{ margin: 0, fontSize: '17px', color: '#333', wordBreak: 'break-word', lineHeight: '1.3' }}>{confirmModal.titulo}</h3>
              </div>
              <button onClick={cerrarConfirm} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={20} color="#999" />
              </button>
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