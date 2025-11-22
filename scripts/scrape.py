import requests
import pandas as pd
import json
from bs4 import BeautifulSoup

print("正在從健保署抓取資料...")

URL = "https://info.nhi.gov.tw/INAE1000/INAE1031S01"

def fetch_page():
    r = requests.get(URL, timeout=20)
    r.encoding = "utf-8"
    return r.text

def scrape():
    html = fetch_page()
    soup = BeautifulSoup(html, "lxml")

    table = soup.find("table")
    if table is None:
        print("❌ 找不到資料表（健保署網站格式可能更新）")
        return {}

    headers = [th.text.strip() for th in table.find_all("th")]

    records = {}
    for tr in table.find("tbody").find_all("tr"):
        tds = tr.find_all("td")
        if len(tds) < 3:
            continue

        name = tds[0].text.strip()
        if not name:
            continue

        # 從第 3 欄開始是服務項目
        services = {}
        for i in range(3, len(headers)):
            label = headers[i]
            raw = tds[i].text.strip()

            val = 1 if raw in ["V", "是", "提供", "✓"] else 0
            services[label] = val

        records[name] = services

    return records

try:
    data = scrape()

    with open("services.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("✔ 已成功更新 services.json")

except Exception as e:
    print("❌ 無法爬取健保署資料：", e)
