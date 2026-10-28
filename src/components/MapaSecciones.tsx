// @ts-nocheck
import React from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// @ts-ignore
import geoData from '../assets/secciones_tula.json';

interface MapaSeccionesProps {
  datos: Record<number, { pct: number, riesgo: 'alto' | 'medio' | 'bajo' }>;
}

const MapaSecciones: React.FC<MapaSeccionesProps> = ({ datos }) => {
  const geoJsonKey = Object.keys(datos).length > 0 ? `data-${Object.keys(datos).length}` : 'inicial';

  const getEstiloSeccion = (seccion: number) => {
    const seccionNum = Number(seccion);
    const info = datos[seccionNum];
    let color = '#9CA3AF';

    if (info) {
      if (info.riesgo === 'alto') color = '#EF4444';
      else if (info.riesgo === 'medio') color = '#F59E0B';
      else if (info.riesgo === 'bajo') color = '#10B981';
    }

    return {
      fillColor: color,
      weight: 1.5,
      opacity: 1,
      color: 'white',
      dashArray: '3',
      fillOpacity: 0.7,
    };
  };

  const onEachSeccion = (feature: any, layer: L.Layer) => {
    const seccionNum = Number(feature.properties.seccion);
    const info = datos[seccionNum];

    layer.on({
      mouseover: (e: any) => {
        const l = e.target;
        l.setStyle({ weight: 3, color: '#00D4FF', fillOpacity: 0.9 });
      },
      mouseout: (e: any) => {
        const l = e.target;
        l.setStyle({ weight: 1.5, color: 'white', fillOpacity: 0.7 });
      }
    });

    layer.bindPopup(`
      <div style="font-family: sans-serif; font-size: 14px; min-width: 200px;">
        <strong style="color: #0D9488; font-size: 16px;">Sección ${seccionNum}</strong><br/>
        <hr style="margin: 6px 0; border: 0; border-top: 1px solid #eee;" />
        ${info ? `
          <div style="margin-bottom: 4px;"><b>Proyección:</b> ${info.pct.toFixed(1)}%</div>
          <div style="margin-bottom: 10px;"><b>Riesgo:</b> <span style="color: ${info.riesgo === 'alto' ? '#EF4444' : info.riesgo === 'medio' ? '#F59E0B' : '#10B981'}; font-weight: bold;">
            ${info.riesgo.toUpperCase()}
          </span></div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <a href="/app/secciones?seccion=${seccionNum}" 
              style="text-align: center; padding: 6px; background: #00D4FF; color: white; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 11px;">
              Ver Detalle Completo →
            </a>
            <a href="/app/centro-ia?seccion=${seccionNum}&pct=${info.pct.toFixed(1)}&riesgo=${info.riesgo}" 
              style="text-align: center; padding: 6px; background: #6366F1; color: white; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 11px;">
              🤖 Analizar con IA
            </a>
          </div>
        ` : '<i style="color: #999;">Sin datos calculados</i>'}
      </div>
    `);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '400px' }}>
      <div style={{ height: '100%', width: '100%', minHeight: '400px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <MapContainer 
          center={[20.05, -98.36]} 
          zoom={12} 
          style={{ height: '100%', width: '100%', minHeight: '400px' }}
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
      </div>

      <div style={{
        position: 'absolute', bottom: '10px', right: '10px',
        background: 'rgba(255, 255, 255, 0.95)', padding: '10px 14px',
        borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        fontSize: '11px', zIndex: 1000, minWidth: '140px'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#333', fontSize: '12px' }}>
          🗳️ Estado Electoral
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#10B981', borderRadius: '3px' }}></span>
          <span><b>Segura</b> (≥45%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#F59E0B', borderRadius: '3px' }}></span>
          <span><b>Disputa</b> (35-44%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#EF4444', borderRadius: '3px' }}></span>
          <span><b>Riesgo</b> (&lt;35%)</span>
        </div>
      </div>
    </div>
  );
};

export default MapaSecciones;
