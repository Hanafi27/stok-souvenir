const APP_NAME = 'IR Souvenir Stock Management System';
const SHEET_NAMES = {
  ITEMS: 'Items',
  TRANSACTIONS: 'Transactions',
  USERS: 'Users',
  SETTINGS: 'Settings',
};

const HEADERS = {
  Items: ['ID', 'Item Code', 'Item Name', 'Description', 'Initial Stock', 'Current Stock', 'Minimum Stock', 'Created At', 'Updated At', 'Is Active'],
  Transactions: ['ID', 'Date', 'Item ID', 'Transaction Type', 'Quantity', 'PIC', 'Description', 'Created At', 'Created By'],
  Users: ['ID', 'Name', 'Email', 'Role', 'Is Active', 'Created At'],
  Settings: ['Key', 'Value'],
};

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle(APP_NAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function setupSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HEADERS).forEach((name) => ensureSheet_(ss, name, HEADERS[name]));
  const settings = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  if (settings.getLastRow() < 2) {
    settings.appendRow(['LOW_STOCK_DEFAULT', 10]);
  }
  return { ok: true, message: 'Google Sheets database is ready.' };
}

function getSessionUser() {
  const email = Session.getActiveUser().getEmail() || '';
  const users = readSheetObjects_(SHEET_NAMES.USERS);
  const user = users.find((row) => String(row.Email).toLowerCase() === email.toLowerCase());
  return {
    email,
    name: user ? user.Name : email,
    role: user ? user.Role : 'Admin',
    isRegistered: Boolean(user),
  };
}

function getInitialData() {
  setupSpreadsheet();
  return {
    user: getSessionUser(),
    dashboard: getDashboardData(),
    items: getItems(),
  };
}

function getItems(query) {
  setupSpreadsheet();
  const search = String(query || '').toLowerCase();
  return readSheetObjects_(SHEET_NAMES.ITEMS)
    .filter((item) => String(item['Is Active']).toLowerCase() !== 'false')
    .filter((item) => !search || [item['Item Code'], item['Item Name'], item.Description].join(' ').toLowerCase().includes(search))
    .map(normalizeItem_)
    .sort((a, b) => a.itemCode.localeCompare(b.itemCode));
}

function createItem(payload) {
  setupSpreadsheet();
  const sheet = getSheet_(SHEET_NAMES.ITEMS);
  const now = new Date();
  const initialStock = Number(payload.initialStock || 0);
  const row = [
    Utilities.getUuid(),
    generateItemCode_(),
    String(payload.itemName || '').trim(),
    String(payload.description || '').trim(),
    initialStock,
    initialStock,
    Number(payload.minimumStock || getDefaultMinimumStock_()),
    now,
    now,
    true,
  ];
  if (!row[2]) throw new Error('Nama barang wajib diisi.');
  sheet.appendRow(row);
  return { ok: true, item: normalizeItem_(objectFromRow_(HEADERS.Items, row)) };
}

function updateItem(id, payload) {
  setupSpreadsheet();
  const sheet = getSheet_(SHEET_NAMES.ITEMS);
  const found = findRowById_(sheet, id);
  if (!found) throw new Error('Barang tidak ditemukan.');
  const values = found.values;
  values[2] = String(payload.itemName || '').trim();
  values[3] = String(payload.description || '').trim();
  values[6] = Number(payload.minimumStock || getDefaultMinimumStock_());
  values[8] = new Date();
  values[9] = payload.isActive !== false;
  if (!values[2]) throw new Error('Nama barang wajib diisi.');
  sheet.getRange(found.rowIndex, 1, 1, values.length).setValues([values]);
  return { ok: true, item: normalizeItem_(objectFromRow_(HEADERS.Items, values)) };
}

function deleteItem(id) {
  setupSpreadsheet();
  const transactions = readSheetObjects_(SHEET_NAMES.TRANSACTIONS);
  if (transactions.some((row) => row['Item ID'] === id)) {
    throw new Error('Barang tidak dapat dihapus karena sudah memiliki transaksi.');
  }
  const sheet = getSheet_(SHEET_NAMES.ITEMS);
  const found = findRowById_(sheet, id);
  if (!found) throw new Error('Barang tidak ditemukan.');
  sheet.deleteRow(found.rowIndex);
  return { ok: true };
}

function deleteItems(ids) {
  setupSpreadsheet();
  const result = { deleted: 0, failed: [] };
  (ids || []).forEach((id) => {
    try {
      deleteItem(id);
      result.deleted += 1;
    } catch (error) {
      result.failed.push({ id, message: error.message });
    }
  });
  return result;
}

function createTransaction(payload) {
  setupSpreadsheet();
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const type = String(payload.transactionType || '').toUpperCase();
    if (!['IN', 'OUT'].includes(type)) throw new Error('Transaction Type tidak valid.');
    const qty = Number(payload.quantity || 0);
    if (qty <= 0) throw new Error('Quantity harus lebih dari 0.');

    const itemsSheet = getSheet_(SHEET_NAMES.ITEMS);
    const found = findRowById_(itemsSheet, payload.itemId);
    if (!found) throw new Error('Barang tidak ditemukan.');

    const currentStock = Number(found.values[5] || 0);
    const nextStock = type === 'IN' ? currentStock + qty : currentStock - qty;
    if (nextStock < 0) throw new Error('Stok tidak mencukupi.');

    found.values[5] = nextStock;
    found.values[8] = new Date();
    itemsSheet.getRange(found.rowIndex, 1, 1, found.values.length).setValues([found.values]);

    const now = new Date();
    getSheet_(SHEET_NAMES.TRANSACTIONS).appendRow([
      Utilities.getUuid(),
      payload.date ? new Date(payload.date) : new Date(),
      payload.itemId,
      type,
      qty,
      String(payload.pic || '').trim(),
      String(payload.description || '').trim(),
      now,
      Session.getActiveUser().getEmail() || '',
    ]);

    return { ok: true, currentStock: nextStock };
  } finally {
    lock.releaseLock();
  }
}

function getTransactions(filters) {
  setupSpreadsheet();
  const f = filters || {};
  const itemMap = mapItemsById_();
  const rows = readSheetObjects_(SHEET_NAMES.TRANSACTIONS).map((row) => normalizeTransaction_(row, itemMap));
  return rows.filter((row) => matchesTransactionFilter_(row, f)).sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getDashboardData() {
  setupSpreadsheet();
  const items = getItems();
  const tx = getTransactions({ month: formatMonth_(new Date()) });
  const incomingMonth = tx.filter((row) => row.type === 'IN').reduce((sum, row) => sum + Number(row.quantity), 0);
  const outgoingMonth = tx.filter((row) => row.type === 'OUT').reduce((sum, row) => sum + Number(row.quantity), 0);
  return {
    totalItems: items.length,
    currentStock: items.reduce((sum, item) => sum + Number(item.currentStock), 0),
    incomingMonth,
    outgoingMonth,
    lowStockItems: items.filter((item) => Number(item.currentStock) <= Number(item.minimumStock)),
    monthTransactions: tx,
  };
}

function getReport(period, value) {
  setupSpreadsheet();
  const filters = {};
  if (period === 'daily') filters.date = value;
  if (period === 'monthly') filters.month = value;
  if (period === 'yearly') filters.year = value;
  const rows = getTransactions(filters).sort((a, b) => new Date(a.date) - new Date(b.date));
  return {
    rows,
    totalTransactions: rows.length,
    totalIncoming: rows.filter((row) => row.type === 'IN').reduce((sum, row) => sum + Number(row.quantity), 0),
    totalOutgoing: rows.filter((row) => row.type === 'OUT').reduce((sum, row) => sum + Number(row.quantity), 0),
  };
}

function seedSheet2Data(items) {
  setupSpreadsheet();
  const existing = getItems();
  if (existing.length) throw new Error('Sheet Items sudah berisi data. Kosongkan dahulu jika ingin seed ulang.');
  const sheet = getSheet_(SHEET_NAMES.ITEMS);
  const now = new Date();
  (items || []).forEach((item) => {
    sheet.appendRow([
      Utilities.getUuid(),
      item.itemCode,
      item.itemName,
      item.description || '',
      Number(item.initialStock || 0),
      Number(item.currentStock || 0),
      Number(item.minimumStock || 10),
      now,
      now,
      true,
    ]);
  });
  return { ok: true, inserted: (items || []).length };
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const isEmpty = firstRow.every((value) => value === '');
  if (isEmpty) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getSheet_(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function readSheetObjects_(name) {
  const sheet = getSheet_(name);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  return values.map((row) => objectFromRow_(HEADERS[name], row));
}

function objectFromRow_(headers, row) {
  return headers.reduce((obj, header, index) => {
    obj[header] = row[index];
    return obj;
  }, {});
}

function findRowById_(sheet, id) {
  if (sheet.getLastRow() < 2) return null;
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const index = values.findIndex((row) => row[0] === id);
  return index === -1 ? null : { rowIndex: index + 2, values: values[index] };
}

function normalizeItem_(item) {
  return {
    id: item.ID,
    itemCode: item['Item Code'],
    itemName: item['Item Name'],
    description: item.Description || '',
    initialStock: Number(item['Initial Stock'] || 0),
    currentStock: Number(item['Current Stock'] || 0),
    minimumStock: Number(item['Minimum Stock'] || getDefaultMinimumStock_()),
    createdAt: toIso_(item['Created At']),
    updatedAt: toIso_(item['Updated At']),
    isActive: String(item['Is Active']).toLowerCase() !== 'false',
  };
}

function normalizeTransaction_(row, itemMap) {
  const item = itemMap[row['Item ID']] || {};
  return {
    id: row.ID,
    date: toIsoDate_(row.Date),
    itemId: row['Item ID'],
    itemCode: item.itemCode || '',
    itemName: item.itemName || '',
    type: row['Transaction Type'],
    quantity: Number(row.Quantity || 0),
    pic: row.PIC || '',
    description: row.Description || '',
    createdAt: toIso_(row['Created At']),
    createdBy: row['Created By'] || '',
  };
}

function mapItemsById_() {
  return getItems('').reduce((map, item) => {
    map[item.id] = item;
    return map;
  }, {});
}

function matchesTransactionFilter_(row, filters) {
  const search = String(filters.search || '').toLowerCase();
  if (filters.date && row.date !== filters.date) return false;
  if (filters.month && !row.date.startsWith(filters.month)) return false;
  if (filters.year && !row.date.startsWith(String(filters.year))) return false;
  if (filters.itemId && row.itemId !== filters.itemId) return false;
  if (filters.transactionType && row.type !== filters.transactionType) return false;
  if (search && ![row.itemCode, row.itemName, row.pic, row.description].join(' ').toLowerCase().includes(search)) return false;
  return true;
}

function generateItemCode_() {
  const codes = getItems('').map((item) => Number(String(item.itemCode).replace(/\D/g, '')) || 0);
  const next = Math.max(0, ...codes) + 1;
  return 'BRG' + String(next).padStart(4, '0');
}

function getDefaultMinimumStock_() {
  const settings = readSheetObjects_(SHEET_NAMES.SETTINGS);
  const row = settings.find((item) => item.Key === 'LOW_STOCK_DEFAULT');
  return Number(row && row.Value ? row.Value : 10);
}

function formatMonth_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM');
}

function toIsoDate_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(value).slice(0, 10);
}

function toIso_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
  }
  return String(value);
}
