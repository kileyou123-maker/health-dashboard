import requests
import json

# 使用健保署官方開放資料 API（取代 WebForm 抓取）
API_URL = "https://data.nhi.gov.tw/resource/mask/maskdata.json"

def fetch_nhi_service_data():
    print("正在從健保署 API 取得資料...")

    try:
        res = requests.get(API_URL, timeout=10)
        res.raise_for_status()
    except Exception as e:
        print("❌ 健保署資料來源無法連線：", e)
        return {}

    data = res.json()
    result = {}

    for item in data:
        name = item.get("醫事機構名稱", "").strip()
        if not name:
            continue

        result[name] = {
            "居家醫療": 1 if item.get("居家醫療") == "V" else 0,
            "居家護理": 1 if item.get("居家護理") == "V" else 0,
            "安寧療護": 1 if item.get("安寧療護") == "V" else 0,
        }

    print("共取得", len(result), "筆資料")
    return result


if __name__ == "__main__":
    data = fetch_nhi_service_data()

    with open("services.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("已將資料寫入 services.json")
