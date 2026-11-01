import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '❌ Faltan variables de entorno: SUPABASE_URL y SUPABASE_ANON_KEY. ' +
    'Revisa la configuración de Vercel.'
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

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};
