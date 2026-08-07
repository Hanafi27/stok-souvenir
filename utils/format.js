export function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value));
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
  return date.toISOString().slice(0, 10);
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
  container.innerHTML = `<div class="alert alert-${type} mb-0" role="alert">${message}</div>`;
}

export function clearAlert(container) {
  if (container) container.innerHTML = '';
}
