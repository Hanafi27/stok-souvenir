import { requireAuth } from '../services/auth.js';
import { renderLayout, appShell } from '../components/layout.js?v=dropdown-red-theme-20260812';
import { getActiveItems } from '../services/items.js?v=history-hide-display-20260807';
import { listTransactions } from '../services/transactions.js?v=history-hide-display-20260807';
import { formatDate, formatNumber } from '../utils/format.js';

let items = [];
let currentRows = [];
let selectedTransactionIds = new Set();
let searchTimer;
const HIDDEN_HISTORY_KEY = 'hidden_history_transaction_ids';

const user = await requireAuth();
if (user) {
  document.body.innerHTML = appShell('Riwayat Transaksi', `
    <div class="history-filter-panel panel mb-3 no-print">
      <div class="panel-heading history-panel-heading">
        <div>
          <h2>Filter Riwayat</h2>
          <p>Pilih periode, barang, jenis transaksi, atau cari berdasarkan PIC dan keterangan.</p>
        </div>
        <button class="btn btn-outline-secondary btn-icon" type="button" id="resetFilterButton">
          <i class="bi bi-arrow-counterclockwise"></i>Reset Filter
        </button>
      </div>
      <form id="filterForm" class="history-filter-grid">
        <div><label class="form-label">Tanggal</label><input class="form-control" type="date" name="date"></div>
        <div><label class="form-label">Bulan</label><input class="form-control" type="month" name="month"></div>
        <div><label class="form-label">Barang</label><select class="form-select" name="item_id" id="itemFilter"><option value="">Semua Barang</option></select></div>
        <div><label class="form-label">Jenis</label><select class="form-select" name="transaction_type"><option value="">Semua Jenis</option><option value="IN">Masuk</option><option value="OUT">Keluar</option></select></div>
        <div class="history-search-field"><label class="form-label">Cari</label><div class="input-group"><span class="input-group-text"><i class="bi bi-search"></i></span><input class="form-control" id="historySearchInput" name="search" placeholder="PIC, barang, kode, atau keterangan" autocomplete="off"></div></div>
      </form>
    </div>

    <div id="alertBox" class="mb-3"></div>
    <section class="history-summary-grid mb-3" id="historySummary"></section>
    <div class="table-panel history-table-panel">
      <div class="history-table-header">
        <div>
          <h2>Daftar Transaksi</h2>
          <p id="historyResultText">Memuat transaksi...</p>
        </div>
        <button class="btn btn-outline-danger btn-icon" type="button" id="deleteSelectedButton" disabled>
          <i class="bi bi-trash3"></i>Hapus dari Tampilan <span class="badge text-bg-danger" id="selectedTransactionCount">0</span>
        </button>
      </div>
      <div class="table-responsive"><table class="table table-hover align-middle history-table"><thead><tr><th class="selection-col"><input class="form-check-input" type="checkbox" id="selectAllTransactions" aria-label="Pilih semua transaksi"></th><th>Tanggal</th><th>Barang</th><th>Jenis</th><th class="text-end">Jumlah</th><th>PIC</th><th>Keterangan</th><th class="text-end">Aksi</th></tr></thead><tbody id="rows"></tbody></table></div>
    </div>`);
  renderLayout(user, 'Riwayat Transaksi');
  await init();
}

async function init() {
  items = await getActiveItems();
  document.getElementById('itemFilter').innerHTML += items.map((item) => `<option value="${item.id}">${escapeHtml(item.item_code)} - ${escapeHtml(item.item_name)}</option>`).join('');
  document.getElementById('filterForm').addEventListener('submit', (event) => { event.preventDefault(); loadRows(); });
  document.getElementById('filterForm').addEventListener('change', loadRows);
  document.getElementById('historySearchInput').addEventListener('input', handleSearchInput);
  document.getElementById('resetFilterButton').addEventListener('click', resetFilters);
  document.getElementById('selectAllTransactions').addEventListener('change', toggleSelectAll);
  document.getElementById('deleteSelectedButton').addEventListener('click', removeSelectedTransactions);
  await loadRows();
}

function handleSearchInput() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadRows, 180);
}

function resetFilters() {
  document.getElementById('filterForm').reset();
  selectedTransactionIds.clear();
  clearTimeout(searchTimer);
  loadRows();
}

async function loadRows() {
  try {
    const filters = Object.fromEntries(new FormData(document.getElementById('filterForm')).entries());
    const hiddenIds = getHiddenTransactionIds();
    currentRows = (await listTransactions(filters)).filter((row) => !hiddenIds.has(row.id));
    selectedTransactionIds = new Set([...selectedTransactionIds].filter((id) => currentRows.some((row) => row.id === id)));
    renderSummary(currentRows);
    document.getElementById('historyResultText').textContent = `${formatNumber(currentRows.length)} transaksi ditemukan`;
    renderRows();
  } catch (error) {
    document.getElementById('alertBox').innerHTML = `<div class="alert alert-danger">${escapeHtml(error.message)}</div>`;
  }
}

function renderRows() {
  document.getElementById('rows').innerHTML = currentRows.length ? currentRows.map(historyRow).join('') : '<tr><td colspan="8" class="empty-state">Tidak ada transaksi.</td></tr>';
  document.querySelectorAll('.transaction-checkbox').forEach((checkbox) => checkbox.addEventListener('change', toggleTransactionSelection));
  document.querySelectorAll('[data-action="delete-transaction"]').forEach((button) => button.addEventListener('click', removeTransaction));
  updateBulkControls();
}

function renderSummary(rows) {
  const incoming = rows.filter((row) => row.transaction_type === 'IN').reduce((sum, row) => sum + Number(row.quantity), 0);
  const outgoing = rows.filter((row) => row.transaction_type === 'OUT').reduce((sum, row) => sum + Number(row.quantity), 0);
  const itemCount = new Set(rows.map((row) => row.item_id)).size;
  document.getElementById('historySummary').innerHTML = `
    ${summaryCard('Total Transaksi', rows.length, 'bi-clock-history')}
    ${summaryCard('Barang Masuk', incoming, 'bi-box-arrow-in-down', 'in')}
    ${summaryCard('Barang Keluar', outgoing, 'bi-box-arrow-up', 'out')}
    ${summaryCard('Item Terlibat', itemCount, 'bi-box-seam')}`;
}

function summaryCard(label, value, icon, tone = '') {
  return `<div class="history-summary-card ${tone}"><div class="summary-icon"><i class="bi ${icon}"></i></div><div><span>${label}</span><strong>${formatNumber(value)}</strong></div></div>`;
}

function historyRow(row) {
  const isIncoming = row.transaction_type === 'IN';
  return `<tr>
    <td><input class="form-check-input transaction-checkbox" type="checkbox" value="${row.id}" aria-label="Pilih transaksi" ${selectedTransactionIds.has(row.id) ? 'checked' : ''}></td>
    <td><span class="history-date">${formatDate(row.transaction_date)}</span></td>
    <td><span class="fw-semibold">${escapeHtml(row.items?.item_code || '-')}</span><br><span class="small text-muted">${escapeHtml(row.items?.item_name || '-')}</span></td>
    <td><span class="transaction-pill ${isIncoming ? 'in' : 'out'}"><i class="bi ${isIncoming ? 'bi-arrow-down-left' : 'bi-arrow-up-right'}"></i>${isIncoming ? 'Masuk' : 'Keluar'}</span></td>
    <td class="text-end fw-semibold">${formatNumber(row.quantity)}</td>
    <td>${escapeHtml(row.pic || '-')}</td>
    <td class="history-description">${escapeHtml(row.description || '-')}</td>
    <td class="text-end"><button class="btn btn-sm btn-outline-danger" type="button" data-action="delete-transaction" data-id="${row.id}" title="Hapus dari tampilan"><i class="bi bi-trash"></i></button></td>
  </tr>`;
}

function toggleTransactionSelection(event) {
  const id = event.currentTarget.value;
  if (event.currentTarget.checked) selectedTransactionIds.add(id);
  else selectedTransactionIds.delete(id);
  updateBulkControls();
}

function toggleSelectAll(event) {
  if (event.currentTarget.checked) currentRows.forEach((row) => selectedTransactionIds.add(row.id));
  else currentRows.forEach((row) => selectedTransactionIds.delete(row.id));
  renderRows();
}

function updateBulkControls() {
  const visibleIds = currentRows.map((row) => row.id);
  const selectedVisibleCount = visibleIds.filter((id) => selectedTransactionIds.has(id)).length;
  const totalSelected = selectedTransactionIds.size;
  const selectAll = document.getElementById('selectAllTransactions');
  const deleteButton = document.getElementById('deleteSelectedButton');
  const selectedCount = document.getElementById('selectedTransactionCount');
  if (selectedCount) selectedCount.textContent = totalSelected;
  if (deleteButton) deleteButton.disabled = totalSelected === 0;
  if (selectAll) {
    selectAll.checked = currentRows.length > 0 && selectedVisibleCount === currentRows.length;
    selectAll.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < currentRows.length;
  }
}

async function removeTransaction(event) {
  const id = event.currentTarget.dataset.id;
  const row = currentRows.find((item) => item.id === id);
  if (!row) return;
  if (!confirm(`Hapus transaksi ${row.transaction_type === 'IN' ? 'Masuk' : 'Keluar'} untuk ${row.items?.item_name || 'barang ini'} dari tampilan riwayat?`)) return;
  await runDelete([id]);
}

async function removeSelectedTransactions() {
  const ids = [...selectedTransactionIds];
  if (!ids.length) return;
  if (!confirm(`Hapus ${ids.length} transaksi terpilih dari tampilan riwayat?`)) return;
  await runDelete(ids);
}

async function runDelete(ids) {
  const hiddenIds = getHiddenTransactionIds();
  ids.forEach((id) => {
    hiddenIds.add(id);
    selectedTransactionIds.delete(id);
  });
  saveHiddenTransactionIds(hiddenIds);
  document.getElementById('alertBox').innerHTML = `<div class="alert alert-danger">${formatNumber(ids.length)} transaksi berhasil dihapus dari tampilan.</div>`;
  await loadRows();
}

function getHiddenTransactionIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(HIDDEN_HISTORY_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveHiddenTransactionIds(ids) {
  localStorage.setItem(HIDDEN_HISTORY_KEY, JSON.stringify([...ids]));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}










