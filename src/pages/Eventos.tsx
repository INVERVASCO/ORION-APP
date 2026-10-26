import { useEffect, useState } from 'react';
import { 
  Search, Trash2, Edit3, Plus, X, Loader2, 
  AlertTriangle, CheckCircle2, Calendar as CalendarIcon, 
  MapPin, Users, DollarSign, Clock
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Toast from '../components/Toast';

interface Evento {
  id: string;
  nombre: string;
  tipo: string;
  fecha: string;
  hora: string | null;
  lugar: string | null;
  barrio_colonia_id: string | null;
  asistentes_estimados: number;
  asistentes_reales: number;
  costo: number;
  notas: string | null;
  barrios_colonias: { nombre: string } | null;
}

interface ConfirmModalData {
  visible: boolean;
  titulo: string;
  mensaje: string;
  tipo: 'danger' | 'success' | 'warning';
  onConfirm: () => void;
}

const TIPOS_EVENTO = [
  { value: 'mitin', label: 'Mitin', color: '#9C27B0', icono: '📢' },
  { value: 'reunion', label: 'Reunión', color: '#2196F3', icono: '🤝' },
  { value: 'casa_por_casa', label: 'Casa por Casa', color: '#4CAF50', icono: '🏠' },
  { value: 'foro', label: 'Foro', color: '#FF9800', icono: '🎤' },
  { value: 'rueda_prensa', label: 'Rueda de Prensa', color: '#F44336', icono: '📰' },
  { value: 'redes', label: 'Evento en Redes', color: '#00BCD4', icono: '📱' },
];

export default function Eventos() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [filtrados, setFiltrados] = useState<Evento[]>([]);
  const [barrios, setBarrios] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState<'todos' | 'proximos' | 'pasados'>('todos');
  
  const [eventoEditar, setEventoEditar] = useState<Evento | null>(null);
  const [eventoNuevo, setEventoNuevo] = useState<any | null>(null);
  
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
      const [eventosRes, barriosRes] = await Promise.all([
        supabase
          .from('eventos')
          .select('*, barrios_colonias(nombre)')
          .order('fecha', { ascending: true }),
        supabase.from('barrios_colonias').select('id, nombre').order('nombre'),
      ]);
      
      if (eventosRes.data) {
        setEventos(eventosRes.data as any);
        setFiltrados(eventosRes.data as any);
      }
      if (barriosRes.data) setBarrios(barriosRes.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    let resultado = [...eventos];
    const hoy = new Date().toISOString().split('T')[0];
    
    if (busqueda.trim() !== '') {
      const q = busqueda.toLowerCase();
      resultado = resultado.filter(e =>
        e.nombre.toLowerCase().includes(q) ||
        (e.lugar || '').toLowerCase().includes(q)
      );
    }
    if (filtroTipo) resultado = resultado.filter(e => e.tipo === filtroTipo);
    if (filtroPeriodo === 'proximos') resultado = resultado.filter(e => e.fecha >= hoy);
    if (filtroPeriodo === 'pasados') resultado = resultado.filter(e => e.fecha < hoy);
    
    setFiltrados(resultado);
  }, [busqueda, filtroTipo, filtroPeriodo, eventos]);

  const abrirModalNuevo = () => {
    const hoy = new Date();
    setEventoNuevo({
      nombre: '',
      tipo: 'mitin',
      fecha: hoy.toISOString().split('T')[0],
      hora: '18:00',
      lugar: '',
      barrio_colonia_id: '',
      asistentes_estimados: '',
      asistentes_reales: 0,
      costo: '',
      notas: '',
    });
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventoNuevo) return;
    setGuardando(true);

    const { data, error } = await supabase
      .from('eventos')
      .insert([{
        nombre: eventoNuevo.nombre,
        tipo: eventoNuevo.tipo,
        fecha: eventoNuevo.fecha,
        hora: eventoNuevo.hora || null,
        lugar: eventoNuevo.lugar || null,
        barrio_colonia_id: eventoNuevo.barrio_colonia_id || null,
        asistentes_estimados: parseInt(eventoNuevo.asistentes_estimados) || 0,
        asistentes_reales: 0,
        costo: parseFloat(eventoNuevo.costo) || 0,
        notas: eventoNuevo.notas || null,
      }])
      .select('*, barrios_colonias(nombre)')
      .single();

    if (error) {
      setToastMensaje('Error al crear: ' + error.message);
      setToastVisible(true);
    } else if (data) {
      setEventos([...eventos, data as any].sort((a, b) => a.fecha.localeCompare(b.fecha)));
      setEventoNuevo(null);
      setToastMensaje('¡Evento creado con éxito!');
      setToastVisible(true);
    }
    setGuardando(false);
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventoEditar) return;
    setGuardando(true);

    const { error } = await supabase
      .from('eventos')
      .update({
        nombre: eventoEditar.nombre,
        tipo: eventoEditar.tipo,
        fecha: eventoEditar.fecha,
        hora: eventoEditar.hora,
        lugar: eventoEditar.lugar,
        barrio_colonia_id: eventoEditar.barrio_colonia_id,
        asistentes_estimados: eventoEditar.asistentes_estimados,
        asistentes_reales: eventoEditar.asistentes_reales,
        costo: eventoEditar.costo,
        notas: eventoEditar.notas,
      })
      .eq('id', eventoEditar.id);

    if (error) {
      setToastMensaje('Error al guardar: ' + error.message);
      setToastVisible(true);
    } else {
      setEventos(eventos.map(ev => ev.id === eventoEditar.id ? eventoEditar : ev));
      setEventoEditar(null);
      setToastMensaje('Evento actualizado');
      setToastVisible(true);
    }
    setGuardando(false);
  };

  const handleEliminar = (id: string, nombre: string) => {
    mostrarConfirm(
      '¿Eliminar este evento?',
      `Se eliminará "${nombre}". Esta acción no se puede deshacer.`,
      'danger',
      async () => {
        cerrarConfirm();
        const { error } = await supabase.from('eventos').delete().eq('id', id);
        if (error) {
          setToastMensaje('Error al eliminar: ' + error.message);
          setToastVisible(true);
        } else {
          setEventos(eventos.filter(e => e.id !== id));
          setToastMensaje('Evento eliminado');
          setToastVisible(true);
        }
      }
    );
  };

  const getTipoInfo = (tipo: string) => TIPOS_EVENTO.find(t => t.value === tipo) || TIPOS_EVENTO[0];
  const hoy = new Date().toISOString().split('T')[0];
  const proximos = eventos.filter(e => e.fecha >= hoy);
  const totalCosto = eventos.reduce((sum, e) => sum + (e.costo || 0), 0);
  const totalAsistentesEstimados = eventos.reduce((sum, e) => sum + (e.asistentes_estimados || 0), 0);
  const totalAsistentesReales = eventos.reduce((sum, e) => sum + (e.asistentes_reales || 0), 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px', gap: '10px', color: '#00A651' }}>
        <Loader2 size={32} /> Cargando eventos...
      </div>
    );
  }

  return (
    <div>
      <h1 className="header-title">Eventos de Campaña</h1>
      <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
        Calendario y seguimiento de todos los eventos de la campaña.
      </p>

      {/* KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '12px',
        marginBottom: '25px'
      }}>
        <div className="card" style={{ padding: '18px', borderTop: '4px solid #00A651', borderLeft: 'none', textAlign: 'center' }}>
          <CalendarIcon size={22} color="#00A651" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#00A651' }}>{proximos.length}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Eventos Próximos</div>
        </div>
        <div className="card" style={{ padding: '18px', borderTop: '4px solid #2196F3', borderLeft: 'none', textAlign: 'center' }}>
          <Users size={22} color="#2196F3" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#2196F3' }}>{totalAsistentesEstimados.toLocaleString()}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Asistentes Estimados</div>
        </div>
        <div className="card" style={{ padding: '18px', borderTop: '4px solid #9C27B0', borderLeft: 'none', textAlign: 'center' }}>
          <CheckCircle2 size={22} color="#9C27B0" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#9C27B0' }}>{totalAsistentesReales.toLocaleString()}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Asistentes Reales</div>
        </div>
        <div className="card" style={{ padding: '18px', borderTop: '4px solid #F44336', borderLeft: 'none', textAlign: 'center' }}>
          <DollarSign size={22} color="#F44336" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#F44336' }}>${totalCosto.toLocaleString('es-MX')}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Inversión Total</div>
        </div>
      </div>

      {/* Botón + Filtros */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#00A651' }}>
          <CalendarIcon size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
          {filtrados.length} {filtrados.length === 1 ? 'evento' : 'eventos'}
          {eventos.length !== filtrados.length && <span style={{ color: '#999', fontWeight: 'normal' }}> (de {eventos.length})</span>}
        </p>
        <button onClick={abrirModalNuevo} className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
          <Plus size={16} /> Nuevo Evento
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '25px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input
            type="text"
            placeholder="Buscar evento o lugar..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ width: '100%', padding: '11px 11px 11px 40px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
          style={{ padding: '11px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '14px', background: 'white' }}>
          <option value="">Todos los tipos</option>
          {TIPOS_EVENTO.map(t => <option key={t.value} value={t.value}>{t.icono} {t.label}</option>)}
        </select>
        <select value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value as any)}
          style={{ padding: '11px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '14px', background: 'white' }}>
          <option value="todos">Todos</option>
          <option value="proximos">Próximos</option>
          <option value="pasados">Pasados</option>
        </select>
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <CalendarIcon size={40} color="#00A651" style={{ opacity: 0.5, marginBottom: '15px' }} />
          <p style={{ color: '#666', fontSize: '15px' }}>
            {eventos.length === 0 ? 'Aún no hay eventos. Presiona "Nuevo Evento" para comenzar.' : 'No se encontraron resultados.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '15px' }}>
          {filtrados.map(ev => {
            const tipoInfo = getTipoInfo(ev.tipo);
            const esPasado = ev.fecha < hoy;
            const cumplimiento = ev.asistentes_estimados > 0 
              ? Math.round((ev.asistentes_reales / ev.asistentes_estimados) * 100) 
              : 0;
            
            return (
              <div key={ev.id} style={{
                background: 'white', borderRadius: '10px', padding: '18px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                borderLeft: `4px solid ${tipoInfo.color}`,
                opacity: esPasado ? 0.85 : 1,
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
                        {ev.nombre}
                      </h3>
                      <span style={{
                        display: 'inline-block', marginTop: '3px', padding: '2px 8px',
                        background: `${tipoInfo.color}20`, color: tipoInfo.color,
                        borderRadius: '10px', fontSize: '10px', fontWeight: 'bold'
                      }}>
                        {tipoInfo.label}
                      </span>
                    </div>
                  </div>
                  {esPasado && (
                    <span style={{
                      background: '#EEE', color: '#666',
                      padding: '3px 8px', borderRadius: '8px',
                      fontSize: '10px', fontWeight: 'bold'
                    }}>
                      PASADO
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#666' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CalendarIcon size={12} color="#00A651" />
                    <strong>{new Date(ev.fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long' })}</strong>
                  </div>
                  {ev.hora && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={12} color="#00A651" /> {ev.hora}
                    </div>
                  )}
                  {ev.lugar && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={12} color="#00A651" /> {ev.lugar}
                    </div>
                  )}
                  {ev.barrios_colonias?.nombre && (
                    <div style={{ fontSize: '11px', color: '#999', marginLeft: '18px' }}>
                      📍 {ev.barrios_colonias.nombre}
                    </div>
                  )}
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '8px',
                  marginTop: '6px',
                  padding: '10px',
                  background: '#F9F9F9',
                  borderRadius: '8px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2196F3' }}>{ev.asistentes_estimados}</div>
                    <div style={{ fontSize: '9px', color: '#666' }}>ESTIMADOS</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#9C27B0' }}>{ev.asistentes_reales}</div>
                    <div style={{ fontSize: '9px', color: '#666' }}>REALES</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#F44336' }}>${ev.costo.toLocaleString('es-MX')}</div>
                    <div style={{ fontSize: '9px', color: '#666' }}>COSTO</div>
                  </div>
                </div>

                {ev.asistentes_estimados > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666', marginBottom: '4px' }}>
                      <span>Cumplimiento de asistencia</span>
                      <strong style={{ color: cumplimiento >= 80 ? '#00A651' : cumplimiento >= 50 ? '#F9A825' : '#C62828' }}>
                        {cumplimiento}%
                      </strong>
                    </div>
                    <div style={{ height: '4px', background: '#EEE', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min(cumplimiento, 100)}%`,
                        height: '100%',
                        background: cumplimiento >= 80 ? '#00A651' : cumplimiento >= 50 ? '#F9A825' : '#C62828'
                      }} />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid #EEE' }}>
                  <button onClick={() => setEventoEditar(ev)} style={{
                    flex: 1, padding: '8px', background: '#F4F4F4', border: 'none', borderRadius: '6px',
                    cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: '#333',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                  }}>
                    <Edit3 size={14} /> Editar
                  </button>
                  <button onClick={() => handleEliminar(ev.id, ev.nombre)} style={{
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

      {/* MODAL: NUEVO EVENTO */}
      {eventoNuevo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#00A651', fontSize: '18px', margin: 0 }}>Nuevo Evento</h3>
              <button onClick={() => setEventoNuevo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleCrear} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Nombre del evento *</label>
                <input required type="text" placeholder="Ej. Mitin en Plaza Principal"
                  value={eventoNuevo.nombre}
                  onChange={(e) => setEventoNuevo({...eventoNuevo, nombre: e.target.value})}
                  style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Tipo de evento *</label>
                <select value={eventoNuevo.tipo}
                  onChange={(e) => setEventoNuevo({...eventoNuevo, tipo: e.target.value})} style={inputStyle}>
                  {TIPOS_EVENTO.map(t => <option key={t.value} value={t.value}>{t.icono} {t.label}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Fecha *</label>
                  <input required type="date" value={eventoNuevo.fecha}
                    onChange={(e) => setEventoNuevo({...eventoNuevo, fecha: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Hora</label>
                  <input type="time" value={eventoNuevo.hora}
                    onChange={(e) => setEventoNuevo({...eventoNuevo, hora: e.target.value})} style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Lugar</label>
                <input type="text" placeholder="Ej. Plaza Principal"
                  value={eventoNuevo.lugar}
                  onChange={(e) => setEventoNuevo({...eventoNuevo, lugar: e.target.value})} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Barrio / Colonia</label>
                <select value={eventoNuevo.barrio_colonia_id}
                  onChange={(e) => setEventoNuevo({...eventoNuevo, barrio_colonia_id: e.target.value})} style={inputStyle}>
                  <option value="">Sin asignar</option>
                  {barrios.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Asistentes estimados</label>
                  <input type="text" inputMode="numeric" placeholder="0"
                    value={eventoNuevo.asistentes_estimados}
                    onChange={(e) => setEventoNuevo({...eventoNuevo, asistentes_estimados: e.target.value.replace(/[^0-9]/g, '')})}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Costo estimado (MXN)</label>
                  <input type="text" inputMode="decimal" placeholder="0.00"
                    value={eventoNuevo.costo}
                    onChange={(e) => setEventoNuevo({...eventoNuevo, costo: e.target.value.replace(/[^0-9.]/g, '')})}
                    style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Notas</label>
                <textarea rows={2} placeholder="Detalles adicionales..."
                  value={eventoNuevo.notas}
                  onChange={(e) => setEventoNuevo({...eventoNuevo, notas: e.target.value})}
                  style={{...inputStyle, resize: 'vertical', fontFamily: 'inherit'}} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setEventoNuevo(null)} style={btnSecundario}>Cancelar</button>
                <button type="submit" className="btn-primary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  disabled={guardando}>
                  {guardando ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : <><CheckCircle2 size={16} /> Crear Evento</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR EVENTO */}
      {eventoEditar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#00A651', fontSize: '18px', margin: 0 }}>Editar Evento</h3>
              <button onClick={() => setEventoEditar(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleGuardarEdicion} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Nombre *</label>
                <input required type="text" value={eventoEditar.nombre}
                  onChange={(e) => setEventoEditar({...eventoEditar, nombre: e.target.value})} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Tipo *</label>
                <select value={eventoEditar.tipo}
                  onChange={(e) => setEventoEditar({...eventoEditar, tipo: e.target.value})} style={inputStyle}>
                  {TIPOS_EVENTO.map(t => <option key={t.value} value={t.value}>{t.icono} {t.label}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Fecha *</label>
                  <input required type="date" value={eventoEditar.fecha}
                    onChange={(e) => setEventoEditar({...eventoEditar, fecha: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Hora</label>
                  <input type="time" value={eventoEditar.hora || ''}
                    onChange={(e) => setEventoEditar({...eventoEditar, hora: e.target.value})} style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Lugar</label>
                <input type="text" value={eventoEditar.lugar || ''}
                  onChange={(e) => setEventoEditar({...eventoEditar, lugar: e.target.value})} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Barrio / Colonia</label>
                <select value={eventoEditar.barrio_colonia_id || ''}
                  onChange={(e) => setEventoEditar({...eventoEditar, barrio_colonia_id: e.target.value || null})} style={inputStyle}>
                  <option value="">Sin asignar</option>
                  {barrios.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Estimados</label>
                  <input type="text" inputMode="numeric"
                    value={eventoEditar.asistentes_estimados}
                    onChange={(e) => setEventoEditar({...eventoEditar, asistentes_estimados: parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0})}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Reales</label>
                  <input type="text" inputMode="numeric"
                    value={eventoEditar.asistentes_reales}
                    onChange={(e) => setEventoEditar({...eventoEditar, asistentes_reales: parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0})}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Costo</label>
                  <input type="text" inputMode="decimal"
                    value={eventoEditar.costo}
                    onChange={(e) => setEventoEditar({...eventoEditar, costo: parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0})}
                    style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Notas</label>
                <textarea rows={2} value={eventoEditar.notas || ''}
                  onChange={(e) => setEventoEditar({...eventoEditar, notas: e.target.value})}
                  style={{...inputStyle, resize: 'vertical', fontFamily: 'inherit'}} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setEventoEditar(null)} style={btnSecundario}>Cancelar</button>
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