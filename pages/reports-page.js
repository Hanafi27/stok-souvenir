import { requireAuth } from '../services/auth.js';
import { renderLayout, appShell } from '../components/layout.js?v=sidebar-title-20260814';
import { reportTransactions } from '../services/transactions.js?v=report-items-visible-20260818';
import { listItems } from '../services/items.js?v=report-items-list-20260818';
import { supabase } from '../services/supabase.js?v=data-sync-20260818';
import { formatDate, formatNumber, toISODate } from '../utils/format.js?v=data-sync-20260818';

let currentRows = [];
let currentItems = [];
let currentReport = { period: 'monthly', value: '' };

const periodLabels = { daily: 'Harian', monthly: 'Bulanan', yearly: 'Tahunan' };
const REPORT_UI_VERSION = 'report-items-visible-20260818';
console.info('REPORT_UI_VERSION', REPORT_UI_VERSION);

const user = await requireAuth();
if (user) {
  document.body.innerHTML = appShell('Laporan', `
    <div class="panel mb-3 no-print"><form id="reportForm" class="row g-2 align-items-end" autocomplete="off"><div class="col-md-3"><label class="form-label">Periode</label><select class="form-select" name="period" id="periodSelect" autocomplete="off"><option value="daily">Harian</option><option value="monthly" selected>Bulanan</option><option value="yearly">Tahunan</option></select></div><div class="col-md-3"><label class="form-label">Nilai Periode</label><input class="form-control" id="periodValue" name="value" type="month" autocomplete="off" required></div><div class="col-md-6 d-flex gap-2 flex-wrap"><button class="btn btn-primary btn-icon" type="submit"><i class="bi bi-funnel"></i>Tampilkan</button><button class="btn btn-outline-secondary btn-icon" type="button" id="resetFilterButton"><i class="bi bi-arrow-counterclockwise"></i>Reset Filter</button><button class="btn btn-outline-danger btn-icon" type="button" id="excelButton"><i class="bi bi-file-earmark-excel"></i>Unduh Excel</button></div></form></div>
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
      <section class="report-table-card mt-3">
        <div class="report-table-title">
          <h3>Daftar Barang</h3>
          <span id="itemDatabaseTotal"></span>
        </div>
        <div class="table-responsive"><table class="table align-middle report-table item-database-table"><thead><tr><th>Kode Barang</th><th>Nama Barang</th><th>Keterangan</th><th class="text-end">Stok Awal</th><th class="text-end">Stok Saat Ini</th><th class="text-end">Stok Minimum</th><th>Status</th><th>Dibuat</th></tr></thead><tbody id="itemDatabaseRows"></tbody></table></div>
      </section>
      <section class="report-table-card mt-3">
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
  setReportToCurrentMonth();
  await generate();
  bindReportRefresh();
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
  periodSelect.value = 'monthly';
  periodValue.type = 'month';
  periodValue.placeholder = '';
  setCurrentMonth(periodValue);
  periodSelect.dispatchEvent(new Event('change', { bubbles: true }));
  generate();
}

function exportExcel() {
  const filename = `laporan-stok-souvenir-${currentReport.period}-${currentReport.value || new Date().toISOString().slice(0, 10)}.xls`;
  const blob = new Blob(['\ufeff', buildExcelDocument()], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildExcelDocument() {
  const itemRows = buildLogbookRows();
  const dateColumns = buildDateColumns();
  const columnCount = 9 + Math.max(dateColumns.length - 1, 0);
  const rows = [
    ['', 'LOG BOOK SOUVENIR'],
    [],
    ['', 'No', 'Nama Barang', 'Keterangan', 'Awal Stock', 'Barang Masuk', 'Barang Keluar', ...dateColumns.slice(1), 'Sisa Stock', 'PIC'],
    ['', '', '', '', '', '', ...dateColumns, '', ''],
    ...itemRows,
  ];

  return excelWorkbook(rows, columnCount, buildItemDatabaseRows());
}

function buildDateColumns() {
  const dates = [...new Set(currentRows
    .filter((row) => row.transaction_type === 'OUT')
    .map((row) => row.transaction_date)
    .filter(Boolean))]
    .sort();
  if (dates.length) return dates.map((date) => formatDate(date));
  return currentReport.value ? [formatPeriod(currentReport.period, currentReport.value)] : [''];
}

function buildLogbookRows() {
  const dateKeys = [...new Set(currentRows
    .filter((row) => row.transaction_type === 'OUT')
    .map((row) => row.transaction_date)
    .filter(Boolean))]
    .sort();
  const grouped = new Map();

  currentItems.forEach((item) => {
    grouped.set(item.id, {
      name: item.item_name || '-',
      initialStock: Number(item.initial_stock || 0),
      currentStock: Number(item.current_stock || 0),
      description: item.description || '',
      incoming: 0,
      outgoingByDate: Object.fromEntries(dateKeys.map((date) => [date, 0])),
      pic: new Set(),
    });
  });

  currentRows.forEach((row) => {
    const key = row.item_id || row.items?.item_name || 'item';
    if (!grouped.has(key)) {
      grouped.set(key, {
        name: row.items?.item_name || '-',
        initialStock: Number(row.items?.initial_stock || 0),
        currentStock: Number(row.items?.current_stock || 0),
        description: row.items?.description || row.description || '',
        incoming: 0,
        outgoingByDate: Object.fromEntries(dateKeys.map((date) => [date, 0])),
        pic: new Set(),
      });
    }
    const item = grouped.get(key);
    if (!item.initialStock && row.items?.initial_stock) item.initialStock = Number(row.items.initial_stock || 0);
    if (!item.description && row.description) item.description = row.description;
    if (row.pic) item.pic.add(row.pic);
    if (row.transaction_type === 'IN' && !isInitialStockTransaction(row)) item.incoming += Number(row.quantity || 0);
    if (row.transaction_type === 'OUT' && row.transaction_date) {
      item.outgoingByDate[row.transaction_date] = (item.outgoingByDate[row.transaction_date] || 0) + Number(row.quantity || 0);
    }
  });

  if (!grouped.size) return [['', '', 'Tidak ada data laporan.']];

  return [...grouped.values()].map((item, index) => {
    const outgoingValues = dateKeys.length ? dateKeys.map((date) => item.outgoingByDate[date] || '') : [''];
    const totalOut = Object.values(item.outgoingByDate).reduce((sum, qty) => sum + Number(qty || 0), 0);
    const calculatedStock = Number(item.initialStock || 0) + Number(item.incoming || 0) - totalOut;
    return [
      '',
      index + 1,
      item.name,
      item.description,
      item.initialStock || '',
      item.incoming || '',
      ...outgoingValues,
      item.currentStock || calculatedStock,
      [...item.pic].join(', '),
    ];
  });
}

function buildItemDatabaseRows() {
  return [
    ['Kode Barang', 'Nama Barang', 'Keterangan', 'Stok Awal', 'Stok Saat Ini', 'Stok Minimum', 'Status', 'Dibuat'],
    ...currentItems.map((item) => [
      item.item_code || '',
      item.item_name || '',
      item.description || '',
      Number(item.initial_stock || 0),
      Number(item.current_stock || 0),
      Number(item.minimum_stock || 0),
      item.is_active === false ? 'Nonaktif' : 'Aktif',
      item.created_at ? formatDate(item.created_at) : '',
    ]),
  ];
}

function excelCell(value) {
  const text = String(value ?? '');
  return text.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

function excelWorkbook(rows, columnCount, itemDatabaseRows) {
  const columns = [32, 48, 240, 150, 80, 90, 90, ...Array(Math.max(columnCount - 9, 0)).fill(86), 90, 140];
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Top" ss:WrapText="1"/><Font ss:FontName="Calibri" ss:Size="11"/></Style>
  <Style ss:ID="Title"><Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1"/></Style>
  <Style ss:ID="Header"><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>
  <Style ss:ID="Cell"><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>
  <Style ss:ID="Number"><Alignment ss:Horizontal="Center" ss:Vertical="Top"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>
 </Styles>
 <Worksheet ss:Name="Sheet2">
  <Table>${columns.map((width) => `<Column ss:Width="${width}"/>`).join('')}
   ${rows.map((row, rowIndex) => excelXmlRow(row, rowIndex)).join('')}
  </Table>
 </Worksheet>
 <Worksheet ss:Name="Database Barang">
  <Table>${[90, 220, 220, 80, 90, 90, 80, 130].map((width) => `<Column ss:Width="${width}"/>`).join('')}
   ${itemDatabaseRows.map((row, rowIndex) => excelXmlRow(row, rowIndex === 0 ? 2 : 4)).join('')}
  </Table>
 </Worksheet>
</Workbook>`;
}

function excelXmlRow(row, rowIndex) {
  const isTitle = rowIndex === 0;
  const isHeader = rowIndex === 2 || rowIndex === 3;
  return `<Row>${row.map((value, index) => {
    const isNumber = typeof value === 'number';
    const style = isTitle && index === 1 ? 'Title' : isHeader ? 'Header' : isNumber ? 'Number' : 'Cell';
    const type = isNumber ? 'Number' : 'String';
    return `<Cell ss:StyleID="${style}"><Data ss:Type="${type}">${excelCell(value)}</Data></Cell>`;
  }).join('')}</Row>`;
}

function changeInputType() {
  const input = document.getElementById('periodValue');
  const period = document.getElementById('periodSelect').value;
  input.type = period === 'daily' ? 'date' : period === 'monthly' ? 'month' : 'number';
  input.placeholder = period === 'yearly' ? '2026' : '';
  if (period === 'daily' && !input.value) input.value = toISODate(new Date());
  if (period === 'monthly') input.value = toISODate(new Date()).slice(0, 7);
  if (period === 'yearly' && !input.value) input.value = new Date().getFullYear();
}

async function generate() {
  try {
    const form = document.getElementById('reportForm');
    const { period, value } = Object.fromEntries(new FormData(form).entries());
    currentReport = { period, value };
    [currentRows, currentItems] = await Promise.all([
      reportTransactions(period, value),
      listItems(),
    ]);
    const incoming = currentRows.filter((row) => row.transaction_type === 'IN').reduce((sum, row) => sum + Number(row.quantity), 0);
    const outgoing = currentRows.filter((row) => row.transaction_type === 'OUT').reduce((sum, row) => sum + Number(row.quantity), 0);

    document.getElementById('summary').innerHTML = metric('Total Barang', currentItems.length) + metric('Total Transaksi', currentRows.length) + metric('Total Barang Masuk', incoming) + metric('Total Barang Keluar', outgoing);
    document.getElementById('reportTitle').textContent = `Laporan Stok Souvenir - ${periodLabels[period]}`;
    document.getElementById('reportMeta').textContent = `Periode: ${formatPeriod(period, value)}`;
    document.getElementById('printedAt').textContent = `Diperbarui: ${formatDate(new Date().toISOString())}`;
    document.getElementById('rows').innerHTML = currentRows.length ? currentRows.map(reportRow).join('') : '<tr><td colspan="7" class="empty-state">Tidak ada data pada periode ini. Coba pilih periode Bulanan/Tahunan jika transaksi memakai tanggal berbeda.</td></tr>';
    document.getElementById('itemDatabaseTotal').textContent = `${formatNumber(currentItems.length)} barang aktif`;
    document.getElementById('itemDatabaseRows').innerHTML = currentItems.length ? currentItems.map(itemDatabaseRow).join('') : '<tr><td colspan="8" class="empty-state">Belum ada data barang.</td></tr>';
  } catch (error) {
    document.getElementById('rows').innerHTML = `<tr><td colspan="7" class="empty-state text-danger">${escapeHtml(error.message || 'Gagal memuat laporan.')}</td></tr>`;
    document.getElementById('itemDatabaseRows').innerHTML = `<tr><td colspan="8" class="empty-state text-danger">${escapeHtml(error.message || 'Gagal memuat database barang.')}</td></tr>`;
  }
}

function metric(label, value) {
  return `<div class="report-metric"><span>${label}</span><strong>${formatNumber(value)}</strong></div>`;
}

function reportRow(row) {
  return `<tr><td>${formatDate(row.transaction_date)}</td><td>${escapeHtml(row.items?.item_code || '-')}</td><td>${escapeHtml(row.items?.item_name || '-')}</td><td><span class="badge ${row.transaction_type === 'IN' ? 'badge-in' : 'badge-out'}">${row.transaction_type === 'IN' ? 'Masuk' : 'Keluar'}</span></td><td class="text-end">${formatNumber(row.quantity)}</td><td>${escapeHtml(row.pic || '-')}</td><td>${escapeHtml(row.description || '-')}</td></tr>`;
}

function itemDatabaseRow(item) {
  return `<tr><td>${escapeHtml(item.item_code || '-')}</td><td>${escapeHtml(item.item_name || '-')}</td><td>${escapeHtml(item.description || '-')}</td><td class="text-end">${formatNumber(item.initial_stock || 0)}</td><td class="text-end">${formatNumber(item.current_stock || 0)}</td><td class="text-end">${formatNumber(item.minimum_stock || 0)}</td><td><span class="badge ${item.is_active === false ? 'badge-out' : 'badge-in'}">${item.is_active === false ? 'Nonaktif' : 'Aktif'}</span></td><td>${item.created_at ? formatDate(item.created_at) : '-'}</td></tr>`;
}

function isInitialStockTransaction(row) {
  return String(row.description || '').toLowerCase().startsWith('stok awal dari menu barang');
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

function bindReportRefresh() {
  window.addEventListener('focus', generate);
  window.addEventListener('storage', (event) => {
    if (event.key === 'inventory_sync_at') generate();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) generate();
  });
  setInterval(generate, 15000);
  supabase?.channel('report-transaction-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, generate)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, generate)
    .subscribe();
}

function setCurrentMonth(input) {
  if (input) input.value = toISODate(new Date()).slice(0, 7);
}

function setReportToCurrentMonth() {
  const periodSelect = document.getElementById('periodSelect');
  const periodValue = document.getElementById('periodValue');
  periodSelect.value = 'monthly';
  periodValue.type = 'month';
  periodValue.placeholder = '';
  setCurrentMonth(periodValue);
  periodSelect.dispatchEvent(new Event('change', { bubbles: true }));
}







