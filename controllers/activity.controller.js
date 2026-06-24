import { supabase } from '../config/supabase.js';
import { ok, badRequest } from '../utils/response.js';

export async function list(req, res) {
  const { leagueId } = req.params;
  const limit = parseInt(req.query.limit) || 50;

  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('league_id', leagueId)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return res.json(ok(data));
}

export async function create(req, res) {
  const { leagueId, type, message } = req.body;

  const allowed = ['draft', 'lineup', 'stat_update', 'injury'];
  if (!allowed.includes(type)) {
    return res.status(400).json(badRequest(`type must be one of: ${allowed.join(', ')}`));
  }

  const { data, error } = await supabase
    .from('activities')
    .insert({ league_id: leagueId, type, message })
    .select()
    .single();

  if (error) throw error;
  return res.status(201).json({ success: true, data });
}
