// =========================
// CONFIG
// =========================
const API_BASE = window.location.origin;
const EDIT_WINDOW_MINUTES = 600; // 10 soat

// =========================
// TELEGRAM MINI APP
// =========================
if (window.Telegram && window.Telegram.WebApp) {
  Telegram.WebApp.ready();
  Telegram.WebApp.expand();
  Telegram.WebApp.setHeaderColor('#0a0e1a');
  Telegram.WebApp.setBackgroundColor('#0a0e1a');
}

// =========================
// STATE
// =========================
let currentUser = null;
let currentDetailItem = null;
let editMode = null; // "admin" | "own"

// =========================
// DOM ELEMENTS
// =========================
const loginContainer = document.getElementById('login-container');
const adminPanel = document.getElementById('admin-panel');
const workerPanel = document.getElementById('worker-panel');
const loadingOverlay = document.getElementById('loading-overlay');

// Modals
const allJobsModal = document.getElementById('allJobsModal');
const detailModal = document.getElementById('detailModal');
const editFormModal = document.getElementById('editFormModal');

// =========================
// TOAST NOTIFICATIONS
// =========================
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close">&times;</button>
  `;

  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.style.animation = 'toastSlideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  });

  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = 'toastSlideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  }
}

// =========================
// LOADING
// =========================
function showLoading(text = 'Yuklanmoqda...') {
  loadingOverlay.querySelector('p').textContent = text;
  loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
  loadingOverlay.classList.add('hidden');
}

// =========================
// API HELPERS
// =========================
async function apiPost(url, body) {
  showLoading();
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Xatolik');
    return data;
  } catch (err) {
    showToast(err.message, 'error');
    throw err;
  } finally {
    hideLoading();
  }
}

async function apiGet(url) {
  showLoading();
  try {
    const res = await fetch(`${API_BASE}${url}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Xatolik');
    return data;
  } catch (err) {
    showToast(err.message, 'error');
    throw err;
  } finally {
    hideLoading();
  }
}

async function apiPut(url, body) {
  showLoading();
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Xatolik');
    return data;
  } catch (err) {
    showToast(err.message, 'error');
    throw err;
  } finally {
    hideLoading();
  }
}

async function apiDelete(url) {
  showLoading();
  try {
    const res = await fetch(`${API_BASE}${url}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Xatolik');
    return data;
  } catch (err) {
    showToast(err.message, 'error');
    throw err;
  } finally {
    hideLoading();
  }
}

// =========================
// INIT
// =========================
window.addEventListener('DOMContentLoaded', () => {
  loginContainer.style.display = 'flex';
  adminPanel.style.display = 'none';
  workerPanel.style.display = 'none';

  // Set today's date as default
  document.getElementById('workDate').value = new Date().toISOString().split('T')[0];
});

// =========================
// LOGIN
// =========================
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const login = document.getElementById('login').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!login || !password) {
    showToast('Login va parolni kiriting', 'warning');
    return;
  }

  try {
    const result = await apiPost('/api/login', { login, password });

    if (!result.success) {
      showToast(result.message || 'Login yoki parol notogri', 'error');
      return;
    }

    currentUser = result.user;
    loginContainer.style.display = 'none';

    if (currentUser.role === 'admin') {
      adminPanel.style.display = 'block';
      loadTodayJobs();
      updateDashboard();
    } else {
      workerPanel.style.display = 'block';
      loadMyJobs();
      loadMySummary();
    }

    showToast(`Xush kelibsiz, ${currentUser.login}!`, 'success');
  } catch (err) {
    console.error(err);
  }
});

// =========================
// LOGOUT
// =========================
function logout() {
  currentUser = null;
  adminPanel.style.display = 'none';
  workerPanel.style.display = 'none';
  loginContainer.style.display = 'flex';
  document.getElementById('login-form').reset();
  showToast('Tizimdan chiqildi', 'info');
}

document.getElementById('logoutAdmin').addEventListener('click', logout);
document.getElementById('logoutWorker').addEventListener('click', logout);

// =========================
// WORKER FORM - TYPE SELECT
// =========================
document.getElementById('work-select').addEventListener('change', function() {
  const pressFields = document.getElementById('press-fields');
  const jatkaFields = document.getElementById('jatka-fields');

  pressFields.classList.remove('active');
  jatkaFields.classList.remove('active');

  if (this.value === 'press') {
    pressFields.classList.add('active');
  } else if (this.value === 'jatka') {
    jatkaFields.classList.add('active');
  }
});

// Payment change handlers
document.getElementById('pressPayment').addEventListener('change', function() {
  const group = document.getElementById('pressPriceGroup');
  const input = document.getElementById('pressPrice');
  group.style.display = this.value === 'Ha' ? 'block' : 'none';
  if (this.value !== 'Ha') input.value = '';
});

document.getElementById('jatkaPayment').addEventListener('change', function() {
  const group = document.getElementById('jatkaPriceGroup');
  const input = document.getElementById('jatkaPrice');
  group.style.display = this.value === 'Ha' ? 'block' : 'none';
  if (this.value !== 'Ha') input.value = '';
});

// =========================
// WORKER FORM - SUBMIT
// =========================
document.getElementById('worker-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const type = document.getElementById('work-select').value;
  if (!type) {
    showToast('Ish turini tanlang', 'warning');
    return;
  }

  const comment = document.getElementById('workComment').value.trim();
  if (!comment) {
    showToast('Izoh yozish majburiy', 'warning');
    return;
  }

  let data = {};

  if (type === 'press') {
    const pressCount = document.getElementById('pressCount').value.trim();
    const owner = document.getElementById('pressOwner').value.trim();
    const payment = document.getElementById('pressPayment').value;

    if (!pressCount || !owner || !payment) {
      showToast('Barcha maydonlarni toldiring', 'warning');
      return;
    }

    data = {
      type: 'Press',
      owner,
      pressCount: parseInt(pressCount) || 0,
      landArea: null,
      payment,
      price: payment === 'Ha' ? (parseFloat(document.getElementById('pressPrice').value) || 0) : null,
      clientPhone: document.getElementById('pressPhone').value.trim() || null,
    };
  } else if (type === 'jatka') {
    const landArea = document.getElementById('landArea').value.trim();
    const owner = document.getElementById('jatkaOwner').value.trim();
    const payment = document.getElementById('jatkaPayment').value;

    if (!landArea || !owner || !payment) {
      showToast('Barcha maydonlarni toldiring', 'warning');
      return;
    }

    data = {
      type: 'Jatka',
      owner,
      pressCount: null,
      landArea: parseFloat(landArea) || 0,
      payment,
      price: payment === 'Ha' ? (parseFloat(document.getElementById('jatkaPrice').value) || 0) : null,
      clientPhone: document.getElementById('jatkaPhone').value.trim() || null,
    };
  }

  data.date = document.getElementById('workDate').value || new Date().toISOString().split('T')[0];
  data.worker = currentUser.login;
  data.comment = comment;

  try {
    await apiPost('/api/workers', data);
    showToast('Malumot muvaffaqiyatli yuborildi', 'success');

    // Reset form
    document.getElementById('worker-form').reset();
    document.getElementById('press-fields').classList.remove('active');
    document.getElementById('jatka-fields').classList.remove('active');
    document.getElementById('pressPriceGroup').style.display = 'none';
    document.getElementById('jatkaPriceGroup').style.display = 'none';
    document.getElementById('workDate').value = new Date().toISOString().split('T')[0];

    loadMyJobs();
    loadMySummary();
  } catch (err) {
    console.error(err);
  }
});

// =========================
// FORMAT HELPERS
// =========================
function formatAmount(item) {
  if (item.type === 'Press') {
    return `${item.press_count ?? '-'} press`;
  }
  return `${item.land_area != null ? Number(item.land_area).toFixed(2) : '-'} yer`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('uz-UZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatCurrency(value) {
  if (value == null || value === '') return '-';
  return new Intl.NumberFormat('uz-UZ').format(value) + " so'm"
}

// =========================
// RENDER JOB CARD
// =========================
function createJobCard(item, mode) {
  const card = document.createElement('div');
  card.className = 'job-card';

  const typeClass = item.type === 'Press' ? 'press' : 'jatka';
  const typeIcon = item.type === 'Press' ? '⚙️' : '🚜';

  card.innerHTML = `
    <div class="job-main">
      <span class="job-type-badge ${typeClass}">${typeIcon} ${item.type}</span>
      <span class="job-worker">${item.worker}</span>
      <span class="job-amount">${formatAmount(item)}</span>
      <span class="job-date">${formatDate(item.date)}</span>
    </div>
  `;

  card.addEventListener('click', () => openDetailModal(item, mode));
  return card;
}

// =========================
// ADMIN - TODAY'S JOBS
// =========================
async function loadTodayJobs() {
  try {
    const data = await apiGet('/api/workers/today');
    const container = document.getElementById('todayList');
    container.innerHTML = '';

    data.forEach(item => {
      container.appendChild(createJobCard(item, 'admin'));
    });

    document.getElementById('todayCount').textContent = `${data.length} ta`;
  } catch (err) {
    console.error(err);
  }
}

// =========================
// ADMIN - DASHBOARD
// =========================
async function updateDashboard() {
  try {
    const data = await apiGet('/api/workers');

    document.getElementById('totalJobs').textContent = data.length;

    const totalPress = data.reduce((sum, item) => sum + (Number(item.press_count) || 0), 0);
    document.getElementById('pressJobs').textContent = totalPress;

    const totalLand = data.reduce((sum, item) => sum + (Number(item.land_area) || 0), 0);
    document.getElementById('jatkaJobs').textContent = totalLand.toFixed(2);

    document.getElementById('paidJobs').textContent = data.filter(x => x.payment === 'Ha').length;
    document.getElementById('unpaidJobs').textContent = data.filter(x => x.payment === "Yo'q").length;
  } catch (err) {
    console.error(err);
  }
}

// =========================
// ADMIN - SEARCH
// =========================
let searchTimeout;
document.getElementById('search').addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  const text = e.target.value.trim();

  searchTimeout = setTimeout(async () => {
    if (!text) {
      loadTodayJobs();
      return;
    }

    try {
      const data = await apiGet(`/api/search?q=${encodeURIComponent(text)}`);
      const container = document.getElementById('todayList');
      container.innerHTML = '';
      data.forEach(item => container.appendChild(createJobCard(item, 'admin')));
      document.getElementById('todayCount').textContent = `${data.length} ta`;
    } catch (err) {
      console.error(err);
    }
  }, 300);
});

// =========================
// ADMIN - ALL JOBS MODAL
// =========================
document.getElementById('openAllJobs').addEventListener('click', async () => {
  await populateWorkerFilter();
  document.getElementById('filterType').value = '';
  document.getElementById('filterPayment').value = '';
  document.getElementById('filterDate').value = '';
  await runFilterSearch();
  openModal(allJobsModal);
});

document.getElementById('closeAllJobs').addEventListener('click', () => closeModal(allJobsModal));

async function populateWorkerFilter() {
  try {
    const names = await apiGet('/api/workers/worker-names');
    const select = document.getElementById('filterWorker');
    select.innerHTML = '<option value="">Barchasi</option>';
    names.forEach(name => {
      select.innerHTML += `<option value="${name}">${name}</option>`;
    });
  } catch (err) {
    console.error(err);
  }
}

async function runFilterSearch() {
  const params = new URLSearchParams();
  const worker = document.getElementById('filterWorker').value;
  const type = document.getElementById('filterType').value;
  const payment = document.getElementById('filterPayment').value;
  const date = document.getElementById('filterDate').value;

  if (worker) params.append('worker', worker);
  if (type) params.append('type', type);
  if (payment) params.append('payment', payment);
  if (date) params.append('date', date);

  try {
    const data = await apiGet(`/api/workers/filter?${params.toString()}`);
    const container = document.getElementById('allJobsList');
    container.innerHTML = '';
    data.forEach(item => container.appendChild(createJobCard(item, 'admin')));
  } catch (err) {
    console.error(err);
  }
}

document.getElementById('filterSearchBtn').addEventListener('click', runFilterSearch);

// Excel download
document.getElementById('allJobsExcelBtn').addEventListener('click', downloadExcel);
document.getElementById('downloadExcel').addEventListener('click', downloadExcel);

function downloadExcel() {
  const excelUrl = `${API_BASE}/api/excel`;
  if (window.Telegram && window.Telegram.WebApp) {
    Telegram.WebApp.openLink(excelUrl);
  } else {
    window.open(excelUrl, '_blank');
  }
}

// =========================
// DETAIL MODAL
// =========================
function openDetailModal(item, mode) {
  currentDetailItem = item;
  editMode = mode;

  const amountLabel = item.type === 'Press' ? 'Press soni' : 'Yer maydoni';
  const amountValue = item.type === 'Press' 
    ? (item.press_count ?? '-') 
    : (item.land_area != null ? Number(item.land_area).toFixed(2) : '-');

  const view = document.getElementById('detailView');
  view.innerHTML = `
    <div class="detail-item"><label>Sana</label><span>${formatDate(item.date)}</span></div>
    <div class="detail-item"><label>Ishchi</label><span>${item.worker}</span></div>
    <div class="detail-item"><label>Ish turi</label><span>${item.type}</span></div>
    <div class="detail-item"><label>Yer egasi</label><span>${item.owner}</span></div>
    <div class="detail-item"><label>Telefon</label><span>${item.client_phone ?? '-'}</span></div>
    <div class="detail-item"><label>${amountLabel}</label><span>${amountValue}</span></div>
    <div class="detail-item"><label>Tolov</label><span>${item.payment}</span></div>
    <div class="detail-item"><label>Narxi</label><span>${formatCurrency(item.price)}</span></div>
    <div class="detail-item"><label>Izoh</label><span>${item.comment ?? '-'}</span></div>
  `;

  // Show/hide edit button based on mode
  const editBtn = document.getElementById('detailEditBtn');
  if (mode === 'admin') {
    editBtn.style.display = 'inline-flex';
  } else {
    // For worker, check if editable
    const diffMin = (Date.now() - new Date(item.created_at).getTime()) / 60000;
    editBtn.style.display = diffMin <= EDIT_WINDOW_MINUTES ? 'inline-flex' : 'none';
  }

  openModal(detailModal);
}

document.getElementById('closeDetail').addEventListener('click', () => closeModal(detailModal));
document.getElementById('closeDetailBtn').addEventListener('click', () => closeModal(detailModal));

document.getElementById('detailEditBtn').addEventListener('click', () => {
  closeModal(detailModal);
  openEditModal(currentDetailItem, editMode);
});

// =========================
// EDIT MODAL
// =========================
function openEditModal(item, mode) {
  editMode = mode;

  document.getElementById('editId').value = item.id;
  document.getElementById('editType').value = item.type;
  document.getElementById('editDate').value = new Date(item.date).toISOString().split('T')[0];
  document.getElementById('editTypeLabel').textContent = item.type;
  document.getElementById('editOwner').value = item.owner;
  document.getElementById('editPhone').value = item.client_phone ?? '';
  document.getElementById('editPayment').value = item.payment;
  document.getElementById('editPrice').value = item.price ?? '';
  document.getElementById('editComment').value = item.comment ?? '';

  const pressGroup = document.getElementById('editPressGroup');
  const jatkaGroup = document.getElementById('editJatkaGroup');

  if (item.type === 'Press') {
    pressGroup.style.display = 'block';
    jatkaGroup.style.display = 'none';
    document.getElementById('editPress').value = item.press_count ?? '';
  } else {
    pressGroup.style.display = 'none';
    jatkaGroup.style.display = 'block';
    document.getElementById('editLand').value = item.land_area ?? '';
  }

  openModal(editFormModal);
}

document.getElementById('closeEdit').addEventListener('click', () => closeModal(editFormModal));
document.getElementById('cancelEdit').addEventListener('click', () => closeModal(editFormModal));

document.getElementById('saveEdit').addEventListener('click', async () => {
  const comment = document.getElementById('editComment').value.trim();
  if (!comment) {
    showToast('Izoh yozish majburiy', 'warning');
    return;
  }

  const isOwn = editMode === 'own';
  const id = document.getElementById('editId').value;
  const url = isOwn ? `/api/workers/own/${id}` : `/api/workers/${id}`;

  const body = {
    owner: document.getElementById('editOwner').value,
    clientPhone: document.getElementById('editPhone').value || null,
    comment,
    pressCount: document.getElementById('editType').value === 'Press' ? (document.getElementById('editPress').value || null) : null,
    landArea: document.getElementById('editType').value === 'Jatka' ? (document.getElementById('editLand').value || null) : null,
    payment: document.getElementById('editPayment').value,
    price: document.getElementById('editPayment').value === 'Ha' ? (document.getElementById('editPrice').value || null) : null,
    date: document.getElementById('editDate').value,
  };

  if (isOwn) body.login = currentUser.login;

  try {
    await apiPut(url, body);
    showToast('Malumot yangilandi', 'success');
    closeModal(editFormModal);

    if (isOwn) {
      loadMyJobs();
      loadMySummary();
    } else {
      loadTodayJobs();
      updateDashboard();
      if (allJobsModal.classList.contains('active')) runFilterSearch();
    }
  } catch (err) {
    console.error(err);
  }
});

// =========================
// WORKER - MY JOBS
// =========================
async function loadMyJobs() {
  try {
    const data = await apiGet(`/api/workers/mine?login=${encodeURIComponent(currentUser.login)}`);
    renderMyJobs(data);
  } catch (err) {
    console.error(err);
  }
}

function renderMyJobs(data) {
  const container = document.getElementById('myJobsList');
  container.innerHTML = '';

  data.forEach(item => {
    const diffMin = (Date.now() - new Date(item.created_at).getTime()) / 60000;
    const editable = diffMin <= EDIT_WINDOW_MINUTES;

    const card = document.createElement('div');
    card.className = 'job-card';

    const typeClass = item.type === 'Press' ? 'press' : 'jatka';
    const typeIcon = item.type === 'Press' ? '⚙️' : '🚜';

    card.innerHTML = `
      <div class="job-main">
        <span class="job-type-badge ${typeClass}">${typeIcon} ${item.type}</span>
        <span class="job-amount">${formatAmount(item)}</span>
        <span class="job-date">${formatDate(item.date)}</span>
      </div>
      <div class="job-actions">
        ${editable 
          ? `<button class="btn-edit" title="Tahrirlash">✏️</button>
             <button class="btn-delete" title="O'chirish">🗑️</button>`
          : `<span class="expired-label">Muddat tugagan</span>`
        }
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-delete')) return;
      if (!editable) return;
      openEditModal(item, 'own');
    });

    const deleteBtn = card.querySelector('.btn-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteMyWorker(item.id);
      });
    }

    container.appendChild(card);
  });
}

async function deleteMyWorker(id) {
  if (!confirm('Rostdan ham ochirilsinmi?')) return;

  try {
    await apiDelete(`/api/workers/own/${id}?login=${encodeURIComponent(currentUser.login)}`);
    showToast('Malumot ochirildi', 'success');
    loadMyJobs();
    loadMySummary();
  } catch (err) {
    console.error(err);
  }
}

// =========================
// WORKER - SUMMARY
// =========================
async function loadMySummary() {
  try {
    const data = await apiGet(`/api/workers/summary?login=${encodeURIComponent(currentUser.login)}`);
    document.getElementById('myTotalPress').textContent = data.totalPress;
    document.getElementById('myTotalLand').textContent = Number(data.totalLand).toFixed(2);
  } catch (err) {
    console.error(err);
  }
}

// =========================
// MODAL HELPERS
// =========================
function openModal(modal) {
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

// Close modal on backdrop click
[allJobsModal, detailModal, editFormModal].forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal(modal);
  });
});

// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    [allJobsModal, detailModal, editFormModal].forEach(closeModal);
  }
});
