let allData = [];
let cityDistrictMap = {};

document.addEventListener("DOMContentLoaded", () => {
  fetch("A21030000I-D2000H-001.csv")
    .then(res => res.text())
    .then(text => {
      allData = csvToJson(text);
      buildCityDistrictMap(allData);
      populateCityList();
    });

  document.getElementById("citySelect").addEventListener("change", populateDistrictList);
  document.getElementById("searchBtn").addEventListener("click", searchData);
});

// 將 CSV 轉換成 JSON
function csvToJson(csv) {
  const lines = csv.split("\n").filter(line => line.trim() !== "");
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(",");
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i] ? values[i].trim() : "");
    return obj;
  });
}

// 建立縣市 → 地區 對應表
function buildCityDistrictMap(data) {
  data.forEach(d => {
    const address = d["醫事機構地址"];
    if (!address) return;

    const city = address.substring(0, 3);
    const districtMatch = address.match(/[\u4e00-\u9fa5]{2,3}區/); // 取出「XX區」
    const district = districtMatch ? districtMatch[0] : "其他地區";

    if (!cityDistrictMap[city]) cityDistrictMap[city] = new Set();
    cityDistrictMap[city].add(district);
  });
}

// 縣市下拉選單
function populateCityList() {
  const select = document.getElementById("citySelect");
  select.innerHTML = '<option value="全部">全部</option>';
  Object.keys(cityDistrictMap).forEach(city => {
    const opt = document.createElement("option");
    opt.value = city;
    opt.textContent = city;
    select.appendChild(opt);
  });
  populateDistrictList(); // 初始載入
}

// 地區下拉選單
function populateDistrictList() {
  const city = document.getElementById("citySelect").value;
  const districtSelect = document.getElementById("districtSelect");
  districtSelect.innerHTML = '<option value="全部">全部</option>';

  if (city !== "全部" && cityDistrictMap[city]) {
    [...cityDistrictMap[city]].forEach(d => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      districtSelect.appendChild(opt);
    });
  }
}

// 查詢功能
function searchData() {
  const city = document.getElementById("citySelect").value;
  const district = document.getElementById("districtSelect").value;
  const keyword = document.getElementById("keyword").value.trim();

  const filtered = allData.filter(d => {
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

// 顯示結果表格
function renderTable(data) {
  const tbody = document.querySelector("#resultTable tbody");
  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4">查無資料</td></tr>';
    return;
  }

  data.forEach(d => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${d["醫事機構名稱"]}</td>
      <td>${d["醫事機構地址"]}</td>
      <td>${d["醫事機構電話"]}</td>
      <td>${d["整合團隊名稱"]}</td>
    `;
    tbody.appendChild(row);
  });
}
