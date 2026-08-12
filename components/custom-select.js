const enhanced = new WeakSet();
const observers = new WeakMap();

export function initCustomSelects(root = document) {
  root.querySelectorAll('select.form-select').forEach(enhanceSelect);
}

function enhanceSelect(select) {
  if (enhanced.has(select)) {
    syncCustomSelect(select);
    return;
  }

  enhanced.add(select);
  select.classList.add('native-select-hidden');

  const wrapper = document.createElement('div');
  wrapper.className = 'custom-select';
  wrapper.innerHTML = `
    <button class="custom-select-toggle" type="button" aria-haspopup="listbox" aria-expanded="false">
      <span class="custom-select-value"></span>
      <i class="bi bi-chevron-down"></i>
    </button>
    <div class="custom-select-menu" role="listbox"></div>
  `;

  select.insertAdjacentElement('afterend', wrapper);

  wrapper.querySelector('.custom-select-toggle').addEventListener('click', () => toggleSelect(select));
  wrapper.querySelector('.custom-select-menu').addEventListener('click', (event) => chooseOption(select, event));
  select.addEventListener('change', () => syncCustomSelect(select));

  const observer = new MutationObserver(() => syncCustomSelect(select));
  observer.observe(select, { childList: true, subtree: true, attributes: true });
  observers.set(select, observer);

  syncCustomSelect(select);
}

function syncCustomSelect(select) {
  const wrapper = select.nextElementSibling;
  if (!wrapper?.classList.contains('custom-select')) return;

  const selected = select.options[select.selectedIndex] || select.options[0];
  const value = wrapper.querySelector('.custom-select-value');
  const button = wrapper.querySelector('.custom-select-toggle');
  const menu = wrapper.querySelector('.custom-select-menu');

  value.textContent = selected?.textContent || 'Pilih data';
  button.disabled = select.disabled;
  button.classList.toggle('is-placeholder', !select.value);

  menu.innerHTML = [...select.options].map((option) => `
    <button class="custom-select-option ${option.selected ? 'is-selected' : ''}" type="button" role="option" data-value="${escapeAttribute(option.value)}" aria-selected="${option.selected}" ${option.disabled ? 'disabled' : ''}>
      ${escapeHtml(option.textContent || '')}
    </button>
  `).join('');
}

function toggleSelect(select) {
  const wrapper = select.nextElementSibling;
  const button = wrapper.querySelector('.custom-select-toggle');
  const isOpen = wrapper.classList.contains('is-open');

  closeAllCustomSelects();
  if (!isOpen) {
    wrapper.classList.add('is-open');
    button.setAttribute('aria-expanded', 'true');
  }
}

function chooseOption(select, event) {
  const optionButton = event.target.closest('.custom-select-option');
  if (!optionButton || optionButton.disabled) return;

  select.value = optionButton.dataset.value || '';
  select.dispatchEvent(new Event('change', { bubbles: true }));
  syncCustomSelect(select);
  closeAllCustomSelects();
}

function closeAllCustomSelects() {
  document.querySelectorAll('.custom-select.is-open').forEach((wrapper) => {
    wrapper.classList.remove('is-open');
    wrapper.querySelector('.custom-select-toggle')?.setAttribute('aria-expanded', 'false');
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/'/g, '&#39;');
}

document.addEventListener('click', (event) => {
  if (!event.target.closest('.custom-select')) closeAllCustomSelects();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeAllCustomSelects();
});
