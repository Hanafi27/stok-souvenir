import { supabase, ensureSupabaseConfigured, isSupabaseConfigured } from './supabase.js';

export async function requireAuth() {
  ensureSupabaseConfigured();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    window.location.href = `login.html?next=${encodeURIComponent(location.pathname.split('/').pop() || 'dashboard.html')}`;
    return null;
  }
  return data.user;
}

export async function redirectIfAuthenticated() {
  if (!isSupabaseConfigured()) return null;
  const { data } = await supabase.auth.getUser();
  if (data.user) window.location.href = 'dashboard.html';
  return data.user;
}

export async function login(email, password) {
  ensureSupabaseConfigured();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function logout() {
  ensureSupabaseConfigured();
  await supabase.auth.signOut();
  localStorage.removeItem('app_perner');
  localStorage.removeItem('app_user_email');
  window.location.href = 'login.html';
}

export async function resetPassword(email) {
  ensureSupabaseConfigured();
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
  return data;
}

export async function updatePassword(password) {
  ensureSupabaseConfigured();
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  return data;
}

export function onPasswordRecovery(callback) {
  if (!isSupabaseConfigured()) return null;
  return supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') callback();
  });
}
