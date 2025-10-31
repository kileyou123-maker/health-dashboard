let allData = [];
let currentData = [];
let currentPage = 1;
const pageSize = 50;
let cityDistrictMap = {};

document.addEventListener("DOMContentLoaded", async () => {
  initTheme();

  const files = [
    { path: "A21030000I-D2000H-001.csv", source: "居家醫療機構" },
    { path: "A21030000I-D2000I-001.csv", source: "安寧照護／護理之家" },
  ];

  for (const f of files) {
    const res = await fetch(f.path);
    const text = await res.text();
    const lines = text.split("\n").filter((l) => l.trim());
    const headers = lines[0].split(",");
    const json = lines.slice(1).map((l) => {
      const vals = l.split(",");
      const obj = {};
      headers.forEach((h, i) => (obj[h] = vals[i] || ""));
      obj["來源"] = f.source;
      return obj;
    });
    allData = allData.concat(json);
  }

  normalizeAddress(allData);
  buildCityDistrictMap(allData);
  populateCityList();
  populateDistrictList();

  document.getElementById("searchBtn").addEventListener("click", searchData);
  document.querySelectorAll(".filter-btn").forEach((btn) =>
    btn.addEventListener("click", () => quickFilter(btn.dataset.type))
  );

  setupAutocomplete();
  currentData = allData;
  renderResponsive();
});

function normalizeAddress(data) {
  data.forEach((d) => {
    if (d["醫事機構地址"])
      d["醫事機構地址"] = d["醫事機構地址"].replaceAll("臺", "台");
  });
}

const allCities = [
  "台北市","新北市","桃園市","台中市","台南市","高雄市",
  "基隆市","新竹市","嘉義市","新竹縣","苗栗縣","彰化縣",
  "南投縣","雲林縣","嘉義縣","屏東縣","宜蘭縣","花蓮縣",
  "台東縣","澎湖縣","金門縣","連江縣"
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
  Object.keys(cityDistrictMap).forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
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

  renderResponsive();
}

function quickFilter(type) {
  if (type === "全部") currentData = allData;
  else {
    const keywords = {
      醫院: ["醫院"],
      診所: ["診所", "醫療"],
      護理之家: ["護理", "安養", "養護"],
    }[type];
    currentData = allData.filter((d) =>
      keywords.some((k) => (d["醫事機構名稱"] || "").includes(k))
    );
  }
  renderResponsive();
}

function renderResponsive() {
  if (window.innerWidth <= 768) renderMobileCards(currentData);
  else renderTablePage(currentData);
}

function renderTablePage(data) {
  const tbody = document.querySelector("#resultTable tbody");
  tbody.innerHTML = "";
  data.slice(0, 50).forEach((d) => {
    const addr = d["醫事機構地址"];
    const tel = d["醫事機構電話"];
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${d["醫事機構名稱"]}</td>
      <td><a href="${mapUrl}" target="_blank">${addr}</a></td>
      <td><a href="tel:${tel}">${tel}</a></td>
      <td>${d["整合團隊名稱"]}</td>
      <td>${d["來源"]}</td>`;
    tbody.appendChild(row);
  });
}

function renderMobileCards(data) {
  const container = document.getElementById("resultCards");
  container.innerHTML = "";
  data.forEach((d) => {
    const addr = d["醫事機構地址"];
    const tel = d["醫事機構電話"];
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${d["醫事機構名稱"]}</h3>
      <p>📍 <a href="${mapUrl}" target="_blank">${addr}</a></p>
      <p>📞 <a href="tel:${tel}">${tel}</a></p>
      <p>🏥 ${d["整合團隊名稱"] || "未提供"}</p>
      <p class="src">資料來源：${d["來源"]}</p>
    `;
    container.appendChild(card);
  });
}

/* 深色模式 */
function initTheme() {
  const btn = document.getElementById("themeToggle");
  if (localStorage.getItem("theme") === "dark") document.body.classList.add("dark");
  btn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem(
      "theme",
      document.body.classList.contains("dark") ? "dark" : "light"
    );
  });
}

/* 🔍 自動提示 */
function setupAutocomplete() {
  const input = document.getElementById("keyword");
  const box = document.createElement("div");
  box.id = "suggestionBox";
  input.parentNode.style.position = "relative";
  input.parentNode.appendChild(box);

  input.addEventListener("input", () => {
    const val = input.value.trim();
    if (!val) return (box.style.display = "none");
    const matches = allData
      .map((d) => d["醫事機構名稱"])
      .filter((n) => n && n.includes(val));
    const unique = [...new Set(matches)].slice(0, 5);
    box.innerHTML = "";
    unique.forEach((s) => {
      const div = document.createElement("div");
      div.textContent = s;
      div.addEventListener("click", () => {
        input.value = s;
        box.style.display = "none";
        searchData();
      });
      div.addEventListener("touchstart", () => {
        input.value = s;
        box.style.display = "none";
        searchData();
      });
      box.appendChild(div);
    });
    box.style.display = "block";
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#keyword") && !e.target.closest("#suggestionBox"))
      box.style.display = "none";
  });
}
