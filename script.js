let allData = [];
let filteredData = [];
let currentPage = 1;
const perPage = 10;
let servicesData = [];

// 初始化
document.addEventListener("DOMContentLoaded", async () => {
  await loadData();
  await loadServices();
  setupThemeToggle();
  setupAutocomplete();
  setupFilters();
  renderTable();
});

// 讀取主資料
async function loadData() {
  const res = await fetch("processed_data.json");
  allData = await res.json();
  filteredData = allData;
}

// 讀取 services.csv
async function loadServices() {
  try {
    const res = await fetch("https://raw.githubusercontent.com/kileyou123-maker/health-dashboard/main/services.csv");
    const text = await res.text();
    const lines = text.split("\n").filter(l => l.trim());
    const headers = lines[0].split(",").map(h => h.trim());
    servicesData = lines.slice(1).map(l => l.split(","));
    servicesData.headers = headers;
  } catch (err) {
    console.error("無法載入 services.csv", err);
  }
}

// 搜尋功能
function filterData(keyword) {
  keyword = keyword.trim();
  filteredData = allData.filter(d => {
    return (
      d["醫事機構名稱"].includes(keyword) ||
      d["醫事機構電話"].includes(keyword) ||
      d["醫事機構地址"].includes(keyword) ||
      d["整合團隊名稱"].includes(keyword) ||
      d["來源"].includes(keyword)
    );
  });
  currentPage = 1;
  renderTable();
}

// 表格渲染
function renderTable() {
  const tbody = document.getElementById("data-body");
  tbody.innerHTML = "";
  const start = (currentPage - 1) * perPage;
  const end = start + perPage;
  const pageData = filteredData.slice(start, end);

  for (const d of pageData) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d["醫事機構名稱"]}</td>
      <td>${d["醫事機構電話"]}</td>
      <td>${d["醫事機構地址"]}</td>
      <td>${d["整合團隊名稱"]}</td>
      <td>${d["來源"]}</td>
    `;
    tr.addEventListener("click", () => showDetails(d));
    tbody.appendChild(tr);
  }

  renderPagination();
}

// 分頁
function renderPagination() {
  const totalPages = Math.ceil(filteredData.length / perPage);
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = `
    <button onclick="prevPage()" ${currentPage === 1 ? "disabled" : ""}>上一頁</button>
    <span>第 ${currentPage} / ${totalPages} 頁</span>
    <button onclick="nextPage()" ${currentPage === totalPages ? "disabled" : ""}>下一頁</button>
  `;
}

function nextPage() {
  currentPage++;
  renderTable();
}

function prevPage() {
  currentPage--;
  renderTable();
}

// 詳細資料顯示（含服務表格）
async function showDetails(d) {
  const modal = document.getElementById("detailModal");
  document.getElementById("modalTitle").textContent = d["醫事機構名稱"];
  document.getElementById("modalCode").textContent = d["醫事機構代碼"] || "—";
  document.getElementById("modalTeam").textContent = d["整合團隊名稱"] || "—";
  document.getElementById("modalAddr").textContent = d["醫事機構地址"] || "—";
  document.getElementById("modalPhone").innerHTML = d["醫事機構電話"]
    ? `<a href="tel:${d["醫事機構電話"]}" style="color:#63b3ed;text-decoration:none;">${d["醫事機構電話"]}</a>`
    : "—";
  document.getElementById("modalSource").textContent = d["來源"] || "—";

  // 移除舊表格
  const old = document.getElementById("serviceTable");
  if (old) old.remove();

  try {
    const headers = servicesData.headers;
    const nameIndex = 1; // 第二欄是醫事機構名稱
    const target = servicesData.find(r =>
      (r[nameIndex] || "").replace("臺", "台").includes((d["醫事機構名稱"] || "").replace("臺", "台"))
    );

    if (target) {
      const table = document.createElement("table");
      table.id = "serviceTable";
      table.style.width = "100%";
      table.style.marginTop = "12px";
      table.style.borderCollapse = "collapse";
      table.innerHTML = `
        <thead><tr style="background: var(--table-th-bg); color: white;">
          <th>服務項目</th><th>是否提供</th>
        </tr></thead><tbody></tbody>`;
      const tbody = table.querySelector("tbody");

      for (let i = 4; i < headers.length; i++) {
        const item = headers[i];
        const val = target[i] && target[i].trim() === "1" ? "✅" : "❌";
        const row = document.createElement("tr");
        row.innerHTML = `<td>${item}</td><td>${val}</td>`;
        row.style.textAlign = "center";
        row.style.border = "1px solid var(--table-border)";
        tbody.appendChild(row);
      }
      modal.querySelector(".modal-content").appendChild(table);
    }
  } catch (e) {
    console.error("顯示服務表格失敗", e);
  }

  modal.style.display = "block";
}

// 關閉彈窗
function closeModal() {
  document.getElementById("detailModal").style.display = "none";
}

// 關鍵字提示
function setupAutocomplete() {
  const input = document.getElementById("search-input");
  input.addEventListener("input", () => {
    const val = input.value.trim();
    const suggestionBox = document.getElementById("suggestions");
    suggestionBox.innerHTML = "";
    if (!val) return;
    const matches = allData
      .filter(d => d["醫事機構名稱"].includes(val))
      .slice(0, 8);
    for (const m of matches) {
      const div = document.createElement("div");
      div.className = "suggestion";
      div.textContent = m["醫事機構名稱"];
      div.onclick = () => {
        input.value = m["醫事機構名稱"];
        suggestionBox.innerHTML = "";
        filterData(m["醫事機構名稱"]);
      };
      suggestionBox.appendChild(div);
    }
  });
}

// 縣市地區篩選
function setupFilters() {
  const citySelect = document.getElementById("citySelect");
  const townSelect = document.getElementById("townSelect");

  const cities = [...new Set(allData.map(d => d.city))].filter(Boolean);
  for (const c of cities) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    citySelect.appendChild(opt);
  }

  citySelect.addEventListener("change", () => {
    const selected = citySelect.value;
    const towns = [...new Set(allData.filter(d => d.city === selected).map(d => d.town))];
    townSelect.innerHTML = '<option value="">選擇地區</option>';
    for (const t of towns) {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      townSelect.appendChild(opt);
    }
    filterByLocation();
  });

  townSelect.addEventListener("change", filterByLocation);
}

function filterByLocation() {
  const city = document.getElementById("citySelect").value;
  const town = document.getElementById("townSelect").value;
  filteredData = allData.filter(d => (!city || d.city === city) && (!town || d.town === town));
  currentPage = 1;
  renderTable();
}

// 深色模式切換
function setupThemeToggle() {
  const toggle = document.getElementById("theme-toggle");
  const body = document.body;
  const saved = localStorage.getItem("theme");
  if (saved === "dark") body.classList.add("dark");
  toggle.addEventListener("click", () => {
    body.classList.toggle("dark");
    localStorage.setItem("theme", body.classList.contains("dark") ? "dark" : "light");
  });
}
