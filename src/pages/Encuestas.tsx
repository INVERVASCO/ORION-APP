// @ts-nocheck
import { useEffect, useState } from 'react';
import { Search, Trash2, Plus, X, Loader2, CheckCircle2, AlertTriangle, Mic, Phone, MessageSquare, MapPin, Brain } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Toast from '../components/Toast';
import { obtenerUbicacion } from '../lib/geolocalizacion';
import { offlineInsert } from '../lib/syncManager'; // <-- IMPORTAMOS OFFLINE INSERT

// ... (Las interfaces y PREGUNTAS_ADN se quedan igual) ...

export default function Encuestas() {
  const [encuestas, setEncuestas] = useState<any[]>([]);
  const [filtradas, setFiltradas] = useState<any[]>([]);
  const [barrios, setBarrios] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  
  const [modalAbierto, setModalAbierto] = useState(false);
  const [esModoADN, setEsModoADN] = useState(false);
  const [rangoEdadADN, setRangoEdadADN] = useState<'adn_18_30' | 'adn_31_50' | 'adn_50_mas'>('adn_18_30');
  
  const [encuestaNueva, setEncuestaNueva] = useState<any | null>(null);
  
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMensaje, setToastMensaje] = useState('');

  const [confirmModal, setConfirmModal] = useState<any>({
    visible: false, titulo: '', mensaje: '', tipo: 'warning', onConfirm: () => {},
  });

  const mostrarConfirm = (titulo: string, mensaje: string, tipo: 'danger' | 'success' | 'warning', onConfirm: () => void) => {
    setConfirmModal({ visible: true, titulo, mensaje, tipo, onConfirm });
  };
  const cerrarConfirm = () => setConfirmModal({ ...confirmModal, visible: false });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [encuestasRes, barriosRes] = await Promise.all([
        supabase.from('encuestas').select('*, barrios_colonias(nombre)').order('created_at', { ascending: false }),
        supabase.from('barrios_colonias').select('id, nombre').order('nombre'),
      ]);
      
      if (encuestasRes.data) {
        setEncuestas(encuestasRes.data as any);
        setFiltradas(encuestasRes.data as any);
      }
      if (barriosRes.data) setBarrios(barriosRes.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  // ... (El useEffect de filtros se queda igual) ...

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!encuestaNueva) return;
    setGuardando(true);

    const ubicacion = await obtenerUbicacion();
    if (!ubicacion) {
      setGuardando(false);
      mostrarConfirm('Ubicación Requerida', 'Debes activar el GPS para registrar encuestas.', 'danger', () => cerrarConfirm());
      return;
    }

    let esSospechosa = false;
    if (encuestaNueva.barrio_colonia_id) {
      const { data: barrio } = await supabase.from('barrios_colonias').select('latitud_centro, longitud_centro').eq('id', encuestaNueva.barrio_colonia_id).single();
      if (barrio?.latitud_centro && barrio?.longitud_centro) {
        const distancia = calcularDistanciaMetros(ubicacion.lat, ubicacion.lng, barrio.latitud_centro, barrio.longitud_centro);
        if (distancia > 2000) esSospechosa = true;
      }
    }

    const { data: { user } } = await supabase.auth.getUser();

    const nuevaEncuesta = {
      tipo: encuestaNueva.tipo,
      pregunta: encuestaNueva.pregunta,
      respuesta: encuestaNueva.respuesta || null,
      barrio_colonia_id: encuestaNueva.barrio_colonia_id || null,
      latitud: ubicacion.lat,
      longitud: ubicacion.lng,
      precision_gps: ubicacion.precision,
      encuestador_id: user?.id || null,
      es_sospechosa: esSospechosa,
      created_at: new Date().toISOString(),
      barrios_colonias: barrios.find(b => b.id === encuestaNueva.barrio_colonia_id) ? { nombre: barrios.find(b => b.id === encuestaNueva.barrio_colonia_id)?.nombre } : null
    };

    // ✅ AQUÍ USAMOS EL MODO OFFLINE
    const res = await offlineInsert('encuestas', nuevaEncuesta);

    if (res.ok) {
      // Actualizamos la UI de inmediato (Optimistic UI)
      setEncuestas([nuevaEncuesta, ...encuestas]);
      setModalAbierto(false);
      setToastMensaje(res.queued ? '📡 Sin señal: Guardado localmente. Se subirá al recuperar internet.' : '¡Encuesta registrada con éxito!');
      setToastVisible(true);
    }
    setGuardando(false);
  };

  // ... (El resto del componente: handleEliminar, getTipoInfo, render, modales, etc. se queda exactamente igual) ...
