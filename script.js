let allData = [];
let cityDistrictMap = {};
let currentPage = 1;
const pageSize = 50;
let currentData = [];
let servicesData = [];
let serviceHeaders = [];

// 初始化
document.addEventListener("DOMContentLoaded", async () => {
  initTheme();

  // 主資料載入
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

  await loadServices();
  setupModal();
  setupAutocomplete();

  currentData = allData;
  renderTablePage();

  // 綁定事件
  document.getElementById("citySelect").addEventListener("change", populateDistrictList);
  document.getElementById("searchBtn").addEventListener("click", searchData);
  document.getElementById("keyword").addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchData();
  });
  document.querySelectorAll(".filter-btn").forEach((btn) =>
    btn.addEventListener("click", () => quickFilter(btn.dataset.type))
  );
});

/* CSV轉JSON */
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

/* 服務資料載入 */
async function loadServices() {
  const url = "https://raw.githubusercontent.com/kileyou123-maker/health-dashboard/main/services.csv";
  const res = await fetch(url);
  const text = await res.text();
  const lines = text.split("\n").filter((l) => l.trim());
  serviceHeaders = lines[0].split(",").map((h) => h.trim());
  servicesData = lines.slice(1).map((l) => l.split(","));
}

/* 地址清理 */
function normalizeAddress(data) {
  data.forEach((d) => {
    if (d["醫事機構地址"]) d["醫事機構地址"] = d["醫事機構地址"].replaceAll("臺", "台").trim();
  });
}

/* 城市與地區 */
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

/* 搜尋功能 */
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
  document.getElementById("status").textContent = `共找到 ${currentData.length} 筆結果`;
  smoothRender(renderTablePage);
}

/* 快速篩選 */
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
  document.getElementById("status").textContent = `顯示類型：${type}（共 ${filtered.length} 筆）`;
  smoothRender(renderTablePage);
}

/* 表格渲染 */
function renderTablePage() {
  const tbody = document.querySelector("#resultTable tbody");
  tbody.innerHTML = "";
  const table = document.getElementById("resultTable");

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
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${d["醫事機構名稱"]}</td>
      <td><a href="${mapUrl}" target="_blank">${addr}</a></td>
      <td><a href="tel:${d["醫事機構電話"]}" style="color:#2b6cb0;text-decoration:none;">${d["醫事機構電話"]}</a></td>
      <td>${d["整合團隊名稱"]}</td>
      <td>${d["來源"]}</td>`;
    row.addEventListener("click", () => showDetails(d));
    tbody.appendChild(row);
  }

  renderPagination();
}

/* 分頁控制 */
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
    smoothRender(() => {
      renderTablePage();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const next = document.createElement("button");
  next.textContent = "下一頁 →";
  next.disabled = currentPage === pageCount;
  next.onclick = () => {
    currentPage++;
    smoothRender(() => {
      renderTablePage();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const pageInfo = document.createElement("span");
  pageInfo.textContent = `第 ${currentPage} / ${pageCount} 頁`;

  pagination.appendChild(prev);
  pagination.appendChild(pageInfo);
  pagination.appendChild(next);
}

/* 動畫 */
function smoothRender(callback) {
  const table = document.getElementById("resultTable");
  table.style.transition = "opacity 0.25s ease, transform 0.25s ease";
  table.style.opacity = "0";
  table.style.transform = "translateY(15px)";
  setTimeout(callback, 250);
}

/* 詳細資料與服務表格 */
function showDetails(d) {
  const modal = document.getElementById("detailModal");
  document.getElementById("modalTitle").textContent = d["醫事機構名稱"] || "無";
  document.getElementById("modalCode").textContent = d["醫事機構代碼"] || "無";
  document.getElementById("modalTeam").textContent = d["整合團隊名稱"] || "無";
  document.getElementById("modalAddr").textContent = d["醫事機構地址"] || "無";
  document.getElementById("modalPhone").innerHTML = d["醫事機構電話"]
    ? `<a href="tel:${d["醫事機構電話"]}" style="color:#63b3ed;text-decoration:none;">${d["醫事機構電話"]}</a>`
    : "無";
  document.getElementById("modalSource").textContent = d["來源"] || "無";

  const old = document.getElementById("serviceTable");
  if (old) old.remove();

  const target = servicesData.find(r =>
    (r[1] || "").replace("臺", "台").includes((d["醫事機構名稱"] || "").replace("臺", "台"))
  );
  if (target) {
    const table = document.createElement("table");
    table.id = "serviceTable";
    table.style.width = "100%";
    table.style.marginTop = "10px";
    table.style.borderCollapse = "collapse";
    table.innerHTML = `<thead><tr><th>服務項目</th><th>是否提供</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector("tbody");

    for (let i = 4; i < serviceHeaders.length; i++) {
      const name = serviceHeaders[i];
      const val = target[i] && target[i].trim() === "1" ? "✅" : "❌";
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${name}</td><td style="text-align:center">${val}</td>`;
      tbody.appendChild(tr);
    }

    modal.querySelector(".modal-content").appendChild(table);
  }

  modal.style.display = "block";
}

/* 關閉彈窗 */
function setupModal() {
  const modal = document.getElementById("detailModal");
  const closeBtn = document.getElementById("closeModal");
  closeBtn.onclick = () => (modal.style.display = "none");
  window.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
  };
}

/* 主題切換 */
function initTheme() {
  const btn = document.getElementById("themeToggle");
  const saved = localStorage.getItem("theme");
  if (saved === "dark") document.body.classList.add("dark");
  btn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
  });
}

/* 關鍵字提示 */
function setupAutocomplete() {
  const input = document.getElementById("keyword");
  const box = document.createElement("div");
  box.id = "suggestionBox";
  box.style.position = "absolute";
  box.style.background = "var(--table-bg)";
  box.style.border = "1px solid var(--table-border)";
  box.style.borderRadius = "5px";
  box.style.display = "none";
  box.style.zIndex = "1000";
  document.body.appendChild(box);

  input.addEventListener("input", () => {
    const val = input.value.trim();
    box.innerHTML = "";
    if (!val) return (box.style.display = "none");

    const matches = allData
      .map((d) => d["醫事機構名稱"])
      .filter((n) => n && n.includes(val));
    const unique = [...new Set(matches)].slice(0, 6);
    unique.forEach((n) => {
      const div = document.createElement("div");
      div.textContent = n;
      div.style.padding = "8px";
      div.style.cursor = "pointer";
      div.addEventListener("click", () => {
        input.value = n;
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
    } else box.style.display = "none";
  });

  document.addEventListener("click", (e) => {
    if (e.target !== input && e.target.parentNode !== box)
      box.style.display = "none";
  });
}
