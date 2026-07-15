import { supabase } from '../config/supabase.js';
import { calcFantasyPoints } from '../utils/scoring.js';

// Fetches a user's squad + players + this-gameweek stats in one shot.
// gwNumber defaults to the currently active gameweek.
export async function getSquadWithStats(userId, gwNumber) {
  const { data: squad } = await supabase
    .from('squads')
    .select('id, formation, captain_id, vice_captain_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (!squad) return null;

  const { data: rows } = await supabase
    .from('squad_players')
    .select('players(*)')
    .eq('squad_id', squad.id);
  const players = (rows || []).map(r => r.players).filter(Boolean);

  let gwRow = null;
  if (gwNumber) {
    ({ data: gwRow } = await supabase.from('gameweeks').select('id, number').eq('number', gwNumber).maybeSingle());
  } else {
    ({ data: gwRow } = await supabase.from('gameweeks').select('id, number').eq('is_current', true).maybeSingle());
  }

  let statsByPlayer = {};
  if (gwRow && players.length) {
    const { data: statsRows } = await supabase
      .from('player_gw_stats')
      .select('*')
      .eq('gameweek_id', gwRow.id)
      .in('player_id', players.map(p => p.id));
    statsByPlayer = Object.fromEntries((statsRows || []).map(s => [s.player_id, s]));
  }

  return { squad, players, statsByPlayer, gwNumber: gwRow?.number ?? gwNumber ?? null };
}

function applyMultiplier(pts, playerId, squad) {
  if (playerId === squad.captain_id)      return pts * 2;
  if (playerId === squad.vice_captain_id) return Math.round(pts * 1.5);
  return pts;
}

// Aggregate season total + current-gameweek points for one user (used by leagues/standings).
export async function computeUserPoints(userId) {
  const data = await getSquadWithStats(userId);
  if (!data) return { total: 0, gwPts: 0 };

  let total = 0, gwPts = 0;
  for (const player of data.players) {
    total += applyMultiplier(player.total_pts || 0, player.id, data.squad);
    const gwScore = calcFantasyPoints(data.statsByPlayer[player.id], player.position);
    gwPts += applyMultiplier(gwScore, player.id, data.squad);
  }
  return { total, gwPts };
}

export { applyMultiplier };
