import requests
from bs4 import BeautifulSoup
import pandas as pd
import json

print("開始抓取健保署 INAE1031S01 資料...")

URL = "https://info.nhi.gov.tw/INAE1000/INAE1031S01"

session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
})

# Step 1：先 GET 取得 VIEWSTATE / EVENTVALIDATION
r = session.get(URL, timeout=20)
r.encoding = "utf-8"

soup = BeautifulSoup(r.text, "lxml")

viewstate = soup.find("input", {"id": "__VIEWSTATE"})
eventvalidation = soup.find("input", {"id": "__EVENTVALIDATION"})

if not viewstate or not eventvalidation:
    print("❌ 無法取得 VIEWSTATE / EVENTVALIDATION，健保署可能更新格式")
    exit()

payload = {
    "__VIEWSTATE": viewstate.get("value"),
    "__EVENTVALIDATION": eventvalidation.get("value"),
    "btnSearch": "查詢"
}

# Step 2：POST 查詢（真正的資料在 POST 回傳）
r2 = session.post(URL, data=payload, timeout=20)
r2.encoding = "utf-8"

soup2 = BeautifulSoup(r2.text, "lxml")
table = soup2.find("table")

if table is None:
    print("❌ 無法找到資料表格，可能網站改版")
    exit()

headers = [th.text.strip() for th in table.find_all("th")]

records = {}

tbody = table.find("tbody")
for tr in tbody.find_all("tr"):
    tds = tr.find_all("td")
    if len(tds) < 3:
        continue

    name = tds[0].text.strip()
    if not name:
        continue

    services = {}
    for i in range(3, len(headers)):
        label = headers[i]
        raw = tds[i].text.strip()
        val = 1 if raw in ["V", "是", "提供", "✓"] else 0
        services[label] = val

    records[name] = services

# Step 3：輸出 JSON
with open("services.json", "w", encoding="utf-8") as f:
    json.dump(records, f, ensure_ascii=False, indent=2)

print(f"✔ 完成！共抓到 {len(records)} 家機構")
