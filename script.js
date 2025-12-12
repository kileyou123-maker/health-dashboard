// =============================================================
// script.js — CLEAN STABLE VERSION
// =============================================================

let allData = [];
let serviceData = [];
let filteredData = [];
let currentPage = 1;
const pageSize = 30;

// 狀態
let currentCity = "全部";
let currentDistrict = "全部";
let currentType = "全部";
let currentKeyword = "";

// =============================================================
// CSV 解析
// =============================================================
function csvToJson(csv) {
  const lines = csv.split("\n").filter(l => l.trim());
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(",");
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i]?.trim() || "");
    return obj;
  });
}

// =============================================================
// 地址正規化
// =============================================================
function normalizeAddress(list) {
  list.forEach(d => {
    if (d["醫事機構地址"]) {
      d["醫事機構地址"] =
        d["醫事機構地址"].replaceAll("臺", "台").trim();
    }
  });
}

// =============================================================
// 城市 / 地區
// =============================================================
const cities = [
  "台北市","新北市","桃園市","台中市","台南市","高雄市",
  "基隆市","新竹市","嘉義市","新竹縣","苗栗縣","彰化縣",
  "南投縣","雲林縣","嘉義縣","屏東縣","宜蘭縣","花蓮縣",
  "台東縣","澎湖縣","金門縣","連江縣"
];

function getCity(addr) {
  return cities.find(c => addr.startsWith(c)) || "其他";
}

function getDistrict(addr, city) {
  const after = addr.replace(city, "");
  const m = after.match(/[\u4e00-\u9fa5]{1,4}(區|鄉|鎮|市)/);
  return m ? m[0] : "其他";
}

function populateCityDistrict() {
  const citySelect = document.getElementById("citySelect");
  const districtSelect = document.getElementById("districtSelect");

  const map = {};
  allData.forEach(d => {
    const addr = d["醫事機構地址"] || "";
    const city = getCity(addr);
    const dist = getDistrict(addr, city);
    map[city] = map[city] || new Set();
    map[city].add(dist);
  });

  citySelect.innerHTML = `<option>全部</option>`;
  Object.keys(map).forEach(c => {
    const o = document.createElement("option");
    o.textContent = c;
    citySelect.appendChild(o);
  });

  citySelect.onchange = () => {
    currentCity = citySelect.value;
    currentDistrict = "全部";
    districtSelect.innerHTML = `<option>全部</option>`;
    if (map[currentCity]) {
      [...map[currentCity]].forEach(d => {
        const o = document.createElement("option");
        o.textContent = d;
        districtSelect.appendChild(o);
      });
    }
    applyFilters();
  };

  districtSelect.onchange = () => {
    currentDistrict = districtSelect.value;
    applyFilters();
  };
}

// =============================================================
// 核心篩選
// =============================================================
function applyFilters() {
  filteredData = allData.filter(d => {
    const addr = d["醫事機構地址"] || "";
    const name = d["醫事機構名稱"] || "";
    const team = d["整合團隊名稱"] || "";

    if (currentCity !== "全部" && !addr.includes(currentCity)) return false;
    if (currentDistrict !== "全部" && !addr.includes(currentDistrict)) return false;

    if (currentType !== "全部") {
      if (currentType === "醫院" && !name.includes("醫院")) return false;
      if (currentType === "診所" && !["診所","醫療"].some(k => name.includes(k))) return false;
      if (currentType === "護理之家" && !["護理","安養","養護"].some(k => name.includes(k))) return false;
    }

    if (currentKeyword) {
      if (![addr,name,team].some(x => x.includes(currentKeyword))) return false;
    }

    return true;
  });

  currentPage = 1;
  renderTable();
}

// =============================================================
// 表格 / 分頁
// =============================================================
function renderTable() {
  const tbody = document.querySelector("#resultTable tbody");
  tbody.innerHTML = "";

  const start = (currentPage - 1) * pageSize;
  const pageData = filteredData.slice(start, start + pageSize);

  pageData.forEach(d => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d["醫事機構名稱"]}</td>
      <td>${d["醫事機構地址"]}</td>
      <td>${d["醫事機構電話"]}</td>
      <td>${d["整合團隊名稱"]}</td>
      <td>${d["來源"]}</td>
    `;
    tr.onclick = () => showModal(d);
    tbody.appendChild(tr);
  });

  document.getElementById("status").textContent =
    `共 ${filteredData.length} 筆資料`;
}

// =============================================================
// 快速分類
// =============================================================
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.onclick = () => {
    currentType = btn.dataset.type;
    document.querySelectorAll(".filter-btn")
      .forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    applyFilters();
  };
});

// =============================================================
// 搜尋
// =============================================================
document.getElementById("searchBtn").onclick = () => {
  currentKeyword = document.getElementById("keyword").value.trim();
  applyFilters();
};

// =============================================================
// Modal
// =============================================================
function showModal(d) {
  const modal = document.getElementById("detailModal");
  modal.style.display = "block";
  document.getElementById("modalTitle").textContent = d["醫事機構名稱"];
  document.getElementById("modalAddr").textContent = d["醫事機構地址"];
}

// =============================================================
// 初始化
// =============================================================
document.addEventListener("DOMContentLoaded", async () => {
  const files = [
    { path: "A21030000I-D2000H-001.csv", source: "居家醫療機構" },
    { path: "A21030000I-D2000I-001.csv", source: "安寧照護／護理之家" }
  ];

  for (const f of files) {
    const r = await fetch(f.path);
    const t = await r.text();
    allData.push(...csvToJson(t).map(x => ({ ...x, 來源: f.source })));
  }

  normalizeAddress(allData);
  populateCityDistrict();
  filteredData = allData;
  renderTable();
});
