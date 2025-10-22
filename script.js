// 讀取 CSV
let allData = [];

document.addEventListener("DOMContentLoaded", () => {
  fetch("A21030000I-D2000H-001.csv")
    .then(res => res.text())
    .then(text => {
      allData = csvToJson(text);
      populateCityList(allData);
    });

  document.getElementById("searchBtn").addEventListener("click", searchData);
});

// CSV 轉 JSON
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

// 產生縣市清單
function populateCityList(data) {
  const citySet = new Set();
  data.forEach(d => {
    const address = d["醫事機構地址"];
    if (address) {
      const city = address.substring(0, 3); // 取前3字(例如 台北市、桃園市)
      citySet.add(city);
    }
  });

  const select = document.getElementById("citySelect");
  select.innerHTML = '<option value="全部">全部</option>';
  [...citySet].forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
}

// 查詢資料
function searchData() {
  const city = document.getElementById("citySelect").value;
  const keyword = document.getElementById("keyword").value.trim();

  const filtered = allData.filter(d => {
    const address = d["醫事機構地址"];
    const name = d["醫事機構名稱"];
    const team = d["整合團隊名稱"];
    const matchCity = city === "全部" || (address && address.includes(city));
    const matchKeyword =
      !keyword ||
      (name && name.includes(keyword)) ||
      (team && team.includes(keyword)) ||
      (address && address.includes(keyword));
    return matchCity && matchKeyword;
  });

  renderTable(filtered);
}

// 顯示結果
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
