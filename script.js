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
  document.getElementById("nearbyBtn").addEventListener("click", findNearest);
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
    let district = match ? match[0] : null;

    if (!district) {
      district = addrAfterCity.substring(0, 3).trim();
      if (!district || /\d/.test(district)) district = "其他地區";
    }

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
    const team = d["整合團隊名稱"];
    const matchCity = city === "全部" || (addr && addr.includes(city));
    const matchDistrict = district === "全部" || (addr && addr.includes(district));
    const matchKeyword =
      !keyword ||
      (name && name.includes(keyword)) ||
      (team && team.includes(keyword)) ||
      (addr && addr.includes(keyword));
    return matchCity && matchDistrict && matchKeyword;
  });
  renderTable(filtered);
}

// --- 顯示結果表格（含 Google Maps 連結） ---
function renderTable(data) {
  const tbody = document.querySelector("#resultTable tbody");
  tbody.innerHTML = "";
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5">查無資料</td></tr>';
    return;
  }
  data.forEach((d) => {
    const row = document.createElement("tr");
    const address = d["醫事機構地址"];
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    const distance = d.distance ? `${d.distance.toFixed(2)} km` : "-";
    row.innerHTML = `
      <td>${d["醫事機構名稱"]}</td>
      <td><a href="${mapUrl}" target="_blank" class="map-link">${address}</a></td>
      <td>${d["醫事機構電話"]}</td>
      <td>${d["整合團隊名稱"]}</td>
      <td>${distance}</td>
    `;
    tbody.appendChild(row);
  });
}

// --- 📍 取得使用者位置並依距離排序 ---
function findNearest() {
  const status = document.getElementById("status");
  if (!navigator.geolocation) {
    status.textContent = "您的瀏覽器不支援定位功能。";
    return;
  }

  status.textContent = "正在取得您的位置...";
  navigator.geolocation.getCurrentPosition(success, error);

  async function success(position) {
    const userLat = position.coords.latitude;
    const userLon = position.coords.longitude;
    status.textContent = "位置取得成功，計算距離中...";

    // 使用 Google Maps API 取得座標（若你不想用API，可略）
    const results = await Promise.all(
      allData.map(async (d) => {
        const addr = d["醫事機構地址"];
        if (!addr) return d;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}`
          );
          const json = await response.json();
          if (json.length > 0) {
            const lat = parseFloat(json[0].lat);
            const lon = parseFloat(json[0].lon);
            d.distance = calcDistance(userLat, userLon, lat, lon);
          } else {
            d.distance = Infinity;
          }
        } catch {
          d.distance = Infinity;
        }
        return d;
      })
    );

    const sorted = results.filter(d => d.distance !== Infinity).sort((a, b) => a.distance - b.distance);
    status.textContent = `依距離排序（共 ${sorted.length} 筆）`;
    renderTable(sorted.slice(0, 50)); // 限制顯示50筆以免太多
  }

  function error() {
    status.textContent = "定位失敗，請允許存取位置或重試。";
  }
}

// --- 計算兩點距離（Haversine） ---
function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // 地球半徑 (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// --- 深色模式切換與記憶 ---
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
