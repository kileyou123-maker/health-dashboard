document.addEventListener("DOMContentLoaded", () => {
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

  // 🌗 深淺模式切換
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

  const basePath = window.location.pathname.includes("health-dashboard")
    ? "/health-dashboard/"
    : "./";

  // 📄 載入兩個 CSV
  Promise.all([
    fetch(basePath + "A21030000I-D2000H-001.csv").then(r => r.text()),
    fetch(basePath + "A21030000I-D2000I-001.csv").then(r => r.text())
  ])
    .then(([homecareCsv, hospiceCsv]) => {
      const homecare = Papa.parse(homecareCsv, { header: true }).data.map(d => ({
        名稱: d["醫事機構名稱"],
        地址: d["地址"],
        電話: d["電話"],
        整合團隊名稱: d["整合團隊名稱"] || "",
        來源: "居家醫療"
      }));

      const hospice = Papa.parse(hospiceCsv, { header: true }).data.map(d => ({
        名稱: d["醫事機構名稱"],
        地址: d["地址"],
        電話: d["電話"],
        整合團隊名稱: d["服務項目"] || "",
        來源: "安寧照護"
      }));

      data = [...homecare, ...hospice].filter(d => d.名稱 && d.地址);
      console.log("資料載入成功，共", data.length, "筆");
      initCityDistrict();
      renderTable();
    })
    .catch(err => console.error("❌ CSV 載入錯誤：", err));

  // 🏙️ 初始化縣市與地區選單
  function initCityDistrict() {
    const cities = [...new Set(data.map(d => d.地址.slice(0, 3)))];
    cities.forEach(c => {
      const opt = document.createElement("option");
      opt.textContent = c;
      citySelect.appendChild(opt);
    });

    citySelect.addEventListener("change", () => {
      const city = citySelect.value;
      districtSelect.innerHTML = "<option>全部地區</option>";
      if (city === "全部縣市") return;

      const dists = new Set(
        data
          .filter(d => d.地址.includes(city))
          .map(d => {
            const match = d.地址.match(/..[區鄉鎮市]/);
            return match ? match[0] : "";
          })
      );
      dists.forEach(d => {
        if (d) {
          const opt = document.createElement("option");
          opt.textContent = d;
          districtSelect.appendChild(opt);
        }
      });
    });
  }

  // 🔍 關鍵字即時提示
  keywordInput.addEventListener("input", () => {
    const val = keywordInput.value.trim();
    suggestionBox.innerHTML = "";
    if (!val) return;

    const matched = data.filter(d => d.名稱.includes(val)).slice(0, 5);
    matched.forEach(item => {
      const div = document.createElement("div");
      div.className = "suggestion-item";
      div.textContent = item.名稱;
      div.onclick = () => {
        keywordInput.value = item.名稱;
        suggestionBox.innerHTML = "";
      };
      suggestionBox.appendChild(div);
    });
  });

  // 🔎 搜尋按鈕
  document.getElementById("searchBtn").addEventListener("click", () => {
    currentPage = 1;
    renderTable();
  });

  // ⏩ 分頁按鈕
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

  // 🪄 表格渲染函式
  function renderTable() {
    const city = citySelect.value;
    const dist = districtSelect.value;
    const kw = keywordInput.value.trim();
    let filtered = data;

    if (city !== "全部縣市") filtered = filtered.filter(d => d.地址.includes(city));
    if (dist !== "全部地區") filtered = filtered.filter(d => d.地址.includes(dist));
    if (kw)
      filtered = filtered.filter(
        d =>
          d.名稱.includes(kw) ||
          d.地址.includes(kw) ||
          d.電話.includes(kw) ||
          d.整合團隊名稱.includes(kw)
      );

    const start = (currentPage - 1) * rowsPerPage;
    const pageData = filtered.slice(start, start + rowsPerPage);
    tbody.innerHTML = "";

    pageData.forEach((row, idx) => {
      const tr = document.createElement("tr");
      tr.style.animationDelay = `${idx * 0.05}s`;
      tr.innerHTML = `
        <td>${row.名稱}</td>
        <td><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.地址)}" target="_blank">${row.地址}</a></td>
        <td><a href="tel:${row.電話}">${row.電話}</a></td>
        <td>${row.整合團隊名稱}</td>
        <td>${row.來源}</td>
      `;
      tbody.appendChild(tr);
    });

    pageInfo.textContent = `第 ${currentPage} 頁 / 共 ${Math.ceil(filtered.length / rowsPerPage)} 頁`;
  }
});
