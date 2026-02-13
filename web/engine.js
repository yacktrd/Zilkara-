export async function loadAssets(){

    const API_URL =
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=250&page=1&sparkline=false";

    const res = await fetch(API_URL, {
        cache: "no-store"
    });

    if(!res.ok){
        throw new Error("HTTP " + res.status);
    }

    const data = await res.json();

    return data.map(asset => {

        const change = asset.price_change_percentage_24h ?? 0;
        const volume = asset.total_volume ?? 0;
        const cap = asset.market_cap ?? 0;

        let score = 0;

        if(change > 0) score += 25;
        if(change > 5) score += 25;
        if(volume > 1_000_000_000) score += 25;
        if(cap > 10_000_000_000) score += 25;

        return {

            symbol: asset.symbol.toUpperCase(),
            price: asset.current_price,
            change24h: change,
            score: score

        };

    });

}
