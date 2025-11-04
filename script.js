let allData = [];
let cityDistrictMap = {};
let currentPage = 1;
const pageSize = 50;
let currentData = [];

document.addEventListener("DOMContentLoaded", async () => {
  initTheme();

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
  setupModal();
  setupAutocomplete();

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

function normalizeAddress(data) {
  data.forEach((d) => {
    if (d["醫事機構地址"]) d["醫事機構地址"] = d["醫事機構地址"].replaceAll("臺", "台").trim();
  });
}

/* 城市 / 地區 */
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
  populateDistrictList();
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

/* 搜尋 */
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

/* 分頁渲染 */
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

  table.style.opacity = "0";
  table.style.transform = "translateY(10px)";
  requestAnimationFrame(() => {
    table.style.transition = "opacity 0.4s ease, transform 0.4s ease";
    table.style.opacity = "1";
    table.style.transform = "translateY(0)";
  });
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
  prev.onclick =
