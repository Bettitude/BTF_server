import { dbFindOne, dbUpdate } from '../services/supabase.service.js';
import { supabase } from '../config/supabase.js';
import { INITIAL_PLAYERS, INITIAL_SOCCER_PLAYERS } from '../playersData.js';
import { ok, notFound, badRequest } from '../utils/response.js';

export async function getTeam(req, res) {
  const team = await dbFindOne('teams', { id: req.params.id });
  if (!team) return res.status(404).json(notFound('Team'));
  return res.json(ok(team));
}

export async function getRoster(req, res) {
  const { id } = req.params;
  const sport = req.query.sport || 'soccer';
  const allPlayers = sport === 'soccer' ? INITIAL_SOCCER_PLAYERS : INITIAL_PLAYERS;

  const { data: rosters, error } = await supabase
    .from('rosters')
    .select('player_id')
    .eq('team_id', id);

  if (error) throw error;

  const playerIds = (rosters || []).map(r => r.player_id);
  const players = allPlayers.filter(p => playerIds.includes(p.id));

  return res.json(ok(players, { total: players.length }));
}

export async function updateLineup(req, res) {
  const { lineup } = req.body;
  if (!lineup || typeof lineup !== 'object') {
    return res.status(400).json(badRequest('lineup object required'));
  }

  const updated = await dbUpdate('teams', { id: req.params.id }, { lineup });
  return res.json(ok(updated));
}

export async function getStandings(req, res) {
  const { leagueId } = req.params;
  const { data: teams, error } = await supabase
    .from('teams')
    .select('id, name, owner_name, avatar, wins, losses, total_points, is_user')
    .eq('league_id', leagueId)
    .order('wins', { ascending: false })
    .order('total_points', { ascending: false });

  if (error) throw error;
  return res.json(ok(teams));
}
