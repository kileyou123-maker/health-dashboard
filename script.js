let allData = [];
let cityDistrictMap = {};
let currentPage = 1;
const pageSize = 50;
let currentData = [];

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(initApp, 150); // 手機延後初始化，避免載入過快
});

async function initApp() {
  initTheme();

  const files = [
    {
      path: "https://raw.githubusercontent.com/kileyou123-maker/health-dashboard/main/A21030000I-D2000H-001.csv",
      source: "居家醫療機構",
    },
    {
      path: "https://raw.githubusercontent.com/kileyou123-maker/health-dashboard/main/A21030000I-D2000I-001.csv",
      source: "安寧照護／護理之家",
    },
  ];

  try {
    let merged = [];
    for (const f of files) {
      const res = await fetch(f.path, { cache: "no-store" });
      const text = await res.text();
      const json = csvToJson(text).map((item) => ({ ...item, 來源: f.source }));
      merged = merged.concat(json);
    }

    allData = merged;
    normalizeAddress(allData);
    buildCityDistrictMap(allData);
    populateCityList();
    populateDistrictList();
    setupModal();
    setupAutocomplete();

    // 初始顯示所有資料
    currentData = allData;
    renderTablePage();
  } catch (err) {
    console.error("資料載入失敗", err);
    document.getElementById("status").textContent = "⚠️ 資料載入失敗，請重新整理或檢查網路。";
  }

  // 事件註冊
  document.getElementById("citySelect").addEventListener("change", populateDistrictList);
  document.getElementById("searchBtn").addEventListener("click", searchData);
  document.getElementById("keyword").addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchData();
  });
  document.querySelectorAll(".filter-btn").forEach((btn) =>
    btn.addEventListener("click", () => quickFilter(btn.dataset.type))
  );
}

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

/* 地址清理 */
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
  const keyword = document.getElementById("keyword").value.trim().toLowerCase();

  currentData = allData.filter((d) => {
    const addr = d["醫事機構地址"] || "";
    const name = d["醫事機構名稱"] || "";
    const phone = d["醫事機構電話"] || "";
    const team = d["整合團隊名稱"] || "";
    return (
      (city === "全部" || addr.includes(city)) &&
      (district === "全部" || addr.includes(district)) &&
      (!keyword ||
        name.toLowerCase().includes(keyword) ||
        addr.toLowerCase().includes(keyword) ||
        phone.includes(keyword) ||
        team.toLowerCase().includes(keyword))
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

/* 分頁顯示 */
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
      <td data-label="醫事機構名稱">${d["醫事機構名稱"]}</td>
      <td data-label="地址"><a href="${mapUrl}" target="_blank">${addr}</a></td>
      <td data-label="電話"><a href="tel:${d["醫事機構電話"]}" style="color:#2b6cb0;text-decoration:none;">${d["醫事機構電話"]}</a></td>
      <td data-label="整合團隊名稱">${d["整合團隊名稱"]}</td>
      <td data-label="來源">${d["來源"]}</td>`;
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

/* 動畫過渡 */
function smoothRender(callback) {
  const table = document.getElementById("resultTable");
  table.style.transition = "opacity 0.25s ease, transform 0.25s ease";
  table.style.opacity = "0";
  table.style.transform = "translateY(15px)";
  setTimeout(callback, 250);
}

/* 詳細資料 */
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
    ? `<a href="tel:${d["醫事機構電話"]}" style="color:#63b3ed;text-decoration:none;">${d["醫事機構電話"]}</a>`
    : "無";
  document.getElementById("modalSource").textContent = d["來源"] || "無";
  modal.style.display = "block";
}

/* 主題切換 */
function initTheme() {
  const themeBtn = document.getElementById("themeToggle");
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") document.body.classList.add("dark");
  themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
  });
}

/* 自動提示 */
function setupAutocomplete() {
  const input = document.getElementById("keyword");
  const suggestionBox = document.createElement("div");
  suggestionBox.id = "suggestionBox";
  suggestionBox.style.position = "absolute";
  suggestionBox.style.background = "white";
  suggestionBox.style.border = "1px solid #ccc";
  suggestionBox.style.borderRadius = "5px";
  suggestionBox.style.zIndex = "9999";
  suggestionBox.style.display = "none";
  suggestionBox.style.opacity = "0";
  suggestionBox.style.transition = "opacity 0.25s ease, transform 0.25s ease";
  document.body.appendChild(suggestionBox);

  input.addEventListener("input", () => {
    const val = input.value.trim();
    suggestionBox.innerHTML = "";
    if (!val) {
      suggestionBox.classList.remove("show");
      suggestionBox.style.display = "none";
      return;
    }

    const matches = allData
      .filter((d) => d["醫事機構名稱"]?.includes(val))
      .slice(0, 5)
      .map((d) => d["醫事機構名稱"]);

    const unique = [...new Set(matches)];
    unique.forEach((name) => {
      const div = document.createElement("div");
      div.textContent = name;
      div.style.padding = "10px";
      div.style.cursor = "pointer";
      div.addEventListener("click", () => {
        input.value = name;
        suggestionBox.classList.remove("show");
        suggestionBox.style.display = "none";
        searchData();
      });
      suggestionBox.appendChild(div);
    });

    if (unique.length) {
      const rect = input.getBoundingClientRect();
      suggestionBox.style.left = rect.left + window.scrollX + "px";
      suggestionBox.style.top = rect.bottom + window.scrollY + "px";
      suggestionBox.style.width = rect.width + "px";
      suggestionBox.style.display = "block";
      requestAnimationFrame(() => suggestionBox.classList.add("show"));
      suggestionBox.style.opacity = "1";
      suggestionBox.style.transform = "translateY(0)";
    } else {
      suggestionBox.classList.remove("show");
      suggestionBox.style.display = "none";
    }
  });

  document.addEventListener("click", (e) => {
    if (e.target !== input && e.target.parentNode !== suggestionBox) {
      suggestionBox.classList.remove("show");
      setTimeout(() => (suggestionBox.style.display = "none"), 200);
    }
  });
}
