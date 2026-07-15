import { supabase } from '../config/supabase.js';
import { ok, notFound } from '../utils/response.js';

export async function list(req, res) {
  const { data, error } = await supabase.from('gameweeks').select('*').order('number', { ascending: true });
  if (error) throw error;
  return res.json(ok(data));
}

export async function current(req, res) {
  const { data, error } = await supabase.from('gameweeks').select('*').eq('is_current', true).single();
  if (error || !data) return res.status(404).json(notFound('Current gameweek'));
  return res.json(ok(data));
}
