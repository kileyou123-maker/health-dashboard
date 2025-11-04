document.addEventListener("DOMContentLoaded", () => {
  const themeToggle = document.getElementById("themeToggle");
  const tbody = document.querySelector("tbody");
  const keywordInput = document.getElementById("keyword");
  const suggestionBox = document.getElementById("suggestions");
  const pageInfo = document.getElementById("pageInfo");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");

  let data = [];
  let currentPage = 1;
  const rowsPerPage = 50;

  // 主題切換
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
    themeToggle.textContent = "☀️";
  }
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    themeToggle.textContent = isDark ? "☀️" : "🌙";
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });

  // 載入資料
  fetch("data/A21030000I-D2000H-001.csv")
    .then(res => res.text())
    .then(text => {
      data = Papa.parse(text, { header: true }).data.filter(r => r["醫事機構名稱"]);
      renderTable();
    });

  // 關鍵字即時提示
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

  document.getElementById("searchBtn").addEventListener("click", () => {
    currentPage = 1;
    renderTable();
  });

  // 分頁
  prevPageBtn.onclick = () => {
    if (currentPage > 1) currentPage--;
    renderTable();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  nextPageBtn.onclick = () => {
    if (currentPage * rowsPerPage < data.length) currentPage++;
    renderTable();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  function renderTable() {
    const val = keywordInput.value.trim();
    let filtered = data;
    if (val) filtered = data.filter(d => d["醫事機構名稱"].includes(val) || (d["地址"] || "").includes(val));

    const start = (currentPage - 1) * rowsPerPage;
    const pageData = filtered.slice(start, start + rowsPerPage);
    tbody.innerHTML = "";

    pageData.forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${row["醫事機構名稱"]}</td>
        <td><a href="https://www.google.com/maps/search/?api=1&query=${row["地址"]}" target="_blank">${row["地址"]}</a></td>
        <td><a href="tel:${row["電話"]}">${row["電話"]}</a></td>
        <td>${row["整合團隊名稱"] || ""}</td>
        <td>${row["資料來源"] || ""}</td>`;
      tbody.appendChild(tr);
    });

    pageInfo.textContent = `第 ${currentPage} 頁 / 共 ${Math.ceil(filtered.length / rowsPerPage)} 頁`;
  }
});
