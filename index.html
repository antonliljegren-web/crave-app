// Group session API using Vercel KV (free Redis store built into Vercel)
// KV docs: https://vercel.com/docs/storage/vercel-kv
//
// Endpoints (all via ?action=...):
//   POST action=create  { lat, lng, radius, keyword, restaurantIds[], creatorName }
//   POST action=join    { code, name }
//   POST action=swipe   { code, memberId, placeId, direction }
//   GET  action=state   { code }

import { kv } from '@vercel/kv';

const TTL = 60 * 60 * 6; // 6 hours

function uid(len = 6) {
  return Math.random().toString(36).slice(2, 2 + len).toUpperCase();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || (req.body?.action);

  try {
    // ── CREATE GROUP ────────────────────────────────────────────
    if (action === 'create') {
      const { creatorName, restaurants, lat, lng, radius, keyword } = req.body;

      let code;
      let exists = true;
      while (exists) {
        code = uid(5);
        exists = await kv.exists(`group:${code}`);
      }

      const memberId = uid(8);
      const session = {
        code,
        createdAt: Date.now(),
        lat, lng, radius, keyword,
        restaurants, // array of { place_id, name, cuisine, distance, rating, user_ratings_total, photos, opening_hours, vicinity }
        members: [{ id: memberId, name: creatorName, joinedAt: Date.now(), swipes: {} }],
        matches: [],
      };

      await kv.set(`group:${code}`, JSON.stringify(session), { ex: TTL });

      return res.json({ ok: true, code, memberId });
    }

    // ── JOIN GROUP ──────────────────────────────────────────────
    if (action === 'join') {
      const { code, name } = req.body;
      const raw = await kv.get(`group:${code}`);
      if (!raw) return res.status(404).json({ error: 'Group not found or expired' });

      const session = JSON.parse(raw);
      const memberId = uid(8);
      const existing = session.members.find(m => m.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        // Rejoin — return existing memberId so they keep their swipes
        return res.json({ ok: true, code, memberId: existing.id, session });
      }

      session.members.push({ id: memberId, name, joinedAt: Date.now(), swipes: {} });
      await kv.set(`group:${code}`, JSON.stringify(session), { ex: TTL });

      return res.json({ ok: true, code, memberId, session });
    }

    // ── SWIPE ───────────────────────────────────────────────────
    if (action === 'swipe') {
      const { code, memberId, placeId, direction } = req.body;
      const raw = await kv.get(`group:${code}`);
      if (!raw) return res.status(404).json({ error: 'Group not found' });

      const session = JSON.parse(raw);
      const member = session.members.find(m => m.id === memberId);
      if (!member) return res.status(403).json({ error: 'Not a member of this group' });

      member.swipes[placeId] = direction; // 'right' or 'left'

      // Recalculate matches: restaurant where ≥2 members swiped right
      const allRight = {};
      for (const m of session.members) {
        for (const [pid, dir] of Object.entries(m.swipes || {})) {
          if (dir === 'right') {
            if (!allRight[pid]) allRight[pid] = [];
            allRight[pid].push(m.name);
          }
        }
      }

      session.matches = Object.entries(allRight)
        .filter(([, names]) => names.length >= 2)
        .map(([pid, names]) => ({
          placeId: pid,
          names,
          restaurant: session.restaurants.find(r => r.place_id === pid),
        }));

      await kv.set(`group:${code}`, JSON.stringify(session), { ex: TTL });

      return res.json({ ok: true, session });
    }

    // ── GET STATE ───────────────────────────────────────────────
    if (action === 'state') {
      const code = req.query.code;
      const raw = await kv.get(`group:${code}`);
      if (!raw) return res.status(404).json({ error: 'Group not found or expired' });
      return res.json({ ok: true, session: JSON.parse(raw) });
    }

    return res.status(400).json({ error: 'Unknown action' });

  } catch (e) {
    console.error('Group API error:', e);
    res.status(500).json({ error: e.message || 'Server error' });
  }
}
