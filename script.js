/**************************************************
 *  全台居家醫療查詢系統 — 精簡穩定版 Script.js
 * （推薦：最快、不會壞、功能完整）
 **************************************************/

let allData = [];
let cityDistrictMap = {};
let currentPage = 1;
const pageSize = 50;
let currentData = [];
let serviceData = [];

/* ===========================
   欄位統一（兩個 CSV 格式不同）
=========================== */
function normalizeFields(d) {
  return {
    名稱: d["醫事機構名稱"] || d["名稱"] || "",
    地址: d["醫事機構地址"] || d["地址"] || "",
    電話: d["醫事機構電話"] || d["電話"] || "",
    團隊: d["整合團隊名稱"] || d["團隊"] || "",
    代碼: d["醫事機構代碼"] || d["代碼"] || "",
    來源: d["來源"] || "",
  };
}

/* ===========================
   地址清理（臺 → 台）
=========================== */
function normalizeAddress(data) {
  data.forEach((d) => {
    if (d.地址) d.地址 = d.地址.replaceAll("臺", "台").trim();
  });
}

/* ===========================
   ✨ 建立「縣市 → 區域」Map
=========================== */
function buildCityDistrictMap(data) {
  cityDistrictMap = {};

  data.forEach((d) => {
    const addr = d.地址;
    if (!addr) return;

    // 找縣市
    const cityMatch = addr.match(/^(台北市|新北市|桃園市|台中市|台南市|高雄市|基隆市|新竹市|嘉義市|新竹縣|苗栗縣|彰化縣|南投縣|雲林縣|嘉義縣|屏東縣|宜蘭縣|花蓮縣|台東縣|澎湖縣|金門縣|連江縣)/);
    const city = cityMatch ? cityMatch[0] : "其他";

    // 找行政區
    const distMatch = addr.replace(city, "").match(/[\u4e00-\u9fa5]{1,3}(區|鎮|鄉|市)/);
    const district = distMatch ? distMatch[0] : "其他";

    if (!cityDistrictMap[city]) cityDistrictMap[city] = new Set();
    cityDistrictMap[city].add(district);
  });
}

/* ===========================
   城市選單
=========================== */
function populateCityList() {
  const sel = document.getElementById("citySelect");
  sel.innerHTML = '<option value="全部">全部</option>';

  Object.keys(cityDistrictMap).forEach((city) => {
    const opt = document.createElement("option");
    opt.value = city;
    opt.textContent = city;
    sel.appendChild(opt);
  });
}

/* ===========================
   地區選單
=========================== */
function populateDistrictList() {
  const city = document.getElementById("citySelect").value;
  const sel = document.getElementById("districtSelect");

  sel.innerHTML = '<option value="全部">全部</option>';

  if (city !== "全部" && cityDistrictMap[city]) {
    [...cityDistrictMap[city]].forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      sel.appendChild(opt);
    });
  }
}

/**************************************************
 * 初始化
 **************************************************/
document.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  setupModal();

  // 載入 2 個資料表
  const files = [
    { path: "A21030000I-D2000H-001.csv", source: "居家醫療機構" },
    { path: "A21030000I-D2000I-001.csv", source: "安寧照護／護理之家" },
  ];

  let merged = [];

  for (const f of files) {
    const res = await fetch(f.path);
    const text = await res.text();
    const json = csvToJson(text).map((item) => ({ ...item, 來源: f.source }));
    json.forEach((r) => merged.push(normalizeFields(r)));
  }

  allData = merged;
  normalizeAddress(allData);

  // 建立縣市 / 地區
  buildCityDistrictMap(allData);
  populateCityList();
  populateDistrictList();

  // 服務資料
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/kileyou123-maker/health-dashboard/refs/heads/main/services.csv"
    );
    serviceData = csvToJson(await res.text());
  } catch (e) {
    console.error("服務資料載入失敗", e);
  }

  currentData = allData;
  renderTablePage();

  /* 事件綁定 */
  document.getElementById("citySelect").addEventListener("change", () => {
    populateDistrictList();
    applyCityDistrictFilter();
  });

  document.getElementById("districtSelect").addEventListener("change", applyCityDistrictFilter);

  document.getElementById("keyword").addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchData();
  });

  document.getElementById("searchBtn").addEventListener("click", searchData);

  document.querySelectorAll(".filter-btn").forEach((btn) =>
    btn.addEventListener("click", () => quickFilter(btn.dataset.type))
  );

  /* 點表格列 → 顯示 Modal */
  document.addEventListener("click", (e) => {
    const row = e.target.closest("#resultTable tbody tr");
    if (!row) return;

    const name = row.dataset.name;
    const found = currentData.find((d) => d.名稱 === name);
    if (found) showDetails(found);
  });
});

/**************************************************
 * CSV 轉 JSON
 **************************************************/
function csvToJson(csv) {
  const lines = csv.split("\n").filter((l) => l.trim());
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const obj = {};
    headers.forEach((h, i) => (obj[h] = values[i] ? values[i].trim() : ""));
    return obj;
  });
}

/**************************************************
 * 搜尋
 **************************************************/
function searchData() {
  const city = document.getElementById("citySelect").value;
  const district = document.getElementById("districtSelect").value;
  const key = document.getElementById("keyword").value.trim();

  currentData = allData.filter((d) => {
    if (city !== "全部" && !d.地址.includes(city)) return false;
    if (district !== "全部" && !d.地址.includes(district)) return false;

    if (key) {
      const full = `${d.名稱} ${d.地址} ${d.電話} ${d.團隊}`;
      if (!full.includes(key)) return false;
    }

    return true;
  });

  currentPage = 1;
  smoothRender(renderTablePage);
}

/**************************************************
 * 縣市 / 地區即時篩選
 **************************************************/
function applyCityDistrictFilter() {
  const city = document.getElementById("citySelect").value;
  const district = document.getElementById("districtSelect").value;

  currentData = allData.filter((d) => {
    if (city !== "全部" && !d.地址.includes(city)) return false;
    if (district !== "全部" && !d.地址.includes(district)) return false;
    return true;
  });

  currentPage = 1;
  smoothRender(renderTablePage);
}

/**************************************************
 * 類別快速篩選（醫院 / 診所 / 護理之家）
 **************************************************/
function quickFilter(type) {
  let filtered = [];

  if (type === "全部") filtered = allData;
  else {
    const keys = {
      醫院: ["醫院"],
      診所: ["診所", "醫療"],
      護理之家: ["護理", "安養"],
    }[type];

    filtered = allData.filter((d) => keys.some((k) => d.名稱.includes(k)));
  }

  currentData = filtered;
  currentPage = 1;
  smoothRender(renderTablePage);
}

/**************************************************
 * 表格渲染（不會空白）
 **************************************************/
function renderTablePage() {
  const tbody = document.querySelector("#resultTable tbody");
  tbody.innerHTML = "";

  if (!currentData.length) {
    tbody.innerHTML = `<tr><td colspan="5">查無資料</td></tr>`;
    document.getElementById("pagination").innerHTML = "";
    return;
  }

  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, currentData.length);
  const pageData = currentData.slice(start, end);

  pageData.forEach((d) => {
    const row = document.createElement("tr");
    row.dataset.name = d.名稱;

    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      d.地址
    )}`;

    row.innerHTML = `
      <td>${d.名稱}</td>
      <td><a href="${mapUrl}" target="_blank">${d.地址}</a></td>
      <td><a href="tel:${d.電話}">${d.電話}</a></td>
      <td>${d.團隊}</td>
      <td>${d.來源}</td>
    `;

    tbody.appendChild(row);
  });

  renderPagination();
}

/**************************************************
 * 分頁
 **************************************************/
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
  };

  const next = document.createElement("button");
  next.textContent = "下一頁 →";
  next.disabled = currentPage === pageCount;
  next.onclick = () => {
    currentPage++;
    smoothRender(renderTablePage);
  };

  const info = document.createElement("span");
  info.textContent = `第 ${currentPage} / ${pageCount} 頁`;

  box.appendChild(prev);
  box.appendChild(info);
  box.appendChild(next);
}

/**************************************************
 * Modal
 **************************************************/
function setupModal() {
  const modal = document.getElementById("detailModal");
  const close = document.getElementById("closeModal");

  close.onclick = () => (modal.style.display = "none");
  window.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
  };
}

function showDetails(d) {
  const modal = document.getElementById("detailModal");

  document.getElementById("modalTitle").textContent = d.名稱;
  document.getElementById("modalCode").textContent = d.代碼;
  document.getElementById("modalTeam").textContent = d.團隊;
  document.getElementById("modalAddr").textContent = d.地址;
  document.getElementById("modalPhone").innerHTML =
    `<a href="tel:${d.電話}">${d.電話}</a>`;
  document.getElementById("modalSource").textContent = d.來源;

  /* 服務項目 */
  const modalContent = modal.querySelector(".modal-content");
  modalContent.querySelectorAll(".service-table, .service-msg").forEach((el) => el.remove());

  const found = serviceData.find(
    (s) => s["醫事機構名稱"] && d.名稱.includes(s["醫事機構名稱"])
  );

  const sec = document.createElement("div");

  if (found) {
    let table = `
      <table class="service-table">
        <thead><tr><th>項目</th><th>狀態</th></tr></thead>
        <tbody>
    `;

    Object.keys(found)
      .slice(4)
      .forEach((k) => {
        if (!k.trim()) return;
        const v = found[k];
        table += `<tr><td>${k}</td><td>${v == 1 ? "✔" : "✖"}</td></tr>`;
      });

    table += "</tbody></table>";
    sec.innerHTML = table;
  } else {
    sec.innerHTML = `<p class="service-msg">尚無服務項目資料</p>`;
  }

  modalContent.appendChild(sec);
  modal.style.display = "block";
}

/**************************************************
 * 自動提示 Autocomplete
 **************************************************/
function setupAutocomplete() {
  const input = document.getElementById("keyword");
  const box = document.createElement("div");

  box.id = "suggestionBox";
  box.style.position = "absolute";
  box.style.background = "white";
  box.style.border = "1px solid #ccc";
  box.style.borderRadius = "6px";
  box.style.boxShadow = "0 3px 6px rgba(0,0,0,0.2)";
  box.style.display = "none";
  box.style.zIndex = "999";

  document.body.appendChild(box);

  input.addEventListener("input", () => {
    const val = input.value.trim();
    box.innerHTML = "";
    if (!val) return (box.style.display = "none");

    const matches = allData
      .map((d) => d.名稱)
      .filter((name) => name.includes(val))
      .slice(0, 8);

    matches.forEach((name) => {
      const item = document.createElement("div");
      item.textContent = name;
      item.style.padding = "8px";
      item.style.cursor = "pointer";

      item.onclick = () => {
        input.value = name;
        box.style.display = "none";
        searchData();
      };

      item.onmouseover = () => (item.style.background = "#e6fffa");
      item.onmouseout = () => (item.style.background = "transparent");

      box.appendChild(item);
    });

    const rect = input.getBoundingClientRect();
    box.style.left = rect.left + "px";
    box.style.top = rect.bottom + window.scrollY + "px";
    box.style.width = rect.width + "px";
    box.style.display = "block";
  });

  document.addEventListener("click", (e) => {
    if (e.target !== input && e.target.parentNode !== box)
      box.style.display = "none";
  });
}

/**************************************************
 * 深色模式
 **************************************************/
function initTheme() {
  const btn = document.getElementById("themeToggle");
  const saved = localStorage.getItem("theme");

  if (saved === "dark") document.body.classList.add("dark");

  btn.onclick = () => {
    document.body.classList.toggle("dark");
    localStorage.setItem(
      "theme",
      document.body.classList.contains("dark") ? "dark" : "light"
    );
  };
}

/**************************************************
 * smoothRender（切換頁面滑順）
 **************************************************/
function smoothRender(callback) {
  const table = document.getElementById("resultTable");

  table.style.opacity = "0";
  setTimeout(() => {
    callback();
    table.style.opacity = "1";
  }, 150);
}
