const express = require("express");
const fetch = require("node-fetch");

const router = express.Router();

router.get("/", async (req, res) => {

  try {

    const url =
      "https://api.coingecko.com/api/v3/coins/markets" +
      "?vs_currency=usd" +
      "&order=market_cap_desc" +
      "&per_page=100" +
      "&page=1" +
      "&sparkline=false";

    const response = await fetch(url);

    const json = await response.json();

    const data = json.map(c => ({

      symbol: c.symbol.toUpperCase(),

      price: c.current_price,

      chg_24h_pct: c.price_change_percentage_24h,

      chg_7d_pct: c.price_change_percentage_7d_in_currency,

      chg_30d_pct: c.price_change_percentage_30d_in_currency

    }));

    res.json({

      engine: "Zilkara Engine",

      data

    });

  }

  catch (e) {

    console.error(e);

    res.status(500).json({

      error: "Market fetch failed"

    });

  }

});

module.exports = router;
