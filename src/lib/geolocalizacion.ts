// src/lib/geolocalizacion.ts
import { supabase } from './supabaseClient';

export interface Ubicacion {
  lat: number; lng: number; precision: number; timestamp: number;
}

export const obtenerUbicacion = (precisionMaxima: number = 50): Promise<Ubicacion | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.error('Geolocalización no soportada');
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const timestamp = position.timestamp;
        const ahora = Date.now();

        if (accuracy > precisionMaxima) console.warn(`GPS impreciso: ${accuracy}m`);
        if (ahora - timestamp > 30000) console.warn(`GPS desactualizado`);

        resolve({ lat: latitude, lng: longitude, precision: accuracy, timestamp });
      },
      (error) => {
        console.error('Error GPS:', error.message);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  });
};

export function calcularDistanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 🚀 FIX: Leer correctamente data.direccion
export async function obtenerDireccionReal(lat: number, lng: number): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('geocode', {
      body: { lat, lng },
    });
    if (error) throw error;
    return data?.direccion || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (error) {
    console.error('Error geocodificación:', error);
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

export const esGPSConfiable = (ubicacion: Ubicacion): boolean => {
  const ahora = Date.now();
  const diferencia = ahora - ubicacion.timestamp;
  return ubicacion.precision < 100 && diferencia < 60000;
};
