/*
 Zilkara — Market Scanner (Production Server)
 Run: node server.js

 Endpoints:
   GET /            -> web/index.html
   GET /api/market  -> CoinGecko proxy + scoring + cache
   GET /health      -> health check
*/

const express = require("express");
const path = require("path");
const compression = require("compression");
const helmet = require("helmet");

const app = express();

//////////////////////////////////////////////////
// CONFIG
//////////////////////////////////////////////////

const PORT = Number(process.env.PORT) || 3000;
const WEB_DIR = path.join(__dirname, "web");

const CG_URL = "https://api.coingecko.com/api/v3/coins/markets";

const CACHE_TTL = 45 * 1000;        // 45 sec fresh
const CACHE_STALE = 10 * 60 * 1000; // 10 min stale fallback

const DEFAULT_VS = "eur";
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 250;

//////////////////////////////////////////////////
// MIDDLEWARE
//////////////////////////////////////////////////

app.use(helmet());
app.use(compression());
app.use(express.static(WEB_DIR));

//////////////////////////////////////////////////
// MEMORY CACHE
//////////////////////////////////////////////////

// key = vs_limit
const cache = new Map();

function cacheKey(vs, limit) {
  return `${vs}_${limit}`;
}

function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.time;

  if (age < CACHE_TTL) {
    return { status: "fresh", data: entry.data };
  }

  if (age < CACHE_STALE) {
    return { status: "stale", data: entry.data };
  }

  return null;
}

function setCache(key, data) {
  cache.set(key, {
    data,
    time: Date.now()
  });
}

//////////////////////////////////////////////////
// RATE LIMIT (simple in-memory)
//////////////////////////////////////////////////

const rateMap = new Map();

function rateLimit(ip, limit = 30, window = 60000) {
  const now = Date.now();

  if (!rateMap.has(ip)) {
    rateMap.set(ip, []);
  }

  const timestamps = rateMap.get(ip).filter(
    t => now - t < window
  );

  if (timestamps.length >= limit) {
    return false;
  }

  timestamps.push(now);
  rateMap.set(ip, timestamps);

  return true;
}

//////////////////////////////////////////////////
// HELPERS
//////////////////////////////////////////////////

function num(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function calculateScore(coin) {

  let score = 50;

  const ch24 = num(coin.price_change_percentage_24h);
  const ch7  = num(coin.price_change_percentage_7d_in_currency);
  const ch30 = num(coin.price_change_percentage_30d_in_currency);

  score += ch24 * 0.4;
  score += ch7  * 0.3;
  score += ch30 * 0.3;

  const rank = num(coin.market_cap_rank, 999999);

  if (rank <= 10) score += 10;
  else if (rank <= 25) score += 5;
  else if (rank >= 150) score -= 5;

  return Math.round(score);
}

function rating(score) {
  if (score >= 120) return "STRONG";
  if (score >= 90) return "GOOD";
  if (score >= 60) return "WEAK";
  return "AVOID";
}

//////////////////////////////////////////////////
// FETCH COINGECKO
//////////////////////////////////////////////////

async function fetchMarkets(vs, limit) {

  const url =
    `${CG_URL}?vs_currency=${vs}` +
    `&order=market_cap_desc` +
    `&per_page=${limit}` +
    `&page=1` +
    `&sparkline=false` +
    `&price_change_percentage=24h,7d,30d`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`CoinGecko error ${res.status}`);
  }

  const json = await res.json();

  return json.map(c => {

    const score = calculateScore(c);

    return {

      symbol: c.symbol.toUpperCase(),
      name: c.name,
      rank: c.market_cap_rank,

      price: c.current_price,

      chg24: c.price_change_percentage_24h,
      chg7:  c.price_change_percentage_7d_in_currency,
      chg30: c.price_change_percentage_30d_in_currency,

      score,
      rating: rating(score)

    };

  });

}

//////////////////////////////////////////////////
// API ROUTE
//////////////////////////////////////////////////

app.get("/api/market", async (req, res) => {

  const ip = req.ip;

  if (!rateLimit(ip)) {
    return res.status(429).json({
      error: "Rate limit exceeded"
    });
  }

  const vs = String(req.query.vs || DEFAULT_VS).toLowerCase();
  const limit = Math.min(
    num(req.query.limit, DEFAULT_LIMIT),
    MAX_LIMIT
  );

  const key = cacheKey(vs, limit);

  const cached = getCache(key);

  if (cached && cached.status === "fresh") {

    console.log("CACHE HIT (fresh)", key);

    return res.json({
      cache: "fresh",
      data: cached.data
    });

  }

  try {

    console.log("FETCH", key);

    const data = await fetchMarkets(vs, limit);

    setCache(key, data);

    return res.json({
      cache: "miss",
      data
    });

  }
  catch (err) {

    console.log("FETCH ERROR:", err.message);

    if (cached && cached.status === "stale") {

      console.log("SERVE STALE CACHE", key);

      return res.json({
        cache: "stale",
        data: cached.data
      });

    }

    return res.status(500).json({
      error: "Market unavailable"
    });

  }

});

//////////////////////////////////////////////////
// HEALTH CHECK
//////////////////////////////////////////////////

app.get("/health", (req, res) => {

  res.json({
    status: "ok",
    uptime: process.uptime(),
    cache_entries: cache.size,
    timestamp: Date.now()
  });

});

//////////////////////////////////////////////////
// START
//////////////////////////////////////////////////

app.listen(PORT, () => {

  console.log(`Zilkara running on port ${PORT}`);

});
