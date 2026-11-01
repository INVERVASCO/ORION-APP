import { supabase } from './supabaseClient';

interface PersonaData {
  nombre_completo: string;
  telefono: string | null;
  ocupacion?: string | null;
  correo_electronico?: string | null;
  direccion?: string | null;
  barrio_colonia_id?: string | null;
  origen_captura?: string | null;
  consentimiento_aceptado: boolean; // 🚀 OBLIGATORIO
}

const normalizarTelefono = (tel: string | null) => {
  if (!tel) return null;
  let limpio = tel.replace(/\D/g, '');
  if (limpio.length === 12 && limpio.startsWith('52')) limpio = limpio.substring(2);
  return limpio.length === 10 ? limpio : null;
};

export async function obtenerOCrearPersona(data: PersonaData): Promise<{ id: string; esNueva: boolean } | null> {
  const telefonoNormalizado = normalizarTelefono(data.telefono);

  if (telefonoNormalizado) {
    const { data: existente } = await supabase
      .from('personas')
      .select('id')
      .eq('telefono', telefonoNormalizado)
      .maybeSingle();

    if (existente) {
      return { id: existente.id, esNueva: false };
    }
  }

  // Si el formulario no envía true, no guardamos.
  if (!data.consentimiento_aceptado) {
    console.error('Se intentó guardar una persona sin consentimiento.');
    return null;
  }

  const { data: nueva, error } = await supabase
    .from('personas')
    .insert([{
      ...data,
      telefono: telefonoNormalizado,
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
