import { supabase } from '../config/supabase.js';
import { ok } from '../utils/response.js';

export async function list(req, res) {
  const { gw, status } = req.query;
  let query = supabase.from('fixtures').select('*, gameweeks(number, name)');

  if (status) query = query.eq('status', status.toUpperCase());
  if (gw) {
    const { data: gwRow } = await supabase.from('gameweeks').select('id').eq('number', parseInt(gw)).single();
    query = query.eq('gameweek_id', gwRow?.id ?? -1);
  }

  const { data, error } = await query.order('match_date', { ascending: true }).order('match_time', { ascending: true });
  if (error) throw error;
  return res.json(ok(data));
}

export async function live(req, res) {
  const { data, error } = await supabase.from('fixtures').select('*, gameweeks(number, name)').eq('status', 'LIVE');
  if (error) throw error;
  return res.json(ok(data));
}
