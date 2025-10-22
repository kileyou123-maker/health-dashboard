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

  // 綁定快速篩選按鈕
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

// --- 統一「台／臺」 ---
function normalizeAddress(data) {
  data.forEach((d) => {
    if (d["醫事機構地址"]) {
      d["醫事機構地址"] = d["醫事機構地址"]
        .replaceAll("臺", "台")
        .replaceAll("　", "")
        .trim();
    }
  });
}

// --- 全台縣市清單 ---
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

    const city = allCities.find(c => addr.startsWith(c)) || "其他地區";
    const addrAfterCity = addr.replace(city, "");
    let match = addrAfterCity.match(/[\u4e00-\u9fa5]{1,3}(區|鄉|鎮|市)/);
    let district = match ? match[0] : "其他地區";

    if (!cityDistrictMap[city]) cityDistrictMap[city] = new Set();
    cityDistrictMap[city].add(district);
  });
}

// --- 縣市下拉選單 ---
function populateCityList() {
  const citySelect = document.getElementById("citySelect");
  citySelect.innerHTML = '<option value="全部">全部</option>';
  Object.keys(cityDistrictMap).forEach((city) => {
    const opt = document.createElement("option");
    opt.value = city;
    opt.textContent = city;
    citySelect.appendChild(opt);
  });
  populateDistrictList();
}

// --- 地區下拉選單 ---
function populateDistrictList() {
  const city = document.getElementById("citySelect").value;
  const districtSelect = document.getElementById("districtSelect");
  districtSelect.innerHTML = '<option value="全部">全部</option>';
  if (city !== "全部" && cityDistrictMap[city]) {
    [...cityDistrictMap[city]].forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      districtSelect.appendChild(opt);
    });
  }
}

// --- 查詢 ---
function searchData() {
  const city = document.getElementById("citySelect").value;
  const district = document.getElementById("districtSelect").value;
  const keyword = document.getElementById("keyword").value.trim();
  const filtered = allData.filter((d) => {
    const addr = d["醫事機構地址"];
    const name = d["醫事機構名稱"];
    const team = d["整合]()
