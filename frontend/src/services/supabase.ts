import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lmowqbpuupkrxvtorknk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_fRTsKlLAJ9QF7sO-NC-wlg_zm9Me_Oa';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
