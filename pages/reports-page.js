import { requireAuth } from '../services/auth.js';
import { renderLayout, appShell } from '../components/layout.js';
import { reportTransactions } from '../services/transactions.js';
import { formatDate, formatNumber, setToday } from '../utils/format.js';

let currentRows = [];
let currentReport = { period: 'daily', value: '' };

const periodLabels = { daily: 'Harian', monthly: 'Bulanan', yearly: 'Tahunan' };
const REPORT_UI_VERSION = 'report-excel-export-20260810';
console.info('REPORT_UI_VERSION', REPORT_UI_VERSION);

const user = await requireAuth();
if (user) {
  document.body.innerHTML = appShell('Laporan', `
    <div class="panel mb-3 no-print"><form id="reportForm" class="row g-2 align-items-end"><div class="col-md-3"><label class="form-label">Periode</label><select class="form-select" name="period" id="periodSelect"><option value="daily">Harian</option><option value="monthly">Bulanan</option><option value="yearly">Tahunan</option></select></div><div class="col-md-3"><label class="form-label">Nilai Periode</label><input class="form-control" id="periodValue" name="value" type="date" required></div><div class="col-md-6 d-flex gap-2 flex-wrap"><button class="btn btn-primary btn-icon" type="submit"><i class="bi bi-funnel"></i>Tampilkan</button><button class="btn btn-outline-secondary btn-icon" type="button" id="resetFilterButton"><i class="bi bi-arrow-counterclockwise"></i>Reset Filter</button><button class="btn btn-outline-success btn-icon" type="button" id="excelButton"><i class="bi bi-file-earmark-excel"></i>Unduh Excel</button></div></form></div>
    <article class="report-document" id="reportDocument">
      <header class="report-header">
        <div class="report-brand-block">
          <div class="report-logo"><img src="./assets/mbos.png" alt="Logo MBOS"></div>
          <div class="report-title-block">
            <p class="report-company">APP</p>
            <h2 id="reportTitle">Laporan Stok Souvenir</h2>
            <p class="report-meta" id="reportMeta">Periode laporan</p>
          </div>
        </div>
      </header>
      <section class="report-summary" id="summary"></section>
      <section class="report-table-card">
        <div class="report-table-title">
          <h3>Rincian Transaksi</h3>
          <span id="printedAt"></span>
        </div>
        <div class="table-responsive"><table class="table align-middle report-table"><thead><tr><th>Tanggal</th><th>Kode Barang</th><th>Barang</th><th>Jenis</th><th class="text-end">Jumlah</th><th>PIC</th><th>Keterangan</th></tr></thead><tbody id="rows"></tbody></table></div>
      </section>
      <footer class="report-footer print-only">
        <span>Dokumen ini dihasilkan dari Sistem Stok Souvenir.</span>
        <span>Halaman <span class="page-number"></span></span>
      </footer>
    </article>`);
  renderLayout(user, 'Laporan');
  bindEvents();
  setToday(document.getElementById('periodValue'));
  await generate();
}

function bindEvents() {
  document.getElementById('periodSelect').addEventListener('change', changeInputType);
  document.getElementById('reportForm').addEventListener('submit', (event) => { event.preventDefault(); generate(); });
  document.getElementById('resetFilterButton').addEventListener('click', resetFilters);
  document.getElementById('excelButton').addEventListener('click', exportExcel);
}

function resetFilters() {
  const periodSelect = document.getElementById('periodSelect');
  const periodValue = document.getElementById('periodValue');
  periodSelect.value = 'daily';
  periodValue.type = 'date';
  periodValue.placeholder = '';
  setToday(periodValue);
  generate();
}

function exportExcel() {
  const periodLabel = periodLabels[currentReport.period] || 'Laporan';
  const periodText = formatPeriod(currentReport.period, currentReport.value);
  const filename = `laporan-stok-souvenir-${currentReport.period}-${currentReport.value || new Date().toISOString().slice(0, 10)}.xls`;
  const rows = currentRows.map(excelRow).join('') || '<tr><td colspan="7">Tidak ada data laporan.</td></tr>';
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8"><style>
      body { font-family: Arial, sans-serif; }
      h1 { color: #006837; margin-bottom: 4px; }
      .meta { color: #4b5563; margin-bottom: 16px; }
      table { border-collapse: collapse; width: 100%; }
      th { background: #006837; color: #ffffff; font-weight: bold; }
      th, td { border: 1px solid #cfd8d3; padding: 8px; vertical-align: top; }
      .in { color: #006837; font-weight: bold; }
      .out { color: #ED1C24; font-weight: bold; }
      .number { text-align: right; }
    </style></head>
    <body>
      <h1>Laporan Stok Souvenir - ${escapeHtml(periodLabel)}</h1>
      <div class="meta">Periode: ${escapeHtml(periodText)}</div>
      <table>
        <thead><tr><th>Tanggal</th><th>Kode Barang</th><th>Barang</th><th>Jenis</th><th>Jumlah</th><th>PIC</th><th>Keterangan</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function excelRow(row) {
  const typeLabel = row.transaction_type === 'IN' ? 'Masuk' : 'Keluar';
  const typeClass = row.transaction_type === 'IN' ? 'in' : 'out';
  return `<tr><td>${escapeHtml(formatDate(row.transaction_date))}</td><td>${escapeHtml(row.items?.item_code || '-')}</td><td>${escapeHtml(row.items?.item_name || '-')}</td><td class="${typeClass}">${typeLabel}</td><td class="number">${Number(row.quantity || 0)}</td><td>${escapeHtml(row.pic || '-')}</td><td>${escapeHtml(row.description || '-')}</td></tr>`;
}

function changeInputType() {
  const input = document.getElementById('periodValue');
  const period = document.getElementById('periodSelect').value;
  input.type = period === 'daily' ? 'date' : period === 'monthly' ? 'month' : 'number';
  input.placeholder = period === 'yearly' ? '2026' : '';
  if (period === 'yearly' && !input.value) input.value = new Date().getFullYear();
}

async function generate() {
  const form = document.getElementById('reportForm');
  const { period, value } = Object.fromEntries(new FormData(form).entries());
  currentReport = { period, value };
  currentRows = await reportTransactions(period, value);
  const incoming = currentRows.filter((row) => row.transaction_type === 'IN').reduce((sum, row) => sum + Number(row.quantity), 0);
  const outgoing = currentRows.filter((row) => row.transaction_type === 'OUT').reduce((sum, row) => sum + Number(row.quantity), 0);

  document.getElementById('summary').innerHTML = metric('Total Transaksi', currentRows.length) + metric('Total Barang Masuk', incoming) + metric('Total Barang Keluar', outgoing);
  document.getElementById('reportTitle').textContent = `Laporan Stok Souvenir - ${periodLabels[period]}`;
  document.getElementById('reportMeta').textContent = `Periode: ${formatPeriod(period, value)}`;
  document.getElementById('printedAt').textContent = `Dibuat: ${formatDate(new Date().toISOString())}`;
  document.getElementById('rows').innerHTML = currentRows.length ? currentRows.map(reportRow).join('') : '<tr><td colspan="7" class="empty-state">Tidak ada data laporan.</td></tr>';
}

function metric(label, value) {
  return `<div class="report-metric"><span>${label}</span><strong>${formatNumber(value)}</strong></div>`;
}

function reportRow(row) {
  return `<tr><td>${formatDate(row.transaction_date)}</td><td>${escapeHtml(row.items?.item_code || '-')}</td><td>${escapeHtml(row.items?.item_name || '-')}</td><td><span class="badge ${row.transaction_type === 'IN' ? 'badge-in' : 'badge-out'}">${row.transaction_type === 'IN' ? 'Masuk' : 'Keluar'}</span></td><td class="text-end">${formatNumber(row.quantity)}</td><td>${escapeHtml(row.pic || '-')}</td><td>${escapeHtml(row.description || '-')}</td></tr>`;
}

function formatPeriod(period, value) {
  if (!value) return '-';
  if (period === 'daily') return formatDate(value);
  if (period === 'monthly') {
    const [year, month] = value.split('-');
    return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(Number(year), Number(month) - 1, 1));
  }
  return value;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

