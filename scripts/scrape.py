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

viewstate = soup.find("input", {"id": "__VIEWSTATE"})["value"]
viewstategen = soup.find("input", {"id": "__VIEWSTATEGENERATOR"})["value"]
eventvalidation = soup.find("input", {"id": "__EVENTVALIDATION"})["value"]

cities = [
    "台北市", "新北市", "桃園市", "台中市", "台南市", "高雄市",
    "基隆市", "新竹市", "嘉義市",
    "新竹縣", "苗栗縣", "彰化縣", "南投縣", "雲林縣",
    "嘉義縣", "屏東縣", "宜蘭縣", "花蓮縣", "台東縣"
]

result = {}

for city in cities:
    print("抓取：", city)
    payload = {
        '__VIEWSTATE': viewstate,
        '__VIEWSTATEGENERATOR': viewstategen,
        '__EVENTVALIDATION': eventvalidation,
        'ddl_city': city,
        'btnSearch': '查詢'
    }

    r = session.post(URL, data=payload, headers=headers)
    page = BeautifulSoup(r.text, "html.parser")

    table = page.find("table", {"id": "gvList"})
    if not table:
        print("⚠ 找不到資料表（可能被擋）", city)
        continue

    rows = table.find_all("tr")[1:]
    for row in rows:
        tds = row.find_all("td")
        name = tds[0].text.strip()

        result[name] = {
            "居家醫療": 1 if tds[2].text.strip() == "V" else 0,
            "居家護理": 1 if tds[3].text.strip() == "V" else 0,
            "安寧療護": 1 if tds[4].text.strip() == "V" else 0
        }

with open("services.json", "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print("完成！")
