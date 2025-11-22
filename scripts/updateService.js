const fs = require("fs");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

async function fetchNHI() {
  try {
    const url = "https://info.nhi.gov.tw/INAE1000/INAE1031S01";

    const res = await fetch(url);
    const html = await res.text();

    const dom = new JSDOM(html);
    const document = dom.window.document;

    const table = document.querySelector("table");
    if (!table) throw "找不到表格";

    const rows = table.querySelectorAll("tbody tr");
    const headers = [...table.querySelectorAll("thead th")].map((h) =>
      h.textContent.trim()
    );

    const json = [];

    rows.forEach((tr) => {
      const tds = tr.querySelectorAll("td");
      if (!tds.length) return;

      const obj = {};

      tds.forEach((td, i) => {
        obj[headers[i]] = td.textContent.trim();
      });

      json.push(obj);
    });

    fs.writeFileSync("./services.json", JSON.stringify(json, null, 2), "utf8");
    console.log("services.json 產生完成，共筆數：" + json.length);
  } catch (e) {
    console.error("爬取失敗：", e);
    process.exit(1);
  }
}

fetchNHI();
