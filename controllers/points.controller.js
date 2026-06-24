import { supabase } from '../config/supabase.js';
import { ok } from '../utils/response.js';

function calcPoints(stats, position) {
  if (!stats || !stats.minutes) return 0;
  let pts = 0;
  if (stats.minutes >= 60) pts += 2; else if (stats.minutes > 0) pts += 1;
  if (position === 'GK' || position === 'DF') {
    pts += stats.goals * 6;
    pts += stats.assists * 3;
    if (stats.clean_sheet && stats.minutes >= 60) pts += (position === 'GK' ? 6 : 4);
  } else if (position === 'MF') {
    pts += stats.goals * 5;
    pts += stats.assists * 3;
    if (stats.clean_sheet && stats.minutes >= 60) pts += 1;
  } else {
    pts += stats.goals * 4;
    pts += stats.assists * 3;
  }
  pts += (stats.saves || 0) >= 3 ? Math.floor(stats.saves / 3) : 0;
  if (stats.yellow_cards) pts -= 1;
  if (stats.red_cards)    pts -= 3;
  if (stats.penalties_saved)  pts += stats.penalties_saved * 5;
  if (stats.penalties_missed) pts -= stats.penalties_missed * 2;
  return pts;
}

export async function myPoints(req, res) {
  const userId = req.user.id;
  const gwNumber = parseInt(req.query.gw) || null;

  // Get user squad
  const { data: squad } = await supabase.from('squads')
    .select('id, formation, captain_id, vice_captain_id, squad_players(player_id)')
    .eq('user_id', userId)
    .single();

  if (!squad) return res.json(ok({ total: 0, players: [] }));

  const playerIds = (squad.squad_players || []).map(sp => sp.player_id);

  // Get current gameweek if not specified
  let gwId;
  if (gwNumber) {
    const { data: gw } = await supabase.from('gameweeks').select('id').eq('number', gwNumber).single();
    gwId = gw?.id;
  } else {
    const { data: gw } = await supabase.from('gameweeks').select('id').eq('is_current', true).single();
    gwId = gw?.id;
  }

  // Get stats for all squad players this GW
  const { data: stats } = await supabase.from('player_gw_stats')
    .select('*, players(id, name, position)')
    .in('player_id', playerIds)
    .eq('gameweek_id', gwId || 0);

  const playerPoints = (stats || []).map(s => {
    let pts = s.points || calcPoints(s, s.players?.position);
    if (s.player_id === squad.captain_id)       pts *= 2;
    else if (s.player_id === squad.vice_captain_id) pts = Math.round(pts * 1.5);
    return { playerId: s.player_id, name: s.players?.name, pts, stats: s };
  });

  const total = playerPoints.reduce((sum, p) => sum + p.pts, 0);
  return res.json(ok({ total, gameweekId: gwId, players: playerPoints }));
}
