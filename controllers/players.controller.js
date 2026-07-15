import { supabase } from '../config/supabase.js';
import { ok, notFound } from '../utils/response.js';

// PostgREST .or() filter splits on commas/parens — strip them so user input can't inject extra clauses
function sanitizeSearch(term) {
  return term.replace(/[,()%]/g, '').trim();
}

export async function list(req, res) {
  const { position, search, sort = 'total_pts', order = 'desc' } = req.query;
  let query = supabase.from('players').select('*');

  if (position) query = query.eq('position', position.toUpperCase());
  if (search) {
    const q = sanitizeSearch(search);
    if (q) query = query.or(`name.ilike.%${q}%,country.ilike.%${q}%`);
  }
  query = query.order(sort, { ascending: order === 'asc' });

  const { data, error } = await query;
  if (error) throw error;
  return res.json(ok(data, { total: data.length }));
}

export async function getById(req, res) {
  const { data, error } = await supabase
    .from('players')
    .select('*, player_gw_stats(*)')
    .eq('id', req.params.id)
    .single();

  if (error || !data) return res.status(404).json(notFound('Player'));
  return res.json(ok(data));
}
