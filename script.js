document.addEventListener("DOMContentLoaded", () => {
  const themeToggle = document.createElement("button");
  themeToggle.className = "theme-toggle";
  themeToggle.innerHTML = document.body.classList.contains("dark") ? "☀️" : "🌙";
  document.querySelector("header").appendChild(themeToggle);

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    themeToggle.innerHTML = isDark ? "☀️" : "🌙";
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });

  // 保留使用者設定
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
    themeToggle.innerHTML = "☀️";
  }

  const keywordInput = document.querySelector("#keyword");
  const suggestionBox = document.createElement("div");
  suggestionBox.id = "suggestions";
  keywordInput.parentNode.appendChild(suggestionBox);

  let data = [];
  fetch("data.csv")
    .then(res => res.text())
    .then(text => {
      data = Papa.parse(text, { header: true }).data;
      renderTable(data.slice(0, 50));
    });

  // 自動提示功能
  keywordInput.addEventListener("input", () => {
    const val = keywordInput.value.trim();
    suggestionBox.innerHTML = "";
    if (!val) return;
    const matched = data
      .filter(d => d["醫事機構名稱"] && d["醫事機構名稱"].includes(val))
      .slice(0, 5);
    matched.forEach(m => {
      const item = document.createElement("div");
      item.className = "suggestion-item";
      item.textContent = m["醫事機構名稱"];
      item.onclick = () => {
        keywordInput.value = m["醫事機構名稱"];
        suggestionBox.innerHTML = "";
      };
      suggestionBox.appendChild(item);
    });
  });

  // 篩選功能（按鈕）
  document.querySelectorAll(".filter-btns button").forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.type;
      let filtered = data;
      if (type !== "全部") filtered = data.filter(d => d["資料來源"] === type);
      renderTable(filtered.slice(0, 50));
    });
  });

  function renderTable(dataset) {
    const tbody = document.querySelector("tbody");
    tbody.innerHTML = "";
    dataset.forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${row["醫事機構名稱"] || ""}</td>
        <td><a href="https://www.google.com/maps/search/?api=1&query=${row["地址"]}" target="_blank">${row["地址"] || ""}</a></td>
        <td><a href="tel:${row["電話"]}">${row["電話"] || ""}</a></td>
        <td>${row["整合團隊名稱"] || ""}</td>
        <td>${row["資料來源"] || ""}</td>`;
      tbody.appendChild(tr);
    });
  }
});
