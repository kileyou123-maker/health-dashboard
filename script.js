/* ============================================
   全台居家醫療查詢系統 - 完整智慧搜尋版本
   功能：
   ✔ 智慧搜尋（台/臺/拼音/注音/多關鍵字）
   ✔ 自動高亮（深色模式支援）
   ✔ 即時縣市＋地區篩選
   ✔ 服務項目 ✔/✖ 圓形圖示
   ✔ Modal 詳細資料
   ✔ 分頁、Autocomplete、Smooth Render
============================================ */

let allData = [];
let cityDistrictMap = {};
let currentPage = 1;
const pageSize = 50;
let currentData = [];
let serviceData = [];

/* =====================================================
   初始化
===================================================== */
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

  /* ================================
     事件註冊（即時篩選）
  ================================= */
  document.getElementById("citySelect").addEventListener("change", () => {
    populateDistrictList();
    searchData();
  });

  document.getElementById("districtSelect").addEventListener("change", () => {
    searchData();
  });

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

    const name = row.children[0]?.innerText?.replace(/<[^>]*>/g, "").trim();
    const found = currentData.find((d) => d["醫事機構名稱"] === name);

    if (found) showDetails(found);
  });
});

/* =====================================================
   CSV → JSON
===================================================== */
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

/* =====================================================
   地址清理（臺 → 台）
===================================================== */
function normalizeAddress(data) {
  data.forEach((d) => {
    if (d["醫事機構地址"])
      d["醫事機構地址"] = d["醫事機構地址"].replaceAll("臺", "台").trim();
  });
}

/* =====================================================
   城市 / 地區生成
===================================================== */
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
/* ===============================
   台灣行政區完整列表（368區）
   用來修正搜尋「區 / 鄉 / 鎮 / 市」不準問題
=============================== */
const districtLib = [
  "中正區","大同區","中山區","松山區","大安區","萬華區","信義區","士林區","北投區","內湖區","南港區","文山區",
  "板橋區","三重區","中和區","永和區","新莊區","新店區","土城區","蘆洲區","汐止區","樹林區","淡水區","三峽區","鶯歌區","瑞芳區","五股區","泰山區","林口區","八里區","深坑區","石碇區","坪林區","三芝區","石門區",
  "桃園區","中壢區","平鎮區","八德區","大溪區","楊梅區","蘆竹區","龜山區","龍潭區","大園區","觀音區","新屋區","復興區",
  "東區","西區","南屯區","北屯區","西屯區","中區","東區","南區","北區","太平區","大里區","霧峰區","烏日區","豐原區","后里區","石岡區","東勢區","和平區","新社區","潭子區","大雅區","神岡區","大肚區","龍井區","沙鹿區","梧棲區","清水區","大甲區","外埔區","大安區",
  "新營區","鹽水區","白河區","柳營區","後壁區","東山區","麻豆區","下營區","六甲區","官田區","大內區","佳里區","學甲區","西港區","七股區","將軍區","北門區","新化區","左鎮區","玉井區","楠西區","南化區","仁德區","歸仁區","關廟區","龍崎區","永康區","東區","南區","北區","安南區","安平區","中西區",
  "鹽埕區","鼓山區","左營區","楠梓區","三民區","新興區","前金區","苓雅區","前鎮區","小港區","旗津區","鳳山區","大寮區","鳥松區","林園區","仁武區","大樹區","大社區","岡山區","路竹區","橋頭區","梓官區","彌陀區","永安區","湖內區","鳳山區","田寮區","阿蓮區","茄萣區","茂林區","桃源區","那瑪夏區",
  "宜蘭市","羅東鎮","蘇澳鎮","頭城鎮","礁溪鄉","壯圍鄉","員山鄉","冬山鄉","五結鄉","三星鄉","大同鄉","南澳鄉",
  "花蓮市","鳳林鎮","玉里鎮","新城鄉","吉安鄉","壽豐鄉","光復鄉","豐濱鄉","瑞穗鄉","萬榮鄉","卓溪鄉",
  "台東市","成功鎮","關山鎮","卑南鄉","鹿野鄉","池上鄉","東河鄉","長濱鄉","太麻里鄉","大武鄉","綠島鄉","蘭嶼鄉","延平鄉","金峰鄉","達仁鄉",
  "苗栗市","頭份市","竹南鎮","後龍鎮","通霄鎮","苑裡鎮","卓蘭鎮","造橋鄉","三灣鄉","南庄鄉","獅潭鄉","頭屋鄉","公館鄉","大湖鄉","泰安鄉","西湖鄉","銅鑼鄉","三義鄉","竹南鎮","苑裡鎮",
  "彰化市","員林市","和美鎮","鹿港鎮","溪湖鎮","二林鎮","田中鎮","北斗鎮","花壇鄉","芬園鄉","秀水鄉","埔心鄉","大村鄉","永靖鄉","社頭鄉","二水鄉","田尾鄉","埤頭鄉","大城鄉","竹塘鄉","芳苑鄉","溪州鄉",
  "南投市","草屯鎮","竹山鎮","集集鎮","名間鄉","鹿谷鄉","中寮鄉","魚池鄉","國姓鄉","水里鄉","信義鄉","仁愛鄉",
  "斗六市","斗南鎮","虎尾鎮","西螺鎮","土庫鎮","北港鎮","莿桐鄉","林內鄉","古坑鄉","大埤鄉","褒忠鄉","東勢鄉","臺西鄉","崙背鄉","麥寮鄉","二崙鄉","元長鄉","四湖鄉","口湖鄉","水林鄉",
  "嘉義市","太保市","朴子市","布袋鎮","大林鎮","民雄鄉","溪口鄉","新港鄉","六腳鄉","東石鄉","義竹鄉","鹿草鄉","水上鄉","中埔鄉","番路鄉","大埔鄉","阿里山鄉",
  "屏東市","潮州鎮","東港鎮","恆春鎮","萬丹鄉","內埔鄉","竹田鄉","新園鄉","枋寮鄉","麟洛鄉","九如鄉","里港鄉","泰武鄉","牡丹鄉","車城鄉","滿州鄉","高樹鄉","三地門鄉","霧台鄉","瑪家鄉","長治鄉","鹽埔鄉","萬巒鄉","來義鄉","春日鄉","獅子鄉","枋山鄉","林邊鄉","南州鄉","佳冬鄉","崁頂鄉",
  "馬公市","湖西鄉","白沙鄉","西嶼鄉","望安鄉","七美鄉",
  "金城鎮","金寧鄉","金沙鎮","金湖鎮","烈嶼鄉","烏坵鄉",
  "南竿鄉","北竿鄉","莒光鄉","東引鄉"
];

/* =====================================================
   智慧搜尋：關鍵字標準化
   支援：台/臺、英文拼音、注音
===================================================== */
function normalizeKeyword(str) {
  if (!str) return "";

  let s = str.toLowerCase().trim();

  // ---- 台 / 臺 ----
  s = s.replace(/臺/g, "台");

  // ---- 注音 → 拉丁拼音 (簡易映射) ----
  const zhuyinMap = {
    "ㄅ": "b", "ㄆ": "p", "ㄇ": "m", "ㄈ": "f",
    "ㄉ": "d", "ㄊ": "t", "ㄋ": "n", "ㄌ": "l",
    "ㄍ": "g", "ㄎ": "k", "ㄏ": "h",
    "ㄐ": "j", "ㄑ": "q", "ㄒ": "x",
    "ㄓ": "zh", "ㄔ": "ch", "ㄕ": "sh", "ㄖ": "r",
    "ㄗ": "z", "ㄘ": "c", "ㄙ": "s"
  };
  Object.keys(zhuyinMap).forEach(k => {
    s = s.replace(new RegExp(k, "g"), zhuyinMap[k]);
  });

  // ---- 常見地名拼音（可擴充） ----
  const pinyinMap = {
    "taipei": "台北",
    "taibei": "台北",
    "xinbei": "新北",
    "newtaipei": "新北",
    "beitou": "北投",
    "shilin": "士林",
    "daan": "大安",
    "zhongshan": "中山",
    "songshan": "松山",
    "neihu": "內湖",
    "danshui": "淡水",
    "tamsui": "淡水",
    "taichung": "台中",
    "tainan": "台南",
    "kaohsiung": "高雄"
  };

  Object.keys(pinyinMap).forEach(k => {
    if (s.includes(k)) s = s.replace(k, pinyinMap[k]);
  });

  return s;
}

/* =====================================================
   智慧比對（多關鍵字 AND 搜尋）
===================================================== */
function smartMatch(text, keyword) {
  if (!keyword) return true;

  const cleanText = normalizeKeyword(text);
  const keys = keyword.split(/\s+/).map(k => normalizeKeyword(k));

  return keys.every(k => cleanText.includes(k));
}

/* =====================================================
   搜尋（支援智慧搜尋 + 高亮）
===================================================== */
function searchData() {
  const city = document.getElementById("citySelect").value;
  const district = document.getElementById("districtSelect").value;
  const keyword = normalizeKeyword(document.getElementById("keyword").value.trim());

currentData = allData.filter((d) => {
  const addr = d["醫事機構地址"] || "";
  const name = d["醫事機構名稱"] || "";
  const phone = d["醫事機構電話"] || "";
  const team = d["整合團隊名稱"] || "";

  const keywordRaw = document.getElementById("keyword").value.trim();
  const kw = normalizeKeyword(keywordRaw);

  /* ========= 行政區強制匹配（區 / 鄉 / 鎮 / 市） ========= */
  let wantDistrict = null;

  districtLib.forEach((dist) => {
    if (keywordRaw.includes(dist)) wantDistrict = dist;
  });

  // 使用行政區資料庫比對
  const districtLibOK = wantDistrict ? addr.includes(wantDistrict) : true;

  /* ========= 城市 / 地區柔性比對 ========= */
  const cityMatch =
    city === "全部" || addr.includes(city);

  const districtMatch =
    district === "全部" || addr.includes(district);

  const locationOK =
    districtLibOK || (cityMatch && districtMatch);

  /* ========= 智慧文字比對 ========= */
  const textMatch =
    smartMatch(name, kw) ||
    smartMatch(addr, kw) ||
    smartMatch(phone, kw) ||
    smartMatch(team, kw);

  return locationOK && textMatch;
});



  currentPage = 1;

  document.getElementById("status").textContent =
    `共找到 ${currentData.length} 筆結果`;

  smoothRender(renderTablePage);
}

/* =====================================================
   類別快速篩選
===================================================== */
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

/* =====================================================
   自動高亮（多關鍵字 + 智慧搜尋）
===================================================== */
function highlight(text, keywordRaw) {
  if (!keywordRaw) return text;

  const keys = keywordRaw.split(/\s+/).filter(k => k.trim());
  let result = text;

  keys.forEach(k => {
    const norm = normalizeKeyword(k);
    if (!norm) return;

    // 原字比對（例如：北 / 投）
    const re = new RegExp(k, "gi");
    // 標準化後比對（例如 bei → 北）
    const reNorm = new RegExp(norm, "gi");

    result = result
      .replace(re, `<mark class="hl">$&</mark>`)
      .replace(reNorm, `<mark class="hl">$&</mark>`);
  });

  return result;
}
/* =====================================================
   表格渲染（含高亮支援）
===================================================== */
function renderTablePage() {
  const tbody = document.querySelector("#resultTable tbody");
  tbody.innerHTML = "";

  const keyRaw = document.getElementById("keyword").value.trim();
  const keyNorm = normalizeKeyword(keyRaw);

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
      <td>${highlight(d["醫事機構名稱"], keyRaw)}</td>
      <td><a href="${mapUrl}" target="_blank">${highlight(addr, keyRaw)}</a></td>
      <td><a href="tel:${d["醫事機構電話"]}" style="color:${getComputedStyle(document.body).getPropertyValue('--link-color')};text-decoration:none;">${highlight(d["醫事機構電話"], keyRaw)}</a></td>
      <td>${highlight(d["整合團隊名稱"], keyRaw)}</td>
      <td>${d["來源"]}</td>
    `;
    tbody.appendChild(row);
  }

  renderPagination();
}

/* =====================================================
   分頁
===================================================== */
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

/* =====================================================
   Smooth Render（表格淡入 / 淡出）
===================================================== */
function smoothRender(callback) {
  const table = document.getElementById("resultTable");

  table.style.opacity = "0";
  table.style.transform = "translateY(15px)";

  setTimeout(() => {
    callback();
    requestAnimationFrame(() => {
      table.style.opacity = "1";
      table.style.transform = "translateY(0)";
    });
  }, 250);
}

/* =====================================================
   Modal邏輯
===================================================== */
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
  document.getElementById("modalSource").textContent = d["來源"] || "無";

  document.getElementById("modalPhone").innerHTML = d["醫事機構電話"]
    ? `<a href="tel:${d["醫事機構電話"]}" 
        style="color:${getComputedStyle(document.body)
          .getPropertyValue('--link-color')};text-decoration:none;">
        ${d["醫事機構電話"]}
      </a>`
    : "無";

  /* 清掉舊的服務列表 */
  const modalContent = modal.querySelector(".modal-content");
  modalContent.querySelectorAll(".service-table, p.temp-msg").forEach((el) => el.remove());

  /* 找服務資料 */
  const found = serviceData.find(
    (s) => s["醫事機構名稱"] && s["醫事機構名稱"].includes(d["醫事機構名稱"])
  );

  const section = document.createElement("div");

  /* ✔ / ✖ 圖示版 */
  if (found) {
    let table = `
      <table class="service-table">
        <thead>
          <tr><th>項目</th><th>提供</th></tr>
        </thead>
        <tbody>
    `;

    const keys = Object.keys(found).slice(4); // 前四欄為固定欄位

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
/* =====================================================
   深色模式
===================================================== */
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

/* =====================================================
   自動提示搜尋（Autocomplete）
===================================================== */
function setupAutocomplete() {
  const input = document.getElementById("keyword");
  const suggestionBox = document.createElement("div");

  suggestionBox.id = "suggestionBox";
  suggestionBox.style.position = "absolute";
  suggestionBox.style.background = "var(--table-bg)";
  suggestionBox.style.border = "1px solid var(--table-border)";
  suggestionBox.style.borderRadius = "8px";
  suggestionBox.style.zIndex = "999";
  suggestionBox.style.display = "none";
  suggestionBox.style.boxShadow = "0 3px 6px rgba(0,0,0,0.2)";
  suggestionBox.style.maxHeight = "260px";
  suggestionBox.style.overflowY = "auto";

  document.body.appendChild(suggestionBox);

  input.addEventListener("input", () => {
    const val = input.value.trim();
    suggestionBox.innerHTML = "";

    if (!val) {
      suggestionBox.style.display = "none";
      return;
    }

    const norm = normalizeKeyword(val);

    const matches = allData
      .map((d) => d["醫事機構名稱"])
      .filter((n) => n && smartMatch(n, norm));

    const unique = [...new Set(matches)].slice(0, 8);

    unique.forEach((name) => {
      const div = document.createElement("div");
      div.textContent = name;
      div.style.padding = "10px 14px";
      div.style.cursor = "pointer";
      div.style.transition = "0.2s";

      div.addEventListener(
        "mouseover",
        () => (div.style.background = "rgba(26, 115, 232, 0.12)")
      );
      div.addEventListener(
        "mouseout",
        () => (div.style.background = "transparent")
      );

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

  /* 點擊外面關閉列表 */
  document.addEventListener("click", (e) => {
    if (e.target !== input && e.target.parentNode !== suggestionBox)
      suggestionBox.style.display = "none";
  });
}

/* =====================================================
   結束
===================================================== */

console.log("智慧搜尋版 script.js 載入完成");


