// api/stocks.js — 실시간 주가 + 재무데이터
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { symbols, type } = req.query;
  if (!symbols) return res.status(400).json({ error: 'symbols required' });

  const fmpKey = process.env.FMP_API_KEY;
  const symbolList = symbols.split(',').map(s => s.trim());

  // ── 실시간 주가 (Yahoo Finance 비공식) ──
  if (type === 'quote') {
    try {
      const results = await Promise.allSettled(
        symbolList.map(async (symbol) => {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
          const r = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
          });
          const data = await r.json();
          const meta = data?.chart?.result?.[0]?.meta;
          if (!meta) return null;
          return {
            symbol,
            price: meta.regularMarketPrice?.toFixed(2),
            change: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose * 100).toFixed(2),
            changeAbs: (meta.regularMarketPrice - meta.previousClose).toFixed(2),
            currency: meta.currency,
            marketCap: meta.marketCap,
          };
        })
      );
      const quotes = results
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value);
      return res.status(200).json({ quotes, source: 'yahoo' });
    } catch (e) {
      return res.status(500).json({ error: 'Quote fetch failed' });
    }
  }

  // ── 재무데이터 (Financial Modeling Prep) ──
  if (type === 'profile' && fmpKey) {
    try {
      const results = await Promise.allSettled(
        symbolList.map(async (symbol) => {
          const r = await fetch(
            `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${fmpKey}`
          );
          const data = await r.json();
          const p = data?.[0];
          if (!p) return null;
          return {
            symbol,
            name: p.companyName,
            sector: p.sector,
            industry: p.industry,
            country: p.country,
            marketCap: p.mktCap,
            pe: p.pe?.toFixed(1),
            beta: p.beta?.toFixed(2),
            description: p.description?.slice(0, 200),
          };
        })
      );
      const profiles = results
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value);
      return res.status(200).json({ profiles, source: 'fmp' });
    } catch (e) {
      return res.status(500).json({ error: 'Profile fetch failed' });
    }
  }

  return res.status(400).json({ error: 'Invalid type' });
}
