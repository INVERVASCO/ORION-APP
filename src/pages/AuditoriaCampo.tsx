import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Loader2, AlertTriangle, X, Download, FileText, Crosshair, Wifi, Activity } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { calcularDistanciaMetros, obtenerDireccionReal } from '../lib/geolocalizacion';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface EncuestaProcesada {
  id: string;
  latitud: number;
  longitud: number;
  created_at: string;
  encuestador_id: string;
  barrio_colonia_id: string;
  precision_gps: number;
  barrios_colonias: { nombre: string; latitud_centro: number; longitud_centro: number };
  encuestador_nombre: string;
  barrio_nombre: string;
  barrio_lat: number;
  barrio_lng: number;
  distancia_metros: number;
  es_sospechosa: boolean;
  motivo_alerta: string;
  fecha_dia: string;
  timestamp: number;
}

interface ReporteDiario {
  encuestador: string;
  fecha: string;
  registros: EncuestaProcesada[];
}

const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

const crearIconoPunto = (color: string) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10]
  });
};

const iconoAlerta = crearIconoPunto('#F43F5E');
const iconoAzul = crearIconoPunto('#00D4FF');

function BotonMiUbicacion() {
  const map = useMap();
  const [ubicando, setUbicando] = useState(false);

  const centrarEnMi = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUbicando(true);
    map.locate({ setView: true, maxZoom: 16, enableHighAccuracy: true })
      .on('locationfound', () => setUbicando(false))
      .on('locationerror', () => {
        alert('No se pudo obtener tu ubicación. Revisa los permisos.');
        setUbicando(false);
      });
  };

  return (
    <div style={{ position: 'absolute', bottom: '20px', right: '20px', zIndex: 1000 }}>
      <button onClick={centrarEnMi} style={{ background: 'white', border: 'none', borderRadius: '50%', width: '45px', height: '45px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', transition: 'all 0.2s' }} title="Mi ubicación">
        <Crosshair size={22} color={ubicando ? '#00D4FF' : '#333'} className={ubicando ? 'animate-spin' : ''} />
      </button>
    </div>
  );
}

function ControlVuelo({ pines }: { pines: EncuestaProcesada[] }) {
  const map = useMap();
  useEffect(() => {
    // 🚀 FIX: Validar que las coordenadas existan y sean números válidos antes de volar
    const validPines = pines.filter(p => typeof p.latitud === 'number' && typeof p.longitud === 'number' && !isNaN(p.latitud) && !isNaN(p.longitud));
    
    if (validPines.length > 0) {
      const bounds = L.latLngBounds(validPines.map(p => [p.latitud, p.longitud]));
      if (validPines.length <= 2) {
         map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 15, duration: 1.5 });
      } else {
         map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
      }
    }
  }, [pines, map]);
  return null;
}

export default function AuditoriaCampo() {
  const [encuestas, setEncuestas] = useState<EncuestaProcesada[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroFecha, setFiltroFecha] = useState<'hoy' | 'ayer' | 'todos'>('hoy');
  const [filtroBrigadista, setFiltroBrigadista] = useState<string>('todos');
  
  const [modalReporte, setModalReporte] = useState(false);
  const [reporteActual, setReporteActual] = useState<ReporteDiario | null>(null);
  const [cargandoDirecciones, setCargandoDirecciones] = useState(false);

  useEffect(() => {
    const fetchDatos = async () => {
      setLoading(true);
      const { data: encuestasData } = await supabase
        .from('encuestas')
        .select(`id, latitud, longitud, created_at, encuestador_id, barrio_colonia_id, precision_gps, barrios_colonias(nombre, latitud_centro, longitud_centro)`)
        .not('latitud', 'is', null)
        .order('created_at', { ascending: false });

      const { data: perfilesData } = await supabase.from('perfiles').select('id, nombre_completo');

      if (encuestasData) {
        // 🚀 FIX: Evitar que new Map truene si no hay perfiles
        const perfilesMap = new Map((perfilesData || []).map((p: any) => [p.id, p.nombre_completo]));
        
        const procesadas = encuestasData.map((e: any) => {
          // 🚀 FIX: Normalizar por si barrios_colonias viene como arreglo
          const barrio = Array.isArray(e.barrios_colonias) ? e.barrios_colonias[0] : e.barrios_colonias;
          const lat_centro = barrio?.latitud_centro;
          const lng_centro = barrio?.longitud_centro;
          
          let distancia = -1;
          let esSospechosa = false;
          let motivoAlerta = '';

          if (e.precision_gps !== null && e.precision_gps < 1) {
            esSospechosa = true; motivoAlerta = 'GPS alterado';
          }

          if (lat_centro && lng_centro) {
            distancia = calcularDistanciaMetros(e.latitud, e.longitud, lat_centro, lng_centro);
            if (distancia > 2000) {
              esSospechosa = true; 
              motivoAlerta = `A ${(distancia / 1000).toFixed(1)} km (Fuera de zona)`;
            }
          } else {
            esSospechosa = true; motivoAlerta = 'Barrio sin georreferencia';
          }

          return {
            ...e,
            encuestador_nombre: perfilesMap.get(e.encuestador_id) || 'Desconocido',
            barrio_nombre: barrio?.nombre || 'Sin barrio',
            barrio_lat: lat_centro,
            barrio_lng: lng_centro,
            distancia_metros: distancia,
            es_sospechosa: esSospechosa,
            motivo_alerta: motivoAlerta,
            fecha_dia: new Date(e.created_at).toLocaleDateString('es-MX'),
            timestamp: new Date(e.created_at).getTime()
          } as EncuestaProcesada;
        });

        setEncuestas(procesadas);
      }
      setLoading(false);
    };
    fetchDatos();
  }, []);

  const encuestasFiltradas = encuestas.filter(e => {
    let cumpleFecha = true;
    if (filtroFecha !== 'todos') {
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
      if (filtroFecha === 'hoy') cumpleFecha = e.timestamp >= hoy.getTime();
      if (filtroFecha === 'ayer') cumpleFecha = e.timestamp >= ayer.getTime() && e.timestamp < hoy.getTime();
    }
    let cumpleBrigadista = true;
    if (filtroBrigadista !== 'todos') cumpleBrigadista = e.encuestador_nombre === filtroBrigadista;
    return cumpleFecha && cumpleBrigadista;
  });

  const listaBrigadistas = Array.from(new Set(encuestas.map(e => e.encuestador_nombre))).sort();

  const estadoBrigadistas = listaBrigadistas.map(nombre => {
    const encuestasBrigadista = encuestas.filter(e => e.encuestador_nombre === nombre);
    // 🚀 FIX: Validar que haya timestamps antes de usar Math.max
    const tiempos = encuestasBrigadista.map(e => e.timestamp).filter(t => typeof t === 'number' && !isNaN(t));
    const ultimaEncuesta = tiempos.length > 0 ? Math.max(...tiempos) : 0;
    
    const ahora = Date.now();
    const estaOnline = (ahora - ultimaEncuesta) < (3 * 60 * 60 * 1000);
    return { nombre, estaOnline, ultimaEncuesta };
  }).sort((a, b) => b.ultimaEncuesta - a.ultimaEncuesta);

  const reportesDiarios = encuestasFiltradas.reduce((acc: Record<string, ReporteDiario>, curr) => {
    const key = `${curr.encuestador_nombre}-${curr.fecha_dia}`;
    if (!acc[key]) {
      acc[key] = { encuestador: curr.encuestador_nombre, fecha: curr.fecha_dia, registros: [] };
    }
    acc[key].registros.push(curr);
    return acc;
  }, {});

  const abrirReporte = async (reporte: ReporteDiario) => {
    setModalReporte(true);
    setCargandoDirecciones(true);
    const registrosConDireccion = await Promise.all(
      reporte.registros.map(async (r) => {
        const direccion = await obtenerDireccionReal(r.latitud, r.longitud);
        return { ...r, direccion_real: direccion };
      })
    );
    setReporteActual({ ...reporte, registros: registrosConDireccion });
    setCargandoDirecciones(false);
  };

  const descargarPDF = () => {
    const element = document.getElementById('pdf-reporte');
    if (!element || !reporteActual) return;
    html2pdf().set({
      margin: 10, filename: `Reporte_${reporteActual.encuestador}.pdf`,
      image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
    }).from(element).save();
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center', height: '100vh', background: '#0F172A', color: '#00D4FF' }}><Loader2 className="animate-spin" size={48} style={{ margin: '0 auto', marginBottom: '20px' }}/> Iniciando Sistema de Monitoreo...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)', background: '#0F172A', borderRadius: '12px', overflow: 'hidden', color: 'white' }}>
      
      <style>{`
        .leaflet-layer { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }
        .leaflet-marker-icon, .leaflet-popup { filter: invert(0%) hue-rotate(0deg) brightness(100%) contrast(100%) !important; }
      `}</style>

      <div style={{ padding: '15px 20px', background: '#1E293B', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Activity size={28} color="#00D4FF" />
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '900', letterSpacing: '1px', color: 'white' }}>CENTRO DE MONITOREO ORION</h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8' }}>Sala de Control Táctica en Tiempo Real</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <select value={filtroBrigadista} onChange={(e) => setFiltroBrigadista(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #475569', background: '#0F172A', color: 'white', fontSize: '13px', outline: 'none' }}>
            <option value="todos">Todos los brigadistas</option>
            {listaBrigadistas.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          <div style={{ display: 'flex', gap: '5px', background: '#0F172A', padding: '4px', borderRadius: '6px', border: '1px solid #475569' }}>
            <button onClick={() => setFiltroFecha('hoy')} style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', background: filtroFecha === 'hoy' ? '#00D4FF' : 'transparent', color: filtroFecha === 'hoy' ? '#0F172A' : '#94A3B8', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>HOY</button>
            <button onClick={() => setFiltroFecha('ayer')} style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', background: filtroFecha === 'ayer' ? '#00D4FF' : 'transparent', color: filtroFecha === 'ayer' ? '#0F172A' : '#94A3B8', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>AYER</button>
            <button onClick={() => setFiltroFecha('todos')} style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', background: filtroFecha === 'todos' ? '#00D4FF' : 'transparent', color: filtroFecha === 'todos' ? '#0F172A' : '#94A3B8', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>TODOS</button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 3, position: 'relative' }}>
          <MapContainer center={[20.05, -98.36]} zoom={12} style={{ height: '100%', width: '100%', background: '#0F172A' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <ControlVuelo pines={encuestasFiltradas} />
            <BotonMiUbicacion />

            <MarkerClusterGroup chunkedLoading maxClusterRadius={40} disableClusteringAtZoom={13} spiderfyOnMaxZoom={true} showCoverageOnHover={false}>
              {encuestasFiltradas.map((e) => {
                const colorPunto = e.es_sospechosa ? iconoAlerta : crearIconoPunto(stringToColor(e.encuestador_nombre));
                return (
                  <div key={e.id}>
                    <Marker position={[e.latitud, e.longitud]} icon={colorPunto}>
                      <Popup>
                        <div style={{ fontSize: '13px', lineHeight: '1.5', minWidth: '160px', color: '#333' }}>
                          <b style={{ color: e.es_sospechosa ? '#F43F5E' : stringToColor(e.encuestador_nombre), display: 'block', marginBottom: '4px' }}>
                            {e.es_sospechosa ? '⚠️ ALERTA' : '✅ Válida'}
                          </b>
                          <strong>Quién:</strong> {e.encuestador_nombre}<br/>
                          <strong>Dónde:</strong> {e.barrio_nombre}<br/>
                          {e.es_sospechosa && <span style={{ color: '#F43F5E', fontSize: '11px', display: 'block', marginTop: '4px', fontWeight: 'bold' }}>{e.motivo_alerta}</span>}
                        </div>
                      </Popup>
                    </Marker>
                    {e.es_sospechosa && e.barrio_lat && e.barrio_lng && (
                      <>
                        <Marker position={[e.barrio_lat, e.barrio_lng]} icon={iconoAzul}>
                          <Popup><b>Centro del barrio: {e.barrio_nombre}</b></Popup>
                        </Marker>
                        <Polyline positions={[[e.latitud, e.longitud], [e.barrio_lat, e.barrio_lng]]} color="#F43F5E" weight={2} dashArray="5, 10" />
                      </>
                    )}
                  </div>
                );
              })}
            </MarkerClusterGroup>
          </MapContainer>
        </div>

        <div style={{ flex: 1, minWidth: '320px', background: '#1E293B', borderLeft: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '15px', borderBottom: '1px solid #334155', background: '#0F172A' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#00D4FF', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} /> Reportes Diarios
            </h3>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
            {Object.values(reportesDiarios).length === 0 ? (
              <p style={{ color: '#64748B', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>No hay encuestas en este periodo.</p>
            ) : Object.values(reportesDiarios).map((rep, idx) => {
              const alertas = rep.registros.filter((r) => r.es_sospechosa).length;
              const colorBrigadista = stringToColor(rep.encuestador);
              return (
                <div key={idx} style={{ padding: '12px', background: '#0F172A', borderRadius: '8px', marginBottom: '10px', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: 'white', fontSize: '14px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: colorBrigadista }}></div>
                    {rep.encuestador}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{rep.fecha}</span>
                    <span style={{ fontWeight: 'bold', color: '#10B981' }}>{rep.registros.length} encuestas</span>
                  </div>
                  {alertas > 0 && (
                    <div style={{ marginTop: '6px', fontSize: '11px', color: '#F43F5E', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                      <AlertTriangle size={12} /> {alertas} con alertas
                    </div>
                  )}
                  <button onClick={() => abrirReporte(rep)} style={{ width: '100%', marginTop: '10px', padding: '8px', background: '#00D4FF', border: 'none', borderRadius: '6px', color: '#0F172A', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <Download size={14} /> Descargar PDF
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ height: '100px', background: '#1E293B', borderTop: '2px solid #00D4FF', display: 'flex', alignItems: 'center', padding: '0 20px', overflowX: 'auto', gap: '15px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', marginRight: '20px', borderRight: '1px solid #334155', paddingRight: '20px' }}>
          <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 'bold' }}>ESTATUS DE RED</span>
          <span style={{ fontSize: '16px', color: '#10B981', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Wifi size={18} /> {estadoBrigadistas.filter(b => b.estaOnline).length} ONLINE
          </span>
        </div>

        {estadoBrigadistas.map((brigadista, idx) => {
          const color = stringToColor(brigadista.nombre);
          const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(brigadista.nombre)}&background=${color.replace('#', '')}&color=fff&bold=true`;
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#0F172A', padding: '8px 15px', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }}>
              <div style={{ position: 'relative' }}>
                <img src={avatarUrl} alt={brigadista.nombre} style={{ width: '40px', height: '40px', borderRadius: '50%', border: `2px solid ${brigadista.estaOnline ? '#10B981' : '#475569'}` }} />
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', borderRadius: '50%', background: brigadista.estaOnline ? '#10B981' : '#64748B', border: '2px solid #0F172A' }}></div>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: 'white', whiteSpace: 'nowrap' }}>{brigadista.nombre}</p>
                <p style={{ margin: 0, fontSize: '11px', color: brigadista.estaOnline ? '#10B981' : '#64748B', fontWeight: 'bold' }}>
                  {brigadista.estaOnline ? 'EN LÍNEA' : 'DESCONECTADO'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {modalReporte && reporteActual && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '25px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', color: '#333' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#0F172A' }}>Reporte Diario de Auditoría</h3>
              <button onClick={() => setModalReporte(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} color="#64748B" /></button>
            </div>
            {cargandoDirecciones ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#00D4FF' }}>
                <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto', marginBottom: '10px'}}/>
                <p>Traduciendo coordenadas...</p>
              </div>
            ) : (
              <>
                <div id="pdf-reporte" style={{ padding: '20px', background: 'white', border: '1px solid #E2E8F0' }}>
                  <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #E2E8F0', paddingBottom: '15px' }}>
                    <img src="/dossier/orion-logo.png" alt="ORION" style={{ height: '60px', margin: '0 auto' }} />
                    <h2 style={{ margin: '10px 0 0 0', color: '#0A1628', fontSize: '18px', fontWeight: 'bold' }}>Reporte de Auditoría Electoral</h2>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '13px' }}>
                    <div><b>Encuestador:</b> {reporteActual.encuestador}</div>
                    <div><b>Fecha:</b> {reporteActual.fecha}</div>
                    <div><b>Total:</b> {reporteActual.registros.length}</div>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', textAlign: 'left' }}>
                        <th style={{ padding: '8px', border: '1px solid #E2E8F0' }}>Hora</th>
                        <th style={{ padding: '8px', border: '1px solid #E2E8F0' }}>Barrio</th>
                        <th style={{ padding: '8px', border: '1px solid #E2E8F0' }}>Dirección Real</th>
                        <th style={{ padding: '8px', border: '1px solid #E2E8F0' }}>Estatus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporteActual.registros.map((r: any) => (
                        <tr key={r.id}>
                          <td style={{ padding: '8px', border: '1px solid #E2E8F0' }}>{new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                          <td style={{ padding: '8px', border: '1px solid #E2E8F0' }}>{r.barrio_nombre}</td>
                          <td style={{ padding: '8px', border: '1px solid #E2E8F0', maxWidth: '200px', wordWrap: 'break-word' }}>
                            {r.direccion_real.includes(',') && !r.direccion_real.includes('-') ? r.direccion_real : '📍 Coordenadas GPS'}
                          </td>
                          <td style={{ padding: '8px', border: '1px solid #E2E8F0', color: r.es_sospechosa ? '#F43F5E' : '#10B981', fontWeight: 'bold' }}>
                            {r.es_sospechosa ? `⚠️ ${r.motivo_alerta}` : '✅ OK'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={descargarPDF} className="btn-primary" style={{ width: '100%', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Download size={18} /> Descargar PDF
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
