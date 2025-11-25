// =============================================================
// script.js — Rebuilt Version (Part 1/5)
// =============================================================
// 本檔案由 ChatGPT 自動重建，依序分段寫入。
// 本段包含：資料載入、CSV 轉換、地址正規化。
// 後續部分將以 append 模式寫入補上。
// =============================================================
/* ============================================================
   script.js — Full Enhanced Version (Ripple + Skeleton + Animations)
   ============================================================ */

let allData = [];
let serviceData = [];
@@ -13,26 +9,24 @@ let cityDistrictMap = {};
let currentPage = 1;
const pageSize = 50;

// ==============================
// CSV → JSON
// ==============================
/* ============================================================
   1. CSV → JSON
   ============================================================ */
function csvToJson(csv) {
  const lines = csv.split('\n').filter(x => x.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  const lines = csv.split("\n").filter(x => x.trim());
  const headers = lines[0].split(",").map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = line.split(',');
    const values = line.split(",");
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] ? values[i].trim() : '';
    });
    headers.forEach((h, i) => (obj[h] = values[i] ? values[i].trim() : ""));
    return obj;
  });
}

// ==============================
// 地址正規化（臺 → 台）
// ==============================
/* ============================================================
   2. 地址正規化
   ============================================================ */
function normalizeAddress(list) {
  list.forEach(d => {
    if (d["醫事機構地址"]) {
@@ -41,34 +35,24 @@ function normalizeAddress(list) {
  });
}


// =============================================================
// Part 2/5 — 城市／地區解析 + 下拉選單自動連動
// =============================================================
// =============================================================
// 城市／地區解析 + 下拉選單自動連動（完整修復版）
// =============================================================

// 全台縣市表
/* ============================================================
   3. City / District Map
   ============================================================ */
const allCities = [
  "台北市","新北市","桃園市","台中市","台南市","高雄市",
  "基隆市","新竹市","嘉義市","新竹縣","苗栗縣","彰化縣",
  "南投縣","雲林縣","嘉義縣","屏東縣","宜蘭縣","花蓮縣",
  "台東縣","澎湖縣","金門縣","連江縣"
];

// 建立 city → district map
function buildCityDistrictMap(list) {
  cityDistrictMap = {}; // 清空避免重複
  cityDistrictMap = {};

  list.forEach(d => {
    const addr = d["醫事機構地址"];
    if (!addr) return;

    // 判斷城市
    const city = allCities.find(c => addr.startsWith(c)) || "其他";

    // 判斷地區（區／鄉／鎮／市）
    const after = addr.replace(city, "");
    const match = after.match(/[\u4e00-\u9fa5]{1,4}(區|鄉|鎮|市)/);
    const district = match ? match[0] : "其他";
@@ -78,19 +62,16 @@ function buildCityDistrictMap(list) {
  });
}

// 載入縣市
function populateCityList() {
  const sel = document.getElementById("citySelect");
  sel.innerHTML = `<option value="全部">全部</option>`;

  Object.keys(cityDistrictMap).forEach(city => {
    const opt = document.createElement("option");
    opt.value = opt.textContent = city;
    sel.appendChild(opt);
  });
}

// 載入地區
function populateDistrictList() {
  const city = document.getElementById("citySelect").value;
  const sel = document.getElementById("districtSelect");
@@ -103,92 +84,134 @@ function populateDistrictList() {
      sel.appendChild(opt);
    });
  }

  autoFilterFromSelectors();
}

/* ============================================================
   4. Ripple 按鈕效果
   ============================================================ */
function enableRipple() {
  document.querySelectorAll(".filter-btn, .main-btn").forEach(btn => {
    btn.classList.add("ripple");
    btn.addEventListener("click", e => {
      const rect = btn.getBoundingClientRect();
      btn.style.setProperty("--x", `${e.clientX - rect.left}px`);
      btn.style.setProperty("--y", `${e.clientY - rect.top}px`);
    });
  });
}

/* ============================================================
   5. Skeleton 載入動畫
   ============================================================ */
function showSkeleton() {
  const tbody = document.querySelector("#resultTable tbody");
  tbody.innerHTML = "";

// =============================================================
// Part 3/5 — 快速分類按鈕 + 表格渲染 + 分頁 + 動畫
// =============================================================
  for (let i = 0; i < 10; i++) {
    const div = document.createElement("div");
    div.className = "skeleton-row";
    div.style.width = `${70 + Math.random() * 20}%`;
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.appendChild(div);
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
}

// =========================
// 快速分類（全部 / 醫院 / 診所 / 護理之家）
// =========================
function quickFilter(type) {
  let keywords = [];
/* ============================================================
   6. 平滑渲染
   ============================================================ */
function smoothRender(callback) {
  const table = document.getElementById("resultTable");
  table.style.opacity = "0";
  table.style.transform = "translateY(14px)";

  if (type === "全部") {
    currentData = allData;
  } else if (type === "醫院") {
    keywords = ["醫院"];
    currentData = allData.filter(d =>
      keywords.some(k => (d["醫事機構名稱"] || "").includes(k))
    );
  } else if (type === "診所") {
    keywords = ["診所", "醫療"];
    currentData = allData.filter(d =>
      keywords.some(k => (d["醫事機構名稱"] || "").includes(k))
    );
  } else if (type === "護理之家") {
    keywords = ["護理", "安養", "養護"];
  setTimeout(() => {
    callback();
    requestAnimationFrame(() => {
      table.style.opacity = "1";
      table.style.transform = "translateY(0)";
    });
  }, 200);
}

/* ============================================================
   7. 分類快速按鈕
   ============================================================ */
function quickFilter(type) {
  if (type === "全部") currentData = allData;
  else {
    const map = {
      "醫院": ["醫院"],
      "診所": ["診所", "醫療"],
      "護理之家": ["護理", "安養", "養護"]
    };
    currentData = allData.filter(d =>
      keywords.some(k => (d["醫事機構名稱"] || "").includes(k))
      map[type].some(k => d["醫事機構名稱"]?.includes(k))
    );
  }

  currentPage = 1;
  document.getElementById("status").textContent = `顯示類別：${type}（${currentData.length} 筆）`;
  document.getElementById("status").textContent =
    `顯示類別：${type}（${currentData.length} 筆）`;

  document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelector(`.filter-btn[data-type="${type}"]`).classList.add("active");

  smoothRender(renderTablePage);
  showSkeleton();
  setTimeout(() => smoothRender(renderTablePage), 300);
}

/* ============================================================
   8. 表格渲染 + Highlight
   ============================================================ */
function highlight(text, key) {
  if (!key) return text;
  return text.replaceAll(key, `<mark class="hl">${key}</mark>`);
}

// =========================
// 表格渲染
// =========================
function renderTablePage() {
  const tbody = document.querySelector("#resultTable tbody");
  tbody.innerHTML = "";

  if (currentData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5">查無資料</td></tr>';
    document.getElementById("pagination").innerHTML = "";
    return;
  }
  const key = document.getElementById("keyword").value.trim();

  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, currentData.length);
  const pageData = currentData.slice(start, end);

  for (const d of pageData) {
  pageData.forEach(d => {
    const addr = d["醫事機構地址"];
    const phone = d["醫事機構電話"];
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d["醫事機構名稱"]}</td>
      <td><a href="${mapUrl}" target="_blank">${addr}</a></td>
      <td><a href="tel:${phone}" style="color:var(--link-color);text-decoration:none;">${phone}</a></td>
      <td>${d["整合團隊名稱"]}</td>
      <td>${highlight(d["醫事機構名稱"], key)}</td>
      <td><a href="${mapUrl}" target="_blank">${highlight(addr, key)}</a></td>
      <td><a href="tel:${phone}" style="color:var(--link-color);text-decoration:none;">
            ${highlight(phone, key)}</a>
      </td>
      <td>${highlight(d["整合團隊名稱"], key)}</td>
      <td>${d["來源"]}</td>
    `;
    tbody.appendChild(tr);
  }
  });

  renderPagination();
}

// =========================
// 分頁
// =========================
/* ============================================================
   9. 分頁控制
   ============================================================ */
function renderPagination() {
  const pageCount = Math.ceil(currentData.length / pageSize);
  const box = document.getElementById("pagination");
  box.innerHTML = "";
  const pageCount = Math.ceil(currentData.length / pageSize);

  box.innerHTML = "";
  if (pageCount <= 1) return;

  const prev = document.createElement("button");
@@ -217,70 +240,40 @@ function renderPagination() {
  box.appendChild(next);
}

// =========================
// 平滑渲染動畫
// =========================
function smoothRender(callback) {
  const table = document.getElementById("resultTable");
  table.style.opacity = "0";
  table.style.transform = "translateY(12px)";

  setTimeout(() => {
    callback();
    requestAnimationFrame(() => {
      table.style.opacity = "1";
      table.style.transform = "translateY(0)";
    });
  }, 200);
}

// =============================================================
// Part 4/5 — Modal 詳細視窗 + 服務項目 ✔✖ (專業美化版)
// =============================================================

// Modal 初始化
/* ============================================================
   10. Modal 詳細資料（Zoom 動畫）
   ============================================================ */
function setupModal() {
  const modal = document.getElementById("detailModal");
  const closeBtn = document.getElementById("closeModal");

  closeBtn.onclick = () => (modal.style.display = "none");

  window.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
  };
  window.onclick = e => { if (e.target === modal) modal.style.display = "none"; };
}

// 顯示 Modal 詳細資料
function showDetails(d) {
  const modal = document.getElementById("detailModal");
  const mc = modal.querySelector(".modal-content");

  mc.classList.add("animate-modal");

  setTimeout(() => mc.classList.remove("animate-modal"), 400);

  document.getElementById("modalTitle").textContent = d["醫事機構名稱"] || "無";
  document.getElementById("modalCode").textContent = d["醫事機構代碼"] || "無";
  document.getElementById("modalTeam").textContent = d["整合團隊名稱"] || "無";
  document.getElementById("modalAddr").textContent = d["醫事機構地址"] || "無";

  // 電話
  const phone = d["醫事機構電話"] || "";
  document.getElementById("modalPhone").innerHTML =
    phone
      ? `<a href="tel:${phone}" style="color:var(--link-color);text-decoration:none;">${phone}</a>`
      : "無";
    phone ? `<a href="tel:${phone}" style="color:var(--link-color);">${phone}</a>` : "無";

  document.getElementById("modalSource").textContent = d["來源"] || "無";
  document.getElementById("modalSource").textContent = d["來源"];

  // ------------------------------
  // 服務項目（✔ / ✖）
  // ------------------------------
  const modalContent = modal.querySelector(".modal-content");
  mc.querySelectorAll(".service-table, .service-msg").forEach(el => el.remove());

  // 清除舊表格
  modalContent.querySelectorAll(".service-table, .service-msg").forEach(el => el.remove());

  // 找對應服務資料
  const found = serviceData.find(s =>
    s["醫事機構名稱"] &&
    d["醫事機構名稱"] &&
    s["醫事機構名稱"].includes(d["醫事機構名稱"])
    s["醫事機構名稱"]?.includes(d["醫事機構名稱"])
  );

  const container = document.createElement("div");
@@ -291,58 +284,64 @@ function showDetails(d) {
        <thead><tr><th>項目</th><th>提供</th></tr></thead>
        <tbody>
    `;

    // 從服務資料中撈欄位（前四欄是醫事機構資訊，後面才是服務項目）
    const keys = Object.keys(found).slice(4);

    keys.forEach(k => {
      if (!k.trim()) return;

      const value = found[k];
      const icon =
        value == 1
          ? "<span class='yes-icon'>✔</span>"
          : "<span class='no-icon'>✖</span>";

        value == 1 ? "<span class='yes-icon'>✔</span>" : "<span class='no-icon'>✖</span>";
      table += `<tr><td>${k}</td><td>${icon}</td></tr>`;
    });

    table += "</tbody></table>";
    container.innerHTML = table;
  } else {
    container.innerHTML = `<p class="service-msg" style="text-align:center;margin-top:10px;">無服務項目資料</p>`;
    container.innerHTML = `<p class="service-msg" style="text-align:center;">無服務項目資料</p>`;
  }

  modalContent.appendChild(container);
  mc.appendChild(container);
  modal.style.display = "block";
}

/* ============================================================
   11. 搜尋邏輯（即時）
   ============================================================ */
function autoFilterFromSelectors() {
  const city = document.getElementById("citySelect").value;
  const dist = document.getElementById("districtSelect").value;
  const key = document.getElementById("keyword").value.trim();

// =============================================================
// Part 5/5 — 深色模式 + Autocomplete + 搜尋邏輯 + 初始化
// =============================================================

// =========================
// 深色模式
// =========================
function initTheme() {
  const btn = document.getElementById("themeToggle");
  const saved = localStorage.getItem("theme");

  if (saved === "dark") document.body.classList.add("dark");
  currentData = allData.filter(d => {
    const addr = d["醫事機構地址"] || "";
    const name = d["醫事機構名稱"] || "";
    const phone = d["醫事機構電話"] || "";
    const team = d["整合團隊名稱"] || "";

  btn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem(
      "theme",
      document.body.classList.contains("dark") ? "dark" : "light"
    return (
      (city === "全部" || addr.includes(city)) &&
      (dist === "全部" || addr.includes(dist)) &&
      (!key ||
        addr.includes(key) ||
        name.includes(key) ||
        phone.includes(key) ||
        team.includes(key))
    );
  });

  currentPage = 1;
  document.getElementById("status").textContent = `共 ${currentData.length} 筆資料`;

  smoothRender(renderTablePage);
}

// =========================
// Autocomplete 自動完成
// =========================
function searchData() {
  autoFilterFromSelectors();
}

/* ============================================================
   12. Autocomplete（增強）
   ============================================================ */
function setupAutocomplete() {
  const input = document.getElementById("keyword");
  const box = document.createElement("div");
@@ -355,93 +354,63 @@ function setupAutocomplete() {
  box.style.display = "none";
  box.style.zIndex = "999";
  box.style.boxShadow = "0 3px 6px rgba(0,0,0,0.2)";

  document.body.appendChild(box);

  input.addEventListener("input", () => {
    const val = input.value.trim();
    box.innerHTML = "";

    if (!val) return (box.style.display = "none");

    const matches = allData
      .map(d => d["醫事機構名稱"])
      .filter(n => n && n.includes(val));

    const unique = [...new Set(matches)].slice(0, 8);
    box.innerHTML = "";

    unique.forEach(name => {
      const div = document.createElement("div");
      div.style.padding = "8px";
      div.style.cursor = "pointer";
      div.textContent = name;

      div.addEventListener("mouseover", () => (div.style.background = "#e6fffa"));
      div.addEventListener("mouseout", () => (div.style.background = "transparent"));
      div.addEventListener("click", () => {
      div.onmouseover = () => (div.style.background = "#e6fffa");
      div.onmouseout = () => (div.style.background = "transparent");
      div.onclick = () => {
        input.value = name;
        box.style.display = "none";
        searchData();
      });
      };

      box.appendChild(div);
    });

    if (unique.length) {
      const rect = input.getBoundingClientRect();
      box.style.left = rect.left + "px";
      box.style.top = rect.bottom + window.scrollY + "px";
      box.style.width = rect.width + "px";
      box.style.display = "block";
    } else {
    if (!unique.length) {
      box.style.display = "none";
      return;
    }
  });

  document.addEventListener("click", e => {
    if (e.target !== input && e.target.parentNode !== box) box.style.display = "none";
    const rect = input.getBoundingClientRect();
    box.style.left = rect.left + "px";
    box.style.top = rect.bottom + window.scrollY + "px";
    box.style.width = rect.width + "px";
    box.style.display = "block";
  });
}

// =========================
// 搜尋（關鍵字 + 城市／地區）
// =========================
function searchData() {
  const city = document.getElementById("citySelect").value;
  const dist = document.getElementById("districtSelect").value;
  const key = document.getElementById("keyword").value.trim();

  currentData = allData.filter(d => {
    const addr = d["醫事機構地址"] || "";
    const name = d["醫事機構名稱"] || "";
    const phone = d["醫事機構電話"] || "";
    const team = d["整合團隊名稱"] || "";

    return (
      (city === "全部" || addr.includes(city)) &&
      (dist === "全部" || addr.includes(dist)) &&
      (!key ||
        addr.includes(key) ||
        name.includes(key) ||
        phone.includes(key) ||
        team.includes(key))
    );
  document.addEventListener("click", e => {
    if (e.target !== input) box.style.display = "none";
  });

  currentPage = 1;
  document.getElementById("status").textContent = `共 ${currentData.length} 筆資料`;

  smoothRender(renderTablePage);
}

// =========================
// 初始化流程
// =========================
/* ============================================================
   13. 初始化
   ============================================================ */
document.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  setupModal();
  enableRipple();

  showSkeleton();

  // 下載資料
  const files = [
    { path: "A21030000I-D2000H-001.csv", source: "居家醫療機構" },
    { path: "A21030000I-D2000I-001.csv", source: "安寧照護／護理之家" }
@@ -464,55 +433,35 @@ document.addEventListener("DOMContentLoaded", async () => {
  populateDistrictList();
  setupAutocomplete();

  // 讀取服務資料
  try {
    const r = await fetch(
      "https://raw.githubusercontent.com/kileyou123-maker/health-dashboard/refs/heads/main/services.csv"
    );
    const r = await fetch("https://raw.githubusercontent.com/kileyou123-maker/health-dashboard/refs/heads/main/services.csv");
    const t = await r.text();
    serviceData = csvToJson(t);
  } catch (e) {
    console.error("服務資料載入失敗", e);
  }

  currentData = allData;
  renderTablePage();

  // 綁定事件
  // 綁定事件（修復縣市、地區即時篩選）
document.getElementById("citySelect").addEventListener("change", () => {
  populateDistrictList();   // 更新地區選單
  searchData();             // 立即重新篩選（避免表格不更新）
});

document.getElementById("districtSelect").addEventListener("change", () => {
  searchData();             // 切換地區時也立即篩選
});

document.getElementById("searchBtn").addEventListener("click", searchData);
  smoothRender(renderTablePage);

  document.getElementById("citySelect").addEventListener("change", populateDistrictList);
  document.getElementById("districtSelect").addEventListener("change", autoFilterFromSelectors);

  // Enter 立即搜尋
  document.getElementById("searchBtn").addEventListener("click", searchData);
  document.getElementById("keyword").addEventListener("keypress", e => {
    if (e.key === "Enter") searchData();
  });

  // 表格列點擊 → Modal
  document.addEventListener("click", e => {
    const row = e.target.closest("#resultTable tbody tr");
    if (!row) return;

    const name = row.children[0].innerText.trim();
    const found = currentData.find(d => d["醫事機構名稱"] === name);

    if (found) showDetails(found);
  });

  // 快速分類按鈕
  document.querySelectorAll(".filter-btn").forEach(btn =>
    btn.addEventListener("click", () => quickFilter(btn.dataset.type))
  );
});
