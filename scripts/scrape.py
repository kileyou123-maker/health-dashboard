import requests
import json

print("正在從健保署 API 取得最新資料...")

API = "https://data.nhi.gov.tw/resource/INAE10003/INAE10003.json"

try:
    data = requests.get(API, timeout=20).json()

    output = {}

    for item in data:
        name = item.get("HOSPITAL_NAME", "").strip()
        if not name:
            continue

        services = {k: (1 if v == "1" else 0) for k, v in item.items() if k != "HOSPITAL_NAME"}

        output[name] = services

    with open("services.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"✔ 成功更新 services.json，共 {len(output)} 家機構")

except Exception as e:
    print("❌ 錯誤：", e)
