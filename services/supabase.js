import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../js/config.js';

const isConfigured = !SUPABASE_URL.includes('YOUR_PROJECT_ID') && !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE');

export const supabase = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function ensureSupabaseConfigured() {
  if (!isConfigured || !supabase) {
    throw new Error('Supabase belum dikonfigurasi. Ubah js/config.js dengan Project URL dan anon key dari Supabase.');
  }
}

export function isSupabaseConfigured() {
  return isConfigured && Boolean(supabase);
}

export async function getCurrentUser() {
  ensureSupabaseConfigured();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}
