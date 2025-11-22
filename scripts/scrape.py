import requests
from bs4 import BeautifulSoup
import json
import re

BASE_URL = "https://info.nhi.gov.tw/INAE1000/INAE1031S01"

session = requests.Session()

def get_state(html):
    soup = BeautifulSoup(html, "lxml")
    data = {}
    for key in ["__VIEWSTATE", "__VIEWSTATEGENERATOR", "__EVENTVALIDATION"]:
        tag = soup.find("input", {"name": key})
        data[key] = tag["value"] if tag else ""
    return data, soup

def scrape_city(city_value):
    print(f"==> 抓取縣市：{city_value}")
    all_items = {}

    # 先讀首頁
    html = session.get(BASE_URL).text
    state, soup = get_state(html)

    # 找縣市下拉
    ddl = soup.find("select", {"name": "ctl00$ContentPlaceHolder1$ddlCity"})
    cities = {opt.text.strip(): opt["value"] for opt in ddl.find_all("option")}

    # 送出變更縣市 POST
    data = {
        "__EVENTTARGET": "ctl00$ContentPlaceHolder1$ddlCity",
        "__EVENTARGUMENT": "",
        "ctl00$ContentPlaceHolder1$ddlCity": city_value,
        **state
    }

    html = session.post(BASE_URL, data=data).text
    state, soup = get_state(html)

    # 分頁開始
    page = 1
    while True:
        print(f"  → 處理第 {page} 頁")
        table = soup.find("table")
        if not table:
            break

        rows = table.find_all("tr")
        headers = [th.text.strip() for th in rows[0].find_all("th")][3:]  # 第4欄開始是服務項目

        for tr in rows[1:]:
            tds = tr.find_all("td")
            if len(tds) < 5:
                continue

            name = tds[0].text.strip()
            services_vals = [td.text.strip() for td in tds[3:]]

            services = {}
            for h, v in zip(headers, services_vals):
                services[h] = 1 if v in ["是", "V", "✓", "1", "提供"] else 0

            all_items[name] = services

        # 找下一頁
        next_page = soup.find("a", href=re.compile("Page"))
        if not next_page:
            break

        # page pattern: javascript:__doPostBack('ctl00$ContentPlaceHolder1$GridView1','Page$2')
        match = re.search(r"Page\$(\d+)", next_page["href"])
        if not match:
            break

        target_page = match.group(1)

        # 做翻頁 POST
        data = {
            "__EVENTTARGET": "ctl00$ContentPlaceHolder1$GridView1",
            "__EVENTARGUMENT": f"Page${target_page}",
            "ctl00$ContentPlaceHolder1$ddlCity": city_value,
            **state
        }

        html = session.post(BASE_URL, data=data).text
        state, soup = get_state(html)
        page += 1

    return all_items


if __name__ == "__main__":
    print("開始爬取健保署 INAE1031S01 全台資料...\n")

    # 先讀一下網站抓可用縣市
    html = session.get(BASE_URL).text
    _, soup = get_state(html)
    ddl = soup.find("select", {"name": "ctl00$ContentPlaceHolder1$ddlCity"})
    cities = {opt.text.strip(): opt["value"] for opt in ddl.find_all("option")}

    final_data = {}

    for city_name, city_value in cities.items():
        if city_value == "":  
            continue  # 跳過 "請選擇"

        city_data = scrape_city(city_value)
        final_data.update(city_data)

    print(f"\n完成！共抓到 {len(final_data)} 家機構。")

    # 寫入 services.json
    with open("services.json", "w", encoding="utf-8") as f:
        json.dump(final_data, f, ensure_ascii=False, indent=2)

    print("services.json 已更新。")
