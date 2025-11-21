let allData = [];
let cityDistrictMap = {};
let currentPage = 1;
const pageSize = 50;
let currentData = [];
let serviceData = [];

/* ===========================
   初始化
=========================== */
document.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  setupModal();

  /* 載入兩個資料表 */
  const files = [
    { path: "A21030000I-D2000H-001.csv", source: "居家醫療機構" },
    { path: "A21030000I-D2000I-001.csv", source: "安寧照護／護理之家" },
  ];

  let merged = [];
  for (const f of files) {
    const res = await fetch(f.path);
    const text = await res.text();
    const json = csvToJson(text).map((item) => ({ ...item, 來源: f.source }));
    merged = merged.concat(json);
  }

  allData = merged;
  normalizeAddress(allData);
  buildCityDistrictMap(allData);
  populateCityList();
  populateDistrictList();
  setupAutocomplete();

  /* 載入服務資料 */
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/kileyou123-maker/health-dashboard/refs/heads/main/services.csv"
    );
    const text = await res.text();
    serviceData = csvToJson(text);
  } catch (e) {
    console.error("服務資料載入失敗", e);
  }

  currentData = allData;
  renderTablePage();

  /* 事件註冊 */
  document.getElementById("citySelect").addEventListener("change", populateDistrictList);
  document.getElementById("searchBtn").addEventListener("click", searchData);
  document.getElementById("keyword").addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchData();
  });

  document.querySelectorAll(".filter-btn").forEach((btn) =>
    btn.addEventListener("click", () => quickFilter(btn.dataset.type))
  );

  /* 點表格列 → 詳細資料 */
  document.addEventListener("click", (e) => {
    const row = e.target.closest("#resultTable tbody tr");
    if (!row) return;
    const name = row.children[0]?.innerText?.trim();
    const found = currentData.find((d) => d["醫事機構名稱"] === name);
    if (found) showDetails(found);
  });
});

/* ===========================
   CSV → JSON
=========================== */
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

/* ===========================
   地址清理（臺 → 台）
=========================== */
function normalizeAddress(data) {
  data.forEach((d) => {
    if (d["醫事機構地址"])
      d["醫事機構地址"] = d["醫事機構地址"].replaceAll("臺", "台").trim();
  });
}

/* ===========================
   城市 / 地區生成
=========================== */
const allCities = [
  "台北市","新北市","桃園市","台中市","台南市","高雄市","基隆市","新竹市","嘉義市",
  "新竹縣","苗栗縣","彰化縣","南投縣","雲林縣","嘉義縣","屏東縣","宜蘭縣","花蓮縣",
  "台東縣","澎湖縣","金門縣","連江縣",
];

function buildCityDistrictMap(data) {
  data.forEach((d) => {
    const addr = d["醫事機構地址"];
    if (!addr) return;

    const city = allCities.find((c) => addr.startsWith(c)) || "其他";
    const after = addr.replace(city, "");
    const match = after.match(/[\u4e00-\u9fa5]{1,3}(區|鎮|鄉|市)/);
    const district = match ? match[0] : "其他";

    if (!cityDistrictMap[city]) cityDistrictMap[city] = new Set();
    cityDistrictMap[city].add(district);
  });
}

function populateCityList() {
  const citySel = document.getElementById("citySelect");
  citySel.innerHTML = '<option value="全部">全部</option>';
  Object.keys(cityDistrictMap).forEach((city) => {
    const opt = document.createElement("option");
    opt.value = city;
    opt.textContent = city;
    citySel.appendChild(opt);
  });
}

function populateDistrictList() {
  const city = document.getElementById("citySelect").value;
  const districtSel = document.getElementById("districtSelect");

  districtSel.innerHTML = '<option value="全部">全部</option>';

  if (city !== "全部" && cityDistrictMap[city]) {
    [...cityDistrictMap[city]].forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      districtSel.appendChild(opt);
    });
  }
}

/* ===========================
   搜尋
=========================== */
function searchData() {
  const city = document.getElementById("citySelect").value;
  const district = document.getElementById("districtSelect").value;
  const keyword = document.getElementById("keyword").value.trim();

  currentData = allData.filter((d) => {
    const addr = d["醫事機構地址"] || "";
    const name = d["醫事機構名稱"] || "";
    const phone = d["醫事機構電話"] || "";
    const team = d["整合團隊名稱"] || "";

    return (
      (city === "全部" || addr.includes(city)) &&
      (district === "全部" || addr.includes(district)) &&
      (!keyword ||
        name.includes(keyword) ||
        addr.includes(keyword) ||
        phone.includes(keyword) ||
        team.includes(keyword))
    );
  });

  currentPage = 1;

  document.getElementById("status").textContent =
    `共找到 ${currentData.length} 筆結果`;

  smoothRender(renderTablePage);
}

/* ===========================
   類別快速篩選
=========================== */
function quickFilter(type) {
  let filtered;

  if (type === "全部") filtered = allData;
  else {
    const keywords = {
      醫院: ["醫院"],
      診所: ["診所", "醫療"],
      護理之家: ["護理", "安養", "養護"],
    }[type] || [];

    filtered = allData.filter((d) =>
      keywords.some((k) => (d["醫事機構名稱"] || "").includes(k))
    );
  }

  currentData = filtered;
  currentPage = 1;

  document.getElementById("status").textContent =
    `顯示類型：${type}（共 ${filtered.length} 筆）`;

  smoothRender(renderTablePage);
}

/* ===========================
   表格渲染
=========================== */
function renderTablePage() {
  const tbody = document.querySelector("#resultTable tbody");
  tbody.innerHTML = "";

  if (currentData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5">查無資料</td></tr>';
    document.getElementById("pagination").innerHTML = "";
    return;
  }

  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, currentData.length);
  const pageData = currentData.slice(start, end);

  for (const d of pageData) {
    const addr = d["醫事機構地址"];
    const mapUrl =
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${d["醫事機構名稱"]}</td>
      <td><a href="${mapUrl}" target="_blank">${addr}</a></td>
      <td><a href="tel:${d["醫事機構電話"]}" style="color:${getComputedStyle(document.body).getPropertyValue('--link-color')};text-decoration:none;">${d["醫事機構電話"]}</a></td>
      <td>${d["整合團隊名稱"]}</td>
      <td>${d["來源"]}</td>
    `;
    tbody.appendChild(row);
  }

  renderPagination();
}

/* ===========================
   分頁
=========================== */
function renderPagination() {
  const pageCount = Math.ceil(currentData.length / pageSize);
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";

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

  pagination.appendChild(prev);
  pagination.appendChild(info);
  pagination.appendChild(next);
}

/* ===========================
   ★ 修正版 smoothRender ★
=========================== */
function smoothRender(callback) {
  const table = document.getElementById("resultTable");

  // 淡出
  table.style.opacity = "0";
  table.style.transform = "translateY(15px)";

  setTimeout(() => {
    callback(); // 更新內容

    requestAnimationFrame(() => {
      // 淡入
      table.style.opacity = "1";
      table.style.transform = "translateY(0)";
    });
  }, 250);
}

/* ===========================
   Modal
=========================== */
function setupModal() {
  const modal = document.getElementById("detailModal");
  const closeBtn = document.getElementById("closeModal");

  closeBtn.onclick = () => (modal.style.display = "none");
  window.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
  };
}

function showDetails(d) {
  const modal = document.getElementById("detailModal");

  document.getElementById("modalTitle").textContent = d["醫事機構名稱"] || "無";
  document.getElementById("modalCode").textContent = d["醫事機構代碼"] || "無";
  document.getElementById("modalTeam").textContent = d["整合團隊名稱"] || "無";
  document.getElementById("modalAddr").textContent = d["醫事機構地址"] || "無";
  document.getElementById("modalPhone").innerHTML = d["醫事機構電話"]
    ? `<a href="tel:${d["醫事機構電話"]}" style="color:${getComputedStyle(document.body).getPropertyValue('--link-color')};text-decoration:none;">${d["醫事機構電話"]}</a>`
    : "無";
  document.getElementById("modalSource").textContent = d["來源"] || "無";

  /* 服務項目 */
  const modalContent = modal.querySelector(".modal-content");
  modalContent.querySelectorAll(".service-table, p.temp-msg").forEach((el) => el.remove());

  const found = serviceData.find(
    (s) => s["醫事機構名稱"] && s["醫事機構名稱"].includes(d["醫事機構名稱"])
  );

  const section = document.createElement("div");

  if (found) {
    let table = `
      <table class="service-table">
        <thead><tr><th>項目</th><th>是否提供</th></tr></thead>
        <tbody>
    `;

    const keys = Object.keys(found).slice(4);

    keys.forEach((k) => {
      if (!k.trim()) return;
      table += `
      <tr>
        <td>${k}</td>
        <td class="${found[k] == 1 ? "yes-icon" : "no-icon"}"></td>
      </tr>`;

    });

    table += `</tbody></table>`;
    section.innerHTML = table;
  } else {
    section.innerHTML = `<p class="temp-msg" style="text-align:center;">暫無服務資料</p>`;
  }

  modalContent.appendChild(section);
  modal.style.display = "block";
}

/* ===========================
   深色模式
=========================== */
function initTheme() {
  const btn = document.getElementById("themeToggle");
  const saved = localStorage.getItem("theme");

  if (saved === "dark") document.body.classList.add("dark");

  btn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
  });
}

/* ===========================
   自動提示
=========================== */
function setupAutocomplete() {
  const input = document.getElementById("keyword");
  const suggestionBox = document.createElement("div");

  suggestionBox.id = "suggestionBox";
  suggestionBox.style.position = "absolute";
  suggestionBox.style.background = "white";
  suggestionBox.style.border = "1px solid #ccc";
  suggestionBox.style.borderRadius = "5px";
  suggestionBox.style.zIndex = "999";
  suggestionBox.style.display = "none";
  suggestionBox.style.boxShadow = "0 3px 6px rgba(0,0,0,0.2)";

  document.body.appendChild(suggestionBox);

  input.addEventListener("input", () => {
    const val = input.value.trim();
    suggestionBox.innerHTML = "";

    if (!val) return (suggestionBox.style.display = "none");

    const matches = allData
      .map((d) => d["醫事機構名稱"])
      .filter((n) => n && n.includes(val));

    const unique = [...new Set(matches)].slice(0, 8);

    unique.forEach((name) => {
      const div = document.createElement("div");
      div.textContent = name;
      div.style.padding = "8px";
      div.style.cursor = "pointer";

      div.addEventListener("mouseover", () => (div.style.background = "#e6fffa"));
      div.addEventListener("mouseout", () => (div.style.background = "transparent"));

      div.addEventListener("click", () => {
        input.value = name;
        suggestionBox.style.display = "none";
        searchData();
      });

      suggestionBox.appendChild(div);
    });

    if (unique.length) {
      const rect = input.getBoundingClientRect();
      suggestionBox.style.left = rect.left + "px";
      suggestionBox.style.top = rect.bottom + window.scrollY + "px";
      suggestionBox.style.width = rect.width + "px";
      suggestionBox.style.display = "block";
    } else {
      suggestionBox.style.display = "none";
    }
  });

  document.addEventListener("click", (e) => {
    if (e.target !== input && e.target.parentNode !== suggestionBox)
      suggestionBox.style.display = "none";
  });
}

