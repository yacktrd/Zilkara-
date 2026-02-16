import json
import time
import requests
import statistics

OUT_PATH = "data/assets.json"

VS = "eur"

UA = {
    "User-Agent": "Zilkara/1.0"
}

# --------------------------------------------------
# FETCH TOP 250 COINS IN ONE REQUEST
# --------------------------------------------------

def fetch_top_250():
    url = "https://api.coingecko.com/api/v3/coins/markets"

    params = {
        "vs_currency": VS,
        "order": "market_cap_desc",
        "per_page": 250,
        "page": 1,
        "price_change_percentage": "24h,7d,30d"
    }

    try:
        r = requests.get(url, params=params, headers=UA, timeout=20)
    except Exception as e:
        print("Request error:", e)
        return []

    if r.status_code != 200:
        print("API error:", r.status_code)
        return []

    return r.json()

# --------------------------------------------------
# SCORE CALCULATION
# --------------------------------------------------

def stability_score(chg24, chg7, chg30):

    values = [
        abs(chg24 or 0),
        abs(chg7 or 0),
        abs(chg30 or 0)
    ]

    avg_volatility = statistics.mean(values)

    score = max(0, 100 - avg_volatility * 2)

    return round(score)

def rating(score):

    if score >= 80:
        return "A"

    if score >= 60:
        return "B"

    if score >= 40:
        return "C"

    return "D"

def regime(score):

    if score >= 70:
        return "STABLE"

    if score >= 50:
        return "TRANSITION"

    return "VOLATILE"

# --------------------------------------------------
# BUILD ASSETS
# --------------------------------------------------

def build_assets():

    coins = fetch_top_250()

    assets = []

    for coin in coins:

        price = coin.get("current_price")

        chg24 = coin.get("price_change_percentage_24h")
        chg7 = coin.get("price_change_percentage_7d_in_currency")
        chg30 = coin.get("price_change_percentage_30d_in_currency")

        score = stability_score(chg24, chg7, chg30)

        asset = {

            "asset": coin.get("symbol", "").upper(),

            "name": coin.get("name"),

            "price": round(price, 4) if price else None,

            "chg_24h_pct": round(chg24, 2) if chg24 else 0,

            "chg_7d_pct": round(chg7, 2) if chg7 else 0,

            "chg_30d_pct": round(chg30, 2) if chg30 else 0,

            "stability_score": score,

            "rating": rating(score),

            "regime": regime(score),

            "link":
            f"https://www.binance.com/en/trade/{coin.get('symbol','').upper()}_USDT"

        }

        assets.append(asset)

    return assets

# --------------------------------------------------
# SAVE
# --------------------------------------------------

def save():

    assets = build_assets()

    data = {

        "updatedAt": int(time.time()),

        "count": len(assets),

        "assets": assets

    }

    with open(OUT_PATH, "w") as f:
        json.dump(data, f, indent=2)

    print(f"assets.json updated — {len(assets)} assets")


# --------------------------------------------------
# RUN
# --------------------------------------------------

if __name__ == "__main__":
    save()
