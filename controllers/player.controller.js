import { INITIAL_PLAYERS, INITIAL_SOCCER_PLAYERS } from '../playersData.js';
import { supabase } from '../config/supabase.js';
import { ok, notFound, badRequest } from '../utils/response.js';

function getPool(sport) {
  return sport === 'soccer' ? INITIAL_SOCCER_PLAYERS : INITIAL_PLAYERS;
}

export async function list(req, res) {
  const { sport = 'soccer', position, search } = req.query;
  let players = getPool(sport);

  if (position) {
    players = players.filter(p => p.position === position.toUpperCase());
  }

  if (search) {
    const q = search.toLowerCase();
    players = players.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.team.toLowerCase().includes(q)
    );
  }

  return res.json(ok(players, { total: players.length }));
}

export async function getById(req, res) {
  const { id } = req.params;
  const sport = req.query.sport || 'soccer';
  const player = getPool(sport).find(p => p.id === id);

  if (!player) return res.status(404).json(notFound('Player'));
  return res.json(ok(player));
}

// Admin: seed all players from local data into Supabase
export async function seed(req, res) {
  const sport = req.query.sport || 'soccer';
  const players = getPool(sport);

  const rows = players.map(p => ({
    id:               p.id,
    name:             p.name,
    position:         p.position,
    team:             p.team,
    injury_status:    p.injuryStatus,
    projected_points: p.projectedPoints,
    weekly_points:    p.weeklyPoints,
    stats:            p.stats,
    rank:             p.rank,
  }));

  const { error } = await supabase.from('players').upsert(rows, { onConflict: 'id' });
  if (error) throw error;

  return res.json(ok(null, { seeded: rows.length, sport }));
}
