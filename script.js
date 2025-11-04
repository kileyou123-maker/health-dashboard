document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.querySelector("tbody");
  const citySelect = document.getElementById("citySelect");
  const districtSelect = document.getElementById("districtSelect");
  const keywordInput = document.getElementById("keyword");
  const suggestionBox = document.getElementById("suggestions");
  const themeToggle = document.getElementById("themeToggle");
  const pageInfo = document.getElementById("pageInfo");

  let data = [];
  let currentPage = 1;
  const rowsPerPage = 50;

  // 深淺模式切換
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

  // 載入 CSV
  const base = window.location.pathname.includes("health-dashboard") ? "/health-dashboard/" : "./";
  Promise.all([
    fetch(base + "A21030000I-D2000H-001.csv").then(r => r.text()),
    fetch(base + "A21030000I-D2000I-001.csv").then(r => r.text())
  ])
  .then(([homecare, hospice]) => {
    const h1 = Papa.parse(homecare, { header: true }).data.map(d => ({
      名稱: d["醫事機構名稱"],
      地址: d["地址"],
      電話: d["電話"],
      團隊: d["整合團隊名稱"] || "",
      來源: "居家醫療"
    }));
    const h2 = Papa.parse(hospice, { header: true }).data.map(d => ({
      名稱: d["醫事機構名稱"],
      地址: d["地址"],
      電話: d["電話"],
      團隊: d["服務項目"] || "",
      來源: "安寧照護"
    }));
    data = [...h1, ...h2].filter(d => d.名稱 && d.地址);
    initCityDistrict();
    render();
  })
  .catch(err => console.error("CSV 載入錯誤", err));

  // 初始化縣市與地區
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
      const dists = new Set(data.filter(d => d.地址.includes(city))
        .map(d => {
          const m = d.地址.match(/..[區鄉鎮市]/);
          return m ? m[0] : "";
        }));
      dists.forEach(d => {
        if (d) {
          const opt = document.createElement("option");
          opt.textContent = d;
          districtSelect.appendChild(opt);
        }
      });
    });
  }

  // 關鍵字提示
  keywordInput.addEventListener("input", () => {
    const val = keywordInput.value.trim();
    suggestionBox.innerHTML = "";
    if (!val) return;
    const matched = data.filter(d => d.名稱.includes(val)).slice(0, 5);
    matched.forEach(m => {
      const div = document.createElement("div");
      div.className = "suggestion-item";
      div.textContent = m.名稱;
      div.onclick = () => {
        keywordInput.value = m.名稱;
        suggestionBox.innerHTML = "";
      };
      suggestionBox.appendChild(div);
    });
  });

  // 搜尋與篩選
  document.getElementById("searchBtn").addEventListener("click", () => {
    currentPage = 1;
    render();
  });
  document.querySelectorAll(".filter-btns button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btns button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      render(btn.dataset.type);
    });
  });

  // 分頁
  document.getElementById("prevPage").onclick = () => {
    if (currentPage > 1) currentPage--;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  document.getElementById("nextPage").onclick = () => {
    if (currentPage * rowsPerPage < data.length) currentPage++;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 渲染表格
  function render(type = "全部") {
    const city = citySelect.value;
    const dist = districtSelect.value;
    const kw = keywordInput.value.trim();
    let filtered = data;
    if (type !== "全部") filtered = filtered.filter(d => d.來源 === type);
    if (city !== "全部縣市") filtered = filtered.filter(d => d.地址.includes(city));
    if (dist !== "全部地區") filtered = filtered.filter(d => d.地址.includes(dist));
    if (kw)
      filtered = filtered.filter(d =>
        d.名稱.includes(kw) ||
        d.地址.includes(kw) ||
        d.電話.includes(kw) ||
        d.團隊.includes(kw)
      );

    const start = (currentPage - 1) * rowsPerPage;
    const pageData = filtered.slice(start, start + rowsPerPage);
    tbody.innerHTML = "";
    pageData.forEach((r, i) => {
      const tr = document.createElement("tr");
      tr.style.animationDelay = `${i * 0.04}s`;
      tr.innerHTML = `
        <td>${r.名稱}</td>
        <td><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.地址)}" target="_blank">${r.地址}</a></td>
        <td><a href="tel:${r.電話}">${r.電話}</a></td>
        <td>${r.團隊}</td>
        <td>${r.來源}</td>`;
      tbody.appendChild(tr);
    });
    pageInfo.textContent = `第 ${currentPage} 頁 / 共 ${Math.ceil(filtered.length / rowsPerPage)} 頁`;
  }
});
