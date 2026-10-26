import { supabase } from './supabaseClient';

interface PersonaData {
  nombre_completo: string;
  telefono: string | null;
  ocupacion?: string | null;
  correo_electronico?: string | null;
  direccion?: string | null;
  barrio_colonia_id?: string | null;
  origen_captura?: string | null;
}

/**
 * Busca una persona existente por teléfono. Si existe, la reutiliza.
 * Si no existe, la crea. Retorna el ID y si fue nueva o existente.
 */
export async function obtenerOCrearPersona(data: PersonaData): Promise<{ id: string; esNueva: boolean } | null> {
  const telefono = (data.telefono || '').trim();

  // Si tiene teléfono, buscar duplicado
  if (telefono) {
    const { data: existente } = await supabase
      .from('personas')
      .select('id')
      .eq('telefono', telefono)
      .maybeSingle();

    if (existente) {
      return { id: existente.id, esNueva: false };
    }
  }

  // Crear nueva persona
  const { data: nueva, error } = await supabase
    .from('personas')
    .insert([{
      ...data,
      consentimiento_aceptado: true,
      fecha_consentimiento: new Date().toISOString(),
    }])
    .select('id')
    .single();

  if (error || !nueva) {
    console.error('Error al crear persona:', error);
    return null;
  }
  return { id: nueva.id, esNueva: true };
}