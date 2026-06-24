import * as store from '../store/runtimeStore.js';
import { PLAYERS, GAMEWEEKS } from '../data/mockData.js';
import { calcFantasyPoints } from '../utils/scoring.js';
import { ok } from '../utils/response.js';

export async function myPoints(req, res) {
  const userId = req.user.id;
  const gwNumber = parseInt(req.query.gw) || GAMEWEEKS.find(g => g.is_current)?.number || 1;
  const gwIndex  = gwNumber - 1;

  const squad = store.getSquad(userId);
  if (!squad) return res.json(ok({ total: 0, players: [] }));

  const playerPoints = squad.playerIds.map(pid => {
    const player = PLAYERS.find(p => p.id === pid);
    if (!player) return null;

    const stats = player.player_gw_stats[gwIndex] || { minutes: 0, goals: 0, assists: 0, clean_sheet: false, yellow_cards: 0, red_cards: 0, saves: 0 };
    let pts = calcFantasyPoints(stats, player.position);
    if (player.id === squad.captainId)      pts *= 2;
    else if (player.id === squad.vcId)      pts = Math.round(pts * 1.5);

    return { playerId: player.id, name: player.name, pts, stats };
  }).filter(Boolean);

  const total = playerPoints.reduce((sum, p) => sum + p.pts, 0);
  return res.json(ok({ total, gameweekId: gwNumber, players: playerPoints }));
}
