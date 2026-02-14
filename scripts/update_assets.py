import json
import time
import requests
import statistics

OUT_PATH = "data/assets.json"

COINS = [
    ("BTC", "bitcoin"),
    ("ETH", "ethereum"),
    ("SOL", "solana"),
]

VS = "eur"
DAYS = 30
UA = {"User-Agent": "rfs-crypto-v1"}

def safe_get(url, params):
    try:
        r = requests.get(url, params=params, headers=UA, timeout=20)
        return r
    except Exception as e:
        print("Request error:", e)
        return None

def fetch_prices(coin_id):
    # 30 jours de prix pour calculer trend + 7d/30d + stabilité
    url = f"https://api.coingecko.com/api/v3/coins/{coin_id}/market_chart"
    params = {"vs_currency": VS, "days": DAYS}

    r = safe_get(url, params)
    if r is None:
        return None

    if r.status_code != 200:
        print(f"API error prices for {coin_id}: {r.status_code}")
        return None

    data = r.json()
    prices = data.get("prices")
    if not prices:
        print(f"No 'prices' field for {coin_id}")
        return None

    return [p[1] for p in prices]

def fetch_market(coin_id):
    # prix actuel + variation 24h
    url = "https://api.coingecko.com/api/v3/simple/price"
    params = {
        "ids": coin_id,
        "vs_currencies": VS,
        "include_24hr_change": "true",
    }

    r = safe_get(url, params)
    if r is None:
        return None

    if r.status_code != 200:
        print(f"API error market for {coin_id}: {r.status_code}")
        return None

    data = r.json()
    if coin_id not in data:
        print(f"No market data for {coin_id}")
        return None

    price = data[coin_id].get(VS)
    chg24 = data[coin_id].get(f"{VS}_24h_change")
    if price is None or chg24 is None:
        print(f"Incomplete market fields for {coin_id}")
        return None

    return {"price": float(price), "chg_24h": float(chg24)}

def stability_score(prices):
    if prices is None or len(prices) < 5:
        return 0
    returns = [(prices[i] - prices[i-1]) / prices[i-1] for i in range(1, len(prices)) if prices[i-1] != 0]
    if len(returns) < 2:
        return 0
    vol = statistics.stdev(returns)
    # score simple: plus la volatilité est forte, plus le score baisse
    score = max(0, min(100, int(100 - vol * 1000)))
    return score

def rating(score):
    if score >= 80: return "A"
    if score >= 60: return "B"
    if score >= 40: return "C"
    return "D"

def trend(prices):
    if prices is None or len(prices) < 2:
        return "Sideways"
    if prices[-1] > prices[0]: return "Uptrend"
    if prices[-1] < prices[0]: return "Downtrend"
    return "Sideways"

def market_state(score):
    if score >= 70: return "Stable"
    if score >= 50: return "Transition"
    return "Volatile"

def pct_change(a, b):
    # from b -> a
    if b == 0:
        return 0.0
    return (a - b) / b * 100.0

assets = []

for symbol, coin_id in COINS:
    prices = fetch_prices(coin_id)
    mkt = fetch_market(coin_id)

    # si l'API rate-limit, on espace un peu
    time.sleep(1.2)

    if prices is None or mkt is None:
        # fallback propre : ne plante pas, écrit quand même
        assets.append({
            "asset": symbol,
            "price": 0,
            "chg_24h_pct": 0,
            "chg_7d_pct": 0,
            "chg_30d_pct": 0,
            "stability": 0,
            "rating": "D",
            "market_state": "Volatile",
            "trend": "Sideways"
        })
        continue

    score = stability_score(prices)

    # 7 jours: on prend un point ~7 jours avant la fin (si dispo)
    if len(prices) >= 8:
        chg7 = pct_change(prices[-1], prices[-8])
    else:
        chg7 = 0.0

    chg30 = pct_change(prices[-1], prices[0])

    assets.append({
        "asset": symbol,
        "price": round(mkt["price"], 2),
        "chg_24h_pct": round(mkt["chg_24h"], 2),
        "chg_7d_pct": round(chg7, 2),
        "chg_30d_pct": round(chg30, 2),
        "stability": score,
        "rating": rating(score),
        "market_state": market_state(score),
        "trend": trend(prices),
    })

with open(OUT_PATH, "w") as f:
    json.dump(assets, f, indent=2)

print("assets.json updated (live)")
