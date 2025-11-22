import requests
from bs4 import BeautifulSoup
import json

URL = "https://info.nhi.gov.tw/INAE1000/INAE1031S01.aspx"

headers = {
    "User-Agent": "Mozilla/5.0",
}

session = requests.Session()
resp = session.get(URL, headers=headers)
soup = BeautifulSoup(resp.text, "html.parser")

# 取得 hidden fields（WebForm 必填）
viewstate = soup.find("input", {"id": "__VIEWSTATE"})["value"]
eventvalidation = soup.find("input", {"id": "__EVENTVALIDATION"})["value"]
viewstategen = soup.find("input", {"id": "__VIEWSTATEGENERATOR"})["value"]

# 城市列表從第一頁取（網站固定）
cities = ["台北市", "新北市", "桃園市", "台中市", "台南市", "高雄市",
          "基隆市", "新竹市", "嘉義市",
          "新竹縣", "苗栗縣", "彰化縣", "南投縣", "雲林縣",
          "嘉義縣", "屏東縣", "宜蘭縣", "花蓮縣", "台東縣"]

result = {}

print("開始抓取健保署 INAE1031S01 服務資料...")

for city in cities:
    print(f"抓取城市：{city}")

    data = {
        "__VIEWSTATE": viewstate,
        "__VIEWSTATEGENERATOR": viewstategen,
        "__EVENTVALIDATION": eventvalidation,
        "ddl_city": city,
        "btnSearch": "查詢"
    }

    r = session.post(URL, data=data, headers=headers)
    page = BeautifulSoup(r.text, "html.parser")

    table = page.find("table", {"id": "gvList"})
    if not table:
        print(f"⚠ 找不到表格：{city}")
        continue

    rows = table.find_all("tr")[1:]  # skip header

    for tr in rows:
        tds = tr.find_all("td")
        if len(tds) < 5:
            continue

        name = tds[0].text.strip()

        result[name] = {
            "居家醫療": 1 if tds[2].text.strip() == "V" else 0,
            "居家護理": 1 if tds[3].text.strip() == "V" else 0,
            "安寧療護": 1 if tds[4].text.strip() == "V" else 0
        }

print("寫入 services.json ...")

with open("services.json", "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print("完成！")
