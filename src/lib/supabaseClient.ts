import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qpyepdxaggitqexjqsds.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Pa0Psji8FgtLa1iZ-FmlMQ_MqvdOJAY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);