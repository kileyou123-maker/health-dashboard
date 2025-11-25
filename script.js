// =============================================================
// script.js — Full Final Version (Part 1/6)
// =============================================================
// 包含：全域變數、CSV parser、地址正規化
// =============================================================

let allData = [];
let serviceData = [];
let currentData = [];
let cityDistrictMap = {};
let currentPage = 1;
const pageSize = 50;

// ==============================
// CSV → JSON
// ==============================
function csvToJson(csv) {
  const lines = csv.split("\n").filter(x => x.trim());
  const headers = lines[0].split(",").map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = line.split(",");
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] ? values[i].trim() : "";
    });
    return obj;
  });
}

// ==============================
// 地址正規化（臺 → 台）
// ==============================
function normalizeAddress(list) {
  list.forEach(d => {
    if (d["醫事機構地址"]) {
      d["醫事機構地址"] = d["醫事機構地址"]
        .replaceAll("臺", "台")
        .trim();
    }
  });
}
// =============================================================
// Part 2/6 — 城市／地區解析 + 下拉自動連動 + 即時塞選
// =============================================================

// 全台縣市表
const allCities = [
  "台北市","新北市","桃園市","台中市","台南市","高雄市",
  "基隆市","新竹市","嘉義市","新竹縣","苗栗縣","彰化縣",
  "南投縣","雲林縣","嘉義縣","屏東縣","宜蘭縣","花蓮縣",
  "台東縣","澎湖縣","金門縣","連江縣"
];

// 建立 city → district map
function buildCityDistrictMap(list) {
  cityDistrictMap = {};

  list.forEach(d => {
    const addr = d["醫事機構地址"];
    if (!addr) return;

    // 找城市
    const city = allCities.find(c => addr.startsWith(c)) || "其他";

    // 找地區
    const after = addr.replace(city, "");
    const match = after.match(/[\u4e00-\u9fa5]{1,4}(區|鄉|鎮|市)/);
    const district = match ? match[0] : "其他";

    if (!cityDistrictMap[city]) cityDistrictMap[city] = new Set();
    cityDistrictMap[city].add(district);
  });
}

// 填入縣市
function populateCityList() {
  const sel = document.getElementById("citySelect");
  sel.innerHTML = `<option value="全部">全部</option>`;

  Object.keys(cityDistrictMap).forEach(city => {
    const opt = document.createElement("option");
    opt.value = opt.textContent = city;
    sel.appendChild(opt);
  });
}

// 填入地區
function populateDistrictList() {
  const city = document.getElementById("citySelect").value;
  const sel = document.getElementById("districtSelect");
  sel.innerHTML = `<option value="全部">全部</option>`;

  if (city !== "全部" && cityDistrictMap[city]) {
    [...cityDistrictMap[city]].forEach(d => {
      const opt = document.createElement("option");
      opt.value = opt.textContent = d;
      sel.appendChild(opt);
    });
  }

  // ★ 即時塞選（你說的功能）
  searchData();
}
// =============================================================
// Part 3/6 — 快速分類按鈕 + 表格渲染 + 分頁 + 動畫
// =============================================================

// =========================
// 快速分類（全部 / 醫院 / 診所 / 護理之家）
// =========================
function quickFilter(type) {
  let keywords = [];

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
    currentData = allData.filter(d =>
      keywords.some(k => (d["醫事機構名稱"] || "").includes(k))
    );
  }

  currentPage = 1;
  document.getElementById("status").textContent =
    `顯示類別：${type}（${currentData.length} 筆）`;

  document.querySelectorAll(".filter-btn").forEach(btn =>
    btn.classList.remove("active")
  );
  document
    .querySelector(`.filter-btn[data-type="${type}"]`)
    .classList.add("active");

  smoothRender(renderTablePage);
}

// =========================
// 表格渲染
// =========================
function renderTablePage() {
  const tbody = document.querySelector("#resultTable tbody");
  tbody.innerHTML = "";

  if (currentData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">查無資料</td></tr>`;
    document.getElementById("pagination").innerHTML = "";
    return;
  }

  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, currentData.length);
  const pageData = currentData.slice(start, end);

  for (const d of pageData) {
    const addr = d["醫事機構地址"];
    const phone = d["醫事機構電話"];
    const mapUrl =
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d["醫事機構名稱"]}</td>
      <td><a href="${mapUrl}" target="_blank">${addr}</a></td>
      <td><a href="tel:${phone}" style="color:var(--link-color);text-decoration:none;">
        ${phone}</a>
      </td>
      <td>${d["整合團隊名稱"]}</td>
      <td>${d["來源"]}</td>
    `;
    tbody.appendChild(tr);
  }

  renderPagination();
}

// =========================
// 分頁
// =========================
function renderPagination() {
  const pageCount = Math.ceil(currentData.length / pageSize);
  const box = document.getElementById("pagination");
  box.innerHTML = "";

  if (pageCount <= 1) return;

  const prev = document.createElement("button");
  prev.textContent = "← 上一頁";
  prev.disabled = currentPage === 1;
  prev.onclick = () => {
    currentPage--;
    smoothRender(renderTablePage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const next = document.createElement("button");
  next.textContent = "下一頁 →";
  next.disabled = currentPage === pageCount;
  next.onclick = () => {
    currentPage++;
    smoothRender(renderTablePage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const info = document.createElement("span");
  info.textContent = `第 ${currentPage} / ${pageCount} 頁`;

  box.appendChild(prev);
  box.appendChild(info);
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
// Part 4/6 — Modal 詳細視窗 + 服務項目 ✔✖ （專業美化版）
// =============================================================

// Modal 初始化
function setupModal() {
  const modal = document.getElementById("detailModal");
  const closeBtn = document.getElementById("closeModal");

  closeBtn.onclick = () => (modal.style.display = "none");

  window.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
  };
}

// 打開 modal + 填資料
function showDetails(d) {
  const modal = document.getElementById("detailModal");

  document.getElementById("modalTitle").textContent =
    d["醫事機構名稱"] || "無";
  document.getElementById("modalCode").textContent =
    d["醫事機構代碼"] || "無";
  document.getElementById("modalTeam").textContent =
    d["整合團隊名稱"] || "無";
  document.getElementById("modalAddr").textContent =
    d["醫事機構地址"] || "無";

  // 電話
  const phone = d["醫事機構電話"] || "";
  document.getElementById("modalPhone").innerHTML = phone
    ? `<a href="tel:${phone}" style="color:var(--link-color);text-decoration:none;">${phone}</a>`
    : "無";

  document.getElementById("modalSource").textContent =
    d["來源"] || "無";

  // ------------------------------
  // 服務項目（✔ / ✖）
  // ------------------------------
  const modalContent = modal.querySelector(".modal-content");

  // 清除舊表格
  modalContent.querySelectorAll(".service-table, .service-msg")
    .forEach(el => el.remove());

  // 找到該機構的服務資料
  const found = serviceData.find(s =>
    s["醫事機構名稱"] &&
    d["醫事機構名稱"] &&
    s["醫事機構名稱"].includes(d["醫事機構名稱"])
  );

  const container = document.createElement("div");

  if (found) {
    let table = `
      <table class="service-table">
        <thead>
          <tr><th>項目</th><th>提供</th></tr>
        </thead>
        <tbody>
    `;

    // 服務項目（前 4 欄不是項目）
    const keys = Object.keys(found).slice(4);

    keys.forEach(k => {
      if (!k.trim()) return;

      const value = found[k];

      const icon =
        value == 1
          ? "<span class='yes-icon'>✔</span>"
          : "<span class='no-icon'>✖</span>";

      table += `
        <tr>
          <td>${k}</td>
          <td>${icon}</td>
        </tr>
      `;
    });

    table += "</tbody></table>";
    container.innerHTML = table;
  } else {
    container.innerHTML =
      `<p class="service-msg" style="text-align:center;margin-top:10px;">
        無服務項目資料
      </p>`;
  }

  modalContent.appendChild(container);
  modal.style.display = "block";
}
// =============================================================
// Part 5/6 — 深色模式 + Autocomplete + 搜尋邏輯
// =============================================================

// =========================
// 深色模式
// =========================
function initTheme() {
  const btn = document.getElementById("themeToggle");
  const saved = localStorage.getItem("theme");

  if (saved === "dark") document.body.classList.add("dark");

  btn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem(
      "theme",
      document.body.classList.contains("dark") ? "dark" : "light"
    );
  });
}

// =========================
// Autocomplete 自動完成
// =========================
function setupAutocomplete() {
  const input = document.getElementById("keyword");
  const box = document.createElement("div");

  box.id = "suggestionBox";
  box.style.position = "absolute";
  box.style.background = "white";
  box.style.border = "1px solid #ccc";
  box.style.borderRadius = "5px";
  box.style.display = "none";
  box.style.zIndex = "999";
  box.style.boxShadow = "0 3px 6px rgba(0,0,0,0.2)";

  document.body.appendChild(box);

  input.addEventListener("input", () => {
    const val = input.value.trim();
    box.innerHTML = "";

    if (!val) return (box.style.display = "none");

    const matches = allData
      .flatMap(d => [
        d["醫事機構名稱"],
        d["醫事機構地址"],
        d["醫事機構電話"],
        d["整合團隊名稱"]
      ])
      .filter(x => x && x.includes(val));

    const unique = [...new Set(matches)].slice(0, 10);

    unique.forEach(name => {
      const div = document.createElement("div");
      div.style.padding = "8px";
      div.style.cursor = "pointer";
      div.textContent = name;

      div.addEventListener("mouseover", () =>
        (div.style.background = "#e6fffa")
      );
      div.addEventListener("mouseout", () =>
        (div.style.background = "transparent")
      );
      div.addEventListener("click", () => {
        input.value = name;
        box.style.display = "none";
        searchData();
      });

      box.appendChild(div);
    });

    if (unique.length) {
      const rect = input.getBoundingClientRect();
      box.style.left = rect.left + "px";
      box.style.top = rect.bottom + window.scrollY + "px";
      box.style.width = rect.width + "px";
      box.style.display = "block";
    } else {
      box.style.display = "none";
    }
  });

  document.addEventListener("click", e => {
    if (e.target !== input && e.target.parentNode !== box)
      box.style.display = "none";
  });
}

// =========================
// 搜尋（縣市 + 地區 + 關鍵字）
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
  });

  currentPage = 1;
  document.getElementById("status").textContent =
    `共 ${currentData.length} 筆資料`;

  smoothRender(renderTablePage);
}
// =============================================================
// Part 6/6 — 初始化流程（所有功能綁定）
// =============================================================
document.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  setupModal();
  setupAutocomplete();

  // =========================
  // 1. 下載來源 CSV
  // =========================
  const files = [
    { path: "A21030000I-D2000H-001.csv", source: "居家醫療機構" },
    { path: "A21030000I-D2000I-001.csv", source: "安寧照護／護理之家" }
  ];

  let merged = [];

  for (const f of files) {
    try {
      const r = await fetch(f.path);
      const t = await r.text();
      const json = csvToJson(t).map(x => ({ ...x, 來源: f.source }));
      merged = merged.concat(json);
    } catch (e) {
      console.error("資料載入失敗：", f.path, e);
    }
  }

  allData = merged;

  // =========================
  // 2. 地址正規化 + 城市／地區解析
  // =========================
  normalizeAddress(allData);
  buildCityDistrictMap(allData);

  // =========================
  // 3. 初始化縣市／地區
  // =========================
  populateCityList();
  populateDistrictList();

  // =========================
  // 4. 讀取服務項目資料 services.csv
  // =========================
  try {
    const r = await fetch(
      "https://raw.githubusercontent.com/kileyou123-maker/health-dashboard/refs/heads/main/services.csv"
    );
    const t = await r.text();
    serviceData = csvToJson(t);
  } catch (e) {
    console.error("服務資料載入失敗：", e);
  }

  // =========================
  // 5. 初次渲染列表
  // =========================
  currentData = allData;
  renderTablePage();

  // =========================
  // 6. 綁定事件（縣市 → 地區 即時刷新）
  // =========================
  document.getElementById("citySelect").addEventListener("change", () => {
    populateDistrictList();
    searchData();   // ← 即時塞選（你想要的）
  });

  document.getElementById("districtSelect").addEventListener("change", () => {
    searchData();   // ← 即時塞選
  });

  // =========================
  // 7. 搜尋按鈕
  // =========================
  document.getElementById("searchBtn").addEventListener("click", searchData);

  // =========================
  // 8. Enter 觸發搜尋
  // =========================
  document.getElementById("keyword").addEventListener("keypress", e => {
    if (e.key === "Enter") searchData();
  });

  // =========================
  // 9. 點表格列 → 開啟 Modal
  // =========================
  document.addEventListener("click", e => {
    const row = e.target.closest("#resultTable tbody tr");
    if (!row) return;

    const name = row.children[0].innerText.trim();
    const found = currentData.find(d => d["醫事機構名稱"] === name);

    if (found) showDetails(found);
  });

  // =========================
  // 10. 快速分類按鈕
  // =========================
  document.querySelectorAll(".filter-btn").forEach(btn =>
    btn.addEventListener("click", () => quickFilter(btn.dataset.type))
  );
});
