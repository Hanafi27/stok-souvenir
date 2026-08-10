import { redirectIfAuthenticated, login, resetPassword } from '../services/auth.js';
import { isSupabaseConfigured } from '../services/supabase.js';
import { showAlert, clearAlert, getQueryParam } from '../utils/format.js';

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
    const email = String(formData.get('email') || '').trim();
    await login(email, formData.get('password'));
    window.location.href = getQueryParam('next') || 'dashboard.html';
  } catch (error) {
    showAlert(alertBox, error.message || 'Masuk gagal. Periksa email dan kata sandi.');
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
    await resetPassword(String(formData.get('email') || '').trim());
    showAlert(forgotPasswordAlert, 'Link reset password sudah dikirim. Periksa email terdaftar.', 'success');
    forgotPasswordForm.reset();
  } catch (error) {
    showAlert(forgotPasswordAlert, error.message || 'Gagal mengirim link reset password.');
  } finally {
    button.disabled = false;
    button.innerHTML = '<i class="bi bi-send"></i>Kirim Link Reset';
  }
});




