import { supabase } from '../config/supabase.js';
import { ok, notFound } from '../utils/response.js';

export async function list(req, res) {
  const { position, search, sort = 'total_pts', order = 'desc' } = req.query;

  let q = supabase.from('players').select('*');
  if (position) q = q.eq('position', position.toUpperCase());
  if (search)   q = q.ilike('name', `%${search}%`);
  q = q.order(sort, { ascending: order === 'asc' });

  const { data, error } = await q;
  if (error) throw error;
  return res.json(ok(data, { total: data.length }));
}

export async function getById(req, res) {
  const { data, error } = await supabase.from('players').select(`
    *, player_gw_stats(*)
  `).eq('id', req.params.id).single();

  if (error || !data) return res.status(404).json(notFound('Player'));
  return res.json(ok(data));
}
