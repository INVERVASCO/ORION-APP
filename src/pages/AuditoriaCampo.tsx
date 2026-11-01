// @ts-nocheck
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Loader2, AlertTriangle, User, X, Download, FileText, Crosshair } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { calcularDistanciaMetros, obtenerDireccionReal } from '../lib/geolocalizacion';
// @ts-ignore
import html2pdf from 'html2pdf.js';

// 🎨 Estilo "Uber": Puntos pequeños en lugar de pines gigantes
const crearIconoPunto = (color: string) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10]
  });
};

const iconoVerde = crearIconoPunto('#10B981'); // Válido
const iconoRojo = crearIconoPunto('#F43F5E'); // Alerta / Lejos
const iconoAzul = crearIconoPunto('#00D4FF'); // Centro del barrio

// 🧭 Botón para centrar el mapa en la ubicación del monitorista
function BotonMiUbicacion() {
  const map = useMap();
  const [ubicando, setUbicando] = useState(false);

  const centrarEnMi = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUbicando(true);
    map.locate({ setView: true, maxZoom: 16, enableHighAccuracy: true })
      .on('locationfound', () => setUbicando(false))
      .on('locationerror', () => {
        alert('No se pudo obtener tu ubicación. Revisa los permisos de tu navegador.');
        setUbicando(false);
      });
  };

  return (
    <div style={{ position: 'absolute', bottom: '20px', right: '20px', zIndex: 1000 }}>
      <button
        onClick={centrarEnMi}
        style={{
          background: 'white', border: 'none', borderRadius: '50%', width: '45px', height: '45px',
          display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', transition: 'all 0.2s'
        }}
        title="Mi ubicación"
      >
        <Crosshair size={22} color={ubicando ? '#00D4FF' : '#333'} className={ubicando ? 'animate-spin' : ''} />
      </button>
    </div>
  );
}

// ✈️ Control de Vuelo: Al cambiar el filtro (Hoy, Ayer, Todos), el mapa se centra automáticamente
function ControlVuelo({ pines }: { pines: any[] }) {
  const map = useMap();

  useEffect(() => {
    if (pines.length > 0) {
      const bounds = L.latLngBounds(pines.map(p => [p.latitud, p.longitud]));
      if (pines.length <= 2) {
         map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 15, duration: 1.5 });
      } else {
         map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
      }
    }
  }, [pines, map]);

  return null;
}

export default function AuditoriaCampo() {
  const [encuestas, setEncuestas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroFecha, setFiltroFecha] = useState<'hoy' | 'ayer' | 'todos'>('hoy'); // Por defecto en HOY
  
  const [modalReporte, setModalReporte] = useState(false);
  const [reporteActual, setReporteActual] = useState<{ encuestador: string, fecha: string, registros: any[] } | null>(null);
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
        const perfilesMap = new Map(perfilesData?.map(p => [p.id, p.nombre_completo]));
        
        const procesadas = encuestasData.map((e: any) => {
          const lat_centro = e.barrios_colonias?.latitud_centro;
          const lng_centro = e.barrios_colonias?.longitud_centro;
          let distancia = -1;
          let esSospechosa = false;
          let motivoAlerta = '';

          // 🛡️ LÓGICA DE VALIDACIÓN CLARA
          if (e.precision_gps !== null && e.precision_gps < 1) {
            esSospechosa = true;
            motivoAlerta = 'GPS alterado (Fake GPS)';
          }

          if (lat_centro && lng_centro) {
            distancia = calcularDistanciaMetros(e.latitud, e.longitud, lat_centro, lng_centro);
            // Si está a más de 2km, lo marcamos como fuera de rango
            if (distancia > 2000) {
              esSospechosa = true; 
              const km = (distancia / 1000).toFixed(1);
              motivoAlerta = `A ${km} km del barrio (Fuera de zona)`;
            }
          } else {
            esSospechosa = true; 
            motivoAlerta = 'Barrio sin georreferencia (No validable)';
          }

          return {
            ...e,
            encuestador_nombre: perfilesMap.get(e.encuestador_id) || 'Desconocido',
            barrio_nombre: e.barrios_colonias?.nombre || 'Sin barrio',
            barrio_lat: lat_centro,
            barrio_lng: lng_centro,
            distancia_metros: distancia,
            es_sospechosa: esSospechosa,
            motivo_alerta: motivoAlerta,
            fecha_dia: new Date(e.created_at).toLocaleDateString('es-MX'),
            timestamp: new Date(e.created_at).getTime()
          };
        });

        setEncuestas(procesadas);
      }
      setLoading(false);
    };
    fetchDatos();
  }, []);

  const encuestasFiltradas = encuestas.filter(e => {
    if (filtroFecha === 'todos') return true;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    if (filtroFecha === 'hoy') return e.timestamp >= hoy.getTime();
    if (filtroFecha === 'ayer') return e.timestamp >= ayer.getTime() && e.timestamp < hoy.getTime();
    return true;
  });

  const reportesDiarios = encuestasFiltradas.reduce((acc: any, curr) => {
    const key = `${curr.encuestador_nombre}-${curr.fecha_dia}`;
    if (!acc[key]) {
      acc[key] = { encuestador: curr.encuestador_nombre, fecha: curr.fecha_dia, registros: [] };
    }
    acc[key].registros.push(curr);
    return acc;
  }, {});

  const abrirReporte = async (reporte: any) => {
    setModalReporte(true);
    setCargandoDirecciones(true);
    const registrosConDireccion = await Promise.all(
      reporte.registros.map(async (r: any) => {
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

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}><Loader2 className="animate-spin" /> Cargando...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 className="header-title" style={{ marginBottom: 0 }}>Auditoría de Campo GPS</h1>
        
        <div style={{ display: 'flex', gap: '5px', background: '#F1F5F9', padding: '4px', borderRadius: '8px' }}>
          <button onClick={() => setFiltroFecha('hoy')} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: filtroFecha === 'hoy' ? 'white' : 'transparent', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', boxShadow: filtroFecha === 'hoy' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}>Hoy</button>
          <button onClick={() => setFiltroFecha('ayer')} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: filtroFecha === 'ayer' ? 'white' : 'transparent', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', boxShadow: filtroFecha === 'ayer' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}>Ayer</button>
          <button onClick={() => setFiltroFecha('todos')} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: filtroFecha === 'todos' ? 'white' : 'transparent', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', boxShadow: filtroFecha === 'todos' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}>Todos</button>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        <div className="card" style={{ padding: 0, overflow: 'hidden', height: '450px', position: 'relative' }}>
          <MapContainer center={[20.05, -98.36]} zoom={12} style={{ height: '100%', width: '100%', zIndex: 1 }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            
            {/* El mapa vuela automáticamente a los pines filtrados */}
            <ControlVuelo pines={encuestasFiltradas} />
            
            {/* Botón de ubicación "Uber" */}
            <BotonMiUbicacion />

            <MarkerClusterGroup 
              chunkedLoading 
              maxClusterRadius={40} 
              disableClusteringAtZoom={13} // Al acercarse, se separan
              spiderfyOnMaxZoom={true} 
              showCoverageOnHover={false}
            >
              {encuestasFiltradas.map((e) => (
                <div key={e.id}>
                  <Marker position={[e.latitud, e.longitud]} icon={e.es_sospechosa ? iconoRojo : iconoVerde}>
                    <Popup>
                      <div style={{ fontSize: '13px', lineHeight: '1.5', minWidth: '160px' }}>
                        <b style={{ color: e.es_sospechosa ? '#F43F5E' : '#10B981', display: 'block', marginBottom: '4px' }}>
                          {e.es_sospechosa ? '⚠️ ALERTA' : '✅ Válida'}
                        </b>
                        <strong>Quién:</strong> {e.encuestador_nombre}<br/>
                        <strong>Dónde:</strong> {e.barrio_nombre}<br/>
                        {e.es_sospechosa && <span style={{ color: '#F43F5E', fontSize: '11px', display: 'block', marginTop: '4px', fontWeight: 'bold' }}>{e.motivo_alerta}</span>}
                      </div>
                    </Popup>
                  </Marker>

                  {/* Si es sospechosa, dibujamos una línea al centro del barrio */}
                  {e.es_sospechosa && e.barrio_lat && e.barrio_lng && (
                    <>
                      <Marker position={[e.barrio_lat, e.barrio_lng]} icon={iconoAzul}>
                        <Popup><b>Centro del barrio: {e.barrio_nombre}</b></Popup>
                      </Marker>
                      <Polyline positions={[[e.latitud, e.longitud], [e.barrio_lat, e.barrio_lng]]} color="#F43F5E" weight={2} dashArray="5, 10" />
                    </>
                  )}
                </div>
              ))}
            </MarkerClusterGroup>
          </MapContainer>
        </div>

        <div className="card" style={{ height: '450px', overflowY: 'auto', padding: '15px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '15px', color: '#0F172A' }}>Reportes Diarios</h3>
          {Object.values(reportesDiarios).length === 0 ? (
            <p style={{ color: '#64748B', fontSize: '14px', textAlign: 'center' }}>No hay encuestas en este periodo.</p>
          ) : Object.values(reportesDiarios).map((rep: any, idx) => {
            const alertas = rep.registros.filter((r:any) => r.es_sospechosa).length;
            return (
              <div key={idx} style={{ padding: '12px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', borderRadius: '8px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color: '#0F172A' }}>
                  <User size={16} color="#00D4FF" /> {rep.encuestador}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{rep.fecha}</span>
                  <span style={{ fontWeight: 'bold', color: '#10B981' }}>{rep.registros.length} encuestas</span>
                </div>
                {alertas > 0 && (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#F43F5E', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                    <AlertTriangle size={12} /> {alertas} con alertas de distancia
                  </div>
                )}
                <button onClick={() => abrirReporte(rep)} style={{ width: '100%', marginTop: '8px', padding: '8px', background: '#E0F2FE', border: 'none', borderRadius: '6px', color: '#0284C7', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <FileText size={14} /> Ver / Descargar Reporte
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL DE REPORTE Y PDF */}
      {modalReporte && reporteActual && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '25px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
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
                    <img src="https://i.ibb.co/qLGmzCyZ/orion-logo-png.png" alt="ORION" style={{ height: '60px', margin: '0 auto' }} />
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
