import { PLAYERS } from '../data/mockData.js';
import { ok, notFound } from '../utils/response.js';

export async function list(req, res) {
  const { position, search, sort = 'total_pts', order = 'desc' } = req.query;
  let players = [...PLAYERS];

  if (position) players = players.filter(p => p.position === position.toUpperCase());
  if (search) {
    const q = search.toLowerCase();
    players = players.filter(p => p.name.toLowerCase().includes(q) || p.country.toLowerCase().includes(q));
  }

  players.sort((a, b) => order === 'asc' ? (a[sort] ?? 0) - (b[sort] ?? 0) : (b[sort] ?? 0) - (a[sort] ?? 0));

  return res.json(ok(players, { total: players.length }));
}

export async function getById(req, res) {
  const player = PLAYERS.find(p => p.id === req.params.id);
  if (!player) return res.status(404).json(notFound('Player'));
  return res.json(ok(player));
}
