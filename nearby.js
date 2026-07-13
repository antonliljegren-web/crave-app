const KEY = process.env.GOOGLE_API_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { lat, lng, radius = 3000, keyword = '' } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius,
    type: 'restaurant',
    key: KEY,
    ...(keyword ? { keyword } : {}),
  });

  try {
    const r = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Places fetch failed' });
  }
}
