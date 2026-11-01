// @ts-nocheck
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { MapPin, Loader2, CheckCircle2, AlertTriangle, Play } from 'lucide-react';

export default function AdminGeocode() {
  const [procesando, setProcesando] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [faltantes, setFaltantes] = useState<number | null>(null);

  const agregarLog = (msj: string) => setLogs(prev => [...prev, msj]);

  const iniciarGeocodificacion = async () => {
    setProcesando(true);
    setLogs([]);
    agregarLog('🔍 Buscando barrios sin coordenadas en la base de datos...');

    // 1. Buscar barrios sin latitud o longitud
    const { data: barrios, error } = await supabase
      .from('barrios_colonias')
      .select('id, nombre')
      .is('latitud_centro', null);

    if (error) {
      agregarLog(`❌ Error al buscar: ${error.message}`);
      setProcesando(false);
      return;
    }

    if (!barrios || barrios.length === 0) {
      agregarLog('✅ ¡Todos los barrios ya tienen coordenadas!');
      setProcesando(false);
      return;
    }

    setFaltantes(barrios.length);
    agregarLog(`📍 Se encontraron ${barrios.length} barrios sin coordenadas. Iniciando...`);

    let actualizados = 0;

    // 2. Iterar sobre cada barrio
    for (const barrio of barrios) {
      // Agregamos ", Tula de Allende, Hidalgo" para asegurar que no busque en otro estado
      const query = encodeURIComponent(`${barrio.nombre}, Tula de Allende, Hidalgo, Mexico`);
      
      try {
        agregarLog(`Buscando: ${barrio.nombre}...`);
        
        // Llamada a la API de Photon (Búsqueda directa, no inversa)
        const res = await fetch(`https://photon.komoot.io/api/?q=${query}&limit=1`);
        const data = await res.json();

        if (data.features && data.features.length > 0) {
          const [lng, lat] = data.features[0].geometry.coordinates;
          
          // 3. Actualizar en Supabase
          const { error: updateError } = await supabase
            .from('barrios_colonias')
            .update({ latitud_centro: lat, longitud_centro: lng })
            .eq('id', barrio.id);

          if (updateError) {
            agregarLog(`❌ Error guardando ${barrio.nombre}: ${updateError.message}`);
          } else {
            agregarLog(`✅ ${barrio.nombre} -> [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
            actualizados++;
          }
        } else {
          agregarLog(`⚠️ No se encontró ubicación para: ${barrio.nombre}`);
        }
      } catch (err: any) {
        agregarLog(`❌ Error de red en ${barrio.nombre}: ${err.message}`);
      }

      // Pausa de 1 segundo entre peticiones para que la API no nos bloquee
      await new Promise(r => setTimeout(r, 1000));
    }

    agregarLog(`🎉 Proceso terminado. ${actualizados} barrios actualizados.`);
    setProcesando(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="card">
        <h1 style={{ color: '#0A1628', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MapPin color="#00D4FF" /> Centro de Geocodificación Autónoma
        </h1>
        <p style={{ color: '#64748B', marginBottom: '20px' }}>
          Esta herramienta buscará automáticamente las coordenadas de los barrios y colonias que no las tengan, consultando la API de Photon.
        </p>

        <button 
          onClick={iniciarGeocodificacion} 
          disabled={procesando}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}
        >
          {procesando ? <><Loader2 className="animate-spin" size={20} /> Procesando...</> : <><Play size={20} /> Iniciar Geocodificación Masiva</>}
        </button>

        {faltantes !== null && (
          <p style={{ marginTop: '15px', fontWeight: 'bold' }}>
            Barrios pendientes por procesar: {faltantes}
          </p>
        )}

        {/* Consola de Logs */}
        <div style={{ 
          marginTop: '20px', background: '#0F172A', color: '#10B981', 
          padding: '15px', borderRadius: '8px', fontFamily: 'monospace', 
          height: '300px', overflowY: 'auto', fontSize: '13px' 
        }}>
          {logs.length === 0 ? <span style={{ color: '#64748B' }}>Esperando para iniciar...</span> : null}
          {logs.map((log, i) => (
            <div key={i} style={{ marginBottom: '4px' }}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
