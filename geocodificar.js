import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch'; // Si usas Node 18+, fetch ya es nativo, pero por si acaso

// Cargar las credenciales
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Faltan las credenciales en el archivo .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Función para esperar (evitar que la API nos bloquee por spam)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function actualizarCoordenadas() {
  console.log("🔍 Buscando colonias sin coordenadas en la base de datos...");

  // 1. Traemos todas las colonias que NO tienen latitud
  const { data: colonias, error } = await supabase
    .from('barrios_colonias')
    .select('id, nombre, tipo')
    .is('latitud_centro', null);

  if (error) {
    console.error("❌ Error consultando Supabase:", error);
    return;
  }

  if (colonias.length === 0) {
    console.log("✅ Todas las colonias ya tienen coordenadas. No hay nada que hacer.");
    return;
  }

  console.log(`📍 Se encontraron ${colonias.length} colonias sin coordenadas. Iniciando búsqueda automática...`);

  // 2. Iteramos sobre cada colonia
  for (let i = 0; i < colonias.length; i++) {
    const colonia = colonias[i];
    
    // Creamos la búsqueda: "Nombre de Colonia, Tula de Allende, Hidalgo, Mexico"
    const query = encodeURIComponent(`${colonia.nombre}, Tula de Allende, Hidalgo, Mexico`);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}`;

    try {
      // Hacemos la petición a OpenStreetMap
      const response = await fetch(url, {
        headers: { 'User-Agent': 'ORION-App-Electoral/1.0' } // Requerido por las reglas de uso
      });
      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);

        // 3. Actualizamos Supabase con las coordenadas encontradas
        const { error: updateError } = await supabase
          .from('barrios_colonias')
          .update({ latitud_centro: lat, longitud_centro: lon })
          .eq('id', colonia.id);

        if (updateError) {
          console.log(`❌ Error guardando ${colonia.nombre}:`, updateError.message);
        } else {
          console.log(`✅ [${i + 1}/${colonias.length}] Actualizado: ${colonia.nombre} -> Lat: ${lat}, Lon: ${lon}`);
        }
      } else {
        console.log(`⚠️ [${i + 1}/${colonias.length}] No se encontraron coordenadas para: ${colonia.nombre}`);
      }

    } catch (err) {
      console.log(`❌ Error de red buscando ${colonia.nombre}:`, err.message);
    }

    // Esperamos 1 segundo entre peticiones para que no nos bloqueen (Regla de OpenStreetMap)
    await sleep(1000);
  }

  console.log("🎉 ¡Proceso terminado! Todas las colonias posibles han sido actualizadas.");
}

// Ejecutar la función
actualizarCoordenadas();