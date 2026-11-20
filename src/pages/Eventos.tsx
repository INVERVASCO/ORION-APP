import { useEffect, useState, useRef } from 'react';
import { 
  Search, Trash2, Edit3, Plus, X, Loader2, 
  AlertTriangle, CheckCircle2, Calendar as CalendarIcon, 
  MapPin, Users, DollarSign, Clock, Send, Image, ExternalLink, Check
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { supabase } from '../lib/supabaseClient';
import Toast from '../components/Toast';
import TarjetaPremium from '../components/TarjetaPremium';

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

interface PersonaConvocatoria {
  id: string;
  nombre_completo: string;
  telefono: string | null;
  barrio_colonia_id: string | null;
  barrios_colonias: { nombre: string } | null;
  invitado: boolean;
  envioInfo?: { created_at: string } | null;
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
  
  // --- MÓDULO DE CONVOCATORIA Y ENVÍO RÁPIDO DE INVITACIONES ---
  const [eventoConvocatoria, setEventoConvocatoria] = useState<Evento | null>(null);
  const [personasConvocatoria, setPersonasConvocatoria] = useState<PersonaConvocatoria[]>([]);
  const [cargandoConvocatoria, setCargandoConvocatoria] = useState(false);
  const [filtroConvocatoriaBarrio, setFiltroConvocatoriaBarrio] = useState('');
  const [filtroConvocatoriaEstado, setFiltroConvocatoriaEstado] = useState<'todos' | 'pendientes' | 'enviados'>('todos');
  const [busquedaConvocatoria, setBusquedaConvocatoria] = useState('');

  // Generación de Tarjeta Gráfica en Segundo Plano
  const [personaParaTarjeta, setPersonaParaTarjeta] = useState<PersonaConvocatoria | null>(null);
  const [generandoTarjeta, setGenerandoTarjeta] = useState(false);
  const tarjetaRef = useRef<HTMLDivElement>(null);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMensaje, setToastMensaje] = useState('');

  const [confirmModal, setConfirmModal] = useState<ConfirmModalData>({
    visible: false, titulo: '', mensaje: '', tipo: 'warning', onConfirm: () => {},
  });

  const mostrarConfirm = (titulo: string, mensaje: string, tipo: 'danger' | 'success' | 'warning', onConfirm: () => void) => {
    setConfirmModal({ visible: true, titulo, mensaje, tipo, onConfirm });
  };
  const cerrarConfirm = () => setConfirmModal({ ...confirmModal, visible: false });

  const fetchEventos = async () => {
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

  useEffect(() => {
    fetchEventos();
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

  // --- ABRIR MODAL DE CONVOCATORIA (Respeta RLS de Supabase automáticamente) ---
  const abrirConvocatoria = async (ev: Evento) => {
    setEventoConvocatoria(ev);
    setCargandoConvocatoria(true);
    setBusquedaConvocatoria('');
    setFiltroConvocatoriaBarrio('');
    setFiltroConvocatoriaEstado('todos');

    try {
      const [personasRes, enviosRes] = await Promise.all([
        supabase
          .from('personas')
          .select('id, nombre_completo, telefono, barrio_colonia_id, barrios_colonias(nombre)')
          .order('nombre_completo', { ascending: true }),
        supabase
          .from('comunicaciones_enviadas')
          .select('persona_id, created_at, enviado_por')
          .eq('evento_id', ev.id)
      ]);

      const enviosMap = new Map<string, any>();
      if (enviosRes.data) {
        enviosRes.data.forEach((item: any) => {
          enviosMap.set(item.persona_id, item);
        });
      }

      const listado: PersonaConvocatoria[] = (personasRes.data || []).map((p: any) => ({
        id: p.id,
        nombre_completo: p.nombre_completo,
        telefono: p.telefono,
        barrio_colonia_id: p.barrio_colonia_id,
        barrios_colonias: p.barrios_colonias,
        invitado: enviosMap.has(p.id),
        envioInfo: enviosMap.get(p.id) || null
      }));

      setPersonasConvocatoria(listado);
    } catch (err: any) {
      setToastMensaje('Error al cargar convocatoria: ' + err.message);
      setToastVisible(true);
    } finally {
      setCargandoConvocatoria(false);
    }
  };

  // --- DESPACHAR INVITACIÓN SOLO TEXTO POR WHATSAPP (VELOCIDAD PURA) ---
  const handleDespacharWhatsApp = async (p: PersonaConvocatoria) => {
    if (!eventoConvocatoria) return;
    if (!p.telefono) {
      setToastMensaje(`⚠️ ${p.nombre_completo} no tiene teléfono registrado.`);
      setToastVisible(true);
      return;
    }

    const telLimpio = p.telefono.replace(/[^0-9]/g, '');
    if (telLimpio.length < 10) {
      setToastMensaje(`⚠️ El teléfono de ${p.nombre_completo} no parece válido.`);
      setToastVisible(true);
      return;
    }

    const telefonoFinal = telLimpio.length === 10 ? `52${telLimpio}` : telLimpio;
    const primerNombre = p.nombre_completo.split(' ')[0];

    let fechaTxt = eventoConvocatoria.fecha;
    try {
      const [y, m, d] = eventoConvocatoria.fecha.split('-');
      const dt = new Date(Number(y), Number(m) - 1, Number(d));
      fechaTxt = dt.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
      fechaTxt = fechaTxt.charAt(0).toUpperCase() + fechaTxt.slice(1);
    } catch {}

    const horaTxt = eventoConvocatoria.hora ? eventoConvocatoria.hora.substring(0, 5) : '';

    const mensaje = `¡Hola ${primerNombre}! 👋\n\nTe hacemos llegar esta cordial invitación para nuestro gran encuentro ciudadano:\n\n⭐ *${eventoConvocatoria.nombre.replace(/_/g, ' ')}*\n📅 *Fecha:* ${fechaTxt}\n${horaTxt ? `🕒 *Hora:* ${horaTxt} hrs\n` : ''}${eventoConvocatoria.lugar ? `📍 *Sede:* ${eventoConvocatoria.lugar}\n` : ''}\n¡Tu presencia y liderazgo son el motor de este movimiento! 🌟\n\n_Por favor confírmanos tu asistencia respondiendo a este mensaje._`;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('comunicaciones_enviadas').insert([{
        persona_id: p.id,
        evento_id: eventoConvocatoria.id,
        tipo_tarjeta: 'evento',
        enviado_por: user?.id
      }]);

      setPersonasConvocatoria(prev => prev.map(item => 
        item.id === p.id 
          ? { ...item, invitado: true, envioInfo: { created_at: new Date().toISOString() } } 
          : item
      ));

      const url = `https://wa.me/${telefonoFinal}?text=${encodeURIComponent(mensaje)}`;
      window.open(url, '_blank');

      setToastMensaje(`✅ Invitación despachada a ${primerNombre}`);
      setToastVisible(true);
    } catch (err: any) {
      setToastMensaje('Error al registrar envío: ' + err.message);
      setToastVisible(true);
    }
  };

  // --- TRUCO PRO: PASE VIP CON COPIADO DIRECTO O COMPARTIR MÓVIL ---
  const handleDescargarPaseGrafico = (p: PersonaConvocatoria) => {
    setPersonaParaTarjeta(p);
    setGenerandoTarjeta(true);
    setToastMensaje(`🎨 Generando Pase VIP para ${p.nombre_completo.split(' ')[0]}...`);
    setToastVisible(true);
  };

  useEffect(() => {
    if (!generandoTarjeta || !personaParaTarjeta || !tarjetaRef.current || !eventoConvocatoria) return;

    const capturarYDespachar = async () => {
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
            setToastMensaje('Error al generar imagen');
            setToastVisible(true);
            setGenerandoTarjeta(false);
            setPersonaParaTarjeta(null);
            return;
          }

          const primerNombre = personaParaTarjeta.nombre_completo.split(' ')[0];
          let fechaTxt = eventoConvocatoria.fecha;
          try {
            const [y, m, d] = eventoConvocatoria.fecha.split('-');
            const dt = new Date(Number(y), Number(m) - 1, Number(d));
            fechaTxt = dt.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
            fechaTxt = fechaTxt.charAt(0).toUpperCase() + fechaTxt.slice(1);
          } catch {}
          const horaTxt = eventoConvocatoria.hora ? eventoConvocatoria.hora.substring(0, 5) : '';

          const mensaje = `¡Hola ${primerNombre}! 👋\n\nTe compartimos tu *Pase Oficial de Acceso VIP* para nuestro gran encuentro:\n\n⭐ *${eventoConvocatoria.nombre.replace(/_/g, ' ')}*\n📅 *Fecha:* ${fechaTxt}\n${horaTxt ? `🕒 *Hora:* ${horaTxt} hrs\n` : ''}${eventoConvocatoria.lugar ? `📍 *Sede:* ${eventoConvocatoria.lugar}\n` : ''}\n¡Tu presencia y liderazgo son el motor de este movimiento! 🌟\n\n_Presenta este pase digital en el acceso principal._`;

          const fileName = `PASE_VIP_${eventoConvocatoria.nombre.replace(/\s+/g, '_')}_${personaParaTarjeta.nombre_completo.replace(/\s+/g, '_')}.png`;
          const file = new File([blob], fileName, { type: 'image/png' });

          // Auto-registro en Supabase (Semáforo a verde)
          try {
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('comunicaciones_enviadas').insert([{
              persona_id: personaParaTarjeta.id,
              evento_id: eventoConvocatoria.id,
              tipo_tarjeta: 'evento',
              enviado_por: user?.id
            }]);

            setPersonasConvocatoria(prev => prev.map(item => 
              item.id === personaParaTarjeta.id 
                ? { ...item, invitado: true, envioInfo: { created_at: new Date().toISOString() } } 
                : item
            ));
          } catch (e) {
            console.error('Error registrando comunicación:', e);
          }

          const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;

          // 1. EN CELULAR: Si soporta compartir archivos, abre directamente WhatsApp con imagen + texto
          if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: `Pase VIP - ${eventoConvocatoria.nombre.replace(/_/g, ' ')}`,
                text: mensaje
              });
              setToastMensaje('✅ Pase VIP compartido con éxito');
            } catch (shareErr) {
              // Si cancela compartir, no emitimos error
            }
          } else {
            // 2. EN COMPUTADORA (EL TRUCO): Copiar imagen al portapapeles + Abrir WhatsApp + Descarga
            let copiadoExitoso = false;
            try {
              if (navigator.clipboard && (window as any).ClipboardItem) {
                await navigator.clipboard.write([
                  new (window as any).ClipboardItem({ 'image/png': blob })
                ]);
                copiadoExitoso = true;
              }
            } catch (clipErr) {
              console.log('Permiso de portapapeles no disponible:', clipErr);
            }

            // Descarga de respaldo en PC
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 100);

            // Abrir WhatsApp Web con el chat y texto precargado
            if (personaParaTarjeta.telefono) {
              const telLimpio = personaParaTarjeta.telefono.replace(/[^0-9]/g, '');
              const telefonoFinal = telLimpio.length === 10 ? `52${telLimpio}` : telLimpio;
              const waUrl = `https://wa.me/${telefonoFinal}?text=${encodeURIComponent(mensaje)}`;
              window.open(waUrl, '_blank');
            }

            if (copiadoExitoso) {
              setToastMensaje('📋 ¡Pase VIP copiado! En WhatsApp presiona Ctrl + V para pegarlo.');
            } else {
              setToastMensaje('📥 Pase VIP descargado y WhatsApp abierto.');
            }
          }

          setToastVisible(true);
          setGenerandoTarjeta(false);
          setPersonaParaTarjeta(null);
        }, 'image/png');

      } catch (e) {
        setToastMensaje('Error al generar el Pase VIP');
        setToastVisible(true);
        setGenerandoTarjeta(false);
        setPersonaParaTarjeta(null);
      }
    };

    const timer = setTimeout(capturarYDespachar, 250);
    return () => clearTimeout(timer);
  }, [generandoTarjeta, personaParaTarjeta, eventoConvocatoria]);

  // Filtros de la Convocatoria
  const personasConvocatoriaFiltradas = personasConvocatoria.filter(p => {
    if (filtroConvocatoriaBarrio && p.barrio_colonia_id !== filtroConvocatoriaBarrio) return false;
    if (filtroConvocatoriaEstado === 'pendientes' && p.invitado) return false;
    if (filtroConvocatoriaEstado === 'enviados' && !p.invitado) return false;
    if (busquedaConvocatoria.trim()) {
      const q = busquedaConvocatoria.toLowerCase();
      const matchNombre = p.nombre_completo.toLowerCase().includes(q);
      const matchTel = (p.telefono || '').includes(q);
      if (!matchNombre && !matchTel) return false;
    }
    return true;
  });

  const totalConvocados = personasConvocatoria.length;
  const totalEnviados = personasConvocatoria.filter(p => p.invitado).length;
  const totalPendientes = totalConvocados - totalEnviados;
  const porcentajeEnviado = totalConvocados > 0 ? Math.round((totalEnviados / totalConvocados) * 100) : 0;

  // Manejadores CRUD Eventos
  const handleGuardarNuevo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventoNuevo) return;
    setGuardando(true);

    const { error } = await supabase.from('eventos').insert([{
      nombre: eventoNuevo.nombre,
      tipo: eventoNuevo.tipo || 'reunion',
      fecha: eventoNuevo.fecha,
      hora: eventoNuevo.hora || null,
      lugar: eventoNuevo.lugar || null,
      barrio_colonia_id: eventoNuevo.barrio_colonia_id || null,
      asistentes_estimados: parseInt(eventoNuevo.asistentes_estimados) || 0,
      asistentes_reales: parseInt(eventoNuevo.asistentes_reales) || 0,
      costo: parseFloat(eventoNuevo.costo) || 0,
      notas: eventoNuevo.notas || null,
    }]);

    if (error) {
      setToastMensaje('Error al crear: ' + error.message);
      setToastVisible(true);
    } else {
      setEventoNuevo(null);
      fetchEventos();
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <div>
          <h1 className="header-title" style={{ margin: 0 }}>Eventos de Campaña</h1>
          <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '14px' }}>
            Calendario oficial, seguimiento de asistencia y centro de convocatoria.
          </p>
        </div>
        <button 
          onClick={() => setEventoNuevo({
            nombre: '', tipo: 'reunion', fecha: new Date().toISOString().split('T')[0],
            hora: '17:00', lugar: '', barrio_colonia_id: '',
            asistentes_estimados: 50, asistentes_reales: 0, costo: 0, notas: ''
          })}
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={18} /> Nuevo Evento
        </button>
      </div>

      {/* KPIS */}
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
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Presupuesto Total</div>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="card" style={{ padding: '15px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#999" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Buscar evento o lugar..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: '6px', border: '1px solid #DDD', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #DDD', fontSize: '14px' }}
            >
              <option value="">Todos los tipos</option>
              {TIPOS_EVENTO.map(t => (
                <option key={t.value} value={t.value}>{t.icono} {t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value as any)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #DDD', fontSize: '14px' }}
            >
              <option value="todos">Todos los periodos</option>
              <option value="proximos">📅 Próximos</option>
              <option value="pasados">⌛ Pasados</option>
            </select>
          </div>
        </div>
      </div>

      {/* LISTA DE EVENTOS */}
      {filtrados.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
          No se encontraron eventos con los filtros seleccionados.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {filtrados.map(ev => {
            const tipoInfo = getTipoInfo(ev.tipo);
            const esPasado = ev.fecha < hoy;

            return (
              <div 
                key={ev.id} 
                className="card" 
                style={{ 
                  padding: '18px', 
                  borderLeft: `5px solid ${tipoInfo.color}`,
                  display: 'flex', flexDirection: 'column', gap: '10px',
                  background: esPasado ? '#FAFAFA' : 'white',
                  opacity: esPasado ? 0.9 : 1
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      background: `${tipoInfo.color}15`, color: tipoInfo.color,
                      fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px',
                      marginBottom: '6px'
                    }}>
                      {tipoInfo.icono} {tipoInfo.label}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#1E293B' }}>{ev.nombre.replace(/_/g, ' ')}</h3>
                  </div>
                  {esPasado && (
                    <span style={{ 
                      background: '#EEE', color: '#666', padding: '2px 6px', borderRadius: '4px', 
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
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px',
                  marginTop: '6px', padding: '10px', background: '#F8FAFC', borderRadius: '8px'
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

                {/* BOTONES DE ACCIÓN: CONVOCATORIA DESTACADA */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
                  <button 
                    onClick={() => abrirConvocatoria(ev)} 
                    style={{
                      flex: 2, padding: '8px', background: '#E0F2FE', border: '1px solid #BAE6FD', borderRadius: '6px',
                      cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: '#0284C7',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Send size={14} color="#0284C7" /> Convocatoria
                  </button>
                  <button 
                    onClick={() => setEventoEditar(ev)} 
                    style={{
                      flex: 1, padding: '8px', background: '#F1F5F9', border: 'none', borderRadius: '6px',
                      cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: '#334155',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                    }}
                  >
                    <Edit3 size={14} /> Editar
                  </button>
                  <button 
                    onClick={() => handleEliminar(ev.id, ev.nombre)} 
                    style={{
                      padding: '8px 12px', background: '#FFE4E6', border: 'none', borderRadius: '6px',
                      cursor: 'pointer', color: '#E11D48',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL MAESTRO: CONVOCATORIA Y DESPACHO RÁPIDO WHATSAPP  */}
      {/* ======================================================== */}
      {eventoConvocatoria && (
        <div style={{ 
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', 
          backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', 
          alignItems: 'center', zIndex: 3000, padding: '16px' 
        }}>
          <div style={{ 
            background: 'white', borderRadius: '18px', width: '100%', maxWidth: '820px', 
            maxHeight: '92vh', display: 'flex', flexDirection: 'column', 
            boxShadow: '0 25px 60px rgba(0,0,0,0.4)', overflow: 'hidden' 
          }}>
            
            {/* Header Convocatoria */}
            <div style={{ padding: '20px 24px', background: '#0F172A', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#00D4FF', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase' }}>
                  CENTRO DE CONVOCATORIA ELECTORAL
                </span>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: '800' }}>
                  {eventoConvocatoria.nombre.replace(/_/g, ' ')}
                </h2>
                <div style={{ display: 'flex', gap: '15px', marginTop: '6px', fontSize: '13px', color: '#94A3B8' }}>
                  <span>📅 {eventoConvocatoria.fecha}</span>
                  {eventoConvocatoria.hora && <span>🕒 {eventoConvocatoria.hora} hrs</span>}
                  {eventoConvocatoria.lugar && <span>📍 {eventoConvocatoria.lugar}</span>}
                </div>
              </div>
              <button 
                onClick={() => setEventoConvocatoria(null)} 
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Barra de Estadísticas de Avance */}
            <div style={{ padding: '16px 24px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', color: '#475569' }}>
                  Avance de Invitaciones: <strong>{totalEnviados}</strong> de <strong>{totalConvocados}</strong> personas ({porcentajeEnviado}%)
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                  <span style={{ color: '#059669', fontWeight: 'bold' }}>🟢 Enviados: {totalEnviados}</span>
                  <span style={{ color: '#D97706', fontWeight: 'bold' }}>🟡 Pendientes: {totalPendientes}</span>
                </div>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${porcentajeEnviado}%`, height: '100%', background: '#00D4FF', transition: 'width 0.4s ease' }} />
              </div>
            </div>

            {/* Filtros de la Convocatoria */}
            <div style={{ padding: '14px 24px', display: 'flex', gap: '10px', flexWrap: 'wrap', background: 'white', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ flex: 2, minWidth: '180px', position: 'relative' }}>
                <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Buscar por nombre o teléfono..."
                  value={busquedaConvocatoria}
                  onChange={(e) => setBusquedaConvocatoria(e.target.value)}
                  style={{ width: '100%', padding: '8px 8px 8px 32px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ flex: 1, minWidth: '160px' }}>
                <select
                  value={filtroConvocatoriaBarrio}
                  onChange={(e) => setFiltroConvocatoriaBarrio(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                >
                  <option value="">Todas las colonias</option>
                  {barrios.map(b => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Botones de Estado */}
              <div style={{ display: 'flex', gap: '4px', background: '#F1F5F9', padding: '3px', borderRadius: '8px' }}>
                <button
                  onClick={() => setFiltroConvocatoriaEstado('todos')}
                  style={{
                    padding: '6px 12px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer',
                    background: filtroConvocatoriaEstado === 'todos' ? 'white' : 'transparent',
                    color: filtroConvocatoriaEstado === 'todos' ? '#0F172A' : '#64748B',
                    boxShadow: filtroConvocatoriaEstado === 'todos' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  Todos ({personasConvocatoria.length})
                </button>
                <button
                  onClick={() => setFiltroConvocatoriaEstado('pendientes')}
                  style={{
                    padding: '6px 12px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer',
                    background: filtroConvocatoriaEstado === 'pendientes' ? 'white' : 'transparent',
                    color: filtroConvocatoriaEstado === 'pendientes' ? '#D97706' : '#64748B',
                    boxShadow: filtroConvocatoriaEstado === 'pendientes' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  Pendientes ({totalPendientes})
                </button>
                <button
                  onClick={() => setFiltroConvocatoriaEstado('enviados')}
                  style={{
                    padding: '6px 12px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer',
                    background: filtroConvocatoriaEstado === 'enviados' ? 'white' : 'transparent',
                    color: filtroConvocatoriaEstado === 'enviados' ? '#059669' : '#64748B',
                    boxShadow: filtroConvocatoriaEstado === 'enviados' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  Enviados ({totalEnviados})
                </button>
              </div>
            </div>

            {/* Lista de Convocados con Despacho 1-Click */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              {cargandoConvocatoria ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', gap: '10px', color: '#0284C7' }}>
                  <Loader2 size={24} className="animate-spin" /> Cargando listado de ciudadanos...
                </div>
              ) : personasConvocatoriaFiltradas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontSize: '14px' }}>
                  No se encontraron ciudadanos con los filtros seleccionados.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {personasConvocatoriaFiltradas.map(p => {
                    const iniciales = p.nombre_completo.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                    return (
                      <div 
                        key={p.id}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '12px 16px', borderRadius: '12px',
                          background: p.invitado ? '#F0FDF4' : 'white',
                          border: `1px solid ${p.invitado ? '#BBF7D0' : '#E2E8F0'}`,
                          transition: 'all 0.15s'
                        }}
                      >
                        {/* Info Ciudadano */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                          <div style={{
                            width: '38px', height: '38px', borderRadius: '50%',
                            background: p.invitado ? '#DCFCE7' : '#E0F2FE',
                            color: p.invitado ? '#16A34A' : '#0284C7',
                            fontWeight: 'bold', fontSize: '13px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                          }}>
                            {p.invitado ? <Check size={18} /> : iniciales}
                          </div>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#0F172A' }}>
                              {p.nombre_completo}
                            </div>
                            <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                              <span>📞 {p.telefono || 'Sin teléfono'}</span>
                              {p.barrios_colonias?.nombre && <span>📍 {p.barrios_colonias.nombre}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Estado y Acciones Rápidas */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {/* Badge de Estado */}
                          <span style={{
                            padding: '4px 10px', borderRadius: '50px', fontSize: '11px', fontWeight: 'bold',
                            background: p.invitado ? '#DCFCE7' : '#FEF3C7',
                            color: p.invitado ? '#15803D' : '#B45309'
                          }}>
                            {p.invitado ? 'Invitado' : 'Pendiente'}
                          </span>

                          {/* Botón Pase VIP con Magia Portapapeles/Compartir */}
                          <button
                            onClick={() => handleDescargarPaseGrafico(p)}
                            title="Generar Pase VIP, copiar al portapapeles y abrir WhatsApp"
                            style={{
                              padding: '8px 12px', background: '#F1F5F9', border: '1px solid #CBD5E1',
                              borderRadius: '8px', cursor: 'pointer', color: '#334155',
                              display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 'bold'
                            }}
                          >
                            <Image size={14} /> Pase VIP
                          </button>

                          {/* Botón 1-Click WhatsApp Solo Texto */}
                          <button
                            onClick={() => handleDespacharWhatsApp(p)}
                            disabled={!p.telefono}
                            style={{
                              padding: '8px 14px',
                              background: p.invitado ? '#16A34A' : '#25D366',
                              color: 'white', border: 'none', borderRadius: '8px',
                              cursor: p.telefono ? 'pointer' : 'not-allowed',
                              fontSize: '12px', fontWeight: 'bold',
                              display: 'flex', alignItems: 'center', gap: '6px',
                              opacity: p.telefono ? 1 : 0.5,
                              boxShadow: '0 2px 4px rgba(37, 211, 102, 0.2)'
                            }}
                          >
                            <ExternalLink size={14} /> {p.invitado ? 'Reenviar WA' : 'Enviar WA'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Modal Convocatoria */}
            <div style={{ padding: '14px 24px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEventoConvocatoria(null)}
                style={{ padding: '10px 20px', background: '#0F172A', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
              >
                Cerrar Centro de Convocatoria
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Renderizado Oculto de la Tarjeta para Captura HTML2Canvas */}
      {personaParaTarjeta && eventoConvocatoria && (
        <TarjetaPremium
          ref={tarjetaRef}
          tipo="evento"
          persona={personaParaTarjeta}
          eventoData={{
            nombre: eventoConvocatoria.nombre,
            fecha: eventoConvocatoria.fecha,
            hora: eventoConvocatoria.hora,
            lugar: eventoConvocatoria.lugar
          }}
        />
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

            <form onSubmit={handleGuardarNuevo} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Nombre del Evento *</label>
                <input required type="text" placeholder="Ej. Mitin de Arranque"
                  value={eventoNuevo.nombre}
                  onChange={(e) => setEventoNuevo({...eventoNuevo, nombre: e.target.value})} style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Tipo</label>
                  <select value={eventoNuevo.tipo}
                    onChange={(e) => setEventoNuevo({...eventoNuevo, tipo: e.target.value})} style={inputStyle}>
                    {TIPOS_EVENTO.map(t => <option key={t.value} value={t.value}>{t.icono} {t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Fecha *</label>
                  <input required type="date" value={eventoNuevo.fecha}
                    onChange={(e) => setEventoNuevo({...eventoNuevo, fecha: e.target.value})} style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Hora</label>
                  <input type="time" value={eventoNuevo.hora}
                    onChange={(e) => setEventoNuevo({...eventoNuevo, hora: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Lugar</label>
                  <input type="text" placeholder="Ej. Plaza Principal" value={eventoNuevo.lugar}
                    onChange={(e) => setEventoNuevo({...eventoNuevo, lugar: e.target.value})} style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Barrio / Colonia</label>
                <select value={eventoNuevo.barrio_colonia_id}
                  onChange={(e) => setEventoNuevo({...eventoNuevo, barrio_colonia_id: e.target.value})} style={inputStyle}>
                  <option value="">Sin asignar</option>
                  {barrios.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Estimados</label>
                  <input type="text" inputMode="numeric"
                    value={eventoNuevo.asistentes_estimados}
                    onChange={(e) => setEventoNuevo({...eventoNuevo, asistentes_estimados: parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0})}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Reales</label>
                  <input type="text" inputMode="numeric"
                    value={eventoNuevo.asistentes_reales}
                    onChange={(e) => setEventoNuevo({...eventoNuevo, asistentes_reales: parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0})}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Costo</label>
                  <input type="text" inputMode="decimal"
                    value={eventoNuevo.costo}
                    onChange={(e) => setEventoNuevo({...eventoNuevo, costo: parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0})}
                    style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Notas</label>
                <textarea rows={2} placeholder="Detalles de logística..."
                  value={eventoNuevo.notas}
                  onChange={(e) => setEventoNuevo({...eventoNuevo, notas: e.target.value})}
                  style={{...inputStyle, resize: 'vertical', fontFamily: 'inherit'}} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setEventoNuevo(null)} style={btnSecundario}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Crear Evento'}
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
                <label style={labelStyle}>Nombre del Evento *</label>
                <input required type="text"
                  value={eventoEditar.nombre}
                  onChange={(e) => setEventoEditar({...eventoEditar, nombre: e.target.value})} style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Tipo</label>
                  <select value={eventoEditar.tipo}
                    onChange={(e) => setEventoEditar({...eventoEditar, tipo: e.target.value})} style={inputStyle}>
                    {TIPOS_EVENTO.map(t => <option key={t.value} value={t.value}>{t.icono} {t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Fecha *</label>
                  <input required type="date" value={eventoEditar.fecha}
                    onChange={(e) => setEventoEditar({...eventoEditar, fecha: e.target.value})} style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Hora</label>
                  <input type="time" value={eventoEditar.hora || ''}
                    onChange={(e) => setEventoEditar({...eventoEditar, hora: e.target.value || null})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Lugar</label>
                  <input type="text" value={eventoEditar.lugar || ''}
                    onChange={(e) => setEventoEditar({...eventoEditar, lugar: e.target.value || null})} style={inputStyle} />
                </div>
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
