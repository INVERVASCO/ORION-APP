import { useEffect, useState, useRef } from 'react';
import { 
  Users, UserPlus, Search, Filter, Phone, MapPin, 
  Trash2, Edit3, X, Download, AlertTriangle, Send,
  ChevronLeft, ChevronRight, FileSpreadsheet, Sparkles, Loader2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from '../lib/supabaseClient';
import TarjetaPremium from '../components/TarjetaPremium';
import SelectorTarjeta from '../components/SelectorTarjeta';
import ModalAvisoPrivacidad from '../components/ModalAvisoPrivacidad';
import { PARTIDOS_DB } from '../lib/config';

interface Persona {
  id: string;
  nombre_completo: string;
  telefono: string | null;
  correo_electronico: string | null;
  ocupacion: string | null;
  direccion: string | null;
  preferencia_voto: string | null;
  barrio_colonia_id: string | null;
  created_at: string;
  barrios_colonias?: { nombre: string } | null;
}

interface Barrio { id: string; nombre: string; }
interface ConfirmModalData {
  visible: boolean;
  titulo: string;
  mensaje: string;
  tipo: 'danger' | 'success' | 'warning';
  onConfirm: () => void;
}

export default function Personas() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [barrios, setBarrios] = useState<Barrio[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 50;

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

  const [tarjetaVisible, setTarjetaVisible] = useState(false);
  const [personaSeleccionada, setPersonaSeleccionada] = useState<any>(null);
  const [datosTarjeta, setDatosTarjeta] = useState<{ tipo: string; eventoData: any } | null>(null);
  const tarjetaRef = useRef<HTMLDivElement>(null);

  const [confirmModal, setConfirmModal] = useState<ConfirmModalData>({ visible: false, titulo: '', mensaje: '', tipo: 'warning', onConfirm: () => {} });
  const mostrarConfirm = (titulo: string, mensaje: string, tipo: 'danger' | 'success' | 'warning', onConfirm: () => void) => setConfirmModal({ visible: true, titulo, mensaje, tipo, onConfirm });
  const cerrarConfirm = () => setConfirmModal({ ...confirmModal, visible: false });

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) { 
        const { data } = await supabase.from('perfiles').select('rol').eq('id', user.id).single(); 
        if (data) setUserRole(data.rol); 
      }
    };
    fetchRole();
  }, []);

  const fetchPersonas = async () => {
    setLoading(true);
    let query = supabase.from('personas').select('id, nombre_completo, telefono, ocupacion, correo_electronico, direccion, preferencia_voto, barrio_colonia_id, created_at, barrios_colonias(nombre)', { count: 'exact' });

    if (busqueda.trim() !== '') query = query.ilike('nombre_completo', `%${busqueda}%`);
    if (filtroBarrio) query = query.eq('barrio_colonia_id', filtroBarrio);
    if (filtroVoto) query = query.eq('preferencia_voto', filtroVoto);

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
    
    if (!error && data) {
      const procesadas = data.map((p: any) => ({ ...p, barrios_colonias: Array.isArray(p.barrios_colonias) ? p.barrios_colonias[0] : p.barrios_colonias }));
      setPersonas(procesadas as any);
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

  useEffect(() => { const timer = setTimeout(() => { setPage(0); fetchPersonas(); }, 500); return () => clearTimeout(timer); }, [busqueda, filtroBarrio, filtroVoto]);
  useEffect(() => { fetchPersonas(); }, [page]);
  useEffect(() => { if (personaEditar || personaNueva) setAceptoAviso(false); }, [personaEditar, personaNueva]);

  const abrirModalNueva = () => { setPersonaNueva({ nombre_completo: '', telefono: '', correo_electronico: '', ocupacion: '', direccion: '', barrio_colonia_id: '', preferencia_voto: '' }); };

  const abrirSelectorTarjeta = (persona: any) => {
    setPersonaSeleccionada(persona);
    setTarjetaVisible(true);
  };

  const handleGenerarTarjeta = (tipo: string, eventoData: any) => {
    setTarjetaVisible(false); 
    setDatosTarjeta({ tipo, eventoData }); 
    setToastMensaje('🎨 Generando imagen premium...');
    setToastVisible(true);
  };

  useEffect(() => {
    if (!datosTarjeta || !tarjetaRef.current || !personaSeleccionada) return;

    const ejecutarCaptura = async () => {
      try {
        const images = Array.from(tarjetaRef.current!.querySelectorAll('img'));
        await Promise.all(images.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
        }));

        const canvas = await html2canvas(tarjetaRef.current!, { 
          scale: 2, useCORS: true, backgroundColor: null, logging: false 
        });
        
        canvas.toBlob(async (blob) => {
          if (!blob) {
            setToastMensaje('❌ Error al crear el archivo de imagen.');
            setToastVisible(true); setDatosTarjeta(null); return;
          }

          const file = new File([blob], `tarjeta_${datosTarjeta.tipo}.png`, { type: 'image/png' });
          const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;

          if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Una tarjeta para ti',
              text: `Hola ${personaSeleccionada.nombre_completo}, te comparto este pase especial.`
            });
            setToastMensaje('✅ ¡Enviado con éxito!');
          } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Pase_${personaSeleccionada.nombre_completo.replace(/\s+/g, '_')}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setToastMensaje('💾 Pase descargado');
          }
          setToastVisible(true);
          setDatosTarjeta(null);
        }, 'image/png');
      } catch (err) {
        console.error('Error al generar imagen:', err);
        setToastMensaje('❌ No se pudo generar la imagen');
        setToastVisible(true);
        setDatosTarjeta(null);
      }
    };

    const timer = setTimeout(ejecutarCaptura, 300);
    return () => clearTimeout(timer);
  }, [datosTarjeta]);

  const handleCrearPersona = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aceptoAviso) { alert('Debes confirmar que el titular aceptó el Aviso de Privacidad.'); return; }
    setGuardando(true);
    const { error } = await supabase.from('personas').insert([personaNueva]);
    if (!error) {
      setPersonaNueva(null);
      fetchPersonas();
      setToastMensaje('Persona registrada con éxito');
      setToastVisible(true);
    } else {
      alert('Error al registrar: ' + error.message);
    }
    setGuardando(false);
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personaEditar) return;
    setGuardando(true);
    const { error } = await supabase.from('personas').update({
      nombre_completo: personaEditar.nombre_completo,
      telefono: personaEditar.telefono,
      correo_electronico: personaEditar.correo_electronico,
      ocupacion: personaEditar.ocupacion,
      direccion: personaEditar.direccion,
      barrio_colonia_id: personaEditar.barrio_colonia_id,
      preferencia_voto: personaEditar.preferencia_voto
    }).eq('id', personaEditar.id);

    if (!error) {
      setPersonaEditar(null);
      fetchPersonas();
      setToastMensaje('Cambios guardados');
      setToastVisible(true);
    } else {
      alert('Error al actualizar: ' + error.message);
    }
    setGuardando(false);
  };

  const handleEliminar = (id: string, nombre: string) => {
    if (userRole !== 'admin' && userRole !== 'coordinador') {
      setToastMensaje('⚠️ Permiso denegado.');
      setToastVisible(true);
      return;
    }
    mostrarConfirm(
      '¿Eliminar registro?',
      `Se borrará a "${nombre}" del padrón. Esta acción queda en bitácora.`,
      'danger',
      async () => {
        const { error } = await supabase.from('personas').delete().eq('id', id);
        if (!error) {
          fetchPersonas();
          setToastMensaje('Persona eliminada');
          setToastVisible(true);
        } else {
          alert('Error al eliminar: ' + error.message);
        }
        cerrarConfirm();
      }
    );
  };

  const exportarExcel = async () => {
    if (userRole === 'consulta') {
      setToastMensaje('⚠️ El rol de Solo Lectura no tiene permisos para descargar el padrón.');
      setToastVisible(true);
      return;
    }
    setToastMensaje('Exportando datos...');
    setToastVisible(true);

    const { data } = await supabase.from('personas').select('nombre_completo, telefono, correo_electronico, ocupacion, direccion, preferencia_voto, barrios_colonias(nombre)').limit(50000);
    if (!data || data.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Padrón');
    worksheet.columns = [
      { header: 'Nombre Completo', key: 'nombre', width: 30 },
      { header: 'Teléfono', key: 'telefono', width: 18 },
      { header: 'Correo', key: 'correo', width: 25 },
      { header: 'Ocupación', key: 'ocupacion', width: 20 },
      { header: 'Dirección', key: 'direccion', width: 30 },
      { header: 'Colonia / Barrio', key: 'barrio', width: 25 },
      { header: 'Preferencia', key: 'preferencia', width: 20 },
    ];

    data.forEach((p: any) => {
      worksheet.addRow({
        nombre: p.nombre_completo,
        telefono: p.telefono || 'N/A',
        correo: p.correo_electronico || 'N/A',
        ocupacion: p.ocupacion || 'N/A',
        direccion: p.direccion || 'N/A',
        barrio: p.barrios_colonias?.nombre || 'Sin asignar',
        preferencia: p.preferencia_voto || 'Sin definir'
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Padron_ORION_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // 🛡️ FUNCIÓN DE ENMASCARAMIENTO PARA ROL CONSULTA (A-02)
  const enmascararTelefono = (tel: string | null) => {
    if (!tel) return '';
    if (userRole === 'consulta') {
      const limpio = tel.trim();
      if (limpio.length >= 7) {
        return `${limpio.slice(0, 3)} ••• ${limpio.slice(-4)}`;
      }
      return '••••••••';
    }
    return tel;
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 className="header-title" style={{ marginBottom: '5px' }}>Estructura Territorial de Personas</h1>
          <p style={{ color: '#666', fontSize: '14px' }}>Padrón territorial activo: {totalCount} ciudadanos registrados.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {userRole !== 'consulta' && (
            <button onClick={exportarExcel} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'white', border: '1px solid #CBD5E1', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#0F172A' }}>
              <FileSpreadsheet size={18} color="#10B981" /> Exportar Padrón
            </button>
          )}
          {userRole !== 'consulta' && (
            <button onClick={abrirModalNueva} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={18} /> Registrar Persona
            </button>
          )}
        </div>
      </div>

      {toastVisible && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', background: '#0A1628', color: '#00D4FF', padding: '12px 20px', borderRadius: '8px', zIndex: 9999, border: '1px solid #00D4FF', boxShadow: '0 4px 15px rgba(0,212,255,0.3)' }}>
          {toastMensaje}
          <button onClick={() => setToastVisible(false)} style={{ marginLeft: '10px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Buscador y Filtros */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 38px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '14px' }}
          />
        </div>
        <select value={filtroBarrio} onChange={(e) => setFiltroBarrio(e.target.value)} style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '14px', background: 'white' }}>
          <option value="">Todas las colonias</option>
          {barrios.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
        </select>
        <select value={filtroVoto} onChange={(e) => setFiltroVoto(e.target.value)} style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '14px', background: 'white' }}>
          <option value="">Todas las simpatías</option>
          {PARTIDOS_DB.map(p => <option key={p.key} value={p.nombre}>{p.nombre}</option>)}
          <option value="Indeciso">Indeciso</option>
          <option value="Otro">Otro</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '50px', gap: '10px', color: '#00D4FF' }}>
          <Loader2 size={32} className="animate-spin" /> Cargando padrón territorial...
        </div>
      ) : personas.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
          No se encontraron personas con los filtros seleccionados.
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
            {personas.map((p) => {
              const partidoInfo = PARTIDOS_DB.find(part => part.nombre === p.preferencia_voto);
              const colorBadge = partidoInfo ? partidoInfo.color : '#64748B';
              
              return (
                <div key={p.id} style={{ background: 'white', borderRadius: '10px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: '4px solid #00D4FF', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                    <div style={{ background: '#00D4FF', color: '#0A1628', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '15px', flexShrink: 0 }}>
                      {p.nombre_completo.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: '14px', wordBreak: 'break-word', color: '#0F172A' }}>{p.nombre_completo}</h3>
                      {p.preferencia_voto && (
                        <span style={{ display: 'inline-block', marginTop: '3px', padding: '2px 8px', background: colorBadge, color: 'white', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold' }}>
                          {p.preferencia_voto}
                        </span>
                      )}
                    </div>
                  </div>

                  {p.telefono && (
                    <div style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={13} color="#00D4FF" /> {enmascararTelefono(p.telefono)}
                      {userRole === 'consulta' && <span style={{ fontSize: '9px', color: '#94A3B8' }}>(Protegido LFPDPPP)</span>}
                    </div>
                  )}

                  {p.barrios_colonias?.nombre && (
                    <div style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={13} color="#00D4FF" /> {p.barrios_colonias.nombre}
                    </div>
                  )}
                  
                  {/* Botones de acción protegidos para no-consulta */}
                  {userRole !== 'consulta' && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', paddingTop: '8px', borderTop: '1px solid #E2E8F0' }}>
                      <button onClick={() => abrirSelectorTarjeta(p)} style={{ flex: 1, padding: '6px', background: '#E0F2FE', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <Send size={13} /> Tarjeta
                      </button>
                      <button onClick={() => setPersonaEditar(p)} style={{ flex: 1, padding: '6px', background: '#F1F5F9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <Edit3 size={13} /> Editar
                      </button>
                      <button onClick={() => handleEliminar(p.id, p.nombre_completo)} style={{ padding: '6px 10px', background: '#FFE4E6', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#F43F5E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', background: 'white', padding: '12px 16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: page === 0 ? '#F0F0F0' : 'white', color: page === 0 ? '#999' : '#00D4FF', border: '1px solid #E2E8F0', borderRadius: '6px', cursor: page === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                <ChevronLeft size={15} /> Anterior
              </button>
              <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 'bold' }}>Página {page + 1} de {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: page === totalPages - 1 ? '#F0F0F0' : 'white', color: page === totalPages - 1 ? '#999' : '#00D4FF', border: '1px solid #E2E8F0', borderRadius: '6px', cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                Siguiente <ChevronRight size={15} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal Nueva Persona */}
      {personaNueva && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#0A1628', fontSize: '18px', margin: 0, fontWeight: 'bold' }}>Registrar Ciudadano</h3>
              <button onClick={() => setPersonaNueva(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleCrearPersona} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Nombre Completo *</label>
                <input required type="text" value={personaNueva.nombre_completo} onChange={(e) => setPersonaNueva({...personaNueva, nombre_completo: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Teléfono</label>
                  <input type="tel" value={personaNueva.telefono} onChange={(e) => setPersonaNueva({...personaNueva, telefono: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Ocupación</label>
                  <input type="text" value={personaNueva.ocupacion} onChange={(e) => setPersonaNueva({...personaNueva, ocupacion: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Dirección / Calle</label>
                <input type="text" value={personaNueva.direccion} onChange={(e) => setPersonaNueva({...personaNueva, direccion: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Colonia / Barrio</label>
                  <select value={personaNueva.barrio_colonia_id} onChange={(e) => setPersonaNueva({...personaNueva, barrio_colonia_id: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', background: 'white' }}>
                    <option value="">Sin asignar</option>
                    {barrios.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Preferencia</label>
                  <select value={personaNueva.preferencia_voto} onChange={(e) => setPersonaNueva({...personaNueva, preferencia_voto: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', background: 'white' }}>
                    <option value="">Sin definir</option>
                    {PARTIDOS_DB.map(p => <option key={p.key} value={p.nombre}>{p.nombre}</option>)}
                    <option value="Indeciso">Indeciso</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px', background: '#FEF3C7', borderRadius: '6px', borderLeft: '3px solid #F59E0B' }}>
                <input type="checkbox" id="acepto-aviso-nuevo" checked={aceptoAviso} onChange={(e) => setAceptoAviso(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer', marginTop: '2px', flexShrink: 0 }} />
                <label htmlFor="acepto-aviso-nuevo" style={{ fontSize: '11px', color: '#475569', cursor: 'pointer', lineHeight: '1.4' }}>
                  Confirmo que el ciudadano autorizó el tratamiento de sus datos conforme al <button type="button" onClick={() => setAvisoVisible(true)} style={{ background: 'none', border: 'none', color: '#0284C7', cursor: 'pointer', textDecoration: 'underline', fontSize: '11px', fontWeight: 'bold', padding: 0 }}>Aviso de Privacidad LFPDPPP</button>.
                </label>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button type="button" onClick={() => setPersonaNueva(null)} style={{ flex: 1, padding: '8px', border: '1px solid #CBD5E1', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={guardando || !aceptoAviso}>
                  {guardando ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selector de Tarjeta y Pases */}
      {tarjetaVisible && (
        <SelectorTarjeta
          persona={personaSeleccionada}
          onSeleccionar={handleGenerarTarjeta}
          onCerrar={() => setTarjetaVisible(false)}
        />
      )}

      {/* Render Oculto para Generación de Imagen */}
      {datosTarjeta && personaSeleccionada && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
          <div ref={tarjetaRef}>
            <TarjetaPremium
              persona={personaSeleccionada}
              tipo={datosTarjeta.tipo}
              eventoData={datosTarjeta.eventoData}
            />
          </div>
        </div>
      )}

      {/* Modal de Aviso de Privacidad */}
      <ModalAvisoPrivacidad
        visible={avisoVisible}
        onCerrar={() => setAvisoVisible(false)}
      />

      {/* Modal de Confirmación Genérico */}
      {confirmModal.visible && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', color: '#0F172A' }}>{confirmModal.titulo}</h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px', lineHeight: '1.4' }}>{confirmModal.mensaje}</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={cerrarConfirm} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', background: 'white', cursor: 'pointer', fontSize: '13px' }}>Cancelar</button>
              <button onClick={confirmModal.onConfirm} style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: '#EF4444', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
