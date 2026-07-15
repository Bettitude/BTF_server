import crypto from 'crypto';
import { supabase } from '../config/supabase.js';
import { computeUserPoints } from '../services/points.service.js';
import { ok, created, notFound, badRequest } from '../utils/response.js';
import { sendEventEmail } from '../services/email.service.js';

export async function myLeagues(req, res) {
  const userId = req.user.id;
  const { data: memberships, error } = await supabase
    .from('league_members')
    .select('btff_leagues(*)')
    .eq('user_id', userId);
  if (error) throw error;

  const results = [];
  for (const { btff_leagues: league } of memberships || []) {
    if (!league) continue;
    const { data: members } = await supabase
      .from('league_members')
      .select('user_id, profiles(team_name)')
      .eq('league_id', league.id);

    const ranked = (await Promise.all((members || []).map(async m => ({
      userId: m.user_id,
      name:   m.profiles?.team_name,
      ...(await computeUserPoints(m.user_id)),
    })))).sort((a, b) => b.total - a.total);

    const rank = ranked.findIndex(m => m.userId === userId) + 1;
    const me   = ranked.find(m => m.userId === userId);

    results.push({
      id: league.id, name: league.name, type: league.type, code: league.code,
      created_by: league.created_by, created_at: league.created_at,
      myTotalPts: me?.total ?? 0,
      myGwPts:    me?.gwPts ?? 0,
      myRank:     rank || null,
    });
  }

  return res.json(ok(results));
}

export async function create(req, res) {
  const userId = req.user.id;
  const { name, type = 'private' } = req.body;
  if (!name?.trim()) return res.status(400).json(badRequest('Please enter a name for your league.'));

  const code = type === 'private' ? `BTFF-${crypto.randomBytes(3).toString('hex').toUpperCase()}` : null;

  const { data: league, error } = await supabase
    .from('btff_leagues')
    .insert({ name: name.trim(), type, code, created_by: userId })
    .select()
    .single();
  if (error) throw error;

  await supabase.from('league_members').insert({ league_id: league.id, user_id: userId });
  await supabase.from('chat_rooms').insert({ type: 'league', name: league.name, league_id: league.id });

  sendEventEmail(req.user.email, 'league_created', { leagueName: league.name, code: league.code });

  return res.status(201).json(created({ id: league.id, name: league.name, type: league.type, code: league.code }));
}

export async function join(req, res) {
  const userId = req.user.id;
  const { code } = req.body;
  if (!code) return res.status(400).json(badRequest('Please enter the league code.'));

  const { data: league } = await supabase.from('btff_leagues').select('*').eq('code', code.trim().toUpperCase()).maybeSingle();
  if (!league) return res.status(404).json(badRequest('No league found with that code — double-check and try again.'));

  const { data: existing } = await supabase
    .from('league_members')
    .select('*')
    .match({ league_id: league.id, user_id: userId })
    .maybeSingle();
  if (existing) return res.status(409).json(badRequest("You're already a member of this league."));

  const { error } = await supabase.from('league_members').insert({ league_id: league.id, user_id: userId });
  if (error) throw error;

  sendEventEmail(req.user.email, 'league_joined', { leagueName: league.name });

  return res.json(ok({ id: league.id, name: league.name, type: league.type, code: league.code }));
}

export async function standings(req, res) {
  const { id } = req.params;
  const { data: league } = await supabase.from('btff_leagues').select('id, type').eq('id', id).maybeSingle();
  if (!league) return res.status(404).json(notFound('League'));

  if (league.type !== 'public') {
    const { data: membership } = await supabase
      .from('league_members').select('user_id')
      .match({ league_id: id, user_id: req.user.id }).maybeSingle();
    if (!membership) return res.status(403).json(badRequest("You need to join this league before you can view its standings."));
  }

  const { data: members } = await supabase
    .from('league_members')
    .select('user_id, profiles(team_name)')
    .eq('league_id', id);

  const rows = (await Promise.all((members || []).map(async m => ({
    userId: m.user_id,
    name:   m.profiles?.team_name || 'Unknown',
    ...(await computeUserPoints(m.user_id)),
  }))))
    .sort((a, b) => b.total - a.total)
    .map((r, i) => ({ rank: i + 1, userId: r.userId, name: r.name, gwPts: r.gwPts, total: r.total }));

  return res.json(ok(rows));
}

// Overall leaderboard across every signed-up manager (FPL-style "Global" ranking) —
// not tied to league membership.
export async function globalLeague(req, res) {
  const { data: profiles, error } = await supabase.from('profiles').select('id, team_name');
  if (error) throw error;

  const rows = (await Promise.all(profiles.map(async p => ({
    userId: p.id,
    name:   p.team_name || 'Unknown',
    ...(await computeUserPoints(p.id)),
  }))))
    .sort((a, b) => b.total - a.total)
    .map((r, i) => ({ rank: i + 1, userId: r.userId, name: r.name, gwPts: r.gwPts, total: r.total }));

  return res.json(ok(rows));
}
