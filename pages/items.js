import { requireAuth } from '../services/auth.js';
import { renderLayout, appShell } from '../components/layout.js?v=success-info-alert-v2-20260812';
import {
  listItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  deactivateItem,
  countItemTransactions,
  listItemTransactions,
  getNextItemCode,
} from '../services/items.js?v=items-view-no-edit-20260807';
import { formatDate, formatNumber, showAlert, clearAlert } from '../utils/format.js?v=success-info-alert-v2-20260812';

let items = [];
let editingId = null;
let selectedItemIds = new Set();

const user = await requireAuth();
if (user) {
  document.body.innerHTML = appShell('Master Barang', `
    <div id="alertBox" class="mb-3"></div>
    <div class="panel mb-3">
      <div class="toolbar justify-content-between">
        <div class="input-group search-field"><span class="input-group-text"><i class="bi bi-search"></i></span><input id="searchInput" class="form-control" placeholder="Cari kode, nama, atau keterangan"></div>
        <div class="toolbar">
          <button class="btn btn-outline-danger btn-icon" id="bulkHapusButton" disabled><i class="bi bi-trash3"></i>Hapus / Nonaktifkan <span class="badge text-bg-danger" id="selectedCount">0</span></button>
          <button class="btn btn-primary btn-icon" id="addButton"><i class="bi bi-plus-lg"></i>Tambah Barang</button>
        </div>
      </div>
    </div>
    <div class="table-panel"><div class="table-responsive"><table class="table table-hover align-middle"><thead><tr><th class="selection-col"><input class="form-check-input" type="checkbox" id="selectAllItems" aria-label="Pilih semua barang"></th><th>Kode</th><th>Nama Barang</th><th>Keterangan</th><th>Stok Awal</th><th>Stok Saat Ini</th><th>Stok Minimum</th><th>Dibuat</th><th class="text-end">Aksi</th></tr></thead><tbody id="itemRows"></tbody></table></div></div>

    <div class="modal fade" id="viewItemModal" tabindex="-1"><div class="modal-dialog modal-lg modal-dialog-scrollable"><div class="modal-content"><div class="modal-header"><div><p class="modal-kicker mb-1" id="viewItemCode">Kode Barang</p><h2 class="modal-title h5" id="viewItemName">Detail Barang</h2></div><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body" id="viewItemBody"><div class="empty-state">Memuat detail barang...</div></div><div class="modal-footer"><button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Tutup</button></div></div></div></div>

    <div class="modal fade" id="itemModal" tabindex="-1"><div class="modal-dialog"><form class="modal-content" id="itemForm"><div class="modal-header"><h2 class="modal-title h5" id="modalTitle">Tambah Barang</h2><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body"><div id="modalAlert" class="mb-3"></div><div class="mb-3"><label class="form-label">Kode Barang</label><input class="form-control" id="itemCode" readonly></div><div class="mb-3"><label class="form-label">Nama Barang</label><input class="form-control" name="item_name" required></div><div class="mb-3"><label class="form-label">Keterangan</label><textarea class="form-control" name="description" rows="3"></textarea></div><div class="row g-3"><div class="col-sm-6"><label class="form-label">Stok Awal</label><input class="form-control" name="initial_stock" type="number" min="0" required></div><div class="col-sm-6"><label class="form-label">Stok Minimum</label><input class="form-control" name="minimum_stock" type="number" min="0" value="10" required></div></div><div class="form-check form-switch mt-3"><input class="form-check-input" type="checkbox" name="is_active" id="isActive" checked><label class="form-check-label" for="isActive">Aktif</label></div></div><div class="modal-footer"><button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Batal</button><button type="submit" class="btn btn-primary btn-icon"><i class="bi bi-save"></i>Simpan</button></div></form></div></div>`);
  renderLayout(user, 'Master Barang');
  bindEvents();
  await loadItems();
}

function bindEvents() {
  document.getElementById('searchInput').addEventListener('input', async (event) => loadItems(event.target.value));
  document.getElementById('addButton').addEventListener('click', openCreateModal);
  document.getElementById('bulkHapusButton').addEventListener('click', removeSelectedItems);
  document.getElementById('selectAllItems').addEventListener('change', toggleSelectAll);
  document.getElementById('itemForm').addEventListener('submit', saveItem);
}

async function loadItems(search = '') {
  try {
    items = await listItems(search);
    selectedItemIds = new Set([...selectedItemIds].filter((id) => items.some((item) => item.id === id)));
    renderRows();
    updateBulkControls();
  } catch (error) {
    showAlert(document.getElementById('alertBox'), error.message);
  }
}

function renderRows() {
  const tbody = document.getElementById('itemRows');
  tbody.innerHTML = items.length ? items.map((item) => `<tr>
    <td><input class="form-check-input item-checkbox" type="checkbox" value="${item.id}" aria-label="Pilih ${escapeHtml(item.item_name)}" ${selectedItemIds.has(item.id) ? 'checked' : ''}></td>
    <td class="fw-semibold">${escapeHtml(item.item_code)}</td><td>${escapeHtml(item.item_name)}</td><td>${escapeHtml(item.description || '-')}</td><td>${formatNumber(item.initial_stock)}</td><td>${stockBadge(item)}</td><td>${formatNumber(item.minimum_stock)}</td><td>${formatDate(item.created_at)}</td>
    <td class="text-end"><div class="btn-group btn-group-sm"><button class="btn btn-outline-secondary" data-action="view" data-id="${item.id}" title="Lihat"><i class="bi bi-eye"></i></button><button class="btn btn-outline-primary" data-action="edit" data-id="${item.id}" title="Ubah"><i class="bi bi-pencil"></i></button><button class="btn btn-outline-danger" data-action="delete" data-id="${item.id}" title="Hapus"><i class="bi bi-trash"></i></button></div></td>
  </tr>`).join('') : '<tr><td colspan="9" class="empty-state">Belum ada data barang.</td></tr>';
  tbody.querySelectorAll('button').forEach((button) => button.addEventListener('click', handleRowAction));
  tbody.querySelectorAll('.item-checkbox').forEach((checkbox) => checkbox.addEventListener('change', toggleItemSelection));
}

function stockBadge(item) {
  const low = Number(item.current_stock) <= Number(item.minimum_stock || 10);
  return `<span class="badge ${low ? 'badge-low' : 'badge-soft'}">${formatNumber(item.current_stock)}</span>`;
}

function toggleItemSelection(event) {
  const id = event.currentTarget.value;
  if (event.currentTarget.checked) selectedItemIds.add(id);
  else selectedItemIds.delete(id);
  updateBulkControls();
}

function toggleSelectAll(event) {
  if (event.currentTarget.checked) items.forEach((item) => selectedItemIds.add(item.id));
  else items.forEach((item) => selectedItemIds.delete(item.id));
  renderRows();
  updateBulkControls();
}

function updateBulkControls() {
  const visibleIds = items.map((item) => item.id);
  const selectedVisibleCount = visibleIds.filter((id) => selectedItemIds.has(id)).length;
  const totalSelected = selectedItemIds.size;
  const selectAll = document.getElementById('selectAllItems');
  const bulkHapusButton = document.getElementById('bulkHapusButton');
  document.getElementById('selectedCount').textContent = totalSelected;
  bulkHapusButton.disabled = totalSelected === 0;
  selectAll.checked = items.length > 0 && selectedVisibleCount === items.length;
  selectAll.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < items.length;
}

async function openCreateModal() {
  editingId = null;
  const form = document.getElementById('itemForm');
  form.reset();
  form.initial_stock.disabled = false;
  form.is_active.checked = true;
  document.getElementById('modalTitle').textContent = 'Tambah Barang';
  document.getElementById('itemCode').value = await getNextItemCode();
  clearAlert(document.getElementById('modalAlert'));
  bootstrap.Modal.getOrCreateInstance(document.getElementById('itemModal')).show();
}

function handleRowAction(event) {
  const button = event.currentTarget;
  const item = items.find((row) => row.id === button.dataset.id);
  if (!item) return;
  if (button.dataset.action === 'view') openViewModal(item.id);
  if (button.dataset.action === 'edit') openEditModal(item);
  if (button.dataset.action === 'delete') removeItem(item);
}

async function openViewModal(id) {
  const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('viewItemModal'));
  document.getElementById('viewItemCode').textContent = 'Memuat...';
  document.getElementById('viewItemName').textContent = 'Detail Barang';
  document.getElementById('viewItemBody').innerHTML = '<div class="empty-state">Memuat detail barang...</div>';
  modal.show();

  try {
    const [item, transactions] = await Promise.all([getItem(id), listItemTransactions(id, 5)]);
    const transactionCount = await countItemTransactions(id);
    document.getElementById('viewItemCode').textContent = item.item_code;
    document.getElementById('viewItemName').textContent = item.item_name;
    document.getElementById('viewItemBody').innerHTML = renderItemDetail(item, transactions, transactionCount);
  } catch (error) {
    document.getElementById('viewItemBody').innerHTML = `<div class="alert alert-danger">${escapeHtml(error.message)}</div>`;
  }
}

function renderItemDetail(item, transactions, transactionCount) {
  return `
    <div class="item-detail-grid mb-3">
      ${detailMetric('Stok Saat Ini', stockBadge(item))}
      ${detailMetric('Stok Awal', formatNumber(item.initial_stock))}
      ${detailMetric('Stok Minimum', formatNumber(item.minimum_stock))}
      ${detailMetric('Total Transaksi', formatNumber(transactionCount))}
    </div>
    <div class="item-detail-section mb-3">
      <h3>Keterangan</h3>
      <p>${escapeHtml(item.description || 'Tidak ada keterangan.')}</p>
    </div>
    <div class="item-detail-section mb-3">
      <h3>Informasi Barang</h3>
      <div class="detail-list"><span>Status</span><strong>${item.is_active ? 'Aktif' : 'Nonaktif'}</strong><span>Dibuat</span><strong>${formatDate(item.created_at)}</strong></div>
    </div>
    <div class="item-detail-section">
      <h3>Transaksi Terakhir</h3>
      <div class="table-responsive"><table class="table table-sm align-middle mb-0"><thead><tr><th>Tanggal</th><th>Jenis</th><th class="text-end">Jumlah</th><th>PIC</th><th>Keterangan</th></tr></thead><tbody>${renderRecentTransactions(transactions)}</tbody></table></div>
    </div>`;
}

function detailMetric(label, value) {
  return `<div class="detail-metric"><span>${label}</span><strong>${value}</strong></div>`;
}

function renderRecentTransactions(transactions) {
  return transactions.length ? transactions.map((row) => `<tr><td>${formatDate(row.transaction_date)}</td><td><span class="badge ${row.transaction_type === 'IN' ? 'badge-in' : 'badge-out'}">${row.transaction_type === 'IN' ? 'Masuk' : 'Keluar'}</span></td><td class="text-end">${formatNumber(row.quantity)}</td><td>${escapeHtml(row.pic || '-')}</td><td>${escapeHtml(row.description || '-')}</td></tr>`).join('') : '<tr><td colspan="5" class="empty-state">Belum ada transaksi.</td></tr>';
}

function openEditModal(item) {
  editingId = item.id;
  const form = document.getElementById('itemForm');
  form.item_name.value = item.item_name;
  form.description.value = item.description || '';
  form.initial_stock.value = item.initial_stock;
  form.initial_stock.disabled = true;
  form.minimum_stock.value = item.minimum_stock || 10;
  form.is_active.checked = item.is_active;
  document.getElementById('itemCode').value = item.item_code;
  document.getElementById('modalTitle').textContent = 'Ubah Barang';
  clearAlert(document.getElementById('modalAlert'));
  bootstrap.Modal.getOrCreateInstance(document.getElementById('itemModal')).show();
}

async function saveItem(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form).entries());
  payload.is_active = form.is_active.checked;
  try {
    if (editingId) await updateItem(editingId, payload);
    else await createItem(payload);
    bootstrap.Modal.getInstance(document.getElementById('itemModal')).hide();
    await loadItems(document.getElementById('searchInput').value);
  } catch (error) {
    showAlert(document.getElementById('modalAlert'), error.message);
  }
}

async function removeItem(item) {
  const transactionCount = await countItemTransactions(item.id);
  const message = transactionCount > 0
    ? `${item.item_name} sudah memiliki transaksi. Barang akan dinonaktifkan agar riwayat tetap aman. Lanjutkan?`
    : `Hapus ${item.item_name}?`;
  if (!confirm(message)) return;

  try {
    if (transactionCount > 0) await deactivateItem(item.id);
    else await deleteItem(item.id);
    selectedItemIds.delete(item.id);
    await loadItems(document.getElementById('searchInput').value);
    showAlert(
      document.getElementById('alertBox'),
      transactionCount > 0 ? `${item.item_code} - ${item.item_name} berhasil dinonaktifkan.` : `${item.item_code} - ${item.item_name} berhasil dihapus.`,
      'success'
    );
  } catch (error) {
    showAlert(document.getElementById('alertBox'), error.message);
  }
}

async function removeSelectedItems() {
  const selectedItems = items.filter((item) => selectedItemIds.has(item.id));
  if (!selectedItems.length) return;
  if (!confirm(`Proses ${selectedItems.length} barang terpilih? Barang tanpa transaksi akan dihapus, barang yang sudah memiliki transaksi akan dinonaktifkan.`)) return;

  const button = document.getElementById('bulkHapusButton');
  button.disabled = true;
  button.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Memproses...';
  clearAlert(document.getElementById('alertBox'));

  const failed = [];
  let deleted = 0;
  let deactivated = 0;

  for (const item of selectedItems) {
    try {
      const transactionCount = await countItemTransactions(item.id);
      if (transactionCount > 0) {
        await deactivateItem(item.id);
        deactivated += 1;
      } else {
        await deleteItem(item.id);
        deleted += 1;
      }
      selectedItemIds.delete(item.id);
    } catch (error) {
      failed.push(`${item.item_code} - ${item.item_name}: ${error.message}`);
    }
  }

  button.innerHTML = '<i class="bi bi-trash3"></i>Hapus / Nonaktifkan <span class="badge text-bg-danger" id="selectedCount">0</span>';
  await loadItems(document.getElementById('searchInput').value);

  const message = `${deleted} barang berhasil dihapus. ${deactivated} barang berhasil dinonaktifkan.`;
  if (failed.length) {
    showAlert(document.getElementById('alertBox'), `${message} ${failed.length} barang gagal: ${failed.join('; ')}`, deleted || deactivated ? 'warning' : 'danger');
  } else {
    showAlert(document.getElementById('alertBox'), message, 'success');
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}






