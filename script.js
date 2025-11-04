document.addEventListener("DOMContentLoaded", () => {
  const loading = document.getElementById("loading");
  const mainContent = document.getElementById("main-content");
  const tbody = document.querySelector("tbody");
  const keywordInput = document.getElementById("keyword");
  const suggestionBox = document.getElementById("suggestions");
  const themeToggle = document.getElementById("themeToggle");
  const citySelect = document.getElementById("citySelect");
  const districtSelect = document.getElementById("districtSelect");
  const pageInfo = document.getElementById("pageInfo");

  let data = [];
  let currentPage = 1;
  const rowsPerPage = 50;

  // 主題模式
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
    themeToggle.textContent = "☀️";
  }
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const dark = document.body.classList.contains("dark");
    themeToggle.textContent = dark ? "☀️" : "🌙";
    localStorage.setItem("theme", dark ? "dark" : "light");
  });

  // 載入資料
  Promise.all([
    fetch("A21030000I-D2000H-001.csv").then(r => r.text()),
    fetch("A21030000I-D2000I-001.csv").then(r => r.text())
  ])
  .then(([h, i]) => {
    const homecare = Papa.parse(h, { header: true }).data;
    const hospice = Papa.parse(i, { header: true }).data;
    data = [...homecare, ...hospice].filter(d => d["醫事機構名稱"]);
    initCityDistrict();
    renderTable();
    setTimeout(() => {
      loading.style.display = "none";
      mainContent.style.display = "block";
    }, 800);
  });

  // 城市與地區下拉
  function initCityDistrict() {
    const cities = [...new Set(data.map(d => d["地址"].split("市")[0] + "市"))].filter(Boolean);
    cities.forEach(c => {
      const opt = document.createElement("option");
      opt.textContent = c;
      citySelect.appendChild(opt);
    });
    citySelect.addEventListener("change", () => {
      const city = citySelect.value;
      districtSelect.innerHTML = "<option>全部地區</option>";
      if (city === "全部縣市") return;
      const distSet = new Set(
        data
          .filter(d => d["地址"].includes(city))
          .map(d => d["地址"].match(/(區|鄉|鎮|市)/g)?.[0])
      );
      distSet.forEach(d => {
        const opt = document.createElement("option");
        opt.textContent = d;
        districtSelect.appendChild(opt);
      });
    });
  }

  // 關鍵字提示
  keywordInput.addEventListener("input", () => {
    const val = keywordInput.value.trim();
    suggestionBox.innerHTML = "";
    if (!val) return;
    const matched = data.filter(d => d["醫事機構名稱"].includes(val)).slice(0, 5);
    matched.forEach(item => {
      const div = document.createElement("div");
      div.className = "suggestion-item";
      div.textContent = item["醫事機構名稱"];
      div.onclick = () => {
        keywordInput.value = item["醫事機構名稱"];
        suggestionBox.innerHTML = "";
      };
      suggestionBox.appendChild(div);
    });
  });

  // 篩選按鈕
  document.querySelectorAll(".filter-btns button").forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.type;
      currentPage = 1;
      renderTable(type);
    });
  });

  // 搜尋
  document.getElementById("searchBtn").addEventListener("click", () => {
    currentPage = 1;
    renderTable();
  });

  // 分頁
  document.getElementById("prevPage").onclick = () => {
    if (currentPage > 1) currentPage--;
    renderTable();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  document.getElementById("nextPage").onclick = () => {
    if (currentPage * rowsPerPage < data.length) currentPage++;
    renderTable();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  function renderTable(type = "全部") {
    const city = citySelect.value;
    const dist = districtSelect.value;
    const kw = keywordInput.value.trim();
    let filtered = data;

    if (type !== "全部") filtered = filtered.filter(d => d["資料來源"] === type);
    if (city !== "全部縣市") filtered = filtered.filter(d => d["地址"].includes(city));
    if (dist !== "全部地區") filtered = filtered.filter(d => d["地址"].includes(dist));
    if (kw) {
      filtered = filtered.filter(d =>
        (d["醫事機構名稱"] || "").includes(kw) ||
        (d["地址"] || "").includes(kw) ||
        (d["電話"] || "").includes(kw) ||
        (d["整合團隊名稱"] || "").includes(kw)
      );
    }

    const start = (currentPage - 1) * rowsPerPage;
    const pageData = filtered.slice(start, start + rowsPerPage);
    tbody.innerHTML = "";

    pageData.forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${row["醫事機構名稱"] || ""}</td>
        <td><a href="https://www.google.com/maps/search/?api=1&query=${row["地址"]}" target="_blank">${row["地址"] || ""}</a></td>
        <td><a href="tel:${row["電話"]}">${row["電話"] || ""}</a></td>
        <td>${row["整合團隊名稱"] || ""}</td>
        <td>${row["資料來源"] || ""}</td>`;
      tbody.appendChild(tr);
    });

    pageInfo.textContent = `第 ${currentPage} 頁 / 共 ${Math.ceil(filtered.length / rowsPerPage)} 頁`;
  }
});
