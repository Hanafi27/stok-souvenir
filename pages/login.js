import {
  redirectIfAuthenticated,
  login,
  resetPassword,
  updatePassword,
  onPasswordRecovery,
} from '../services/auth.js?v=email-reset-login-20260814';
import { isSupabaseConfigured } from '../services/supabase.js';
import { showAlert, clearAlert, getQueryParam } from '../utils/format.js?v=email-reset-login-20260814';

const form = document.getElementById('loginForm');
const alertBox = document.getElementById('loginAlert');
const submitButton = form?.querySelector('button[type="submit"]');
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const forgotPasswordAlert = document.getElementById('forgotPasswordAlert');
const newPasswordForm = document.getElementById('newPasswordForm');
const newPasswordAlert = document.getElementById('newPasswordAlert');

stripCredentialQuery();

if (!isSupabaseConfigured()) {
  showAlert(alertBox, 'Supabase belum dikonfigurasi. Isi js/config.js terlebih dahulu.', 'warning');
} else {
  if (!isPasswordRecoveryUrl()) redirectIfAuthenticated();
  onPasswordRecovery(showNewPasswordModal);
  if (isPasswordRecoveryUrl()) setTimeout(showNewPasswordModal, 250);
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearAlert(alertBox);
  submitButton.disabled = true;
  submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Masuk';
  try {
    const formData = new FormData(form);
    const email = normalizeEmail(formData.get('email'));
    await login(email, formData.get('password'));
    localStorage.setItem('app_user_email', email);
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
    await resetPassword(normalizeEmail(formData.get('email')));
    showAlert(forgotPasswordAlert, 'Link reset password sudah dikirim. Periksa email terdaftar.', 'success');
    forgotPasswordForm.reset();
  } catch (error) {
    showAlert(forgotPasswordAlert, error.message || 'Gagal mengirim link reset password.');
  } finally {
    button.disabled = false;
    button.innerHTML = '<i class="bi bi-send"></i>Kirim Link Reset';
  }
});

newPasswordForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearAlert(newPasswordAlert);
  const button = newPasswordForm.querySelector('button[type="submit"]');
  button.disabled = true;
  button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Menyimpan';
  try {
    const formData = new FormData(newPasswordForm);
    const password = String(formData.get('password') || '');
    const confirmation = String(formData.get('confirm_password') || '');
    if (password !== confirmation) throw new Error('Konfirmasi password belum sama.');
    await updatePassword(password);
    showAlert(newPasswordAlert, 'Password berhasil diperbarui. Silakan masuk dengan password baru.', 'success');
    newPasswordForm.reset();
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1200);
  } catch (error) {
    showAlert(newPasswordAlert, error.message || 'Gagal menyimpan password baru.');
  } finally {
    button.disabled = false;
    button.innerHTML = '<i class="bi bi-check2-circle"></i>Simpan Password';
  }
});

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!email) throw new Error('Email wajib diisi.');
  if (!email.includes('@')) throw new Error('Format email belum benar.');
  return email;
}

function isPasswordRecoveryUrl() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return hashParams.get('type') === 'recovery' || getQueryParam('type') === 'recovery' || Boolean(getQueryParam('code'));
}

function showNewPasswordModal() {
  const modalElement = document.getElementById('newPasswordModal');
  if (!modalElement) return;
  bootstrap.Modal.getOrCreateInstance(modalElement).show();
}

function stripCredentialQuery() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('email') && !params.has('password')) return;
  params.delete('email');
  params.delete('password');
  const query = params.toString();
  const cleanUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  window.history.replaceState({}, document.title, cleanUrl);
}
