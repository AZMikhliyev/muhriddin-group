// =========================
// TELEGRAM MINI APP
// =========================
if (window.Telegram && window.Telegram.WebApp) {
  Telegram.WebApp.ready();
  Telegram.WebApp.expand();
}

// =========================
// ELEMENTLAR
// =========================
let currentUser = null;
let currentDetailItem = null; // detail oynasida turgan yozuv
let editMode = null; // "admin" | "own"

const loginContainer = document.querySelector(".login-container");
const adminPanel = document.querySelector(".admin");
const workerPanel = document.querySelector(".worker-panel");

const loginForm = document.getElementById("login-form");

const logoutAdmin = document.getElementById("logoutAdmin");
const logoutWorker = document.getElementById("logoutWorker");

const workSelect = document.getElementById("work-select");
const pressForm = document.querySelector(".press");
const jatkaForm = document.querySelector(".jatka");

// Detail modal
const detailModal = document.getElementById("detailModal");
const detailView = document.getElementById("detailView");
const detailEditBtn = document.getElementById("detailEditBtn");
const closeDetail = document.getElementById("closeDetail");

// Edit modal
const editFormModal = document.getElementById("editFormModal");
const editId = document.getElementById("editId");
const editType = document.getElementById("editType");
const editDate = document.getElementById("editDate");
const editTypeLabel = document.getElementById("editTypeLabel");
const editPressGroup = document.getElementById("editPressGroup");
const editJatkaGroup = document.getElementById("editJatkaGroup");
const editPress = document.getElementById("editPress");
const editLand = document.getElementById("editLand");
const editOwner = document.getElementById("editOwner");
const editPhone = document.getElementById("editPhone");
const editPayment = document.getElementById("editPayment");
const editPrice = document.getElementById("editPrice");
const editComment = document.getElementById("editComment");
const saveEdit = document.getElementById("saveEdit");
const closeEditBtn = document.getElementById("closeEdit");

// All jobs (Barchasi) modal
const allJobsModal = document.getElementById("allJobsModal");
const openAllJobsBtn = document.getElementById("openAllJobs");
const closeAllJobsBtn = document.getElementById("closeAllJobs");
const allJobsList = document.getElementById("allJobsList");
const filterWorker = document.getElementById("filterWorker");
const filterType = document.getElementById("filterType");
const filterPayment = document.getElementById("filterPayment");
const filterDate = document.getElementById("filterDate");
const filterSearchBtn = document.getElementById("filterSearchBtn");
const allJobsExcelBtn = document.getElementById("allJobsExcelBtn");

// =========================
// SAHIFA OCHILGANDA
// =========================

window.onload = () => {
  loginContainer.style.display = "flex";
  adminPanel.style.display = "none";
  workerPanel.style.display = "none";
};

// =========================
// LOGIN / LOGOUT
// =========================

loginForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const login = document.getElementById("login").value.trim();
  const password = document.getElementById("password").value.trim();

  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, password }),
  });

  const result = await response.json();

  if (!result.success) {
    alert("Login yoki parol noto'g'ri!");
    return;
  }

  currentUser = result.user;
  loginContainer.style.display = "none";

  if (currentUser.role === "admin") {
    adminPanel.style.display = "flex";
    adminPanel.style.flexDirection = "column";
    loadTodayJobs();
  } else {
    workerPanel.style.display = "flex";
    workerPanel.style.flexDirection = "column";
    loadMyJobs();
    loadMySummary();
  }
});

function logout() {
  adminPanel.style.display = "none";
  workerPanel.style.display = "none";
  loginContainer.style.display = "flex";
  loginForm.reset();
  pressForm.style.display = "none";
  jatkaForm.style.display = "none";
}

logoutAdmin.addEventListener("click", logout);
logoutWorker.addEventListener("click", logout);

// =========================
// APPARAT TANLASH (worker-form)
// =========================

workSelect.addEventListener("change", function () {
  if (this.value === "press") {
    pressForm.style.display = "flex";
    jatkaForm.style.display = "none";
  } else if (this.value === "jatka") {
    pressForm.style.display = "none";
    jatkaForm.style.display = "flex";
  } else {
    pressForm.style.display = "none";
    jatkaForm.style.display = "none";
  }
});

document
  .getElementById("pressPayment")
  .addEventListener("change", function () {
    pressPrice.style.display = this.value === "Ha" ? "block" : "none";
    if (this.value !== "Ha") pressPrice.value = "";
  });

document
  .getElementById("jatkaPayment")
  .addEventListener("change", function () {
    jatkaPrice.style.display = this.value === "Ha" ? "block" : "none";
    if (this.value !== "Ha") jatkaPrice.value = "";
  });

// =========================
// WORKER FORM — YANGI ISH YUBORISH
// =========================

const workerForm = document.getElementById("worker-form");

workerForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const type = workSelect.value;

  if (type === "") {
    alert("Ish turini tanlang!");
    return;
  }

  const comment = document.getElementById("workComment").value.trim();
  if (comment === "") {
    alert("Izoh yozish majburiy!");
    return;
  }

  let data = {};

  if (type === "press") {
    const pressCount = document.getElementById("pressCount").value.trim();
    const owner = document.getElementById("pressOwner").value.trim();
    const payment = document.getElementById("pressPayment").value;

    if (pressCount === "" || owner === "" || payment === "") {
      alert("Barcha maydonlarni to'ldiring!");
      return;
    }

    data = {
      type: "Press",
      owner,
      pressCount,
      landArea: null,
      payment,
      price: payment === "Ha" ? pressPrice.value : null,
      clientPhone: document.getElementById("pressPhone").value.trim(),
    };
  }

  if (type === "jatka") {
    const landArea = document.getElementById("landArea").value.trim();
    const owner = document.getElementById("jatkaOwner").value.trim();
    const payment = document.getElementById("jatkaPayment").value;

    if (landArea === "" || owner === "" || payment === "") {
      alert("Barcha maydonlarni to'ldiring!");
      return;
    }

    data = {
      type: "Jatka",
      owner,
      pressCount: null,
      landArea,
      payment,
      price: payment === "Ha" ? jatkaPrice.value : null,
      clientPhone: document.getElementById("jatkaPhone").value.trim(),
    };
  }

  data.date =
    document.getElementById("workDate").value ||
    new Date().toISOString().split("T")[0];
  data.worker = currentUser.login;
  data.comment = comment;

  try {
    const response = await fetch("/api/workers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (result.success) {
      alert("Ma'lumot muvaffaqiyatli yuborildi.");
      workerForm.reset();
      pressForm.style.display = "none";
      jatkaForm.style.display = "none";
      pressPrice.style.display = "none";
      jatkaPrice.style.display = "none";
      loadMyJobs();
      loadMySummary();
    } else {
      alert(result.message || "Xatolik yuz berdi");
    }
  } catch (error) {
    console.log(error);
    alert("Server bilan bog'lanib bo'lmadi.");
  }
});

// =========================
// YORDAMCHI: MIQDORNI CHIQARISH
// =========================

function formatAmount(item) {
  if (item.type === "Press") {
    return `${item.pressCount ?? "-"} press`;
  }
  return `${item.landArea != null ? Number(item.landArea).toFixed(2) : "-"} yer`;
}

// =========================
// ADMIN — BUGUNGI ISHLAR
// =========================

async function loadTodayJobs() {
  try {
    const res = await fetch("/api/workers/today");
    const data = await res.json();
    renderAdminCards("todayList", data);
  } catch (error) {
    console.log(error);
  }
}

function renderAdminCards(containerId, data) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  data.forEach((item) => {
    const row = document.createElement("div");
    row.className = "job-row";
    row.innerHTML = `
      <div class="job-main">
        <span>${new Date(item.date).toLocaleDateString("uz-UZ")}</span>
        <span>${item.type}</span>
        <span>${item.worker}</span>
      </div>
    `;
    row.addEventListener("click", () => openDetailModal(item, "admin"));
    container.appendChild(row);
  });

  updateDashboardFromAll();
}

// Dashboard kartalari uchun — barcha ma'lumotni alohida yuklaymiz
async function updateDashboardFromAll() {
  try {
    const res = await fetch("/api/workers");
    const data = await res.json();

    document.getElementById("totalJobs").innerText = data.length;

    const totalPress = data.reduce(
      (sum, item) => sum + (Number(item.pressCount) || 0),
      0,
    );
    document.getElementById("pressJobs").innerText = totalPress;

    const totalLand = data.reduce(
      (sum, item) => sum + (Number(item.landArea) || 0),
      0,
    );
    document.getElementById("jatkaJobs").innerText = totalLand.toFixed(2);

    document.getElementById("paidJobs").innerText = data.filter(
      (x) => x.payment === "Ha",
    ).length;

    document.getElementById("unpaidJobs").innerText = data.filter(
      (x) => x.payment === "Yo'q",
    ).length;
  } catch (error) {
    console.log(error);
  }
}

// Tez qidiruv (Bugungi ishlar ustidagi input)
const searchInput = document.getElementById("search");
searchInput.addEventListener("keyup", async () => {
  const text = searchInput.value;

  if (text === "") {
    loadTodayJobs();
    return;
  }

  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(text)}`);
    const result = await response.json();
    renderAdminCards("todayList", result);
  } catch (error) {
    console.log(error);
  }
});

// =========================
// ADMIN — BARCHASI (filtr) OYNASI
// =========================

async function populateWorkerFilter() {
  try {
    const res = await fetch("/api/workers/worker-names");
    const names = await res.json();
    filterWorker.innerHTML = '<option value="">Barchasi</option>';
    names.forEach((name) => {
      filterWorker.innerHTML += `<option value="${name}">${name}</option>`;
    });
  } catch (error) {
    console.log(error);
  }
}

openAllJobsBtn.addEventListener("click", async () => {
  await populateWorkerFilter();
  filterType.value = "";
  filterPayment.value = "";
  filterDate.value = "";
  await runFilterSearch();
  allJobsModal.style.display = "flex";
});

closeAllJobsBtn.addEventListener("click", () => {
  allJobsModal.style.display = "none";
});

async function runFilterSearch() {
  const params = new URLSearchParams();
  if (filterWorker.value) params.append("worker", filterWorker.value);
  if (filterType.value) params.append("type", filterType.value);
  if (filterPayment.value) params.append("payment", filterPayment.value);
  if (filterDate.value) params.append("date", filterDate.value);

  try {
    const res = await fetch(`/api/workers/filter?${params.toString()}`);
    const data = await res.json();
    renderAdminCards("allJobsList", data);
  } catch (error) {
    console.log(error);
  }
}

filterSearchBtn.addEventListener("click", runFilterSearch);

allJobsExcelBtn.addEventListener("click", () => {
  const excelUrl = window.location.origin + "/api/excel";
  if (window.Telegram && window.Telegram.WebApp) {
    Telegram.WebApp.openLink(excelUrl);
  } else {
    window.location.href = excelUrl;
  }
});

document.getElementById("downloadExcel").addEventListener("click", () => {
  const excelUrl = window.location.origin + "/api/excel";
  if (window.Telegram && window.Telegram.WebApp) {
    Telegram.WebApp.openLink(excelUrl);
  } else {
    window.location.href = excelUrl;
  }
});

// =========================
// DETAIL MODAL (faqat o'qish)
// =========================

function openDetailModal(item, mode) {
  currentDetailItem = item;
  editMode = mode;

  const amountLabel =
    item.type === "Press" ? "Press soni" : "Yer maydoni";
  const amountValue =
    item.type === "Press"
      ? (item.pressCount ?? "-")
      : (item.landArea != null ? Number(item.landArea).toFixed(2) : "-");

  detailView.innerHTML = `
    <p><strong>Sana</strong>${new Date(item.date).toLocaleDateString("uz-UZ")}</p>
    <p><strong>Ishchi</strong>${item.worker}</p>
    <p><strong>Apparat</strong>${item.type}</p>
    <p><strong>Yer egasi</strong>${item.owner}</p>
    <p><strong>Telefon</strong>${item.clientPhone ?? "-"}</p>
    <p><strong>${amountLabel}</strong>${amountValue}</p>
    <p><strong>To'lov</strong>${item.payment}</p>
    <p><strong>Narxi</strong>${item.price ?? "-"}</p>
    <p><strong>Izoh</strong>${item.comment ?? "-"}</p>
  `;

  detailModal.style.display = "flex";
}

closeDetail.addEventListener("click", () => {
  detailModal.style.display = "none";
});

detailEditBtn.addEventListener("click", () => {
  detailModal.style.display = "none";
  openEditModal(currentDetailItem, editMode);
});

// =========================
// EDIT MODAL (umumiy — admin va worker uchun)
// =========================

function openEditModal(item, mode) {
  editMode = mode; // "admin" | "own"

  editId.value = item.id;
  editType.value = item.type;
  editDate.value = new Date(item.date).toISOString().split("T")[0];
  editTypeLabel.innerText = item.type;
  editOwner.value = item.owner;
  editPhone.value = item.clientPhone ?? "";
  editPayment.value = item.payment;
  editPrice.value = item.price ?? "";
  editComment.value = item.comment ?? "";

  if (item.type === "Press") {
    editPressGroup.style.display = "block";
    editJatkaGroup.style.display = "none";
    editPress.value = item.pressCount ?? "";
  } else {
    editPressGroup.style.display = "none";
    editJatkaGroup.style.display = "block";
    editLand.value = item.landArea ?? "";
  }

  editFormModal.style.display = "flex";
}

closeEditBtn.addEventListener("click", () => {
  editFormModal.style.display = "none";
});

saveEdit.addEventListener("click", async () => {
  const comment = editComment.value.trim();
  if (comment === "") {
    alert("Izoh yozish majburiy!");
    return;
  }

  const isOwn = editMode === "own";
  const url = isOwn
    ? `/api/workers/own/${editId.value}`
    : `/api/workers/${editId.value}`;

  const body = {
    owner: editOwner.value,
    clientPhone: editPhone.value,
    comment,
    pressCount: editType.value === "Press" ? editPress.value : null,
    landArea: editType.value === "Jatka" ? editLand.value : null,
    payment: editPayment.value,
    price: editPayment.value === "Ha" ? editPrice.value : null,
    date: editDate.value,
  };
  if (isOwn) body.login = currentUser.login;

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (result.success) {
      editFormModal.style.display = "none";
      alert("Ma'lumot yangilandi.");
      if (isOwn) {
        loadMyJobs();
        loadMySummary();
      } else {
        loadTodayJobs();
        // agar "Barchasi" oynasi ochiq bo'lsa, uni ham yangilaymiz
        if (allJobsModal.style.display === "flex") runFilterSearch();
      }
    } else {
      alert(result.message || result.error || "Xato");
    }
  } catch (error) {
    console.log(error);
    alert("Server bilan bog'lanib bo'lmadi.");
  }
});

// =========================
// WORKER — MENING YUBORGANLARIM
// =========================

async function loadMyJobs() {
  try {
    const res = await fetch(
      `/api/workers/mine?login=${encodeURIComponent(currentUser.login)}`,
    );
    const data = await res.json();
    renderMyJobs(data);
  } catch (error) {
    console.log(error);
  }
}

function renderMyJobs(data) {
  const container = document.getElementById("myJobsList");
  container.innerHTML = "";

  data.forEach((item) => {
    const diffMin = (Date.now() - new Date(item.createdAt).getTime()) / 60000;
    const editable = diffMin <= 600; // 10 soat

    const row = document.createElement("div");
    row.className = "job-row";

    row.innerHTML = `
      <div class="job-main">
        <span>${item.type}</span>
        <span>${formatAmount(item)}</span>
      </div>
      <div class="job-actions">
        ${
          editable
            ? `<button type="button" class="edit-btn">✏️</button>
               <button type="button" class="delete-btn">🗑</button>`
            : `<span class="expired-label">Muddat tugagan</span>`
        }
      </div>
    `;

    // Qatorning o'zini bosilganda ham tahrirlash ochiladi (agar muddat o'tmagan bo'lsa)
    row.addEventListener("click", (e) => {
      if (e.target.closest(".delete-btn")) return;
      if (!editable) return;
      openEditModal(item, "own");
    });

    const deleteBtn = row.querySelector(".delete-btn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteMyWorker(item.id);
      });
    }

    container.appendChild(row);
  });
}

async function deleteMyWorker(id) {
  if (!confirm("Rostdan ham o'chirilsinmi?")) return;
  try {
    const res = await fetch(
      `/api/workers/own/${id}?login=${encodeURIComponent(currentUser.login)}`,
      { method: "DELETE" },
    );
    const result = await res.json();
    if (result.success) {
      loadMyJobs();
      loadMySummary();
    } else {
      alert(result.message || "Xatolik");
    }
  } catch (error) {
    console.log(error);
  }
}

// =========================
// WORKER — JAMI STATISTIKA
// =========================

async function loadMySummary() {
  try {
    const res = await fetch(
      `/api/workers/summary?login=${encodeURIComponent(currentUser.login)}`,
    );
    const data = await res.json();
    document.getElementById("myTotalPress").innerText = data.totalPress;
    document.getElementById("myTotalLand").innerText = Number(
      data.totalLand,
    ).toFixed(2);
  } catch (error) {
    console.log(error);
  }
}
