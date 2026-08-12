import { requireAuth } from '../services/auth.js';
import { renderLayout, appShell } from '../components/layout.js?v=dropdown-red-theme-20260812';
import { getActiveItems } from '../services/items.js';
import { createTransaction } from '../services/transactions.js';
import { setToday, showAlert, clearAlert, formatNumber } from '../utils/format.js';

const type = document.body.dataset.transactionType || 'IN';
const isOut = type === 'OUT';
let items = [];

const user = await requireAuth();
if (user) {
  const title = isOut ? 'Transaksi Barang Keluar' : 'Transaksi Barang Masuk';
  document.body.innerHTML = appShell(title, `
    <div class="row g-3">
      <div class="col-lg-7"><div class="panel"><div id="alertBox" class="mb-3"></div><form id="transactionForm"><div class="row g-3"><div class="col-sm-6"><label class="form-label">Tanggal</label><input class="form-control" type="date" name="transaction_date" required></div><div class="col-sm-6"><label class="form-label">Jumlah</label><input class="form-control" type="number" min="1" name="quantity" required></div><div class="col-12"><label class="form-label">Barang</label><select class="form-select" name="item_id" id="itemSelect" required><option value="">Pilih barang</option></select><div class="form-text" id="stockHint"></div></div><div class="col-12"><label class="form-label">PIC</label><input class="form-control" name="pic" required></div><div class="col-12"><label class="form-label">${isOut ? 'Keperluan' : 'Keterangan'}</label><textarea class="form-control" name="description" rows="3"></textarea></div><div class="col-12"><button class="btn ${isOut ? 'btn-warning' : 'btn-primary'} btn-icon" type="submit"><i class="bi ${isOut ? 'bi-box-arrow-up' : 'bi-box-arrow-in-down'}"></i>Simpan Transaksi</button></div></div></form></div></div>
      <div class="col-lg-5"><div class="panel"><h2 class="h6 mb-3">Ringkasan</h2><div id="summary" class="text-muted">Pilih barang untuk melihat stok saat ini.</div></div></div>
    </div>`);
  renderLayout(user, title);
  await loadItems();
  bindEvents();
}

async function loadItems() {
  try {
    items = await getActiveItems();
    const select = document.getElementById('itemSelect');
    select.innerHTML = '<option value="">Pilih barang</option>' + items.map((item) => `<option value="${item.id}">${item.item_code} - ${item.item_name}</option>`).join('');
    setToday(document.querySelector('[name="transaction_date"]'));
  } catch (error) {
    showAlert(document.getElementById('alertBox'), error.message);
  }
}

function bindEvents() {
  document.getElementById('itemSelect').addEventListener('change', updateSummary);
  document.querySelector('[name="quantity"]').addEventListener('input', updateSummary);
  document.getElementById('transactionForm').addEventListener('submit', saveTransaction);
}

function selectedItem() {
  const id = document.getElementById('itemSelect').value;
  return items.find((item) => item.id === id);
}

function updateSummary() {
  const item = selectedItem();
  const qty = Number(document.querySelector('[name="quantity"]').value || 0);
  const summary = document.getElementById('summary');
  const hint = document.getElementById('stockHint');
  if (!item) {
    summary.textContent = 'Pilih barang untuk melihat stok saat ini.';
    hint.textContent = '';
    return;
  }
  const nextStock = isOut ? Number(item.current_stock) - qty : Number(item.current_stock) + qty;
  hint.textContent = `Stok saat ini: ${formatNumber(item.current_stock)}`;
  summary.innerHTML = `<dl class="row mb-0"><dt class="col-5">Kode</dt><dd class="col-7">${item.item_code}</dd><dt class="col-5">Barang</dt><dd class="col-7">${item.item_name}</dd><dt class="col-5">Stok Saat Ini</dt><dd class="col-7">${formatNumber(item.current_stock)}</dd><dt class="col-5">Setelah Transaksi</dt><dd class="col-7"><span class="badge ${nextStock < 0 ? 'badge-low' : 'badge-soft'}">${formatNumber(nextStock)}</span></dd></dl>`;
}

async function saveTransaction(event) {
  event.preventDefault();
  clearAlert(document.getElementById('alertBox'));
  const form = event.currentTarget;
  const item = selectedItem();
  const payload = Object.fromEntries(new FormData(form).entries());
  payload.transaction_type = type;
  if (isOut && item && Number(payload.quantity) > Number(item.current_stock)) {
    showAlert(document.getElementById('alertBox'), 'Stok tidak cukup untuk transaksi keluar ini.');
    return;
  }
  try {
    await createTransaction(payload);
    showAlert(document.getElementById('alertBox'), 'Transaksi berhasil disimpan.', 'success');
    form.reset();
    setToday(form.transaction_date);
    await loadItems();
    updateSummary();
  } catch (error) {
    showAlert(document.getElementById('alertBox'), error.message);
  }
}




