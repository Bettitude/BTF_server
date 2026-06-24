import { PLAYERS } from '../data/mockData.js';
import * as store from '../store/runtimeStore.js';
import { ok } from '../utils/response.js';

export async function search(req, res) {
  const q = (req.query.q || '').trim().toLowerCase();
  if (!q || q.length < 2) return res.json(ok({ players: [], leagues: [] }));

  const players = PLAYERS
    .filter(p => p.name.toLowerCase().includes(q) || p.country.toLowerCase().includes(q))
    .sort((a, b) => b.total_pts - a.total_pts)
    .slice(0, 10)
    .map(p => ({ id: p.id, name: p.name, position: p.position, country: p.country, price_fc: p.price_fc, total_pts: p.total_pts }));

  const leagues = [...store.leagues.values()]
    .filter(l => l.id !== store.GLOBAL_LEAGUE_ID && l.name.toLowerCase().includes(q))
    .slice(0, 5)
    .map(l => ({ id: l.id, name: l.name, code: l.code, type: l.type }));

  return res.json(ok({ players, leagues }));
}
