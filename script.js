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

  // ✅ GitHub Pages 需使用相對路徑
  const basePath = window.location.pathname.includes("health-dashboard")
    ? "/health-dashboard/"
    : "./";

  // 📄 載入資料（兩份 CSV）
  Promise.all([
    fetch(basePath + "A21030000I-D2000H-001.csv").then(r => r.text()),
    fetch(basePath + "A21030000I-D2000I-001.csv").then(r => r.text())
  ])
    .then(([h, i]) => {
      const homecare = Papa.parse(h, { header: true }).data;
      const hospice = Papa.parse(i, { header: true }).data;

      // ⚙️ 防呆過濾
      data = [...homecare, ...hospice].filter(
        d => d["醫事機構名稱"] && d["地址"]
      );

      initCityDistrict();
      renderTable();
    })
    .catch(err => console.error("❌ CSV 載入錯誤：", err));

  // 🏙️ 初始化縣市與地區選單（防呆修正版）
  function initCityDistrict() {
    const cities = [
      ...new Set(
        data
          .filter(d => d["地址"] && d["地址"].trim() !== "")
          .map(d => d["地址"].slice(0, 3))
      )
    ].filter(Boolean);

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
          .filter(d => d["地址"] && d["地址"].includes(city))
          .map(d => {
            const match = d["地址"].match(/..[區鄉鎮市]/);
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

    const matched = data
      .filter(d => d["醫事機構名稱"] && d["醫事機構名稱"].includes(val))
      .slice(0, 5);

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

  // 🏥 篩選按鈕
  document.querySelectorAll(".filter-btns button").forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.type;
      currentPage = 1;
      renderTable(type);
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

  // 🪄 表格渲染函式（含縣市地區篩選）
  function renderTable(type = "全部") {
    const city = citySelect.value;
    const dist = districtSelect.value;
    const kw = keywordInput.value.trim();
    let filtered = data;

    if (type !== "全部") filtered = filtered.filter(d => d["資料來源"] === type);
    if (city !== "全部縣市") filtered = filtered.filter(d => d["地址"] && d["地址"].includes(city));
    if (dist !== "全部地區") filtered = filtered.filter(d => d["地址"] && d["地址"].includes(dist));
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

    pageData.forEach((row, idx) => {
      const tr = document.createElement("tr");
      tr.style.animationDelay = `${idx * 0.05}s`;
      tr.innerHTML = `
        <td>${row["醫事機構名稱"] || ""}</td>
        <td><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row["地址"] || "")}" target="_blank">${row["地址"] || ""}</a></td>
        <td><a href="tel:${row["電話"]}">${row["電話"] || ""}</a></td>
        <td>${row["整合團隊名稱"] || ""}</td>
        <td>${row["資料來源"] || ""}</td>`;
      tbody.appendChild(tr);
    });

    pageInfo.textContent = `第 ${currentPage} 頁 / 共 ${Math.ceil(filtered.length / rowsPerPage)} 頁`;
  }
});
