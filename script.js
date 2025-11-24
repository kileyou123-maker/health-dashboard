
/* ===========================================================
   全域變數
=========================================================== */
let allData = [];
let cityDistrictMap = {};
let currentPage = 1;
const pageSize = 50;
let currentData = [];
let serviceData = [];

/* ===========================================================
   CSV 轉 JSON
=========================================================== */
function csvToJson(csv) {
  const lines = csv.split("\n").filter((x) => x.trim());
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const vals = line.split(",");
    const o = {};
    headers.forEach((h, i) => (o[h] = vals[i] ? vals[i].trim() : ""));
    return o;
  });
}

/* ===========================================================
   建立縣市/區 Map
=========================================================== */
const cityList = [
  "台北市","新北市","桃園市","台中市","台南市","高雄市","基隆市","新竹市","嘉義市",
  "新竹縣","苗栗縣","彰化縣","南投縣","雲林縣","嘉義縣","屏東縣","宜蘭縣","花蓮縣",
  "台東縣","澎湖縣","金門縣","連江縣"
];

function buildCityDistrictMap(data) {
  data.forEach((d) => {
    const addr = d.地址 || "";
    const city = cityList.find((c) => addr.startsWith(c)) || "其他";
    const rest = addr.replace(city, "");
    const m = rest.match(/[\u4e00-\u9fa5]{1,3}(區|鄉|鎮|市)/);
    const dist = m ? m[0] : "其他";
    if (!cityDistrictMap[city]) cityDistrictMap[city] = new Set();
    cityDistrictMap[city].add(dist);
  });
}

/* ===========================================================
   產生縣市下拉
=========================================================== */
function populateCityList() {
  const sel = document.getElementById("citySelect");
  sel.innerHTML = `<option value="全部">全部</option>`;
  Object.keys(cityDistrictMap).forEach((c) => {
    sel.innerHTML += `<option value="${c}">${c}</option>`;
  });
}

/* ===========================================================
   產生地區下拉
=========================================================== */
function populateDistrictList() {
  const city = document.getElementById("citySelect").value;
  const sel = document.getElementById("districtSelect");
  sel.innerHTML = `<option value="全部">全部</option>`;
  if (city !== "全部" && cityDistrictMap[city]) {
    [...cityDistrictMap[city]].forEach((d) => {
      sel.innerHTML += `<option value="${d}">${d}</option>`;
    });
  }
}

/* ===========================================================
   搜尋（快速＋穩定）
=========================================================== */
function searchData() {
  const city = document.getElementById("citySelect").value;
  const dist = document.getElementById("districtSelect").value;
  const kw = document.getElementById("keyword").value.trim();

  currentData = allData.filter((d) => {
    return (
      (city === "全部" || d.地址.includes(city)) &&
      (dist === "全部" || d.地址.includes(dist)) &&
      (!kw ||
        d.名稱.includes(kw) ||
        d.地址.includes(kw) ||
        d.電話.includes(kw) ||
        d.團隊.includes(kw))
    );
  });

  document.getElementById("status").textContent =
    `共找到 ${currentData.length} 筆資料`;

  currentPage = 1;
  smoothRender(renderTablePage);
}

/* ===========================================================
   動畫渲染（淡入淡出＋移動）
=========================================================== */
function smoothRender(cb) {
  const table = document.getElementById("resultTable");
  table.style.opacity = "0";
  table.style.transform = "translateY(15px)";
  setTimeout(() => {
    cb();
    requestAnimationFrame(() => {
      table.style.opacity = "1";
      table.style.transform = "translateY(0)";
    });
  }, 200);
}

/* ===========================================================
   表格渲染
=========================================================== */
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

  pageData.forEach((d) => {
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.地址)}`;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${d.名稱}</td>
      <td><a href="${mapUrl}" target="_blank">${d.地址}</a></td>
      <td><a href="tel:${d.電話}" style="text-decoration:none;color:var(--link-color);">${d.電話}</a></td>
      <td>${d.團隊}</td>
      <td>${d.來源}</td>
    `;
    tbody.appendChild(row);
  });

  renderPagination();
}

/* ===========================================================
   分頁
=========================================================== */
function renderPagination() {
  const pageTotal = Math.ceil(currentData.length / pageSize);
  const box = document.getElementById("pagination");
  box.innerHTML = "";

  if (pageTotal <= 1) return;

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
  next.disabled = currentPage === pageTotal;
  next.onclick = () => {
    currentPage++;
    smoothRender(renderTablePage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const info = document.createElement("span");
  info.textContent = `第 ${currentPage} / ${pageTotal} 頁`;

  box.append(prev, info, next);
}

/* ===========================================================
   Modal 設定
=========================================================== */
function setupModal() {
  const modal = document.getElementById("detailModal");
  const close = document.getElementById("closeModal");
  close.onclick = () => (modal.style.display = "none");
  window.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
  };
}

/* ===========================================================
   Modal 內容填入（含服務項目 ✔ / ✖ 美化）
=========================================================== */
function showDetails(d) {
  const modal = document.getElementById("detailModal");

  document.getElementById("modalTitle").textContent = d.名稱 || "無";
  document.getElementById("modalCode").textContent = d.代碼 || "無";
  document.getElementById("modalTeam").textContent = d.團隊 || "無";
  document.getElementById("modalAddr").textContent = d.地址 || "無";
  document.getElementById("modalPhone").innerHTML = d.電話
    ? `<a href="tel:${d.電話}" style="color:var(--link-color);">${d.電話}</a>`
    : "無";
  document.getElementById("modalSource").textContent = d.來源 || "無";

  const cont = modal.querySelector(".modal-content");
  cont.querySelectorAll(".service-table, .temp-msg").forEach((x) => x.remove());

  const found = serviceData.find(
    (s) => s["醫事機構名稱"] && s["醫事機構名稱"].includes(d.名稱)
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
        const icon =
          v == 1
            ? `<span class='yes-icon'>✔</span>`
            : `<span class='no-icon'>✖</span>`;
        table += `<tr><td>${k}</td><td>${icon}</td></tr>`;
      });

    table += `</tbody></table>`;
    sec.innerHTML = table;
  } else {
    sec.innerHTML = `<p class="temp-msg" style="text-align:center;">暫無服務資料</p>`;
  }

  cont.appendChild(sec);
  modal.style.display = "block";
}

/* ===========================================================
   Autocomplete（機構名稱）
=========================================================== */
function setupAutocomplete() {
  const input = document.getElementById("keyword");
  const box = document.createElement("div");
  box.id = "suggestionBox";
  box.style.position = "absolute";
  box.style.display = "none";
  box.style.background = "var(--table-bg)";
  box.style.border = "1px solid var(--table-border)";
  box.style.borderRadius = "8px";
  box.style.boxShadow = "0 4px 10px rgba(0,0,0,0.2)";
  box.style.zIndex = "999";
  document.body.appendChild(box);

  input.addEventListener("input", () => {
    const kw = input.value.trim();
    box.innerHTML = "";

    if (!kw) {
      box.style.display = "none";
      return;
    }

    const matches = allData
      .map((d) => d.名稱)
      .filter((n) => n && n.includes(kw));
    const unique = [...new Set(matches)].slice(0, 8);

    unique.forEach((name) => {
      const div = document.createElement("div");
      div.textContent = name;
      div.style.padding = "8px";
      div.style.cursor = "pointer";

      div.addEventListener("mouseover", () => (div.style.background = "#e6f0ff"));
      div.addEventListener("mouseout", () => (div.style.background = "transparent"));

      div.addEventListener("click", () => {
        input.value = name;
        searchData();
        box.style.display = "none";
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

  document.addEventListener("click", (e) => {
    if (e.target !== input && e.target.parentNode !== box) {
      box.style.display = "none";
    }
  });
}

/* ===========================================================
   深色模式（含轉場動畫）
=========================================================== */
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

/* ===========================================================
   DOMContentLoaded 整體初始化（資料載入）
=========================================================== */
document.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  setupModal();
  setupAutocomplete();

  const files = [
    { path: "A21030000I-D2000H-001.csv", source: "居家醫療機構" },
    { path: "A21030000I-D2000I-001.csv", source: "安寧照護／護理之家" }
  ];

  let merged = [];

  for (const f of files) {
    const res = await fetch(f.path);
    const txt = await res.text();
    const json = csvToJson(txt).map((x) => ({
      名稱: x["醫事機構名稱"] || x["名稱"] || "",
      地址: x["醫事機構地址"] || x["地址"] || "",
      電話: x["醫事機構電話"] || x["電話"] || "",
     團隊: x["整合團隊名稱"] || x["團隊"] || "",
      代碼: x["醫事機構代碼"] || x["代碼"] || "",
      來源: f.source
    }));
    merged = merged.concat(json);
  }

  merged.forEach((d) => {
    if (d.地址) d.地址 = d.地址.replaceAll("臺", "台");
  });

  allData = merged;

  buildCityDistrictMap(allData);
  populateCityList();
  populateDistrictList();

  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/kileyou123-maker/health-dashboard/refs/heads/main/services.csv"
    );
    const txt = await res.text();
    serviceData = csvToJson(txt);
  } catch (e) {
    console.error("服務資料載入失敗：", e);
  }

  currentData = allData;
  renderTablePage();

  document.getElementById("citySelect").addEventListener("change", () => {
    populateDistrictList();
    searchData();
  });

  document.getElementById("districtSelect").addEventListener("change", searchData);

  document.getElementById("searchBtn").addEventListener("click", searchData);
  document.getElementById("keyword").addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchData();
  });

  document.addEventListener("click", (e) => {
    const row = e.target.closest("#resultTable tbody tr");
    if (!row) return;
    const name = row.children[0]?.innerText?.trim();
    const found = currentData.find((x) => x.名稱 === name);
    if (found) showDetails(found);
  });
}
);

/* ===========================================================
   Part 4 — 安全補丁 + 小工具函式
=========================================================== */

/* 安全取值：避免 undefined / null */
function safe(v, def = "") {
  return v === undefined || v === null ? def : v;
}

/* 平滑捲動 */
function scrollTopSmooth() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* 全域防呆：若表格不存在不執行 */
function safeTableAction(cb) {
  const table = document.getElementById("resultTable");
  if (!table) return;
  cb(table);
}

/* 資料驗證：排除空名稱、空地址 */
function validateData() {
  allData = allData.filter((d) => safe(d.名稱).trim() && safe(d.地址).trim());
}

/* 初始化前執行資料驗證補丁 */
validateData();

/* 最終訊息 */
console.log("✔ script.js 完整載入（精簡＋美化＋動畫版）");
