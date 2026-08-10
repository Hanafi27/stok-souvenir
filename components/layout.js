import { APP_NAME } from '../js/config.js';
import { logout } from '../services/auth.js';

const links = [
  ['dashboard.html', 'bi-speedometer2', 'Dasbor'],
  ['items.html', 'bi-box-seam', 'Barang'],
  ['incoming.html', 'bi-box-arrow-in-down', 'Barang Masuk'],
  ['outgoing.html', 'bi-box-arrow-up', 'Barang Keluar'],
  ['history.html', 'bi-clock-history', 'Riwayat'],
  ['reports.html', 'bi-file-earmark-spreadsheet', 'Laporan'],
];

export function renderLayout(user, title = '') {
  const current = location.pathname.split('/').pop() || 'dashboard.html';
  const nav = links.map(([href, icon, label]) => `
    <a href="${href}" class="${current === href ? 'active' : ''}">
      <i class="bi ${icon}"></i><span>${label}</span>
    </a>`).join('');

  document.body.insertAdjacentHTML('afterbegin', `
    <div class="sidebar-backdrop" id="sidebarBackdrop"></div>
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <div class="brand-mark brand-image-mark"><img src="assets/mbos.png" alt="Logo MBOS"></div>
        <div>
          <div class="fw-bold text-white">${APP_NAME}</div>
          <small class="text-white-50">Manajemen Stok</small>
        </div>
      </div>
      <nav class="sidebar-nav">${nav}</nav>
    </aside>
  `);

  const topbar = document.querySelector('[data-topbar]');
  if (topbar) {
    topbar.innerHTML = `
      <button class="btn btn-outline-secondary mobile-menu-btn" type="button" id="menuButton" aria-label="Buka menu"><i class="bi bi-list"></i></button>
      <div>
        <h1 class="page-title">${title}</h1>
        <p class="page-subtitle d-none d-md-block">Kelola stok souvenir secara rapi dan real time.</p>
      </div>
      <div class="dropdown">
        <button class="btn btn-outline-secondary btn-icon" data-bs-toggle="dropdown" type="button">
          <i class="bi bi-person-circle"></i><span class="d-none d-sm-inline">${user?.email || 'Pengguna'}</span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><span class="dropdown-item-text small text-muted">${user?.email || ''}</span></li>
          <li><hr class="dropdown-divider"></li>
          <li><button class="dropdown-item" type="button" id="logoutButton"><i class="bi bi-box-arrow-right me-2"></i>Keluar</button></li>
        </ul>
      </div>
    `;
  }

  document.getElementById('logoutButton')?.addEventListener('click', logout);
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  document.getElementById('menuButton')?.addEventListener('click', () => {
    sidebar?.classList.add('show');
    backdrop?.classList.add('show');
  });
  backdrop?.addEventListener('click', () => {
    sidebar?.classList.remove('show');
    backdrop?.classList.remove('show');
  });
}

export function appShell(title, content) {
  return `
    <div class="app-shell">
      <main class="main-content">
        <header class="topbar" data-topbar></header>
        <section class="content-area">${content}</section>
      </main>
    </div>`;
}



