const KEY = process.env.GOOGLE_API_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  const { lat, lng, radius = 3000, keyword = '', page = '' } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

  // Use multiple types to get true restaurants only, exclude lodging
  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius,
    key: KEY,
  });

  // When no keyword filter, search broadly for food establishments
  if (keyword) {
    params.set('keyword', keyword);
    params.set('type', 'restaurant');
  } else {
    // Use 'food' type which is broader and more accurate than 'restaurant'
    // which tends to include hotels
    params.set('type', 'restaurant');
    params.set('keyword', 'restaurant OR cafe OR bistro OR bar OR diner OR eatery');
  }

  if (page) params.set('pagetoken', page);

  try {
    const r = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`
    );
    const data = await r.json();

    // Filter out hotels, lodging, and non-food places server-side
    if (data.results) {
      const EXCLUDE_TYPES = new Set([
        'lodging','hotel','motel','hostel','resort',
        'rv_park','campground','real_estate_agency',
        'car_rental','car_repair','car_wash',
        'gas_station','parking','atm','bank',
        'hospital','pharmacy','doctor','dentist',
        'store','shopping_mall','supermarket',
        'gym','spa','beauty_salon','hair_care',
      ]);

      data.results = data.results.filter(place => {
        const types = place.types || [];
        // Must have food-related type
        const hasFoodType = types.some(t =>
          ['restaurant','cafe','bar','bakery','meal_takeaway',
           'meal_delivery','food','night_club'].includes(t)
        );
        // Must not be primarily a hotel/lodging
        const isLodging = types.includes('lodging') || types.includes('hotel');
        return hasFoodType && !isLodging;
      });
    }

    res.json(data);
  } catch (e) {
    console.error('Places API error:', e);
    res.status(500).json({ error: 'Places fetch failed', details: e.message });
  }
}
