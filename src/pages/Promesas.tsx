import { useEffect, useState } from 'react';
import { 
  Search, Trash2, Edit3, Plus, X, Loader2, 
  AlertTriangle, CheckCircle2, Target, MapPin, 
  DollarSign, Clock, TrendingUp, Award
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Toast from '../components/Toast';

interface Promesa {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: string;
  estado: string;
  fecha_prometida: string | null;
  fecha_limite: string | null;
  costo_estimado: number | null;
  barrio_colonia_id: string | null;
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
  { value: 'obra', label: 'Obra', color: '#2196F3', icono: '🏗️' },
  { value: 'programa', label: 'Programa', color: '#4CAF50', icono: '📋' },
  { value: 'gestion', label: 'Gestión', color: '#FF9800', icono: '🤝' },
  { value: 'propuesta', label: 'Propuesta', color: '#9C27B0', icono: '💡' },
];

const ESTADOS = [
  { value: 'prometida', label: 'Prometida', color: '#9E9E9E', icono: '📢' },
  { value: 'planeacion', label: 'En Planeación', color: '#2196F3', icono: '📐' },
  { value: 'gestion', label: 'En Gestión', color: '#FF9800', icono: '⚙️' },
  { value: 'ejecucion', label: 'En Ejecución', color: '#9C27B0', icono: '🔨' },
  { value: 'terminada', label: 'Terminada', color: '#4CAF50', icono: '✅' },
];

export default function Promesas() {
  const [promesas, setPromesas] = useState<Promesa[]>([]);
  const [filtradas, setFiltradas] = useState<Promesa[]>([]);
  const [barrios, setBarrios] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  
  const [promesaEditar, setPromesaEditar] = useState<Promesa | null>(null);
  const [promesaNueva, setPromesaNueva] = useState<any | null>(null);
  
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
      const [promesasRes, barriosRes] = await Promise.all([
        supabase
          .from('promesas')
          .select('*, barrios_colonias(nombre)')
          .order('created_at', { ascending: false }),
        supabase.from('barrios_colonias').select('id, nombre').order('nombre'),
      ]);
      
      if (promesasRes.data) {
        setPromesas(promesasRes.data as any);
        setFiltradas(promesasRes.data as any);
      }
      if (barriosRes.data) setBarrios(barriosRes.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    let resultado = [...promesas];
    if (busqueda.trim() !== '') {
      const q = busqueda.toLowerCase();
      resultado = resultado.filter(p =>
        p.titulo.toLowerCase().includes(q) ||
        (p.descripcion || '').toLowerCase().includes(q)
      );
    }
    if (filtroTipo) resultado = resultado.filter(p => p.tipo === filtroTipo);
    if (filtroEstado) resultado = resultado.filter(p => p.estado === filtroEstado);
    setFiltradas(resultado);
  }, [busqueda, filtroTipo, filtroEstado, promesas]);

  const abrirModalNueva = () => {
    setPromesaNueva({
      titulo: '',
      descripcion: '',
      tipo: 'obra',
      estado: 'prometida',
      fecha_prometida: new Date().toISOString().split('T')[0],
      fecha_limite: '',
      costo_estimado: '',
      barrio_colonia_id: '',
    });
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promesaNueva) return;
    setGuardando(true);

    const { data, error } = await supabase
      .from('promesas')
      .insert([{
        titulo: promesaNueva.titulo,
        descripcion: promesaNueva.descripcion || null,
        tipo: promesaNueva.tipo,
        estado: promesaNueva.estado,
        fecha_prometida: promesaNueva.fecha_prometida || null,
        fecha_limite: promesaNueva.fecha_limite || null,
        costo_estimado: parseFloat(promesaNueva.costo_estimado) || null,
        barrio_colonia_id: promesaNueva.barrio_colonia_id || null,
      }])
      .select('*, barrios_colonias(nombre)')
      .single();

    if (error) {
      setToastMensaje('Error al crear: ' + error.message);
      setToastVisible(true);
    } else if (data) {
      setPromesas([data as any, ...promesas]);
      setPromesaNueva(null);
      setToastMensaje('¡Promesa registrada con éxito!');
      setToastVisible(true);
    }
    setGuardando(false);
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promesaEditar) return;
    setGuardando(true);

    const { error } = await supabase
      .from('promesas')
      .update({
        titulo: promesaEditar.titulo,
        descripcion: promesaEditar.descripcion,
        tipo: promesaEditar.tipo,
        estado: promesaEditar.estado,
        fecha_prometida: promesaEditar.fecha_prometida,
        fecha_limite: promesaEditar.fecha_limite,
        costo_estimado: promesaEditar.costo_estimado,
        barrio_colonia_id: promesaEditar.barrio_colonia_id,
      })
      .eq('id', promesaEditar.id);

    if (error) {
      setToastMensaje('Error al guardar: ' + error.message);
      setToastVisible(true);
    } else {
      setPromesas(promesas.map(p => p.id === promesaEditar.id ? promesaEditar : p));
      setPromesaEditar(null);
      setToastMensaje('Promesa actualizada');
      setToastVisible(true);
    }
    setGuardando(false);
  };

  const handleEliminar = (id: string, titulo: string) => {
    mostrarConfirm(
      '¿Eliminar esta promesa?',
      `Se eliminará "${titulo}". Esta acción no se puede deshacer.`,
      'danger',
      async () => {
        cerrarConfirm();
        const { error } = await supabase.from('promesas').delete().eq('id', id);
        if (error) {
          setToastMensaje('Error al eliminar: ' + error.message);
          setToastVisible(true);
        } else {
          setPromesas(promesas.filter(p => p.id !== id));
          setToastMensaje('Promesa eliminada');
          setToastVisible(true);
        }
      }
    );
  };

  const getTipoInfo = (tipo: string) => TIPOS.find(t => t.value === tipo) || TIPOS[TIPOS.length - 1];
  const getEstadoInfo = (estado: string) => ESTADOS.find(e => e.value === estado) || ESTADOS[0];

  const contarPorEstado = (estado: string) => promesas.filter(p => p.estado === estado).length;
  const totalCosto = promesas.reduce((sum, p) => sum + (p.costo_estimado || 0), 0);
  const terminadas = contarPorEstado('terminada');
  const pctCumplimiento = promesas.length > 0 ? Math.round((terminadas / promesas.length) * 100) : 0;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px', gap: '10px', color: '#00A651' }}>
        <Loader2 size={32} /> Cargando promesas...
      </div>
    );
  }

  return (
    <div>
      <h1 className="header-title">Promesas del Candidato</h1>
      <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
        Registra y da seguimiento a los compromisos de campaña. Transparencia que genera confianza.
      </p>

      {/* KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '12px',
        marginBottom: '25px'
      }}>
        <div className="card" style={{ padding: '18px', borderTop: '4px solid #00A651', borderLeft: 'none', textAlign: 'center' }}>
          <Target size={22} color="#00A651" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#00A651' }}>{promesas.length}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Promesas Totales</div>
        </div>
        <div className="card" style={{ padding: '18px', borderTop: '4px solid #4CAF50', borderLeft: 'none', textAlign: 'center' }}>
          <Award size={22} color="#4CAF50" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#4CAF50' }}>{terminadas}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Terminadas</div>
        </div>
        <div className="card" style={{ padding: '18px', borderTop: '4px solid #9C27B0', borderLeft: 'none', textAlign: 'center' }}>
          <TrendingUp size={22} color="#9C27B0" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#9C27B0' }}>{pctCumplimiento}%</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Cumplimiento</div>
        </div>
        <div className="card" style={{ padding: '18px', borderTop: '4px solid #F44336', borderLeft: 'none', textAlign: 'center' }}>
          <DollarSign size={22} color="#F44336" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#F44336' }}>${totalCosto.toLocaleString('es-MX')}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Inversión Comprometida</div>
        </div>
      </div>

      {/* Estado de las promesas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '10px',
        marginBottom: '25px'
      }}>
        {ESTADOS.map(est => {
          const count = contarPorEstado(est.value);
          return (
            <div key={est.value} className="card" style={{
              padding: '14px', textAlign: 'center',
              borderTop: `3px solid ${est.color}`, borderLeft: 'none',
              opacity: count > 0 ? 1 : 0.5
            }}>
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>{est.icono}</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: est.color }}>{count}</div>
              <div style={{ fontSize: '11px', color: '#666', fontWeight: 'bold' }}>{est.label}</div>
            </div>
          );
        })}
      </div>

      {/* Botón + Filtros */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#00A651' }}>
          <Target size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
          {filtradas.length} {filtradas.length === 1 ? 'promesa' : 'promesas'}
        </p>
        <button onClick={abrirModalNueva} className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
          <Plus size={16} /> Nueva Promesa
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '25px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input
            type="text"
            placeholder="Buscar promesa..."
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
          {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.icono} {e.label}</option>)}
        </select>
      </div>

      {/* Lista */}
      {filtradas.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Target size={40} color="#00A651" style={{ opacity: 0.5, marginBottom: '15px' }} />
          <p style={{ color: '#666', fontSize: '15px' }}>
            {promesas.length === 0 ? 'Aún no hay promesas registradas. Presiona "Nueva Promesa" para comenzar.' : 'No se encontraron resultados.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '15px' }}>
          {filtradas.map(p => {
            const tipoInfo = getTipoInfo(p.tipo);
            const estadoInfo = getEstadoInfo(p.estado);
            
            return (
              <div key={p.id} style={{
                background: 'white', borderRadius: '10px', padding: '18px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                borderLeft: `4px solid ${estadoInfo.color}`,
                display: 'flex', flexDirection: 'column', gap: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                    <div style={{
                      background: `${tipoInfo.color}20`,
                      color: tipoInfo.color,
                      width: '40px', height: '40px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', flexShrink: 0
                    }}>
                      {tipoInfo.icono}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: '14px', color: '#333', fontWeight: 'bold', wordBreak: 'break-word' }}>
                        {p.titulo}
                      </h3>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold',
                          background: `${tipoInfo.color}20`, color: tipoInfo.color
                        }}>
                          {tipoInfo.label}
                        </span>
                        <span style={{
                          padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold',
                          background: `${estadoInfo.color}20`, color: estadoInfo.color
                        }}>
                          {estadoInfo.icono} {estadoInfo.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {p.descripcion && (
                  <p style={{ margin: 0, fontSize: '13px', color: '#555', lineHeight: '1.5' }}>
                    {p.descripcion}
                  </p>
                )}

                {p.barrios_colonias?.nombre && (
                  <div style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={12} color="#00A651" /> {p.barrios_colonias.nombre}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                  {p.fecha_prometida && (
                    <div style={{ background: '#F9F9F9', padding: '8px', borderRadius: '6px' }}>
                      <div style={{ color: '#999', fontSize: '10px', fontWeight: 'bold' }}>PROMETIDA</div>
                      <div style={{ color: '#333', fontWeight: 'bold', marginTop: '2px' }}>
                        {new Date(p.fecha_prometida + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  )}
                  {p.fecha_limite && (
                    <div style={{ background: '#F9F9F9', padding: '8px', borderRadius: '6px' }}>
                      <div style={{ color: '#999', fontSize: '10px', fontWeight: 'bold' }}>LÍMITE</div>
                      <div style={{ color: '#333', fontWeight: 'bold', marginTop: '2px' }}>
                        {new Date(p.fecha_limite + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  )}
                </div>

                {p.costo_estimado && p.costo_estimado > 0 && (
                  <div style={{
                    background: '#E3F2FD', padding: '8px 12px', borderRadius: '6px',
                    fontSize: '12px', color: '#2196F3', fontWeight: 'bold',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}>
                    <DollarSign size={14} /> Costo estimado: ${p.costo_estimado.toLocaleString('es-MX')}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid #EEE' }}>
                  <button onClick={() => setPromesaEditar(p)} style={{
                    flex: 1, padding: '8px', background: '#F4F4F4', border: 'none', borderRadius: '6px',
                    cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: '#333',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                  }}>
                    <Edit3 size={14} /> Editar
                  </button>
                  <button onClick={() => handleEliminar(p.id, p.titulo)} style={{
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

      {/* MODAL: NUEVA PROMESA */}
      {promesaNueva && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#00A651', fontSize: '18px', margin: 0 }}>Nueva Promesa</h3>
              <button onClick={() => setPromesaNueva(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleCrear} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Título de la promesa *</label>
                <input required type="text" placeholder="Ej. Pavimentar Calle Hidalgo"
                  value={promesaNueva.titulo}
                  onChange={(e) => setPromesaNueva({...promesaNueva, titulo: e.target.value})}
                  style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Descripción</label>
                <textarea rows={2} placeholder="Detalles del compromiso..."
                  value={promesaNueva.descripcion}
                  onChange={(e) => setPromesaNueva({...promesaNueva, descripcion: e.target.value})}
                  style={{...inputStyle, resize: 'vertical', fontFamily: 'inherit'}} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Tipo *</label>
                  <select value={promesaNueva.tipo}
                    onChange={(e) => setPromesaNueva({...promesaNueva, tipo: e.target.value})} style={inputStyle}>
                    {TIPOS.map(t => <option key={t.value} value={t.value}>{t.icono} {t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Estado *</label>
                  <select value={promesaNueva.estado}
                    onChange={(e) => setPromesaNueva({...promesaNueva, estado: e.target.value})} style={inputStyle}>
                    {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.icono} {e.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Barrio / Colonia</label>
                <select value={promesaNueva.barrio_colonia_id}
                  onChange={(e) => setPromesaNueva({...promesaNueva, barrio_colonia_id: e.target.value})} style={inputStyle}>
                  <option value="">Sin asignar</option>
                  {barrios.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Fecha prometida</label>
                  <input type="date" value={promesaNueva.fecha_prometida}
                    onChange={(e) => setPromesaNueva({...promesaNueva, fecha_prometida: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Fecha límite</label>
                  <input type="date" value={promesaNueva.fecha_limite}
                    onChange={(e) => setPromesaNueva({...promesaNueva, fecha_limite: e.target.value})} style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Costo estimado (MXN)</label>
                <input type="text" inputMode="decimal" placeholder="0.00"
                  value={promesaNueva.costo_estimado}
                  onChange={(e) => setPromesaNueva({...promesaNueva, costo_estimado: e.target.value.replace(/[^0-9.]/g, '')})}
                  style={inputStyle} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setPromesaNueva(null)} style={btnSecundario}>Cancelar</button>
                <button type="submit" className="btn-primary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  disabled={guardando}>
                  {guardando ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : <><CheckCircle2 size={16} /> Crear Promesa</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR PROMESA */}
      {promesaEditar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#00A651', fontSize: '18px', margin: 0 }}>Editar Promesa</h3>
              <button onClick={() => setPromesaEditar(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleGuardarEdicion} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Título *</label>
                <input required type="text" value={promesaEditar.titulo}
                  onChange={(e) => setPromesaEditar({...promesaEditar, titulo: e.target.value})} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Descripción</label>
                <textarea rows={2} value={promesaEditar.descripcion || ''}
                  onChange={(e) => setPromesaEditar({...promesaEditar, descripcion: e.target.value})}
                  style={{...inputStyle, resize: 'vertical', fontFamily: 'inherit'}} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Tipo *</label>
                  <select value={promesaEditar.tipo}
                    onChange={(e) => setPromesaEditar({...promesaEditar, tipo: e.target.value})} style={inputStyle}>
                    {TIPOS.map(t => <option key={t.value} value={t.value}>{t.icono} {t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Estado *</label>
                  <select value={promesaEditar.estado}
                    onChange={(e) => setPromesaEditar({...promesaEditar, estado: e.target.value})} style={inputStyle}>
                    {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.icono} {e.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Barrio / Colonia</label>
                <select value={promesaEditar.barrio_colonia_id || ''}
                  onChange={(e) => setPromesaEditar({...promesaEditar, barrio_colonia_id: e.target.value || null})} style={inputStyle}>
                  <option value="">Sin asignar</option>
                  {barrios.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Fecha prometida</label>
                  <input type="date" value={promesaEditar.fecha_prometida || ''}
                    onChange={(e) => setPromesaEditar({...promesaEditar, fecha_prometida: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Fecha límite</label>
                  <input type="date" value={promesaEditar.fecha_limite || ''}
                    onChange={(e) => setPromesaEditar({...promesaEditar, fecha_limite: e.target.value})} style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Costo estimado (MXN)</label>
                <input type="text" inputMode="decimal"
                  value={promesaEditar.costo_estimado || ''}
                  onChange={(e) => setPromesaEditar({...promesaEditar, costo_estimado: parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || null})}
                  style={inputStyle} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setPromesaEditar(null)} style={btnSecundario}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar Cambios'}
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
              <button onClick={cerrarConfirm} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
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