import { supabase } from '../config/supabase.js';
import { ok } from '../utils/response.js';

function sanitize(term) {
  return term.replace(/[,()%]/g, '').trim();
}

export async function search(req, res) {
  const raw = (req.query.q || '').trim();
  if (raw.length < 2) return res.json(ok({ players: [], leagues: [] }));
  const q = sanitize(raw);

  const { data: players } = await supabase
    .from('players')
    .select('id, name, position, country, price_fc, total_pts')
    .or(`name.ilike.%${q}%,country.ilike.%${q}%`)
    .order('total_pts', { ascending: false })
    .limit(10);

  let leaguesQuery = supabase.from('btff_leagues').select('id, name, code, type').ilike('name', `%${q}%`).limit(5);
  leaguesQuery = req.user ? leaguesQuery.or(`type.eq.public,created_by.eq.${req.user.id}`) : leaguesQuery.eq('type', 'public');
  const { data: leagues } = await leaguesQuery;

  return res.json(ok({ players: players || [], leagues: leagues || [] }));
}

// Used by chat to find someone to start a DM with
export async function searchUsers(req, res) {
  const raw = (req.query.q || '').trim();
  if (raw.length < 2) return res.json(ok([]));
  const q = sanitize(raw);

  const { data, error } = await supabase
    .from('profiles')
    .select('id, team_name')
    .ilike('team_name', `%${q}%`)
    .neq('id', req.user.id)
    .limit(10);
  if (error) throw error;

  return res.json(ok(data || []));
}
