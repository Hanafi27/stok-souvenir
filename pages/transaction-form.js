import { requireAuth } from '../services/auth.js';
import { renderLayout, appShell } from '../components/layout.js?v=sidebar-title-20260814';
import { getActiveItems } from '../services/items.js?v=data-sync-20260818';
import { createTransaction } from '../services/transactions.js?v=data-sync-20260818';
import { setToday, showAlert, clearAlert, formatNumber } from '../utils/format.js?v=data-sync-20260818';

const type = document.body.dataset.transactionType || 'IN';
const isOut = type === 'OUT';
let items = [];

const user = await requireAuth();
if (user) {
  const title = isOut ? 'Transaksi Barang Keluar' : 'Transaksi Barang Masuk';
  const icon = isOut ? 'bi-box-arrow-up' : 'bi-box-arrow-in-down';
  const actionLabel = isOut ? 'Catat Barang Keluar' : 'Catat Barang Masuk';
  const helperText = isOut
    ? 'Stok akan berkurang otomatis setelah transaksi disimpan.'
    : 'Stok akan bertambah otomatis setelah transaksi disimpan.';
  document.body.innerHTML = appShell(title, `
    <section class="transaction-page ${isOut ? 'transaction-out' : 'transaction-in'}">
      <div class="transaction-hero mb-3">
        <div class="transaction-hero-icon"><i class="bi ${icon}"></i></div>
        <div>
          <p class="transaction-kicker">${isOut ? 'Pengeluaran Stok' : 'Penerimaan Stok'}</p>
          <h2>${title}</h2>
          <p>${helperText}</p>
        </div>
      </div>
      <div class="row g-3 align-items-start">
        <div class="col-xl-7 col-lg-8">
          <div class="panel transaction-form-panel">
            <div id="alertBox" class="mb-3"></div>
            <div class="panel-heading mb-3">
              <div>
                <h2>Form Transaksi</h2>
                <p>Isi tanggal, barang, jumlah, dan PIC yang bertanggung jawab.</p>
              </div>
            </div>
            <form id="transactionForm">
              <div class="row g-3">
                <div class="col-sm-6">
                  <label class="form-label">Tanggal</label>
                  <input class="form-control form-control-lg" type="date" name="transaction_date" required>
                </div>
                <div class="col-sm-6">
                  <label class="form-label">Jumlah</label>
                  <div class="input-group input-group-lg">
                    <input class="form-control" type="number" min="1" name="quantity" placeholder="0" required>
                    <span class="input-group-text">pcs</span>
                  </div>
                </div>
                <div class="col-12">
                  <label class="form-label">Barang</label>
                  <select class="form-select form-select-lg" name="item_id" id="itemSelect" required>
                    <option value="">Pilih barang</option>
                  </select>
                  <div class="form-text" id="stockHint">Pilih barang untuk melihat stok tersedia.</div>
                </div>
                <div class="col-12">
                  <label class="form-label">PIC</label>
                  <input class="form-control form-control-lg" name="pic" placeholder="Nama penanggung jawab" required>
                </div>
                <div class="col-12">
                  <label class="form-label">${isOut ? 'Keperluan' : 'Keterangan'}</label>
                  <textarea class="form-control" name="description" rows="4" placeholder="${isOut ? 'Contoh: kebutuhan event / tamu / distribusi' : 'Contoh: penambahan stok dari vendor / gudang'}"></textarea>
                </div>
                <div class="col-12">
                  <button class="btn ${isOut ? 'btn-warning' : 'btn-primary'} btn-lg btn-icon transaction-submit" type="submit">
                    <i class="bi ${icon}"></i>${actionLabel}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
        <div class="col-xl-5 col-lg-4">
          <aside class="panel transaction-summary-panel">
            <div class="panel-heading mb-3">
              <div>
                <h2>Ringkasan Stok</h2>
                <p>Periksa stok sebelum menyimpan transaksi.</p>
              </div>
            </div>
            <div id="summary" class="transaction-empty-summary">
              <i class="bi bi-clipboard2-check"></i>
              <strong>Belum ada barang dipilih</strong>
              <span>Pilih barang dan masukkan jumlah untuk melihat hasil stok.</span>
            </div>
          </aside>
        </div>
      </div>
    </section>`);
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
    summary.className = 'transaction-empty-summary';
    summary.innerHTML = '<i class="bi bi-clipboard2-check"></i><strong>Belum ada barang dipilih</strong><span>Pilih barang dan masukkan jumlah untuk melihat hasil stok.</span>';
    hint.textContent = 'Pilih barang untuk melihat stok tersedia.';
    return;
  }
  const nextStock = isOut ? Number(item.current_stock) - qty : Number(item.current_stock) + qty;
  const isInvalid = nextStock < 0;
  hint.textContent = `Stok tersedia: ${formatNumber(item.current_stock)} pcs`;
  summary.className = `transaction-stock-summary ${isInvalid ? 'is-invalid' : ''}`;
  summary.innerHTML = `
    <div class="summary-item-title">
      <span>${escapeHtml(item.item_code)}</span>
      <h3>${escapeHtml(item.item_name)}</h3>
    </div>
    <div class="summary-stock-grid">
      <div><span>Stok Saat Ini</span><strong>${formatNumber(item.current_stock)}</strong></div>
      <div><span>${isOut ? 'Akan Keluar' : 'Akan Masuk'}</span><strong>${formatNumber(qty)}</strong></div>
      <div class="${isInvalid ? 'danger' : ''}"><span>Setelah Transaksi</span><strong>${formatNumber(nextStock)}</strong></div>
    </div>
    <div class="summary-status ${isInvalid ? 'danger' : 'ok'}">
      <i class="bi ${isInvalid ? 'bi-exclamation-triangle' : 'bi-check2-circle'}"></i>
      ${isInvalid ? 'Stok tidak cukup untuk transaksi keluar.' : 'Transaksi aman untuk disimpan.'}
    </div>`;
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
    notifyInventoryChanged();
    showAlert(document.getElementById('alertBox'), 'Transaksi berhasil disimpan.', 'info');
    form.reset();
    setToday(form.transaction_date);
    await loadItems();
    updateSummary();
  } catch (error) {
    showAlert(document.getElementById('alertBox'), error.message);
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

function notifyInventoryChanged() {
  localStorage.setItem('inventory_sync_at', String(Date.now()));
}




