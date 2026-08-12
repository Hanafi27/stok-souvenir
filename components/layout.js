import { APP_NAME } from '../js/config.js';
import { logout } from '../services/auth.js';
import { initCustomSelects } from './custom-select.js?v=initial-stock-report-20260812';

const links = [
  ['dashboard.html', 'bi-speedometer2', 'Dasbor'],
  ['items.html', 'bi-box-seam', 'Barang'],
  ['incoming.html', 'bi-box-arrow-in-down', 'Barang Masuk'],
  ['outgoing.html', 'bi-box-arrow-up', 'Barang Keluar'],
  ['history.html', 'bi-clock-history', 'Riwayat'],
  ['reports.html', 'bi-file-earmark-spreadsheet', 'Laporan'],
];

function layoutThemeStyle() {
  if (document.getElementById('mbosLayoutTheme')) return;
  document.head.insertAdjacentHTML('beforeend', `<style id="mbosLayoutTheme">
    .sidebar { background: linear-gradient(180deg, #7f1d1d 0%, #b91c1c 50%, #dc2626 100%) !important; border-right-color: rgba(255,255,255,.18) !important; }
    .sidebar-nav a { color: rgba(255,255,255,.86) !important; }
    .sidebar-nav a.active, .sidebar-nav a:hover { background: rgba(255,255,255,.16) !important; color: #fff !important; box-shadow: inset 4px 0 0 #fff !important; }
    .sidebar-logout { color: rgba(255,255,255,.9) !important; }
    .sidebar-logout:hover { background: rgba(255,255,255,.16) !important; color: #fff !important; }
    .sidebar-brand .brand-image-mark { background: #fff !important; }
    .topbar { background: linear-gradient(90deg, #991b1b, #dc2626) !important; border-bottom: 0 !important; color: #fff !important; box-shadow: 0 10px 24px rgba(185, 28, 28, .16) !important; }
    .topbar .page-title, .topbar .page-subtitle { color: #fff !important; }
    .topbar .btn-outline-secondary { --bs-btn-color: #fff; --bs-btn-border-color: rgba(255,255,255,.72); --bs-btn-hover-bg: rgba(255,255,255,.14); --bs-btn-hover-border-color: #fff; --bs-btn-hover-color: #fff; }
  </style>`);
}

export function renderLayout(user, title = '') {
  layoutThemeStyle();
  const current = location.pathname.split('/').pop() || 'dashboard.html';
  const userLabel = localStorage.getItem('app_perner') || 'Pengguna';
  const nav = links.map(([href, icon, label]) => `
    <a href="${href}" class="${current === href ? 'active' : ''}">
      <i class="bi ${icon}"></i><span>${label}</span>
    </a>`).join('');

  document.body.insertAdjacentHTML('afterbegin', `
    <div class="sidebar-backdrop" id="sidebarBackdrop"></div>
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <div class="brand-mark brand-image-mark"><img src="assets/mbos.png?v=initial-stock-report-20260812" alt="Logo MBOS"></div>
        <div>
          <div class="fw-bold text-white">${APP_NAME}</div>
          <small class="text-white-50">Manajemen Stok</small>
        </div>
      </div>
      <nav class="sidebar-nav">${nav}</nav>
      <div class="sidebar-footer">
        <button class="sidebar-logout" type="button" id="sidebarLogoutButton">
          <i class="bi bi-box-arrow-right"></i><span>Keluar</span>
        </button>
      </div>
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
          <i class="bi bi-person-circle"></i><span class="d-none d-sm-inline">${userLabel}</span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><span class="dropdown-item-text small text-muted">${userLabel}</span></li>
          <li><hr class="dropdown-divider"></li>
          <li><button class="dropdown-item" type="button" id="logoutButton"><i class="bi bi-box-arrow-right me-2"></i>Keluar</button></li>
        </ul>
      </div>
    `;
  }

  document.getElementById('logoutButton')?.addEventListener('click', logout);
  document.getElementById('sidebarLogoutButton')?.addEventListener('click', logout);
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
  initCustomSelects();
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





