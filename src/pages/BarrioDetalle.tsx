import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Users, Vote, Plus, MapPin, User, X, Phone, Trash2, Loader2,
  AlertTriangle, CheckCircle2 
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import ActivismoSection from '../components/ActivismoSection';
import Toast from '../components/Toast';
import { obtenerOCrearPersona } from '../lib/personaHelper';

interface Barrio { id: string; nombre: string; tipo: string; }
interface Seccion { id: string; numero_seccion: number; }
interface Casilla { id: string; seccion_id: string; tipo_casilla: string; numero_casilla: string; ubicacion: string; direccion: string; }
interface Funcionario {
  id: string;
  casilla_id: string;
  tipo_funcionario: string;
  tipo_nombramiento: string;
  personas: { nombre_completo: string; telefono: string | null; } | null;
}

interface ConfirmModalData {
  visible: boolean;
  titulo: string;
  mensaje: string;
  tipo: 'danger' | 'success' | 'warning';
  onConfirm: () => void;
}

export default function BarrioDetalle() {
  const { barrioId } = useParams();
  const navigate = useNavigate();

  const [barrio, setBarrio] = useState<Barrio | null>(null);
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [casillas, setCasillas] = useState<Casilla[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [tabActiva, setTabActiva] = useState<'activismo' | 'electoral'>('activismo');
  const [loading, setLoading] = useState(true);

  // Modal para agregar casilla
  const [modalCasilla, setModalCasilla] = useState(false);
  const [nuevaCasilla, setNuevaCasilla] = useState({ seccion_id: '', tipo_casilla: 'Básica', numero_casilla: '', ubicacion: '', direccion: '' });

  // Modal para agregar funcionario
  const [modalFuncionario, setModalFuncionario] = useState(false);
  const [casillaSeleccionada, setCasillaSeleccionada] = useState<Casilla | null>(null);
  const [nuevoFuncionario, setNuevoFuncionario] = useState({
    nombre_completo: '',
    telefono: '',
    tipo_funcionario: 'Representante de Casilla',
    tipo_nombramiento: 'Propietario'
  });
  const [guardando, setGuardando] = useState(false);

  // Toast de éxito
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

  // === Carga inicial ===
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: barrioData } = await supabase.from('barrios_colonias').select('*').eq('id', barrioId).single();
      if (barrioData) setBarrio(barrioData);

      const { data: seccionesData } = await supabase
        .from('secciones_electorales').select('id, numero_seccion')
        .eq('barrio_colonia_id', barrioId).order('numero_seccion');

      if (seccionesData && seccionesData.length > 0) {
        setSecciones(seccionesData);
        const seccionIds = seccionesData.map(s => s.id);

        const { data: casillasData } = await supabase.from('casillas').select('*').in('seccion_id', seccionIds);
        if (casillasData) {
          setCasillas(casillasData);
          const casillaIds = casillasData.map(c => c.id);
          if (casillaIds.length > 0) {
            const { data: funcData } = await supabase
              .from('funcionarios_casilla')
              .select('id, casilla_id, tipo_funcionario, tipo_nombramiento, personas(nombre_completo, telefono)')
              .in('casilla_id', casillaIds);
            if (funcData) setFuncionarios(funcData as any);
          }
        }
      }
      setLoading(false);
    };
    if (barrioId) fetchData();
  }, [barrioId]);

  // === Guardar Casilla ===
  const handleGuardarCasilla = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.from('casillas').insert([nuevaCasilla]).select();
    
    if (error) {
      setToastMensaje('Error al guardar casilla: ' + error.message);
      setToastVisible(true);
    } else if (data) {
      setCasillas([...casillas, ...data]);
      setModalCasilla(false);
      setNuevaCasilla({ seccion_id: '', tipo_casilla: 'Básica', numero_casilla: '', ubicacion: '', direccion: '' });
      setToastMensaje('¡Casilla agregada con éxito!');
      setToastVisible(true);
    }
  };

  // === Guardar Funcionario ===
  const handleGuardarFuncionario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!casillaSeleccionada) return;
    setGuardando(true);

    const resultado = await obtenerOCrearPersona({
      nombre_completo: nuevoFuncionario.nombre_completo,
      telefono: nuevoFuncionario.telefono || null,
    });

    if (!resultado) {
      setToastMensaje('Error al crear la persona');
      setToastVisible(true);
      setGuardando(false);
      return;
    }

    const personaId = resultado.id;
    const esPersonaNueva = resultado.esNueva;

    const { error: funcError } = await supabase
      .from('funcionarios_casilla')
      .insert([{
        casilla_id: casillaSeleccionada.id,
        persona_id: personaId,
        tipo_funcionario: nuevoFuncionario.tipo_funcionario,
        tipo_nombramiento: nuevoFuncionario.tipo_nombramiento
      }]);

    if (funcError) {
      setToastMensaje('Error al guardar funcionario: ' + funcError.message);
      setToastVisible(true);
    } else {
      const { data: funcData } = await supabase
        .from('funcionarios_casilla')
        .select('id, casilla_id, tipo_funcionario, tipo_nombramiento, personas(nombre_completo, telefono)')
        .eq('casilla_id', casillaSeleccionada.id);
      if (funcData) {
        setFuncionarios([...funcionarios.filter(f => f.casilla_id !== casillaSeleccionada.id), ...(funcData as any)]);
      }
      setModalFuncionario(false);
      setNuevoFuncionario({ nombre_completo: '', telefono: '', tipo_funcionario: 'Representante de Casilla', tipo_nombramiento: 'Propietario' });
      setToastMensaje(esPersonaNueva 
        ? `¡${nuevoFuncionario.nombre_completo} registrado como funcionario!` 
        : `¡Vinculado! ${nuevoFuncionario.nombre_completo} ya existía. Se asignó a esta casilla.`);
      setToastVisible(true);
    }
    setGuardando(false);
  };

  // === Eliminar Funcionario con Modal ===
  const handleEliminarFuncionario = (id: string, nombre: string) => {
    mostrarConfirm(
      '¿Eliminar este funcionario?',
      `Se eliminará a "${nombre}" de esta casilla. Esta acción no se puede deshacer.`,
      'danger',
      async () => {
        cerrarConfirm();
        const { error } = await supabase.from('funcionarios_casilla').delete().eq('id', id);
        if (!error) {
          setFuncionarios(funcionarios.filter(f => f.id !== id));
          setToastMensaje('Funcionario eliminado');
          setToastVisible(true);
        }
      }
    );
  };

  if (loading) return <p style={{ padding: '30px', color: '#9F2241', textAlign: 'center' }}>Cargando información...</p>;

  return (
    <div>
      <button onClick={() => navigate('/municipio')}
        style={{ background: 'none', border: 'none', color: '#9F2241', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '15px', fontWeight: 'bold', fontSize: '15px' }}>
        <ArrowLeft size={16} /> Volver al Municipio
      </button>

      <h1 className="header-title">
        {barrio?.nombre} <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal', textTransform: 'capitalize' }}>({barrio?.tipo})</span>
      </h1>

      {/* Pestañas */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '20px', borderBottom: '2px solid #E0E0E0' }}>
        <button onClick={() => setTabActiva('activismo')} style={{
          padding: '12px 16px', background: 'none', border: 'none',
          borderBottom: tabActiva === 'activismo' ? '3px solid #9F2241' : '3px solid transparent',
          color: tabActiva === 'activismo' ? '#9F2241' : '#666',
          cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px'
        }}>
          <Users size={18} /> ACTIVISMO
        </button>
        <button onClick={() => setTabActiva('electoral')} style={{
          padding: '12px 16px', background: 'none', border: 'none',
          borderBottom: tabActiva === 'electoral' ? '3px solid #9F2241' : '3px solid transparent',
          color: tabActiva === 'electoral' ? '#9F2241' : '#666',
          cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px'
        }}>
          <Vote size={18} /> ELECTORAL
        </button>
      </div>

      {/* ACTIVISMO */}
      {tabActiva === 'activismo' && (
        <ActivismoSection barrioId={barrioId} />
      )}

      {/* ELECTORAL */}
      {tabActiva === 'electoral' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <p style={{ margin: 0, fontSize: '14px' }}>
              <strong>{secciones.length}</strong> secciones · <strong>{casillas.length}</strong> casillas · <strong>{funcionarios.length}</strong> funcionarios
            </p>
            <button className="btn-primary" onClick={() => setModalCasilla(true)}
              disabled={secciones.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
              <Plus size={16} /> Agregar Casilla
            </button>
          </div>

          {secciones.map((seccion) => {
            const casillasSeccion = casillas.filter(c => c.seccion_id === seccion.id);
            return (
              <div key={seccion.id} className="card">
                <h3 style={{ color: '#9F2241', marginBottom: '15px', fontSize: '17px' }}>
                  Sección Electoral {seccion.numero_seccion}
                </h3>
                {casillasSeccion.length === 0 ? (
                  <p style={{ color: '#999', fontStyle: 'italic', fontSize: '14px' }}>Sin casillas registradas.</p>
                ) : (
                  casillasSeccion.map(casilla => {
                    const funcsCasilla = funcionarios.filter(f => f.casilla_id === casilla.id);
                    return (
                      <div key={casilla.id} style={{ padding: '15px', background: '#F9F9F9', borderRadius: '8px', borderLeft: '4px solid #9F2241', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                          <MapPin size={18} color="#9F2241" />
                          <strong>{casilla.tipo_casilla} {casilla.numero_casilla}</strong>
                        </div>
                        <p style={{ fontSize: '13px', color: '#555', marginBottom: '4px' }}>
                          <strong>Ubicación:</strong> {casilla.ubicacion}
                        </p>

                        {funcsCasilla.length > 0 && (
                          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #E0E0E0' }}>
                            <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#9F2241', marginBottom: '8px' }}>
                              Funcionarios asignados:
                            </p>
                            {funcsCasilla.map(func => (
                              <div key={func.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '8px 10px', background: 'white', borderRadius: '6px', marginBottom: '6px',
                                fontSize: '13px', gap: '10px'
                              }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <User size={14} color="#666" />
                                    <strong style={{ wordBreak: 'break-word' }}>{func.personas?.nombre_completo || 'Sin nombre'}</strong>
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                                    {func.tipo_funcionario} · {func.tipo_nombramiento}
                                  </div>
                                  {func.personas?.telefono && (
                                    <div style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                      <Phone size={12} /> {func.personas.telefono}
                                    </div>
                                  )}
                                </div>
                                <button onClick={() => handleEliminarFuncionario(func.id, func.personas?.nombre_completo || 'Sin nombre')}
                                  style={{ background: 'none', border: 'none', color: '#C62828', cursor: 'pointer', padding: '5px' }}>
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <button onClick={() => { setCasillaSeleccionada(casilla); setModalFuncionario(true); }}
                          style={{ marginTop: '10px', background: 'none', border: 'none', color: '#9F2241', cursor: 'pointer', fontWeight: 'bold', padding: 0, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Plus size={15} /> Capturar Funcionario
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Nueva Casilla */}
      {modalCasilla && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#9F2241', fontSize: '18px' }}>Nueva Casilla</h3>
              <button onClick={() => setModalCasilla(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} /></button>
            </div>
            <form onSubmit={handleGuardarCasilla} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Sección Electoral *</label>
                <select required value={nuevaCasilla.seccion_id} onChange={(e) => setNuevaCasilla({...nuevaCasilla, seccion_id: e.target.value})} style={inputStyle}>
                  <option value="">Selecciona una sección</option>
                  {secciones.map(s => <option key={s.id} value={s.id}>Sección {s.numero_seccion}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Tipo *</label>
                  <select value={nuevaCasilla.tipo_casilla} onChange={(e) => setNuevaCasilla({...nuevaCasilla, tipo_casilla: e.target.value})} style={inputStyle}>
                    <option>Básica</option><option>Contigua</option><option>Extraordinaria</option><option>Especial</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Número *</label>
                  <input required type="text" placeholder="Ej. Básica 1" value={nuevaCasilla.numero_casilla}
                    onChange={(e) => setNuevaCasilla({...nuevaCasilla, numero_casilla: e.target.value})} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Ubicación *</label>
                <input required type="text" placeholder="Ej. Escuela Primaria Justo Sierra" value={nuevaCasilla.ubicacion}
                  onChange={(e) => setNuevaCasilla({...nuevaCasilla, ubicacion: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Dirección</label>
                <input type="text" placeholder="Calle, número, colonia" value={nuevaCasilla.direccion}
                  onChange={(e) => setNuevaCasilla({...nuevaCasilla, direccion: e.target.value})} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setModalCasilla(false)} style={btnSecundario}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Nuevo Funcionario */}
      {modalFuncionario && casillaSeleccionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ color: '#9F2241', fontSize: '18px' }}>Capturar Funcionario</h3>
              <button onClick={() => setModalFuncionario(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} /></button>
            </div>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px', padding: '8px', background: '#F4F4F4', borderRadius: '6px' }}>
              <strong>Casilla:</strong> {casillaSeleccionada.tipo_casilla} {casillaSeleccionada.numero_casilla}
            </p>
            <form onSubmit={handleGuardarFuncionario} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Nombre completo *</label>
                <input required type="text" placeholder="Nombre del funcionario" value={nuevoFuncionario.nombre_completo}
                  onChange={(e) => setNuevoFuncionario({...nuevoFuncionario, nombre_completo: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Teléfono</label>
                <input type="tel" placeholder="Ej. 7712345678" value={nuevoFuncionario.telefono}
                  onChange={(e) => setNuevoFuncionario({...nuevoFuncionario, telefono: e.target.value})} style={inputStyle} />
                <p style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                  Si el teléfono ya existe, se vinculará a la persona registrada.
                </p>
              </div>
              <div>
                <label style={labelStyle}>Tipo de Funcionario *</label>
                <select value={nuevoFuncionario.tipo_funcionario}
                  onChange={(e) => setNuevoFuncionario({...nuevoFuncionario, tipo_funcionario: e.target.value})} style={inputStyle}>
                  <option>Representante de Casilla</option>
                  <option>Presidente de Casilla</option>
                  <option>Secretario de Casilla</option>
                  <option>Suplente</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Tipo de Nombramiento *</label>
                <select value={nuevoFuncionario.tipo_nombramiento}
                  onChange={(e) => setNuevoFuncionario({...nuevoFuncionario, tipo_nombramiento: e.target.value})} style={inputStyle}>
                  <option>Propietario</option>
                  <option>Suplente</option>
                </select>
              </div>
              <div style={{ fontSize: '12px', color: '#666', padding: '10px', background: '#FFF8E1', borderRadius: '6px', borderLeft: '3px solid #F9A825' }}>
                Al guardar, se registra el consentimiento del titular para el tratamiento de sus datos personales (LFPDPPP).
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                <button type="button" onClick={() => setModalFuncionario(false)} style={btnSecundario}>Cancelar</button>
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

// Estilos reutilizables
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '11px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '15px', boxSizing: 'border-box' };
const btnSecundario: React.CSSProperties = { flex: 1, padding: '12px', background: '#EEE', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };