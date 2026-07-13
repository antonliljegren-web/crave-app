const KEY = process.env.GOOGLE_API_KEY;

export default async function handler(req, res) {
  const { ref, maxwidth = 800 } = req.query;
  if (!ref) return res.status(400).send('Missing ref');

  const params = new URLSearchParams({ photoreference: ref, maxwidth, key: KEY });

  try {
    const r = await fetch(`https://maps.googleapis.com/maps/api/place/photo?${params}`);
    const ct = r.headers.get('content-type') || 'image/jpeg';
    const buf = await r.arrayBuffer();
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(buf));
  } catch (e) {
    res.status(500).send('Photo fetch failed');
  }
}
