import { getSquadWithStats, applyMultiplier } from '../services/points.service.js';
import { calcFantasyPoints } from '../utils/scoring.js';
import { ok } from '../utils/response.js';

export async function myPoints(req, res) {
  const gwNumber = parseInt(req.query.gw) || null;
  const data = await getSquadWithStats(req.user.id, gwNumber);
  if (!data) return res.json(ok({ total: 0, players: [] }));

  const playerPoints = data.players.map(player => {
    const stats = data.statsByPlayer[player.id] || null;
    const pts = applyMultiplier(calcFantasyPoints(stats, player.position), player.id, data.squad);
    return { playerId: player.id, name: player.name, pts, stats };
  });

  const total = playerPoints.reduce((sum, p) => sum + p.pts, 0);
  return res.json(ok({ total, gameweekId: data.gwNumber, players: playerPoints }));
}
