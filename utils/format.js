export function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(parseDate(value));
}

function parseDate(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
}

export function formatNumber(value) {
  return new Intl.NumberFormat('id-ID').format(Number(value || 0));
}

export function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

export function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

export function setToday(input) {
  if (input && !input.value) input.value = toISODate(new Date());
}

export function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(csvValue).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvValue(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function showAlert(container, message, type = 'danger') {
  if (!container) return;
  const alertType = String(message).toLowerCase().includes('berhasil') && type !== 'warning' ? 'info' : type;
  const neutralStyle = alertType === 'info' || alertType === 'success'
    ? ' style="background:#eff6ff;border-color:#bfdbfe;color:#1e40af;"'
    : '';
  container.innerHTML = `<div class="alert alert-${alertType} app-alert-${alertType} mb-0" role="alert"${neutralStyle}>${message}</div>`;
}

export function clearAlert(container) {
  if (container) container.innerHTML = '';
}

