import { redirectIfAuthenticated, login, resetPassword } from '../services/auth.js';
import { isSupabaseConfigured } from '../services/supabase.js';
import { showAlert, clearAlert, getQueryParam } from '../utils/format.js?v=success-info-alert-v2-20260812';
import { PERNER_LOGIN_MAP } from '../js/config.js';

const form = document.getElementById('loginForm');
const alertBox = document.getElementById('loginAlert');
const submitButton = form?.querySelector('button[type="submit"]');
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const forgotPasswordAlert = document.getElementById('forgotPasswordAlert');

if (!isSupabaseConfigured()) {
  showAlert(alertBox, 'Supabase belum dikonfigurasi. Isi js/config.js terlebih dahulu.', 'warning');
} else {
  redirectIfAuthenticated();
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearAlert(alertBox);
  submitButton.disabled = true;
  submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Masuk';
  try {
    const formData = new FormData(form);
    const perner = normalizePerner(formData.get('perner'));
    const email = resolvePernerEmail(perner);
    await login(email, formData.get('password'));
    localStorage.setItem('app_perner', perner);
    window.location.href = getQueryParam('next') || 'dashboard.html';
  } catch (error) {
    showAlert(alertBox, error.message || 'Masuk gagal. Periksa Perner dan kata sandi.');
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Masuk';
  }
});

forgotPasswordForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearAlert(forgotPasswordAlert);
  const button = forgotPasswordForm.querySelector('button[type="submit"]');
  button.disabled = true;
  button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Mengirim';
  try {
    const formData = new FormData(forgotPasswordForm);
    const email = resolvePernerEmail(normalizePerner(formData.get('perner')));
    await resetPassword(email);
    showAlert(forgotPasswordAlert, 'Link reset password sudah dikirim. Periksa akun terdaftar.', 'success');
    forgotPasswordForm.reset();
  } catch (error) {
    showAlert(forgotPasswordAlert, error.message || 'Gagal mengirim link reset password.');
  } finally {
    button.disabled = false;
    button.innerHTML = '<i class="bi bi-send"></i>Kirim Link Reset';
  }
});

function normalizePerner(value) {
  return String(value || '').trim().toUpperCase();
}

function resolvePernerEmail(perner) {
  if (!perner) throw new Error('Perner wajib diisi.');
  if (perner.includes('@')) return perner.toLowerCase();
  const email = PERNER_LOGIN_MAP?.[perner];
  if (!email || email.includes('ganti-dengan-email-supabase')) {
    throw new Error(`Perner ${perner} belum dipetakan ke akun Supabase.`);
  }
  return email;
}
