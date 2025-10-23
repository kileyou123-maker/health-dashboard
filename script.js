let allData = [];
let cityDistrictMap = {};

document.addEventListener("DOMContentLoaded", () => {
  fetch("A21030000I-D2000H-001.csv")
    .then(res => res.text())
    .then(text => {
      allData = csvToJson(text);
      normalizeAddress(allData);
      buildCityDistrictMap(allData);
      populateCityList();
    });

  document.getElementById("citySelect").addEventListener("change", populateDistrictList);
  document.getElementById("searchBtn").addEventListener("click", searchData);
  document.getElementById("keyword").addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchData();
  });

  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.getAttribute("data-type");
      quickFilter(type);
    });
  });
});

// --- CSV 轉 JSON ---
function csvToJson(csv) {
  const lines = csv.split("\n").filter(line => line.trim() !== "");
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(",");
    const obj = {};
    headers.forEach((h, i) => (obj[h] = values[i] ? values[i].trim() : ""));
    return obj;
  });
}

// --- 正常化地址（臺 → 台）---
function normalizeAddress(data) {
  data.forEach((d) => {
    if (d["醫事機構地址"]) {
      d["醫事機構地址"] = d["醫事機構地址"].replaceAll("臺", "台").trim();
    }
  });
}

// --- 所有縣市列表 ---
const allCities = [
  "台北市","新北市","桃園市","台中市","台南市","高雄市",
  "基隆市","新竹市","嘉義市",
  "新竹縣","苗栗縣","彰化縣","南投縣","雲林縣",
  "嘉義縣","屏東縣","宜蘭縣","花蓮縣","台東縣",
  "澎湖縣","金門縣","連江縣"
];

// --- 建立縣市 → 地區 ---
function buildCityDistrictMap(data) {
  data.forEach((d) => {
    const addr = d["醫事機構地址"];
    if (!addr) return;
    const city = allCities.find(c => addr.startsWith(c)) || "其他";
    const after = addr.replace(city, "");
    const match = after.match(/[\u4e00-\u9fa5]{1,3}(區|鎮|鄉|市)/);
    const district = match ? match[0] : "其他";
    if (!cityDistrictMap[city]) cityDistrictMap[city] = new Set();
    cityDistrictMap[city].add(district);
  });
}

// --- 縣市選單 ---
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

// --- 地區選單 ---
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

// --- 查詢 ---
function searchData() {
  const city = document.getElementById("citySelect").value;
  const district = document.getElementById("districtSelect").value;
  const keyword = document.getElementById("keyword").value.trim();

  const filtered = allData.filter((d) => {
    const addr = d["醫事機構地址"] || "";
    const name = d["醫事機構名稱"] || "";
    const phone = d["醫事機構電話"] || "";
    const team = d["整合團隊名稱"] || "";

    const matchCity = city === "全部" || addr.includes(city);
    const matchDistrict = district === "全部" || addr.includes(district);
    const matchKeyword =
      !keyword ||
      name.includes(keyword) ||
      addr.includes(keyword) ||
      phone.includes(keyword) ||
      team.includes(keyword);

    return matchCity && matchDistrict && matchKeyword;
  });

  document.getElementById("status").textContent = `共找到 ${filtered.length} 筆結果`;
  renderTable(filtered);
}

// --- 篩選 ---
function quickFilter(type) {
  let filtered;
  if (type === "全部") filtered = allData;
  else filtered = allData.filter((d) => d["醫事機構名稱"]?.includes(type));
  document.getElementById("status").textContent = `顯示類型：${type}（共 ${filtered.length} 筆）`;
  renderTable(filtered);
}

// --- 顯示結果表格 ---
function renderTable(data) {
  const tbody = document.querySelector("#resultTable tbody");
  tbody.innerHTML = "";
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4">查無資料</td></tr>';
    return;
  }
  data.forEach((d) => {
    const addr = d["醫事機構地址"];
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
    const row = `
      <tr>
        <td>${d["醫事機構名稱"]}</td>
        <td><a href="${mapUrl}" target="_blank" class="map-link">${addr}</a></td>
        <td>${d["醫事機構電話"]}</td>
        <td>${d["整合團隊名稱"]}</td>
      </tr>`;
    tbody.insertAdjacentHTML("beforeend", row);
  });
}

// --- 深色模式 ---
const themeBtn = document.getElementById("themeToggle");
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
  themeBtn.textContent = "☀️ 亮色模式";
}
themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  themeBtn.textContent = isDark ? "☀️ 亮色模式" : "🌙 深色模式";
  localStorage.setItem("theme", isDark ? "dark" : "light");
});
