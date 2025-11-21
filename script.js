let allData = [];
let currentData = [];
let servicesData = [];
let currentPage = 1;
const rowsPerPage = 10;
let currentType = "全部";

// DOM 元件
const tableBody = document.querySelector("#resultTable tbody");
const pagination = document.getElementById("pagination");
const searchInput = document.getElementById("searchInput");
const citySelect = document.getElementById("citySelect");
const areaSelect = document.getElementById("areaSelect");
const modal = document.getElementById("modal");
const modalContent = document.getElementById("modalContent");
const closeBtn = document.querySelector(".close");
const themeToggle = document.getElementById("themeToggle");

// 初始化
document.addEventListener("DOMContentLoaded", async () => {
  await loadData();
  await loadServices();
  populateCityOptions();
  displayData(allData);
  initFilterButtons();
});

// 載入主資料
async function loadData() {
  const res = await fetch("https://kileyou123-maker.github.io/health-dashboard/data.json");
  allData = await res.json();
  normalizeAddress(allData);
  currentData = allData;
}

// 載入服務資料
async function loadServices() {
  const res = await fetch("https://raw.githubusercontent.com/kileyou123-maker/health-dashboard/refs/heads/main/services.csv");
  const text = await res.text();
  servicesData = parseCSV(text);
}

// CSV → JSON
function parseCSV(text) {
  const [header, ...rows] = text.trim().split("\n");
  const keys = header.split(",");
  return rows.map(row => {
    const values = row.split(",");
    const obj = {};
    keys.forEach((k, i) => obj[k.trim()] = values[i]?.trim() || "");
    return obj;
  });
}

// 正規化地址
function normalizeAddress(data) {
  data.forEach(d => {
    if (d["醫事機構地址"]) {
      d["醫事機構地址"] = d["醫事機構地址"].replaceAll("臺", "台").trim();
    }
  });
}

// 顯示資料
function displayData(data) {
  tableBody.innerHTML = "";
  const start = (currentPage - 1) * rowsPerPage;
  const pageData = data.slice(start, start + rowsPerPage);

  pageData.forEach((item, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${start + index + 1}</td>
      <td>${item["醫事機構名稱"]}</td>
      <td>${item["醫事機構地址"]}</td>
      <td>${item["醫事機構電話"]}</td>
      <td><button class="main-btn" onclick="showDetails('${item["醫事機構名稱"]}')">詳細</button></td>
    `;
    tableBody.appendChild(tr);
  });

  updatePagination(data.length);
}

// 分頁
function updatePagination(totalRows) {
  pagination.innerHTML = "";
  const totalPages = Math.ceil(totalRows / rowsPerPage);

  const prev = document.createElement("button");
  prev.textContent = "上一頁";
  prev.className = "main-btn";
  prev.disabled = currentPage === 1;
  prev.onclick = () => {
    currentPage--;
    displayData(currentData);
  };
  pagination.appendChild(prev);

  const pageInfo = document.createElement("span");
  pageInfo.textContent = `${currentPage} / ${totalPages}`;
  pagination.appendChild(pageInfo);

  const next = document.createElement("button");
  next.textContent = "下一頁";
  next.className = "main-btn";
  next.disabled = currentPage === totalPages;
  next.onclick = () => {
    currentPage++;
    displayData(currentData);
  };
  pagination.appendChild(next);
}

// 顯示詳細
function showDetails(name) {
  const record = allData.find(d => d["醫事機構名稱"] === name);
  if (!record) return;

  modalContent.innerHTML = `
    <h2>${record["醫事機構名稱"]}</h2>
    <p><strong>電話：</strong>${record["醫事機構電話"]}</p>
    <p><strong>地址：</strong>${record["醫事機構地址"]}</p>
    <hr>
    <h3>服務項目</h3>
    <table class="service-table">
      <thead><tr><th>項目</th><th>提供</th></tr></thead>
      <tbody>${renderServiceRows(name)}</tbody>
    </table>
  `;
  modal.style.display = "block";
}

// 關閉視窗
closeBtn.onclick = () => (modal.style.display = "none");
window.onclick = e => {
  if (e.target === modal) modal.style.display = "none";
};

// 產生服務表格內容
function renderServiceRows(name) {
  const record = servicesData.find(s => s["醫事機構名稱"] === name);
  if (!record) return `<tr><td colspan="2">無服務資料</td></tr>`;

  const keys = Object.keys(record).slice(4);
  return keys
    .map(k => `<tr><td>${k}</td><td>${record[k] === "1" ? "✅" : "❌"}</td></tr>`)
    .join("");
}

// 搜尋
searchInput.addEventListener("input", e => {
  const q = e.target.value.trim();
  currentData = allData.filter(d => d["醫事機構名稱"].includes(q) || d["醫事機構地址"].includes(q));
  currentPage = 1;
  displayData(currentData);
});

// 篩選縣市、地區
function populateCityOptions() {
  const cities = [...new Set(allData.map(d => d["city"]))].filter(Boolean);
  citySelect.innerHTML = `<option value="">選擇縣市</option>` + cities.map(c => `<option>${c}</option>`).join("");
  citySelect.addEventListener("change", () => {
    const city = citySelect.value;
    const towns = [...new Set(allData.filter(d => d["city"] === city).map(d => d["town"]))];
    areaSelect.innerHTML = `<option value="">選擇地區</option>` + towns.map(t => `<option>${t}</option>`).join("");
    filterByCityAndTown();
  });
  areaSelect.addEventListener("change", filterByCityAndTown);
}

function filterByCityAndTown() {
  const city = citySelect.value;
  const town = areaSelect.value;
  currentData = allData.filter(d => (!city || d["city"] === city) && (!town || d["town"] === town));
  currentPage = 1;
  displayData(currentData);
}

// 篩選按鈕
function initFilterButtons() {
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      currentType = btn.dataset.type;
      if (currentType === "全部") currentData = allData;
      else currentData = allData.filter(d => d["型態"] === currentType);
      currentPage = 1;
      displayData(currentData);
    });
  });
}

// 深色模式
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
});

if (localStorage.getItem("theme") === "dark") document.body.classList.add("dark");
