import requests
from bs4 import BeautifulSoup
import json
import re

BASE_URL = "https://info.nhi.gov.tw/INAE1000/INAE1031S01"

def get_form_params(html):
    soup = BeautifulSoup(html, "lxml")
    params = {}
    for tag in ["__VIEWSTATE", "__EVENTVALIDATION", "__VIEWSTATEGENERATOR"]:
        el = soup.find("input", {"name": tag})
        params[tag] = el["value"] if el else ""
    return params

def fetch_page(session, params, event_target="", event_argument=""):
    data = {
        "__EVENTTARGET": event_target,
        "__EVENTARGUMENT": event_argument,
        **params
    }
    res = session.post(BASE_URL, data=data)
    return res.text

def parse_table(html):
    soup = BeautifulSoup(html, "lxml")
    table = soup.find("table")
    if not table:
        return []

    rows = table.find_all("tr")
    data = []

    for tr in rows[1:]:
        tds = tr.find_all("td")
        if len(tds) < 5:
            continue

        name = tds[0].get_text(strip=True)
        items = [td.get_text(strip=True) for td in tds[3:]]
        headers = [th.get_text(strip=True) for th in rows[0].find_all("th")][3:]

        services = {}
        for h, v in zip(headers, items):
            services[h] = 1 if v in ["是", "V", "1", "✓", "提供"] else 0

        data.append((name, services))

    return data

def scrape_all():
    session = requests.Session()
    res = session.get(BASE_URL)
    html = res.text

    services_dict = {}

    # 第一次取得 VIEWSTATE 等參數
    params = get_form_params(html)

    # 逐頁爬取
    page_num = 1
    while True:
        print(f"Parsing page {page_num}...")
        page_data = parse_table(html)

        for name, services in page_data:
            services_dict[name] = services

        # 找下一頁按鈕
        match = re.search(r"Page\$(\d+)'", html)
        if not match:
            break

        next_page = match.group(1)
        html = fetch_page(session, params, event_target="ctl00$ContentPlaceHolder1$GridView1", event_argument=f"Page${next_page}")
        params = get_form_params(html)

        page_num += 1

    return services_dict


if __name__ == "__main__":
    print("開始爬取健保署服務項目資料...")
    data = scrape_all()

    with open("services.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"完成！共更新 {len(data)} 家機構。")
