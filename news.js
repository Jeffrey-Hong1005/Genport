// api/news.js — 실제 뉴스 가져오기 (네이버 뉴스 API)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'query required' });

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  // 네이버 API 키가 없으면 fallback 메시지
  if (!clientId || !clientSecret) {
    return res.status(200).json({ 
      items: [], 
      source: 'none',
      message: 'NAVER_API_KEY not configured' 
    });
  }

  try {
    const encoded = encodeURIComponent(query);
    const response = await fetch(
      `https://openapi.naver.com/v1/search/news.json?query=${encoded}&display=10&sort=date`,
      {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
      }
    );
    const data = await response.json();

    // HTML 태그 제거 및 정리
    const items = (data.items || []).map(item => ({
      title: item.title.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
      description: item.description.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
      pubDate: item.pubDate,
      link: item.link,
      source: item.originallink || item.link,
    }));

    return res.status(200).json({ items, source: 'naver' });
  } catch (error) {
    return res.status(500).json({ error: 'News fetch failed', items: [] });
  }
}
