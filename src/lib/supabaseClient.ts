// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// 🔒 SEGURIDAD: Sin fallbacks hardcodeados. Si no hay variables de entorno, falla explícitamente.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qpyepdxaggitqexjqsds.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Pa0Psji8FgtLa1iZ-FmlMQ_MqvdOJAY';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '❌ Faltan variables de entorno: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. ' +
    'Revisa la configuración de Vercel o tu archivo .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'public',
  },
});

// Helper para debug (quitar en producción)
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};
