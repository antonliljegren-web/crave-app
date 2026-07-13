// Group session API using in-memory store with encoded state in URL
// No database needed - session state is encoded and passed via URL params
// For production with many concurrent users, replace with Vercel KV

const sessions = new Map();
const TTL = 1000 * 60 * 60 * 6; // 6 hours

function uid(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < len; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

function cleanOldSessions() {
  const now = Date.now();
  for (const [key, val] of sessions.entries()) {
    if (now - val.createdAt > TTL) sessions.delete(key);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  cleanOldSessions();

  const action = req.query.action || req.body?.action;

  try {
    // CREATE
    if (action === 'create') {
      const { creatorName, restaurants, lat, lng, radius } = req.body;
      if (!creatorName || !restaurants?.length) {
        return res.status(400).json({ error: 'creatorName and restaurants required' });
      }

      let code;
      do { code = uid(5); } while (sessions.has(code));

      const memberId = uid(8);
      const session = {
        code,
        createdAt: Date.now(),
        lat, lng, radius,
        restaurants: restaurants.map(r => ({
          place_id: r.place_id,
          name: r.name,
          cuisine: r.cuisine,
          distance: r.distance,
          rating: r.rating,
          user_ratings_total: r.user_ratings_total,
          vicinity: r.vicinity,
          opening_hours: r.opening_hours,
          photos: r.photos ? [{ photo_reference: r.photos[0]?.photo_reference }] : [],
        })),
        members: [{
          id: memberId,
          name: creatorName,
          joinedAt: Date.now(),
          swipes: {},
          swipeCount: 0,
        }],
        matches: [],
      };

      sessions.set(code, session);
      return res.json({ ok: true, code, memberId });
    }

    // JOIN
    if (action === 'join') {
      const { code, name } = req.body;
      if (!code || !name) return res.status(400).json({ error: 'code and name required' });

      const session = sessions.get(code.toUpperCase());
      if (!session) return res.status(404).json({ error: 'Group not found or expired. Ask your friend for a new link.' });

      // Check if rejoining
      const existing = session.members.find(m => m.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        return res.json({ ok: true, code: session.code, memberId: existing.id, session });
      }

      const memberId = uid(8);
      session.members.push({
        id: memberId,
        name,
        joinedAt: Date.now(),
        swipes: {},
        swipeCount: 0,
      });

      return res.json({ ok: true, code: session.code, memberId, session });
    }

    // SWIPE
    if (action === 'swipe') {
      const { code, memberId, placeId, direction } = req.body;
      const session = sessions.get(code);
      if (!session) return res.status(404).json({ error: 'Group not found' });

      const member = session.members.find(m => m.id === memberId);
      if (!member) return res.status(403).json({ error: 'Not a member' });

      // Only count new swipes
      if (!member.swipes[placeId]) member.swipeCount++;
      member.swipes[placeId] = direction;

      // Recalculate matches
      const rightMap = {};
      for (const m of session.members) {
        for (const [pid, dir] of Object.entries(m.swipes)) {
          if (dir === 'right') {
            if (!rightMap[pid]) rightMap[pid] = [];
            rightMap[pid].push({ id: m.id, name: m.name });
          }
        }
      }

      session.matches = Object.entries(rightMap)
        .filter(([, voters]) => voters.length >= 2)
        .map(([pid, voters]) => ({
          placeId: pid,
          voters,
          names: voters.map(v => v.name),
          restaurant: session.restaurants.find(r => r.place_id === pid),
        }))
        .sort((a, b) => b.voters.length - a.voters.length);

      return res.json({ ok: true, session });
    }

    // STATE (polling)
    if (action === 'state') {
      const code = req.query.code?.toUpperCase();
      const session = sessions.get(code);
      if (!session) return res.status(404).json({ error: 'Group not found or expired' });
      return res.json({ ok: true, session });
    }

    // BATCH SWIPES (sync all at once when rejoining)
    if (action === 'sync') {
      const { code, memberId, swipes } = req.body;
      const session = sessions.get(code);
      if (!session) return res.status(404).json({ error: 'Group not found' });
      const member = session.members.find(m => m.id === memberId);
      if (!member) return res.status(403).json({ error: 'Not a member' });

      member.swipes = { ...member.swipes, ...swipes };
      member.swipeCount = Object.keys(member.swipes).length;

      return res.json({ ok: true, session });
    }

    return res.status(400).json({ error: 'Unknown action' });

  } catch (e) {
    console.error('Group API error:', e);
    res.status(500).json({ error: e.message || 'Server error' });
  }
}
