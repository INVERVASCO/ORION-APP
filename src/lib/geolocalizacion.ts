// src/lib/geolocalizacion.ts

export interface Ubicacion {
  lat: number;
  lng: number;
  precision: number;
}

export const obtenerUbicacion = (): Promise<Ubicacion | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.error("Geolocalización no soportada por el navegador");
      resolve(null);
      return;
    }
    
    // Pedimos la ubicación con alta precisión
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          precision: position.coords.accuracy
        });
      },
      (error) => {
        console.error("Error obteniendo ubicación:", error);
        resolve(null); // Si el usuario rechaza el permiso, devolvemos null
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
};

// Función matemática para calcular si está cerca (Fórmula de Haversine)
export function calcularDistanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Radio de la Tierra en metros
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Devuelve la distancia en metros
}
// Agrega esto al final de geolocalizacion.ts
export async function obtenerDireccionReal(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    const data = await res.json();
    // Retornamos la dirección formateada o un texto por defecto
    return data.display_name || "Dirección no encontrada";
  } catch (error) {
    console.error("Error obteniendo dirección:", error);
    return "No se pudo obtener la dirección";
  }
}