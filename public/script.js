// =========================
// ELEMENTLAR
// =========================
// Login qilgan foydalanuvchi
let currentUser = null;
const loginContainer = document.querySelector(".login-container");
const adminPanel = document.querySelector(".admin");
const workerPanel = document.querySelector(".worker-panel");

const loginForm = document.getElementById("login-form");

const logoutAdmin = document.getElementById("logoutAdmin");
const logoutWorker = document.getElementById("logoutWorker");

const workSelect = document.getElementById("work-select");

const pressForm = document.querySelector(".press");
const jatkaForm = document.querySelector(".jatka");
const editModal = document.getElementById("editModal");

const editId = document.getElementById("editId");
const editOwner = document.getElementById("editOwner");
const editPress = document.getElementById("editPress");
const editLand = document.getElementById("editLand");
const editPayment = document.getElementById("editPayment");
const editPrice = document.getElementById("editPrice");
// =========================
// SAHIFA OCHILGANDA
// =========================

window.onload = () => {
  loginContainer.style.display = "flex";

  adminPanel.style.display = "none";

  workerPanel.style.display = "none";
};

function closeEdit() {
  document.querySelector(".edit-modal").style.display = "none";
}
// =========================
// LOGIN
// =========================

loginForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const login = document.getElementById("login").value.trim();

  const password = document.getElementById("password").value.trim();

  const response = await fetch("/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      login,
      password,
    }),
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
    loadWorkers();
  } else {
    workerPanel.style.display = "flex";
    workerPanel.style.flexDirection = "column";
  }
});

// =========================
// LOGOUT
// =========================

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
// APPARAT TANLASH
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

document.getElementById("pressPayment").addEventListener("change", function () {
  pressPrice.style.display = this.value === "Ha" ? "block" : "none";
  if (this.value !== "Ha") pressPrice.value = "";
});

document.getElementById("jatkaPayment").addEventListener("change", function () {
  jatkaPrice.style.display = this.value === "Ha" ? "block" : "none";
  if (this.value !== "Ha") jatkaPrice.value = "";
});
// =========================
// WORKER FORM
// =========================

const workerForm = document.getElementById("worker-form");

workerForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const type = workSelect.value;

  if (type === "") {
    alert("Ish turini tanlang!");

    return;
  }

  let data = {};

  // =========================
  // PRESS
  // =========================

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
    };
  }

  // =========================
  // JATKA
  // =========================

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
    };
  }

  // =========================
  // BUGUNGI SANA
  // =========================

  data.date = new Date().toISOString().split("T")[0];

  // =========================
  // LOGIN BO'LGAN ISHCHI
  // =========================

  data.worker = currentUser.login;
  // =========================
  // SERVERGA YUBORISH
  // =========================

  try {
    const response = await fetch("/api/workers", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

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
    } else {
      alert(result.message);
    }
  } catch (error) {
    console.log(error);

    alert("Server bilan bog'lanib bo'lmadi.");
  }
});

const tableBody = document.getElementById("tableBody");

const searchInput = document.getElementById("search");

let workers = [];

async function loadWorkers() {
  try {
    const response = await fetch("/api/workers");

    workers = await response.json();

    drawTable(workers);
  } catch (error) {
    console.log(error);
  }
}

function drawTable(data) {
  tableBody.innerHTML = "";

  data.forEach((item) => {
    tableBody.innerHTML += `

<tr>

<td>${new Date(item.date).toLocaleDateString("uz-UZ")}</td>
<td>${item.worker}</td>
<td>${item.type}</td>
<td>${item.owner}</td>
<td>${item.pressCount ?? "-"}</td>
<td>${item.landArea ?? "-"}</td>
<td>${item.payment}</td>
<td>${item.price ?? "-"}</td>

<td>
    <button onclick="editWorker(${item.id})">✏️</button>
    <button onclick="deleteWorker(${item.id})">🗑</button>
</td>

</tr>

        `;
  });

  updateDashboard(data);
}

function editWorker(id) {
  const worker = workers.find((x) => x.id === id);

  console.log(worker);

  console.log("price:", worker.price);

  editId.value = worker.id;
  editOwner.value = worker.owner;
  editPress.value = worker.pressCount ?? "";
  editLand.value = worker.landArea ?? "";
  editPayment.value = worker.payment;
  editPrice.value = worker.price ?? "";
  console.log({
    editId,
    editOwner,
    editPress,
    editLand,
    editPayment,
    editPrice,
  });
  editModal.style.display = "flex";
}

function updateDashboard(data) {
  document.getElementById("totalJobs").innerText = data.length;

  const totalPress = data.reduce((sum, item) => {
    return sum + (Number(item.pressCount) || 0);
  }, 0);

  document.getElementById("pressJobs").innerText = totalPress;

  const totalLand = data.reduce((sum, item) => {
    return sum + (Number(item.landArea) || 0);
  }, 0);

  document.getElementById("jatkaJobs").innerText = totalLand.toFixed(2);

  document.getElementById("paidJobs").innerText = data.filter(
    (x) => x.payment === "Ha",
  ).length;

  document.getElementById("unpaidJobs").innerText = data.filter(
    (x) => x.payment === "Yo'q",
  ).length;
}

searchInput.addEventListener("keyup", async () => {
  const text = searchInput.value;

  if (text === "") {
    loadWorkers();

    return;
  }

  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(text)}`);

    const result = await response.json();

    drawTable(result);
  } catch (error) {
    console.log(error);
  }
});

const excelBtn = document.getElementById("downloadExcel");

excelBtn.addEventListener("click", () => {
  window.location.href = "/api/excel";
});
async function deleteWorker(id) {
  if (!confirm("Rostdan ham o'chirilsinmi?")) {
    return;
  }

  try {
    const response = await fetch(
      `/api/workers/${id}`,

      {
        method: "DELETE",
      },
    );

    const result = await response.json();

    if (result.success) {
      loadWorkers();

      alert("Ma'lumot o'chirildi.");
    }
  } catch (error) {
    console.log(error);
  }
}

closeEdit.onclick = () => {
  editModal.style.display = "none";
};

saveEdit.onclick = async () => {
  try {
    const response = await fetch(`/api/workers/${editId.value}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        owner: editOwner.value,
        pressCount: editPress.value,
        landArea: editLand.value,
        payment: editPayment.value,
        price: editPayment.value === "Ha" ? editPrice.value : null,
      }),
    });

    const result = await response.json();

    if (result.success) {
      editModal.style.display = "none";
      loadWorkers();
      alert("Ma'lumot yangilandi.");
    } else {
      alert("Xato: " + (result.error || "Noma'lum xato"));
    }
  } catch (error) {
    console.log(error);
    alert("Server bilan bog'lanib bo'lmadi.");
  }
};
closeEdit.addEventListener("click", () => {
  editModal.style.display = "none";
});
console.log(editPrice);
