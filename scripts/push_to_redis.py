import json
import os
from upstash_redis import Redis

# connexion Redis
redis = Redis.from_env()

# charger fichier assets
with open("data/assets.json", "r") as f:
    payload = json.load(f)

# IMPORTANT : envoyer tout le payload complet
redis.set("assets_payload", payload)

# vérification
assets = payload.get("assets", [])
print(f"Redis updated: {len(assets)} assets")
