import { supabase } from '../config/supabase.js';
import { ok } from '../utils/response.js';

export async function list(req, res) {
  const { gw, status } = req.query;

  let q = supabase.from('fixtures').select(`*, gameweeks!inner(number, name)`).order('match_date').order('match_time');
  if (gw)     q = q.eq('gameweeks.number', parseInt(gw));
  if (status) q = q.eq('status', status.toUpperCase());

  const { data, error } = await q;
  if (error) throw error;
  return res.json(ok(data));
}

export async function live(req, res) {
  const { data, error } = await supabase.from('fixtures').select('*, gameweeks(number, name)').eq('status', 'LIVE');
  if (error) throw error;
  return res.json(ok(data));
}
