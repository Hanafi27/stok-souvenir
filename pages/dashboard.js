import { requireAuth } from '../services/auth.js';
import { renderLayout, appShell } from '../components/layout.js?v=neutral-success-alert-20260812';
import { dashboardStats } from '../services/transactions.js';
import { formatNumber } from '../utils/format.js';

const user = await requireAuth();
if (user) {
  document.body.innerHTML = appShell('Dasbor', `
    <div id="alertBox"></div>
    <div class="dashboard-hero mb-3">
      <div>
        <p class="dashboard-eyebrow">Ringkasan Inventori</p>
        <h2>Monitoring stok souvenir</h2>
        <p class="mb-0">Pantau posisi stok, transaksi bulan berjalan, dan barang yang perlu segera ditindaklanjuti.</p>
      </div>
      <div class="dashboard-hero-mark"><img src="assets/mbos.png?v=neutral-success-alert-20260812" alt="Logo MBOS"></div>
    </div>
    <div class="dashboard-metrics mb-3" id="metrics"></div>
    <div class="dashboard-grid">
      <div class="panel chart-panel chart-panel-main">
        <div class="panel-heading">
          <div>
            <h2>Arus Transaksi Bulan Ini</h2>
            <p>Perbandingan jumlah barang masuk dan keluar per tanggal.</p>
          </div>
          <span class="panel-badge">Bulanan</span>
        </div>
        <div class="chart-wrap"><canvas id="monthlyChart"></canvas></div>
      </div>
      <div class="panel chart-panel">
        <div class="panel-heading">
          <div>
            <h2>Barang Paling Banyak Digunakan</h2>
            <p>Top barang keluar pada bulan berjalan.</p>
          </div>
        </div>
        <div class="chart-wrap chart-wrap-sm"><canvas id="topItemsChart"></canvas></div>
      </div>
      <div class="panel low-stock-panel">
        <div class="panel-heading">
          <div>
            <h2>Perhatian Stok Rendah</h2>
            <p>Otomatis berdasarkan stok saat ini dan batas minimum tiap barang.</p>
          </div>
          <div class="toolbar">
            <span class="panel-badge" id="lowStockCount">0 barang</span>
            <a class="btn btn-sm btn-outline-danger btn-icon" href="items.html"><i class="bi bi-box-seam"></i>Kelola Barang</a>
          </div>
        </div>
        <div id="lowStockRows" class="low-stock-list"></div>
      </div>
    </div>`);
  renderLayout(user, 'Dasbor');
  loadDashboard();
}

async function loadDashboard() {
  try {
    const data = await dashboardStats();
    const sortedLowStock = [...data.lowStockItems].sort(compareLowStock);

    document.getElementById('metrics').innerHTML = [
      ['bi-boxes', 'Total Barang', data.totalItems, 'Jumlah item aktif'],
      ['bi-stack', 'Total Stok Saat Ini', data.currentStock, 'Akumulasi semua barang'],
      ['bi-box-arrow-in-down', 'Barang Masuk Bulan Ini', data.incomingMonth, 'Total penambahan stok'],
      ['bi-box-arrow-up', 'Barang Keluar Bulan Ini', data.outgoingMonth, 'Total pengurangan stok'],
      ['bi-exclamation-triangle', 'Barang Stok Rendah', sortedLowStock.length, 'Perlu pemeriksaan'],
    ].map(([icon, label, value, note], index) => `
      <div class="metric-card ${index === 4 ? 'metric-card-alert' : ''}">
        <div class="metric-top"><div class="metric-icon"><i class="bi ${icon}"></i></div><span>${note}</span></div>
        <div class="metric-value">${formatNumber(value)}</div>
        <div class="metric-label">${label}</div>
      </div>`).join('');

    document.getElementById('lowStockCount').textContent = `${formatNumber(sortedLowStock.length)} barang`;
    document.getElementById('lowStockRows').innerHTML = sortedLowStock.length
      ? sortedLowStock.map((item) => lowStockItem(item)).join('')
      : '<div class="empty-state">Tidak ada barang dengan stok rendah.</div>';

    renderMonthlyChart(data.monthTransactions);
    renderTopItemsChart(data.monthTransactions);
  } catch (error) {
    document.getElementById('alertBox').innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
  }
}

function compareLowStock(a, b) {
  const aMin = Number(a.minimum_stock || 10);
  const bMin = Number(b.minimum_stock || 10);
  const aRatio = aMin > 0 ? Number(a.current_stock || 0) / aMin : 1;
  const bRatio = bMin > 0 ? Number(b.current_stock || 0) / bMin : 1;
  if (aRatio !== bRatio) return aRatio - bRatio;
  return Number(a.current_stock || 0) - Number(b.current_stock || 0);
}

function lowStockItem(item) {
  const current = Number(item.current_stock || 0);
  const minimum = Number(item.minimum_stock || 10);
  const percent = minimum > 0 ? Math.min(100, Math.round((current / minimum) * 100)) : 0;
  const isCritical = current === 0 || percent <= 25;
  const statusLabel = isCritical ? 'Kritis' : 'Waspada';
  const statusClass = isCritical ? 'critical' : 'warning';
  return `<div class="low-stock-item ${statusClass}">
    <div class="low-stock-main">
      <div class="low-stock-code">${item.item_code}</div>
      <div>
        <div class="low-stock-name">${item.item_name}</div>
        <div class="low-stock-note">Batas minimum ${formatNumber(minimum)} unit</div>
      </div>
    </div>
    <div class="low-stock-side">
      <span class="low-stock-pill ${statusClass}">${statusLabel}</span>
      <div class="low-stock-qty"><strong>${formatNumber(current)}</strong><span>unit</span></div>
      <div class="stock-meter"><span style="width:${percent}%"></span></div>
    </div>
  </div>`;
}

function renderMonthlyChart(rows) {
  const days = {};
  rows.forEach((row) => {
    const key = row.transaction_date;
    days[key] ||= { in: 0, out: 0 };
    if (row.transaction_type === 'IN') days[key].in += Number(row.quantity);
    if (row.transaction_type === 'OUT') days[key].out += Number(row.quantity);
  });
  const labels = Object.keys(days).sort();
  new Chart(document.getElementById('monthlyChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Barang Masuk', data: labels.map((d) => days[d].in), backgroundColor: 'rgba(220, 38, 38, .88)', borderColor: '#dc2626', borderWidth: 1, borderRadius: 6, maxBarThickness: 42, categoryPercentage: .56, barPercentage: .72 },
        { label: 'Barang Keluar', data: labels.map((d) => days[d].out), backgroundColor: 'rgba(237, 28, 36, .82)', borderColor: '#ED1C24', borderWidth: 1, borderRadius: 6, maxBarThickness: 42, categoryPercentage: .56, barPercentage: .72 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', align: 'center', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 10, boxHeight: 10, padding: 28, font: { size: 13 }, color: '#4b5563' } },
        tooltip: { backgroundColor: '#111827', padding: 10, displayColors: true },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#6b7280', maxRotation: 0 } },
        y: { beginAtZero: true, ticks: { precision: 0, color: '#6b7280' }, grid: { color: 'rgba(107, 114, 128, .16)' } },
      },
    },
  });
}

function renderTopItemsChart(rows) {
  const totals = {};
  rows.filter((row) => row.transaction_type === 'OUT').forEach((row) => {
    const name = row.items?.item_name || 'Tidak diketahui';
    totals[name] = (totals[name] || 0) + Number(row.quantity);
  });
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 10);
  new Chart(document.getElementById('topItemsChart'), {
    type: 'doughnut',
    data: { labels: entries.map(([name]) => name), datasets: [{ data: entries.map(([, qty]) => qty), backgroundColor: ['#dc2626', '#ED1C24', '#fecaca', '#f47b80', '#7f1d1d', '#b91218', '#fca5a5', '#d94b51', '#4b5563', '#fee2e2'], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', align: 'center', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 10, boxHeight: 10, padding: 28, font: { size: 13 }, color: '#4b5563' } } } },
  });
}









