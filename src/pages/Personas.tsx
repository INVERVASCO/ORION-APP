import { useEffect, useState } from 'react';
import { 
  Search, User, Phone, Briefcase, MapPin, Download, Edit3, Trash2, 
  X, Loader2, Users, CheckCircle2, AlertTriangle, Shield, Plus 
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Toast from '../components/Toast';
import AvisoPrivacidad from '../components/AvisoPrivacidad';

interface Persona {
  id: string;
  nombre_completo: string;
  telefono: string | null;
  ocupacion: string | null;
  correo_electronico: string | null;
  direccion: string | null;
  preferencia_voto: string | null;
  barrio_colonia_id: string | null;
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

export default function Personas() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [personasFiltradas, setPersonasFiltradas] = useState<Persona[]>([]);
  const [barrios, setBarrios] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroBarrio, setFiltroBarrio] = useState('');
  const [filtroVoto, setFiltroVoto] = useState('');
  
  const [personaEditar, setPersonaEditar] = useState<Persona | null>(null);
  const [personaNueva, setPersonaNueva] = useState<any | null>(null);
  const [guardando, setGuardando] = useState(false);
  
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMensaje, setToastMensaje] = useState('');

  const [avisoVisible, setAvisoVisible] = useState(false);
  const [aceptoAviso, setAceptoAviso] = useState(false);

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
      const { data: personasData } = await supabase
        .from('personas')
        .select('id, nombre_completo, telefono, ocupacion, correo_electronico, direccion, preferencia_voto, barrio_colonia_id, created_at, barrios_colonias(nombre)')
        .order('created_at', { ascending: false });

      const { data: barriosData } = await supabase.from('barrios_colonias').select('id, nombre').order('nombre');

      if (personasData) {
        setPersonas(personasData as any);
        setPersonasFiltradas(personasData as any);
      }
      if (barriosData) setBarrios(barriosData);
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    let resultado = [...personas];
    if (busqueda.trim() !== '') {
      const q = busqueda.toLowerCase();
      resultado = resultado.filter(p =>
        p.nombre_completo.toLowerCase().includes(q) ||
        (p.telefono && p.telefono.includes(q)) ||
        (p.ocupacion && p.ocupacion.toLowerCase().includes(q))
      );
    }
    if (filtroBarrio) resultado = resultado.filter(p => p.barrio_colonia_id === filtroBarrio);
    if (filtroVoto) resultado = resultado.filter(p => p.preferencia_voto === filtroVoto);
    setPersonasFiltradas(resultado);
  }, [busqueda, filtroBarrio, filtroVoto, personas]);

  useEffect(() => {
    if (personaEditar || personaNueva) setAceptoAviso(false);
  }, [personaEditar, personaNueva]);

  // === CREAR NUEVA PERSONA ===
  const abrirModalNueva = () => {
    setPersonaNueva({
      nombre_completo: '',
      telefono: '',
      correo_electronico: '',
      ocupacion: '',
      direccion: '',
      barrio_colonia_id: '',
      preferencia_voto: '',
    });
  };

  const handleCrearPersona = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personaNueva) return;

    if (!aceptoAviso) {
      setToastMensaje('Debes confirmar el Aviso de Privacidad (LFPDPPP).');
      setToastVisible(true);
      return;
    }

    setGuardando(true);

    const { data, error } = await supabase
      .from('personas')
      .insert([{
        nombre_completo: personaNueva.nombre_completo,
        telefono: personaNueva.telefono || null,
        correo_electronico: personaNueva.correo_electronico || null,
        ocupacion: personaNueva.ocupacion || null,
        direccion: personaNueva.direccion || null,
        barrio_colonia_id: personaNueva.barrio_colonia_id || null,
        preferencia_voto: personaNueva.preferencia_voto || null,
        consentimiento_aceptado: true,
        fecha_consentimiento: new Date().toISOString(),
        origen_captura: 'Captura manual',
      }])
      .select('id, nombre_completo, telefono, ocupacion, correo_electronico, direccion, preferencia_voto, barrio_colonia_id, created_at, barrios_colonias(nombre)')
      .single();

    if (error) {
      setToastMensaje('Error al crear: ' + error.message);
      setToastVisible(true);
    } else if (data) {
      setPersonas([data as any, ...personas]);
      setPersonaNueva(null);
      setAceptoAviso(false);
      setToastMensaje(`¡${data.nombre_completo} registrado con éxito!`);
      setToastVisible(true);
    }
    setGuardando(false);
  };

  // === GUARDAR EDICIÓN ===
  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personaEditar) return;

    if (!aceptoAviso) {
      setToastMensaje('Debes confirmar el Aviso de Privacidad (LFPDPPP).');
      setToastVisible(true);
      return;
    }

    setGuardando(true);

    const { error } = await supabase
      .from('personas')
      .update({
        nombre_completo: personaEditar.nombre_completo,
        telefono: personaEditar.telefono,
        ocupacion: personaEditar.ocupacion,
        correo_electronico: personaEditar.correo_electronico,
        direccion: personaEditar.direccion,
        preferencia_voto: personaEditar.preferencia_voto,
        barrio_colonia_id: personaEditar.barrio_colonia_id,
      })
      .eq('id', personaEditar.id);

    if (error) {
      setToastMensaje('Error al guardar: ' + error.message);
      setToastVisible(true);
    } else {
      setPersonas(personas.map(p => p.id === personaEditar.id ? personaEditar : p));
      setPersonaEditar(null);
      setAceptoAviso(false);
      setToastMensaje('¡Datos actualizados con éxito!');
      setToastVisible(true);
    }
    setGuardando(false);
  };

  // === ELIMINAR ===
  const handleEliminar = (id: string, nombre: string) => {
    mostrarConfirm(
      '¿Eliminar esta persona?',
      `Se eliminará a "${nombre}" del directorio. También se eliminarán sus registros de activismo y de funcionario de casilla. Esta acción no se puede deshacer.`,
      'danger',
      async () => {
        cerrarConfirm();
        const { error } = await supabase.from('personas').delete().eq('id', id);
        if (error) {
          setToastMensaje('Error al eliminar: ' + error.message);
          setToastVisible(true);
        } else {
          setPersonas(personas.filter(p => p.id !== id));
          setToastMensaje(`${nombre} eliminado del directorio`);
          setToastVisible(true);
        }
      }
    );
  };

  const handleExportarCSV = () => {
    if (personasFiltradas.length === 0) {
      setToastMensaje('No hay datos para exportar');
      setToastVisible(true);
      return;
    }

    const encabezados = ['Nombre', 'Teléfono', 'Ocupación', 'Correo', 'Dirección', 'Preferencia Voto', 'Barrio/Colonia'];
    const filas = personasFiltradas.map(p => [
      p.nombre_completo, p.telefono || '', p.ocupacion || '', p.correo_electronico || '',
      p.direccion || '', p.preferencia_voto || '', p.barrios_colonias?.nombre || ''
    ]);

    const escapar = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;
    const csv = [
      encabezados.map(escapar).join(','),
      ...filas.map(fila => fila.map(escapar).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `personas_tula_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setToastMensaje(`Se exportaron ${personasFiltradas.length} registros`);
    setToastVisible(true);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px', gap: '10px', color: '#00A651' }}>
        <Loader2 size={32} /> Cargando personas...
      </div>
    );
  }

  return (
    <div>
      <h1 className="header-title">Directorio de Personas</h1>
      <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
        Base de datos consolidada de todas las personas capturadas en el sistema.
      </p>

      {/* Botones de acción */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#00A651' }}>
          <Users size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
          {personasFiltradas.length} {personasFiltradas.length === 1 ? 'persona' : 'personas'}
          {personas.length !== personasFiltradas.length && <span style={{ color: '#999', fontWeight: 'normal' }}> (de {personas.length})</span>}
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={handleExportarCSV}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px',
              padding: '12px 20px', background: 'white', color: '#0066CC',
              border: '2px solid #0066CC', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
            }}>
            <Download size={16} /> Exportar CSV
          </button>
          <button onClick={abrirModalNueva} className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
            <Plus size={16} /> Nueva Persona
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '25px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input
            type="text"
            placeholder="Buscar nombre, teléfono, ocupación..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ width: '100%', padding: '11px 11px 11px 40px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>
        <select value={filtroBarrio} onChange={(e) => setFiltroBarrio(e.target.value)}
          style={{ padding: '11px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '14px', background: 'white' }}>
          <option value="">Todos los barrios/colonias</option>
          {barrios.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
        </select>
        <select value={filtroVoto} onChange={(e) => setFiltroVoto(e.target.value)}
          style={{ padding: '11px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '14px', background: 'white' }}>
          <option value="">Todas las preferencias</option>
          <option value="UNIDOS X TULA">UNIDOS X TULA</option>
          <option value="MORENA">MORENA</option>
          <option value="PAN">PAN</option>
          <option value="PRI">PRI</option>
          <option value="Indeciso">Indeciso</option>
          <option value="Otro">Otro</option>
        </select>
      </div>

      {personasFiltradas.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <User size={40} color="#00A651" style={{ opacity: 0.5, marginBottom: '15px' }} />
          <p style={{ color: '#666', fontSize: '15px' }}>
            {personas.length === 0 ? 'Aún no hay personas capturadas. Presiona "Nueva Persona" para comenzar.' : 'No se encontraron resultados con los filtros aplicados.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
          {personasFiltradas.map(p => (
            <div key={p.id} style={{
              background: 'white', borderRadius: '10px', padding: '18px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: '4px solid #00A651',
              display: 'flex', flexDirection: 'column', gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                <div style={{
                  background: '#00A651', color: 'white', width: '36px', height: '36px',
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 'bold', fontSize: '15px', flexShrink: 0
                }}>
                  {p.nombre_completo.charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '15px', wordBreak: 'break-word', color: '#333' }}>
                    {p.nombre_completo}
                  </h3>
                  {p.preferencia_voto && (
                    <span style={{
                      display: 'inline-block', marginTop: '3px', padding: '2px 8px',
                      background: p.preferencia_voto === 'UNIDOS X TULA' ? '#00A651' : '#EEE',
                      color: p.preferencia_voto === 'UNIDOS X TULA' ? 'white' : '#666',
                      borderRadius: '10px', fontSize: '11px', fontWeight: 'bold'
                    }}>
                      {p.preferencia_voto}
                    </span>
                  )}
                </div>
              </div>

              {p.telefono && (
                <div style={{ fontSize: '13px', color: '#555', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={14} color="#00A651" /> {p.telefono}
                </div>
              )}
              {p.ocupacion && (
                <div style={{ fontSize: '13px', color: '#555', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Briefcase size={14} color="#00A651" /> {p.ocupacion}
                </div>
              )}
              {p.barrios_colonias?.nombre && (
                <div style={{ fontSize: '13px', color: '#555', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} color="#00A651" /> {p.barrios_colonias.nombre}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', paddingTop: '10px', borderTop: '1px solid #EEE' }}>
                <button onClick={() => setPersonaEditar(p)} style={{
                  flex: 1, padding: '8px', background: '#F4F4F4', border: 'none', borderRadius: '6px',
                  cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: '#333',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                }}>
                  <Edit3 size={14} /> Editar
                </button>
                <button onClick={() => handleEliminar(p.id, p.nombre_completo)} style={{
                  padding: '8px 12px', background: '#FFEBEE', border: 'none', borderRadius: '6px',
                  cursor: 'pointer', color: '#C62828',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: NUEVA PERSONA */}
      {personaNueva && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#00A651', fontSize: '18px', margin: 0 }}>Nueva Persona</h3>
              <button onClick={() => setPersonaNueva(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleCrearPersona} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Nombre completo *</label>
                <input required type="text" value={personaNueva.nombre_completo}
                  onChange={(e) => setPersonaNueva({...personaNueva, nombre_completo: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Teléfono</label>
                <input type="tel" value={personaNueva.telefono}
                  onChange={(e) => setPersonaNueva({...personaNueva, telefono: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Correo electrónico</label>
                <input type="email" value={personaNueva.correo_electronico}
                  onChange={(e) => setPersonaNueva({...personaNueva, correo_electronico: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Ocupación</label>
                <input type="text" value={personaNueva.ocupacion}
                  onChange={(e) => setPersonaNueva({...personaNueva, ocupacion: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Dirección</label>
                <input type="text" value={personaNueva.direccion}
                  onChange={(e) => setPersonaNueva({...personaNueva, direccion: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Barrio / Colonia</label>
                <select value={personaNueva.barrio_colonia_id}
                  onChange={(e) => setPersonaNueva({...personaNueva, barrio_colonia_id: e.target.value})} style={inputStyle}>
                  <option value="">Sin asignar</option>
                  {barrios.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Preferencia de voto</label>
                <select value={personaNueva.preferencia_voto}
                  onChange={(e) => setPersonaNueva({...personaNueva, preferencia_voto: e.target.value})} style={inputStyle}>
                  <option value="">Sin definir</option>
                  <option value="UNIDOS X TULA">UNIDOS X TULA</option>
                  <option value="MORENA">MORENA</option>
                  <option value="PAN">PAN</option>
                  <option value="PRI">PRI</option>
                  <option value="Indeciso">Indeciso</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div style={{ 
                display: 'flex', alignItems: 'flex-start', gap: '10px', 
                padding: '12px', background: '#FFF8E1', borderRadius: '6px', 
                borderLeft: '3px solid #F9A825' 
              }}>
                <input 
                  type="checkbox" 
                  id="acepto-aviso-nuevo" 
                  checked={aceptoAviso}
                  onChange={(e) => setAceptoAviso(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '2px', flexShrink: 0 }} 
                />
                <label htmlFor="acepto-aviso-nuevo" style={{ fontSize: '12px', color: '#555', cursor: 'pointer', lineHeight: '1.5' }}>
                  Confirmo que el titular ha leído y aceptado el{' '}
                  <button type="button" onClick={() => setAvisoVisible(true)}
                    style={{ background: 'none', border: 'none', color: '#00A651', cursor: 'pointer', textDecoration: 'underline', fontSize: '12px', fontWeight: 'bold', padding: 0 }}>
                    Aviso de Privacidad
                  </button>
                  {' '}conforme a la LFPDPPP.
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setPersonaNueva(null)} style={btnSecundario}>Cancelar</button>
                <button type="submit" className="btn-primary" 
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} 
                  disabled={guardando || !aceptoAviso}>
                  {guardando ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : <><Shield size={16} /> Crear Persona</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR PERSONA */}
      {personaEditar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#00A651', fontSize: '18px', margin: 0 }}>Editar Persona</h3>
              <button onClick={() => setPersonaEditar(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleGuardarEdicion} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Nombre completo *</label>
                <input required type="text" value={personaEditar.nombre_completo}
                  onChange={(e) => setPersonaEditar({...personaEditar, nombre_completo: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Teléfono</label>
                <input type="tel" value={personaEditar.telefono || ''}
                  onChange={(e) => setPersonaEditar({...personaEditar, telefono: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Correo electrónico</label>
                <input type="email" value={personaEditar.correo_electronico || ''}
                  onChange={(e) => setPersonaEditar({...personaEditar, correo_electronico: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Ocupación</label>
                <input type="text" value={personaEditar.ocupacion || ''}
                  onChange={(e) => setPersonaEditar({...personaEditar, ocupacion: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Dirección</label>
                <input type="text" value={personaEditar.direccion || ''}
                  onChange={(e) => setPersonaEditar({...personaEditar, direccion: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Barrio / Colonia</label>
                <select value={personaEditar.barrio_colonia_id || ''}
                  onChange={(e) => setPersonaEditar({...personaEditar, barrio_colonia_id: e.target.value || null})} style={inputStyle}>
                  <option value="">Sin asignar</option>
                  {barrios.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Preferencia de voto</label>
                <select value={personaEditar.preferencia_voto || ''}
                  onChange={(e) => setPersonaEditar({...personaEditar, preferencia_voto: e.target.value})} style={inputStyle}>
                  <option value="">Sin definir</option>
                  <option value="UNIDOS X TULA">UNIDOS X TULA</option>
                  <option value="MORENA">MORENA</option>
                  <option value="PAN">PAN</option>
                  <option value="PRI">PRI</option>
                  <option value="Indeciso">Indeciso</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div style={{ 
                display: 'flex', alignItems: 'flex-start', gap: '10px', 
                padding: '12px', background: '#FFF8E1', borderRadius: '6px', 
                borderLeft: '3px solid #F9A825' 
              }}>
                <input type="checkbox" id="acepto-aviso-edit" checked={aceptoAviso}
                  onChange={(e) => setAceptoAviso(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '2px', flexShrink: 0 }} />
                <label htmlFor="acepto-aviso-edit" style={{ fontSize: '12px', color: '#555', cursor: 'pointer', lineHeight: '1.5' }}>
                  Confirmo que el titular ha leído y aceptado el{' '}
                  <button type="button" onClick={() => setAvisoVisible(true)}
                    style={{ background: 'none', border: 'none', color: '#00A651', cursor: 'pointer', textDecoration: 'underline', fontSize: '12px', fontWeight: 'bold', padding: 0 }}>
                    Aviso de Privacidad
                  </button>
                  {' '}conforme a la LFPDPPP.
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setPersonaEditar(null)} style={btnSecundario}>Cancelar</button>
                <button type="submit" className="btn-primary" 
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} 
                  disabled={guardando || !aceptoAviso}>
                  {guardando ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : <><Shield size={16} /> Guardar Cambios</>}
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

      <AvisoPrivacidad 
        visible={avisoVisible} 
        onClose={() => setAvisoVisible(false)} 
        onAceptar={() => setAceptoAviso(true)}
        mostrarBotonAceptar={true}
      />

      <Toast mensaje={toastMensaje} visible={toastVisible} onClose={() => setToastVisible(false)} />
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '11px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '15px', boxSizing: 'border-box' };
const btnSecundario: React.CSSProperties = { flex: 1, padding: '12px', background: '#EEE', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };