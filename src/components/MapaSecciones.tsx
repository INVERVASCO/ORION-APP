// @ts-nocheck
import React from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { ORION_CONFIG } from '../lib/config';

// @ts-ignore
import geoData from '../assets/secciones_tula.json';

interface MapaSeccionesProps {
  datos: Record<number, { pct: number, riesgo: 'alto' | 'medio' | 'bajo' }>;
}

const MapaSecciones: React.FC<MapaSeccionesProps> = ({ datos }) => {
  const geoJsonKey = JSON.stringify(datos);

  const getEstiloSeccion = (seccion: number) => {
    const seccionNum = Number(seccion);
    const info = datos[seccionNum];
    let color = '#475569'; // Gris oscuro por defecto si no hay datos

    if (info) {
      if (info.riesgo === 'alto') color = '#F43F5E'; // Rojo
      else if (info.riesgo === 'medio') color = '#F59E0B'; // Amarillo
      else if (info.riesgo === 'bajo') color = '#10B981'; // Verde
    }

    return {
      fillColor: color,
      weight: 1,
      opacity: 0.8,
      color: '#1E293B', // Borde oscuro
      dashArray: '3',
      fillOpacity: 0.6,
    };
  };

  const onEachSeccion = (feature: any, layer: L.Layer) => {
    const seccionNum = Number(feature.properties.seccion);
    const info = datos[seccionNum];

    layer.on({
      mouseover: (e: any) => {
        const l = e.target;
        l.setStyle({ weight: 2, color: '#00D4FF', fillOpacity: 0.9 });
      },
      mouseout: (e: any) => {
        const l = e.target;
        l.setStyle({ weight: 1, color: '#1E293B', fillOpacity: 0.6 });
      }
    });

    layer.bindPopup(`
      <div style="font-family: sans-serif; font-size: 14px; min-width: 200px;">
        <strong style="color: #00D4FF; font-size: 16px;">Sección ${seccionNum}</strong><br/>
        <hr style="margin: 6px 0; border: 0; border-top: 1px solid #eee;" />
        ${info ? `
          <div style="margin-bottom: 4px;"><b>Proyección:</b> ${info.pct.toFixed(1)}%</div>
          <div style="margin-bottom: 10px;"><b>Riesgo:</b> <span style="color: ${info.riesgo === 'alto' ? '#EF4444' : info.riesgo === 'medio' ? '#F59E0B' : '#10B981'}; font-weight: bold;">
            ${info.riesgo.toUpperCase()}
          </span></div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <a href="/app/secciones?seccion=${seccionNum}" 
              style="text-align: center; padding: 6px; background: #00D4FF; color: #0A1628; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 11px;">
              Ver Detalle Completo →
            </a>
          </div>
        ` : '<i style="color: #999;">Sin datos calculados</i>'}
      </div>
    `);
  };

  // 🚀 LEEMOS LOS UMBRALES DINÁMICOS DE LA CONFIGURACIÓN
  const umbralSegura = ORION_CONFIG.electoral.umbralSegura;
  const umbralRiesgo = ORION_CONFIG.electoral.umbralRiesgo;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden' }}>
      <style>{`
        .leaflet-layer {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }
        .leaflet-marker-icon, .leaflet-popup {
          filter: invert(0%) hue-rotate(0deg) brightness(100%) contrast(100%) !important;
        }
      `}</style>

      <MapContainer 
        center={[20.05, -98.36]} 
        zoom={11} 
        style={{ height: '100%', width: '100%', background: '#0F172A' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GeoJSON 
          key={geoJsonKey}
          data={geoData as any}
          style={(feature) => getEstiloSeccion(feature?.properties.seccion)}
          onEachFeature={onEachSeccion}
        />
      </MapContainer>

      {/* LEYENDA DINÁMICA */}
      <div style={{
        position: 'absolute', bottom: '15px', right: '15px',
        background: 'rgba(15, 23, 42, 0.9)', padding: '10px 14px',
        borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        fontSize: '11px', zIndex: 1000, minWidth: '140px', color: 'white',
        border: '1px solid #334155'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#00D4FF', fontSize: '12px' }}>
          🗳️ Estado Electoral
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#10B981', borderRadius: '3px' }}></span>
          <span><b>Segura</b> (≥{umbralSegura}%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#F59E0B', borderRadius: '3px' }}></span>
          <span><b>Disputa</b> ({umbralRiesgo}-{umbralSegura - 1}%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#F43F5E', borderRadius: '3px' }}></span>
          <span><b>Riesgo</b> (&lt;{umbralRiesgo}%)</span>
        </div>
      </div>
    </div>
  );
};

export default MapaSecciones;
