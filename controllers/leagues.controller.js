import { supabase } from '../config/supabase.js';
import { ok, created, notFound, badRequest } from '../utils/response.js';

function generateCode() {
  return 'BTFF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function myLeagues(req, res) {
  const userId = req.user.id;
  const { data, error } = await supabase
    .from('league_members')
    .select(`total_pts, gw_pts, rank, btff_leagues(id, name, type, code, created_by, created_at)`)
    .eq('user_id', userId);
  if (error) throw error;

  const leagues = (data || []).map(m => ({
    ...m.btff_leagues,
    myTotalPts: m.total_pts,
    myGwPts:    m.gw_pts,
    myRank:     m.rank,
  }));
  return res.json(ok(leagues));
}

export async function create(req, res) {
  const userId = req.user.id;
  const { name, type = 'private' } = req.body;
  if (!name?.trim()) return res.status(400).json(badRequest('League name required'));

  const code = type === 'private' ? generateCode() : null;

  const { data: league, error } = await supabase
    .from('btff_leagues')
    .insert({ name: name.trim(), type, code, created_by: userId })
    .select().single();
  if (error) throw error;

  // Creator auto-joins
  await supabase.from('league_members').insert({ league_id: league.id, user_id: userId });

  return res.status(201).json(created(league));
}

export async function join(req, res) {
  const userId = req.user.id;
  const { code } = req.body;
  if (!code) return res.status(400).json(badRequest('League code required'));

  const { data: league, error } = await supabase.from('btff_leagues').select('*').eq('code', code.trim().toUpperCase()).single();
  if (error || !league) return res.status(404).json(notFound('League'));

  const { error: joinError } = await supabase.from('league_members').insert({ league_id: league.id, user_id: userId });
  if (joinError?.code === '23505') return res.status(409).json(badRequest('Already a member'));
  if (joinError) throw joinError;

  return res.json(ok(league));
}

export async function standings(req, res) {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('league_members')
    .select(`user_id, total_pts, gw_pts, rank, profiles(team_name)`)
    .eq('league_id', id)
    .order('total_pts', { ascending: false });

  if (error) throw error;

  const rows = (data || []).map((m, i) => ({
    rank:      i + 1,
    userId:    m.user_id,
    name:      m.profiles?.team_name || 'Unknown',
    gwPts:     m.gw_pts,
    total:     m.total_pts,
  }));
  return res.json(ok(rows));
}

export async function globalLeague(req, res) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, team_name')
    .limit(50);
  if (error) throw error;
  // Placeholder — real global ranking would join squad pts
  return res.json(ok(data.map((p, i) => ({ rank: i + 1, name: p.team_name, userId: p.id, gwPts: 0, total: 0 }))));
}
